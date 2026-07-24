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
cp "$SCRIPT_DIR/patch/app.d.ts" "$BUILD_DIR/src/app.d.ts"

echo "→ Installing dependencies..."
# Desktop-only build dependency: Electron loads a static (prerendered) build.
# Adding it keeps app's carried-over lockfile intact (deterministic tree);
# everything else comes from app (single source of truth).
cd "$BUILD_DIR"
npm install --save-dev --save-exact @sveltejs/adapter-static@3.0.10

echo "→ Building..."
PUBLIC_API_URL=https://api.solyto.app PUBLIC_DESKTOP=true PUBLIC_VERSION="$VERSION" PUBLIC_REDIRECT_AFTER_LOGOUT=/ npm run build

echo "→ Installing Electron..."
cd "$SCRIPT_DIR"
npm install

echo "✓ Done. Run: npm start"
