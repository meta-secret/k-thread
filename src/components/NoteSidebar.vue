<script setup lang="ts">
import type { Doc, DocId } from '../types'

defineProps<{
  docs: readonly Doc[]
  activeId: DocId | ''
}>()

defineEmits<{
  select: [id: DocId]
}>()
</script>

<template>
  <aside class="sidebar">
    <div class="heading">Notes</div>
    <ul>
      <li v-for="doc in docs" :key="doc.id">
        <button
          type="button"
          :class="{ active: doc.id === activeId }"
          @click="$emit('select', doc.id)"
        >
          <span class="title">{{ doc.title }}</span>
          <span v-if="doc.id.includes('/')" class="path">{{ doc.id }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--line);
  background: var(--bg-panel);
}

.heading {
  padding: 0.85rem 1rem 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0 0.4rem 1rem;
  overflow: auto;
}

button {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: 0.45rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-sans);
}

button:hover {
  background: var(--bg-muted);
}

button.active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.title {
  font-size: 0.92rem;
  font-weight: 500;
}

.path {
  font-size: 0.72rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
