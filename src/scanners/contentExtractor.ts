import fs from 'fs-extra';
import path from 'path';
import cheerio from 'cheerio';
import { parse } from '@babel/parser';
import type { Framework } from '../types';

function extractTextFromSource(source: string): string {
  const textMatches = source.match(/>([^<>{}\n]+)</g);
  if (!textMatches) {
    return '';
  }
  return textMatches
    .map((m) => m.slice(1, -1).trim())
    .filter((t) => t.length > 2)
    .join(' ')
    .slice(0, 2000);
}

async function findPageFile(
  root: string,
  routePath: string,
  framework: Framework
): Promise<string | null> {
  if (framework === 'next') {
    const appDir = path.join(root, 'app');
    if (await fs.pathExists(appDir)) {
      const segments = routePath === '/' ? [] : routePath.slice(1).split('/');
      const candidates = [
        path.join(appDir, ...segments, 'page.tsx'),
        path.join(appDir, ...segments, 'page.ts'),
        path.join(appDir, ...segments, 'page.jsx'),
        path.join(appDir, ...segments, 'page.js'),
      ];
      for (const candidate of candidates) {
        if (await fs.pathExists(candidate)) {
          return candidate;
        }
      }
    }

    const pagesDir = path.join(root, 'pages');
    if (await fs.pathExists(pagesDir)) {
      const pageName =
        routePath === '/'
          ? 'index'
          : routePath.slice(1).replace(/\//g, path.sep);
      const candidates = [
        path.join(pagesDir, `${pageName}.tsx`),
        path.join(pagesDir, `${pageName}.ts`),
        path.join(pagesDir, `${pageName}.jsx`),
        path.join(pagesDir, `${pageName}.js`),
        path.join(pagesDir, pageName, 'index.tsx'),
        path.join(pagesDir, pageName, 'index.ts'),
      ];
      for (const candidate of candidates) {
        if (await fs.pathExists(candidate)) {
          return candidate;
        }
      }
    }
  }

  if (framework === 'vite' || framework === 'react') {
    const indexHtml = path.join(root, 'index.html');
    if (routePath === '/' && (await fs.pathExists(indexHtml))) {
      return indexHtml;
    }
  }

  return null;
}

export async function extractPageContent(
  root: string,
  routePath: string,
  framework: Framework
): Promise<string> {
  const filePath = await findPageFile(root, routePath, framework);
  if (!filePath) {
    return '';
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    if (filePath.endsWith('.html')) {
      const $ = cheerio.load(content);
      $('script, style, noscript').remove();
      return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);
    }

    try {
      parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });
    } catch {
      // fallback to regex extraction
    }

    return extractTextFromSource(content);
  } catch {
    return '';
  }
}

export async function extractMetaFromHtml(
  htmlPath: string
): Promise<{ title: string; description: string }> {
  if (!(await fs.pathExists(htmlPath))) {
    return { title: '', description: '' };
  }

  const content = await fs.readFile(htmlPath, 'utf-8');
  const $ = cheerio.load(content);

  const title = $('title').text().trim();
  const description =
    $('meta[name="description"]').attr('content')?.trim() ?? '';

  return { title, description };
}
