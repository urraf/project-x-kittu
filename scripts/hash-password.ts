/**
 * Generates the ADMIN_PASSWORD_HASH value for your .env file.
 *   npm run admin:hash-password            (prompts, input hidden)
 *   npm run admin:hash-password -- "pass"  (non-interactive)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { hashPassword } from "../src/lib/auth/password";

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const anyRl = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let muted = false;
  anyRl._writeToOutput = (s: string) => {
    if (!muted || s.includes(question)) anyRl.output.write(s);
  };
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  let password = process.argv[2];
  if (!password) {
    password = await prompt("New admin password: ");
    const confirm = await prompt("Confirm password: ");
    if (password !== confirm) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
  }
  if (password.length < 12) {
    console.error("Use at least 12 characters (a short passphrase works well).");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  const line = `ADMIN_PASSWORD_HASH=${hash}`;
  const envFile = path.join(process.cwd(), ".env.local");
  if (existsSync(envFile)) {
    const current = readFileSync(envFile, "utf8");
    const next = /^ADMIN_PASSWORD_HASH=.*$/m.test(current)
      ? current.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line)
      : `${current.replace(/\n?$/, "\n")}${line}\n`;
    writeFileSync(envFile, next);
    console.log("\n✓ Saved ADMIN_PASSWORD_HASH to .env.local. Restart the dev server to apply.");
    console.log("  For production, add the same line to your hosting provider's environment variables:\n");
  } else {
    console.log("\nAdd this line to your environment variables:\n");
  }
  console.log(`${line}\n`);
}

main();
