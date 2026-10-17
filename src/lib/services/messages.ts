import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Message, type MessageDoc } from "@/lib/models";
import { notFound } from "@/lib/http";
import { sanitizePlain } from "@/lib/content/html";
import type { MessageDTO } from "@/lib/types";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/services/email";
import { adminNewMessageEmail } from "@/lib/email/templates";
import { adminNotifyEmail } from "@/lib/services/mentorship";
import { absoluteUrl } from "@/lib/site";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell me your name").max(100),
  email: z.email("Please enter a valid email").max(200),
  topic: z.enum(["question", "session", "payment", "account", "feedback", "collaboration", "speaking", "other"]).default("other"),
  organisation: z.string().trim().max(120).default(""),
  message: z.string().trim().min(20, "A little more detail helps (20+ characters)").max(5000),
  /** Honeypot. Real users never see or fill this field. */
  website: z.string().max(500).optional(),
});

export function toMessageDTO(m: MessageDoc & { createdAt?: Date }): MessageDTO {
  return {
    id: String(m._id),
    name: m.name,
    email: m.email,
    topic: m.topic ?? "other",
    organisation: m.organisation ?? "",
    message: m.message,
    status: (m.status ?? "new") as MessageDTO["status"],
    createdAt: new Date(m.createdAt ?? Date.now()).toISOString(),
  };
}

export async function createMessage(input: z.infer<typeof contactSchema>, ip: string) {
  await connectDB();
  await Message.create({
    name: sanitizePlain(input.name),
    email: input.email,
    topic: input.topic,
    organisation: sanitizePlain(input.organisation),
    message: sanitizePlain(input.message),
    ip,
  });
  // Let the admin know straight away (never blocks or fails the submission).
  adminNotifyEmail()
    .then((to) => {
      if (!to) return;
      const mail = adminNewMessageEmail({ name: input.name, email: input.email, topic: input.topic, message: input.message, adminUrl: absoluteUrl("/admin/messages") });
      return sendEmail({ to, ...mail, replyTo: input.email, kind: "admin_new_message" });
    })
    .catch((error) => logger.warn("contact.notify_failed", { error }));
}

export async function listMessages(status?: string) {
  await connectDB();
  const query =
    status === "new" || status === "read" || status === "archived"
      ? Message.find({ status })
      : Message.find({ status: { $ne: "archived" as const } });
  const docs = await query.sort({ createdAt: -1 }).limit(200).lean<(MessageDoc & { createdAt: Date })[]>();
  return docs.map(toMessageDTO);
}

export async function countNewMessages() {
  await connectDB();
  return Message.countDocuments({ status: "new" });
}

export async function setMessageStatus(id: string, status: "new" | "read" | "archived") {
  if (!Types.ObjectId.isValid(id)) throw notFound("Message not found");
  await connectDB();
  const doc = await Message.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: "after" }).lean<MessageDoc & { createdAt: Date }>();
  if (!doc) throw notFound("Message not found");
  return toMessageDTO(doc);
}

export async function deleteMessage(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Message not found");
  await connectDB();
  const res = await Message.findByIdAndDelete(id);
  if (!res) throw notFound("Message not found");
}
