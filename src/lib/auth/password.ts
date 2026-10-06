import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt.
 * Format: scrypt:<N>:<r>:<p>:<salt b64url>:<hash b64url>
 * (deliberately free of `$` characters so it can sit safely in a .env file).
 */

const KEYLEN = 64;
const DEFAULTS = { N: 16384, r: 8, p: 1 };

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, DEFAULTS);
  return ["scrypt", DEFAULTS.N, DEFAULTS.r, DEFAULTS.p, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64!, "base64url");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64!, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
