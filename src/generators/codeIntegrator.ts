import fs from 'fs-extra';
import path from 'path';
import type { Framework, PageMeta } from '../types';
import { logger } from '../utils/logger';

async function backupFile(filePath: string): Promise<void> {
  if (await fs.pathExists(filePath)) {
    await fs.copy(filePath, `${filePath}.bak`);
  }
}

function buildNextMetadataExport(homeMeta: PageMeta, domain: string): string {
  const jsonLdStr = JSON.stringify(homeMeta.jsonLd, null, 2);

  return `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: ${JSON.stringify(homeMeta.title)},
  description: ${JSON.stringify(homeMeta.description)},
  keywords: ${JSON.stringify(homeMeta.keywords)},
  metadataBase: new URL(${JSON.stringify(domain)}),
  openGraph: {
    title: ${JSON.stringify(homeMeta.title)},
    description: ${JSON.stringify(homeMeta.description)},
    url: ${JSON.stringify(domain)},
    type: 'website',
  },
};

const jsonLd = ${jsonLdStr};
`;
}

function injectNextMetadata(
  existingContent: string,
  homeMeta: PageMeta,
  domain: string
): string {
  const metadataBlock = buildNextMetadataExport(homeMeta, domain);

  const hasMetadata = /export\s+const\s+metadata/.test(existingContent);
  if (hasMetadata) {
    return existingContent.replace(
      /export\s+const\s+metadata[\s\S]*?};/,
      `export const metadata: Metadata = {
  title: ${JSON.stringify(homeMeta.title)},
  description: ${JSON.stringify(homeMeta.description)},
  keywords: ${JSON.stringify(homeMeta.keywords)},
  metadataBase: new URL(${JSON.stringify(domain)}),
  openGraph: {
    title: ${JSON.stringify(homeMeta.title)},
    description: ${JSON.stringify(homeMeta.description)},
    url: ${JSON.stringify(domain)},
    type: 'website',
  },
};`
    );
  }

  const importMatch = existingContent.match(/^import[\s\S]*?;\n/m);
  if (importMatch) {
    const insertPos = importMatch.index! + importMatch[0].length;
    const metadataExport = `
export const metadata: Metadata = {
  title: ${JSON.stringify(homeMeta.title)},
  description: ${JSON.stringify(homeMeta.description)},
  keywords: ${JSON.stringify(homeMeta.keywords)},
  metadataBase: new URL(${JSON.stringify(domain)}),
  openGraph: {
    title: ${JSON.stringify(homeMeta.title)},
    description: ${JSON.stringify(homeMeta.description)},
    url: ${JSON.stringify(domain)},
    type: 'website',
  },
};
`;
    const withImport = existingContent.includes("from 'next'")
      ? existingContent
      : existingContent.slice(0, insertPos) +
        `import type { Metadata } from 'next';\n` +
        existingContent.slice(insertPos);

    const importEnd = withImport.match(/^import[\s\S]*?;\n/m);
    const pos = importEnd ? importEnd.index! + importEnd[0].length : 0;
    return (
      withImport.slice(0, pos) +
      metadataExport +
      withImport.slice(pos)
    );
  }

  return metadataBlock + existingContent;
}

function buildReactSeoComponent(pages: PageMeta[]): string {
  const defaultMeta = pages.find((p) => p.url === '/') ?? pages[0];
  if (!defaultMeta) {
    return '';
  }

  return `import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  jsonLd?: Record<string, unknown>;
}

export function SEO({
  title = ${JSON.stringify(defaultMeta.title)},
  description = ${JSON.stringify(defaultMeta.description)},
  keywords = ${JSON.stringify(defaultMeta.keywords)},
  jsonLd = ${JSON.stringify(defaultMeta.jsonLd, null, 2).replace(/\n/g, '\n  ')},
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
}
`;
}

