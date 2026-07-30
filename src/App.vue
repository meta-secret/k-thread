<script setup lang="ts">
import { FilePlus2, FolderOpen } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import DeleteNoteDialog from '@/components/DeleteNoteDialog.vue'
import GraphView from '@/components/GraphView.vue'
import NewNoteDialog from '@/components/NewNoteDialog.vue'
import NoteSidebar from '@/components/NoteSidebar.vue'
import RenameNoteDialog from '@/components/RenameNoteDialog.vue'
import BrandMark from '@/components/BrandMark.vue'
import EditorStage from '@/components/shell/EditorStage.vue'
import Inspector from '@/components/shell/Inspector.vue'
import ToolRail from '@/components/shell/ToolRail.vue'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { vaultStore } from '@/lib/vaultStore'
import { VaultStatus, ViewMode, type DocId } from '@/types'

const CreateKind = {
  Note: 'note',
  Folder: 'folder',
} as const
type CreateKind = (typeof CreateKind)[keyof typeof CreateKind]

const dialogOpen = ref(false)
const dialogKind = ref<CreateKind>(CreateKind.Note)
const dialogFolder = ref('')
const showPreview = ref(false)
const filesOpen = ref(false)

const renameOpen = ref(false)
const renameId = ref<DocId>('')
const deleteOpen = ref(false)
const deleteId = ref<DocId>('')
const deleteTitle = ref('')

