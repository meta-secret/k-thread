<script setup lang="ts">
import { Eye, FilePlus2, FolderOpen, Network, Pencil, StickyNote, Trash2 } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BlockNoteEditor from '@/components/BlockNoteEditor.vue'
import DeleteNoteDialog from '@/components/DeleteNoteDialog.vue'
import GraphView from '@/components/GraphView.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import NewNoteDialog from '@/components/NewNoteDialog.vue'
import NoteSidebar from '@/components/NoteSidebar.vue'
import RenameNoteDialog from '@/components/RenameNoteDialog.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
const active = vaultStore.activeDoc
const activeFolder = computed(() => vaultStore.state.activeFolder)

const activeId = computed(() =>
  vaultStore.state.activeId.tag === 'some' ? vaultStore.state.activeId.value : '',
)

const body = computed(() => (active.value.tag === 'some' ? active.value.value.body : ''))
const docKey = computed(() => (active.value.tag === 'some' ? active.value.value.id : ''))
const ready = computed(() => status.value === VaultStatus.Ready)
</script>

<template>
  <TooltipProvider>
    <div class="grid h-screen grid-rows-[auto_1fr] bg-background text-foreground">
      <header class="flex flex-wrap items-center gap-3 border-b bg-background/80 px-3 py-2 backdrop-blur">
        <div class="flex items-center gap-2">
          <div
            class="grid size-7 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
          >
            k
          </div>
          <span class="font-semibold tracking-tight">k-thread</span>
        </div>

        <p class="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {{ message }}
          <span v-if="activeFolder.length > 0"> · {{ activeFolder }}</span>
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="sm" @click="vaultStore.createUntitled(activeFolder)">
                <FilePlus2 class="size-4" />
                New note
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create note in current folder (⌘N)</TooltipContent>
          </Tooltip>

          <Button size="sm" variant="outline" @click="openNamed(activeFolder)">Named…</Button>
          <Button size="sm" variant="outline" @click="openFolderDialog(activeFolder)">
            Folder…
          </Button>

          <Button
            size="sm"
            variant="outline"
            :disabled="active.tag !== 'some'"
            @click="active.tag === 'some' && openRename(active.value.id)"
          >
            <Pencil class="size-4" />
            Rename
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="active.tag !== 'some'"
            @click="active.tag === 'some' && openDelete(active.value.id)"
          >
            <Trash2 class="size-4" />
            Delete
          </Button>

          <Separator orientation="vertical" class="mx-1 hidden h-6 sm:block" />

          <Button size="sm" variant="outline" @click="vaultStore.openLocalVault">
            <FolderOpen class="size-4" />
            Import vault
          </Button>

          <Button
            size="sm"
            :variant="view === ViewMode.Note ? 'secondary' : 'ghost'"
            :disabled="!ready"
            @click="vaultStore.setView(ViewMode.Note)"
          >
            <StickyNote class="size-4" />
            Note
          </Button>
          <Button
            size="sm"
            :variant="showPreview ? 'secondary' : 'ghost'"
            :disabled="!ready || view !== ViewMode.Note"
            @click="showPreview = !showPreview"
          >
            <Eye class="size-4" />
            Preview
          </Button>
          <Button
            size="sm"
            :variant="view === ViewMode.Graph ? 'secondary' : 'ghost'"
            :disabled="!ready"
            @click="vaultStore.setView(ViewMode.Graph)"
          >
            <Network class="size-4" />
            Graph
          </Button>
        </div>
      </header>

      <main v-if="ready" class="grid min-h-0 grid-cols-1 md:grid-cols-[280px_1fr]">
        <NoteSidebar
          :nodes="tree"
          :active-id="activeId"
          :active-folder="activeFolder"
          @select="vaultStore.setActive"
          @select-folder="vaultStore.setActiveFolder"
          @create-untitled="vaultStore.createUntitled"
          @create-named="openNamed"
          @create-folder="openFolderDialog"
          @rename="openRename"
          @delete="openDelete"
        />

        <section
          v-if="view === ViewMode.Note"
          :class="
            showPreview
              ? 'grid min-h-0 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1'
              : 'grid min-h-0'
          "
        >
          <template v-if="active.tag === 'some'">
            <div class="min-h-0 overflow-hidden" :class="showPreview ? 'border-b lg:border-r lg:border-b-0' : ''">
              <BlockNoteEditor
                :doc-key="docKey"
                :model-value="body"
                :note-ids="noteIds"
                :tags="tags"
                @update:model-value="vaultStore.updateBody"
                @navigate="vaultStore.openOrCreate"
              />
            </div>
            <div v-if="showPreview" class="min-h-0 overflow-hidden bg-card">
              <MarkdownPreview :body="body" :known="known" @navigate="vaultStore.openOrCreate" />
            </div>
          </template>
          <div v-else class="grid place-content-center gap-3 p-8 text-center">
            <p class="text-muted-foreground">Select a note or create a new one</p>
            <Button @click="vaultStore.createUntitled(activeFolder)">
              <FilePlus2 class="size-4" />
              New note
            </Button>
          </div>
        </section>

        <section v-else class="min-h-0">
          <GraphView :index="index" :active-id="activeId" @select="vaultStore.openOrCreate" />
        </section>
      </main>

      <main v-else class="grid place-content-center gap-4 px-6 py-16 text-center">
        <h1 class="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Your notes, locally
        </h1>
        <p class="mx-auto max-w-lg text-muted-foreground">
          Create hierarchical notes like Obsidian. Folders are real OPFS directories. Editing uses
          BlockNote; storage stays markdown for vault interop.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-2">
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
        <p v-if="status === VaultStatus.Failed" class="text-sm text-destructive">{{ message }}</p>
      </main>

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
