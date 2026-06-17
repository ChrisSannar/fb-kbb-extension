#!/usr/bin/env bash
#
# Mac users: double-click this file to set up the extension.
# (If macOS says it's from an unidentified developer: right-click -> Open.)
#
cd "$(dirname "$0")" || exit 1
bash ./setup.sh
echo
read -n 1 -s -r -p "  Press any key to close this window."
echo
