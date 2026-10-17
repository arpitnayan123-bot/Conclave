/**
 * Branded invitation email builder — shared by the review committee's
 * email preview dialog, "copy HTML" mail-merge path, and plain-text
 * mailto fallback. Pure functions, no DOM/Node deps.
 */

export type InviteEmailData = {
  name: string;
  ideaTitle: string;
  email: string;
  link: string;
};

export type InviteEmail = {
  subject: string;
  text: string;
  html: string;
};

const BRAND_BG = "#0e0c09";
const PANEL_BG = "#1a1611";
const GOLD = "#e5b84b";
const GOLD_SOFT = "#f0dfae";
const ACCENT = "#e5b84b";
const ACCENT_DEEP = "#a8822a";
const INK = "#161209";
const BODY = "#e9e1d0";
const MUTED = "#a2967d";

export function inviteSubject(_data: InviteEmailData): string {
  return "You're invited to Conclave — the private founders' club";
}

export function inviteText(data: InviteEmailData): string {
  return [
    `Hi ${data.name},`,
    ``,
    `Congratulations. The Conclave committee has reviewed your petition "${data.ideaTitle}" and voted to admit you.`,
    ``,
    `Claim your seat in the club with your personal invitation link:`,
    data.link,
    ``,
    `Your link is tied to this Gmail address (${data.email}) and can be used once.`,
    ``,
    `See you inside the circle,`,
    `The Conclave Committee`,
  ].join("\n");
}

/** escape for safe HTML interpolation */
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the full branded HTML email (inline styles only — survives Gmail).
 * Obsidian-and-champagne "private club" look matching the product,
 * table-based for email clients.
 */
export function inviteHtml(data: InviteEmailData): string {
  const name = esc(data.name.split(" ")[0] || data.name);
  const idea = esc(data.ideaTitle);
  const link = esc(data.link);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${inviteSubject(data)}</title></head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:Georgia,'Times New Roman',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- wordmark -->
  <tr><td style="padding:8px 8px 24px 8px;" align="center">
    <span style="display:inline-block;font-size:17px;font-weight:600;letter-spacing:5px;color:#f4efe2;">
      C<span style="color:${GOLD};">O</span>NCLAVE
    </span>
    <br>
    <span style="display:inline-block;margin-top:6px;font-size:9px;letter-spacing:3px;color:${MUTED};text-transform:uppercase;">
      &#9670; &nbsp;The Private Founders&rsquo; Club&nbsp; &#9670;
    </span>
  </td></tr>

  <!-- card -->
  <tr><td style="background:${PANEL_BG};border:1px solid rgba(229,184,75,0.22);border-radius:4px;padding:40px 34px;">

    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${GOLD};">
      &#9670; Selected — welcome to the club
    </p>

    <h1 style="margin:8px 0 18px 0;font-size:27px;line-height:1.3;font-weight:600;color:#f4efe2;">
      You&rsquo;re in, ${name}.
    </h1>

    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:${BODY};">
      The Conclave committee reviewed <strong style="color:${GOLD_SOFT};">&ldquo;${idea}&rdquo;</strong> and voted
      <strong style="color:#6ee7b7;">yes</strong>. You are now invited to take your seat inside an
      elite, invitation-only circle of startup and business builders — sharing ventures,
      finding co-founders, and building together under one roof.
    </p>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:26px 0;">
      <tr><td align="center">
        <a href="${link}"
           style="display:inline-block;background:linear-gradient(135deg,${GOLD_SOFT},${ACCENT_DEEP});color:${INK};
                  font-size:14px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 38px;border-radius:3px;">
          Claim your seat &rarr;
        </a>
      </td></tr>
    </table>

    <!-- link fallback -->
    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${MUTED};">
      Your personal invitation
    </p>
    <p style="margin:0 0 20px 0;font-size:12px;line-height:1.6;color:${GOLD};background:rgba(229,184,75,0.08);
              border:1px solid rgba(229,184,75,0.25);border-radius:3px;padding:12px 14px;word-break:break-all;">
      ${link}
    </p>

    <p style="margin:0;font-size:12.5px;line-height:1.7;color:${MUTED};">
      This invitation is <strong style="color:${BODY};">single-use</strong> and locked to
      <strong style="color:${BODY};">${esc(data.email)}</strong>. Seats are limited —
      claim yours before the next candidate does.
    </p>
  </td></tr>

  <!-- footer -->
  <tr><td style="padding:22px 8px 4px 8px;" align="center">
    <p style="margin:0;font-size:11px;line-height:1.8;color:${MUTED};">
      CONCLAVE — an elite private club for startup &amp; business builders.<br>
      Not a job board. A circle of owners.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** full package: subject + plain text + html */
export function buildInviteEmail(data: InviteEmailData): InviteEmail {
  return { subject: inviteSubject(data), text: inviteText(data), html: inviteHtml(data) };
}

/** mail-merge template (merge vars instead of sample data) — for batch copy */
export function inviteHtmlTemplate(): string {
  return inviteHtml({
    name: "{{first_name}}",
    ideaTitle: "{{idea_title}}",
    email: "{{email}}",
    link: "{{invite_link}}",
  });
}
