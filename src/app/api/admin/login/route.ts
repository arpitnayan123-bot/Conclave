import { timingSafeEqual, createHash } from "crypto";
import { json, jsonError, signToken, verifyToken } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Production: the console password comes from the environment ONLY.
// There is deliberately no insecure fallback in code — if the variable is
// missing, the console reports itself as unconfigured instead of guessing.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(req: Request) {
  if (!ADMIN_PASSWORD) {
    console.error("[admin-login] ADMIN_PASSWORD is not set in the environment");
    return jsonError(
      "Admin console is not configured — set ADMIN_PASSWORD in the server environment.",
      503
    );
  }

  if (!rateLimit(`admin-login:${clientIp(req)}`, 8, 10 * 60_000))
    return jsonError("Too many attempts. Try again in a few minutes.", 429);

  const { password } = (await req.json()) as { password?: string };
  // compare through SHA-256 digests so the comparison is constant-time and
  // length differences can't leak anything about the real password
  const given = createHash("sha256").update(password ?? "").digest();
  const expected = createHash("sha256").update(ADMIN_PASSWORD).digest();
  if (!timingSafeEqual(given, expected))
    return jsonError("Incorrect admin password", 401);

  const token = signToken({ sub: "admin", role: "admin" }, 1000 * 60 * 60 * 12);
  return json({ token });
}

export async function GET(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return json({ valid: false });
  return json({ valid: true });
}
