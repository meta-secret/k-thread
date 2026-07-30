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

const density = computed(() =>
  Math.min(100, Math.max(8, (props.backlinks.length + props.outlinks.length) * 12)),
)
const linkDensity = computed(() => Math.min(100, Math.max(8, props.outlinks.length * 14)))
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
        <div class="track"><i :style="{ width: `${density}%` }" /></div>
      </div>
      <div class="slider-row">
        <span>Links</span>
        <div class="track"><i :style="{ width: `${linkDensity}%` }" /></div>
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
  gap: 1.05rem;
  min-height: 0;
  width: min(15rem, 34vw);
  padding: 1.5rem 1.35rem 1.1rem 0.85rem;
  background: transparent;
  color: var(--kube-ink);
}

.head {
  display: flex;
  justify-content: flex-end;
}

.label,
.section-label {
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--kube-mute);
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
  border: 1px solid var(--kube-line-strong);
  background: transparent;
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease;
}

.cell.on,
.cell:hover {
  background: var(--kube-ink);
  border-color: var(--kube-ink);
  color: #f4f4f6;
}

.sliders {
  display: grid;
  gap: 0.7rem;
  padding: 0.1rem 0;
}

.slider-row {
  display: grid;
  gap: 0.35rem;
  font-size: 0.64rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--kube-mute);
}

.track {
  position: relative;
  height: 2px;
  background: rgba(18, 18, 20, 0.12);
}

.track i {
  display: block;
  height: 100%;
  background: var(--kube-ink);
}

.graph-jump {
  width: 100%;
  padding: 0.55rem 0.55rem;
  border: 1px solid var(--kube-line-strong);
  background: transparent;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease;
}

.graph-jump:hover {
  background: var(--kube-ink);
  color: #f4f4f6;
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
  color: var(--kube-mute);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list li {
  margin: 0.22rem 0;
  font-size: 0.84rem;
}

.link {
  border: none;
  background: none;
  padding: 0.1rem 0;
  color: var(--kube-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  font: inherit;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  font-family: var(--font-mono);
}

.slash {
  margin-right: 0.15rem;
  color: var(--kube-mute);
}
</style>
