"use client";

/**
 * Tiny client for the admin API. Unwraps the { ok, data | error } envelope,
 * throws ApiClientError with a human message, and bounces to the login page
 * when the session has expired.
 */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
  /** Field-level validation messages keyed by path (e.g. "title"). */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) for (const d of this.details as { path: string; message: string }[]) if (d.path && !out[d.path]) out[d.path] = d.message;
    return out;
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; form?: FormData; signal?: AbortSignal };

export async function api<T = unknown>(url: string, opts: Options = {}): Promise<T> {
  const { method = opts.body || opts.form ? "POST" : "GET", body, form, signal } = opts;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      credentials: "same-origin",
      headers: form ? undefined : body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiClientError("Network error. Check your connection and try again.", 0, "network");
  }

  const json = (await res.json().catch(() => null)) as { ok: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;

  if (res.status === 401 && typeof window !== "undefined" && !url.includes("/auth/")) {
    // Full reload on purpose: the session is gone, so reset all client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiClientError("Your session expired. Please sign in again.", 401, "unauthorized");
  }
  if (!res.ok || !json?.ok) {
    throw new ApiClientError(json?.error?.message ?? `Request failed (${res.status})`, res.status, json?.error?.code, json?.error?.details);
  }
  return json.data as T;
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}
