import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { publicSeoPlugin } from './scripts/public-seo-plugin.mjs';

export default defineConfig(({ mode }) => {
  const { siteUrl, plugin } = publicSeoPlugin(mode);
  return { plugins: [react(), plugin], define: { __PUBLIC_SITE_URL__: JSON.stringify(siteUrl) } };
});
