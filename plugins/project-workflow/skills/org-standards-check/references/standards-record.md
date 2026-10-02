# Standards record: `.github/org-standards.yml`

Each repo keeps one small file recording **when it was last checked** against the org standards
and **where it deliberately differs**. It is the repo's side of the contract; the standards
themselves always come from the live org `.github` repo.

## Format

```yaml
# Org standards record — maintained by the org-standards-check skill.
# Standards live in tkforgeworks/.github; this file only records this repo's check
# history and its intentional deviations.
last_checked:
  org_commit: 3f9c2e1d7a...        # full SHA of tkforgeworks/.github at the check
  date: 2026-10-02

deviations:
  - standard: ci-standards          # doc or workflow the deviation is against (file stem)
    item: lint is blocking          # the specific requirement, in a few words
    kind: stricter                  # add | stricter | parameter | opt-out | exception
    scope: [web/]                   # optional: paths/components it applies to; omit = whole repo
    reason: >
      Lint config is mature here, so lint failures gate merge instead of warning.
    since: 2026-10-02
```

`kind` values:

| kind | Meaning | Allowed? |
|---|---|---|
| `add` | Extra checks, jobs, or files on top of the standard | Yes |
| `stricter` | Same requirement, tighter setting (e.g. required reviews > 0) | Yes |
| `parameter` | A value the standard leaves to the repo (SDK version pin, ticket prefix, runner OS) | Yes |
| `opt-out` | The standard doesn't apply to this repo or component at all | Only if no component in `scope` is one the standard covers |
| `exception` | Uses an exception the standard's own doc defines (e.g. a licensing carve-out) | Only if the doc defines it; cite the doc section in `reason` |

## Validation rules

Check each recorded deviation against the **current** fetched standards on every run:

1. **Covered components keep the org standard.** If the repo (or the deviation's `scope`)
   contains a component an org standard covers — a Flutter app, a uv Python project, an
   Electron app — the org workflow/check for it must be in place. An `opt-out` or a
   replacement for that component is `INVALID DEVIATION`. Additional checks alongside it are
   fine (`add`).
2. **Licensing matches the org standard at all times.** Only `exception` deviations backed by
   the licensing doc are valid (a per-file/per-directory license statement for specific assets,
   third-party assets keeping their own license, or a repo the doc explicitly puts out of scope).
   The canonical `LICENSE` text is never a valid deviation target.
3. **Never-bypass rules stay.** Anything a doc states as mandatory with no exceptions (e.g. no
   bypass actors on the default-branch ruleset) can't be deviated from; only `stricter` or `add`
   applies.
4. **Re-validate when the standard changes.** If the org doc a deviation refers to changed since
   `last_checked.org_commit`, re-read it and confirm the deviation is still valid and still
   needed. Flag deviations that the new standard now makes unnecessary (the standard caught up)
   so they can be removed.
5. **Unknown references.** If `standard` no longer matches any doc or workflow in the org repo,
   report it as `DRIFT` — the standard was renamed or removed.

Missing file = no deviations and never checked; create it at the end of the first run.
