import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Random URL-safe token plus its SHA-256 hash (only the hash is stored). */
export function createToken(bytes = 32): { token: string; hash: string } {
  const token = crypto.randomBytes(bytes).toString("base64url");
  return { token, hash: sha256(token) };
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Human-friendly invite code without ambiguous characters (0/O, 1/I). */
export function createInviteCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}
