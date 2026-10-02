---
name: finish-ticket
description: >
  Wraps up code work on a Jira ticket the tkforgeworks way: checks commit subjects, runs the repo's
  checks, opens the PR into the release branch, and posts the "Actions taken" comment. Once the PR
  is merged (and shipped, where the repo releases), posts the "Ready to close" comment and adds the
  ready-to-close label. Never closes the ticket. Use when the user says "finish this ticket",
  "wrap up CHEESE-41", "open the PR for this ticket", "I'm done with LS-73", "mark this ready to
  close", "the PR merged, update the ticket", or otherwise signals the code work on a ticket is done.
---

# Finish Ticket

Take a ticket from "code done" to "ready for the human to verify and close". The human always
closes tickets; this skill gets them to the point where closing is a quick check.

Jira site: `tkforgeworks.atlassian.net` (pass it as `cloudId` to the Atlassian tools).

## Fixed rules

- **Never close a ticket** or move it to any status in the Done category, even if asked in
  passing — confirm explicitly first.
- **The label is exactly `ready-to-close`** (lowercase, hyphenated) in every project. It's what
  the user filters on: `labels = ready-to-close AND statusCategory != Done`.
- **Add the label without removing existing labels.** Read the current labels and send the full
  list back, plus `ready-to-close`.
- **Show each Jira comment as a draft before posting it.** Post after the user approves (they can
  approve both comment and label in one go).

## Two stages

Work out which stage the ticket is in, then do only that stage.

| Stage | When | Jira result |
|---|---|---|
| **A. PR open** | Code is done; no PR yet, or the PR isn't merged | "Actions taken" comment, ends "Leaving the ticket open for you to verify." No label. |
| **B. Ready to close** | PR merged (and, for repos with a release pipeline, shipped in an RC or release) | "Actions taken" + "**Ready to close** after …" comment, and the `ready-to-close` label. |

Stage A then B is the normal path, often in different sessions. If the PR is already merged when
the skill runs, skip straight to B.

### Find the ticket and its state

- Ticket key from the branch name (`vX.Y.Z/<KEY>-N-topic`) or from the user.
- PR state: `gh pr list --head <branch> --state all --json number,state,baseRefName,mergeCommit,url`.
- Fetch the ticket (`getJiraIssue`, with comments) for its acceptance criteria and any earlier
  "Actions taken" comment.
- **Don't repeat a stage.** If the ticket already has that stage's comment (and, for B, the
  label), say so and only add what's new — e.g. a short follow-up comment when a pending item
  from the earlier comment has since landed. Never post a duplicate.

## Stage A — open the PR

1. **Clean tree.** Uncommitted changes? Ask whether they belong in this ticket before going on.
2. **Commit subjects.** `git log --format='%h %s' origin/<release-branch>..HEAD`. Each subject
   should be `<KEY>-N: Imperative summary` (fixes: `<KEY>-N: Fix ...`) — they become
   release-note lines. List any that don't match and offer to reword them. Rewording pushed
   commits means a force-push to the topic branch: say so and ask first.
3. **Run the repo's checks** locally: the lint / typecheck / test commands from the repo's
   `.claude/CLAUDE.md` "Stack & commands" table, or the CI workflow if that's missing. Report
   failures; don't open a PR on red without the user agreeing.
4. **Push and open the PR** into the release branch the topic branch was cut from (the
   `vX.Y.Z/main` matching its prefix) — never into the default branch.
   - Title: `<KEY>-N: <ticket summary>`.
   - Body: what changed (short bullets), how it was verified, and a link to the ticket
     (`https://tkforgeworks.atlassian.net/browse/<KEY>-N`).
5. **Check the acceptance criteria** one by one against what was built. Anything not met, or met
   differently, goes in the comment's deviation section — never leave it out.
6. **Draft the Stage A comment** (`references/comments.md`), show it, post it on approval
   (`addCommentToJiraIssue`, markdown).
7. **Status.** If the project's workflow has a review status (e.g. "In Review" — check with
   `getTransitionsForJiraIssue`), offer to move the ticket there. Otherwise leave it
   In Progress.

## Stage B — ready to close

1. **Confirm the merge**: PR state `MERGED`, and note the merge commit.
2. **Shipped?** If the repo has a release pipeline, find the first release or RC that contains
   the merge commit (`git tag --contains <sha>` after `git fetch --tags`, or
   `gh release list`). If nothing has shipped it yet, say so and ask whether to mark it ready
   anyway or wait for the next RC.
3. **Work out the verification step**: the concrete check the human should do before closing —
   e.g. "device check on rc.5: About → Licenses shows the summary". Base it on the acceptance
   criteria; avoid "verify it works".
4. **Open follow-ups**: anything still pending (an open PR elsewhere, a follow-up ticket) goes in
   the comment, and the "Ready to close" line says what it's waiting on.
5. **Draft the Stage B comment** (`references/comments.md`), show it with the label change, and
   on approval: post the comment, then update labels (existing labels + `ready-to-close`, via
   `editJiraIssue`). Leave the status unchanged.
6. **Parent ticket.** If the ticket has a parent (epic or story), check its children. When every
   child is Done, offer to mark the parent ready to close as well (parent comment template, same
   label).
7. **CLAUDE.md.** If the ticket changed conventions, architecture, or project status, remind the
   user (or offer) to update the repo's `.claude/CLAUDE.md`, per the org template.

## Finding ready-to-close tickets

If the user asks what's waiting on them, run:

```
labels = ready-to-close AND statusCategory != Done ORDER BY project, updated
```

Add `AND project = <KEY>` for one project.
