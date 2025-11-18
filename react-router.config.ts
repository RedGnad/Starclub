import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default, per route options override
  ssr: true,
  
  // Routes configuration
  routes: "./app/routes.ts",
  
  // Build configuration
  buildDirectory: "./build",
} satisfies Config;
