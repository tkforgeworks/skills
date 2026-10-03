// Pure helpers: turning engine records into COG events, rolling them into the
// session summary, and rendering that summary as text. See docs/telemetry-format.md.
import type { CogEvent, SessionStats } from '../../types'

export const FORMAT_VERSION = 1
const RECENT_MAX = 50

// Collector event names → COG kinds. Anything else passes as `otel.<name>`.
const OTEL_KINDS: Record<string, string> = {
  api_request: 'api.request',
  api_error: 'api.error',
  tool_result: 'tool.result',
  tool_decision: 'tool.decision',
  user_prompt: 'prompt',
  assistant_response: 'response',
  subagent_completed: 'agent.completed',
}

// Never written: who the person is, and any content (prompt/response text).
const DROP_KEYS = new Set([
  'organization.id',
  'session.id',
  'prompt.id',
  'event.name',
  'event.timestamp',
  'terminal.type',
  'prompt',
  'prompt_text',
  'response',
])
const DROP_PATTERN = /^user\.|email|account/i

export function isDropped(key: string): boolean {
  return DROP_KEYS.has(key) || DROP_PATTERN.test(key)
}

/** `event.sequence` → `event_sequence`; numeric and boolean strings become values. */
export function cleanAttributes(attrs: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(attrs)) {
    if (isDropped(key) || raw === '<REDACTED>') continue
    let value = raw
    if (typeof raw === 'string') {
      if (raw === 'true' || raw === 'false') value = raw === 'true'
      else if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw)
    }
    out[key.replace(/\./g, '_')] = value
  }
  return out
}

export function fromOtel(
  event: string,
  attrs: Readonly<Record<string, unknown>>,
  loggedAt: string,
  fallbackSession: string,
): CogEvent {
  const session = typeof attrs['session.id'] === 'string' ? attrs['session.id'] : fallbackSession
  const prompt = typeof attrs['prompt.id'] === 'string' ? attrs['prompt.id'] : undefined
  const ts = typeof attrs['event.timestamp'] === 'string' ? attrs['event.timestamp'] : loggedAt
  const fields = cleanAttributes(attrs)
  return {
    v: FORMAT_VERSION,
    ts,
    kind: OTEL_KINDS[event] ?? `otel.${event}`,
    src: 'otel',
    session,
    ...(prompt ? { prompt } : {}),
    ...fields,
  }
}

export function emptyStats(session: string, startedAt: string): SessionStats {
  return {
    session,
    startedAt,
    surfaces: [],
    counts: {},
    requests: 0,
    costUsd: 0,
    apiMs: 0,
    ttftMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    cacheRead: 0,
    cacheWrite: 0,
    turns: 0,
    turnMs: 0,
    tools: {},
    agents: 0,
    failures: 0,
    lastMeasure: null,
    files: 0,
    events: 0,
    lastFlushAt: null,
    recent: [],
  }
}

const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0)

