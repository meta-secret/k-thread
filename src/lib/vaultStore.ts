import { computed, reactive, readonly } from 'vue'
import {
  err,
  none,
  ok,
  some,
  VaultStatus,
  ViewMode,
  type AppError,
  type Doc,
  type DocId,
  type GraphIndex,
  type Option,
  type Result,
  type VaultStatus as VaultStatusT,
  type ViewMode as ViewModeT,
} from '../types'
import { buildIndex } from './graph'
import { noteLinks } from './graphView'
import { readLastActiveId, readLastView, writeLastActiveId, writeLastView } from './session'
import { buildNoteTree, joinPath } from './tree'
import {
  createFolderInOpfs,
  deleteDocFromOpfs,
  deleteFolderFromOpfs,
  importVaultToOpfs,
  loadVaultFromOpfs,
  persistIndex,
  pickLocalVault,
  renameDocInOpfs,
  saveDoc,
} from './vault'
import { normalizeNoteId, pathFromId, rewriteWikilinks, titleFromPath } from './wikilink'

type State = {
  status: VaultStatusT
  message: string
  docs: Doc[]
  folders: string[]
  activeId: Option<DocId>
  activeFolder: string
  view: ViewModeT
}

const state = reactive<State>({
  status: VaultStatus.Idle,
  message: '',
  docs: [],
  folders: [],
  activeId: none,
  activeFolder: '',
  view: ViewMode.Structure,
})

const knownIds = computed(() => new Set(state.docs.map((d) => d.id)))

const index = computed<GraphIndex>(() => buildIndex(state.docs, state.folders))

const tree = computed(() => buildNoteTree(state.docs, state.folders))

const activeDoc = computed<Option<Doc>>(() => {
  const active = state.activeId
  if (active.tag === 'none') return none
  const found = state.docs.find((d) => d.id === active.value)
  return found ? some(found) : none
})

const sortedDocs = computed(() =>
  [...state.docs].sort((a, b) => a.id.localeCompare(b.id)),
)

const noteIds = computed(() => sortedDocs.value.map((d) => d.id))

