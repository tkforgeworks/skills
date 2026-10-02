# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This repo is the single source of truth for the organization's Claude skills. It is a **Claude Code plugin marketplace**: any fresh Claude Code installation can add this repo once and install whichever plugins it needs. Over time it should hold shared standards skills (code consistency, design consistency, review checklists, etc.) so those conventions come from one place instead of being re-created per project.

## Layout

```
.claude-plugin/marketplace.json     # marketplace manifest: lists every plugin in the repo
plugins/<plugin-name>/
  .claude-plugin/plugin.json        # plugin manifest (name, description, version, author)
  skills/<skill-name>/SKILL.md      # one directory per skill; SKILL.md has YAML frontmatter
  skills/<skill-name>/...           # optional references/, scripts/, assets/ loaded on demand
  commands/, agents/, hooks/        # optional, only if the plugin needs them
  evals/                            # optional eval cases for `claude plugin eval`
```

- A **plugin** is the unit of installation and versioning; group related skills into one plugin by domain (e.g. `code-standards`, `design-standards`, `interview-prep`) rather than one plugin per skill.
- Every plugin under `plugins/` must have a matching entry in `.claude-plugin/marketplace.json` (`"source": "./plugins/<plugin-name>"`), or it won't be installable.
- The `name` in `plugin.json`, the marketplace entry, and the directory name must agree.
- Skill names must not collide with Claude Code built-ins (e.g. `code-review`, `simplify`, `security-review`); prefer specific names like `java-review`.
- `SKILL.md` frontmatter needs `name` and `description`. The `description` is what decides whether the skill triggers, so state concretely *when* to use it (trigger phrases, file types, task shapes). Keep the body focused; move long reference material into sibling files that the skill tells Claude to read when needed.
- Personal skills (tied to one person's accounts, watchlists, home setup, etc.) stay out of this repo. Skills here must not hard-code personal details (emails, local paths, private account IDs). Put per-user or per-org values in plugin options or clearly marked config sections.

## Commands

```bash
# Validate the marketplace manifest and everything it references
claude plugin validate .

# Validate a single plugin
claude plugin validate plugins/<plugin-name>

# Show an installed plugin's components and projected token cost
claude plugin details <plugin-name>@tkforgeworks

# Run a plugin's eval suite (evals/ dir) — the closest thing to "run a single test"
claude plugin eval plugins/<plugin-name>

# Tag a release ({name}--v{version}); checks plugin.json and marketplace entry agree
claude plugin tag plugins/<plugin-name>
```

Test local changes before pushing by adding the working copy as a marketplace:

```bash
claude plugin marketplace add /path/to/this/repo
claude plugin install <plugin-name>@tkforgeworks   # "tkforgeworks" = name in marketplace.json
claude plugin marketplace update tkforgeworks      # pick up later edits
```

## Installing on a fresh Claude Code installation

```bash
claude plugin marketplace add <git-url-or-owner/repo>
claude plugin install <plugin-name>@tkforgeworks
```

Consumers get changes with `claude plugin marketplace update` followed by `claude plugin update <plugin-name>`.

## Change workflow

- Bump `version` in the plugin's `plugin.json` when changing a plugin, since installed copies update by version. Keep the marketplace entry consistent with it, and run `claude plugin validate .` before committing.
- When adding a plugin: create `plugins/<name>/` with its manifest and skills, register it in `marketplace.json`, then validate.
