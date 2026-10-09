import { z } from "zod";
import { getStudent } from "@/lib/auth/student";
import { connectDB } from "@/lib/db/connect";
import { assertSameOrigin, ok, readJson, route, unauthorized } from "@/lib/http";
import { Student } from "@/lib/models";
import { sanitizePlain } from "@/lib/content/html";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().max(30).refine((p) => p === "" || /^[+\d][\d\s-]{6,}$/.test(p), "Enter a valid phone number"),
});

export const PATCH = route(async (req) => {
  assertSameOrigin(req);
  const student = await getStudent();
  if (!student) throw unauthorized("Please sign in again.");
  const input = schema.parse(await readJson(req));
  await connectDB();
  await Student.updateOne({ _id: student._id }, { $set: { name: sanitizePlain(input.name), phone: input.phone } });
  return ok({ saved: true });
});
