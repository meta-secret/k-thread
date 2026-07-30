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
      <div class="forms-label">Forms</div>
      <div class="forms-row">
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
  gap: 2rem;
  min-height: 0;
  padding: 1.4rem 1rem 1rem 1.15rem;
  background: transparent;
  color: #141414;
}

.forms-label,
.label {
  margin-bottom: 0.65rem;
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #7a7a7a;
}

.forms-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 1px solid rgba(20, 20, 20, 0.55);
  background: transparent;
  color: #141414;
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.icon-btn.on {
  background: #141414;
  border-color: #141414;
  color: #f2f2f2;
}

.tools {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 8.5rem;
}

.tool {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.42rem 0.5rem;
  border: none;
  background: transparent;
  color: #141414;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-align: left;
  cursor: pointer;
}

.tool:hover:not(:disabled) {
  background: rgba(20, 20, 20, 0.05);
}

.tool:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.tool:focus-visible {
  outline: 1px solid #141414;
}

/* solid black active block — pressed / keyboard */
.tool:active:not(:disabled) {
  background: #141414;
  color: #f2f2f2;
}
</style>
