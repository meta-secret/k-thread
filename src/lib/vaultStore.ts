import { computed, reactive, readonly } from 'vue'
import {
  none,
  some,
  VaultStatus,
  ViewMode,
  type Doc,
  type DocId,
  type GraphIndex,
  type Option,
  type VaultStatus as VaultStatusT,
  type ViewMode as ViewModeT,
} from '../types'
import { buildIndex } from './graph'
import {
  importDocsToOpfs,
  loadDocsFromOpfs,
  persistIndex,
  pickLocalVault,
  saveDoc,
} from './vault'
import { pathFromId, titleFromPath } from './wikilink'

type State = {
  status: VaultStatusT
  message: string
  docs: Doc[]
  activeId: Option<DocId>
  view: ViewModeT
}

const state = reactive<State>({
  status: VaultStatus.Idle,
  message: '',
  docs: [],
  activeId: none,
  view: ViewMode.Note,
})

const knownIds = computed(() => new Set(state.docs.map((d) => d.id)))

const index = computed<GraphIndex>(() => buildIndex(state.docs))

const activeDoc = computed<Option<Doc>>(() => {
  const active = state.activeId
  if (active.tag === 'none') return none
  const found = state.docs.find((d) => d.id === active.value)
  return found ? some(found) : none
})

const sortedDocs = computed(() =>
  [...state.docs].sort((a, b) => a.id.localeCompare(b.id)),
)

const setActive = (id: DocId) => {
  state.activeId = some(id)
  state.view = ViewMode.Note
}

const ensureDoc = (id: DocId): Doc => {
  const existing = state.docs.find((d) => d.id === id)
  if (existing) return existing
  const doc: Doc = {
    id,
    path: pathFromId(id),
    title: titleFromPath(pathFromId(id)),
    body: `# ${titleFromPath(pathFromId(id))}\n`,
  }
  state.docs.push(doc)
  void saveDoc(doc)
  void persistIndex(state.docs)
  return doc
}

const openOrCreate = (id: DocId) => {
  ensureDoc(id)
  setActive(id)
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
    void persistIndex(state.docs)
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
  const imported = await importDocsToOpfs(picked.value)
  if (imported.tag === 'err') {
    state.status = VaultStatus.Failed
    state.message = imported.error.detail
    return
  }
  state.docs = picked.value
  state.status = VaultStatus.Ready
  state.message = `${picked.value.length} notes loaded`
  const [first] = picked.value
  state.activeId = first ? some(first.id) : none
  state.view = ViewMode.Note
}

const hydrateFromOpfs = async () => {
  state.status = VaultStatus.Loading
  state.message = 'Restoring from OPFS…'
  const loaded = await loadDocsFromOpfs()
  if (loaded.tag === 'err') {
    state.status = VaultStatus.Idle
    state.message = loaded.error.detail
    return
  }
  if (loaded.value.length === 0) {
    state.status = VaultStatus.Idle
    state.message = 'Open a local Obsidian vault to begin'
    return
  }
  state.docs = loaded.value
  state.status = VaultStatus.Ready
  state.message = `${loaded.value.length} notes restored`
  const [first] = loaded.value
  state.activeId = first ? some(first.id) : none
}

const setView = (view: ViewModeT) => {
  state.view = view
}

export const vaultStore = {
  state: readonly(state),
  knownIds,
  index,
  activeDoc,
  sortedDocs,
  setActive,
  openOrCreate,
  updateBody,
  openLocalVault,
  hydrateFromOpfs,
  setView,
}
