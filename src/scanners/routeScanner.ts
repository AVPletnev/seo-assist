import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import type { RouteInfo, SeoConfig } from '../types';
import type { Framework } from '../types';

const ROUTE_FILE_PATTERNS = [
  'page.tsx',
  'page.ts',
  'page.jsx',
  'page.js',
];

function filePathToRoute(filePath: string, baseDir: string): string {
  const relative = path.relative(baseDir, path.dirname(filePath));
  if (relative === '.' || relative === '') {
    return '/';
  }
  const segments = relative.split(path.sep).filter(Boolean);
  const route = '/' + segments.join('/');
  return route.replace(/\/\([^)]+\)/g, '').replace(/\/+/g, '/') || '/';
}

function getPriority(routePath: string, configRoutes: string[]): number {
  if (routePath === '/') {
    return 1.0;
  }

  for (const pattern of configRoutes) {
    if (pattern === routePath) {
      return 1.0;
    }
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (routePath.startsWith(prefix)) {
        return 0.8;
      }
    }
  }

  if (routePath.startsWith('/blog')) {
    return 0.8;
  }

  return 0.6;
}

async function scanNextRoutes(root: string): Promise<string[]> {
  const routes: string[] = [];
  const appDir = path.join(root, 'app');
  const pagesDir = path.join(root, 'pages');

  if (await fs.pathExists(appDir)) {
    const files = await fg(
      ROUTE_FILE_PATTERNS.map((p) => `**/${p}`),
      { cwd: appDir, absolute: true }
    );
    for (const file of files) {
      const route = filePathToRoute(file, appDir);
      if (!route.includes('[') && !routes.includes(route)) {
        routes.push(route);
      }
    }
  }

  if (await fs.pathExists(pagesDir)) {
    const pageFiles = await fg(['**/*.{tsx,ts,jsx,js}'], {
      cwd: pagesDir,
      absolute: true,
      ignore: ['**/_app.*', '**/_document.*', '**/api/**'],
    });
    for (const file of pageFiles) {
      const relative = path.relative(pagesDir, file);
      const withoutExt = relative.replace(/\.(tsx|ts|jsx|js)$/, '');
      let route: string;
      if (withoutExt === 'index') {
        route = '/';
      } else if (withoutExt.endsWith('/index') || withoutExt.endsWith('\\index')) {
        route = '/' + withoutExt.replace(/[/\\]index$/, '').replace(/\\/g, '/');
      } else {
        route = '/' + withoutExt.replace(/\\/g, '/');
      }
      if (!route.includes('[') && !routes.includes(route)) {
        routes.push(route);
      }
    }
  }

  return routes;
}

async function scanViteRoutes(root: string): Promise<string[]> {
  const routes: string[] = ['/'];

  const srcDir = path.join(root, 'src');
  if (!(await fs.pathExists(srcDir))) {
    return routes;
  }

  const pageFiles = await fg(['**/*.{tsx,jsx,vue}'], {
    cwd: srcDir,
    absolute: true,
    ignore: ['**/components/**', '**/utils/**', '**/hooks/**'],
  });

  for (const file of pageFiles) {
    const basename = path.basename(file, path.extname(file));
    if (['App', 'main', 'index'].includes(basename)) {
      continue;
    }
    const relative = path.relative(srcDir, path.dirname(file));
    if (relative === '.') {
      if (!routes.includes(`/${basename.toLowerCase()}`)) {
        routes.push(`/${basename.toLowerCase()}`);
      }
    }
  }

  return routes;
}

function expandConfigRoutes(configRoutes: string[]): string[] {
  const expanded: string[] = [];
  for (const route of configRoutes) {
    if (route.endsWith('/*')) {
      expanded.push(route.slice(0, -2));
    } else {
      expanded.push(route);
    }
  }
  return expanded;
}

export async function scanRoutes(
  root: string,
  config: SeoConfig,
  framework: Framework
): Promise<RouteInfo[]> {
  const routeMap = new Map<string, RouteInfo>();

  for (const route of expandConfigRoutes(config.routes)) {
    routeMap.set(route, {
      path: route,
      priority: getPriority(route, config.routes),
      source: 'config',
    });
  }

  let fsRoutes: string[] = [];
  if (framework === 'next') {
    fsRoutes = await scanNextRoutes(root);
  } else if (framework === 'vite' || framework === 'react') {
    fsRoutes = await scanViteRoutes(root);
  }

  for (const route of fsRoutes) {
    if (!routeMap.has(route)) {
      routeMap.set(route, {
        path: route,
        priority: getPriority(route, config.routes),
        source: 'filesystem',
      });
    }
  }

  return Array.from(routeMap.values()).sort((a, b) =>
    a.path.localeCompare(b.path)
  );
}
