import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { CogEvent } from '../../types'
import {
  FORMAT_VERSION,
  applyEvent,
  emptyStats,
  fromOtel,
  renderEvent,
  renderSummary,
  stamp,
  toJsonl,
} from './format'

const stats = atom({ plugin: 'cog-reporting', key: 'telemetryStats' } as const, null)

const DESCRIPTION_CHARS = 120


// Telemetry module of cog-reporting. Module state: a hot reload starts it over, which only costs the unflushed queue.
const mod = {
  queue: [] as CogEvent[],
  session: '',
  root: '',
  seq: 0,
  timer: null as Timer | null,
  flushing: Promise.resolve() as Promise<void>,
}

async function now($: EngineInterface): Promise<string> {
  return new Date(await $.clock.now()).toISOString()
}

async function resolveRoot($: EngineInterface, configured: string): Promise<string> {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
  if (configured) return configured.replace(/^~(?=$|[\\/])/, home)
  const configDir = await $.env.get('CLAUDE_CONFIG_DIR')
  return `${configDir ?? `${home}/.claude`}/cog`
}

async function startSession($: EngineInterface, id: string): Promise<void> {
  if (id === mod.session) return
  mod.session = id
  const at = await now($)
  await update($, stats, prev => (prev && prev.session === id ? prev : emptyStats(id, at)))
}

async function emit($: EngineInterface, ev: CogEvent): Promise<void> {
  mod.queue.push(ev)
  if (ev.session === mod.session) await update($, stats, s => (s ? applyEvent(s, ev) : s))
}

async function hookEvent(
  $: EngineInterface,
  kind: string,
  fields: Record<string, unknown>,
  ids: { session?: string; prompt?: string; agent?: string } = {},
): Promise<void> {
  const ev: CogEvent = {
    v: FORMAT_VERSION,
    ts: await now($),
    kind,
    src: 'hook',
    session: ids.session ?? mod.session,
    ...(ids.prompt ? { prompt: ids.prompt } : {}),
    ...(ids.agent ? { agent: ids.agent } : {}),
  }
  for (const [k, x] of Object.entries(fields)) if (x !== undefined && x !== null) ev[k] = x
  await emit($, ev)
}

async function writeBatch($: EngineInterface): Promise<void> {
  if (mod.queue.length === 0 || !mod.root) return
  const batch = mod.queue
  mod.queue = []
  const at = await now($)
  const bySession = new Map<string, CogEvent[]>()
  for (const ev of batch) bySession.set(ev.session, [...(bySession.get(ev.session) ?? []), ev])
  let written = 0
  for (const [sid, events] of bySession) {
    mod.seq += 1
    const name = `${stamp(at)}-${String(mod.seq).padStart(4, '0')}.jsonl`
    await $.fs.write(`${mod.root}/events/${sid}/${name}`, toJsonl(events))
    written += 1
  }
  await update($, stats, s => (s ? { ...s, files: s.files + written, lastFlushAt: at } : s))
  const current = await read($, stats)
  if (current) {
    const { recent: _recent, ...summary } = current
    await $.fs.write(`${mod.root}/sessions/${current.session}.json`, JSON.stringify(summary, null, 2) + '\n')
  }
}

