const ACTOR_ID = "apify~website-content-crawler";

interface StartRunOptions {
  urls: string[];
  webhookUrl: string;
}

/**
 * Starts a Website Content Crawler run scraping the given URLs (single page
 * per URL — no link-following) and attaches a webhook that fires once on
 * completion (success or failure).
 * Returns the Apify run id.
 */
export async function startWebsiteCrawlerRun({ urls, webhookUrl }: StartRunOptions): Promise<string> {
  // Apify's payload template syntax only supports whole-variable substitution
  // ({{eventType}}, {{resource}}, etc.) — no dot-paths into resource — so we
  // pass the full run object through and pull runId/datasetId/status out of
  // it in the webhook handler.
  const webhooks = [
    {
      eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT", "ACTOR.RUN.ABORTED"],
      requestUrl: webhookUrl,
      payloadTemplate: `{"eventType": "{{eventType}}", "resource": {{resource}}}`,
    },
  ];
  const encodedWebhooks = btoa(JSON.stringify(webhooks));

  const res = await fetch(
    `https://api.apify.com/v2/actors/${ACTOR_ID}/runs?webhooks=${encodeURIComponent(encodedWebhooks)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("APIFY_API_TOKEN")}`,
      },
      body: JSON.stringify({
        startUrls: urls.map((url) => ({ url })),
        maxCrawlDepth: 0,
        maxCrawlPages: 1,
        saveMarkdown: true,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Apify run start failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.data.id as string;
}

interface DatasetItem {
  url: string;
  crawl?: { loadedUrl?: string };
  markdown?: string;
  text?: string;
}

/**
 * Fetches all dataset items for a completed run. Returns [] on any failure
 * (e.g. run failed before producing a dataset) — callers should treat that
 * the same as "no content scraped", not throw.
 */
export async function getDatasetItems(datasetId: string): Promise<DatasetItem[]> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      { headers: { "Authorization": `Bearer ${Deno.env.get("APIFY_API_TOKEN")}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
