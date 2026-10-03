export type Segment = {
  name: string
  tokens: number
  kind: 'used' | 'free' | 'buffer'
}

export type Snapshot = {
  segments: Segment[]
  usedTokens: number
  maxTokens: number
  percent: number
}

declare module 'claude-code' {
  interface PluginState {
    'context-usage': { snapshot: Snapshot | null; isEnabled: boolean }
  }
}
