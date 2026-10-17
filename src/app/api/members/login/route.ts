import { db } from "@/lib/db";
import { json, jsonError, signToken, verifyPassword } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000))
      return jsonError("Too many login attempts. Try again in a minute.", 429);

    const { email, password } = (await req.json()) as { email: string; password: string };
    if (!email || !password) return jsonError("Email and password are required");

    const member = await db.member.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!member || !verifyPassword(password, member.passwordHash))
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
