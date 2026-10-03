import { expect, mock, test } from 'claude-code/testing'

import type { CommandRunInput, RenderElement, SessionContextBreakdown } from 'claude-code'

import { allocate } from '../hooks/register'

const run = (args: string): CommandRunInput => ({
  command: 'context-usage',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
})

const PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const BREAKDOWN: SessionContextBreakdown = {
  categories: [
    { name: 'System prompt', tokens: 3000, color: 'promptBorder', isDeferred: false, kind: 'used' },
    { name: 'Messages', tokens: 47000, color: 'permission', isDeferred: false, kind: 'used' },
    { name: 'MCP tools', tokens: 9000, color: 'inactive', isDeferred: true, kind: 'deferred' },
    { name: 'Autocompact buffer', tokens: 33000, color: 'inactive', isDeferred: false, kind: 'buffer' },
    { name: 'Free space', tokens: 117000, color: 'inactive', isDeferred: false, kind: 'free' },
  ],
  totalTokens: 50000,
  maxTokens: 200000,
  rawMaxTokens: 200000,
  autocompactSource: 'model-default',
  percentage: 25,
  gridRows: [],
  model: 'test',
  memoryFiles: [],
  mcpTools: [],
  agents: [],
  isAutoCompactEnabled: true,
  apiUsage: null,
}

test('allocate fills the width and keeps tiny segments visible', async () => {
  const cells = allocate([1, 1000, 9000], 50)
  expect(cells.reduce((a, b) => a + b, 0)).toBe(50)
  expect(cells[0]).toBe(1)
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws the bar and toggles it (${surface})`, async ($, on) => {
    mock.store(on)
    on('session.usage', async () => ({
      value: {
        startedAt: 0,
        context: { tokens: 50000, window: 200000, percent: 25, breakdown: BREAKDOWN },
        rateLimits: [],
      },
    }))
    // The engine draws nothing of its own above the prompt.
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Box } = $.ui.resolve(e)
      return h(Box, { key: 'empty' }) as RenderElement
    })

    const on1 = await $.command.run(run('on'))
    expect(on1.text).toContain('enabled')

    const ui = await $.ui.mount({ plugin: 'context-usage', surface, component: 'AbovePrompt', props: PROPS })
    const summary = await ui.find({ text: ' 25% · 50k/200k' })
    expect(summary).toBeDefined()
    const legend = await ui.find({ text: 'Messages 47k   ' })
    expect(legend).toBeDefined()
    // Deferred rows stay out of the bar.
    expect(await ui.find({ text: 'MCP tools 9.0k   ' })).toBeUndefined()

    const off = await $.command.run(run(''))
    expect(off.text).toContain('disabled')
    expect(await ui.find({ text: ' 25% · 50k/200k' })).toBeUndefined()
  })
}
