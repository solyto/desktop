#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../app"
BUILD_DIR="$SCRIPT_DIR/build-src"

VERSION=$(node -p "require('$SCRIPT_DIR/package.json').version")

echo "→ Syncing app source..."
rsync -a --delete \
  --exclude=".svelte-kit" \
  --exclude="build" \
  --exclude="node_modules" \
  "$SRC_DIR/" "$BUILD_DIR/"

echo "→ Applying desktop patches..."
cp "$SCRIPT_DIR/patch/svelte.config.js" "$BUILD_DIR/svelte.config.js"
cp "$SCRIPT_DIR/patch/package.json" "$BUILD_DIR/package.json"
cp "$SCRIPT_DIR/patch/layout.svelte" "$BUILD_DIR/src/routes/+layout.svelte"
cp "$SCRIPT_DIR/patch/TitleBar.svelte" "$BUILD_DIR/src/lib/components/ui/TitleBar.svelte"
cp "$SCRIPT_DIR/patch/app.d.ts" "$BUILD_DIR/src/app.d.ts"

echo "→ Installing dependencies..."
cd "$BUILD_DIR"
rm -f package-lock.json
npm install

echo "→ Building..."
PUBLIC_API_URL=https://api.solyto.app PUBLIC_DESKTOP=true PUBLIC_VERSION="$VERSION" PUBLIC_REDIRECT_AFTER_LOGOUT=/ npm run build

echo "→ Installing Electron..."
cd "$SCRIPT_DIR"
npm install

echo "✓ Done. Run: npm start"
