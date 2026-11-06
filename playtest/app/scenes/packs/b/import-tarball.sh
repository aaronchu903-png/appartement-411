#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
TAR="${1:-${STYLE_B_TAR:-/workspace/style_b_canonical_v3.tar.gz}}"
if [[ ! -f "$TAR" ]]; then
  echo "Missing tarball: $TAR" >&2
  echo "Attach style_b_canonical_v3.tar.gz to the workspace or pass a path." >&2
  exit 1
fi
rm -rf "$ROOT/canonical"
mkdir -p "$ROOT/canonical"
tar -xzf "$TAR" -C "$ROOT/canonical"
ONE="$(find "$ROOT/canonical" -mindepth 1 -maxdepth 1 -type d | head -1)"
if [[ -n "$ONE" && ! -f "$ROOT/canonical/manifest.json" && -f "$ONE/manifest.json" ]]; then
  shopt -s dotglob
  mv "$ONE"/* "$ROOT/canonical/"
  rmdir "$ONE"
fi
node "$ROOT/convert-canonical.cjs" "$ROOT/canonical" "$ROOT"
COUNT="$(node -e "const m=require('$ROOT/manifest.json'); console.log(Object.keys(m.assets).length)")"
if [[ "$COUNT" != "185" ]]; then
  echo "Expected 185 pack assets, got $COUNT" >&2
  exit 1
fi
if [[ -f "$ROOT/canonical/check_manifest.py" ]]; then
  python3 "$ROOT/canonical/check_manifest.py" "$ROOT/canonical/manifest.json"
fi
node "$ROOT/merge-sofa-props.cjs" "$ROOT"
echo "Pack b ready: $COUNT canonical assets plus sofa kitchen props/backdrop"
