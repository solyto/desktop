#!/bin/sh
# Launch the Electron app through zypak (provided by org.electronjs.Electron2.BaseApp),
# which sets up the sandbox correctly inside Flatpak — no setuid chrome-sandbox needed.
# --ozone-platform-hint=auto lets Electron use Wayland when available, X11 otherwise.
exec zypak-wrapper /app/solyto/node_modules/electron/dist/electron /app/solyto \
  --ozone-platform-hint=auto "$@"
