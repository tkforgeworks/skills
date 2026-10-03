/** One line of a telemetry event file; see docs/telemetry-format.md. */
export type CogEvent = {
  v: 1
  ts: string
  kind: string
  src: 'otel' | 'hook'
  session: string
  prompt?: string
  agent?: string
  [field: string]: unknown
}

export type ToolStats = { calls: number; errors: number; totalMs: number }

export type SessionStats = {
  session: string
  startedAt: string
  surfaces: string[]
  counts: Record<string, number>
  requests: number
  costUsd: number
  apiMs: number
  ttftMs: number
  tokensIn: number
  tokensOut: number
  cacheRead: number
  cacheWrite: number
  turns: number
  turnMs: number
  tools: Record<string, ToolStats>
  agents: number
  failures: number
  lastMeasure: Record<string, unknown> | null
  files: number
  events: number
  lastFlushAt: string | null
  recent: CogEvent[]
}

declare module 'claude-code' {
  interface PluginState {
    'cog-reporting': { telemetryStats: SessionStats | null }
  }
}
