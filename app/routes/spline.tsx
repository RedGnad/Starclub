import type { MetaFunction } from "react-router";
import App from "~/components/SplineInterface";

export const meta: MetaFunction = () => {
  return [
    { title: "Sherlock - Monad dApp Discovery" },
    { name: "description", content: "Discover and verify dApps on Monad testnet with 3D interface!" },
  ];
};

export default function SplineRoute() {
  return <App />;
}
