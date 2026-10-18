# Tracker-tasking mode

Normally subagents never touch Jira or GitHub issues. Tracker mode is the one exception: the main
thread creates tickets *as the tasking vehicle*, each child ticket is a subagent's brief, and the
subagent reports on its own ticket. The user gets a parent ticket with a running summary instead
of a wall of chat, and the work survives sessions because the tickets do.

## When to use it

- The work is large enough that the user wants it visible in the tracker (multi-day, multiple
  deliverables, or something others on the project will look for).
- The user asks for it ("make tickets for this and work through them", "track this in Jira").
- The ledger alone would not survive the gaps between sessions this work will span.

Not for a one-session batch of small chunks. The ledger is enough there.

## Structure

Pick by the repo's convention (`lessons.md` Tracker mode section, else the Jira project's habits):

| Shape | When |
|---|---|
| **Epic + child tickets** (Story/Task) | Several deliverables, each shippable or reviewable on its own. |
| **Ticket + sub-tasks** | One deliverable split into steps that only make sense together. |
| **GitHub issue + task list or sub-issues** | Repos tracked in GitHub issues rather than Jira. |

The parent is the user's summary ticket. Children are the briefs.

## Creating the tickets (main thread only)

1. Plan the decomposition exactly as in the skill's step 1, then show the plan table.
2. Create the parent and children following `project-workflow:jira-issue-writer` (its template,
   priority rules, and its plan-first confirmation). Each child's description is the brief: Goal,
   Context, Scope, Expected outcome; the Done-check becomes the acceptance criteria. Add a label
   `orchestrated` so they can be found later.
3. Record each child key in the ledger's `Ticket` column and in the brief file. Set the ledger
   header `Tracker mode: Jira <PARENT-KEY>`.
4. Write `.claude/orchestrator/tracker-mode.json` so the guard hook (Claude Code only) can allow
   writes to exactly these keys:

   ```json
   { "parent": "KEY-120", "children": ["KEY-121", "KEY-122", "KEY-123"], "site": "<cloudId or host>" }
   ```

   For GitHub issues, `parent` and `children` are issue numbers as strings:

   ```json
   { "parent": "42", "children": ["43", "44"] }
   ```

   Delete the file when the orchestration closes.

## What a subagent may do on its own ticket

Only on the key named in its brief:

- Add comments: a start note, blockers, and the final report (same report format as the brief).
- Transition In Progress → In Review (or the project's equivalent review status). Match by status
  category and name, never a hard-coded transition id.

What it may never do: move any ticket to Done, touch the parent, touch a sibling, change
assignee, labels, priority, estimates, or links, create tickets, or write to any other tracker.
The brief's Rules section states this explicitly, with the key.

## What the main thread does

- After reviewing a child's return: comment the verdict on the child (accepted, with what was
  verified; or rework, with the gaps). Children are not closed by the orchestrator; follow the
  repo's convention (`project-workflow:finish-ticket`: ready-to-close comment and label, the user
  closes).
- Keep one running comment on the parent, edited or appended per batch, with the same shape as
  the user summary in the skill's step 6. The parent's description links the ledger's location.
- Commits still happen between the main thread and the user, referencing the child key in the
  subject per the repo's convention. One branch for the parent is the default; per-child branches
  only if the user wants separate PRs.
- When all children are accepted and the integration pass is clean: final summary on the parent,
  ready-to-close per convention, `tracker-mode.json` removed, ledger header back to `off`.

## Jira specifics

- Site: from the repo's `CLAUDE.md` or `project-workflow` skills (`tkforgeworks.atlassian.net`
  for this org); pass it as `cloudId`.
- Comments in markdown via `addCommentToJiraIssue`; transitions via `getTransitionsForJiraIssue`
  then `transitionJiraIssue`.
- The subagent needs the Atlassian MCP tools available to it. Plugin agents cannot declare their
  own MCP servers, so the tools come from the session; if they are not present, the subagent
  reports in chat as usual and the main thread posts its report on the child ticket.

## GitHub issues specifics

- Parent issue with a task list of `- [ ] #<child>` lines, or sub-issues where the repo uses them.
- Subagents comment on their own child issue via `gh issue comment <n>`; nothing else. The main
  thread ticks the task list and closes issues with the user.
