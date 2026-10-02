#!/usr/bin/env bash
# Fetch a fresh copy of the org's .github standards repo.
# Usage: fetch-org-standards.sh [org] [dest-dir]
# Prints: path, commit SHA, commit date. Full history is kept (blobless) so
# `git log <last-checked-sha>..HEAD` works for "what changed since last check".
set -euo pipefail

org="${1:-tkforgeworks}"
dest="${2:-$(mktemp -d)/org-github}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI not found; install it and run 'gh auth login'" >&2
  exit 1
fi

if [ -d "$dest/.git" ]; then
  git -C "$dest" fetch --quiet origin
  git -C "$dest" reset --quiet --hard origin/HEAD
else
  gh repo clone "$org/.github" "$dest" -- --quiet --filter=blob:none >/dev/null
fi

echo "path=$dest"
echo "sha=$(git -C "$dest" rev-parse HEAD)"
echo "date=$(git -C "$dest" log -1 --format=%cI)"
