import "server-only";
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import sharp, { type Metadata } from "sharp";
import { connectDB, getDb } from "@/lib/db/connect";
import { Media, type MediaDoc } from "@/lib/models";
import { env } from "@/lib/env";
import { ApiError, badRequest, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { ImageDTO, MediaDTO } from "@/lib/types";

/**
 * Image pipeline: validate → normalise orientation → resize → WebP → store in
 * MongoDB GridFS (two variants + a tiny blur placeholder). Using GridFS keeps
 * the app deployable anywhere with only a MongoDB connection, no local disk.
 */

const BUCKET = "media_files";
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"]);
const FULL_MAX = 2000;
const THUMB_MAX = 720;
const MIN_DIMENSION = 200;

function bucket() {
  return new mongoose.mongo.GridFSBucket(getDb(), { bucketName: BUCKET });
}

export function mediaUrl(id: string, variant: "full" | "thumb" = "full") {
  return `/api/media/${id}/${variant}.webp`;
}

export function toMediaDTO(doc: MediaDoc): MediaDTO {
  const id = String(doc._id);
  return {
    id,
    url: mediaUrl(id, "full"),
    thumbUrl: mediaUrl(id, "thumb"),
    alt: doc.alt ?? "",
    width: doc.width,
    height: doc.height,
    size: doc.size,
    blurDataURL: doc.blurDataURL ?? undefined,
    source: doc.source ?? "upload",
    originalName: doc.originalName ?? undefined,
    credit: doc.credit?.name ? { name: doc.credit.name ?? undefined, url: doc.credit.url ?? undefined } : undefined,
    createdAt: new Date((doc as unknown as { createdAt: Date }).createdAt).toISOString(),
  };
}

export function mediaToImage(dto: MediaDTO, alt?: string): ImageDTO {
  return {
    url: dto.url,
    alt: alt ?? dto.alt,
    mediaId: dto.id,
    width: dto.width,
    height: dto.height,
    blurDataURL: dto.blurDataURL,
    credit: dto.credit,
  };
}

function writeToGridFS(buf: Buffer, filename: string, metadata: Record<string, unknown>): Promise<Types.ObjectId> {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(filename, { metadata: { ...metadata, contentType: "image/webp" } });
    upload.once("error", reject);
    upload.once("finish", () => resolve(upload.id as Types.ObjectId));
    upload.end(buf);
  });
}

export type IngestOptions = {
  originalName?: string;
  alt?: string;
  source?: "upload" | "youtube" | "unsplash" | "generated";
  credit?: { name?: string; url?: string };
};

export async function ingestImage(input: Buffer, opts: IngestOptions = {}): Promise<MediaDTO> {
  if (!input?.length) throw badRequest("The file is empty.");
  if (input.length > env.maxUploadBytes) {
    throw new ApiError(413, `Image is too large. Maximum size is ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.`, "file_too_large");
  }

  let meta: Metadata;
  try {
    // Sniff the real format from the bytes; never trust the client's mime type.
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw badRequest("That file isn't a supported image. Please upload a JPG, PNG, WebP, AVIF or GIF.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw badRequest(`Unsupported image format (${meta.format ?? "unknown"}). Use JPG, PNG, WebP, AVIF or GIF.`);
  }
  if ((meta.width ?? 0) < MIN_DIMENSION || (meta.height ?? 0) < MIN_DIMENSION) {
    throw badRequest(`Image is too small. Minimum size is ${MIN_DIMENSION}×${MIN_DIMENSION}px.`);
  }

  const base = () => sharp(input, { limitInputPixels: 50_000_000, animated: false }).rotate();

  const [full, thumb, blur] = await Promise.all([
    base()
      .resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    base()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer(),
    base().resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer(),
  ]);

  await connectDB();
  const name = (opts.originalName ?? "image").replace(/[^\w.-]+/g, "_").slice(0, 120);
  const [fullId, thumbId] = await Promise.all([
    writeToGridFS(full.data, `${name}.full.webp`, { variant: "full" }),
    writeToGridFS(thumb, `${name}.thumb.webp`, { variant: "thumb" }),
  ]);

  try {
    const doc = await Media.create({
      originalName: opts.originalName?.slice(0, 255),
      alt: opts.alt?.slice(0, 300) ?? "",
      width: full.info.width,
      height: full.info.height,
      size: full.info.size,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      variants: { full: fullId, thumb: thumbId },
      source: opts.source ?? "upload",
      credit: opts.credit,
    });
    logger.info("media.ingested", { id: String(doc._id), source: doc.source, bytes: full.info.size });
    return toMediaDTO(doc.toObject() as MediaDoc);
  } catch (err) {
    await Promise.allSettled([bucket().delete(fullId), bucket().delete(thumbId)]);
    throw err;
  }
}

/** Downloads a remote image (with a timeout and size guard) and ingests it. */
export async function ingestRemoteImage(url: string, opts: IngestOptions = {}): Promise<MediaDTO> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length && length > env.maxUploadBytes * 2) throw new Error("Remote image is too large");
  const buf = Buffer.from(await res.arrayBuffer());
  return ingestImage(buf, opts);
}

export async function listMedia({ page = 1, limit = 40 }: { page?: number; limit?: number } = {}) {
  await connectDB();
  const [items, total] = await Promise.all([
    Media.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<MediaDoc[]>(),
    Media.countDocuments(),
  ]);
  return { items: items.map(toMediaDTO), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function updateMediaAlt(id: string, alt: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Image not found");
  await connectDB();
  const doc = await Media.findByIdAndUpdate(id, { $set: { alt: alt.slice(0, 300) } }, { returnDocument: "after" }).lean<MediaDoc>();
  if (!doc) throw notFound("Image not found");
  return toMediaDTO(doc);
}

export async function deleteMedia(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Image not found");
  await connectDB();
  const doc = await Media.findById(id).lean<MediaDoc>();
  if (!doc) throw notFound("Image not found");
  if (doc.variants) await Promise.allSettled([bucket().delete(doc.variants.full), bucket().delete(doc.variants.thumb)]);
  await Media.deleteOne({ _id: id });
}

/** Opens a read stream for a media variant. Returns null if missing. */
export async function openMediaStream(id: string, variant: "full" | "thumb") {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await Media.findById(id).select("variants updatedAt").lean<MediaDoc>();
  if (!doc?.variants) return null;
  const fileId = variant === "thumb" ? doc.variants.thumb : doc.variants.full;
  const files = await bucket().find({ _id: fileId }).limit(1).toArray();
  const file = files[0];
  if (!file) return null;
  const nodeStream = bucket().openDownloadStream(fileId);
  return {
    stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
    length: file.length,
    etag: `"${String(fileId)}"`,
  };
}