const tags = computed(() => {
  const found = new Set<string>()
  const re = /(^|[\s([{])#([A-Za-z0-9_][\w/-]*)/gm
  for (const doc of state.docs) {
    for (const match of doc.body.matchAll(re)) {
      const tag = match[2]
      if (typeof tag === 'string' && tag.length > 0) found.add(tag)
    }
  }
  return [...found].sort()
})

const activeTags = computed(() => {
  const doc = activeDoc.value
  if (doc.tag === 'none') return [] as string[]
  const found = new Set<string>()
  const re = /(^|[\s([{])#([A-Za-z0-9_][\w/-]*)/gm
  for (const match of doc.value.body.matchAll(re)) {
    const tag = match[2]
    if (typeof tag === 'string' && tag.length > 0) found.add(tag)
  }
  return [...found].sort()
})

const activeLinks = computed(() => {
  const active = state.activeId
  if (active.tag === 'none') {
    return { out: [] as DocId[], back: [] as DocId[] }
  }
  const edges = index.value.edges.map((e) => ({ from: e.from, to: e.to }))
  return noteLinks(active.value, edges)
})

const noteOrdinal = computed(() => {
  const active = state.activeId
  if (active.tag === 'none' || noteIds.value.length === 0) {
    return { index: 0, total: noteIds.value.length }
  }
  const pos = noteIds.value.indexOf(active.value)
  return {
    index: pos >= 0 ? pos + 1 : 0,
    total: noteIds.value.length,
  }
})

const markReady = (message: string) => {
  state.status = VaultStatus.Ready
  state.message = message
}

const persist = () => {
  void persistIndex(state.docs, state.folders)
}

const focusNote = (id: DocId) => {
  ensureDoc(id)
  state.activeId = some(id)
  writeLastActiveId(id)
  const parts = id.split('/')
  state.activeFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

const clearActive = () => {
  state.activeId = none
  writeLastActiveId('')
}

const setActive = (id: DocId) => {
  focusNote(id)
  setView(ViewMode.Note)
}

const setActiveFolder = (folder: string) => {
  state.activeFolder = folder
}

const rememberFolder = (folder: string) => {
  if (folder.length === 0) return
  if (state.folders.includes(folder)) return
  state.folders.push(folder)
  state.folders.sort()
}

const ensureDoc = (id: DocId): Doc => {
  const existing = state.docs.find((d) => d.id === id)
  if (existing) return existing
  const title = titleFromPath(pathFromId(id))
  const doc: Doc = {
    id,
    path: pathFromId(id),
    title,
    body: `# ${title}\n\n`,
  }
  const parent = id.includes('/') ? id.split('/').slice(0, -1).join('/') : ''
  rememberFolder(parent)
  state.docs.push(doc)
  void saveDoc(doc)
  persist()
  return doc
}

const openOrCreate = (id: DocId) => {
  markReady(`${state.docs.length} notes`)
  setActive(id)
}

const nextUntitledId = (folder: string): DocId => {
  const ids = knownIds.value
  const base = joinPath(folder, 'Untitled')
  if (!ids.has(base)) return base
  let n = 1
  while (ids.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

const createUntitled = (folder: string = state.activeFolder): Doc => {
  const doc = ensureDoc(nextUntitledId(folder))
  markReady(`${state.docs.length} notes`)
  setActive(doc.id)
  return doc
}

const createNote = (rawName: string, folder: string = state.activeFolder): Result<Doc, AppError> => {
  const prefixed = folder.length === 0 || rawName.includes('/') ? rawName : joinPath(folder, rawName)
  const normalized = normalizeNoteId(prefixed)
  if (normalized.tag === 'err') return normalized
  if (knownIds.value.has(normalized.value)) {
    return err({ kind: 'parse', detail: 'A note with this name already exists' })
  }
  const doc = ensureDoc(normalized.value)
  markReady(`${state.docs.length} notes`)
  setActive(doc.id)
  return ok(doc)
}

const createFolder = async (rawName: string, parent: string = state.activeFolder): Promise<Result<string, AppError>> => {
  const prefixed = parent.length === 0 || rawName.includes('/') ? rawName : joinPath(parent, rawName)
  const normalized = normalizeNoteId(prefixed)
  if (normalized.tag === 'err') return normalized
  if (state.folders.includes(normalized.value)) {
    return err({ kind: 'parse', detail: 'A folder with this name already exists' })
  }
  if (knownIds.value.has(normalized.value)) {
    return err({ kind: 'parse', detail: 'A note already uses this path' })
  }
  const made = await createFolderInOpfs(normalized.value)
  if (made.tag === 'err') return made
  rememberFolder(normalized.value)
  state.activeFolder = normalized.value
  markReady(`${state.docs.length} notes`)
  persist()
  return ok(normalized.value)
}

const underPath = (id: string, folder: string): boolean =>
  id === folder || id.startsWith(`${folder}/`)

const deleteNote = async (id: DocId): Promise<Result<true, AppError>> => {
  const indexOf = state.docs.findIndex((d) => d.id === id)
  if (indexOf < 0) {
    return err({ kind: 'io', detail: 'Note not found' })
  }
  const removed = await deleteDocFromOpfs(id)
  if (removed.tag === 'err') return removed

  state.docs.splice(indexOf, 1)

  const active = state.activeId
  if (active.tag === 'some' && active.value === id) {
    const [next] = state.docs
    if (next) focusNote(next.id)
    else clearActive()
  }

  if (state.docs.length === 0) {
    state.status = VaultStatus.Idle
    state.message = 'Create a note to begin'
  } else {
    markReady(`${state.docs.length} notes`)
  }
  persist()
  return ok(true)
}

const deleteFolder = async (path: string): Promise<Result<true, AppError>> => {
  if (path.length === 0) {
    return err({ kind: 'parse', detail: 'Cannot delete the vault root' })
  }
  if (!state.folders.includes(path)) {
    return err({ kind: 'io', detail: 'Folder not found' })
  }

  const removed = await deleteFolderFromOpfs(path)
  if (removed.tag === 'err') return removed

  state.docs = state.docs.filter((d) => !underPath(d.id, path))
  state.folders = state.folders.filter((f) => !underPath(f, path))

  const active = state.activeId
  if (active.tag === 'some' && underPath(active.value, path)) {
    const [next] = state.docs
    state.activeId = next ? some(next.id) : none
  }
  if (state.activeFolder === path || state.activeFolder.startsWith(`${path}/`)) {
    state.activeFolder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
  }

  if (state.docs.length === 0) {
    state.status = VaultStatus.Idle
    state.message = 'Create a note to begin'
  } else {
    markReady(`${state.docs.length} notes`)
  }
  persist()
  return ok(true)
}

const renameNote = async (fromId: DocId, rawName: string): Promise<Result<Doc, AppError>> => {
  const doc = state.docs.find((d) => d.id === fromId)
  if (!doc) {
    return err({ kind: 'io', detail: 'Note not found' })
  }

  const parent = fromId.includes('/') ? fromId.split('/').slice(0, -1).join('/') : ''
  const prefixed = rawName.includes('/') || parent.length === 0 ? rawName : joinPath(parent, rawName)
  const normalized = normalizeNoteId(prefixed)
  if (normalized.tag === 'err') return normalized
  const toId = normalized.value

  if (toId !== fromId && knownIds.value.has(toId)) {
    return err({ kind: 'parse', detail: 'A note with this name already exists' })
  }

  const written = await renameDocInOpfs(fromId, toId, doc.body)
  if (written.tag === 'err') return written

  doc.id = toId
  doc.path = pathFromId(toId)
  doc.title = titleFromPath(doc.path)
  rememberFolder(toId.includes('/') ? toId.split('/').slice(0, -1).join('/') : '')

  if (toId !== fromId) {
    for (const other of state.docs) {
      if (other.id === toId) continue
      const nextBody = rewriteWikilinks(other.body, fromId, toId)
      if (nextBody === other.body) continue
      other.body = nextBody
      void saveDoc(other)
    }
  }

  const active = state.activeId
  if (active.tag === 'some' && active.value === fromId) {
    setActive(toId)
  }

  markReady(`${state.docs.length} notes`)
  persist()
  return ok(doc)
}

let saveTimer = 0

const updateBody = (body: string) => {
  const active = state.activeId
  if (active.tag === 'none') return
  const doc = state.docs.find((d) => d.id === active.value)
  if (!doc) return
  doc.body = body
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void saveDoc(doc)
    persist()
  }, 250)
}

const openLocalVault = async () => {
  state.status = VaultStatus.Loading
  state.message = 'Opening vault…'
  const picked = await pickLocalVault()
  if (picked.tag === 'err') {
    state.status = VaultStatus.Failed
    state.message = picked.error.detail
    return
  }
  const imported = await importVaultToOpfs(picked.value)
  if (imported.tag === 'err') {
    state.status = VaultStatus.Failed
    state.message = imported.error.detail
    return
  }
  state.docs = picked.value.docs
  state.folders = picked.value.folders
  markReady(`${picked.value.docs.length} notes loaded`)
  state.activeFolder = ''
  // Prefer remembered note; never surprise-open an arbitrary vault entry.
  const remembered = readLastActiveId()
  const match = remembered.length > 0 ? picked.value.docs.find((d) => d.id === remembered) : undefined
  if (match) {
    focusNote(match.id)
    setView(ViewMode.Note)
  } else {
    clearActive()
    setView(ViewMode.Structure)
  }
}

const restoreActiveFromSession = (docs: readonly Doc[]) => {
  const remembered = readLastActiveId()
  if (remembered.length > 0 && docs.some((d) => d.id === remembered)) {
    focusNote(remembered)
    return
  }
  clearActive()
  setView(ViewMode.Structure)
}

const hydrateFromOpfs = async () => {
  state.status = VaultStatus.Loading
  state.message = 'Restoring from OPFS…'
  const loaded = await loadVaultFromOpfs()
  if (loaded.tag === 'err') {
    state.status = VaultStatus.Idle
    state.message = 'Create a note to begin'
    return
  }
  if (loaded.value.docs.length === 0 && loaded.value.folders.length === 0) {
    state.status = VaultStatus.Idle
    state.message = 'Create a note to begin'
    return
  }
  state.docs = loaded.value.docs
  state.folders = loaded.value.folders
  markReady(`${loaded.value.docs.length} notes restored`)
  restoreActiveFromSession(loaded.value.docs)
  if (state.activeId.tag === 'some') {
    const last = readLastView()
    setView(last === ViewMode.Structure ? ViewMode.Note : last)
  }
}

const setView = (view: ViewModeT) => {
  state.view = view
  writeLastView(view)
}

export const vaultStore = {
  state: readonly(state),
  knownIds,
  index,
  tree,
  activeDoc,
  sortedDocs,
  noteIds,
  tags,
  activeTags,
  activeLinks,
  noteOrdinal,
  setActive,
  focusNote,
  setActiveFolder,
  openOrCreate,
  createUntitled,
  createNote,
  createFolder,
  deleteNote,
  deleteFolder,
  renameNote,
  updateBody,
  openLocalVault,
  hydrateFromOpfs,
  setView,
}
