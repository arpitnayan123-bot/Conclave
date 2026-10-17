import { db } from "@/lib/db";
import { hashPassword, json, jsonError } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * POST /api/auth/email/otp  { email }
 *
 * Emails a 6-digit one-time code to an existing member.
 * Defences:
 *  - per-IP sliding window (6 requests / 10 min)
 *  - per-email cooldown (60 s between codes)
 *  - per-email hourly cap (5 codes / hour)
 *  - codes stored only as scrypt hashes, 10-minute expiry, single-use
 * The 6-digit code NEVER appears in any API response.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 s between sends
const HOURLY_CAP = 5; // max codes per email per hour

function generateCode(): string {
  // crypto-random 6 digits, zero-padded — 1,000,000 combinations
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

const otpMail = (code: string, minutes: number) => ({
  subject: `${code} — your Conclave sign-in code`,
  text: `Your Conclave sign-in code is ${code}. It expires in ${minutes} minutes. If you did not request it, ignore this note — the committee will too.`,
  html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#12100b;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;padding-bottom:8px;">
      <span style="color:#e5b84b;font-size:13px;letter-spacing:6px;text-transform:uppercase;">Conclave</span>
      <span style="color:#6b6353;font-size:13px;"> · </span>
      <span style="color:#6b6353;font-size:11px;letter-spacing:4px;text-transform:uppercase;">The Private Founders' Club</span>
    </div>
    <div style="border-top:1px solid #2a251c;margin:16px 0 28px;"></div>
    <p style="color:#f5efe0;font-size:22px;margin:0 0 8px;">Your sign-in code</p>
    <p style="color:#a39a86;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Present this at the door. It expires in ${minutes} minutes and works once.
    </p>
    <div style="text-align:center;background:#1c1812;border:1px solid rgba(229,184,75,.35);border-radius:14px;padding:22px;margin:0 0 24px;">
      <span style="color:#e5b84b;font-size:38px;letter-spacing:12px;font-weight:700;">${code}</span>
    </div>
    <p style="color:#6b6353;font-size:12px;line-height:1.6;margin:0;">
      If you did not request this code, ignore this note — the committee will too.
      Members never share codes; the concierge will never ask for yours.
    </p>
  </div>
</body></html>`,
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);

    // ── rate limiting: per-IP ────────────────────────────────────────────
    if (!rateLimit(`otp-ip:${ip}`, 6, 10 * 60_000))
      return jsonError(
        "Too many code requests from this network. Try again in a few minutes.",
        429
      );

    const { email: rawEmail } = (await req.json()) as { email?: string };
    const email = rawEmail?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("Enter a valid email address");

    // ── membership check (private club — a seat must exist) ──────────────
    const member = await db.member.findUnique({ where: { email } });
    if (!member)
      return jsonError(
        "No seat exists for this email — membership is extended by invitation only.",
        404
      );

    // ── per-email cooldown + hourly cap (DB-backed, survives redeploys) ──
    const prior = await db.emailOtp.findFirst({
      where: { email, purpose: "LOGIN" },
      orderBy: { lastSentAt: "desc" },
    });
    const now = Date.now();
    if (prior && now - prior.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - prior.lastSentAt.getTime())) / 1000
      );
      return Response.json(
        { error: `A code was just sent. Wait ${wait}s before requesting another.`, retryAfter: wait },
        { status: 429 }
      );
    }
    const sentLastHour = await db.emailOtp.count({
      where: { email, purpose: "LOGIN", lastSentAt: { gte: new Date(now - 3_600_000) } },
    });
    if (sentLastHour >= HOURLY_CAP)
      return jsonError(
        "Too many codes requested for this email in the last hour. Try again later.",
        429
      );

    // ── generate + store the code (hash only) ────────────────────────────
    const code = generateCode();
    await db.emailOtp.create({
      data: {
        email,
        purpose: "LOGIN",
        codeHash: hashPassword(code),
        expiresAt: new Date(now + CODE_TTL_MS),
        lastSentAt: new Date(now),
        requestIp: ip,
      },
    });

    // ── deliver via Resend ───────────────────────────────────────────────
    const minutes = Math.round(CODE_TTL_MS / 60_000);
    const mail = otpMail(code, minutes);
    const result = await sendEmail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (!result.ok) {
      // Honest failure — the code exists in the DB but was never delivered;
      // surface the provider truth instead of pretending it was sent.
      console.error(`[otp] delivery failed for ${email}: ${result.kind} ${result.detail ?? ""}`);
      return Response.json(
        { error: result.message, delivered: false },
        { status: result.status }
      );
    }

    return json({
      sent: true,
      cooldownSeconds: RESEND_COOLDOWN_MS / 1000,
      expiresInSeconds: CODE_TTL_MS / 1000,
    });
  } catch (e) {
    console.error("email otp send failed", e);
    return jsonError("Could not send the code. Please try again.", 500);
  }
}
