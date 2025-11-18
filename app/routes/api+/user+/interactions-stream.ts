import type { LoaderFunctionArgs } from "react-router";
import { createUserInteractionsService } from "~/services/user-interactions.service";

/**
 * GET /api/user/interactions-stream?address=0x123...
 * Stream en temps réel de la progression de détection des interactions
 * Utilise Server-Sent Events (SSE)
 */
export async function loader({ request }: LoaderFunctionArgs) {
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

  // Créer un stream pour envoyer les événements
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Fonction pour envoyer un événement SSE
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        console.log(`\n🔍 API Stream: Checking interactions for ${userAddress}...`);

        const service = createUserInteractionsService();

        // Hook pour recevoir les mises à jour de progression
        const progressCallback = (progress: {
          current: number;
          total: number;
          percentage: number;
          transactionsFound: number;
          estimatedSecondsRemaining: number;
        }) => {
          sendEvent("progress", progress);
        };

        // Attacher le callback de progression
        service.setProgressCallback(progressCallback);

        // Envoyer un événement de démarrage
        sendEvent("start", { userAddress });

        // Récupérer les IDs des dApps avec lesquelles l'utilisateur a interagi
        const interactedDappIds = await service.getUserInteractedDappIds(
          userAddress,
          fromBlock ? parseInt(fromBlock, 10) : undefined,
          toBlock ? parseInt(toBlock, 10) : undefined
        );

        console.log(`✅ Found ${interactedDappIds.length} dApps with interactions`);

        // Envoyer les résultats finaux
        sendEvent("complete", {
          success: true,
          userAddress,
          interactedDappIds,
          totalInteractions: interactedDappIds.length,
        });

        // Fermer le stream
        controller.close();
      } catch (error) {
        console.error("Error checking user interactions:", error);
        sendEvent("error", {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to check user interactions",
        });
        controller.close();
      }
    },
  });

  // Retourner la réponse SSE
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
