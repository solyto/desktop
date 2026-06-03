#!/bin/bash

if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove 'solyto' '/opt/solyto/solyto' || true
else
    rm -f '/usr/bin/solyto'
fi

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