// Serialized so the timer and a turn's end never write the same batch twice.
function flush($: EngineInterface): Promise<void> {
  mod.flushing = mod.flushing
    .then(() => writeBatch($))
    .catch(() => {
      // A failed write drops that batch; the next flush starts clean.
    })
  return mod.flushing
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    mod.root = await resolveRoot($, typeof options.outputDir === 'string' ? options.outputDir.trim() : '')
    await startSession($, await $.session.id())
    await $.command.register({
      name: 'cog-telemetry',
      description: 'Show what COG telemetry has collected: summary | recent [n] | path | flush',
    })
    const [version, repo, model] = await Promise.all([$.session.version(), $.session.repo(), $.session.model()])
    await hookEvent($, 'session.start', {
      cwd: e.cwd,
      surface: e.surface ?? 'headless',
      interactive: e.isInteractive,
      cli_version: version.version,
      model,
      repo_name: repo?.name,
      repo_remote: repo?.remote,
    })
    const seconds = typeof options.flushSeconds === 'number' && options.flushSeconds > 0 ? options.flushSeconds : 5
    mod.timer?.cancel()
    mod.timer = $.clock.every(seconds * 1000, () => void flush($))
    return result
  })

  // The engine's own collector records: per-request cost and latency, per-tool
  // timing and decisions, subagent completion. Raised with no collector set up.
  on('telemetry.log', { to: 'collector' }, async ($, e, next) => {
    const result = await next(e)
    if (mod.session) await emit($, fromOtel(e.event, e.attributes, e.loggedAt, mod.session))
    return result
  })

  // The only place a /clear, resume or fork shows its new session id.
  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    await flush($)
    await startSession($, e.session_id)
    await hookEvent(
      $,
      'session.source',
      { source: e.source, model: e.model, seconds_since_last_response: e.seconds_since_last_response },
      { session: e.session_id },
    )
    return result
  })

  on('session.end', async ($, e, next) => {
    await hookEvent($, 'session.end', { reason: e.reason }, { session: e.sessionId })
    await flush($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await hookEvent(
      $,
      'turn',
      {
        turn_id: e.turnId,
        duration_ms: e.durationMs,
        reason: e.reason,
        aborted: e.isAborted,
        refusal_category: e.reason === 'refusal' ? e.refusal.category : undefined,
        model: e.usage?.model,
        input_tokens: e.usage?.input_tokens,
        output_tokens: e.usage?.output_tokens,
        cache_read_tokens: e.usage?.cache_read_input_tokens,
        cache_creation_tokens: e.usage?.cache_creation_input_tokens,
      },
      { agent: e.agentId },
    )
    if (!e.agentId) await flush($)
    return result
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if ('agentId' in result) {
      await hookEvent(
        $,
        'agent.spawn',
        {
          agent_type: e.subagentType,
          description: e.description.slice(0, DESCRIPTION_CHARS),
          model: result.model,
          parent_model: e.parentModel,
          parent_agent: e.parentAgentId,
          background: e.background,
          fork: e.fork,
          tool_use_id: e.tool_use_id,
        },
        { agent: result.agentId },
      )
    }
    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await hookEvent($, 'measure', {
      context_tokens: e.context.tokens,
      context_window: e.context.window,
      context_percent: e.context.percent,
      rate_limits: e.rateLimits.map(r => ({ kind: r.kind, percent_used: r.percentUsed, resets_at: r.resetsAt })),
      session_cost_usd: e.cost?.usd,
    })
    return result
  })

  on('classic.StopFailure', async ($, e, next) => {
    const result = await next(e)
    await hookEvent(
      $,
      'api.failure',
      { error: e.error, details: e.error_details?.slice(0, 300) },
      { session: e.session_id, prompt: e.prompt_id, agent: e.agent_id },
    )
    return result
  })

  on('command.run', { command: 'cog-telemetry' }, async ($, e) => {
    const [verb = 'summary', arg] = e.args.trim().split(/\s+/).filter(Boolean)
    if (verb === 'flush') {
      await flush($)
      return { text: `Flushed. Files are in ${mod.root}/events/${mod.session}/` }
    }
    if (verb === 'path') {
      return {
        text: [
          `events:   ${mod.root}/events/${mod.session}/   (one JSONL file per flush)`,
          `summary:  ${mod.root}/sessions/${mod.session}.json`,
          'Format: docs/telemetry-format.md in the cog-reporting plugin.',
        ].join('\n'),
      }
    }
    const s = await read($, stats)
    if (!s) return { text: 'Nothing collected yet in this session.' }
    if (verb === 'recent') {
      const n = Math.min(50, Math.max(1, Number(arg) || 15))
      const list = s.recent.slice(-n)
      return { text: list.length ? list.map(renderEvent).join('\n') : 'No events yet.' }
    }
    return { text: renderSummary(s, mod.root) }
  })
}
