---
name: start-ticket
description: >
  Starts work on a Jira ticket the tkforgeworks way: reads the ticket, cuts the topic branch
  vX.Y.Z/<KEY>-N-short-topic from the current release branch, pushes it, and moves the ticket to
  In Progress. Use whenever the user wants to begin a ticket — "start CHEESE-41", "let's pick up
  LS-73", "work on ANVL-12", "start the next ticket", "branch for this ticket", "kick off <KEY>-N" —
  or names a Jira key and asks to begin coding on it.
---

# Start Ticket

Set up everything a ticket needs before the first line of code: the ticket read and understood,
the topic branch in the right place, and Jira showing the work as started.

Jira site: `tkforgeworks.atlassian.net` (pass it as `cloudId` to the Atlassian tools).

## Conventions come from the org repo

The branching model and commit convention are defined in `tkforgeworks/.github`
(`docs/branching-and-release.md`, and the process section of `templates/CLAUDE.md`). Read the
current branching doc at the start of each run:

```bash
gh api repos/tkforgeworks/.github/contents/docs/branching-and-release.md -H "Accept: application/vnd.github.raw"
```

The steps below summarise it as of writing. If the fetched doc disagrees, follow the doc and tell
the user this skill needs updating.

## Steps

### 1. Read the ticket

- Get the key from the user. If none was given, search for the user's In Progress / To Do tickets
  in this repo's Jira project and ask which one.
- Fetch it (`getJiraIssue`): summary, description, acceptance criteria, type, status, parent,
  and linked issues.
- If it's an **epic** (or has open children), say so: work happens on the child tickets, not the
  epic. Offer to start a child instead.
- If it's already **Done**, or in progress on another branch (`git branch -a | grep <KEY>-N`),
  stop and ask before continuing.

### 2. Confirm the repo matches the ticket

- The repo's Jira key is in its `.claude/CLAUDE.md` (Jira project / key line) or visible in
  recent commit subjects (`git log --oneline -20`). If the ticket's key doesn't match, ask:
  starting a ticket in the wrong repo is easy to do and annoying to undo.

### 3. Find the release branch

- `git fetch --prune`, then list `origin/v*/main`.
- **One** release branch → use it.
- **Several** → use the one the repo's `CLAUDE.md` names as current; if it doesn't say, ask.
- **None** → the version hasn't been started. Per the branching doc, a release branch
  `vX.Y.Z/main` is cut from the default branch, named for the version it will ship. Propose a
  version (from the manifest version and the size of the planned work, using the doc's rules) and
  create it only after the user confirms.

### 4. Create and push the topic branch

- Name: `vX.Y.Z/<KEY>-N-short-topic`, where `short-topic` is 2–4 lowercase, hyphenated words
  from the ticket summary (e.g. `v0.1.0/CHEESE-41-licenses-summary`).
- Cut it from the **up-to-date remote** release branch, not a stale local copy:
  `git switch -c <branch> origin/vX.Y.Z/main`.
- If the working tree has uncommitted changes, stop and ask what to do with them first.
- `git push -u origin <branch>` right away (CI runs on every push to a non-default branch).

### 5. Move the ticket to In Progress

- `getTransitionsForJiraIssue`, pick the transition into the project's **In Progress** status
  (statusCategory "In Progress" — workflows differ per project, so match by category and name,
  never by a hard-coded transition id), and apply it with `transitionJiraIssue`.
- If the ticket is already In Progress, leave it.
- Don't change the assignee, labels, or anything else unless asked.

### 6. Hand off

Tell the user, briefly:
- the branch name and that it's pushed, and the PR base it will target (the release branch);
- the ticket's acceptance criteria, restated as a short checklist — this is what `finish-ticket`
  will report against;
- the commit-subject convention for this ticket: `<KEY>-N: Imperative summary`, and
  `<KEY>-N: Fix ...` for bug fixes. Subjects become release-note lines, so they matter.

Then start the work if the user asked for that, or stop.
