/**
 * Route API pour enrichir les protocoles avec streaming SSE progressif
 * GET /api/discovery/enrich-stream?network=testnet
 *
 * Flux:
 * 1. Récupérer CSV GitHub
 * 2. Enrichir avec Google Sheets + afficher immédiatement
 * 3. Pour chaque dApp, récupérer stats Envio en arrière-plan
 */

import { protocolEnrichmentService } from "~/services/protocol-enrichment.service";
import { googleSheetsService } from "~/services/google-sheets.service";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const network = (url.searchParams.get("network") || "testnet") as
    | "testnet"
    | "mainnet";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send("started", { network });

        // ÉTAPE 1: Récupérer les protocoles depuis GitHub CSV
        send("progress", {
          step: "Récupération des protocoles depuis GitHub CSV...",
          progress: 0,
        });
        const protocols = await protocolEnrichmentService.fetchMonadProtocols(
          network,
          true
        );

        if (protocols.length === 0) {
          send("error", {
            message: "Aucun protocole trouvé dans le CSV GitHub",
          });
          controller.close();
          return;
        }

        const total = protocols.length;
        send("protocols-loaded", { total });

        // ÉTAPE 2: Charger Google Sheets une seule fois
        send("progress", {
          step: "Chargement des données Google Sheets...",
          progress: 5,
        });
        const googleSheetsData = await googleSheetsService.fetchProtocols();
        console.log(
          `📋 ${googleSheetsData.length} protocoles chargés depuis Google Sheets`
        );

        // ÉTAPE 3: Enrichir TOUS les protocoles avec Google Sheets
        send("progress", {
          step: "Enrichissement avec Google Sheets...",
          progress: 10,
        });
        const enrichedProtocols = protocols.map((protocol, i) => {
          // Enrichir avec Google Sheets
          const sheetsInfo = googleSheetsService.findByName(
            googleSheetsData,
            protocol.name
          );

          if (sheetsInfo) {
            // Prioriser les données Google Sheets
            if (sheetsInfo.logo) protocol.logo = sheetsInfo.logo;
            if (sheetsInfo.banner) protocol.banner = sheetsInfo.banner;
            if (sheetsInfo.website && !protocol.website)
              protocol.website = sheetsInfo.website;
            if (sheetsInfo.twitter && !protocol.twitter)
              protocol.twitter = sheetsInfo.twitter;
            if (sheetsInfo.description && !protocol.description)
              protocol.description = sheetsInfo.description;
            if (
              !protocol.category &&
              (sheetsInfo.tags?.[0] || sheetsInfo.projectType)
            ) {
              protocol.category =
                sheetsInfo.tags?.[0] || sheetsInfo.projectType;
            }
          }

          // Logo par défaut si absent
          if (!protocol.logo) {
            protocol.logo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(protocol.name)}&backgroundColor=1e293b`;
          }

          return {
            id: `${protocol.name}-${i}`,
            protocol,
            data: {
              id: `${protocol.name}-${i}`,
              name: protocol.name,
              description: protocol.description,
              category: protocol.category || "UNKNOWN",
              website: protocol.website,
              github: protocol.github,
              twitter: protocol.twitter,
              logo: protocol.logo,
              banner: protocol.banner,
              contractCount: Object.keys(protocol.contracts || {}).length,
              contracts: protocol.contracts,
              envioLoading: true, // Indicateur de chargement Envio
            },
          };
        });

        // AFFICHER TOUTES LES DAPPS D'UN COUP
        send("all-dapps-displayed", {
          dapps: enrichedProtocols.map((p) => p.data),
        });

        send("progress", {
          step: `${total} protocoles affichés avec Google Sheets`,
          progress: 50,
          current: total,
          total,
        });

        // ÉTAPE 4: Récupérer les stats Envio pour chaque dApp (en arrière-plan)
        send("progress", {
          step: "Récupération des statistiques Envio...",
          progress: 50,
        });

        for (let i = 0; i < enrichedProtocols.length; i++) {
          const { id, protocol } = enrichedProtocols[i];
          const progress = 50 + Math.round(((i + 1) / total) * 50); // 50-100%

          console.log(
            `\n🔄 [${i + 1}/${total}] Enrichissement Envio pour ${protocol.name} (ID: ${id})`
          );
          console.log(
            `   Contrats: ${Object.keys(protocol.contracts || {}).length}`
          );

          try {
            // Récupérer les stats Envio pour tous les contrats
            const enriched =
              await protocolEnrichmentService.enrichProtocol(protocol);

            console.log(
              `   ✅ Stats obtenues: ${enriched.stats.totalTxCount} txs, ${enriched.stats.uniqueUsers} users`
            );

            // Mettre à jour la dApp avec les stats Envio
            send("dapp-envio-updated", {
              id: id,
              stats: enriched.stats,
              envioLoading: false,
            });

            // Sauvegarder en base de données
            await protocolEnrichmentService.saveToDatabase([enriched]);
          } catch (error) {
            console.error(
              `   ❌ Erreur stats Envio pour ${protocol.name}:`,
              error
            );
            send("dapp-envio-error", {
              id: id,
              error: error instanceof Error ? error.message : "Erreur Envio",
              envioLoading: false,
            });
          }

          send("progress", {
            step: `Stats Envio: ${i + 1}/${total}`,
            progress,
            current: i + 1,
            total,
          });
        }

        send("completed", { total: protocols.length });
        controller.close();
      } catch (error) {
        console.error("Erreur lors de l'enrichissement:", error);
        send("error", {
          message: error instanceof Error ? error.message : "Erreur inconnue",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
