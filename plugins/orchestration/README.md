# orchestration

Keeps the main conversation as planner, dispatcher and reviewer while subagents do the work. The
main thread is the most capable model in the session and the user's peer; each chunk of work goes
to a subagent sized to its difficulty, with a written brief and an expected outcome, and every
return is reviewed before the user sees a summary.

Install (Claude Code 2.1.275 or later):

```
/plugin install orchestration --marketplace tkforgeworks/skills
```

## What's in it

| Component | Path | Purpose |
|---|---|---|
| Skill `orchestrate` | `skills/orchestrate/` | The loop: orient, decompose, confirm, brief, dispatch, review, summarise, learn. References cover model tiers, the brief template, the ledger and lessons formats, the review checklist, and tracker-tasking mode. |
| Agents | `agents/` | `scout` (haiku, read-only), `worker-light` (haiku), `worker` (sonnet), `worker-heavy` (opus, high effort), `reviewer` (opus, read-only). Invoked as `orchestration:<name>`. Each carries the standing rules in its system prompt. |
| Guard hook | `hooks/` | Claude Code only. A `PreToolUse` hook that denies `git commit/push/tag/merge/rebase`, branch creation, `gh pr`/`gh issue` writes, and Atlassian MCP writes when the call runs inside any subagent. The main thread is never affected. |

## Files it keeps in a project

Under `.claude/orchestrator/` (added to `.git/info/exclude`, except `lessons.md`, which is worth
committing):

- `ledger.md`: every dispatch and its status, readable by the user at any time.
- `briefs/T-NNN.md`: the brief each subagent received.
- `lessons.md`: tier calibration, standing brief context, never-delegate list, user preferences.
- `tracker-mode.json`: present only while tickets are the tasking vehicle; lists the child keys
  subagents may write to. For GitHub issues the children are issue numbers as strings.

## Rules the plugin enforces

- Subagents never commit, push, tag, branch, or open PRs. Commits are between the main thread and
  the user.
- Subagents never write to Jira or GitHub issues, except in tracker-tasking mode, where each may
  comment on and transition its own child ticket only, and never to Done.
- Every dispatch has a brief with an expected outcome and a done-check; every return is reviewed.

## Guard hook options

| Setting | Effect |
|---|---|
| default | Guard applies to every subagent in the session. |
| `ORCHESTRATION_GUARD=orchestration` | Guard applies only to this plugin's agents. |
| `ORCHESTRATION_GUARD=off` | Guard disabled. |

The hook needs `python3`; without it the guard fails open and the rules rely on the agent prompts
and briefs alone. In Chat and Cowork the hook does not run and the skill works inline.

## Testing the hook

```bash
printf '%s' '{"agent_id":"a1","tool_name":"Bash","tool_input":{"command":"git commit -m x"}}' \
  | bash plugins/orchestration/hooks/scripts/subagent-guard.sh
```

prints a deny decision; the same input without `agent_id` prints nothing (allow).
