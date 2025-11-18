import type { LoaderFunctionArgs } from "react-router";
import { createUserInteractionsService } from "~/services/user-interactions.service";

/**
 * GET /api/user/interactions?address=0x123...&fromBlock=0&toBlock=1000
 * Récupère les interactions d'un utilisateur avec les dApps
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const userAddress = url.searchParams.get("address");
    const fromBlock = url.searchParams.get("fromBlock");
    const toBlock = url.searchParams.get("toBlock");

    if (!userAddress) {
      return Response.json(
        { success: false, error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Valider que l'adresse est bien une adresse Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return Response.json(
        { success: false, error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    console.log(`\n🔍 API: Checking interactions for ${userAddress}...`);

    const service = createUserInteractionsService();

    // Récupérer les IDs des dApps avec lesquelles l'utilisateur a interagi
    const interactedDappIds = await service.getUserInteractedDappIds(
      userAddress,
      fromBlock ? parseInt(fromBlock, 10) : undefined,
      toBlock ? parseInt(toBlock, 10) : undefined
    );

    console.log(`✅ Found ${interactedDappIds.length} dApps with interactions`);

    return Response.json({
      success: true,
      userAddress,
      interactedDappIds,
      totalInteractions: interactedDappIds.length,
    });
  } catch (error) {
    console.error("Error checking user interactions:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check user interactions",
      },
      { status: 500 }
    );
  }
}
