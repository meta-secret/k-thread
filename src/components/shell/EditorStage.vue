<script setup lang="ts">
import { FilePlus2 } from '@lucide/vue'
import BlockNoteEditor from '@/components/BlockNoteEditor.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
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
    <div class="atmosphere" aria-hidden="true">
      <div class="floor" />
      <div class="horizon" />
    </div>

    <div class="stage-body">
      <template v-if="hasActive">
        <div class="sheet" :class="{ split: showPreview }">
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
        <div class="hero" aria-hidden="true">
          <div class="cube">
            <span class="face front" />
            <span class="face top" />
            <span class="face side" />
          </div>
          <div class="orbit">
            <i class="seg" />
          </div>
        </div>
        <p class="empty-gauge">Ready · 0°</p>
        <p class="empty-copy">Create a note or open Files</p>
        <button type="button" class="empty-cta" @click="emit('createUntitled')">
          <FilePlus2 class="size-3.5" />
          New note
        </button>
      </div>
    </div>

    <div v-if="hasActive" class="gauge">
      <div class="orbit small" aria-hidden="true">
        <i class="seg" />
      </div>
      <p class="gauge-text">
        <span class="title">{{ title }}</span>
        <span class="sep">—</span>
        <span>{{ folder.length > 0 ? folder : 'root' }}</span>
        <span class="sep">·</span>
        <span>LNK {{ linkCount }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.stage {
  --kube-ink: #141414;
  --kube-mute: #6a6a6a;
  position: relative;
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  color: var(--kube-ink);
}

.atmosphere {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.floor {
  position: absolute;
  left: -20%;
  right: -20%;
  bottom: -8%;
  height: 62%;
  background:
    linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent 55%),
    repeating-linear-gradient(
      to right,
      rgba(20, 20, 20, 0.07) 0,
      rgba(20, 20, 20, 0.07) 1px,
      transparent 1px,
      transparent 72px
    ),
    repeating-linear-gradient(
      to bottom,
      rgba(20, 20, 20, 0.05) 0,
      rgba(20, 20, 20, 0.05) 1px,
      transparent 1px,
      transparent 72px
    );
  transform: perspective(700px) rotateX(62deg);
  transform-origin: center bottom;
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 88%);
}

.horizon {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 45% at 50% 38%, rgba(255, 255, 255, 0.35), transparent 70%);
}

.stage-body {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 0;
  place-items: stretch stretch;
  padding: 0.5rem 0.75rem 0;
}

.sheet {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: none;
}

.sheet.split {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
}

@media (min-width: 1100px) {
  .sheet.split {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }
}

.pane {
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.pane.preview {
  border-top: 1px solid rgba(20, 20, 20, 0.1);
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(8px);
}

@media (min-width: 1100px) {
  .pane.preview {
    border-top: none;
    border-left: 1px solid rgba(20, 20, 20, 0.1);
  }
}

.pane :deep(.blocknote-host) {
  background: transparent;
}

.pane :deep(.bn-container),
.pane :deep(.bn-editor) {
  background: transparent !important;
}

.pane :deep(.mantine-Paper-root),
.pane :deep(.bn-mantine) {
  background: transparent !important;
}

.empty {
  align-self: center;
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  text-align: center;
}

.hero {
  position: relative;
  width: 160px;
  height: 150px;
  margin-bottom: 0.25rem;
  perspective: 600px;
}

.cube {
  position: absolute;
  left: 50%;
  top: 28px;
  width: 72px;
  height: 72px;
  transform: translateX(-50%) rotateX(58deg) rotateZ(45deg);
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  inset: 0;
  border: 1.5px solid var(--kube-ink);
  background: rgba(255, 255, 255, 0.12);
}

.face.top {
  transform: rotateX(90deg) translateZ(36px);
  background: rgba(255, 255, 255, 0.2);
}

.face.side {
  transform: rotateY(90deg) translateZ(36px);
  background: rgba(0, 0, 0, 0.04);
}

.face.front {
  transform: translateZ(36px);
  box-shadow: 0 28px 36px rgba(0, 0, 0, 0.12);
}

.orbit {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 10px;
  height: 42px;
  border: 1.5px solid rgba(20, 20, 20, 0.85);
  border-radius: 50%;
  transform: rotateX(68deg);
}

.orbit .seg {
  position: absolute;
  left: 12%;
  top: -1.5px;
  width: 22%;
  height: 3px;
  background: var(--kube-ink);
  border-radius: 2px;
}

.orbit.small {
  position: relative;
  width: 88px;
  height: 22px;
  left: auto;
  right: auto;
  bottom: auto;
  margin: 0 auto 0.15rem;
  border-width: 1px;
  opacity: 0.85;
}

.orbit.small .seg {
  width: 28%;
  height: 2px;
  top: -1px;
}

.empty-gauge,
.gauge-text {
  margin: 0;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--kube-ink);
}

.empty-copy {
  margin: 0;
  font-size: 0.85rem;
  color: var(--kube-mute);
  letter-spacing: 0.04em;
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
  padding: 0.45rem 0.75rem;
  border: none;
  background: var(--kube-ink);
  color: #f4f4f4;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.gauge {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  padding: 0.2rem 1rem 1rem;
}

.gauge-text .title {
  font-weight: 600;
}

.gauge-text .sep {
  margin: 0 0.4rem;
  opacity: 0.45;
}
</style>
