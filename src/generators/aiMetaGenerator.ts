import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import type {
  AiMetaResponse,
  PageMeta,
  SeoConfig,
  SeoMetaFile,
  SiteType,
} from '../types';
import { logger } from '../utils/logger';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildPrompt(
  url: string,
  siteType: SiteType,
  language: string,
  content: string
): string {
  const contentPart = content
    ? `Содержимое страницы: ${content}`
    : 'Содержимое страницы недоступно — сгенерируй на основе URL и типа сайта.';

  return `Ты SEO-эксперт. Для страницы ${url} с типом сайта "${siteType}" и языком "${language}" ${contentPart}

Сгенерируй:
1. Title (50-60 символов, с ключевыми словами)
2. Meta description (150-160 символов, продающий/информационный)
3. 3-5 ключевых слов
4. JSON-LD Schema (schema.org) в зависимости от типа страницы

Верни строго в формате JSON:
{
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."],
  "jsonLd": { "@context": "https://schema.org", ... }
}`;
}

function parseAiResponse(raw: string): AiMetaResponse {
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const title = typeof parsed['title'] === 'string' ? parsed['title'] : '';
  const description =
    typeof parsed['description'] === 'string' ? parsed['description'] : '';
  const keywords = Array.isArray(parsed['keywords'])
    ? parsed['keywords'].filter((k): k is string => typeof k === 'string')
    : [];
  const jsonLd =
    typeof parsed['jsonLd'] === 'object' && parsed['jsonLd'] !== null
      ? (parsed['jsonLd'] as Record<string, unknown>)
      : { '@context': 'https://schema.org', '@type': 'WebPage' };

  return { title, description, keywords, jsonLd };
}

export async function callOpenRouter(
  prompt: string,
  apiKey: string,
  model: string
): Promise<AiMetaResponse> {
  const response = await axios.post<{
    choices: Array<{ message: { content: string } }>;
  }>(
    OPENROUTER_URL,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/seo-assist',
        'X-Title': 'seo-assist',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Пустой ответ от OpenRouter API');
  }

  return parseAiResponse(content);
}

export async function generateMetaForPage(
  url: string,
  siteType: SiteType,
  language: string,
  content: string,
  config: SeoConfig
): Promise<PageMeta> {
  const apiKey = config.openRouterApiKey;
  if (!apiKey) {
    throw new Error('API ключ OpenRouter не настроен');
  }

  const prompt = buildPrompt(url, siteType, language, content);
  const aiResponse = await callOpenRouter(prompt, apiKey, config.aiModel);

  return {
    url,
    title: aiResponse.title,
    description: aiResponse.description,
    keywords: aiResponse.keywords,
    jsonLd: aiResponse.jsonLd,
  };
}

export async function saveSeoMeta(
  root: string,
  pages: PageMeta[]
): Promise<string> {
  const metaFile: SeoMetaFile = {
    generatedAt: new Date().toISOString(),
    pages,
  };
  const filePath = path.join(root, 'seo-meta.json');
  await fs.writeJson(filePath, metaFile, { spaces: 2 });
  return filePath;
}

export async function loadSeoMeta(root: string): Promise<SeoMetaFile | null> {
  const filePath = path.join(root, 'seo-meta.json');
  if (!(await fs.pathExists(filePath))) {
    return null;
  }
  return fs.readJson(filePath) as Promise<SeoMetaFile>;
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    await axios.get('https://openrouter.ai', { timeout: 5000 });
    return true;
  } catch {
    logger.warning('Нет подключения к интернету — AI-генерация будет пропущена');
    return false;
  }
}
