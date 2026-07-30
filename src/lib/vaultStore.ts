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
import { buildNoteTree, joinPath } from './tree'
import {
  createFolderInOpfs,
  importVaultToOpfs,
  loadVaultFromOpfs,
  persistIndex,
  pickLocalVault,
  saveDoc,
} from './vault'
import { normalizeNoteId, pathFromId, titleFromPath } from './wikilink'

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
  view: ViewMode.Note,
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

const markReady = (message: string) => {
  state.status = VaultStatus.Ready
  state.message = message
}

const persist = () => {
  void persistIndex(state.docs, state.folders)
}

const setActive = (id: DocId) => {
  state.activeId = some(id)
  const parts = id.split('/')
  state.activeFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
  state.view = ViewMode.Note
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
  ensureDoc(id)
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
  const [first] = picked.value.docs
  state.activeId = first ? some(first.id) : none
  state.activeFolder = ''
  state.view = ViewMode.Note
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
  const [first] = loaded.value.docs
  state.activeId = first ? some(first.id) : none
}

const setView = (view: ViewModeT) => {
  state.view = view
}

export const vaultStore = {
  state: readonly(state),
  knownIds,
  index,
  tree,
  activeDoc,
  sortedDocs,
  setActive,
  setActiveFolder,
  openOrCreate,
  createUntitled,
  createNote,
  createFolder,
  updateBody,
  openLocalVault,
  hydrateFromOpfs,
  setView,
}