onMounted(() => {
  void vaultStore.hydrateFromOpfs()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

const isMod = (event: KeyboardEvent): boolean => event.metaKey || event.ctrlKey

const onKeydown = (event: KeyboardEvent) => {
  if (!isMod(event)) return
  if (event.key.toLowerCase() === 'b' && !event.shiftKey) {
    event.preventDefault()
    filesOpen.value = !filesOpen.value
    return
  }
  if (event.key.toLowerCase() !== 'n') return
  event.preventDefault()
  if (event.shiftKey) {
    openNamed(vaultStore.state.activeFolder)
    return
  }
  vaultStore.createUntitled(vaultStore.state.activeFolder)
}

const openNamed = (folder: string) => {
  dialogFolder.value = folder
  dialogKind.value = CreateKind.Note
  dialogOpen.value = true
}

const openFolderDialog = (folder: string) => {
  dialogFolder.value = folder
  dialogKind.value = CreateKind.Folder
  dialogOpen.value = true
}

const openRename = (id: DocId) => {
  renameId.value = id
  renameOpen.value = true
}

const openDelete = (id: DocId) => {
  const doc = vaultStore.state.docs.find((d) => d.id === id)
  deleteId.value = id
  deleteTitle.value = doc ? doc.title : id
  deleteOpen.value = true
}

const status = computed(() => vaultStore.state.status)
const message = computed(() => vaultStore.state.message)
const view = computed(() => vaultStore.state.view)
const tree = vaultStore.tree
const index = vaultStore.index
const known = vaultStore.knownIds
const noteIds = vaultStore.noteIds
const tags = vaultStore.tags
const activeTags = vaultStore.activeTags
const activeLinks = vaultStore.activeLinks
const noteOrdinal = vaultStore.noteOrdinal
const active = vaultStore.activeDoc
const activeFolder = computed(() => vaultStore.state.activeFolder)

const activeId = computed(() =>
  vaultStore.state.activeId.tag === 'some' ? vaultStore.state.activeId.value : '',
)

const body = computed(() => (active.value.tag === 'some' ? active.value.value.body : ''))
const docKey = computed(() => (active.value.tag === 'some' ? active.value.value.id : ''))
const title = computed(() => (active.value.tag === 'some' ? active.value.value.title : ''))
const linkCount = computed(
  () => activeLinks.value.out.length + activeLinks.value.back.length,
)
const ready = computed(() => status.value === VaultStatus.Ready)

const onSelectFromFiles = (id: DocId) => {
  vaultStore.setActive(id)
  filesOpen.value = false
}

const openGraph = () => {
  vaultStore.setView(ViewMode.Graph)
}
</script>

<template>
  <TooltipProvider>
    <div class="app">
      <header class="top">
        <div class="brand">
          <BrandMark :size="28" />
          <span class="wordmark">k-thread</span>
        </div>
        <p class="msg">
          {{ message }}
          <span v-if="activeFolder.length > 0"> · {{ activeFolder }}</span>
        </p>
        <div class="ord mono">
          <template v-if="ready && noteOrdinal.total > 0">
            {{ String(noteOrdinal.index).padStart(3, '0') }} / {{ noteOrdinal.total }}
          </template>
        </div>
      </header>

      <main v-if="ready" class="workspace">
        <ToolRail
          :view="view"
          :show-preview="showPreview"
          :has-active="active.tag === 'some'"
          :files-open="filesOpen"
          @set-view="vaultStore.setView"
          @toggle-preview="showPreview = !showPreview"
          @toggle-files="filesOpen = !filesOpen"
          @import-vault="vaultStore.openLocalVault"
          @create-untitled="vaultStore.createUntitled(activeFolder)"
          @create-named="openNamed(activeFolder)"
          @create-folder="openFolderDialog(activeFolder)"
          @rename="active.tag === 'some' && openRename(active.value.id)"
          @delete="active.tag === 'some' && openDelete(active.value.id)"
        />

        <div class="center">
          <section v-if="view === ViewMode.Note" class="note-layout">
            <EditorStage
              :has-active="active.tag === 'some'"
              :doc-key="docKey"
              :body="body"
              :note-ids="noteIds"
              :tags="tags"
              :title="title"
              :folder="activeFolder"
              :link-count="linkCount"
              :show-preview="showPreview"
              :known="known"
              @update:model-value="vaultStore.updateBody"
              @navigate="vaultStore.openOrCreate"
              @create-untitled="vaultStore.createUntitled(activeFolder)"
            />
            <Inspector
              :active-id="activeId"
              :folder="activeFolder"
              :tags="activeTags"
              :backlinks="activeLinks.back"
              :outlinks="activeLinks.out"
              :show-preview="showPreview"
              @navigate="vaultStore.openOrCreate"
              @open-graph="openGraph"
              @toggle-preview="showPreview = !showPreview"
            />
          </section>

          <section v-else class="graph-layout">
            <GraphView
              :index="index"
              :active-id="activeId"
              :existing-ids="noteIds"
              @select="vaultStore.focusNote"
              @open="vaultStore.openOrCreate"
            />
          </section>

          <div v-if="filesOpen" class="files-scrim" @click="filesOpen = false" />
          <aside v-if="filesOpen" class="files-drawer">
            <NoteSidebar
              :nodes="tree"
              :active-id="activeId"
              :active-folder="activeFolder"
              @select="onSelectFromFiles"
              @select-folder="vaultStore.setActiveFolder"
              @create-untitled="vaultStore.createUntitled"
              @create-named="openNamed"
              @create-folder="openFolderDialog"
              @rename="openRename"
              @delete="openDelete"
            />
          </aside>
        </div>
      </main>

      <main v-else class="landing">
        <h1>Your notes, locally</h1>
        <p>
          Create hierarchical notes like Obsidian. Folders are real OPFS directories. Editing uses
          BlockNote; storage stays markdown for vault interop.
        </p>
        <div class="landing-actions">
          <Button size="lg" @click="vaultStore.createUntitled()">
            <FilePlus2 class="size-4" />
            Create a note
          </Button>
          <Button size="lg" variant="outline" @click="openNamed('')">Name a note…</Button>
          <Button size="lg" variant="outline" @click="openFolderDialog('')">New folder…</Button>
          <Button size="lg" variant="ghost" @click="vaultStore.openLocalVault">
            <FolderOpen class="size-4" />
            Import vault
          </Button>
        </div>
        <p v-if="status === VaultStatus.Failed" class="fail">{{ message }}</p>
      </main>

      <footer v-if="ready" class="foot">
        <div class="foot-brand">
          <BrandMark :size="18" />
          <span>k-thread</span>
        </div>
        <span class="mono">{{ String(noteOrdinal.index).padStart(3, '0') }}</span>
      </footer>

      <NewNoteDialog v-model:open="dialogOpen" :kind="dialogKind" :folder="dialogFolder" />
      <RenameNoteDialog
        v-if="renameId.length > 0"
        v-model:open="renameOpen"
        :note-id="renameId"
      />
      <DeleteNoteDialog
        v-if="deleteId.length > 0"
        v-model:open="deleteOpen"
        :note-id="deleteId"
        :note-title="deleteTitle"
      />
    </div>
  </TooltipProvider>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
  background: linear-gradient(180deg, #ececec 0%, #d5d5d5 48%, #c4c4c4 100%);
  color: #141414;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.25rem 0.55rem;
  background: transparent;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.wordmark {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.msg {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6a6a6a;
}

.ord {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: #141414;
}

.mono {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
}

.workspace {
  display: grid;
  grid-template-columns: auto 1fr;
  min-height: 0;
}

.center {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.note-layout {
  display: grid;
  grid-template-columns: 1fr auto;
  height: 100%;
  min-height: 0;
}

.graph-layout {
  height: 100%;
  min-height: 0;
}

.files-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(20, 20, 20, 0.18);
  backdrop-filter: blur(2px);
}

.files-drawer {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  bottom: 0.75rem;
  z-index: 30;
  width: min(280px, 90vw);
  overflow: hidden;
  border: 1px solid rgba(20, 20, 20, 0.12);
  background: rgba(236, 236, 236, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
}

.files-drawer :deep(aside) {
  height: 100%;
  border: none;
  background: transparent;
}

.landing {
  display: grid;
  place-content: center;
  gap: 1rem;
  padding: 2rem 1.5rem;
  text-align: center;
}

.landing h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.landing p {
  max-width: 32rem;
  margin: 0 auto;
  color: #5a5a5a;
  letter-spacing: 0.02em;
}

.landing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.fail {
  color: #b00020;
  font-size: 0.85rem;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1.25rem 0.85rem;
  background: transparent;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.foot-brand {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

@media (max-width: 900px) {
  .note-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
}
</style>
