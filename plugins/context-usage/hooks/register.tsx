import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Segment, Snapshot } from '../types'

const snapshot = atom({ plugin: 'context-usage', key: 'snapshot' } as const, null)
const isEnabled = atom({ plugin: 'context-usage', key: 'isEnabled' } as const, true)

const STORE_KEY = 'isEnabled'
const PALETTE = ['#d97757', '#6a9bcc', '#788c5d', '#c4a35a', '#9b7bc4', '#4fa3a5', '#c46a8a', '#8a8f98']
const BUFFER_COLOR = '#5c5c5c'
const FREE_COLOR = '#3a3a3a'
const LABEL = 'Context '
const BAR_SHARE = 0.7

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

// Largest-remainder split of `width` cells across segments, giving every
// non-empty segment at least one cell when there is room for it.
export function allocate(tokens: number[], width: number): number[] {
  const total = tokens.reduce((a, b) => a + b, 0)
  if (total <= 0 || width <= 0) return tokens.map(() => 0)
  const exact = tokens.map(t => (t / total) * width)
  const cells = exact.map(Math.floor)
  let left = width - cells.reduce((a, b) => a + b, 0)
  const order = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x) }))
    .sort((a, b) => b.rem - a.rem)
  for (const { i } of order) {
    if (left <= 0) break
    cells[i] = (cells[i] ?? 0) + 1
    left -= 1
  }
  // Steal from the widest segment so tiny non-zero ones stay visible.
  tokens.forEach((t, i) => {
    if (t <= 0 || cells[i] !== 0) return
    const widest = cells.indexOf(Math.max(...cells))
    if ((cells[widest] ?? 0) > 1) {
      cells[widest] = (cells[widest] ?? 0) - 1
      cells[i] = 1
    }
  })
  return cells
}

async function refresh($: EngineInterface): Promise<void> {
  if (!(await read($, isEnabled))) return
  try {
    const usage = await $.session.usage({ breakdown: 'summary' })
    const b = usage.context.breakdown
    if (!b) return
    const segments: Segment[] = b.categories
      .filter(c => c.kind !== 'deferred' && c.tokens > 0)
      .map(c => ({ name: c.name, tokens: c.tokens, kind: c.kind as Segment['kind'] }))
    const next: Snapshot = {
      segments,
      usedTokens: b.totalTokens,
      maxTokens: b.rawMaxTokens,
      percent: b.percentage,
    }
    await update($, snapshot, () => next)
  } catch {
    // No session bound yet (or a host without breakdowns): keep the last bar.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'context-usage',
      description: 'Toggle the context usage bar above the prompt (on | off)',
    })
    const stored = await $.store.get(STORE_KEY)
    if (typeof stored === 'boolean') await update($, isEnabled, () => stored)
    const result = await next(e)
    void refresh($)
    return result
  })

  on('command.run', { command: 'context-usage' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const current = await read($, isEnabled)
    const wanted = arg === 'on' ? true : arg === 'off' ? false : !current
    await update($, isEnabled, () => wanted)
    await $.store.set(STORE_KEY, wanted)
    if (wanted) await refresh($)
    return { text: `Context usage bar ${wanted ? 'enabled' : 'disabled'}.` }
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isEnabled))) return next(e)
    const snap = await read($, snapshot)
    if (!snap || snap.segments.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const summary = ` ${snap.percent}% · ${formatTokens(snap.usedTokens)}/${formatTokens(snap.maxTokens)}`
    // Border (2) + padding (2) take 4 columns; the bar gets at most 70% of the rest.
    const inner = e.props.bodyColumns - 4
    const width = Math.max(10, Math.floor(inner * BAR_SHARE) - LABEL.length)
    const cells = allocate(snap.segments.map(s => s.tokens), width)

    let used = 0
    const colors = snap.segments.map(s => {
      if (s.kind === 'free') return FREE_COLOR
      if (s.kind === 'buffer') return BUFFER_COLOR
      return PALETTE[used++ % PALETTE.length]
    })
    const glyph = (s: Segment) => (s.kind === 'free' ? '░' : s.kind === 'buffer' ? '▒' : '█')

    return (
      <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
        <Box>
          <Text dimColor>{LABEL}</Text>
          {snap.segments.map((s, i) => (
            <Text color={colors[i]}>{glyph(s).repeat(cells[i] ?? 0)}</Text>
          ))}
          <Text bold wrap="truncate-end">{summary}</Text>
        </Box>
        <Text wrap="wrap">
          {snap.segments.map((s, i) => (
            <Text>
              <Text color={colors[i]}>▪</Text>
              <Text dimColor italic>{`${s.name} ${formatTokens(s.tokens)}   `}</Text>
            </Text>
          ))}
        </Text>
      </Box>
    )
  })
}
