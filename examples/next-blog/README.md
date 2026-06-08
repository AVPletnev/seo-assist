# next-blog — демо-проект для seo-assist

Минимальная структура Next.js App Router для локального тестирования CLI.

## Структура

- `app/page.tsx` — главная
- `app/about/page.tsx` — о нас
- `app/contact/page.tsx` — контакты
- `app/blog/page.tsx` — блог
- `seo.config.json` — готовый конфиг (без `init`)

## Быстрый тест из корня репозитория

```bash
npm run test:demo
```

## Ручной тест в этой папке

```bash
cd examples/next-blog
node ../../bin/index.js generate   # Enter — пропустить API-ключ
node ../../bin/index.js validate
```

С API-ключом OpenRouter `generate` также создаст `seo-meta.json` и обновит `app/layout.tsx`.
