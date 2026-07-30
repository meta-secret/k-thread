<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { none, some, type Option } from '../types'

const props = defineProps<{
  modelValue: string
  docKey: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

let host: Option<HTMLElement> = none
let view: Option<EditorView> = none

const bindHost = (el: unknown) => {
  host = el instanceof HTMLElement ? some(el) : none
  if (host.tag === 'some' && view.tag === 'none') {
    mountEditor(host.value, props.modelValue)
  }
}

const mountEditor = (el: HTMLElement, doc: string) => {
  if (view.tag === 'some') {
    view.value.destroy()
  }
  view = some(
    new EditorView({
      parent: el,
      state: EditorState.create({
        doc,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              emit('update:modelValue', update.state.doc.toString())
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '15px',
            },
            '.cm-scroller': {
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.55',
            },
            '&.cm-focused': {
              outline: 'none',
            },
          }),
        ],
      }),
    }),
  )
}

watch(
  () => props.docKey,
  () => {
    if (host.tag === 'some') {
      mountEditor(host.value, props.modelValue)
    }
  },
)

onBeforeUnmount(() => {
  if (view.tag === 'some') {
    view.value.destroy()
    view = none
  }
})
</script>

<template>
  <div :ref="bindHost" class="editor" />
</template>

<style scoped>
.editor {
  height: 100%;
  overflow: auto;
  background: var(--bg-editor);
}
</style>
