import type { ActionFunctionArgs } from "react-router";
import { syncDApps } from "~/services/discoveryApi";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    console.log("🚀 Starting dApps sync...");
    
    const dapps = await syncDApps();
    
    return Response.json({
      success: true,
      count: dapps.length,
      message: `Successfully synced ${dapps.length} dApps`
    });
    
  } catch (error) {
    console.error("❌ DApps sync error:", error);
    
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
