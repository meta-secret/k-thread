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
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);
}

.preview :deep(a.wiki-link.is-missing) {
  color: var(--destructive);
  border-bottom-style: dashed;
}

.preview :deep(a.wiki-link.is-embed) {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding-inline: 0.25em;
  border-radius: 3px;
}

.preview :deep(a:not(.wiki-link)) {
  color: var(--accent-2);
}

.preview :deep(.obsidian-tag) {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-radius: 999px;
  padding: 0.05em 0.45em;
  font-size: 0.92em;
}

.preview :deep(.obsidian-highlight) {
  background: #ffe56a99;
  border-radius: 2px;
  padding-inline: 0.1em;
}

.preview :deep(.obsidian-comment) {
  color: var(--ink-muted);
  font-style: italic;
  opacity: 0.75;
}

.preview :deep(.obsidian-frontmatter),
.preview :deep(.obsidian-plugin),
.preview :deep(.obsidian-comment-block),
.preview :deep(.obsidian-callout) {
  border: 1px solid var(--line);
  border-radius: 8px;
  margin: 1rem 0;
  overflow: hidden;
  background: var(--bg-muted);
}

.preview :deep(.obsidian-frontmatter .label),
.preview :deep(.obsidian-plugin .label),
.preview :deep(.obsidian-comment-block .label),
.preview :deep(.obsidian-callout-title) {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.45rem 0.75rem;
  color: var(--ink-muted);
  border-bottom: 1px solid var(--line);
}

.preview :deep(.obsidian-frontmatter pre),
.preview :deep(.obsidian-plugin pre),
.preview :deep(.obsidian-comment-block pre),
.preview :deep(.obsidian-callout-body) {
  margin: 0;
  padding: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.preview :deep(.obsidian-callout) {
  border-left-width: 4px;
}
</style>
