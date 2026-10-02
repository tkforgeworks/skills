---
name: jira-issue-writer
description: >
  Creates well-structured Jira issues with a consistent description format, appropriate priority,
  and version impact analysis. Use this skill whenever the user asks to create a Jira ticket, issue,
  epic, story, task, sub-task, or bug report — or when they say things like "make a ticket for",
  "file an issue", "create a Jira for", "write up a ticket", "log a bug", "add this to Jira",
  or any variation of creating work items in Jira. Also trigger when the user asks to batch-create
  multiple tickets, break down an epic into tasks, or plan a set of issues for a project.
  This skill handles the full flow: discussing the plan with the user, drafting the issue content,
  and then creating it in Jira via the Atlassian MCP tools.
---

# Jira Issue Writer

This skill creates consistently structured, well-prioritized Jira issues. Every issue follows a
standard description template so that anyone reading the ticket — now or months later — immediately
understands what the work is, why it matters, what "done" looks like, and how it affects versioning.

## Workflow

### 1. Discuss before creating

Before creating any Jira issue, always present the plan to the user first. This means:

- Summarize what you intend to create (issue type, project, summary line, priority, key details)
- If creating multiple issues, outline all of them as a batch so the user can review the full picture
- Wait for the user's approval or adjustments before calling any Jira creation tools

This discussion-first approach prevents wasted tickets and lets the user course-correct early.
Think of it like a code review before merge — the user is the reviewer.

### 2. Draft the description

Every issue description follows the template in the **Description Template** section below.
Write the description in Markdown format (Jira Cloud renders this natively).

### 3. Set the priority

Always set a priority on every issue. Never leave it as the Jira default. Use this as a starting
heuristic and set it without asking the user — they can adjust later during review:

| Issue Type | Default Priority | Reasoning |
|---|---|---|
| Bug (production, user-facing) | High | Active user impact demands fast attention |
| Bug (non-production, cosmetic, minor) | Medium | Should be fixed but not blocking anyone |
| Epic | Medium | Epics are planning containers, not urgent by themselves |
| Story / Task (feature work) | Medium | Standard development cadence |
| Story / Task (blocking other work) | High | Dependency chains need to move |
| Infrastructure / DevOps | Medium | Important but rarely on fire |
| Tech debt / Refactor | Low | Valuable but deferrable |

If context from the user clearly suggests a different priority, override the heuristic. For example,
if the user says "this is critical" or "users are complaining", escalate. If they say "whenever we
get to it", lower it. Use judgment — the table is a starting point, not a rulebook.

### 4. Create in Jira

Once the user approves, create the issue(s) using the Atlassian MCP tools:
- Use `createJiraIssue` with `contentFormat: "markdown"` for the description
- Set the priority field in `additional_fields`
- If the user specified a parent epic, set the `parent` field

---

## Description Template

Every issue description must include these sections in this order. Use Markdown headers (`##`)
for each section.

```markdown
## Overview
[1-2 sentences maximum. This is the "TL;DR" — what is this issue about and why does it exist?
A reader should be able to decide if this ticket is relevant to them from this section alone.]

## Goals
[What this ticket is meant to achieve. The format depends on the issue type:

- **Epics**: A list of high-level goals that will be decomposed into child issues. These goals
  define the scope boundary of the epic.
- **Stories / Tasks**: Either a concise list of goals for this slice of work, OR a single
  user story in the format: "As a [role], I [action] so that [outcome]." Tasks may only have
  one user story. Epics may have multiple.
- **Bugs**: What was reported (the actual behavior) and what should happen instead (expected
  behavior). Be specific — include steps to reproduce if known.]

## Acceptance Criteria
[A checklist of concrete, verifiable conditions that must all be true before this ticket can
be closed. Write these as "done when..." statements. Be specific enough that someone else
could verify them without asking you questions.

- [ ] Criterion one
- [ ] Criterion two
- [ ] ...]

## Version Impact
[State the expected semantic version impact of this work:

- **Major** (x.0.0): Breaking changes, large epics introducing new system capabilities
- **Minor** (0.x.0): New features, non-breaking enhancements
- **Patch** (0.0.x): Bug fixes, hotfixes, small corrections

If the user provided a specific version target, use that instead. Otherwise, follow these
defaults: epics → major, feature stories/tasks → minor, bugs → patch.

Format as a single line, e.g.: `Version impact: MINOR (0.x.0) — adds new endpoint for recipe search`]

## Additional Context
[OPTIONAL — include only when the issue is complex enough to warrant it, or when there is
background information that would help someone picking up this ticket. Examples: links to
design docs, screenshots, related discussions, architectural constraints, performance
considerations. Omit this section entirely if there is nothing meaningful to add.]

## Requirement References
[OPTIONAL — include only when the project has a known requirements document, spec, or
backlog item list. Reference the specific requirement IDs or names covered by this ticket.
Omit this section entirely if no formal requirements exist or none are relevant.]

## Changelog
[A single line summarizing what a user or stakeholder would see in a release changelog.
Write this from the perspective of someone reading release notes — focus on the "what changed"
not the technical implementation.

For base issues: exactly one line.
For epics: up to two lines providing a high-level summary, but no more.

Example (task): "Added ingredient substitution suggestions to recipe detail page."
Example (epic): "Introduced social features: users can now follow authors, like recipes, and
share collections. Activity feeds show updates from followed users."]
```

