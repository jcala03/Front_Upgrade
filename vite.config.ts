import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { publicSeoPlugin } from "./scripts/public-seo-plugin.mjs";
import { publicDevProxy } from "./scripts/public-dev-proxy.mjs";

export default defineConfig(({ mode }) => {
  const { siteUrl, apiBase, plugin } = publicSeoPlugin(mode);
  return {
    plugins: [react(), plugin],
    server: { proxy: publicDevProxy(apiBase) },
    define: { __PUBLIC_SITE_URL__: JSON.stringify(siteUrl) },
  };
});
