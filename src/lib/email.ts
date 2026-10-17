import "server-only";

/**
 * Resend email delivery — SERVER ONLY.
 * The API key lives in .env (RESEND_API_KEY) and must never reach the client:
 * this module is imported exclusively by API routes and guarded by `server-only`.
 *
 * Sender: EMAIL_FROM must match a domain verified at resend.com/domains for
 * production delivery. Without a verified domain, Resend's sandbox sender
 * (onboarding@resend.dev) only delivers to the Resend account owner's own inbox.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailResult =
  | { ok: true; id: string }
  | {
      ok: false;
      /** "not_configured" | "provider_rejected" | "network" */
      kind: "not_configured" | "provider_rejected" | "network";
      /** safe-to-show message for the client */
      message: string;
      /** raw provider detail for server logs only */
      detail?: string;
      /** HTTP status we should surface */
      status: number;
    };

export function emailFromAddress(): string {
  return process.env.EMAIL_FROM || "Conclave <onboarding@resend.dev>";
}

/** True when the sender is Resend's sandbox address (delivery restrictions apply). */
export function isSandboxSender(): boolean {
  return /onboarding@resend\.dev/i.test(emailFromAddress());
}

/**
 * Send an email through Resend's REST API. Never throws — returns a discriminated
 * result so routes can surface honest errors instead of fake success.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      kind: "not_configured",
      status: 503,
      message:
        "Email delivery is not configured on the server. Set RESEND_API_KEY in the environment and restart.",
    };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      // don't hang the request on a stuck provider
      signal: AbortSignal.timeout(10_000),
    });

    const payload = (await res.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (res.ok && payload?.id) {
      return { ok: true, id: payload.id };
    }

    // Provider refused the request — surface the real reason honestly.
    const detail = payload?.message || `HTTP ${res.status}`;
    console.error(`[email] Resend rejected send: ${detail}`);

    // Resend's sandbox/verification rejections (403 validation_error variants)
    const restricted =
      res.status === 403 ||
      /verify|restricted|not send|test email|domain/i.test(detail);
    return {
      ok: false,
      kind: "provider_rejected",
      status: restricted ? 403 : 502,
      message: restricted
        ? "The email provider refused delivery for this address. Until a sending domain is verified at resend.com, delivery is limited to the account owner's inbox."
        : "The email provider declined to send this message. Please try again shortly.",
      detail,
    };
  } catch (e) {
    console.error("[email] network failure talking to Resend", e);
    return {
      ok: false,
      kind: "network",
      status: 502,
      message: "Could not reach the email provider. Please try again in a moment.",
    };
  }
}
