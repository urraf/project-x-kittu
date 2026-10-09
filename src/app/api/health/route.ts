import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { logger } from "@/lib/logger";
import { runDueTasks } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    // The keep-awake ping also drives session reminders & feedback emails.
    await runDueTasks().catch((error) => logger.error("tasks.failed", { error }));
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
