#!/usr/bin/env bash
#
# One-step setup for the FB Marketplace -> KBB / CarComplaints extension.
# Installs Bun (a small build tool) if needed, then builds the extension.
# No programming knowledge required — just run this and follow README Step 3.
#
set -euo pipefail
cd "$(dirname "$0")"

echo
echo "  FB Marketplace -> KBB / CarComplaints — setup"
echo "  ============================================="
echo

# Find Bun, or install it. After installing, add it to PATH for this run so the
# build (which calls 'bun' again internally) can find it.
if ! command -v bun >/dev/null 2>&1; then
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  else
    echo "  Installing Bun (a small build tool)…"
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo
  fi
fi

echo "  Building the extension…"
bun run build

echo
echo "  ✅ Done! Now load this folder into your browser (README Step 3):"
echo
echo "       $(pwd)/extension"
echo
