<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  folderPath: string
}>()

const error = ref('')

const folderName = computed(() => {
  const parts = props.folderPath.split('/')
  return parts[parts.length - 1] ?? props.folderPath
})

const noteCount = computed(
  () =>
    vaultStore.state.docs.filter(
      (d) => d.id === props.folderPath || d.id.startsWith(`${props.folderPath}/`),
    ).length,
)

watch(open, (isOpen) => {
  if (isOpen) error.value = ''
})

const confirm = async () => {
  const result = await vaultStore.deleteFolder(props.folderPath)
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
        <AlertDialogTitle>Delete folder?</AlertDialogTitle>
        <AlertDialogDescription>
          Delete
          <span class="font-medium text-foreground">{{ folderName }}</span>
          (<code class="rounded bg-muted px-1 text-xs">{{ folderPath }}</code>)
          and all notes inside
          <template v-if="noteCount > 0"> ({{ noteCount }})</template>. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <p v-if="error.length > 0" class="text-sm text-destructive">{{ error }}</p>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          @click.prevent="confirm"
        >
          Delete folder
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
