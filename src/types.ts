export const some = <T>(value: T) => ({ tag: 'some' as const, value })
export const none = { tag: 'none' as const }
export type Option<T> = { tag: 'some'; value: T } | { tag: 'none' }

export const ok = <T>(value: T) => ({ tag: 'ok' as const, value })
export const err = <E>(error: E) => ({ tag: 'err' as const, error })
export type Result<T, E> = { tag: 'ok'; value: T } | { tag: 'err'; error: E }

export const ViewMode = {
  Note: 'note',
  Graph: 'graph',
} as const
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode]

export const VaultStatus = {
  Idle: 'idle',
  Loading: 'loading',
  Ready: 'ready',
  Failed: 'failed',
} as const
export type VaultStatus = (typeof VaultStatus)[keyof typeof VaultStatus]

export type DocId = string

export type Doc = {
  id: DocId
  path: string
  title: string
  body: string
}

export type GraphEdge = {
  from: DocId
  to: DocId
}

export type GraphIndex = {
  version: 1
  folders: string[]
  nodes: DocId[]
  edges: GraphEdge[]
}

export type AppError =
  | { kind: 'unsupported'; detail: string }
  | { kind: 'io'; detail: string }
  | { kind: 'parse'; detail: string }
