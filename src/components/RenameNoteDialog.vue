<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { vaultStore } from '@/lib/vaultStore'
import type { DocId } from '@/types'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  noteId: DocId
}>()

const name = ref('')
const error = ref('')

watch(open, async (isOpen) => {
  if (!isOpen) return
  name.value = props.noteId
  error.value = ''
  await nextTick()
  const el = document.getElementById('rename-note')
  if (el instanceof HTMLInputElement) {
    el.focus()
    el.select()
  }
})

const submit = async () => {
  const result = await vaultStore.renameNote(props.noteId, name.value)
  if (result.tag === 'err') {
    error.value = result.error.detail
    return
  }
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Rename note</DialogTitle>
        <DialogDescription>
          Change the note name or full path (e.g. <code class="rounded bg-muted px-1 text-xs">Projects/Ideas</code>).
          Wikilinks to this note are updated.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-3" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="rename-note">Name</Label>
          <Input id="rename-note" v-model="name" autocomplete="off" />
          <p v-if="error.length > 0" class="text-sm text-destructive">{{ error }}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Cancel</Button>
          <Button type="submit">Rename</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
