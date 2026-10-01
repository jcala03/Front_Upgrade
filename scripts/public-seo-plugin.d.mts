import type { Plugin } from 'vite';
export function publicSeoPlugin(mode: string): { siteUrl: string; plugin: Plugin };
