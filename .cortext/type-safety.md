# Type safety

## Hard rule — file size (≤500 lines)

**No TypeScript, Svelte, Vue, TSX, or other component/module file in this project may exceed 500 lines of code.**

If a file grows past 500 lines, it **must** be split before merge. The split is a **high-quality semantic refactor**, not a mechanical cut.

### Applies to

- `*.ts` / `*.tsx` (domain, lib, store, bridges, utilities)
- `*.vue` / `*.svelte` (and any UI component surface in this repo)
- React islands under `src/editor/*`
- Tests and scripts that live in-repo (same ceiling)

Blank lines and comments count toward the limit. Generated / vendored files are out of scope.

### How to split (required quality bar)

Split along **responsibility boundaries**, following normal TypeScript / component best practices:

1. **One reason to change** — extract a cohesive submodule (layout vs render, parse vs IO, store actions vs selectors).
2. **Name by meaning** — `graphLayout.ts`, `graphWires.ts`, not `graphView2.ts` / `helpers.ts` dump files.
3. **Public API stays small** — re-export a thin barrel only when callers need a stable entry; prefer direct imports of the owning module.
4. **Preserve type safety** — shared types/unions live in a focused types module; do not weaken `Option` / `Result` / const unions to “make the split easier.”
5. **Components** — pull pure logic, constants, and subviews into sibling modules/components; keep the parent as composition + wiring.
6. **No fake splits** — do not shove half the file into an anonymous util, duplicate logic, or leave circular imports to dodge the line count.

### Anti-patterns

- Cutting at line 500 mid-function / mid-template
- `foo.part2.ts` with no semantic boundary
- Giant “god” files justified as “the graph is complex”
- Moving code without clarifying ownership or call direction

### When editing

If you touch a file already over 500 lines, **shrink or split it in the same change** (or as the immediate follow-up commit in the same PR). Do not add more surface area to an oversized file.

## Rule — null / undefined

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

1. Keep every module/component ≤500 lines; split semantically when approaching the ceiling.
2. New optional field → `Option<T>`, not `T | undefined`.
3. Fallible async → `Promise<Result<T, AppError>>`, not throw-by-default for expected failures.
4. Mode / status flags → `as const` object + union type, never boolean soup when states are mutually exclusive.
5. Narrow with `tag` / `kind`; avoid non-null assertions (`!`) on domain data.
6. When a library returns `null`, map immediately (`el instanceof HTMLElement ? some(el) : none`).

## Why this matters here

Local-first file code is full of “missing file / missing handle / missing selection” cases. Tagged unions force every call site to decide; the graph, vault import, and editor mount paths stay readable under that pressure.
