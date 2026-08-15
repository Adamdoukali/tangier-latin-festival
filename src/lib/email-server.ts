// ─── Branded transactional email via Resend (server-side) ─────────────
// Free tier: 3,000 emails/month. Runs on the server so the API key is
// never exposed to visitors. When RESEND_API_KEY is not configured the
// function reports { sent: false } and callers fall back to FormSubmit,
// so the site keeps working with zero configuration.
//
// Setup (one time):
//   1. Create a free account at https://resend.com
//   2. Domains → Add tangierlatinfestival.com → add the DNS records it
//      shows (TXT/DKIM at CapConnect) → wait for "Verified"
//   3. API Keys → create key → add it in Vercel → Settings →
//      Environment Variables as RESEND_API_KEY (and in local .env)

import { createServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";

const FROM = "Tangier International Latin Festival <tickets@tangierlatinfestival.com>";
const TEAM_EMAIL = "contact@tangierlatinfestival.com";
const GOLD = "#d4af37";

export interface EmailPayload {
  guestEmail: string;
  guestName: string;
  /** Subject of the internal notification to the festival inbox */
  subject: string;
  /** Data rows shown in the internal notification */
  fields: Record<string, string>;
  /** Guest-facing message (plain text with \n line breaks) */
  message: string;
  /** Guest email subject */
  guestSubject: string;
  /** Guest's language ('en' | 'fr' | 'es') for buttons/notes */
  lang?: string;
  /** When set, the QR code is attached and a ticket button is shown */
  ticket?: { code: string; url: string } | null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function guestHtml(p: EmailPayload): string {
  const paragraphs = p.message
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px;line-height:1.6">${esc(para).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const lang = p.lang === "fr" || p.lang === "es" ? p.lang : "en";
  const btnText =
    lang === "fr" ? "🎫 Voir mon billet" : lang === "es" ? "🎫 Ver mi entrada" : "🎫 Open my ticket";
  const noteText =
    lang === "fr"
      ? "le QR code est en pièce jointe de cet email."
      : lang === "es"
        ? "el código QR está adjunto a este correo."
        : "the QR code is attached to this email.";
  const ticketBlock = p.ticket
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${p.ticket.url}" style="display:inline-block;background:${GOLD};color:#18181b;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:999px">${btnText}</a>
         <p style="margin:12px 0 0;font-size:12px;color:#71717a">Ticket: <b>${esc(p.ticket.code)}</b> — ${noteText}</p>
       </div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#27272a">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#18181b;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <p style="margin:0;color:${GOLD};letter-spacing:4px;font-size:12px;text-transform:uppercase">Tangier International</p>
      <p style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:2px">LATIN FESTIVAL</p>
      <p style="margin:8px 0 0;color:#a1a1aa;font-size:12px">January 07–11, 2027 · Kenzi Solazur Hotel, Tangier</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px 24px">
      ${paragraphs}
      ${ticketBlock}
    </div>
    <p style="text-align:center;font-size:11px;color:#a1a1aa;margin:16px 0 0">
      ${TEAM_EMAIL} · +212 6 64 01 02 79 · tangierlatinfestival.com
    </p>
  </div>
</body></html>`;
}

function teamHtml(p: EmailPayload): string {
  const rows = Object.entries(p.fields)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;border:1px solid #e4e4e7;font-weight:bold">${esc(k)}</td><td style="padding:6px 12px;border:1px solid #e4e4e7">${esc(v)}</td></tr>`
    )
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#27272a">
  <h2 style="margin:0 0 12px">${esc(p.subject)}</h2>
  <table style="border-collapse:collapse;font-size:14px">${rows}</table>
</body></html>`;
}

async function resendSend(
  apiKey: string,
  body: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.warn("[email-server] Resend error:", res.status, await res.text().catch(() => ""));
  }
  return res.ok;
}

/** Sends the guest email (branded, QR attached for tickets) and the
 *  internal notification via Resend. Returns { sent: false } when the
 *  RESEND_API_KEY env var isn't configured — caller should fall back. */
export const sendEmailViaResend = createServerFn({ method: "POST" })
  .validator((data: EmailPayload) => data)
  .handler(async ({ data }) => {
    const apiKey =
      process.env.RESEND_API_KEY ||
      process.env.VITE_RESEND_API_KEY ||
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_RESEND_API_KEY);
    if (!apiKey) {
      console.warn("[email-server] RESEND_API_KEY is not configured in server environment variables.");
      return { sent: false, reason: "not-configured" as const };
    }

    // QR attachment for confirmed tickets
    let attachments: Array<{ filename: string; content: string }> | undefined;
    if (data.ticket) {
      try {
        const dataUrl = await QRCode.toDataURL(data.ticket.url, {
          width: 480,
          margin: 2,
          color: { dark: "#18181b", light: "#ffffff" },
        });
        attachments = [
          {
            filename: `ticket-${data.ticket.code}.png`,
            content: dataUrl.split(",")[1],
          },
        ];
      } catch {
        /* email still goes out with the link */
      }
    }

    const guestOk = await resendSend(apiKey, {
      from: FROM,
      to: [data.guestEmail],
      reply_to: TEAM_EMAIL,
      subject: data.guestSubject,
      html: guestHtml(data),
      text: data.message,
      ...(attachments ? { attachments } : {}),
    });

    // Internal notification — best effort, don't fail the guest email
    resendSend(apiKey, {
      from: FROM,
      to: [TEAM_EMAIL],
      reply_to: data.guestEmail,
      subject: data.subject,
      html: teamHtml(data),
    }).catch(() => {});

    return { sent: guestOk, reason: guestOk ? ("ok" as const) : ("send-failed" as const) };
  });
