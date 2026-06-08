import fs from 'fs-extra';
import path from 'path';
import type { Framework } from '../types';

const NEXT_CONFIG_FILES = [
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
];

export function detectFramework(root: string): Framework {
  for (const configFile of NEXT_CONFIG_FILES) {
    if (fs.existsSync(path.join(root, configFile))) {
      return 'next';
    }
  }

  if (
    fs.existsSync(path.join(root, 'vite.config.ts')) ||
    fs.existsSync(path.join(root, 'vite.config.js'))
  ) {
    return 'vite';
  }

  if (fs.existsSync(path.join(root, 'src', 'index.html'))) {
    return 'react';
  }

  if (fs.existsSync(path.join(root, 'index.html'))) {
    return 'vite';
  }

  return 'unknown';
}

export function getPublicDir(root: string, framework: Framework): string {
  switch (framework) {
    case 'next':
      return fs.existsSync(path.join(root, 'public'))
        ? path.join(root, 'public')
        : path.join(root, 'static');
    case 'vite':
    case 'react':
      return fs.existsSync(path.join(root, 'public'))
        ? path.join(root, 'public')
        : path.join(root, 'static');
    default:
      return path.join(root, 'public');
  }
}

export function getConfigPath(root: string): string {
  return path.join(root, 'seo.config.json');
}

export function getMetaPath(root: string): string {
  return path.join(root, 'seo-meta.json');
}
