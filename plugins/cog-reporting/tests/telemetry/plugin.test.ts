import type { CommandRunInput } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const run = (args: string): CommandRunInput => ({
  command: 'cog-telemetry',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
})

test('collector records are written as JSONL without identity fields', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  mock.env(on, { HOME: '/home/me' })
  const writes: Record<string, string> = {}
  on('fs.write', async (_$, e) => {
    writes[e.path] = e.text
    return { value: undefined }
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('telemetry.log', async () => ({ value: undefined }))
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.id', async () => ({ value: 'sess-1' }))
  on('session.model', async () => ({ value: 'claude-opus-5-5' }))
  on('session.repo', async () => ({ value: null }))
  on('session.version', async () => ({ value: { version: '2.1.288', base: '2.1.288', builtAt: 'x' } }))

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  await $.telemetry.log({
    to: 'collector',
    event: 'tool_result',
    loggedAt: '2026-10-03T11:06:04.800Z',
    attributes: {
      'session.id': 'sess-1',
      'user.email': 'someone@example.com',
      tool_name: 'Read',
      success: 'true',
      duration_ms: '19',
    },
  })

  const flushed = await $.command.run(run('flush'))
  expect(flushed.text?.includes('/home/me/.claude/cog/events/sess-1/')).toBe(true)

  const files = Object.keys(writes)
  const eventFile = files.find(p => p.startsWith('/home/me/.claude/cog/events/sess-1/') && p.endsWith('.jsonl'))
  expect(eventFile).toBeDefined()
  const lines = (writes[eventFile ?? ''] ?? '').trim().split('\n').map(l => JSON.parse(l))
  expect(lines.map(l => l.kind)).toEqual(['session.start', 'tool.result'])
  expect(JSON.stringify(lines).includes('someone@example.com')).toBe(false)
  expect(files).toContain('/home/me/.claude/cog/sessions/sess-1.json')

  const summary = await $.command.run(run(''))
  expect(summary.text?.includes('Read')).toBe(true)
  expect(summary.text?.includes('surfaces: terminal')).toBe(true)

  const recent = await $.command.run(run('recent 5'))
  expect(recent.text?.includes('tool.result')).toBe(true)
})
