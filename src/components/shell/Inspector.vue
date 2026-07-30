<script setup lang="ts">
import { computed, ref } from 'vue'
import { labelOf } from '@/lib/graphView'
import type { DocId } from '@/types'

const Panel = {
  Tags: 'tags',
  Backlinks: 'backlinks',
  Outlinks: 'outlinks',
} as const
type Panel = (typeof Panel)[keyof typeof Panel]

const props = defineProps<{
  activeId: DocId | ''
  folder: string
  tags: readonly string[]
  backlinks: readonly DocId[]
  outlinks: readonly DocId[]
  showPreview: boolean
}>()

const emit = defineEmits<{
  navigate: [id: DocId]
  openGraph: []
  togglePreview: []
}>()

const panel = ref<Panel>(Panel.Backlinks)

const crumbs = computed(() => {
  if (props.activeId.length === 0) return [] as string[]
  return props.activeId.split('/')
})
</script>

<template>
  <aside class="inspector">
    <div class="grid2">
      <button
        type="button"
        class="cell"
        :class="{ on: panel === Panel.Tags }"
        @click="panel = Panel.Tags"
      >
        Tags
      </button>
      <button
        type="button"
        class="cell"
        :class="{ on: panel === Panel.Backlinks }"
        @click="panel = Panel.Backlinks"
      >
        Backlinks
      </button>
      <button
        type="button"
        class="cell"
        :class="{ on: panel === Panel.Outlinks }"
        @click="panel = Panel.Outlinks"
      >
        Links
      </button>
      <button type="button" class="cell" :class="{ on: showPreview }" @click="emit('togglePreview')">
        Preview
      </button>
    </div>

    <button type="button" class="graph-jump" @click="emit('openGraph')">Open graph focus</button>

    <div class="body">
      <template v-if="panel === Panel.Tags">
        <div class="section-label">Tags</div>
        <p v-if="tags.length === 0" class="empty">No tags in this note</p>
        <ul v-else class="list">
          <li v-for="tag in tags" :key="tag">#{{ tag }}</li>
        </ul>
      </template>

      <template v-else-if="panel === Panel.Backlinks">
        <div class="section-label">Backlinks · {{ backlinks.length }}</div>
        <p v-if="backlinks.length === 0" class="empty">No backlinks</p>
        <ul v-else class="list">
          <li v-for="id in backlinks" :key="id">
            <button type="button" class="link" @click="emit('navigate', id)">
              {{ labelOf(id) }}
            </button>
          </li>
        </ul>
      </template>

      <template v-else>
        <div class="section-label">Outgoing · {{ outlinks.length }}</div>
        <p v-if="outlinks.length === 0" class="empty">No outgoing links</p>
        <ul v-else class="list">
          <li v-for="id in outlinks" :key="id">
            <button type="button" class="link" @click="emit('navigate', id)">
              {{ labelOf(id) }}
            </button>
          </li>
        </ul>
      </template>

      <div class="section-label path-label">Path</div>
      <p v-if="activeId.length === 0" class="empty">No note selected</p>
      <div v-else class="crumbs">
        <span v-if="folder.length === 0" class="crumb muted">root</span>
        <span v-for="(part, i) in crumbs" :key="`${part}-${i}`" class="crumb">
          <span v-if="i > 0" class="slash">/</span>{{ part }}
        </span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  min-width: 12rem;
  padding: 0.85rem 0.75rem;
  border-left: 1px solid #c8c8c8;
  background: #d6d6d6;
  color: #111;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.cell {
  display: grid;
  place-items: center;
  min-height: 2.4rem;
  border: 1px solid #222;
  background: transparent;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.cell.on {
  background: #111;
  color: #f2f2f2;
}

.graph-jump {
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: 1px solid #222;
  background: transparent;
  font-size: 0.75rem;
  cursor: pointer;
}

.graph-jump:hover {
  background: #111;
  color: #f2f2f2;
}

.body {
  min-height: 0;
  overflow: auto;
  flex: 1;
}

.section-label {
  margin: 0.4rem 0 0.35rem;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #555;
}

.path-label {
  margin-top: 1rem;
}

.empty {
  font-size: 0.8rem;
  color: #666;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list li {
  margin: 0.15rem 0;
  font-size: 0.82rem;
}

.link {
  border: none;
  background: none;
  padding: 0.15rem 0;
  color: #111;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font: inherit;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
  font-size: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.crumb.muted {
  color: #666;
}

.slash {
  margin-right: 0.15rem;
  color: #888;
}
</style>
