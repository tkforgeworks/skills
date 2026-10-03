# cog-reporting: telemetry event format (v1)

The contract between the telemetry module of the `cog-reporting` plugin (writer) and COG (reader).

## Layout

```
<root>/                                   default ~/.claude/cog  ($CLAUDE_CONFIG_DIR/cog if set; plugin option outputDir overrides)
  events/<sessionId>/<stamp>-<seq>.jsonl  one file per flush, write-once, never modified
  sessions/<sessionId>.json               rolling human-readable summary, overwritten each flush
```

- `<stamp>` is the flush time in UTC with `-:.` removed (`20261003T110400581Z`), and `<seq>` is a 4-digit counter within the process. Sorting file names sorts them by time.
- `<sessionId>` matches the transcript filename in `~/.claude/projects/**/<sessionId>.jsonl` and COG's `code_sessions.session_id`.
- The plugin cannot rename files, so a file can't be written under a temporary name first. **Readers must skip files whose mtime is under 5 seconds old.** After that a file is complete and never changes. A reader can record each file it has processed and delete or archive it afterwards.
- Files are flushed every `flushSeconds` (default 5), at the end of each main turn, on `/clear`/resume, and at session end. A hot reload or crash can lose up to one flush interval of events.

## Line format

Each line is one JSON object. Every line starts with the same envelope:

| Field | Type | Meaning |
|---|---|---|
| `v` | `1` | Format version. Readers should skip lines with an unknown version. |
| `ts` | ISO 8601 string | When the event happened (the engine's own timestamp for `otel` events). |
| `kind` | string | What the event is (see below). |
| `src` | `"otel"` \| `"hook"` | `otel` = Claude Code's built-in telemetry record; `hook` = observed by the plugin. |
| `session` | string | Session id. |
| `prompt` | string? | Prompt id (one per user prompt); joins `otel` events of the same turn. |
| `agent` | string? | Subagent id when the event happened inside a subagent. |

The remaining fields depend on `kind`. In `otel` events, attribute names have dots replaced by underscores (`event.sequence` → `event_sequence`). Numeric and boolean strings are converted to real numbers and booleans.

**Never written:** `user.*`, anything containing `email` or `account`, `organization.id`, terminal type, and prompt or response text (only their lengths).

## Kinds

### From Claude Code telemetry (`src: "otel"`)

| kind | Key fields |
|---|---|
| `api.request` | `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `cost_usd`, `duration_ms`, `ttft_ms`, `request_id`, `effort`, `speed`, `query_source` (`main`, `away_summary`, subagent…), `event_sequence` |
| `api.error` | Error class, status, `duration_ms`, `model`, attempt (fields as the engine sends them) |
| `tool.result` | `tool_name`, `tool_use_id`, `success`, `duration_ms`, `tool_input_size_bytes`, `tool_result_size_bytes`, `decision_source`, `decision_type` |
| `tool.decision` | `tool_name`, `tool_use_id`, `decision` (`accept`/`reject`), `source` (`config`, `user_temporary`, `user_permanent`, `hook`…), `tool_source` (`builtin`/`mcp`) |
| `prompt` | `prompt_length`, `message_uuid` |
| `response` | `response_length`, `request_id`, `message_uuid`, `model`, `query_source` |
| `agent.completed` | `agent_type`, `agent_source`, `is_built_in`, `is_async`, `total_tokens`, `total_tool_uses`, `duration_ms`, `model`, `final_model`, `model_swapped` |
| `otel.<name>` | Any other telemetry record, passed through with the same cleaning |

### From plugin hooks (`src: "hook"`)

| kind | When | Fields |
|---|---|---|
| `session.start` | Plugin load in a session | `cwd`, `surface` (`terminal`, `desktop`, `vscode`, `mobile`, `headless`), `interactive`, `cli_version`, `model`, `repo_name`, `repo_remote` |
| `session.source` | Start, resume, `/clear`, compact, fork | `source`, `model`, `seconds_since_last_response` |
| `session.end` | Session ends | `reason` (`prompt_input_exit`, `clear`, `resume`, `logout`, `other`) |
| `turn` | A turn completes (main, or a subagent's with `agent`) | `turn_id`, `duration_ms` (wall time), `reason` (`answer`/`aborted`/`refusal`/`error`), `aborted`, `refusal_category`, `model`, the 4 token counts |
| `agent.spawn` | A subagent starts | `agent_type`, `description` (≤120 chars), `model`, `parent_model`, `parent_agent`, `background`, `fork`, `tool_use_id` |
| `measure` | After each main turn, and when a rate-limit window moves | `context_tokens`, `context_window`, `context_percent`, `rate_limits[{kind, percent_used, resets_at}]`, `session_cost_usd` (cumulative) |
| `api.failure` | A turn ends on an API error | `error` (`rate_limit`, `overloaded`, `billing_error`, `server_error`, `max_output_tokens`, …), `details` (≤300 chars) |

## Joins for COG

- `session` → `code_sessions.session_id`.
- `prompt` groups one user prompt's requests, tools and responses.
- `tool_use_id` joins `tool.decision` ↔ `tool.result` ↔ `agent.spawn`.
- `request_id` joins `api.request` ↔ `response`, and the transcript's `requestId`.
- `agent.spawn.agent` ↔ `turn.agent` gives subagent wall time.

## Example

```jsonl
{"v":1,"ts":"2026-10-03T11:06:04.799Z","kind":"tool.result","src":"otel","session":"5071…","prompt":"9ec6…","event_sequence":404,"tool_name":"Read","tool_use_id":"toolu_017p…","success":true,"duration_ms":19,"tool_input_size_bytes":73,"tool_result_size_bytes":1109,"decision_source":"config","decision_type":"accept"}
{"v":1,"ts":"2026-10-03T11:06:20.112Z","kind":"turn","src":"hook","session":"5071…","turn_id":"t_12","duration_ms":24150,"reason":"answer","aborted":false,"model":"claude-opus-5-5","input_tokens":312,"output_tokens":1840,"cache_read_tokens":151022,"cache_creation_tokens":2204}
```