export function applyEvent(s: SessionStats, ev: CogEvent): SessionStats {
  const next: SessionStats = {
    ...s,
    counts: { ...s.counts, [ev.kind]: (s.counts[ev.kind] ?? 0) + 1 },
    events: s.events + 1,
    recent: [...s.recent, ev].slice(-RECENT_MAX),
  }
  switch (ev.kind) {
    case 'api.request':
      next.requests += 1
      next.costUsd += num(ev.cost_usd)
      next.apiMs += num(ev.duration_ms)
      next.ttftMs += num(ev.ttft_ms)
      next.tokensIn += num(ev.input_tokens)
      next.tokensOut += num(ev.output_tokens)
      next.cacheRead += num(ev.cache_read_tokens)
      next.cacheWrite += num(ev.cache_creation_tokens)
      break
    case 'tool.result': {
      const name = typeof ev.tool_name === 'string' ? ev.tool_name : 'unknown'
      const prev = s.tools[name] ?? { calls: 0, errors: 0, totalMs: 0 }
      next.tools = {
        ...s.tools,
        [name]: {
          calls: prev.calls + 1,
          errors: prev.errors + (ev.success === false ? 1 : 0),
          totalMs: prev.totalMs + num(ev.duration_ms),
        },
      }
      break
    }
    case 'turn':
      if (!ev.agent) {
        next.turns += 1
        next.turnMs += num(ev.duration_ms)
      }
      break
    case 'agent.completed':
      next.agents += 1
      break
    case 'api.error':
    case 'api.failure':
      next.failures += 1
      break
    case 'measure':
      next.lastMeasure = { ...ev }
      break
    case 'session.start':
      if (typeof ev.surface === 'string' && !s.surfaces.includes(ev.surface)) {
        next.surfaces = [...s.surfaces, ev.surface]
      }
      break
  }
  return next
}

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`
const avg = (total: number, n: number) => (n === 0 ? 0 : total / n)

export function renderSummary(s: SessionStats, root: string): string {
  const lines: string[] = []
  lines.push(`COG telemetry — session ${s.session}`)
  lines.push(`  since ${s.startedAt} · surfaces: ${s.surfaces.join(', ') || 'none recorded'}`)
  lines.push(`  ${s.events} events in ${s.files} files · last flush ${s.lastFlushAt ?? 'pending'}`)
  lines.push(`  output: ${root}/events/${s.session}/`)
  lines.push('')
  lines.push(
    `API: ${s.requests} requests · ${usd(s.costUsd)} · avg ${secs(avg(s.apiMs, s.requests))} (first token ${secs(avg(s.ttftMs, s.requests))})`,
  )
  lines.push(
    `  tokens in ${s.tokensIn} · out ${s.tokensOut} · cache read ${s.cacheRead} · cache write ${s.cacheWrite} · failures ${s.failures}`,
  )
  lines.push(`Turns: ${s.turns} · avg ${secs(avg(s.turnMs, s.turns))} · subagents completed ${s.agents}`)
  const tools = Object.entries(s.tools).sort((a, b) => b[1].calls - a[1].calls)
  if (tools.length > 0) {
    lines.push('Tools:')
    for (const [name, t] of tools.slice(0, 12)) {
      const err = t.errors > 0 ? ` · ${t.errors} failed` : ''
      lines.push(`  ${name.padEnd(24)} ${String(t.calls).padStart(4)} calls · avg ${secs(avg(t.totalMs, t.calls))}${err}`)
    }
  }
  const m = s.lastMeasure
  if (m) {
    const limits = Array.isArray(m.rate_limits)
      ? (m.rate_limits as { kind: string; percent_used: number }[]).map(r => `${r.kind} ${r.percent_used}%`).join(' · ')
      : ''
    lines.push(`Last measure: context ${m.context_percent ?? '?'}% of ${m.context_window ?? '?'}${limits ? ` · ${limits}` : ''}`)
  }
  const kinds = Object.entries(s.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k}×${n}`)
    .join(', ')
  lines.push(`Kinds: ${kinds || 'none yet'}`)
  return lines.join('\n')
}

export function renderEvent(ev: CogEvent): string {
  const { v: _v, ts, kind, src: _src, session: _s, prompt: _p, ...rest } = ev
  const fields = Object.entries(rest)
    .filter(([, x]) => x !== undefined && typeof x !== 'object')
    .slice(0, 8)
    .map(([k, x]) => `${k}=${String(x)}`)
    .join(' ')
  return `${ts.slice(11, 23)} ${kind.padEnd(16)} ${fields}`
}

export function toJsonl(events: CogEvent[]): string {
  return events.map(e => JSON.stringify(e)).join('\n') + '\n'
}

/** `2026-10-03T11:04:00.581Z` → `20261003T110400581Z`, sortable and path-safe. */
export function stamp(iso: string): string {
  return iso.replace(/[-:.]/g, '')
}
