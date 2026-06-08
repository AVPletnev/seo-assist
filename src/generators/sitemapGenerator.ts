import fs from 'fs-extra';
import path from 'path';
import type { RouteInfo, SeoConfig } from '../types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlEntry(
  domain: string,
  route: RouteInfo
): string {
  const baseUrl = domain.replace(/\/$/, '');
  const loc = route.path === '/' ? baseUrl : `${baseUrl}${route.path}`;
  const today = new Date().toISOString().split('T')[0];

  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.priority >= 1.0 ? 'weekly' : 'monthly'}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
}

export function generateSitemapContent(
  config: SeoConfig,
  routes: RouteInfo[]
): string {
  const urlEntries = routes.map((route) => buildUrlEntry(config.domain, route));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;
}

export async function writeSitemap(
  publicDir: string,
  config: SeoConfig,
  routes: RouteInfo[]
): Promise<string> {
  await fs.ensureDir(publicDir);
  const filePath = path.join(publicDir, 'sitemap.xml');
  const content = generateSitemapContent(config, routes);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}
