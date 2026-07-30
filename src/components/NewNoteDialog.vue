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

const CreateKind = {
  Note: 'note',
  Folder: 'folder',
} as const
type CreateKind = (typeof CreateKind)[keyof typeof CreateKind]

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  kind: CreateKind
  folder: string
}>()

const name = ref('')
const error = ref('')

watch(open, async (isOpen) => {
  if (!isOpen) return
  name.value = ''
  error.value = ''
  await nextTick()
  const el = document.getElementById('create-name')
  if (el instanceof HTMLInputElement) {
    el.focus()
    el.select()
  }
})

const submit = async () => {
  if (props.kind === CreateKind.Folder) {
    const result = await vaultStore.createFolder(name.value, props.folder)
    if (result.tag === 'err') {
      error.value = result.error.detail
      return
    }
    open.value = false
    return
  }
  const result = vaultStore.createNote(name.value, props.folder)
  if (result.tag === 'err') {
    error.value = result.error.detail
    return
  }
  open.value = false
}

const title = () => (props.kind === CreateKind.Folder ? 'New folder' : 'New note')
const description = () =>
  props.folder.length > 0
    ? `Creating inside ${props.folder}`
    : 'Use slashes for nested paths, like Projects/Ideas'
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title() }}</DialogTitle>
        <DialogDescription>{{ description() }}</DialogDescription>
      </DialogHeader>

      <form class="grid gap-3" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="create-name">Name</Label>
          <Input id="create-name" v-model="name" placeholder="Untitled" autocomplete="off" />
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
