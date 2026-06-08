import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { extractMetaFromHtml } from '../scanners/contentExtractor';
import type { ValidationResult } from '../types';
import {
  detectFramework,
  getConfigPath,
  getPublicDir,
} from '../utils/frameworkDetector';
import { logger } from '../utils/logger';

async function checkFileExists(
  filePath: string,
  label: string
): Promise<ValidationResult> {
  if (await fs.pathExists(filePath)) {
    return { status: 'ok', message: `${label} найден` };
  }
  return { status: 'error', message: `Отсутствует ${label}` };
}

async function checkMetaTags(
  cwd: string,
  domain: string
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const indexPaths = [
    path.join(cwd, 'index.html'),
    path.join(cwd, 'public', 'index.html'),
    path.join(cwd, 'app', 'layout.tsx'),
  ];

  let localTitle = '';
  let localDescription = '';

  for (const indexPath of indexPaths) {
    if (indexPath.endsWith('.html') && (await fs.pathExists(indexPath))) {
      const meta = await extractMetaFromHtml(indexPath);
      localTitle = meta.title;
      localDescription = meta.description;
      break;
    }
  }

  if (localTitle) {
    results.push({ status: 'ok', message: `Title: "${localTitle}"` });
  } else {
    results.push({ status: 'warning', message: 'Title не найден локально' });
  }

  if (localDescription) {
    results.push({
      status: 'ok',
      message: `Meta description: "${localDescription.slice(0, 60)}..."`,
    });
  } else {
    results.push({ status: 'warning', message: 'Нет meta description' });
  }

  if (domain) {
    try {
      const response = await axios.get(domain, {
        timeout: 10000,
        headers: { 'User-Agent': 'seo-assist-validator/0.1.0' },
      });
      const html = String(response.data);
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descMatch = html.match(
        /meta\s+name=["']description["']\s+content=["']([^"']*)["']/i
      );

      if (titleMatch?.[1]) {
        results.push({
          status: 'ok',
          message: `Title (live): "${titleMatch[1]}"`,
        });
      }
      if (descMatch?.[1]) {
        results.push({
          status: 'ok',
          message: `Description (live): "${descMatch[1].slice(0, 60)}..."`,
        });
      } else if (!descMatch) {
        results.push({
          status: 'warning',
          message: 'Нет meta description на live-сайте',
        });
      }
    } catch {
      results.push({
        status: 'warning',
        message: `Не удалось проверить ${domain} (сайт недоступен)`,
      });
    }
  }

  return results;
}

function printResult(result: ValidationResult): void {
  switch (result.status) {
    case 'ok':
      logger.success(result.message);
      break;
    case 'warning':
      logger.warning(result.message);
      break;
    case 'error':
      logger.error(result.message);
      break;
  }
}

export async function validateCommand(cwd: string = process.cwd()): Promise<void> {
  logger.title('🔍 Проверка SEO-статуса');

  const framework = detectFramework(cwd);
  const publicDir = getPublicDir(cwd, framework);

  const robotsResult = await checkFileExists(
    path.join(publicDir, 'robots.txt'),
    'robots.txt'
  );
  printResult(robotsResult);

  const sitemapResult = await checkFileExists(
    path.join(publicDir, 'sitemap.xml'),
    'sitemap.xml'
  );
  printResult(sitemapResult);

  const configPath = getConfigPath(cwd);
  const hasConfig = await fs.pathExists(configPath);
  if (hasConfig) {
    printResult({ status: 'ok', message: 'seo.config.json найден' });
  } else {
    printResult({ status: 'warning', message: 'seo.config.json не найден' });
  }

  const metaPath = path.join(cwd, 'seo-meta.json');
  const hasMeta = await fs.pathExists(metaPath);
  if (hasMeta) {
    printResult({ status: 'ok', message: 'seo-meta.json найден' });
  } else {
    printResult({ status: 'warning', message: 'seo-meta.json не найден' });
  }

  let domain = '';
  if (hasConfig) {
    const config = await fs.readJson(configPath) as { domain?: string };
    domain = config.domain ?? '';
  }

  const metaResults = await checkMetaTags(cwd, domain);
  for (const result of metaResults) {
    printResult(result);
  }

  const allResults = [robotsResult, sitemapResult, ...metaResults];
  const errors = allResults.filter((r) => r.status === 'error').length;
  const warnings = allResults.filter((r) => r.status === 'warning').length;

  console.log('');
  if (errors === 0 && warnings === 0) {
    logger.success('Все проверки пройдены!');
  } else {
    logger.info(`Итого: ${errors} ошибок, ${warnings} предупреждений`);
    if (errors > 0) {
      logger.info('Запустите: npx seo-assist generate');
    }
  }
}
