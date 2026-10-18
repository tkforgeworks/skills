# Model tiers

Size the model to the task, not to the project. The main thread is the most capable model in the
session; everything below it is chosen to be *sufficient*, not impressive. Check the Agent tool's
accepted `model` values at the start of a session; the aliases below are current as of writing.

| Tier | Plugin agent | Default model / effort | Use for |
|---|---|---|---|
| **T0 scout** | `orchestration:scout` | haiku, read-only | Mapping code before planning: "where is X handled", "list every caller of Y", "what does this module export". Returns a map, never edits. |
| **T1 light** | `orchestration:worker-light` | haiku | Mechanical, fully specified, low ambiguity. Doc and comment updates, changelog lines, renames with a given mapping, formatting, config value changes, running a named command and reporting its output, boilerplate from an explicit example. |
| **T2 standard** | `orchestration:worker` | sonnet | Well-specified implementation inside existing patterns. A function or endpoint with a clear spec, tests for existing code, a contained refactor, wiring a new case into an existing switch/registry, fixing a bug whose cause is already known. |
| **T3 heavy** | `orchestration:worker-heavy` | opus, effort high | Ambiguous or cross-cutting. Debugging with unknown root cause, multi-file features, work needing design judgement inside a brief's constraints, performance work, migrations, anything where the brief says "figure out". |
| **T4 peer** | `orchestration:worker-heavy` with `model` set to the main thread's model, or inline | the main thread's own model | Only when the chunk is as hard as the main thread's own job and must run in parallel with other work. Otherwise do it inline: a T4 dispatch saves no tokens, only wall-clock. |
| **Review** | `orchestration:reviewer` | opus, read-only | An independent read of a T3 result or of a diff the main thread wants a second opinion on. Give it the code and the brief, not the main thread's conclusion. |

## Signals that push a task up a tier

- The brief contains "investigate", "figure out", "decide", "design", or "why".
- More than three files, or any file the main thread has not read.
- Unknown root cause; flaky or environment-dependent behaviour.
- Output quality is hard to check mechanically (prose for users, API shape, error messages).
- The task failed or needed rework at the lower tier before (see `lessons.md`).
- Concurrency, security, data migration, or anything irreversible.

## Signals that push it down

- The main thread can write the exact diff shape in the brief.
- A test or command decides pass/fail with no judgement.
- There is a sibling in the codebase to copy from, and the brief names it.
- The task has been done at that tier in this repo before and was accepted first time.

## Effort

Pass `effort` only when the tier table or `lessons.md` says so; otherwise the agent's default
applies. `high` for T3 debugging and design-constrained work. `low` is appropriate for T1 batch
work where the brief is exhaustive. Never raise effort to compensate for a vague brief; fix the brief.

## Built-in agents

`Explore` and `Plan` remain useful for one-shot read-only searches and plans, but they cannot be
resumed with `SendMessage` and skip the project's `CLAUDE.md`. Prefer `orchestration:scout` when
the result may need a follow-up question.

## Calibration

Each ledger row records the tier and the verdict. After review, `lessons.md` gets one of:

- **over-tiered**: accepted first time, trivially; the next similar task goes a tier down;
- **right**: nothing to change;
- **under-tiered**: rework or rejection for reasons of capability (not brief quality); the next
  similar task goes a tier up.

Distinguish capability failures from brief failures. An agent that did the wrong thing because the
brief was ambiguous is a brief lesson, not a tier lesson.
