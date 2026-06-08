#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLE="$ROOT/examples/next-blog"
TMP="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

if [[ ! -d "$EXAMPLE" ]]; then
  echo "❌ Не найден $EXAMPLE"
  exit 1
fi

if [[ ! -f "$ROOT/dist/cli/index.js" ]]; then
  echo "ℹ Сборка пакета..."
  (cd "$ROOT" && npm run build)
fi

echo "ℹ Копируем демо-проект во временную директорию..."
cp -R "$EXAMPLE/." "$TMP/"
cd "$TMP"

echo ""
echo "▶ generate (без API-ключа — только robots.txt и sitemap.xml)"
printf '\n' | node "$ROOT/bin/index.js" generate

echo ""
echo "▶ validate"
node "$ROOT/bin/index.js" validate

PUBLIC_DIR="public"
if [[ ! -f "$PUBLIC_DIR/robots.txt" && -f "static/robots.txt" ]]; then
  PUBLIC_DIR="static"
fi

echo ""
echo "--- $PUBLIC_DIR/robots.txt (первые 12 строк) ---"
head -12 "$PUBLIC_DIR/robots.txt"

echo ""
echo "--- $PUBLIC_DIR/sitemap.xml ---"
cat "$PUBLIC_DIR/sitemap.xml"

echo ""
echo "✅ Демо завершено. Временный проект: $TMP (будет удалён при выходе)"
