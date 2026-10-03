# cog-reporting

Claude Code plugin that feeds [COG (Claude Observability GUI)](https://github.com/tkforgeworks/claude-observability-gui) with data it can't get from the transcript files on disk. It only works in Claude Code (terminal and the desktop app's Code tab), not in Chat or Cowork.

## Modules

| Module | Hooks module | Command | Writes | Format |
|---|---|---|---|---|
| Telemetry | `hooks/telemetry/register.ts` | `/cog-telemetry [summary\|recent [n]\|path\|flush]` | `<root>/events/<session>/*.jsonl`, `<root>/sessions/<session>.json` | [docs/telemetry-format.md](docs/telemetry-format.md) |

COG-side integration plan and the plugin finalization checklist: [docs/cog-roadmap.md](docs/cog-roadmap.md).

`<root>` defaults to `~/.claude/cog` (or `$CLAUDE_CONFIG_DIR/cog`). Set the `outputDir` option in `/config` to change it.

## Adding a module

- Add the code under `hooks/<module>/register.ts` and list it in `hooks/hooks.json` under `"modules"`.
- Name its slash command `cog-<module>`.
- Write under `<root>/<module-specific dir>/`.
- Declare its `$.state` values in `types/index.d.ts` under `'cog-reporting'`, prefixed with the module name.
- Document the file format in `docs/<module>-format.md`.
- Add tests under `tests/<module>/`.
- Never write identity fields or prompt/response content.
