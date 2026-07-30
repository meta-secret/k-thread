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
    <!-- Primary: where am I / what am I looking at -->
    <div class="nav">
      <div class="section-label">View</div>
      <div class="nav-row">
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
          :class="{ on: view === ViewMode.Note && !filesOpen }"
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
      </div>
    </div>

    <!-- Secondary: create — compact, not the first thing in the eye path -->
    <div class="create">
      <div class="section-label">Create</div>
      <button type="button" class="tool primary" @click="emit('createUntitled')">
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
    </div>

    <!-- Tertiary: manage -->
    <div class="manage">
      <div class="section-label">Manage</div>
      <button type="button" class="tool" @click="emit('importVault')">
        <FolderOpen class="size-4" :stroke-width="1.5" />
        Import
      </button>
      <button type="button" class="tool" :disabled="!hasActive" @click="emit('rename')">
        <Pencil class="size-4" :stroke-width="1.5" />
        Rename
      </button>
      <button type="button" class="tool danger" :disabled="!hasActive" @click="emit('delete')">
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
  gap: 1.75rem;
  min-height: 0;
  padding: 1.5rem 1.05rem 1.1rem 1.25rem;
  background: transparent;
  color: var(--kube-ink);
}

.section-label {
  margin-bottom: 0.55rem;
  font-size: 0.6rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--kube-mute);
}

.nav-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--kube-line-strong);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease,
    border-color 140ms ease;
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

.create,
.manage {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 8.6rem;
}

.manage {
  margin-top: auto;
  opacity: 0.92;
}

.tool {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.42rem 0.5rem;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.tool.primary {
  font-weight: 550;
}

.tool:hover:not(:disabled) {
  background: rgba(18, 18, 20, 0.06);
}

.tool:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.tool:active:not(:disabled) {
  background: var(--kube-ink);
  color: #f4f4f6;
}

.tool.danger:hover:not(:disabled) {
  background: rgba(192, 35, 35, 0.08);
  color: #9a1a1a;
}
</style>