---

## Task Scoping Guidelines

When creating implementation issues (stories, tasks, sub-tasks), consider whether the work
fits into roughly **8 hours of focused effort** — about one solid working session. This is a
guideline for keeping tickets independently shippable, not a hard rule.

If a task looks like it will exceed this:
- **Break it up** into smaller tickets, each delivering a coherent, working increment
- Each ticket's work should result in a commit that does not break functionality
- It is fine to create a ticket for a skeleton/stub implementation that compiles and passes
  tests, then a follow-up ticket to flesh out the full behavior
- It is **not** fine to split a ticket such that one half leaves the codebase in a broken or
  half-working state

Do not over-decompose. If splitting a task would create artificial boundaries that make the work
harder to reason about or would produce commits that don't make sense on their own, keep it as
one ticket and accept the larger scope. The goal is clean, independently shippable increments —
not a specific hour count.

When in doubt, prefer fewer, slightly larger tickets over many tiny ones. Excessive decomposition
creates overhead and obscures the actual work being done.

---

## Examples

### Example 1: Feature task

**User says:** "Create a ticket for adding pagination to the recipe search endpoint"

**Discussion output:**
> I'll create a Story in [project] with Medium priority. Here's the plan:
>
> **Summary:** Add pagination to recipe search endpoint
> **Priority:** Medium
> **Description:**
>
> ## Overview
> Add cursor-based pagination to the GET /recipes/search endpoint to prevent full-table scans
> and improve response times for large result sets.
>
> ## Goals
> As a user, I can paginate through search results so that the app remains responsive regardless
> of how many recipes match my query.
>
> ## Acceptance Criteria
> - [ ] GET /recipes/search accepts `page` and `size` query parameters
> - [ ] Default page size is 20, maximum is 100
> - [ ] Response includes total count and pagination metadata
> - [ ] Existing clients without pagination params get page 1 by default (backwards compatible)
> - [ ] Gatling simulation updated to test paginated endpoint
>
> ## Version Impact
> Version impact: MINOR (0.x.0) — adds pagination support to recipe search
>
> ## Changelog
> Recipe search results are now paginated, improving performance for large result sets.

### Example 2: Bug report

**User says:** "Log a bug — the recipe image upload silently fails for PNGs over 5MB"

**Discussion output:**
> I'll create a Bug in [project] with High priority (user-facing data loss). Here's the plan:
>
> **Summary:** Recipe image upload silently fails for PNGs over 5MB
> **Priority:** High
> **Description:**
>
> ## Overview
> Uploading a PNG image larger than 5MB to a recipe silently fails — no error is shown to the
> user, and the image is not saved.
>
> ## Goals
> **Reported behavior:** Uploading a PNG > 5MB appears to succeed (no error message) but the
> image does not appear on the recipe.
> **Expected behavior:** Either the upload succeeds, or the user receives a clear error message
> explaining the file size limit and what to do about it.
>
> ## Acceptance Criteria
> - [ ] Images over 5MB either upload successfully or display a clear error to the user
> - [ ] Error message specifies the size limit and suggests resizing
> - [ ] Upload progress indicator reflects actual upload state
> - [ ] Verified with PNG, JPEG, and WebP formats at boundary sizes
>
> ## Version Impact
> Version impact: PATCH (0.0.x) — fixes silent failure on large image uploads
>
> ## Changelog
> Fixed an issue where uploading large images to a recipe would silently fail without an error message.
