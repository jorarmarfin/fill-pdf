#!/usr/bin/env bash
# Deploy manual Linux: genera .deb y .AppImage en release/linux/
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -d node_modules ]] || yarn install --immutable
yarn tauri build --bundles deb,appimage
mkdir -p release/linux
cp src-tauri/target/release/bundle/deb/*.deb release/linux/
cp src-tauri/target/release/bundle/appimage/*.AppImage release/linux/
echo "Listo:"; ls -lh release/linux
