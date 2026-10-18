"""PreToolUse guard for the orchestration plugin.

Denies, inside a subagent only:
  * Bash: git commit/push/tag/merge/rebase/cherry-pick/reset --hard, branch creation, and
    gh pr/issue writes;
  * Atlassian MCP write tools (create/edit/transition/comment/executeWrite/executeDestructive).

Tracker-mode exception: if <cwd>/.claude/orchestrator/tracker-mode.json exists, a subagent may
comment on or transition a Jira issue whose key is in its "children" list, and may run
`gh issue comment <n>` for a child number. Nothing else is opened up.

Output: JSON on stdout with permissionDecision "deny" and a reason; exit 0 either way.
"""
import json
import os
import re
import sys


def allow():
    sys.exit(0)


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "[orchestration guard] " + reason,
        }
    }))
    sys.exit(0)


try:
    data = json.load(sys.stdin)
except Exception:
    allow()

agent_id = data.get("agent_id") or ""
agent_type = data.get("agent_type") or ""
if not agent_id and not agent_type:
    allow()  # main thread

mode = os.environ.get("ORCHESTRATION_GUARD", "all").lower()
if mode == "orchestration":
    ours = ("scout", "worker-light", "worker", "worker-heavy", "reviewer")
    short = agent_type.split(":")[-1]
    if short not in ours:
        allow()

tool = data.get("tool_name") or ""
tool_input = data.get("tool_input") or {}
cwd = data.get("cwd") or os.getcwd()

tracker = None
try:
    with open(os.path.join(cwd, ".claude", "orchestrator", "tracker-mode.json")) as fh:
        tracker = json.load(fh)
except Exception:
    tracker = None
children = set()
if isinstance(tracker, dict):
    children = {str(k).upper() for k in tracker.get("children", [])}

RULES = "Subagents never commit, push, create branches/tags, open PRs, or write to trackers; report to the orchestrator instead."

if tool == "Bash":
    cmd = str(tool_input.get("command") or "")
    # Normalise whitespace; look at each pipeline/sequence segment.
    segments = re.split(r"(?:&&|\|\||;|\|)", cmd)
    for seg in segments:
        s = " ".join(seg.strip().split())
        if not s:
            continue
        git = re.match(r"^(?:sudo\s+)?git\s+(?:-C\s+\S+\s+|--no-pager\s+|-c\s+\S+\s+)*(\S+)(.*)$", s)
        if git:
            sub, rest = git.group(1), git.group(2)
            if sub in ("commit", "push", "merge", "rebase", "cherry-pick", "am", "revert"):
                deny(f"'git {sub}' is blocked inside a subagent. {RULES}")
            if sub == "tag" and not re.search(r"(^|\s)(-l|--list|-n\d*|--contains|--points-at)(\s|$)", rest) and rest.strip():
                deny("creating or deleting git tags is blocked inside a subagent. " + RULES)
            if sub == "reset" and "--hard" in rest:
                deny("'git reset --hard' is blocked inside a subagent: it can destroy other agents' work.")
            if sub in ("switch", "checkout") and re.search(r"(^|\s)(-c|-C|-b|-B|--create|--force-create|--orphan)(\s|$)", rest):
                deny("creating branches is blocked inside a subagent. " + RULES)
            if sub == "branch":
                readonly = re.search(r"(^|\s)(-a|-r|-l|--list|--show-current|--contains|--merged|--no-merged|-v|-vv|--format\S*)(\s|$)", rest)
                if rest.strip() and not readonly:
                    deny("creating, renaming or deleting branches is blocked inside a subagent. " + RULES)
        gh = re.match(r"^gh\s+(pr|issue|release)\s+(\S+)(.*)$", s)
        if gh:
            kind, verb, rest = gh.group(1), gh.group(2), gh.group(3)
            readonly = {"list", "view", "status", "checks", "diff", "download"}
            if verb in readonly:
                continue
            if kind == "issue" and verb == "comment":
                m = re.search(r"(?:#|\s)(\d+)(\s|$)", rest)
                if m and m.group(1) in children:
                    continue
                deny("subagents may comment only on their own tracker-mode child issue. " + RULES)
            deny(f"'gh {kind} {verb}' is blocked inside a subagent. {RULES}")
    allow()

# Atlassian MCP tools
name = tool.split("__")[-1]
write_markers = ("create", "edit", "update", "transition", "addcomment", "addoredit", "addworklog",
                 "executewrite", "executedestructive", "delete", "remove")
lname = name.lower()
if not any(m in lname for m in write_markers):
    allow()

key_pat = re.compile(r"\b[A-Z][A-Z0-9]+-\d+\b")
blob = json.dumps(tool_input)
keys = set(key_pat.findall(blob))
allowed_ops = ("addcomment", "addoredit", "transition")
if children and keys and keys <= children and any(m in lname for m in allowed_ops):
    allow()
if children:
    deny(f"tracker mode allows comments and transitions on {sorted(children)} only; '{name}' with keys {sorted(keys) or 'none'} is outside that. {RULES}")
deny(f"'{name}' is a tracker write and is blocked inside a subagent. {RULES}")
