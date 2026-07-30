# Type safety

## Rule

In **application domain code** (`src/types.ts`, `src/lib/*`, store, and our editor bridges):

- **Do not use `null` or `undefined` as domain values.**
- Prefer **tagged unions**, **const object “enums”**, and **`Option` / `Result`**.
- Exhaustiveness via `tag` / `kind` discriminants — make illegal states unrepresentable.

Interop with third-party APIs (DOM, D3, BlockNote, Vue refs) may still surface `null`. Wrap at the boundary; do not leak it into vault/domain types.

## Core helpers (`src/types.ts`)

### Option — presence

```ts
export const some = <T>(value: T) => ({ tag: 'some' as const, value })
export const none = { tag: 'none' as const }
export type Option<T> = { tag: 'some'; value: T } | { tag: 'none' }
```

Use for “maybe a value”: active note id, mounted editor host, optional simulation handle.

```ts
if (active.tag === 'some') {
  // active.value is DocId
}
```

### Result — success or typed failure

```ts
export const ok = <T>(value: T) => ({ tag: 'ok' as const, value })
export const err = <E>(error: E) => ({ tag: 'err' as const, error })
export type Result<T, E> = { tag: 'ok'; value: T } | { tag: 'err'; error: E }
```

All OPFS / parse / import paths return `Result<…, AppError>`.

### Const unions instead of `enum`

TypeScript `enum` is avoided (`erasableSyntaxOnly`). Pattern:

```ts
export const ViewMode = {
  Note: 'note',
  Graph: 'graph',
} as const
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode]
```

Same for `VaultStatus`, `GraphScope`, dialog kinds, etc. Values are plain strings at runtime; types stay narrow.

### Closed error kinds

```ts
export type AppError =
  | { kind: 'unsupported'; detail: string }
  | { kind: 'io'; detail: string }
  | { kind: 'parse'; detail: string }
```

Switch on `kind`; add new variants deliberately.

## Empty string vs Option

UI sometimes uses `DocId | ''` for “no selection” in props (template-friendly). Prefer `Option<DocId>` in the store (`activeId: Option<DocId>`). Convert at the edge:

```ts
const activeId = computed(() =>
  vaultStore.state.activeId.tag === 'some' ? vaultStore.state.activeId.value : '',
)
```

## Practices checklist

1. New optional field → `Option<T>`, not `T | undefined`.
2. Fallible async → `Promise<Result<T, AppError>>`, not throw-by-default for expected failures.
3. Mode / status flags → `as const` object + union type, never boolean soup when states are mutually exclusive.
4. Narrow with `tag` / `kind`; avoid non-null assertions (`!`) on domain data.
5. When a library returns `null`, map immediately (`el instanceof HTMLElement ? some(el) : none`).

## Why this matters here

Local-first file code is full of “missing file / missing handle / missing selection” cases. Tagged unions force every call site to decide; the graph, vault import, and editor mount paths stay readable under that pressure.
