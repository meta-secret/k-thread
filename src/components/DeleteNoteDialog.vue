<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { vaultStore } from '@/lib/vaultStore'
import type { DocId } from '@/types'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  noteId: DocId
  noteTitle: string
}>()

const error = ref('')

watch(open, (isOpen) => {
  if (isOpen) error.value = ''
})

const confirm = async () => {
  const result = await vaultStore.deleteNote(props.noteId)
  if (result.tag === 'err') {
    error.value = result.error.detail
    return
  }
  open.value = false
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete note?</AlertDialogTitle>
        <AlertDialogDescription>
          Delete <span class="font-medium text-foreground">{{ noteTitle }}</span>
          (<code class="rounded bg-muted px-1 text-xs">{{ noteId }}</code>). This removes it from OPFS
          and cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <p v-if="error.length > 0" class="text-sm text-destructive">{{ error }}</p>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          @click.prevent="confirm"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
