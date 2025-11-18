import type { ActionFunction, ActionFunctionArgs } from "react-router";
import { scrapeMonvisionQuick } from "~/lib/scraper/monvision-quick";
import { prisma } from "~/lib/db/prisma";

/**
 * POST /api/dapps/sync
 * Quick sync - just get names, logos, and URLs for fast initial display
 */
export const action: ActionFunction = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    console.log("Starting quick Monvision sync...");

    // Quick scrape - just get the list with basic info
    const scrapedDapps = await scrapeMonvisionQuick();

    console.log(`Scraped ${scrapedDapps.length} dApps from Monvision`);

    if (scrapedDapps.length === 0) {
      return Response.json({
        success: false,
        error: "No dApps found during scraping",
      });
    }

    // Upsert dApps into the database (basic info only, not enriched)
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const dapp of scrapedDapps) {
      try {
        // Check if dApp already exists by name
        const existing = await prisma.monvisionDApp.findFirst({
          where: { name: dapp.name },
        });

        if (existing) {
          // Update existing dApp with basic info only
          await prisma.monvisionDApp.update({
            where: { id: existing.id },
            data: {
              logoUrl: dapp.logoUrl,
              detailsUrl: dapp.detailsUrl,
              // Don't update isEnriched - keep existing enrichment
            },
          });
          updated++;
        } else {
          // Create new dApp with basic info (not enriched yet)
          await prisma.monvisionDApp.create({
            data: {
              name: dapp.name,
              logoUrl: dapp.logoUrl,
              detailsUrl: dapp.detailsUrl,
              isEnriched: false, // Not enriched yet
            },
          });
          created++;
        }
      } catch (error) {
        console.error(`Error upserting dApp ${dapp.name}:`, error);
        errors++;
      }
    }

    console.log(
      `Quick sync completed: ${created} created, ${updated} updated, ${errors} errors`
    );

    return Response.json({
      success: true,
      stats: {
        total: scrapedDapps.length,
        created,
        updated,
        errors,
      },
    });
  } catch (error) {
    console.error("Error syncing Monvision dApps:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
