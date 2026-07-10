// Mobile performance + SEO scores via Google's free PageSpeed Insights API.
// PAGESPEED_API_KEY is optional (the API works keyless at a lower quota), so a
// missing key or any failure just yields nulls — the report degrades
// gracefully. Never throws.

export interface PageSpeedScores {
  /** 0-100 Lighthouse mobile performance score, or null. */
  performance: number | null;
  /** 0-100 Lighthouse SEO score, or null. */
  seo: number | null;
}

export async function fetchPageSpeed(url: string | null): Promise<PageSpeedScores> {
  const empty: PageSpeedScores = { performance: null, seo: null };
  if (!url || !url.startsWith("http")) return empty;

  const key = Deno.env.get("PAGESPEED_API_KEY");
  const params = new URLSearchParams({ url, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "seo");
  if (key) params.append("key", key);

  try {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`
    );
    if (!res.ok) return empty;

    const data = await res.json();
    const cats = data?.lighthouseResult?.categories;
    const toPct = (s: unknown) => (typeof s === "number" ? Math.round(s * 100) : null);

    return {
      performance: toPct(cats?.performance?.score),
      seo: toPct(cats?.seo?.score),
    };
  } catch {
    return empty;
  }
}
