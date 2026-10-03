import { expect, test } from 'claude-code/testing'

import { applyEvent, cleanAttributes, emptyStats, fromOtel, renderSummary, stamp } from '../../hooks/telemetry/format'

const API_REQUEST = {
  'user.id': 'hash',
  'user.email': 'someone@example.com',
  'user.account_uuid': 'uuid',
  'organization.id': 'org',
  'session.id': 'sess-1',
  'prompt.id': 'prompt-1',
  'terminal.type': 'kitty',
  'event.name': 'api_request',
  'event.timestamp': '2026-10-03T11:04:00.566Z',
  'event.sequence': 400,
  model: 'claude-opus-5-5',
  input_tokens: 96,
  output_tokens: 155,
  cache_read_tokens: 143281,
  cache_creation_tokens: 539,
  cost_usd: 0.0364,
  duration_ms: 2957,
  ttft_ms: 1065,
}

const TOOL_RESULT = {
  'session.id': 'sess-1',
  'event.timestamp': '2026-10-03T11:06:04.799Z',
  tool_name: 'Bash',
  success: 'false',
  duration_ms: '19',
  prompt: '<REDACTED>',
}

test('identity and content never reach an event', async () => {
  const ev = fromOtel('api_request', API_REQUEST, 'fallback-ts', 'fallback-session')
  const text = JSON.stringify(ev)
  for (const secret of ['someone@example.com', 'uuid', '"org"', 'hash', 'kitty']) {
    expect(text.includes(secret)).toBe(false)
  }
  expect(ev).toMatchObject({
    v: 1,
    kind: 'api.request',
    src: 'otel',
    session: 'sess-1',
    prompt: 'prompt-1',
    ts: '2026-10-03T11:04:00.566Z',
    event_sequence: 400,
    cost_usd: 0.0364,
  })
})

test('string numbers and booleans become values; redacted text is dropped', async () => {
  const out = cleanAttributes(TOOL_RESULT)
  expect(out.success).toBe(false)
  expect(out.duration_ms).toBe(19)
  expect('prompt' in out).toBe(false)
})

test('unknown collector events keep their name under otel.*', async () => {
  expect(fromOtel('mystery_event', {}, 't', 's').kind).toBe('otel.mystery_event')
})

test('stats roll up requests, tools and failures', async () => {
  let s = emptyStats('sess-1', '2026-10-03T11:00:00.000Z')
  s = applyEvent(s, fromOtel('api_request', API_REQUEST, 't', 's'))
  s = applyEvent(s, fromOtel('tool_result', TOOL_RESULT, 't', 's'))
  s = applyEvent(s, fromOtel('tool_result', { ...TOOL_RESULT, success: 'true', duration_ms: '21' }, 't', 's'))
  expect(s.requests).toBe(1)
  expect(s.tokensOut).toBe(155)
  expect(s.tools.Bash).toEqual({ calls: 2, errors: 1, totalMs: 40 })
  const text = renderSummary(s, '/home/me/.claude/cog')
  expect(text.includes('1 requests')).toBe(true)
  expect(text.includes('1 failed')).toBe(true)
})

test('file stamps sort and are path-safe', async () => {
  expect(stamp('2026-10-03T11:04:00.581Z')).toBe('20261003T110400581Z')
})