function buildViteIndexHtml(pages: PageMeta[], domain: string): string {
  const homeMeta = pages.find((p) => p.url === '/') ?? pages[0];
  if (!homeMeta) {
    return '';
  }

  const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(homeMeta.jsonLd)}</script>`;

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${homeMeta.title}</title>
    <meta name="description" content="${homeMeta.description}" />
    <meta name="keywords" content="${homeMeta.keywords.join(', ')}" />
    <link rel="canonical" href="${domain}" />
    ${jsonLdScript}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function injectViteMeta(existingHtml: string, homeMeta: PageMeta, domain: string): string {
  let result = existingHtml;

  if (/<title>.*?<\/title>/.test(result)) {
    result = result.replace(/<title>.*?<\/title>/, `<title>${homeMeta.title}</title>`);
  } else {
    result = result.replace('</head>', `  <title>${homeMeta.title}</title>\n  </head>`);
  }

  if (/meta\s+name="description"/.test(result)) {
    result = result.replace(
      /meta\s+name="description"\s+content="[^"]*"/,
      `meta name="description" content="${homeMeta.description}"`
    );
  } else {
    result = result.replace(
      '</head>',
      `  <meta name="description" content="${homeMeta.description}" />\n  </head>`
    );
  }

  if (!/meta\s+name="keywords"/.test(result)) {
    result = result.replace(
      '</head>',
      `  <meta name="keywords" content="${homeMeta.keywords.join(', ')}" />\n  </head>`
    );
  }

  if (!/application\/ld\+json/.test(result)) {
    const jsonLdScript = `  <script type="application/ld+json">${JSON.stringify(homeMeta.jsonLd)}</script>\n`;
    result = result.replace('</head>', `${jsonLdScript}  </head>`);
  }

  if (!/rel="canonical"/.test(result)) {
    result = result.replace(
      '</head>',
      `  <link rel="canonical" href="${domain}" />\n  </head>`
    );
  }

  return result;
}

export async function integrateCode(
  root: string,
  framework: Framework,
  pages: PageMeta[],
  domain: string
): Promise<void> {
  if (pages.length === 0) {
    logger.warning('Нет метаданных для интеграции в код');
    return;
  }

  const homeMeta = pages.find((p) => p.url === '/') ?? pages[0];
  if (!homeMeta) {
    return;
  }

  switch (framework) {
    case 'next': {
      const layoutPaths = [
        path.join(root, 'app', 'layout.tsx'),
        path.join(root, 'app', 'layout.ts'),
        path.join(root, 'app', 'layout.jsx'),
        path.join(root, 'app', 'layout.js'),
      ];

      let layoutPath: string | null = null;
      for (const lp of layoutPaths) {
        if (await fs.pathExists(lp)) {
          layoutPath = lp;
          break;
        }
      }

      if (!layoutPath) {
        layoutPath = path.join(root, 'app', 'layout.tsx');
        await fs.ensureDir(path.dirname(layoutPath));
        const content = buildNextMetadataExport(homeMeta, domain) +
          `\nexport default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
`;
        await fs.writeFile(layoutPath, content, 'utf-8');
        logger.success(`Создан ${path.relative(root, layoutPath)}`);
        return;
      }

      await backupFile(layoutPath);
      const existing = await fs.readFile(layoutPath, 'utf-8');
      const updated = injectNextMetadata(existing, homeMeta, domain);
      await fs.writeFile(layoutPath, updated, 'utf-8');
      logger.success(`Обновлён ${path.relative(root, layoutPath)} (бэкап: .bak)`);
      break;
    }

    case 'react': {
      const seoPath = path.join(root, 'src', 'components', 'SEO.tsx');
      await fs.ensureDir(path.dirname(seoPath));
      await backupFile(seoPath);
      await fs.writeFile(seoPath, buildReactSeoComponent(pages), 'utf-8');
      logger.success(`Создан ${path.relative(root, seoPath)}`);
      break;
    }

    case 'vite': {
      const indexPath = path.join(root, 'index.html');
      await backupFile(indexPath);

      if (await fs.pathExists(indexPath)) {
        const existing = await fs.readFile(indexPath, 'utf-8');
        const updated = injectViteMeta(existing, homeMeta, domain);
        await fs.writeFile(indexPath, updated, 'utf-8');
        logger.success(`Обновлён index.html (бэкап: .bak)`);
      } else {
        await fs.writeFile(indexPath, buildViteIndexHtml(pages, domain), 'utf-8');
        logger.success('Создан index.html');
      }
      break;
    }

    default:
      logger.warning('Фреймворк не определён — интеграция в код пропущена');
  }
}
