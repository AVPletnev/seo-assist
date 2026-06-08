# seo-assist

[![npm version](https://img.shields.io/npm/v/seo-assist.svg)](https://www.npmjs.com/package/seo-assist)
[![license](https://img.shields.io/npm/l/seo-assist.svg)](https://github.com/AVPletnev/seo-assist/blob/main/LICENSE)

CLI tool for automatic SEO setup in web projects: AI-powered meta tag generation, `robots.txt` with AI bot blocking, and `sitemap.xml`.

## Installation

```bash
npx seo-assist init
```

Or install globally:

```bash
npm install -g seo-assist
```

## Quick start

```bash
# 1. Initialize configuration
npx seo-assist init

# 2. Generate SEO files
npx seo-assist generate

# 3. Validate the result
npx seo-assist validate
```

## Commands

### `init`

Creates `seo.config.json` in the project root. Interactively asks for:

- Site type (e-commerce, blog, portfolio, landing page)
- Primary domain
- Language
- Whether to block AI crawlers (default: yes)

### `generate`

The main command. It:

1. **robots.txt** — writes to `public/` (or `static/`), blocks AI bots when `blockAiBots: true`
2. **sitemap.xml** — scans routes from config and the file system
3. **AI meta tags** — via the [OpenRouter API](https://openrouter.ai), saved to `seo-meta.json`
4. **Code integration** — Next.js (Metadata API), React (`SEO.tsx`), Vite (`index.html`)

Creates a `.bak` backup before modifying any files.

### `validate`

Checks for `robots.txt`, `sitemap.xml`, meta tags, and prints a report.

## OpenRouter API key

AI meta tag generation requires an API key:

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys) (free up to $5)
3. On the first `generate` run, the key is prompted and saved to `seo.config.json`

Without a key or without internet, only `robots.txt` and `sitemap.xml` are generated.

## Configuration example

```json
{
  "siteType": "blog",
  "domain": "https://example.com",
  "language": "ru",
  "blockAiBots": true,
  "routes": ["/", "/about", "/contact", "/blog/*"],
  "aiProvider": "openrouter",
  "aiModel": "gpt-3.5-turbo"
}
```

## Supported frameworks

| Framework | Detection | Integration |
|-----------|-----------|-------------|
| Next.js   | `next.config.*` | `app/layout.tsx` — Metadata API |
| Vite      | `vite.config.*` | `index.html` |
| React     | `src/index.html` | `src/components/SEO.tsx` |

## Development

```bash
git clone https://github.com/AVPletnev/seo-assist.git
cd seo-assist
npm install
npm run build

# Quick demo test with a Next.js blog example (no API key needed)
npm run test:demo

# Or run manually
node bin/index.js init
node bin/index.js generate
node bin/index.js validate
```

Demo project: `examples/next-blog/` — a minimal Next.js App Router setup with a ready-made `seo.config.json`.

## Publishing to npm (maintainers)

```bash
# 1. Check package contents
npm run publish:dry-run

# 2. Log in (if not already)
npm login

# 3. Publish (prepublishOnly: build + test:demo)
npm publish

# Verify after publishing
npx seo-assist@latest --version
```

## License

MIT — see [LICENSE](LICENSE)
