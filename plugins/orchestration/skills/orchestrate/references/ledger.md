# Ledger format

`.claude/orchestrator/ledger.md` is the single place that says what has been dispatched and where
it stands. It is written for the user to read, so it is a Markdown table plus short notes, not a
log. The main thread updates it at every status change; no one else writes to it.

## Statuses

| Status | Meaning |
|---|---|
| `queued` | Brief written, not yet dispatched (waiting on a dependency or on plan approval). |
| `dispatched` | Agent call made. |
| `returned` | Completion notification received; not yet reviewed. |
| `rework` | Reviewed; delta brief sent to the same agent. Increment the rework count. |
| `accepted` | Reviewed and meets the expected outcome. |
| `rejected` | Reviewed; wrong approach or rule breach; changes reverted. |
| `cancelled` | Withdrawn before completion (plan changed). |
| `orphaned` | Found `dispatched` at the start of a new session; the agent no longer exists. |

## Layout

```markdown
# Orchestrator ledger: <project name>

Last updated: <YYYY-MM-DD HH:MM> by session <short id or date>.
Tracker mode: off | Jira <PARENT-KEY> | GitHub #<n>

## Active

| ID | Chunk | Tier / agent | Model | Status | Dispatched | Done-check | Ticket |
|---|---|---|---|---|---|---|---|
| T-007 | Add retry to S3 uploader | T2 worker | sonnet | dispatched | 10-17 14:02 | `pytest tests/storage -q` | |
| T-008 | Update storage docs for retry | T1 worker-light | haiku | queued (after T-007) | | docs build clean | |

## Done (this session)

| ID | Chunk | Tier | Verdict | Reworks | Result |
|---|---|---|---|---|---|
| T-006 | Map upload call sites | T0 scout | accepted | 0 | 4 call sites, listed in T-007 brief |

## Notes

- T-007: tier chosen because the retry policy is spelled out in the brief; if it needs backoff
  design, escalate to T3.
```

## Rules

- IDs are sequential per project and never reused, including across sessions. The next ID is one
  more than the highest in `ledger.md` and `ledger-archive.md`.
- `Dispatched` is local time, `MM-DD HH:MM`. Add a `Returned` time in the Notes line if the user
  tracks duration.
- `Ticket` is filled only in tracker mode: the child ticket key the agent may write to.
- Keep the Active table to what is genuinely active. When a session closes, move its Done rows to
  `ledger-archive.md` under a dated heading. Keep the last two or three sessions' Done rows in the
  main file for the user's convenience.
- The ledger does not hold briefs or returns. Briefs are in `briefs/`; returns live in the agent's
  transcript and in the review summary the user received.

## Status requests

When the user asks "status", "what's running", "where are we": read the ledger, present the
Active table as is, and add one line per `returned` row saying review is next. Do not re-run the
plan.
