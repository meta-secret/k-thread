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
  <div :ref="bindHost" class="blocknote-host h-full min-h-0 overflow-auto bg-card" />
</template>

<style>
.blocknote-host .bn-container,
.blocknote-host .bn-editor {
  height: 100%;
  min-height: 100%;
}

.blocknote-host .bn-editor {
  padding-inline: 1.25rem;
  padding-block: 1rem;
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
</style>
