---
name: orchestrate
description: >
  Runs the main conversation as planner, dispatcher and reviewer while subagents do the work, so
  the main context stays small and available to the user. Use whenever a coding task splits into
  independent chunks (several files, several features, a sweep across a codebase, a batch of doc or
  test updates), whenever the user says "delegate", "orchestrate", "farm this out", "use subagents",
  "keep the main thread free", "spin up agents for this", or asks for "status" on dispatched work,
  and at the start of any sizeable multi-step job in a code project. Each dispatch gets a written
  brief with an expected outcome, a model sized to its difficulty, and a ledger entry; every return
  is reviewed before it is summarised for the user. Subagents never commit, push, or write to Jira.
---

# Orchestrate

The main thread is the smartest model in the session and the user's peer. It thinks, plans,
decides, reviews and talks to the user. Subagents execute. Delegation exists to keep the main
context lean and the main model's attention on judgement, and to spend cheaper models on work that
does not need an expensive one.

Three files make this repeatable; all live under `.claude/orchestrator/` in the project:

| File | Purpose | Format |
|---|---|---|
| `ledger.md` | Every dispatch and its current status. The user can read it at any time. | `references/ledger.md` |
| `lessons.md` | What this project has taught the orchestrator: tier calibration, standing brief context, things never to delegate. | `references/lessons.md` |
| `briefs/T-NNN.md` | The full brief each subagent was given, kept for review and rework. | `references/brief-template.md` |

Create the directory on first use and add `.claude/orchestrator/ledger.md` and `briefs/` to
`.git/info/exclude` (not `.gitignore`, which would be a committed change the user didn't ask for).
`lessons.md` is worth committing; ask the user once.

## Fixed rules

1. **Subagents never commit, push, tag, open PRs, or create branches.** They edit the working tree
   and report. Commits are between the main thread and the user.
2. **Subagents never write to Jira, GitHub issues, or any tracker**, except inside tracker-tasking
   mode (`references/tracker-mode.md`), where each may write only to its own child ticket.
3. **Every dispatch has a written brief with an expected outcome and a done-check** the main thread
   can verify. No brief, no dispatch.
4. **Every return is reviewed by the main thread before anything reaches the user.** Claims of
   "tests pass" are checked, not forwarded.
5. **The user sees summaries, not transcripts.** Per-task outcome, what changed, what needs a
   decision, what was not done.
6. **The main thread does not do work it has delegated**, and does not delegate work smaller than
   its own brief would be. Inline is correct for one-file, one-idea changes.
7. **Lessons are recorded after every review**, and read before every plan.

## The loop

### 0. Orient

- Read `.claude/orchestrator/lessons.md` if it exists. Apply its standing context, tier
  calibration and never-delegate list to everything below.
- Read `ledger.md`. Entries still `dispatched`/`running` from an earlier session are orphans:
  subagents do not survive the session. Mark them `orphaned`, check the working tree for partial
  work (`git status`, `git diff --stat`), and decide with the user whether to re-dispatch.
- Confirm the Agent tool is available and which `model` values it accepts. Without it (Chat,
  Cowork), say so and work inline; the rest of this skill still shapes the plan and the summary.
- Note the tracker context: Jira project key from the repo's `CLAUDE.md` or recent commit
  subjects, or GitHub issues where that is the convention. This matters only for tracker mode.

### 1. Understand and decompose

Understand the ask well enough to write briefs that a less capable model can execute without
guessing. That usually means the main thread reads the entry points itself, or sends one `scout`
first (read-only, cheap) and plans from its map.

Split the work into chunks that are:

- **independent** where possible, so they run in parallel. Two agents editing the same file is a
  merge problem; serialise those or give them to one agent;
- **verifiable**: each has a done-check (a test, a command, a file that must exist, a diff shape);
- **sized to one brief**: if the brief needs more than a page, split further; if it is three lines,
  do it inline.

For each chunk decide: inline, or delegate at which tier (`references/model-tiers.md`). Record the
reason for the tier in one phrase; it is what the lessons file calibrates against later.

### 2. Confirm the plan

Show the user a short plan table before dispatching when there are three or more dispatches, when
anything touches shared infrastructure (build config, schemas, public APIs), or when tracker mode
is in play. For one or two obvious dispatches, go.

```
| ID | Chunk | Tier / agent | Why that tier | Done-check |
```

The user is a peer: take their adjustments to tiers and splits as calibration and write them to
`lessons.md` right away.

### 3. Brief and dispatch

- Write each brief to `briefs/T-NNN.md` from `references/brief-template.md`. The brief carries the
  standing rules, the scope (files in and out), the expected outcome, the done-check, and the return
  format. Include the standing context lines from `lessons.md`.
- Add a ledger row with status `queued`, then `dispatched` when the Agent call is made.
- Dispatch with the plugin's agents (`orchestration:scout`, `orchestration:worker-light`,
  `orchestration:worker`, `orchestration:worker-heavy`, `orchestration:reviewer`) so the standing
  rules travel in the agent definition as well as the brief. Pass `model` explicitly when the
  tier calls for something other than the agent's default.
