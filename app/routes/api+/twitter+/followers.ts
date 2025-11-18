import type { ActionFunctionArgs } from "react-router";
import { scrapeTwitterFollowers } from "~/lib/twitter-scraper";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { urls }: { urls: string[] } = await request.json();
    
    if (!urls || !Array.isArray(urls)) {
      return Response.json({ error: "URLs array required" }, { status: 400 });
    }

    console.log(`🐦 Starting Twitter scrape for ${urls.length} accounts`);
    
    const results = await scrapeTwitterFollowers(urls);
    
    return Response.json({
      success: true,
      results,
      scraped: results.filter(r => r.success).length,
      total: urls.length
    });
    
  } catch (error) {
    console.error("❌ Twitter scraper error:", error);
    
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
