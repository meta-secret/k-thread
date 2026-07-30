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
  <aside class="rail" :class="{ graph: view === ViewMode.Graph }">
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
          <PanelLeft class="size-4" :stroke-width="1.5" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :class="{ on: view === ViewMode.Note }"
          title="Note"
          @click="emit('setView', ViewMode.Note)"
        >
          <StickyNote class="size-4" :stroke-width="1.5" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :class="{ on: view === ViewMode.Graph }"
          title="Graph"
          @click="emit('setView', ViewMode.Graph)"
        >
          <Network class="size-4" :stroke-width="1.5" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :class="{ on: showPreview }"
          title="Preview"
          :disabled="view !== ViewMode.Note"
          @click="emit('togglePreview')"
        >
          <Eye class="size-4" :stroke-width="1.5" />
        </button>
        <button type="button" class="icon-btn" title="Import vault" @click="emit('importVault')">
          <FolderOpen class="size-4" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <div class="tools">
      <div class="label">Tools</div>
      <button type="button" class="tool" @click="emit('createUntitled')">
        <FilePlus2 class="size-4" :stroke-width="1.5" />
        New note
      </button>
      <button type="button" class="tool" @click="emit('createNamed')">
        <FileText class="size-4" :stroke-width="1.5" />
        Named…
      </button>
      <button type="button" class="tool" @click="emit('createFolder')">
        <FolderPlus class="size-4" :stroke-width="1.5" />
        Folder…
      </button>
      <button type="button" class="tool" :disabled="!hasActive" @click="emit('rename')">
        <Pencil class="size-4" :stroke-width="1.5" />
        Rename
      </button>
      <button type="button" class="tool" :disabled="!hasActive" @click="emit('delete')">
        <Trash2 class="size-4" :stroke-width="1.5" />
        Delete
      </button>
    </div>
  </aside>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
  min-height: 0;
  padding: 1.5rem 1.05rem 1.1rem 1.25rem;
  background: transparent;
  color: var(--kube-ink);
}

.rail.graph {
  color: var(--hud-ink);
}

.forms-label,
.label {
  margin-bottom: 0.7rem;
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--kube-mute);
}

.rail.graph .forms-label,
.rail.graph .label {
  color: var(--hud-mute);
}

.forms-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 1px solid var(--kube-line-strong);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease,
    border-color 140ms ease;
}

.rail.graph .icon-btn {
  border-color: rgba(255, 255, 255, 0.28);
}

.icon-btn:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.icon-btn.on,
.icon-btn:hover:not(:disabled) {
  background: var(--kube-ink);
  border-color: var(--kube-ink);
  color: #f4f4f6;
}

.rail.graph .icon-btn.on,
.rail.graph .icon-btn:hover:not(:disabled) {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: #fff;
}

.tools {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 8.6rem;
}

.tool {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.tool:hover:not(:disabled) {
  background: rgba(18, 18, 20, 0.06);
}

.rail.graph .tool:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.tool:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.tool:active:not(:disabled) {
  background: var(--kube-ink);
  color: #f4f4f6;
}

.rail.graph .tool:active:not(:disabled) {
  background: var(--hud-accent);
  color: #fff;
}
</style>
