/**
 * Scrapes a URL using Firecrawl REST API.
 * Returns markdown string or null on any failure.
 * Never throws.
 */
export async function scrapeUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("FIRECRAWL_API_KEY")}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 15000,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    // Firecrawl v1 response: { success: true, data: { markdown: "..." } }
    return data?.data?.markdown ?? null;
  } catch {
    return null;
  }
}

/**
 * Searches for a Google Business Profile URL by scraping
 * a Google search results page via Firecrawl.
 * Returns the first Google Maps URL found, or null.
 */
export async function findGbpUrl(
  businessName: string,
  city: string
): Promise<string | null> {
  if (!businessName) return null;

  const searchQuery = encodeURIComponent(
    `${businessName} ${city} google business profile reviews`
  );
  const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

  const content = await scrapeUrl(searchUrl);
  if (!content) return null;

  const match = content.match(
    /https:\/\/www\.google\.com\/maps\/place\/[^\s\)"'\]]+/
  );
  return match?.[0] ?? null;
}
