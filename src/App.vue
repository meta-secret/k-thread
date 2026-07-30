<script setup lang="ts">
import { FilePlus2, FolderOpen, Network, StickyNote } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GraphView from '@/components/GraphView.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import NewNoteDialog from '@/components/NewNoteDialog.vue'
import NoteSidebar from '@/components/NoteSidebar.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { vaultStore } from '@/lib/vaultStore'
import { VaultStatus, ViewMode } from '@/types'

const namedOpen = ref(false)

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
    namedOpen.value = true
    return
  }
  vaultStore.createUntitled()
}

const status = computed(() => vaultStore.state.status)
const message = computed(() => vaultStore.state.message)
const view = computed(() => vaultStore.state.view)
const docs = vaultStore.sortedDocs
const index = vaultStore.index
const known = vaultStore.knownIds
const active = vaultStore.activeDoc

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

        <p class="min-w-0 flex-1 truncate text-sm text-muted-foreground">{{ message }}</p>

        <div class="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="sm" @click="vaultStore.createUntitled">
                <FilePlus2 class="size-4" />
                New note
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create untitled note (⌘N)</TooltipContent>
          </Tooltip>

          <Button size="sm" variant="outline" @click="namedOpen = true">Named…</Button>

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
            :variant="view === ViewMode.Graph ? 'secondary' : 'ghost'"
            :disabled="!ready"
            @click="vaultStore.setView(ViewMode.Graph)"
          >
            <Network class="size-4" />
            Graph
          </Button>
        </div>
      </header>

      <main v-if="ready" class="grid min-h-0 grid-cols-1 md:grid-cols-[260px_1fr]">
        <NoteSidebar
          :docs="docs"
          :active-id="activeId"
          @select="vaultStore.setActive"
          @create-untitled="vaultStore.createUntitled"
          @create-named="namedOpen = true"
        />

        <section v-if="view === ViewMode.Note" class="grid min-h-0 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
          <template v-if="active.tag === 'some'">
            <div class="min-h-0 overflow-hidden border-b lg:border-r lg:border-b-0">
              <MarkdownEditor
                :doc-key="docKey"
                :model-value="body"
                @update:model-value="vaultStore.updateBody"
              />
            </div>
            <div class="min-h-0 overflow-hidden bg-card">
              <MarkdownPreview :body="body" :known="known" @navigate="vaultStore.openOrCreate" />
            </div>
          </template>
          <div v-else class="col-span-full grid place-content-center gap-3 p-8 text-center">
            <p class="text-muted-foreground">Select a note or create a new one</p>
            <Button @click="vaultStore.createUntitled">
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
          Create notes the way you would in Obsidian or Notion. Everything stays in your browser
          (OPFS). Optionally import an existing Obsidian vault.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" @click="vaultStore.createUntitled">
            <FilePlus2 class="size-4" />
            Create a note
          </Button>
          <Button size="lg" variant="outline" @click="namedOpen = true">Name a note…</Button>
          <Button size="lg" variant="ghost" @click="vaultStore.openLocalVault">
            <FolderOpen class="size-4" />
            Import vault
          </Button>
        </div>
        <p v-if="status === VaultStatus.Failed" class="text-sm text-destructive">{{ message }}</p>
        <p class="text-xs text-muted-foreground">Shortcuts: ⌘N new note · ⇧⌘N named note</p>
      </main>

      <NewNoteDialog v-model:open="namedOpen" />
    </div>
  </TooltipProvider>
</template>
