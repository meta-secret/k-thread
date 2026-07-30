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

const open = defineModel<boolean>('open', { required: true })

const name = ref('')
const error = ref('')

watch(open, async (isOpen) => {
  if (!isOpen) return
  name.value = ''
  error.value = ''
  await nextTick()
  const el = document.getElementById('note-name')
  if (el instanceof HTMLInputElement) {
    el.focus()
    el.select()
  }
})

const submit = () => {
  const result = vaultStore.createNote(name.value)
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
        <DialogTitle>New note</DialogTitle>
        <DialogDescription>
          Name your note. Use folders with slashes, like
          <code class="rounded bg-muted px-1 py-0.5 text-xs">Projects/Ideas</code>.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-3" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="note-name">Name</Label>
          <Input
            id="note-name"
            v-model="name"
            placeholder="Untitled"
            autocomplete="off"
          />
          <p v-if="error.length > 0" class="text-sm text-destructive">{{ error }}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Cancel</Button>
          <Button type="submit">Create</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
