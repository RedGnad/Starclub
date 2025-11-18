import type { ActionFunction, ActionFunctionArgs } from "react-router";
import { scrapeMonvisionComplete } from "~/lib/scraper/monvision-complete";
import { scrapeTwitterFollowers } from "~/lib/scraper/twitter";
import { prisma } from "~/lib/db/prisma";

/**
 * POST /api/dapps/sync-complete
 * Complete sync workflow:
 * 1. Scrape all projects from Monvision (with social links)
 * 2. For each project, scrape contracts from detail page
 * 3. For each project with Twitter, scrape followers
 *
 * This runs in the background and saves progressively to DB
 */
export const action: ActionFunction = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    console.log("🚀 Starting complete Monvision sync workflow...");

    // Start the sync in the background (don't await)
    syncInBackground().catch((error) => {
      console.error("❌ Background sync failed:", error);
    });

    // Return immediately so the frontend can start polling
    return Response.json({
      success: true,
      message: "Sync started in background",
    });
  } catch (error) {
    console.error("Error starting sync:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

/**
 * Background sync process
 */
async function syncInBackground() {
  console.log("\n🔄 Background sync started...\n");

  let stats = {
    totalProjects: 0,
    created: 0,
    updated: 0,
    contractsAdded: 0,
    twitterScraped: 0,
    errors: 0,
  };

  try {
    // Step 1: Scrape all projects (with social links and contracts)
    console.log("📊 Step 1: Scraping all projects from Monvision...");
    const scrapedDapps = await scrapeMonvisionComplete();
    stats.totalProjects = scrapedDapps.length;
    console.log(`✅ Scraped ${scrapedDapps.length} projects\n`);

    // Step 2: Save each project to DB progressively
    console.log("💾 Step 2: Saving projects to database...");

    for (const dapp of scrapedDapps) {
      try {
        // Check if dApp already exists by name
        const existing = await prisma.monvisionDApp.findFirst({
          where: { name: dapp.name },
        });

        let dappRecord;
        if (existing) {
          // Update existing dApp
          dappRecord = await prisma.monvisionDApp.update({
            where: { id: existing.id },
            data: {
              logoUrl: dapp.logoUrl,
              category: dapp.category,
              description: dapp.description,
              detailsUrl: dapp.detailsUrl,
              website: dapp.website,
              twitter: dapp.twitter,
              discord: dapp.discord,
              telegram: dapp.telegram,
              github: dapp.github,
              docs: dapp.docs,
              accountsCount: dapp.accountsCount,
              transactionsCount: BigInt(dapp.transactionsCount),
              isEnriched: true,
              enrichedAt: new Date(),
            },
          });
          stats.updated++;
          console.log(`  ✏️  Updated: ${dapp.name}`);
        } else {
          // Create new dApp
          dappRecord = await prisma.monvisionDApp.create({
            data: {
              name: dapp.name,
              logoUrl: dapp.logoUrl,
              category: dapp.category,
              description: dapp.description,
              detailsUrl: dapp.detailsUrl,
              website: dapp.website,
              twitter: dapp.twitter,
              discord: dapp.discord,
              telegram: dapp.telegram,
              github: dapp.github,
              docs: dapp.docs,
              accountsCount: dapp.accountsCount,
              transactionsCount: BigInt(dapp.transactionsCount),
              isEnriched: true,
              enrichedAt: new Date(),
            },
          });
          stats.created++;
          console.log(`  ➕ Created: ${dapp.name}`);
        }

        // Save contracts
        if (dapp.contracts.length > 0) {
          console.log(`    📋 Saving ${dapp.contracts.length} contracts...`);
          for (const contract of dapp.contracts) {
            await prisma.monvisionContract.upsert({
              where: {
                dappId_address: {
                  dappId: dappRecord.id,
                  address: contract.address,
                },
              },
              create: {
                dappId: dappRecord.id,
                address: contract.address,
                name: contract.name,
                type: contract.type,
              },
              update: {
                name: contract.name,
                type: contract.type,
              },
            });
            stats.contractsAdded++;
          }
          console.log(`    ✅ Saved ${dapp.contracts.length} contracts`);
        }
      } catch (error) {
        console.error(`  ❌ Error saving ${dapp.name}:`, error);
        stats.errors++;
      }
    }

    console.log(`\n✅ Database save complete\n`);

    // Step 3: Scrape Twitter followers for all dApps with Twitter
    console.log("🐦 Step 3: Scraping Twitter followers...");
    const dappsWithTwitter = scrapedDapps.filter((d) => d.twitter);
    console.log(`📊 Found ${dappsWithTwitter.length} dApps with Twitter accounts`);

    if (dappsWithTwitter.length > 0) {
      const twitterUrls = dappsWithTwitter.map((d) => d.twitter!);

      // Scrape in batches
      const twitterResults = await scrapeTwitterFollowers(twitterUrls, 5, 1500);

      console.log(`\n💾 Saving Twitter followers to database...`);
      for (const result of twitterResults) {
        if (result.success && result.followersCount) {
          try {
            // Find the dApp by Twitter URL
            const twitterUrl = `https://x.com/${result.username}`;
            const dappRecord = await prisma.monvisionDApp.findFirst({
              where: {
                OR: [
                  { twitter: twitterUrl },
                  { twitter: `https://twitter.com/${result.username}` },
                ],
              },
            });

            if (dappRecord) {
              await prisma.monvisionDApp.update({
                where: { id: dappRecord.id },
                data: { twitterFollowers: String(result.followersCount) },
              });
              stats.twitterScraped++;
              console.log(`  ✅ ${result.username}: ${result.followersCount} followers`);
            }
          } catch (error) {
            console.error(`  ❌ Error saving Twitter data for @${result.username}:`, error);
            stats.errors++;
          }
        }
      }
    }

    console.log("\n🎉 Complete sync finished!");
    console.log("📊 Stats:", stats);
  } catch (error) {
    console.error("\n❌ Background sync failed:", error);
    throw error;
  }
}
