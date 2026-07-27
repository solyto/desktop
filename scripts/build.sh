#!/usr/bin/env bash
# Local dev build: refresh the vendored frontend from ../app, build it, install Electron.
# CI / Flathub do NOT vendor (they build the committed frontend via build-frontend.sh).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/vendor.sh"
"$SCRIPT_DIR/build-frontend.sh"

echo "→ Installing Electron..."
cd "$SCRIPT_DIR/.."
npm install

echo "✓ Done. Run: npm start"
