# Review checklist

The main thread reviews every return before the user hears about it. The agent's report is a
claim; the working tree is the evidence. Review time is well spent: it is cheaper than a wrong
summary and far cheaper than a bad commit.

## 1. Rule breaches first

- `git log -1 --format=%H` unchanged since dispatch; `git status` shows no new branches or tags;
  no PR opened (`gh pr list --head $(git branch --show-current)` if in doubt). Any commit by an
  agent is a rejection even if the code is good: reset it (`git reset --soft HEAD~1` after
  confirming it is the agent's commit) and write the lesson.
- No tracker writes outside tracker mode; in tracker mode, none outside the agent's own ticket.
- Files changed (`git diff --name-only`, plus untracked) are all inside the brief's Scope. Out of
  scope changes are reverted unless trivially correct and reported as a deviation, in which case
  the brief was wrong and the lesson says so.

## 2. Outcome against the brief

- Read the brief's Expected outcome, then the diff. Does the end state match? Check each sentence
  of the expected outcome, not the overall impression.
- Run the Done-check commands yourself when they are cheap (seconds to a minute). When they are
  expensive, run at least one and spot-check the pasted output for signs of fabrication (round
  numbers, missing paths, output that does not match the command).
- Deviations: each one is either acceptable (note it for the summary) or a rework item.

## 3. Quality, proportional to tier

- T1: correctness and completeness; did it cover every instance the brief listed?
- T2: fits the sibling pattern named in the brief; tests exercise the new behaviour, not just
  import it; no new dependencies unless asked.
- T3: the design decision the agent made is one the main thread would have made or can defend to
  the user; edge cases named in the brief are handled; nothing clever where simple would do.
- Any tier: no secrets, no hard-coded personal paths, no silenced errors, no commented-out code,
  no TODOs the brief did not ask for.

For a T3 return the main thread does not fully trust, dispatch `orchestration:reviewer` with the
diff and the brief, and read its findings before deciding.

## 4. Decide

| Verdict | When | Then |
|---|---|---|
| accepted | Outcome met, checks pass, quality fine for the tier | Ledger `accepted`; into the summary |
| rework | Specific, bounded gaps | Delta brief via `SendMessage` to the same agent; ledger `rework`, count +1 |
| rejected | Wrong approach, rule breach, or a second rework would be needed | Revert its files; ledger `rejected`; re-plan (higher tier, better brief, or inline) |

## 5. Record

- Ledger row updated.
- One line in `lessons.md` if the review taught anything (tier, brief gap, repo fact).
- The summary bullet for this task, written now while it is fresh: ID, verdict, one-line result,
  anything the user must decide.

## Integration pass

When several accepted returns must work together, the main thread does the integration check
itself: build, full test run, a read through the seams where one agent's output meets another's.
This is not delegated.
