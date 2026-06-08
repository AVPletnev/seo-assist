import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import {
  checkConnectivity,
  generateMetaForPage,
  loadSeoMeta,
  saveSeoMeta,
} from '../generators/aiMetaGenerator';
import { integrateCode } from '../generators/codeIntegrator';
import { writeRobotsTxt } from '../generators/robotsGenerator';
import { writeSitemap } from '../generators/sitemapGenerator';
import { extractPageContent } from '../scanners/contentExtractor';
import { scanRoutes } from '../scanners/routeScanner';
import type { PageMeta, SeoConfig } from '../types';
import {
  detectFramework,
  getConfigPath,
  getPublicDir,
} from '../utils/frameworkDetector';
import { logger } from '../utils/logger';

async function loadConfig(cwd: string): Promise<SeoConfig> {
  const configPath = getConfigPath(cwd);
  if (!(await fs.pathExists(configPath))) {
    logger.error('seo.config.json не найден. Запустите: npx seo-assist init');
    process.exit(1);
  }
  return fs.readJson(configPath) as Promise<SeoConfig>;
}

async function ensureApiKey(config: SeoConfig, cwd: string): Promise<SeoConfig> {
  if (config.openRouterApiKey) {
    return config;
  }

  logger.info(
    'Для AI-генерации метатегов нужен API ключ OpenRouter.\n' +
      'Получите бесплатный ключ на https://openrouter.ai/keys'
  );

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: 'password',
      name: 'apiKey',
      message: 'OpenRouter API ключ (Enter — пропустить AI-генерацию):',
    },
  ]);

  if (!apiKey) {
    logger.warning('API ключ не указан — AI-генерация будет пропущена');
    return config;
  }

  const updated: SeoConfig = { ...config, openRouterApiKey: apiKey };
  await fs.writeJson(getConfigPath(cwd), updated, { spaces: 2 });
  return updated;
}

async function shouldOverwriteMeta(cwd: string): Promise<boolean> {
  const existing = await loadSeoMeta(cwd);
  if (!existing) {
    return true;
  }

  const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
    {
      type: 'confirm',
      name: 'overwrite',
      message: 'seo-meta.json уже существует. Перезаписать?',
      default: true,
    },
  ]);

  return overwrite;
}

export async function generateCommand(cwd: string = process.cwd()): Promise<void> {
  logger.title('⚡ Генерация SEO-файлов');

  let config = await loadConfig(cwd);
  const framework = detectFramework(cwd);
  const publicDir = getPublicDir(cwd, framework);

  logger.info(`Фреймворк: ${framework}`);
  logger.info(`Public директория: ${path.relative(cwd, publicDir)}`);

  const routesSpinner = ora('Сканирование роутов...').start();
  const routes = await scanRoutes(cwd, config, framework);
  routesSpinner.succeed(`Найдено ${routes.length} роут(ов)`);

  const robotsSpinner = ora('Генерация robots.txt...').start();
  const robotsPath = await writeRobotsTxt(publicDir, config);
  robotsSpinner.succeed(`robots.txt → ${path.relative(cwd, robotsPath)}`);

  const sitemapSpinner = ora('Генерация sitemap.xml...').start();
  const sitemapPath = await writeSitemap(publicDir, config, routes);
  sitemapSpinner.succeed(`sitemap.xml → ${path.relative(cwd, sitemapPath)}`);

  const online = await checkConnectivity();
  let pages: PageMeta[] = [];

  if (online) {
    config = await ensureApiKey(config, cwd);

    if (config.openRouterApiKey) {
      const overwrite = await shouldOverwriteMeta(cwd);
      if (!overwrite) {
        const existing = await loadSeoMeta(cwd);
        pages = existing?.pages ?? [];
        logger.info('Используются существующие метаданные из seo-meta.json');
      } else {
        const aiSpinner = ora('AI-генерация метатегов...').start();

        for (const route of routes) {
          aiSpinner.text = `AI-генерация: ${route.path}`;
          try {
            const content = await extractPageContent(cwd, route.path, framework);
            const fullUrl = `${config.domain}${route.path === '/' ? '' : route.path}`;
            const meta = await generateMetaForPage(
              fullUrl,
              config.siteType,
              config.language,
              content,
              config
            );
            pages.push(meta);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warning(`Пропущен ${route.path}: ${message}`);
          }
        }

        aiSpinner.succeed(`Сгенерировано ${pages.length} метатег(ов)`);

        if (pages.length > 0) {
          const metaPath = await saveSeoMeta(cwd, pages);
          logger.success(`seo-meta.json → ${path.relative(cwd, metaPath)}`);
        }
      }
    }
  } else {
    logger.warning('Офлайн-режим: robots.txt и sitemap.xml созданы, AI пропущен');
  }

  if (pages.length > 0) {
    const integrateSpinner = ora('Интеграция в код проекта...').start();
    try {
      await integrateCode(cwd, framework, pages, config.domain);
      integrateSpinner.succeed('Интеграция завершена');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      integrateSpinner.fail(`Ошибка интеграции: ${message}`);
    }
  }

  logger.title('✨ Генерация завершена');
}
