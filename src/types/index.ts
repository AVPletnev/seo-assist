export type SiteType = 'ecommerce' | 'blog' | 'portfolio' | 'landing';

export type Framework = 'next' | 'react' | 'vite' | 'unknown';

export type AiProvider = 'openrouter';

export interface SeoConfig {
  siteType: SiteType;
  domain: string;
  language: string;
  blockAiBots: boolean;
  routes: string[];
  aiProvider: AiProvider;
  aiModel: string;
  openRouterApiKey?: string;
}

export interface PageMeta {
  url: string;
  title: string;
  description: string;
  keywords: string[];
  jsonLd: Record<string, unknown>;
}

export interface SeoMetaFile {
  generatedAt: string;
  pages: PageMeta[];
}

export interface RouteInfo {
  path: string;
  priority: number;
  source: 'config' | 'filesystem';
}

export interface ValidationResult {
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export interface AiMetaResponse {
  title: string;
  description: string;
  keywords: string[];
  jsonLd: Record<string, unknown>;
}
