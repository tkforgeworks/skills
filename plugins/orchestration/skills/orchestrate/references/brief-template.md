# Brief template

Save each brief as `.claude/orchestrator/briefs/T-NNN.md` and pass its full text as the Agent
prompt. A brief is complete when a careful engineer who has never seen this repo could execute it
without asking a question. Everything in angle brackets is filled in; sections marked optional may
be dropped.

```markdown
# T-NNN: <imperative title, under 80 chars>

You are a subagent dispatched by an orchestrator. Do exactly this task, then report in the format
at the end. If you are blocked or the task turns out to be different from what is described, stop
and report; do not improvise around it.

## Goal
<One paragraph: what to achieve and why it matters to the larger piece of work. Enough context to
make good local decisions, no more.>

## Context
- Repo: <path>; stack: <language / framework / build tool>.
- Relevant conventions: <from the repo CLAUDE.md and lessons.md standing context, as bullet lines>.
- Start here: <files to read first, with one phrase each on what they contain>.
- Sibling to copy from: <file or symbol that does the same kind of thing> (optional).
- Already known: <facts the orchestrator has established so the agent doesn't rediscover them>.

## Scope
- In: <files, directories, or symbols the agent may change>.
- Out: <files it must not touch, and why, e.g. "another agent owns it", "public API">.
- Dependencies: <nothing, or "T-004 has landed; its new helper is at ...">.

## Expected outcome
<Concrete description of the end state: files that exist, functions that exist with their
signatures, behaviour that is now true. Prefer "after this, `foo(x)` returns ... for ..." over
"implement foo".>

## Done-check
<The commands the orchestrator will run to verify, with the expected result. E.g.
`npm test -- src/foo` passes; `grep -c TODO src/foo.ts` prints 0; the file renders in the docs
build. The agent runs these too before reporting.>

## Rules
- Do not commit, push, tag, create branches, or open PRs. Leave changes in the working tree.
- Do not write to Jira, GitHub issues, or any tracker. <Tracker mode: replace with the allowed
  ticket key and actions from references/tracker-mode.md.>
- Do not change files outside Scope. If you believe you must, stop and report why.
- Do not run destructive commands (resets, force operations, deletes outside Scope).
- Do not spawn subagents.
- <Repo-specific rules from lessons.md.>

## Report format
Reply in under <300> words:
1. **Outcome**: done / partial / blocked, one line.
2. **Changes**: files touched, one phrase each.
3. **Verification**: each done-check command and its actual result (paste the decisive lines).
4. **Deviations**: anything done differently from the brief, and why.
5. **Open questions / blockers**: things the orchestrator must decide.
6. **Noticed, not done**: problems seen outside scope. Do not fix them.
```

## Writing good briefs

- **Expected outcome before method.** Say what must be true afterwards; constrain the method only
  where it matters (pattern to follow, library to use or avoid).
- **Name the sibling.** "Do it the way `UserRepository` does" removes most ambiguity for T1/T2.
- **Put known facts in.** Anything the main thread already learned (where the config is loaded,
  which test is flaky) saves the agent from re-reading, which is the whole point.
- **Done-checks are commands.** "Tests pass" is not a done-check; `pytest tests/test_foo.py -q`
  exiting 0 is.
- **Shrink the report.** A long return defeats the context economy. Cap words; ask for decisive
  lines of output, not whole logs.
- **One brief, one outcome.** Two outcomes is two briefs, or one T3 brief if they are entangled.

## Delta briefs (rework)

Sent with `SendMessage` to the same agent. Shape:

```markdown
Rework for T-NNN. Review of your return found:
- <gap 1, with what was expected vs found>
- <gap 2>
Keep everything else as is. Same scope, same rules, same report format. Address only the gaps.
```
