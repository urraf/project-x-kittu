/** Prints strong random values for AUTH_SECRET and CRON_SECRET. */
import { randomBytes } from "node:crypto";

console.log(`AUTH_SECRET=${randomBytes(48).toString("base64url")}`);
console.log(`CRON_SECRET=${randomBytes(32).toString("base64url")}`);
