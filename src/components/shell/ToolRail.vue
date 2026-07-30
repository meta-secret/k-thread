<script setup lang="ts">
import {
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderPlus,
  Network,
  PanelLeft,
  Pencil,
  StickyNote,
  Trash2,
} from '@lucide/vue'
import { ViewMode, type ViewMode as ViewModeT } from '@/types'

defineProps<{
  view: ViewModeT
  showPreview: boolean
  hasActive: boolean
  filesOpen: boolean
}>()

const emit = defineEmits<{
  setView: [view: ViewModeT]
  togglePreview: []
  toggleFiles: []
  importVault: []
  createUntitled: []
  createNamed: []
  createFolder: []
  rename: []
  delete: []
}>()
</script>

<template>
  <aside class="rail">
    <div class="forms">
      <button
        type="button"
        class="icon-btn"
        :class="{ on: filesOpen }"
        title="Files"
        @click="emit('toggleFiles')"
      >
        <PanelLeft class="size-4" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :class="{ on: view === ViewMode.Note }"
        title="Note"
        @click="emit('setView', ViewMode.Note)"
      >
        <StickyNote class="size-4" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :class="{ on: view === ViewMode.Graph }"
        title="Graph"
        @click="emit('setView', ViewMode.Graph)"
      >
        <Network class="size-4" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :class="{ on: showPreview }"
        title="Preview"
        :disabled="view !== ViewMode.Note"
        @click="emit('togglePreview')"
      >
        <Eye class="size-4" />
      </button>
      <button type="button" class="icon-btn" title="Import vault" @click="emit('importVault')">
        <FolderOpen class="size-4" />
      </button>
    </div>

    <div class="tools">
      <div class="label">Tools</div>
      <button type="button" class="tool" @click="emit('createUntitled')">
        <FilePlus2 class="size-4" />
        New note
      </button>
      <button type="button" class="tool" @click="emit('createNamed')">
        <FileText class="size-4" />
        Named…
      </button>
      <button type="button" class="tool" @click="emit('createFolder')">
        <FolderPlus class="size-4" />
        Folder…
      </button>
      <button type="button" class="tool" :disabled="!hasActive" @click="emit('rename')">
        <Pencil class="size-4" />
        Rename
      </button>
      <button type="button" class="tool" :disabled="!hasActive" @click="emit('delete')">
        <Trash2 class="size-4" />
        Delete
      </button>
    </div>
  </aside>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 0;
  padding: 0.85rem 0.65rem;
  border-right: 1px solid #c8c8c8;
  background: #d6d6d6;
  color: #111;
}

.forms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #222;
  background: transparent;
  color: #111;
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.icon-btn.on {
  background: #111;
  color: #f2f2f2;
}

.tools {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 7.5rem;
}

.label {
  margin-bottom: 0.35rem;
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #555;
}

.tool {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.45rem;
  border: none;
  background: transparent;
  color: #111;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
}

.tool:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}

.tool:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tool:active:not(:disabled) {
  background: #111;
  color: #f2f2f2;
}
</style>
