---
name: org-standards-check
description: >
  Audits a repository against the tkforgeworks org standards (CI/CD reusable workflows, branch
  protection rulesets, branching model, licensing — LICENSE, NOTICE, README and manifest license
  fields — community/template files, and anything else the org .github repo defines) and brings it
  into line. Always reads the current standards live from the tkforgeworks/.github repo rather than
  from memory or any CLAUDE.md. Use when setting up a new repo, or periodically re-checking an
  existing one. Trigger on phrases like "let's make sure this repo is following org standards",
  "let's check this repo setup", "is this repo up to org standard", "audit this repo", "set this
  repo up like the others", "bootstrap this repo", or "have the org standards changed for this repo".
---

# Org Standards Check

Compare a repo against the **current** tkforgeworks org standards, report every gap, and fix
them with the user's approval. Works the same for a brand-new repo (setup) and an existing one
(periodic re-check); the difference is only how much is missing.

## Ground rules

1. **The org `.github` repo is the only source of truth for what the standards are.** Fetch it
   fresh on every run. Do not use remembered details, this skill's text, the target repo's own
   `CLAUDE.md`, or memory files as a statement of the standard — they are point-in-time copies
   and drift. If any of those disagree with the fetched docs, the docs win and the disagreement
   is itself a finding.
2. **Follow the docs' own procedures.** The org docs contain adoption runbooks, exact commands,
   prerequisites and ordering constraints (e.g. a required status check only after CI has
   reported on a PR). Use them as written; don't improvise a different mechanism.
3. **Never weaken.** Don't loosen a check, drop a step, edit verbatim license text, or add
   bypass actors to make the repo "pass". If something can't be met, report it.
4. **Repo files change on a branch; GitHub settings change only with explicit approval.**
   Rulesets, repo settings, and variables are outward-facing — show the exact command and get a
   yes for each before running it.

## Step 1 — Identify the target repo

- From `git remote get-url origin`, get `owner/repo`. If the owner isn't `tkforgeworks`, say so
  and ask whether to proceed.
- `gh repo view <owner>/<repo> --json visibility,defaultBranchRef,isEmpty,licenseInfo` — some
  standards are scoped by visibility or plan (the docs say which).
- `git fetch --prune` first, so the check runs against current refs, not a stale local clone.
- Decide which branch to check. Use the one the branching doc says work accumulates on (e.g. an
  active release branch), falling back to the default branch. If the local checkout is behind or
  on a different branch, check the remote-tracking ref, and say which ref you checked.
- Note open PRs that already address a finding (`gh pr list`), so the report says "PR open"
  instead of proposing duplicate work.

## Step 2 — Fetch the standards fresh

```bash
bash <this skill's directory>/scripts/fetch-org-standards.sh   # org defaults to tkforgeworks
```

Requires an authenticated `gh` CLI. If it's missing or unauthenticated, stop and say so; don't
fall back to remembered standards.

It prints `path=`, `sha=` and `date=`. Record the SHA — the report cites it, and it's written to
the repo's standards record (Step 7).

Then build the list of standards **from the fetched repo itself**:

1. Read the root `README.md` — its standards catalog section is the index. Read every doc it
   links to in full.
2. Also list `docs/`, `templates/`, `.github/workflows/`, and `scripts/`, and read anything not
   covered by the catalog. A standard added to the repo but not yet catalogued still counts;
   mention the missing catalog entry in the report.
3. Skip items the docs mark as parked, proposed, or not started.
4. If the repo has a standards record (`.github/org-standards.yml`, see
   `references/standards-record.md`) with a `last_checked.org_commit`, run
   `git -C <path> log --oneline <that-sha>..HEAD` and list what changed in the org standards
   since the last check. That list goes at the top of the report.

## Step 3 — Inventory the repo

Scan the **whole tree**, not just the root — a repo can contain several components (e.g. a
Flutter app in `app/` plus a Python service in `server/`). For each component, record its
toolchain from its markers (`pubspec.yaml`, `package.json` and its dependencies, `pyproject.toml`
+ `uv.lock`, etc.) and match it to the standard the docs say covers it.

Then collect whatever the fetched standards need checking, typically:
- `.github/workflows/*` — which org reusable workflows are called, with which `@ref` and inputs,
  and what triggers/concurrency the caller declares.
- Rulesets: `gh api repos/<owner>/<repo>/rulesets` (then each by id) and
  `gh api repos/<owner>/<repo>/rules/branches/<default-branch>`.
- License files: `LICENSE`, `NOTICE`, the README license section, and manifest license fields.
  Compare `LICENSE` **byte-for-byte** against the fetched canonical file (`cmp`), not by eye.
- Template files the docs say must be copied into each repo, and whether placeholders were
  filled in.
- Branch names against the branching model.
- The repo's standards record, if present.

## Step 4 — Decide what applies

Build an applicability table: every standard → applies / doesn't apply, and **why** (the doc's
own scoping, the components found, visibility, or a recorded deviation). Then apply recorded
deviations using the rules in `references/standards-record.md`. In short:

- A repo may **add** to a standard, be **stricter**, pick values the standard leaves open
  (inputs, versions), or opt out of a standard that doesn't fit it.
- A repo may **not** weaken, replace, or skip an org standard for a component that standard
  covers. A hand-rolled Flutter CI in a repo containing a Flutter app is non-compliant even if a
  deviation says otherwise; extra checks alongside the org workflow are fine.
- Licensing deviations are valid only when they use an exception the licensing doc itself
  provides. Everything else must match the org standard.

## Step 5 — Report

Present the report before changing anything:

```
## Org standards check — <owner>/<repo>
Standards: tkforgeworks/.github @ <short-sha> (<date>)    Last checked: <sha/date or "never">

### What changed in the org standards since the last check
(only if there was a previous check)

### Findings
| Status | Standard | Item | Detail / fix |
```

Status values: `OK`, `MISSING`, `DRIFT` (present but out of date or different from the current
standard), `DEVIATION` (recorded and allowed — show the reason), `INVALID DEVIATION` (recorded
but not allowed — say why), `N/A` (with the reason). Order: MISSING / INVALID DEVIATION first,
then DRIFT, then the rest. Reference the doc section for every non-OK row.

End with the proposed changes in the order the docs require, split into:
- **Repo changes** (files): made on a branch, committed, PR opened.
- **GitHub settings** (rulesets, variables): each listed with its exact command.
- **Needs a decision**: anything ambiguous, or a standard that can't be met as written.

## Step 6 — Fix (with approval)

- Ask which proposed changes to make. Default to all repo-file changes; ask separately for each
  settings change.
- Make file changes on a branch named per the branching doc, and open the PR against the base
  the doc specifies (e.g. the current release branch, not `main`). Copy templates and the
  canonical `LICENSE` from the fetched repo, never retyped.
- Respect ordering prerequisites (e.g. don't add a required check until it has reported on a PR;
  read the real check name from the run instead of guessing).
- After each settings change, run the verification step the doc gives.

## Step 7 — Record the check

Create or update `.github/org-standards.yml` (format: `references/standards-record.md`) in the
same PR: set `last_checked` to the org commit SHA and today's date, and add or update a
deviation entry for anything the user chose to keep different on purpose, including the reason.
This file records the **result** of the check, not the standards — it's never read as a
substitute for Step 2.
