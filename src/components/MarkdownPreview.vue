<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../lib/markdown'
import type { DocId } from '../types'

const props = defineProps<{
  body: string
  known: ReadonlySet<DocId>
}>()

const emit = defineEmits<{
  navigate: [id: DocId]
}>()

const html = computed(() => renderMarkdown(props.body, props.known))

const onClick = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const link = target.closest('a.wiki-link')
  if (!(link instanceof HTMLElement)) return
  const id = link.dataset.wiki
  if (typeof id !== 'string' || id.length === 0) return
  event.preventDefault()
  emit('navigate', id)
}
</script>

<template>
  <article class="preview" v-html="html" @click="onClick" />
</template>

<style scoped>
.preview {
  height: 100%;
  overflow: auto;
  padding: 1.5rem 1.75rem;
  font-family: var(--font-serif);
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--ink);
}

.preview :deep(h1),
.preview :deep(h2),
.preview :deep(h3) {
  font-family: var(--font-sans);
  font-weight: 600;
  line-height: 1.25;
  margin: 1.4em 0 0.5em;
}

.preview :deep(h1) {
  font-size: 1.8rem;
  margin-top: 0;
}

.preview :deep(p),
.preview :deep(ul),
.preview :deep(ol) {
  margin: 0.75em 0;
}

.preview :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-muted);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

.preview :deep(pre) {
  background: var(--bg-muted);
  padding: 0.9rem 1rem;
  overflow: auto;
  border-radius: 4px;
}

.preview :deep(pre code) {
  background: transparent;
  padding: 0;
}

.preview :deep(a.wiki-link) {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
}

.preview :deep(a.wiki-link.is-missing) {
  color: var(--warn);
  border-bottom-style: dashed;
}

.preview :deep(a:not(.wiki-link)) {
  color: var(--accent-2);
}
</style>
