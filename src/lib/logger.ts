/**
 * Tiny structured logger. Emits single-line JSON in production (easy to grep in
 * hosting logs) and readable lines in development.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const isProd = process.env.NODE_ENV === "production";

function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: isProd ? undefined : err.stack };
  return err;
}

function emit(level: Level, event: string, fields: Fields = {}) {
  const payload: Fields = { level, event, time: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) payload[k] = k === "error" ? serializeError(v) : v;

  const line = isProd ? JSON.stringify(payload) : `[${level}] ${event} ${Object.keys(fields).length ? JSON.stringify(fields, (k, v) => (k === "error" ? serializeError(v) : v)) : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug") {
    if (!isProd) console.debug(line);
  } else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit("debug", event, fields),
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};
