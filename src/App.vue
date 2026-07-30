<script setup lang="ts">
import { FilePlus2, FolderOpen } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DeleteFolderDialog from '@/components/DeleteFolderDialog.vue'
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
const deleteFolderOpen = ref(false)
const deleteFolderPath = ref('')

onMounted(() => {
  void vaultStore.hydrateFromOpfs()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

// Vault restored but nothing remembered → open Files so the user chooses (no random note).
watch(
  () => [ready.value, active.tag] as const,
  ([isReady, tag]) => {
    if (isReady && tag === 'none' && view.value === ViewMode.Note) {
      filesOpen.value = true
    }
  },
)

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

const openDeleteFolder = (folder: string) => {
  deleteFolderPath.value = folder
  deleteFolderOpen.value = true
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
const isGraph = computed(() => view.value === ViewMode.Graph)

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
    <div class="app" :class="{ graph: isGraph, ready }">
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
              @delete-folder="openDeleteFolder"
            />
          </aside>
        </div>
      </main>

      <main v-else class="landing">
        <div class="landing-atmosphere" aria-hidden="true" />
        <div class="landing-inner">
          <BrandMark :size="56" />
          <h1 class="landing-brand">k-thread</h1>
          <p class="landing-lead">Local notes. Real folders. Wikilinks that hold.</p>
          <div class="landing-actions">
            <Button size="lg" class="cta-primary" @click="vaultStore.createUntitled()">
              <FilePlus2 class="size-4" />
              Create a note
            </Button>
            <Button size="lg" variant="outline" class="cta-ghost" @click="openNamed('')">
              Name a note
            </Button>
            <Button size="lg" variant="ghost" class="cta-ghost" @click="vaultStore.openLocalVault">
              <FolderOpen class="size-4" />
              Import vault
            </Button>
          </div>
          <p v-if="status === VaultStatus.Failed" class="fail">{{ message }}</p>
        </div>
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
      <DeleteFolderDialog
        v-if="deleteFolderPath.length > 0"
        v-model:open="deleteFolderOpen"
        :folder-path="deleteFolderPath"
      />
    </div>
  </TooltipProvider>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
  height: 100dvh;
  background: linear-gradient(
    180deg,
    var(--kube-wash-top) 0%,
    var(--kube-wash-mid) 52%,
    var(--kube-wash-bot) 100%
  );
  color: var(--kube-ink);
  animation: k-fade-up 420ms ease-out both;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.35rem 0.5rem;
  background: transparent;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.wordmark {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.msg {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--kube-mute);
}

.ord {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
}

.mono {
  font-family: var(--font-mono);
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
  animation: k-fade-up 380ms ease-out both;
}

.files-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(18, 18, 20, 0.2);
  backdrop-filter: blur(3px);
}

.files-drawer {
  position: absolute;
  top: 0.85rem;
  left: 0.85rem;
  bottom: 0.85rem;
  z-index: 30;
  width: min(280px, 90vw);
  overflow: hidden;
  border: 1px solid var(--kube-line-strong);
  background: color-mix(in srgb, var(--kube-wash-top) 88%, white);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.14);
  animation: k-fade-up 220ms ease-out both;
}

.files-drawer :deep(aside) {
  height: 100%;
  border: none;
  background: transparent;
}

.landing {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
  padding: 2rem 1.5rem;
}

.landing-atmosphere {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 40% at 50% 28%, rgba(255, 255, 255, 0.55), transparent 70%),
    repeating-linear-gradient(
      to right,
      rgba(18, 18, 20, 0.05) 0,
      rgba(18, 18, 20, 0.05) 1px,
      transparent 1px,
      transparent 80px
    );
  mask-image: linear-gradient(to bottom, black 35%, transparent 92%);
  animation: k-floor-in 700ms ease-out both;
}

.landing-inner {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0.85rem;
  text-align: center;
  animation: k-fade-up 480ms ease-out both;
}

.landing-brand {
  margin: 0.2rem 0 0;
  font-size: clamp(2.4rem, 7vw, 4.2rem);
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1.05;
}

.landing-lead {
  margin: 0;
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.02em;
  color: var(--kube-mute);
}

.landing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: center;
  margin-top: 0.55rem;
}

.cta-primary {
  background: var(--kube-ink);
  color: #f4f4f6;
  border-radius: 0;
  letter-spacing: 0.06em;
}

.cta-ghost {
  border-radius: 0;
  border-color: var(--kube-line-strong);
  letter-spacing: 0.06em;
}

.fail {
  color: var(--destructive);
  font-size: 0.85rem;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1.35rem 0.95rem;
  background: transparent;
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.foot-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 900px) {
  .note-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
}
</style>
