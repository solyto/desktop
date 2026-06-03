#!/bin/bash

if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --install '/usr/bin/solyto' 'solyto' '/opt/solyto/solyto' 100 || true
else
    ln -sf '/opt/solyto/solyto' '/usr/bin/solyto'
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi

if hash gtk-update-icon-cache 2>/dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi
