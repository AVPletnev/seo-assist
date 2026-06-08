# seo-assist

CLI-инструмент для автоматической настройки SEO в веб-проектах: генерация метатегов через AI, `robots.txt` с блокировкой AI-ботов и `sitemap.xml`.

## Установка

```bash
npx seo-assist init
```

Или глобально:

```bash
npm install -g seo-assist
```

## Быстрый старт

```bash
# 1. Инициализация конфигурации
npx seo-assist init

# 2. Генерация SEO-файлов
npx seo-assist generate

# 3. Проверка результата
npx seo-assist validate
```

## Команды

### `init`

Создаёт `seo.config.json` в корне проекта. Интерактивно запрашивает:

- Тип сайта (интернет-магазин, блог, портфолио, лендинг)
- Основной домен
- Язык
- Блокировку AI-краулеров (по умолчанию: да)

### `generate`

Основная команда. Выполняет:

1. **robots.txt** — в `public/` (или `static/`), с блокировкой AI-ботов при `blockAiBots: true`
2. **sitemap.xml** — сканирует роуты из конфига и файловой системы
3. **AI-метатеги** — через [OpenRouter API](https://openrouter.ai) сохраняет в `seo-meta.json`
4. **Интеграция в код** — Next.js (Metadata API), React (`SEO.tsx`), Vite (`index.html`)

Перед изменением файлов создаётся бэкап (`.bak`).

### `validate`

Проверяет наличие `robots.txt`, `sitemap.xml`, метатегов и выводит отчёт.

## OpenRouter API ключ

Для AI-генерации метатегов нужен API ключ:

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Получите ключ на [openrouter.ai/keys](https://openrouter.ai/keys) (бесплатно до $5)
3. При первом запуске `generate` ключ будет запрошен и сохранён в `seo.config.json`

Без ключа или без интернета работают только `robots.txt` и `sitemap.xml`.

## Пример конфигурации

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

## Поддерживаемые фреймворки

| Фреймворк | Определение | Интеграция |
|-----------|-------------|------------|
| Next.js   | `next.config.*` | `app/layout.tsx` — Metadata API |
| Vite      | `vite.config.*` | `index.html` |
| React     | `src/index.html` | `src/components/SEO.tsx` |

## Разработка

```bash
git clone <repo>
cd seo-assist
npm install
npm run build

# Быстрый демо-тест на примере Next.js-блога (без API-ключа)
npm run test:demo

# Или вручную
node bin/index.js init
node bin/index.js generate
node bin/index.js validate
```

Демо-проект: `examples/next-blog/` — минимальный Next.js App Router с готовым `seo.config.json`.

## Лицензия

MIT
