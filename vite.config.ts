import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { publicSeoPlugin } from "./scripts/public-seo-plugin.mjs";

export default defineConfig(({ mode }) => {
  const { siteUrl, plugin } = publicSeoPlugin(mode);

  const backendUrl = "https://crmupgradecol.com";
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

    server: {
      proxy: {
        "/api": proxyConfig,
        "/sanctum": proxyConfig,
      },
    },

    define: {
      __PUBLIC_SITE_URL__: JSON.stringify(siteUrl),
    },
  };
});