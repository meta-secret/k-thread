<script setup lang="ts">
import { createElement, type FunctionComponent } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { onBeforeUnmount, watch } from 'vue'
import { BlockNoteApp, type BlockNoteAppProps } from '@/editor/BlockNoteApp'
import { none, some, type Option } from '@/types'

const App = BlockNoteApp as FunctionComponent<BlockNoteAppProps>

const props = defineProps<{
  modelValue: string
  docKey: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

let host: Option<HTMLElement> = none
let root: Option<Root> = none

const render = () => {
  if (host.tag === 'none' || root.tag === 'none') return
  root.value.render(
    createElement(App, {
      docKey: props.docKey,
      markdown: props.modelValue,
      onChange: (markdown: string) => emit('update:modelValue', markdown),
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
</style>
