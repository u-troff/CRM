import { createClient } from "@supabase/supabase-js";

// Always fetch fresh — while the report is still generating the row flips
// pending -> processing -> done, and the page meta-refreshes to pick it up.
export const dynamic = "force-dynamic";

interface Competitor {
  name: string;
  rating: number | null;
  reviews: number | null;
}
interface ReportFacts {
  business_name: string | null;
  trade: string | null;
  city: string | null;
  found_in_rankings: boolean;
  rank: number | null;
  rating: number | null;
  reviews: number | null;
  top_competitors: Competitor[];
  review_gap: number | null;
  pagespeed_performance: number | null;
  pagespeed_seo: number | null;
}
interface ReportNarrative {
  headline: string;
  summary: string;
  ranking_insight: string;
  competitor_insight: string;
  site_insight: string;
  recommendations: string[];
  cta: string;
}
interface ReportRow {
  id: string;
  status: "pending" | "processing" | "done" | "failed";
  business_name: string | null;
  trade: string | null;
  city: string | null;
  report_data: { facts: ReportFacts; narrative: ReportNarrative } | null;
}

async function getReport(id: string): Promise<ReportRow | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("reports")
    .select("id, status, business_name, trade, city, report_data")
    .eq("id", id)
    .maybeSingle();
  return (data as ReportRow) ?? null;
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-sans)",
  padding: "48px 20px",
};
const shell: React.CSSProperties = { maxWidth: 760, margin: "0 auto" };
const card: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border-default)",
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main style={page}>
      <div style={{ ...shell, textAlign: "center", paddingTop: 80 }}>{children}</div>
    </main>
  );
}

function scoreColor(v: number | null): string {
  if (v == null) return "var(--text-muted)";
  if (v >= 80) return "var(--accent-emerald)";
  if (v >= 50) return "var(--accent-amber)";
  return "var(--accent-red)";
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, marginBottom: 0, padding: 18, textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div style={card}>
      <h3 style={{ fontSize: 13, color: "var(--accent-lime)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </h3>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text-secondary)" }}>{body}</p>
    </div>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return (
      <Centered>
        <h1 style={{ fontSize: 22 }}>Report not found</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 10 }}>This link may be invalid or expired.</p>
      </Centered>
    );
  }

  if (report.status === "pending" || report.status === "processing") {
    return (
      <>
        {/* Poll until the background job finishes. */}
        <meta httpEquiv="refresh" content="5" />
        <Centered>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 22 }}>Building your teardown…</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 10 }}>
            Pulling your Google rankings, competitors, and site scores. This takes about a minute — the page will refresh
            automatically.
          </p>
        </Centered>
      </>
    );
  }

  if (report.status === "failed" || !report.report_data) {
    return (
      <Centered>
        <h1 style={{ fontSize: 22 }}>We hit a snag generating this</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 10 }}>
          Reply to the email and we&apos;ll put it together for you manually.
        </p>
      </Centered>
    );
  }

  const { facts, narrative } = report.report_data;
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL || "#";
  const name = report.business_name || facts.business_name || "your business";

  return (
    <main style={page}>
      <div style={shell}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: "var(--accent-lime)", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "var(--font-mono)" }}>
            U-Flow · Competitor Teardown
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 12, lineHeight: 1.2 }}>{narrative.headline}</h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 12, lineHeight: 1.6 }}>
            {narrative.summary}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10 }}>
            {name}
            {facts.trade ? ` · ${facts.trade}` : ""}
            {facts.city ? ` · ${facts.city}` : ""}
          </p>
        </div>

        {/* Scorecard */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 20 }}>
          <Stat label="Local rank" value={facts.found_in_rankings && facts.rank ? `#${facts.rank}` : "Not ranking"} color={facts.found_in_rankings ? "var(--text-primary)" : "var(--accent-red)"} />
          <Stat label="Your reviews" value={facts.reviews != null ? String(facts.reviews) : "—"} />
          <Stat label="Mobile speed" value={facts.pagespeed_performance != null ? String(facts.pagespeed_performance) : "—"} color={scoreColor(facts.pagespeed_performance)} />
          <Stat label="SEO score" value={facts.pagespeed_seo != null ? String(facts.pagespeed_seo) : "—"} color={scoreColor(facts.pagespeed_seo)} />
        </div>

        {/* Competitor comparison */}
        {facts.top_competitors.length > 0 && (
          <div style={card}>
            <h3 style={{ fontSize: 13, color: "var(--accent-lime)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
              Who&apos;s beating you in {facts.city || "your area"}
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", textAlign: "left", fontSize: 12 }}>
                  <th style={{ padding: "6px 8px" }}>#</th>
                  <th style={{ padding: "6px 8px" }}>Business</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Rating</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {facts.top_competitors.map((c, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                    <td style={{ padding: "10px 8px" }}>{c.name}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.rating ?? "—"}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.reviews ?? "—"}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid var(--accent-lime)", background: "rgba(163,230,53,0.06)" }}>
                  <td style={{ padding: "10px 8px", color: "var(--accent-lime)", fontFamily: "var(--font-mono)" }}>
                    {facts.rank ? facts.rank : "—"}
                  </td>
                  <td style={{ padding: "10px 8px", color: "var(--accent-lime)", fontWeight: 700 }}>{name} (you)</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--accent-lime)" }}>{facts.rating ?? "—"}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--accent-lime)" }}>{facts.reviews ?? "—"}</td>
                </tr>
              </tbody>
            </table>
            {facts.review_gap != null && facts.review_gap > 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
                That&apos;s a <strong style={{ color: "var(--accent-red)" }}>{facts.review_gap}-review gap</strong> to the top result — the single biggest driver of who homeowners call first.
              </p>
            )}
          </div>
        )}

        {/* Narrative */}
        <Section title="Your Google visibility" body={narrative.ranking_insight} />
        <Section title="The competition" body={narrative.competitor_insight} />
        <Section title="Your website" body={narrative.site_insight} />

        {/* Recommendations */}
        {narrative.recommendations.length > 0 && (
          <div style={card}>
            <h3 style={{ fontSize: 13, color: "var(--accent-lime)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
              What we&apos;d fix first
            </h3>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {narrative.recommendations.map((r, i) => (
                <li key={i} style={{ display: "flex", gap: 10, padding: "8px 0", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--accent-lime)" }}>→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div style={{ ...card, textAlign: "center", background: "var(--bg-elevated)", borderColor: "var(--accent-lime)" }}>
          <p style={{ fontSize: 16, color: "var(--text-primary)", marginBottom: 18, lineHeight: 1.6 }}>{narrative.cta}</p>
          <a
            href={bookingUrl}
            style={{
              display: "inline-block",
              background: "var(--accent-lime)",
              color: "#0a0a0a",
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 28px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Book a 15-min walkthrough →
          </a>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 24 }}>
          Generated by U-Flow Solutions · rankings via Google Maps, scores via Google PageSpeed
        </p>
      </div>
    </main>
  );
}
