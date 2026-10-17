import { db } from "@/lib/db";
import { verifyPassword, json, jsonError, signToken } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
/**
 * POST /api/auth/email/verify  { email, code }
 *
 * Verifies a 6-digit email one-time code and issues the same signed session
 * token as password login (HMAC, 14-day TTL).
 * Defences:
 *  - per-IP sliding window (10 verifications / 10 min)
 *  - codes expire after 10 minutes
 *  - max 5 wrong attempts per code, then the code is burned
 *  - single-use: a consumed code can never verify again
 *  - timing-safe comparison via scrypt verify (constant-ish time)
 */

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`otp-verify:${ip}`, 10, 10 * 60_000))
      return jsonError("Too many verification attempts. Try again in a few minutes.", 429);

    const { email: rawEmail, code } = (await req.json()) as { email?: string; code?: string };
    const email = rawEmail?.trim().toLowerCase();
    const trimmed = code?.trim() ?? "";
    if (!email || !/^\d{6}$/.test(trimmed))
      return jsonError("Enter the 6-digit code from your email");

    const member = await db.member.findUnique({ where: { email } });
    if (!member)
      return jsonError("No seat exists for this email — membership is by invitation only.", 404);

    const otp = await db.emailOtp.findFirst({
      where: { email, purpose: "LOGIN" },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) return jsonError("Request a fresh code — none is pending for this email.", 400);

    // expiry — a stale code is burned on sight
    if (otp.consumedAt || otp.expiresAt.getTime() < Date.now()) {
      return jsonError("This code has expired. Request a new one.", 410);
    }

    // attempt limit — burn the code after too many wrong tries
    if (otp.attempts >= MAX_ATTEMPTS) {
      return jsonError(
        "Too many wrong attempts — this code is locked. Request a new one.",
        429
      );
    }

    const matches = verifyPassword(trimmed, otp.codeHash);
    if (!matches) {
      const attempts = otp.attempts + 1;
      await db.emailOtp.update({ where: { id: otp.id }, data: { attempts } });
      const left = MAX_ATTEMPTS - attempts;
      return jsonError(
        left > 0
          ? `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} remaining.`
          : "That code isn't right — the code is now locked. Request a new one.",
        401
      );
    }

    // success — burn the code (single-use) and issue the session token
    await db.emailOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const jwt = signToken({ sub: member.id, role: "member" });
    return json({
      token: jwt,
      member: {
        id: member.id, name: member.name, email: member.email, college: member.college,
        gradYear: member.gradYear, bio: member.bio, skills: member.skills,
        roles: member.roles, availableFor: member.availableFor,
      },
    });
  } catch (e) {
    console.error("email otp verify failed", e);
    return jsonError("Verification failed. Please try again.", 500);
  }
}
