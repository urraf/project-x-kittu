/**
 * Plain, serialisable DTOs shared between server and client.
 * Never put Mongoose documents across the server/client boundary.
 */

export type ImageDTO = {
  url: string;
  alt: string;
  mediaId?: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  credit?: { name?: string; url?: string };
};

export type PostStatus = "draft" | "published";

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImage?: ImageDTO;
  thumbnail?: ImageDTO;
  readingTime: number;
  publishedAt?: string;
  updatedAt: string;
  featured: boolean;
  status: PostStatus;
  views: number;
  likes: number;
  commentCount: number;
  source: "manual" | "ai" | "automation";
  author: { name: string; avatar?: string; bio?: string };
};

export type PostFull = PostSummary & {
  content: string;
  wordCount: number;
  videoId?: string;
  createdAt: string;
  seo: { title?: string; description?: string; canonicalUrl?: string; ogImage?: string; noIndex?: boolean };
  generation?: { model?: string; topic?: string; generatedAt?: string; warnings?: string[] };
};

export type VideoDTO = {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  publishedAt?: string;
  durationSec?: number;
  views?: number;
  isShort: boolean;
  series: string;
  featured: boolean;
  hidden: boolean;
  source: string;
};

export type MilestoneDTO = {
  id: string;
  title: string;
  period: string;
  sortDate: string;
  chapter: string;
  location: string;
  description: string;
  highlights: string[];
  kind: string;
  image?: { url?: string; alt?: string };
  videoId?: string;
  published: boolean;
};

export type MediaDTO = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  width: number;
  height: number;
  size: number;
  blurDataURL?: string;
  source: string;
  originalName?: string;
  credit?: { name?: string; url?: string };
  createdAt: string;
};

export type MessageDTO = {
  id: string;
  name: string;
  email: string;
  topic: string;
  organisation: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

export type AutomationRunDTO = {
  id: string;
  idempotencyKey: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  topic?: string;
  postId?: string;
  postSlug?: string;
  postStatus?: string;
  message?: string;
  warnings?: string[];
};

export type CommentDTO = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  reply?: { text: string; at?: string };
};

export type AdminCommentDTO = CommentDTO & {
  status: "visible" | "pending" | "hidden";
  read: boolean;
  post?: { id: string; title: string; slug: string };
};

export type EngagementDTO = { views: number; likes: number; liked: boolean; commentCount: number };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: unknown } };
