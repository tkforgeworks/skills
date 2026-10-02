# Jira comment templates

Markdown, posted with `contentFormat: "markdown"`. Keep bullets to what a reviewer needs: what
changed, how it was verified, and anything that differs from the ticket. Use short commit hashes
in backticks and link PRs.

## Stage A — PR open

```markdown
**Actions taken** — commit `<sha>` on `<topic-branch>`, PR [#<n>](<pr-url>) into `<release-branch>`.

* <what changed, user-visible terms first>
* <what changed>
* <how it was verified: tests added/passing, device/emulator checks, manual steps>

**Deviation from the acceptance criteria:** <criterion> — <what was done instead and why>.

Leaving the ticket open for you to verify.
```

Leave out the deviation paragraph only when every acceptance criterion was met as written.
With several commits, list them as `<sha>`, `<sha>` or say "commits on `<branch>`" and let the
PR carry the detail.

## Stage B — ready to close

```markdown
**Actions taken**

* Commit `<sha>` "<KEY>-N: <subject>", PR #<n>, merged into `<release-branch>` as `<merge-sha>`.
* Shipped in `<vX.Y.Z-rc.N>` (<where: GitHub prerelease, Play internal track>, run <run-id>).
* <follow-ups still open, if any — e.g. "Follow-up: org PR #14 (open) switches `track` to `tracks`.">

**Ready to close** after <the concrete verification step>.
```

If something is still pending: `**Ready to close** once <pending item> and <verification step>.`
If the repo has no release pipeline, drop the "Shipped in" line.

## Parent ticket (epic or story) — ready to close

```markdown
**Ready to close:** every child task (<KEY>-a through <KEY>-b) is Done, and <the feature> has shipped in <release/RC range>.
```
