#!/usr/bin/env bash
# Uso: ./run.sh [dev|test|build]
#   dev   (por defecto) levanta la app de escritorio en modo desarrollo
#   test  verifica dependencias, compila frontend y chequea el backend Rust
#   build compila el binario release sin empaquetar
set -euo pipefail
cd "$(dirname "$0")"
cmd="${1:-dev}"

check_deps() {
  command -v cargo >/dev/null || { echo "Falta cargo (rustup)"; exit 1; }
  command -v yarn  >/dev/null || { echo "Falta yarn"; exit 1; }
  if [[ "$(uname)" == "Linux" ]]; then
    pkg-config --exists webkit2gtk-4.1 || {
      echo "Falta webkit2gtk-4.1. Ubuntu/Debian:"
      echo "  sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libxdo-dev libayatana-appindicator3-dev librsvg2-dev"
      exit 1
    }
  fi
  [[ -d node_modules ]] || yarn install --immutable
}

check_deps
case "$cmd" in
  dev)   yarn tauri dev ;;
  test)
    yarn build
    (cd src-tauri && cargo check)
    echo "OK: frontend y backend compilan"
    ;;
  build) yarn tauri build --no-bundle ;;
  *) echo "Uso: $0 [dev|test|build]"; exit 1 ;;
esac
