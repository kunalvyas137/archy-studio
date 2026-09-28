#!/usr/bin/env bash
# Installs the Genesys Cloud toolchain into this repo: gc CLI, Archy, Python deps, Platform API spec.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/bin" "$ROOT/spec" "$ROOT/archy"

echo "==> gc CLI"
curl -fsSL https://sdk-cdn.mypurecloud.com/external/go-cli/linux/latest/gc -o "$ROOT/bin/gc"
chmod +x "$ROOT/bin/gc"

echo "==> Archy"
tmp="$(mktemp -d)"
curl -fsSL https://sdk-cdn.mypurecloud.com/archy/latest/archy-linux.zip -o "$tmp/archy.zip"
unzip -qo "$tmp/archy.zip" -d "$ROOT/archy"
rm -rf "$tmp"
(cd "$ROOT/archy" && ./archy version >/dev/null)

echo "==> Python deps"
pip3 install -q -r "$ROOT/requirements.txt"

echo "==> Platform API spec"
python3 "$ROOT/gcx/gcx.py" refresh-spec

echo "Done. Add to PATH: export PATH=\"$ROOT/bin:$ROOT/scripts:\$PATH\""