- Launch independent dispatches in the same message so they run concurrently. Dependent ones wait
  for the review of what they depend on, not merely its completion.
- Parallel agents that must touch the same files get `isolation: "worktree"`, and the main thread
  owns merging the result. Prefer re-splitting over worktrees.
- Do not use the Workflow tool unless the user has opted into it in their own words.

### 4. While they run

Stay with the user. Do not poll output files and do not narrate waiting. Completion arrives as a
notification; update the ledger row to `returned` then and move on to review. If the user asks for
status, read the ledger and present the table.

### 5. Review each return

Follow `references/review-checklist.md`. In short: check the return against the expected outcome
and done-check, read the diff (not the agent's description of it), run the verification yourself
when it is cheap, and look for scope creep and rule breaches (any commit, any tracker write, any
file outside scope).

Verdicts, recorded in the ledger:

- `accepted`: meets the outcome. Fold it into the summary.
- `rework`: specific gaps. Send a delta brief to the **same** agent with `SendMessage` so it keeps
  its context; only re-dispatch fresh if the agent is gone or the approach was wrong. Second rework
  on the same task means the tier or the brief was wrong: escalate the tier or take it inline, and
  write the lesson.
- `rejected`: wrong approach or rule breach. Revert its changes (`git checkout -- <files>` for the
  files in its scope, after confirming nothing else touched them), note why, re-plan.

### 6. Summarise for the user

One message, when a batch is reviewed (not one per agent unless the user wants that). Shape:

- **Outcome** in a sentence: done, partly done, blocked.
- **Per-task table**: ID, chunk, tier used, verdict, one-line result.
- **What changed**: files or areas, in words; the diff is in the working tree.
- **Needs you**: decisions, open questions the agents raised, anything the main thread chose not
  to decide alone.
- **Not done**: explicitly, with why.
- **Next**: commit (the main thread drafts the commit, the user approves), ticket updates, the
  next batch.

Then handle commits and tracker updates with the user directly, following the repo's own
conventions (and `project-workflow:finish-ticket` where that applies).

### 7. Close out and learn

- Ledger: move finished rows to the Done section with their verdict; keep the file short by
  archiving sessions older than the last few into `ledger-archive.md`.
- Lessons (`references/lessons.md`): for each task, was the tier right? What did the agent have
  to guess that the brief should have said? Any repo gotcha future briefs must carry? Any user
  correction about what to delegate or how? Write it now; this is how the process improves.
- Preferences that hold across projects (the user's general delegation taste) also go to
  auto-memory as `feedback` entries, so new projects start calibrated.

## Choosing not to delegate

Delegate for throughput and context economy, not reflexively. Keep inline:

- anything on the `never delegate` list in `lessons.md`;
- changes smaller than their brief;
- decisions: architecture, API shape, naming that will be hard to change, anything the user would
  want to weigh in on;
- the final integration pass when several agents' work must fit together;
- all commits, PRs and tracker writes.

## Tracker-tasking mode

When the work is big enough that the user wants it visible in Jira (or GitHub issues), the main
thread can create the tickets as the tasking vehicle: an epic with child tickets, or a ticket with
sub-tasks, plus a running summary on the parent for the user. The child ticket *is* the brief, and
each subagent may write to its own child ticket only. Everything about this mode, including what
subagents may and may not touch, is in `references/tracker-mode.md`. Ticket creation itself
follows `project-workflow:jira-issue-writer` (plan shown first, user approves).
