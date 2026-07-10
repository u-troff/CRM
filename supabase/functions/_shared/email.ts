// Sends the finished report link to the prospect via Resend. Called from
// generate-report once a report flips to "done". Never throws — email is a
// best-effort side effect and must not fail the report itself. Returns a
// discriminated result so the caller can record delivered_at vs delivery_error.

interface SendReportEmailArgs {
  to: string;
  contactName: string | null;
  businessName: string | null;
  headline: string | null;
  summary: string | null;
  reportUrl: string;
}

export type EmailResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendReportEmail(args: SendReportEmailArgs): Promise<EmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  // "Name <addr@verified-domain>" — must be a Resend-verified sender.
  const from = Deno.env.get("REPORT_FROM_EMAIL");

  if (!apiKey || !from) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY or REPORT_FROM_EMAIL not set" };
  }
  if (!args.to || !args.to.includes("@")) {
    return { ok: false, skipped: true, reason: "no recipient email on submission" };
  }

  const greeting = args.contactName?.trim() ? `Hi ${esc(args.contactName.trim())},` : "Hi there,";
  const biz = args.businessName?.trim() ? esc(args.businessName.trim()) : "your business";
  const headline = args.headline?.trim() ? esc(args.headline.trim()) : "Your visibility scorecard is ready";
  const summary = args.summary?.trim()
    ? esc(args.summary.trim())
    : `We pulled together how ${biz} is showing up on Google against your local competitors.`;

  const subject = `${args.businessName?.trim() ? args.businessName.trim() + ": " : ""}your competitor teardown is ready`;

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0f1115;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;color:#e6e8eb;">
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">Your report on <strong>${biz}</strong> is ready.</p>
    <h1 style="font-size:20px;line-height:1.3;margin:16px 0 8px;color:#c6f24e;">${headline}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#b6bcc4;">${summary}</p>
    <a href="${esc(args.reportUrl)}" style="display:inline-block;background:#c6f24e;color:#0f1115;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">View your scorecard</a>
    <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#8b929c;">Or paste this link into your browser:<br><a href="${esc(args.reportUrl)}" style="color:#8b929c;">${esc(args.reportUrl)}</a></p>
  </div>
</body>
</html>`;

  const text = `${args.contactName?.trim() ? "Hi " + args.contactName.trim() + "," : "Hi there,"}

Your report on ${args.businessName?.trim() || "your business"} is ready.

${args.headline?.trim() || "Your visibility scorecard is ready"}
${args.summary?.trim() || ""}

View it here: ${args.reportUrl}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: args.to, subject, html, text }),
    });
    if (!res.ok) {
      return { ok: false, skipped: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, skipped: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
