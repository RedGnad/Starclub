import type { ActionFunctionArgs } from "react-router";
import { prisma } from "~/lib/db/prisma";
import { scrapeTwitterFollowers } from "~/lib/scraper/twitter";

/**
 * POST /api/dapps/twitter-sync
 * Scrape Twitter followers for all dApps asynchronously
 * This runs in background and updates the database progressively
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log("\n🐦 Starting async Twitter followers scraping...");

    // Fetch all dApps with Twitter accounts
    const dappsWithTwitter = await prisma.monvisionDApp.findMany({
      where: {
        twitter: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        twitter: true,
      },
    });

    if (dappsWithTwitter.length === 0) {
      return Response.json({
        success: true,
        message: "No dApps with Twitter accounts found",
        scrapedCount: 0,
        totalCount: 0,
      });
    }

    console.log(`Found ${dappsWithTwitter.length} dApps with Twitter accounts`);

    // Extract username helper
    const extractUsername = (urlOrUsername: string): string => {
      if (
        urlOrUsername.includes("twitter.com") ||
        urlOrUsername.includes("x.com")
      ) {
        const match = urlOrUsername.match(
          /(?:twitter\.com|x\.com)\/([^\/\?]+)/
        );
        return match ? match[1].toLowerCase() : urlOrUsername.toLowerCase();
      }
      return urlOrUsername.replace("@", "").toLowerCase();
    };

    // Process in chunks of 10
    const CHUNK_SIZE = 10;
    let totalScrapedCount = 0;
    const allUpdates = [];

    for (let i = 0; i < dappsWithTwitter.length; i += CHUNK_SIZE) {
      const chunk = dappsWithTwitter.slice(i, i + CHUNK_SIZE);
      const chunkAccounts = chunk
        .map((d) => d.twitter)
        .filter((t): t is string => t !== null);

      console.log(
        `\n📦 Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(dappsWithTwitter.length / CHUNK_SIZE)} (${chunkAccounts.length} accounts)`
      );

      // Scrape this chunk
      const scraperResults = await scrapeTwitterFollowers(
        chunkAccounts,
        5, // batch size
        1000 // delay between batches
      );

      // Update DB immediately for this chunk
      let chunkScrapedCount = 0;
      for (const result of scraperResults) {
        if (result.success && result.followersCount) {
          const dapp = chunk.find(
            (d) =>
              d.twitter &&
              extractUsername(d.twitter) === result.username.toLowerCase()
          );

          if (dapp) {
            await prisma.monvisionDApp.update({
              where: { id: dapp.id },
              data: { twitterFollowers: result.followersCount as string },
            });

            chunkScrapedCount++;
            totalScrapedCount++;
            allUpdates.push({
              dappId: dapp.id,
              dappName: dapp.name,
              username: result.username,
              followers: result.followersCount,
            });

            console.log(`  ✅ Updated ${dapp.name}: ${result.followersCount}`);
          } else {
            console.log(`  ⚠️  No dApp found for @${result.username}`);
          }
        }
      }

      console.log(
        `✅ Chunk complete: ${chunkScrapedCount}/${chunkAccounts.length} updated`
      );
    }

    console.log(
      `\n🎉 Twitter scraping complete: ${totalScrapedCount}/${dappsWithTwitter.length} updated`
    );

    return Response.json({
      success: true,
      message: `Twitter scraping complete: ${totalScrapedCount}/${dappsWithTwitter.length} updated`,
      scrapedCount: totalScrapedCount,
      totalCount: dappsWithTwitter.length,
      updates: allUpdates,
    });
  } catch (error) {
    console.error("Error scraping Twitter followers:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to scrape Twitter followers",
      },
      { status: 500 }
    );
  }
}
