import type { ProxyOptions } from "vite";
export function allowedPublicProxyRequest(
  url: string,
  method?: string
): boolean;
export function publicDevProxy(target: string): Record<string, ProxyOptions>;
