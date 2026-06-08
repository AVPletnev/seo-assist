import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import type { SeoConfig, SiteType } from '../types';
import { getConfigPath } from '../utils/frameworkDetector';
import { logger } from '../utils/logger';

const SITE_TYPE_CHOICES: Array<{ name: string; value: SiteType }> = [
  { name: 'Интернет-магазин', value: 'ecommerce' },
  { name: 'Блог', value: 'blog' },
  { name: 'Портфолио', value: 'portfolio' },
  { name: 'Лендинг', value: 'landing' },
];

const DEFAULT_ROUTES: Record<SiteType, string[]> = {
  ecommerce: ['/', '/about', '/contact', '/products/*', '/cart'],
  blog: ['/', '/about', '/contact', '/blog/*'],
  portfolio: ['/', '/about', '/contact', '/projects/*'],
  landing: ['/', '/pricing', '/contact'],
};

export async function initCommand(cwd: string = process.cwd()): Promise<void> {
  const configPath = getConfigPath(cwd);

  if (await fs.pathExists(configPath)) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'seo.config.json уже существует. Перезаписать?',
        default: false,
      },
    ]);

    if (!overwrite) {
      logger.info('Инициализация отменена');
      return;
    }
  }

  logger.title('🚀 Инициализация seo-assist');

  const answers = await inquirer.prompt<{
    siteType: SiteType;
    domain: string;
    language: string;
    blockAiBots: boolean;
  }>([
    {
      type: 'list',
      name: 'siteType',
      message: 'Тип сайта:',
      choices: SITE_TYPE_CHOICES,
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Основной домен (например, https://example.com):',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Введите корректный URL (например, https://example.com)';
        }
      },
    },
    {
      type: 'input',
      name: 'language',
      message: 'Язык сайта:',
      default: 'ru',
    },
    {
      type: 'confirm',
      name: 'blockAiBots',
      message: 'Блокировать AI-краулеры? (рекомендуется)',
      default: true,
    },
  ]);

  const config: SeoConfig = {
    siteType: answers.siteType,
    domain: answers.domain.replace(/\/$/, ''),
    language: answers.language,
    blockAiBots: answers.blockAiBots,
    routes: DEFAULT_ROUTES[answers.siteType],
    aiProvider: 'openrouter',
    aiModel: 'gpt-3.5-turbo',
  };

  await fs.writeJson(configPath, config, { spaces: 2 });

  logger.success(`Конфигурация сохранена: ${path.relative(cwd, configPath)}`);
  logger.info('Следующий шаг: npx seo-assist generate');
}
