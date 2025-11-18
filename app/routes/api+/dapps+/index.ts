import type { LoaderFunctionArgs } from "react-router";
import { prisma } from "~/lib/db/prisma";

/**
 * GET /api/dapps
 * Returns all dApps from Monvision
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Load Monvision dApps with contracts
    const monvisionDapps = await prisma.monvisionDApp.findMany({
      include: {
        contracts: true,
      },
      orderBy: { name: "asc" },
    });

    // Transform Monvision dApps to match frontend interface
    const transformedDapps = monvisionDapps.map((dapp) => ({
      id: dapp.id,
      name: dapp.name,
      description: dapp.description,
      logoUrl: dapp.logoUrl,
      banner: null,
      symbol: null,
      category: dapp.category || "Other",
      website: dapp.website,
      github: dapp.github,
      twitter: dapp.twitter,
      discord: dapp.discord,
      telegram: dapp.telegram,
      docs: dapp.docs,
      twitterFollowers: dapp.twitterFollowers, // ✅ Retourne la vraie valeur depuis la DB
      contractCount: dapp.contracts.length,
      contracts: dapp.contracts.map(c => ({
        id: c.id,
        address: c.address,
        name: c.name,
        type: c.type,
      })),
      totalTxCount: Number(dapp.transactionsCount),
      totalEventCount: 0,
      uniqueUsers: dapp.accountsCount,
      activityScore: 0,
      qualityScore: 0,
      firstActivity: null,
      lastActivity: null,
      createdAt: dapp.createdAt,
      updatedAt: dapp.updatedAt,
      detailsUrl: dapp.detailsUrl,
      isEnriched: dapp.isEnriched,
    }));

    return Response.json({
      success: true,
      dapps: transformedDapps,
      count: transformedDapps.length,
    });
  } catch (error) {
    console.error("Error loading dApps:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load dApps",
        dapps: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
