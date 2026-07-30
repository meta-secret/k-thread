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
    <div class="head">
      <span class="label">Context</span>
    </div>

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

    <div class="sliders">
      <div class="slider-row">
        <span>Density</span>
        <div class="track"><i :style="{ width: `${Math.min(100, (backlinks.length + outlinks.length) * 12)}%` }" /></div>
      </div>
      <div class="slider-row">
        <span>Links</span>
        <div class="track"><i :style="{ width: `${Math.min(100, outlinks.length * 14)}%` }" /></div>
      </div>
    </div>

    <button type="button" class="graph-jump" @click="emit('openGraph')">Graph focus</button>

    <div class="body">
      <template v-if="panel === Panel.Tags">
        <div class="section-label">Tags</div>
        <p v-if="tags.length === 0" class="empty">No tags</p>
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
      <p v-if="activeId.length === 0" class="empty">No note</p>
      <div v-else class="crumbs">
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
  gap: 1rem;
  min-height: 0;
  width: min(15rem, 34vw);
  padding: 1.4rem 1.25rem 1rem 0.75rem;
  background: transparent;
  color: #141414;
}

.head {
  display: flex;
  justify-content: flex-end;
}

.label,
.section-label {
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #7a7a7a;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.cell {
  display: grid;
  place-items: center;
  min-height: 2.55rem;
  border: 1px solid rgba(20, 20, 20, 0.55);
  background: transparent;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

.cell.on {
  background: #141414;
  border-color: #141414;
  color: #f2f2f2;
}

.sliders {
  display: grid;
  gap: 0.65rem;
  padding: 0.15rem 0;
}

.slider-row {
  display: grid;
  gap: 0.3rem;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a5a5a;
}

.track {
  position: relative;
  height: 2px;
  background: rgba(20, 20, 20, 0.15);
}

.track i {
  display: block;
  height: 100%;
  background: #141414;
  min-width: 8%;
}

.graph-jump {
  width: 100%;
  padding: 0.5rem 0.55rem;
  border: 1px solid rgba(20, 20, 20, 0.55);
  background: transparent;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.graph-jump:hover {
  background: #141414;
  color: #f2f2f2;
}

.body {
  min-height: 0;
  overflow: auto;
  flex: 1;
}

.section-label {
  margin: 0.55rem 0 0.4rem;
}

.path-label {
  margin-top: 1.25rem;
}

.empty {
  font-size: 0.8rem;
  color: #7a7a7a;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list li {
  margin: 0.2rem 0;
  font-size: 0.84rem;
}

.link {
  border: none;
  background: none;
  padding: 0.1rem 0;
  color: #141414;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  font: inherit;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
}

.slash {
  margin-right: 0.15rem;
  color: #999;
}
</style>
