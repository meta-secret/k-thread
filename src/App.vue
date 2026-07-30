<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GraphView from './components/GraphView.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import NoteSidebar from './components/NoteSidebar.vue'
import { vaultStore } from './lib/vaultStore'
import { VaultStatus, ViewMode } from './types'

onMounted(() => {
  void vaultStore.hydrateFromOpfs()
})

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
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">
        <span class="mark">k</span>
        <span class="name">k-thread</span>
      </div>
      <p class="status">{{ message }}</p>
      <div class="actions">
        <button type="button" class="primary" @click="vaultStore.openLocalVault">
          Open vault
        </button>
        <button
          type="button"
          :class="{ active: view === ViewMode.Note }"
          :disabled="status !== VaultStatus.Ready"
          @click="vaultStore.setView(ViewMode.Note)"
        >
          Note
        </button>
        <button
          type="button"
          :class="{ active: view === ViewMode.Graph }"
          :disabled="status !== VaultStatus.Ready"
          @click="vaultStore.setView(ViewMode.Graph)"
        >
          Graph
        </button>
      </div>
    </header>

    <main v-if="status === VaultStatus.Ready" class="main">
      <NoteSidebar :docs="docs" :active-id="activeId" @select="vaultStore.setActive" />

      <section v-if="view === ViewMode.Note" class="workspace">
        <template v-if="active.tag === 'some'">
          <div class="pane">
            <MarkdownEditor
              :doc-key="docKey"
              :model-value="body"
              @update:model-value="vaultStore.updateBody"
            />
          </div>
          <div class="pane preview-pane">
            <MarkdownPreview :body="body" :known="known" @navigate="vaultStore.openOrCreate" />
          </div>
        </template>
        <p v-else class="empty">Select a note</p>
      </section>

      <section v-else class="graph-pane">
        <GraphView :index="index" :active-id="activeId" @select="vaultStore.openOrCreate" />
      </section>
    </main>

    <main v-else class="empty-state">
      <h1>Local-first notes</h1>
      <p>
        Open an Obsidian vault from your disk. Notes are copied into OPFS, wikilinks become a graph,
        and <code>index.yaml</code> stays in sync.
      </p>
      <button type="button" class="primary large" @click="vaultStore.openLocalVault">
        Open local vault
      </button>
      <p v-if="status === VaultStatus.Failed" class="error">{{ message }}</p>
    </main>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  background: var(--bg);
  color: var(--ink);
}

.top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-panel) 88%, transparent);
  backdrop-filter: blur(8px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.mark {
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: var(--accent);
  color: var(--bg);
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.95rem;
}

.name {
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.status {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 0.4rem;
}

button {
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  border-color: var(--ink-muted);
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

button.active {
  border-color: var(--accent);
  color: var(--accent);
}

button.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}

button.large {
  margin-top: 0.5rem;
  padding: 0.7rem 1.1rem;
  font-size: 0.95rem;
}

.main {
  min-height: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
}

.workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.pane {
  min-height: 0;
  overflow: hidden;
}

.preview-pane {
  border-left: 1px solid var(--line);
}

.graph-pane {
  min-height: 0;
}

.empty,
.empty-state {
  display: grid;
  place-content: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
}

.empty-state h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.empty-state p {
  margin: 0;
  max-width: 34rem;
  color: var(--ink-muted);
  line-height: 1.55;
}

.empty-state code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.error {
  color: var(--warn);
}

@media (max-width: 860px) {
  .main {
    grid-template-columns: 1fr;
  }

  .workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .preview-pane {
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .top {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}
</style>
