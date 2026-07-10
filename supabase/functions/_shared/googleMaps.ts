// Local Google Maps rankings via the Apify "Google Maps Scraper"
// (compass/crawler-google-places). One search ("<trade> in <city>, <state>")
// returns the ranked local pack, which is all the report needs: where the
// prospect sits and who the top competitors are.
//
// Uses run-sync-get-dataset-items so a single small query (≤15 places) resolves
// inline in seconds — no webhook/run-id bookkeeping like the batch enrichment
// path. Never throws: returns [] on any failure so the report still generates
// (the narrative degrades gracefully when rankings are missing).

const ACTOR_ID = "compass~crawler-google-places";

export interface MapsPlace {
  /** 1-based position in the local pack (array order). */
  rank: number;
  title: string;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  phone: string | null;
  category: string | null;
}

interface RawPlace {
  title?: string;
  totalScore?: number;
  reviewsCount?: number;
  website?: string;
  phone?: string;
  categoryName?: string;
}

export async function fetchLocalRankings(
  trade: string,
  city: string,
  state: string,
  maxPlaces = 15
): Promise<MapsPlace[]> {
  const token = Deno.env.get("APIFY_API_TOKEN");
  if (!token || !trade || !city) return [];

  const searchString = [trade, "in", [city, state].filter(Boolean).join(", ")].join(" ").trim();

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}&timeout=120`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [searchString],
          maxCrawledPlacesPerSearch: maxPlaces,
          language: "en",
          countryCode: "us",
        }),
      }
    );

    if (!res.ok) return [];

    const raw = (await res.json()) as RawPlace[];
    if (!Array.isArray(raw)) return [];

    return raw.slice(0, maxPlaces).map((p, i) => ({
      rank: i + 1,
      title: p.title ?? "",
      rating: typeof p.totalScore === "number" ? p.totalScore : null,
      reviews: typeof p.reviewsCount === "number" ? p.reviewsCount : null,
      website: p.website ?? null,
      phone: p.phone ?? null,
      category: p.categoryName ?? null,
    }));
  } catch {
    return [];
  }
}

/** Bare hostname (no protocol / www / path) for matching a prospect to a place. */
export function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const withScheme = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withScheme).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
