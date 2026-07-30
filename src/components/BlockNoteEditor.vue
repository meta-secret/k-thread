<script setup lang="ts">
import { createElement, type FunctionComponent } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { onBeforeUnmount, watch } from 'vue'
import { BlockNoteApp, type BlockNoteAppProps } from '@/editor/BlockNoteApp'
import { none, some, type Option } from '@/types'

const props = defineProps<{
  modelValue: string
  docKey: string
  noteIds: readonly string[]
  tags: readonly string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  navigate: [target: string]
}>()

const App = BlockNoteApp as FunctionComponent<BlockNoteAppProps>

let host: Option<HTMLElement> = none
let root: Option<Root> = none

const render = () => {
  if (host.tag === 'none' || root.tag === 'none') return
  root.value.render(
    createElement(App, {
      docKey: props.docKey,
      markdown: props.modelValue,
      noteIds: props.noteIds,
      tags: props.tags,
      onChange: (markdown: string) => emit('update:modelValue', markdown),
      onNavigate: (target: string) => emit('navigate', target),
    }),
  )
}

const bindHost = (el: unknown) => {
  if (el instanceof HTMLElement) {
    if (host.tag === 'some' && host.value === el) return
    if (root.tag === 'some') {
      root.value.unmount()
    }
    host = some(el)
    root = some(createRoot(el))
    render()
    return
  }
  if (root.tag === 'some') {
    root.value.unmount()
    root = none
  }
  host = none
}

watch(
  () => props.docKey,
  () => {
    render()
  },
)

watch(
  () => [props.noteIds, props.tags] as const,
  () => {
    render()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (root.tag === 'some') {
    root.value.unmount()
    root = none
  }
  host = none
})
</script>

<template>
  <div :ref="bindHost" class="blocknote-host h-full min-h-0 overflow-auto" />
</template>

<style>
.blocknote-host {
  background: transparent;
}

.blocknote-host .bn-container,
.blocknote-host .bn-editor {
  height: 100%;
  min-height: 100%;
  background: transparent !important;
}

.blocknote-host .bn-editor {
  padding-inline: clamp(1.25rem, 4vw, 2.5rem);
  padding-block: 1.5rem 2rem;
  color: #141414;
}

.blocknote-host .obsidian-wikilink {
  display: inline;
  cursor: pointer;
  color: var(--primary);
  border-bottom: 1px solid color-mix(in oklch, var(--primary) 45%, transparent);
  border-radius: 2px;
  padding-inline: 0.1em;
}

.blocknote-host .obsidian-wikilink.is-missing {
  color: var(--destructive);
  border-bottom-style: dashed;
}

.blocknote-host .obsidian-wikilink.is-embed {
  background: color-mix(in oklch, var(--primary) 10%, transparent);
  padding-inline: 0.25em;
}

.blocknote-host .obsidian-tag {
  display: inline;
  color: color-mix(in oklch, var(--primary) 80%, oklch(0.45 0.08 250));
  background: color-mix(in oklch, var(--primary) 12%, transparent);
  border-radius: 999px;
  padding: 0.05em 0.45em;
  font-size: 0.92em;
}

.blocknote-host .obsidian-highlight,
.blocknote-host mark.obsidian-highlight {
  background: #ffe56a99;
  border-radius: 2px;
  padding-inline: 0.1em;
}

.blocknote-host .obsidian-comment {
  color: var(--muted-foreground);
  opacity: 0.7;
  font-style: italic;
  font-size: 0.9em;
}

.blocknote-host .obsidian-frontmatter,
.blocknote-host .obsidian-comment-block,
.blocknote-host .obsidian-plugin-code,
.blocknote-host .obsidian-callout {
  border: 1px solid var(--border);
  border-radius: 8px;
  margin: 0.4rem 0;
  overflow: hidden;
  background: var(--muted);
}

.blocknote-host .obsidian-frontmatter-label,
.blocknote-host .obsidian-comment-label,
.blocknote-host .obsidian-plugin-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.45rem 0.75rem;
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
}

.blocknote-host .obsidian-frontmatter-editor,
.blocknote-host .obsidian-comment-editor,
.blocknote-host .obsidian-plugin-editor,
.blocknote-host .obsidian-callout-body {
  width: 100%;
  min-height: 5rem;
  border: 0;
  resize: vertical;
  padding: 0.75rem;
  background: var(--card);
  color: var(--foreground);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.45;
  outline: none;
}

.blocknote-host .obsidian-callout {
  border-left-width: 4px;
}

.blocknote-host .obsidian-callout[data-callout-type='note'],
.blocknote-host .obsidian-callout[data-callout-type='info'] {
  border-left-color: #507aff;
}

.blocknote-host .obsidian-callout[data-callout-type='tip'],
.blocknote-host .obsidian-callout[data-callout-type='success'] {
  border-left-color: #0bc10b;
}

.blocknote-host .obsidian-callout[data-callout-type='warning'] {
  border-left-color: #e69819;
}

.blocknote-host .obsidian-callout[data-callout-type='danger'],
.blocknote-host .obsidian-callout[data-callout-type='failure'],
.blocknote-host .obsidian-callout[data-callout-type='bug'] {
  border-left-color: #d80d0d;
}

.blocknote-host .obsidian-callout-header {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in oklch, var(--muted) 70%, transparent);
}

.blocknote-host .obsidian-callout-type,
.blocknote-host .obsidian-callout-title {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card);
  color: var(--foreground);
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
}

.blocknote-host .obsidian-callout-title {
  flex: 1;
}
</style>
