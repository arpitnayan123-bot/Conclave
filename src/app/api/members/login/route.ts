import { db } from "@/lib/db";
import { hashPassword, json, jsonError, signToken, verifyPassword } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Timing equalizer: an unknown email runs the same scrypt verify against a
// throwaway hash, so "no such member" and "wrong password" take the same
// wall-clock time and can't be told apart (email enumeration defence).
const DUMMY_HASH = hashPassword("conclave:timing-equalizer:matches-nothing");

export async function POST(req: Request) {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000))
      return jsonError("Too many login attempts. Try again in a minute.", 429);

    const { email, password } = (await req.json()) as { email: string; password: string };
    // field-type guard — a non-string email would crash .trim() as an opaque 500
    if (email !== undefined && typeof email !== "string") return jsonError("Invalid credentials payload", 400);
    if (password !== undefined && typeof password !== "string") return jsonError("Invalid credentials payload", 400);
    if (!email || !password) return jsonError("Email and password are required");

    const member = await db.member.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!member) {
      verifyPassword(password, DUMMY_HASH);
      return jsonError("Invalid email or password", 401);
    }
    if (!verifyPassword(password, member.passwordHash))
      return jsonError("Invalid email or password", 401);

    const jwt = signToken({ sub: member.id, role: "member" });
    return json({
      token: jwt,
      member: {
        id: member.id, name: member.name, email: member.email, college: member.college,
        gradYear: member.gradYear, bio: member.bio, skills: member.skills,
        roles: member.roles, availableFor: member.availableFor,
      },
    });
  } catch {
    return jsonError("Login failed. Please try again.", 500);
  }
}
