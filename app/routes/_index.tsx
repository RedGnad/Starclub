import { Suspense } from "react";
import type { Route } from "./+types/_index";
import type { MetaFunction } from "react-router";

// Import du composant App existant (on l'adaptera)
import App from "~/components/App";

export const meta: MetaFunction = () => {
  return [
    { title: "Sherlock - Monad dApp Discovery" },
    { name: "description", content: "Discover and verify dApps on Monad testnet!" },
  ];
};

export default function Index() {
  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Loading Sherlock...</div>}>
        <App />
      </Suspense>
    </div>
  );
}
