# COG integration roadmap

How `cog-reporting` data makes its way into COG ([tkforgeworks/claude-observability-gui](https://github.com/tkforgeworks/claude-observability-gui)). Work happens in stages. **No COG work starts until Stage 0 is checked off.**

Planned 2026-10-03. Related Jira: [CGUI-141](https://tkforgeworks.atlassian.net/browse/CGUI-141) (Desktop chat capture, a separate track and out of scope here).

## Stage 0: Finalize the plugin (gate for everything below)

Run the telemetry module in normal daily use and confirm it is complete, correct and stable.

- [ ] Installed from the marketplace (not the dev-mods hot-reload copy) and loading as `cog-reporting`
- [ ] At least 1 week of normal use with no hook failures (no `cog-reporting: … refused` / skipped-hook lines in the transcript or `claude --debug` log)
- [ ] Verified on each surface: terminal, desktop app Code tab, and headless `claude -p`
- [ ] Event coverage checked against `docs/telemetry-format.md`. Each kind appeared at least once, or a note explains why it can't:
  - [ ] `api.request`, `response`, `prompt`, `tool.result`, `tool.decision`
  - [ ] `turn` (main and subagent), `agent.spawn` ↔ `agent.completed` pairing
  - [ ] `measure` with rate limits populated
  - [ ] `session.start`, `session.source` (startup, `/clear`, resume), `session.end`
  - [ ] `api.error` / `api.failure` (when a real error happens)
  - [ ] Any `otel.*` passthrough kinds, listed and assessed
- [ ] Privacy check: grep of `~/.claude/cog/` finds no email, account or organization IDs, and no prompt or response text
- [ ] Volume check: events and bytes per active day recorded here, and acceptable
- [ ] Loss check: hot reload or crash loses at most one flush interval; confirmed acceptable
- [ ] `/cog-telemetry` output reviewed and useful (summary, `recent`, `path`, `flush`)
- [ ] Format v1 frozen. Any later change bumps `v` and documents a migration
- [ ] Plugin version bumped to `1.0.0` with the findings above noted in this file

**Decision after Stage 0:** is the data worth the COG work, and which fields deserve typed columns?

## Stage 1: Low-commitment ingestion

- [ ] `SidecarWatcher` service in COG, modelled on `UsageLimitWatcher`:
  - reads `~/.claude/cog/events/**`
  - skips files under 5 s old
  - tracks processed files (and optionally archives or deletes them)
- [ ] One raw table: `code_events(session_id, ts, kind, src, prompt_id, agent_id, payload_json)`, joined to `code_sessions`
- [ ] At most a raw event list on the session detail view. Easy to back out.

## Stage 2: Typed tables and views

- [ ] Typed tables built from the raw events: `code_requests`, `code_tool_calls`, `code_turns`, `code_agents`
- [ ] Views:
  - [ ] tools breakdown (calls, failures, latency)
  - [ ] session drill-down timeline
  - [ ] latency and time-to-first-token trends
  - [ ] error and rate-limit log
  - [ ] context fill over time
- [ ] Fix existing misattributions:
  - [ ] per-request model pricing instead of the session's first model
  - [ ] subagents broken out instead of merged into the parent

## Stage 3: Replace and harden

- [ ] `measure` events as a first-party rate-limit source alongside or instead of cship (overlaps CGUI-92)
- [ ] Cross-check COG's pricing table against `api.request.cost_usd` (relevant to CGUI-137, CGUI-109)
- [ ] Retention and archiving of processed event files

## Open questions to settle before Stage 1

- Which COG branch to build on, given 2.0.0 is at RC and refactor epics CGUI-105 to CGUI-108 are queued.
- Whether Stage 1 lands before or after the typed-IPC refactor (CGUI-121), since it adds IPC channels.
- Whether this becomes a CGUI epic with Stages 1 to 3 as stories.
