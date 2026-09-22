import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type CrmRouteDefinition = {
  paths: readonly string[];
  title: string;
  description?: string;
  permission?: string;
  audience?: "admin" | "user";
};

export const normalizeCrmPath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";
export const matchesCrmRoute = (pathname: string, route: Pick<CrmRouteDefinition, "paths">) => route.paths.includes(normalizeCrmPath(pathname));

export const lazyNamed = <TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
): LazyExoticComponent<ComponentType> => lazy(async () => ({ default: (await loader())[exportName] as ComponentType }));
