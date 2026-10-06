import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ConfigError } from "@/lib/env";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, message, "bad_request", details);
export const unauthorized = (message = "Authentication required") => new ApiError(401, message, "unauthorized");
export const forbidden = (message = "Forbidden") => new ApiError(403, message, "forbidden");
export const notFound = (message = "Not found") => new ApiError(404, message, "not_found");
export const conflict = (message: string, details?: unknown) => new ApiError(409, message, "conflict", details);
export const tooMany = (message: string, retryAfterSec?: number) =>
  new ApiError(429, message, "rate_limited", retryAfterSec ? { retryAfterSec } : undefined);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    const res = NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
    const retry = (err.details as { retryAfterSec?: number } | undefined)?.retryAfterSec;
    if (retry) res.headers.set("Retry-After", String(retry));
    return res;
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "validation_error",
          message: err.issues[0]?.message ?? "Invalid input",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422 },
    );
  }
  if (err instanceof ConfigError) {
    logger.error("config.error", { error: err });
    return NextResponse.json({ ok: false, error: { code: "not_configured", message: err.message } }, { status: 503 });
  }
  logger.error("api.unhandled", { error: err });
  return NextResponse.json(
    { ok: false, error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route handler with uniform error handling. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
}

export async function readJson(req: Request): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    const text = await req.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw badRequest("Request body must be valid JSON");
    }
  }
  try {
    return await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}

/**
 * Basic CSRF defence for cookie-authenticated, state-changing requests: the
 * Origin (or Referer) must match the host serving the request.
 */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) throw forbidden("Missing request origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw forbidden("Cross-origin request blocked");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw forbidden("Invalid request origin");
  }
}
