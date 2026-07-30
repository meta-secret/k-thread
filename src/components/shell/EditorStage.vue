<script setup lang="ts">
import { FilePlus2 } from '@lucide/vue'
import BlockNoteEditor from '@/components/BlockNoteEditor.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import { Button } from '@/components/ui/button'
import type { DocId } from '@/types'

defineProps<{
  hasActive: boolean
  docKey: string
  body: string
  noteIds: readonly DocId[]
  tags: readonly string[]
  title: string
  folder: string
  linkCount: number
  showPreview: boolean
  known: ReadonlySet<DocId>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  navigate: [id: DocId]
  createUntitled: []
}>()
</script>

<template>
  <section class="stage">
    <div class="stage-frame">
      <template v-if="hasActive">
        <div class="editor-wrap" :class="{ split: showPreview }">
          <div class="pane">
            <BlockNoteEditor
              :doc-key="docKey"
              :model-value="body"
              :note-ids="noteIds"
              :tags="tags"
              @update:model-value="emit('update:modelValue', $event)"
              @navigate="emit('navigate', $event)"
            />
          </div>
          <div v-if="showPreview" class="pane preview">
            <MarkdownPreview :body="body" :known="known" @navigate="emit('navigate', $event)" />
          </div>
        </div>
      </template>
      <div v-else class="empty">
        <div class="wireframe" aria-hidden="true">
          <div class="cube" />
          <div class="ring" />
        </div>
        <p class="empty-title">No note on stage</p>
        <p class="empty-copy">Create a note or open Files to begin.</p>
        <Button class="empty-btn" @click="emit('createUntitled')">
          <FilePlus2 class="size-4" />
          New note
        </Button>
      </div>
    </div>

    <div v-if="hasActive" class="status">
      <span class="title">{{ title }}</span>
      <span class="dot">·</span>
      <span>{{ folder.length > 0 ? folder : 'root' }}</span>
      <span class="dot">·</span>
      <span>LNK {{ linkCount }}</span>
    </div>
  </section>
</template>

<style scoped>
.stage {
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 0;
  min-width: 0;
  background:
    linear-gradient(to bottom, #cfcfcf 0%, #bdbdbd 55%, #b0b0b0 100%);
}

.stage-frame {
  position: relative;
  min-height: 0;
  margin: 0.75rem;
  border: 1px solid #8e8e8e;
  background:
    linear-gradient(#0000 24px, rgba(0, 0, 0, 0.04) 25px) 0 0 / 100% 25px,
    linear-gradient(90deg, #0000 24px, rgba(0, 0, 0, 0.04) 25px) 0 0 / 25px 100%,
    #d8d8d8;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.editor-wrap {
  display: grid;
  height: 100%;
  min-height: 0;
}

.editor-wrap.split {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
}

@media (min-width: 1024px) {
  .editor-wrap.split {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }
}

.pane {
  min-height: 0;
  overflow: hidden;
  background: #f4f4f4;
}

.pane.preview {
  border-top: 1px solid #b0b0b0;
}

@media (min-width: 1024px) {
  .pane.preview {
    border-top: none;
    border-left: 1px solid #b0b0b0;
  }
}

.empty {
  display: grid;
  place-content: center;
  gap: 0.65rem;
  height: 100%;
  text-align: center;
  color: #222;
}

.wireframe {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 0.5rem;
}

.cube {
  position: absolute;
  inset: 22px;
  border: 1.5px solid #111;
  transform: rotateX(60deg) rotateZ(45deg);
  box-shadow: 0 18px 24px rgba(0, 0, 0, 0.18);
}

.ring {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 8px;
  height: 36px;
  border: 1.5px solid #111;
  border-radius: 50%;
  opacity: 0.7;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.empty-copy {
  font-size: 0.85rem;
  color: #555;
}

.empty-btn {
  justify-self: center;
  background: #111;
  color: #f2f2f2;
}

.status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.75rem 0.7rem;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: #333;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.status .title {
  font-weight: 700;
  color: #111;
}

.status .dot {
  opacity: 0.5;
}
</style>
