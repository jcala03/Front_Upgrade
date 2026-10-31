import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { publicSeoPlugin } from "./scripts/public-seo-plugin.mjs";
import { publicDevProxy } from "./scripts/public-dev-proxy.mjs";
import { currentServiceWorkerVersion } from "./scripts/pwa-version.mjs";

export default defineConfig(({ mode, isSsrBuild }) => {
  const { siteUrl, apiBase, plugin } = publicSeoPlugin(mode);

  // Authentication, CRM requests and SSR must use the same configured backend.
  const backendUrl = apiBase;
  const frontendUrl = "http://127.0.0.1:5173";

  const proxyConfig = {
    target: backendUrl,
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: "",
    cookiePathRewrite: "/",

    configure: (proxy: any) => {
      proxy.on("proxyReq", (proxyReq: any) => {
        proxyReq.setHeader("Referer", `${frontendUrl}/`);
      });
    },
  };

  return {
    plugins: [react(), plugin],

    // Public files belong at the document root. A second .htaccess in seo/
    // would override the generated root rules for templates and snapshots.
    build: { copyPublicDir: !isSsrBuild },

    server: {
      proxy: {
        ...publicDevProxy(apiBase),
        "/api": proxyConfig,
        "/sanctum": proxyConfig,
      },
    },

    define: {
      __PUBLIC_SITE_URL__: JSON.stringify(siteUrl),
      __PWA_SW_VERSION__: JSON.stringify(currentServiceWorkerVersion()),
    },
  };
});
