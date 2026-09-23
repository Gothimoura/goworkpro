#!/usr/bin/env bash
# Gera a cópia da TELA 1 que vai para o hotspot do MikroTik.
# Fonte única de verdade = este projeto. Só o config.js muda.
#
# Uso:  ./build-router.sh https://goworkpro.netlify.app
set -euo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "ERRO: informe a URL do Netlify."
  echo "Uso: $0 https://SEU-SITE.netlify.app"
  exit 1
fi
BASE="${BASE%/}/"   # garante a barra final

OUT="dist-router"
rm -rf "$OUT"
mkdir -p "$OUT/assets"

# Tela 1 + login.html (RouterOS 7 procura login.html no html-directory).
# Políticas locais: o visitante ainda não tem internet antes do login.
cp index.html "$OUT/index.html"
cp index.html "$OUT/login.html"
cp inject.html "$OUT/inject.html"
cp termos.html politica-rede.html privacidade.html "$OUT/"
cp -r assets/css assets/js assets/img "$OUT/assets/"

# config.js da cópia do roteador: pageBase aponta para o Netlify
sed -E "s#pageBase: \"[^\"]*\"#pageBase: \"${BASE}\"#" \
    assets/js/config.js > "$OUT/assets/js/config.js"

echo "OK -> $OUT/  (pageBase = $BASE)"
grep -n "pageBase" "$OUT/assets/js/config.js"
du -sh "$OUT"
