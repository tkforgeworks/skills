#!/usr/bin/env bash
# PreToolUse guard. Reads the hook JSON on stdin; denies tracker writes and git history
# operations when the call comes from a subagent. Allows everything in the main thread.
# Fails open (allows) when python3 is unavailable, so a missing interpreter never blocks work.
set -u
case "${ORCHESTRATION_GUARD:-all}" in
  off|0|false) exit 0 ;;
esac
if ! command -v python3 >/dev/null 2>&1; then
  exit 0
fi
exec python3 -I "$(dirname "$0")/subagent-guard.py"
