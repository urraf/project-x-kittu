import "server-only";
import { ConfigError, env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Minimal Groq client (OpenAI-compatible Chat Completions API) with timeouts
 * and retry/backoff for rate limits and transient upstream failures.
 */

export class GroqError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = false,
  ) {
    super(message);
    this.name = "GroqError";
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  model?: string;
  timeoutMs?: number;
};

export type ChatResult = { content: string; model: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reasoning models spend part of the output budget "thinking" before they answer. */
function reasoningParams(model: string): { extra: Record<string, unknown>; headroom: number } {
  if (/gpt-oss/i.test(model)) return { extra: { reasoning_effort: env.groqReasoningEffort }, headroom: 2048 };
  if (/qwen3|deepseek-r1/i.test(model)) return { extra: { reasoning_format: "hidden" }, headroom: 2048 };
  return { extra: {}, headroom: 0 };
}

/** Removes any visible chain-of-thought some models emit inline. */
function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function groqChat(opts: ChatOptions): Promise<ChatResult> {
  const apiKey = env.groqApiKey;
  if (!apiKey) throw new ConfigError("GROQ_API_KEY is not configured. Add it to your environment variables.");
  const model = opts.model ?? env.groqModel;
  const reasoning = reasoningParams(model);
  // Rate limits (429) are common on Groq's free tier, so they get more patient retries.
  let maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(`${env.groqBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.7,
          max_completion_tokens: (opts.maxTokens ?? 2048) + reasoning.headroom,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          ...reasoning.extra,
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        if (res.status === 429) maxAttempts = 5;
        let message = `Groq API error ${res.status}`;
        let code: string | undefined;
        try {
          const parsed = JSON.parse(body)?.error;
          message = parsed?.message ?? message;
          code = parsed?.code;
        } catch {
          /* non-JSON error body */
        }
        if (code === "model_not_found") {
          message += ` Set GROQ_MODEL to a model your Groq account can use (e.g. openai/gpt-oss-120b) and restart the server.`;
        }
        if (retryable && attempt < maxAttempts) {
          const retryAfter = Number(res.headers.get("retry-after")) || 0;
          const backoff = (res.status === 429 ? 3000 : 1500) * 2 ** (attempt - 1);
          const wait = Math.min(20_000, Math.max(retryAfter * 1000, backoff));
          logger.warn("groq.retry", { status: res.status, attempt, waitMs: wait });
          await sleep(wait);
          continue;
        }
        if (res.status === 429) message = "The AI service is busy right now (usage limit reached). Please wait a minute and try again.";
        throw new GroqError(message, res.status, retryable);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        model?: string;
        usage?: ChatResult["usage"];
      };
      const content = stripThinking(json.choices?.[0]?.message?.content ?? "");
      if (!content.trim()) throw new GroqError("Groq returned an empty response", 502, true);
      logger.info("groq.completion", {
        model: json.model ?? model,
        ms: Date.now() - started,
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
        finish: json.choices?.[0]?.finish_reason,
      });
      return { content, model: json.model ?? model, usage: json.usage };
    } catch (err) {
      if (err instanceof GroqError && !err.retryable) throw err;
      if (err instanceof ConfigError) throw err;
      if (attempt >= maxAttempts) {
        if (err instanceof GroqError) throw err;
        const msg = (err as Error).name === "TimeoutError" ? "Groq request timed out" : `Groq request failed: ${(err as Error).message}`;
        throw new GroqError(msg, 504, true);
      }
      logger.warn("groq.retry_network", { attempt, error: err });
      await sleep(1500 * 2 ** (attempt - 1));
    }
  }
  throw new GroqError("Groq request failed after retries", 502, true);
}

/** Parses a JSON object from a model response, tolerating code fences or stray prose. */
export function parseJsonObject<T = unknown>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new GroqError("AI response was not valid JSON", 502, true);
  }
}
