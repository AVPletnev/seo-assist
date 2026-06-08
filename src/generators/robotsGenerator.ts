import fs from 'fs-extra';
import path from 'path';
import type { SeoConfig } from '../types';

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'CCBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Omgilibot',
  'FacebookBot',
  'TwitterBot',
  'Bytespider',
  'ImagesiftBot',
  'PerplexityBot',
  'Cohere-AI',
  'Applebot-Extended',
  'Amazonbot',
];

function buildAiBotBlocks(): string {
  return AI_CRAWLERS.map(
    (bot) => `User-agent: ${bot}\nDisallow: /`
  ).join('\n\n');
}

function buildStandardRules(): string {
  return `User-agent: *
Disallow: /api/
Disallow: /private/`;
}

export function generateRobotsContent(config: SeoConfig): string {
  const sitemapUrl = `${config.domain.replace(/\/$/, '')}/sitemap.xml`;
  const parts: string[] = [];

  if (config.blockAiBots) {
    parts.push(buildAiBotBlocks());
    parts.push('');
    parts.push(buildStandardRules());
  } else {
    parts.push(buildStandardRules());
  }

  parts.push('');
  parts.push(`Sitemap: ${sitemapUrl}`);

  return parts.join('\n');
}

export async function writeRobotsTxt(
  publicDir: string,
  config: SeoConfig
): Promise<string> {
  await fs.ensureDir(publicDir);
  const filePath = path.join(publicDir, 'robots.txt');
  const content = generateRobotsContent(config);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}
