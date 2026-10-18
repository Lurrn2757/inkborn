#!/usr/bin/env bash
set -euo pipefail
workspace_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ -f "$workspace_root/.git" || -f "$workspace_root/.git/HEAD" ]]; then
  ordinary_root="$(git -C "$workspace_root" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ "$ordinary_root" == "$workspace_root" ]]; then
    exec git -C "$workspace_root" "$@"
  fi
fi
if [[ -f "$workspace_root/.inkborn-git/HEAD" ]]; then
  exec git --git-dir="$workspace_root/.inkborn-git" --work-tree="$workspace_root" "$@"
fi
printf '%s\n' 'No usable Git metadata found. The protected .git directory was left untouched.' >&2
exit 1
