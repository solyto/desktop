#!/usr/bin/env bash
# Build the committed frontend (desktop/frontend) into a prerendered static site
# (frontend/build). Run by the release workflow. The Flathub manifest inlines the
# same steps instead of calling this, so it can pin the version explicitly.
# No network fetch of app source — the frontend is vendored (see vendor.sh).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

# Resolve the version with node's cwd already at the root, not via an absolute
# path: under Git Bash on Windows $ROOT is a POSIX path (/d/a/...) that
# Windows-native node cannot resolve.
cd "$ROOT"
VERSION=$(node -p "require('./package.json').version")

echo "→ Installing frontend dependencies..."
cd "$ROOT/frontend"
npm ci

echo "→ Building frontend ($VERSION)..."
PUBLIC_API_URL=https://api.solyto.app \
PUBLIC_DESKTOP=true \
PUBLIC_VERSION="$VERSION" \
PUBLIC_REDIRECT_AFTER_LOGOUT=/ \
  npm run build

echo "✓ Done → frontend/build"
