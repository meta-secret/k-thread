<script setup lang="ts">
import { FilePlus2, FileText, FolderPlus, Plus } from '@lucide/vue'
import { reactive } from 'vue'
import NoteTreeNode from '@/components/NoteTreeNode.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { TreeFolder, TreeNode } from '@/lib/tree'
import type { DocId } from '@/types'

defineProps<{
  nodes: readonly TreeNode[]
  activeId: DocId | ''
  activeFolder: string
}>()

const emit = defineEmits<{
  select: [id: DocId]
  selectFolder: [folder: string]
  createUntitled: [folder: string]
  createNamed: [folder: string]
  createFolder: [folder: string]
  rename: [id: DocId]
  delete: [id: DocId]
}>()

const openFolders = reactive<Record<string, boolean>>({})

const onToggle = (folder: TreeFolder, open: boolean) => {
  openFolders[folder.path] = open
}
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r bg-sidebar text-sidebar-foreground">
    <div class="flex items-center justify-between gap-2 px-3 py-3">
      <div class="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Notes
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="icon-sm" variant="outline" aria-label="Create">
            <Plus class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem @click="emit('createUntitled', activeFolder)">
            <FilePlus2 class="size-4" />
            New note
            <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('createNamed', activeFolder)">
            <FileText class="size-4" />
            New named note…
            <DropdownMenuShortcut>⇧⌘N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('createFolder', activeFolder)">
            <FolderPlus class="size-4" />
            New folder…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <Separator />

    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-0.5 p-2">
        <NoteTreeNode
          v-for="node in nodes"
          :key="node.kind === 'folder' ? node.path : node.id"
          :node="node"
          :depth="0"
          :active-id="activeId"
          :active-folder="activeFolder"
          :open-folders="openFolders"
          @toggle="onToggle"
          @select="emit('select', $event)"
          @select-folder="emit('selectFolder', $event)"
          @create-untitled="emit('createUntitled', $event)"
          @create-named="emit('createNamed', $event)"
          @create-folder="emit('createFolder', $event)"
          @rename="emit('rename', $event)"
          @delete="emit('delete', $event)"
        />
        <p v-if="nodes.length === 0" class="px-2.5 py-6 text-center text-sm text-muted-foreground">
          No notes yet
        </p>
      </div>
    </ScrollArea>
  </aside>
</template>
