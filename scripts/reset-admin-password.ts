/**
 * Recovery: sets a new admin password directly in the database and signs out
 * every device. Run on the server if the password is forgotten.
 *   npm run admin:reset-password
 */
import "./load-env";
import mongoose from "mongoose";
import { createInterface } from "node:readline";
import { newPasswordSchema, setAdminPassword } from "../src/lib/services/admin-account";

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
    if ((await prompt("Confirm password: ")) !== password) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
  }
  const check = newPasswordSchema.safeParse(password);
  if (!check.success) {
    console.error(check.error.issues[0]?.message);
    process.exit(1);
  }
  const { signedOutSessions } = await setAdminPassword(password);
  console.log(`\n✓ Admin password updated in the database. Signed out ${signedOutSessions} session(s).`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
