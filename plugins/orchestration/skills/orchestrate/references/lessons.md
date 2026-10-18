# Lessons format

`.claude/orchestrator/lessons.md` is how the orchestrator gets better at this project. It is read
at step 0 of every run and appended to at step 7. Keep it terse and current: prune entries that
no longer apply rather than letting it grow into a history.

## Layout

```markdown
# Orchestrator lessons: <project name>

## Standing brief context
Lines copied into the Context or Rules section of every brief in this repo.
- Tests run with `make test`; `pytest` directly misses the fixtures in `conftest.py` at the root.
- The `legacy/` tree is frozen; never edit it, even for typos.
- Lint is `ruff check . && ruff format --check .`; CI fails on either.

## Never delegate
Work that stays inline, and why.
- Anything under `migrations/`: the user wants to write these personally. (user, 2026-10-03)
- Public API signatures in `api/v1`: decided with the user, then delegated for implementation.

## Tier calibration
Task shape, the tier that worked, and the evidence. Newest first; collapse duplicates.
| Task shape | Tier | Evidence |
|---|---|---|
| Adding a CLI subcommand following `cmd/*.py` | T2 | T-012, T-019 accepted first time |
| Debugging flaky integration tests | T3 high | T-015 under-tiered at T2 (two reworks); T-021 at T3 accepted |
| Docstring and README sweeps | T1 | T-003, T-009, T-017 accepted first time |

## Brief gaps found
What agents had to guess; now fixed in the standing context or template.
- Agents at T1 didn't know the docs build command; added to standing context (T-009).

## User preferences
How the user wants delegation to run here. Each with date.
- Prefers one summary per batch, not per agent. (2026-10-10)
- Wants the plan table even for two dispatches when they touch the build config. (2026-10-14)
- Happy for T1 work to go without plan confirmation. (2026-10-14)

## Tracker mode
- Jira project KEY; epics for multi-deliverable work, sub-tasks under a story otherwise.
- Child tickets use the standard description template; the brief's Done-check becomes the
  acceptance criteria.
```

## What to write after each review

Ask four questions and write only the answers that change future behaviour:

1. **Was the tier right?** Over-tiered, right, under-tiered (capability reasons only).
2. **What did the agent guess?** Each guess is a line for Standing brief context or the template.
3. **What did the repo teach?** A command, a frozen area, a flaky test, a convention that is not
   in `CLAUDE.md`. If it belongs in `CLAUDE.md`, suggest that to the user instead of hoarding it here.
4. **What did the user correct?** Tier choices, splits, summary shape, what not to delegate. Date it.

## Cross-project preferences

When a user preference is clearly about how they like delegation in general (not this repo), also
record it in auto-memory as a `feedback` memory, so the next project starts calibrated. Project
facts stay in the project's `lessons.md`.
