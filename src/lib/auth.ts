import crypto from "crypto";
import { db } from "@/lib/db";

// Fail-secure: refuse to sign tokens with a hardcoded fallback. The secret
// MUST come from the server environment (.env AUTH_SECRET). A missing secret
// throws at boot rather than silently using a publicly-known value.
const SECRET = process.env.AUTH_SECRET;
if (!SECRET) {
  throw new Error(
    "AUTH_SECRET is not set. Add it to the server environment before signing tokens."
  );
}

/* ---------------- password hashing (scrypt) ---------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/* ---------------- signed tokens (HMAC) ---------------- */

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

export type TokenPayload = {
  sub: string;
  role: "member" | "admin";
  exp: number; // epoch ms
};

export function signToken(payload: Omit<TokenPayload, "exp">, ttlMs = 1000 * 60 * 60 * 24 * 14): string {
  const full: TokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const body = b64url(JSON.stringify(full));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | null | undefined): TokenPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body)) as TokenPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------------- request auth helpers ---------------- */

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Safe own-row fields for the signed-in member. Deliberately EXCLUDES
// passwordHash and ALL relation includes — nested member rows (idea authors,
// interested members) must never ride along on auth responses, or their
// scrypt hashes would leak to the client (offline-crackable).
const AUTH_MEMBER_SELECT = {
  id: true,
  email: true,
  name: true,
  college: true,
  gradYear: true,
  bio: true,
  skills: true,
  roles: true,
  availableFor: true,
  notifPrefs: true,
  createdAt: true,
} as const;

export async function getAuthMember(req: Request) {
  const payload = verifyToken(getBearerToken(req));
  if (!payload || payload.role !== "member") return null;
  return db.member.findUnique({
    where: { id: payload.sub },
    select: AUTH_MEMBER_SELECT,
  });
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  const payload = verifyToken(getBearerToken(req));
  return !!payload && payload.role === "admin";
}

export function json(data: unknown, status = 200) {
  return Response.json(data as Record<string, unknown>, { status });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/* ---------------- invite tokens ---------------- */

export function generateInviteToken(): string {
  // e.g. CNCL-7K2P-QX9M-4TZA
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join("");
  return `CNCL-${pick(4)}-${pick(4)}-${pick(4)}`;
}
