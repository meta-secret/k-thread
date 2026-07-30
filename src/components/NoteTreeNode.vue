<script setup lang="ts">
import {
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
} from '@lucide/vue'
import { computed } from 'vue'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { TreeFolder, TreeNode } from '@/lib/tree'
import type { DocId } from '@/types'

const props = defineProps<{
  node: TreeNode
  depth: number
  activeId: DocId | ''
  activeFolder: string
  openFolders: Record<string, boolean>
}>()

const emit = defineEmits<{
  toggle: [folder: TreeFolder, open: boolean]
  select: [id: DocId]
  selectFolder: [folder: string]
  createUntitled: [folder: string]
  createNamed: [folder: string]
  createFolder: [folder: string]
  rename: [id: DocId]
  delete: [id: DocId]
  deleteFolder: [folder: string]
}>()

const padStyle = computed(() => ({ paddingLeft: `${0.5 + props.depth * 0.75}rem` }))

const folderOpen = computed(() => {
  if (props.node.kind !== 'folder') return false
  const stored = props.openFolders[props.node.path]
  if (typeof stored === 'boolean') return stored
  return (
    props.activeFolder === props.node.path ||
    props.activeFolder.startsWith(`${props.node.path}/`) ||
    (props.activeId.length > 0 && props.activeId.startsWith(`${props.node.path}/`))
  )
})
</script>

<template>
  <ContextMenu v-if="node.kind === 'note'">
    <ContextMenuTrigger as-child>
      <button
        type="button"
        :style="padStyle"
        :class="
          cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
            node.id === activeId
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'hover:bg-sidebar-accent/70',
          )
        "
        @click="emit('select', node.id)"
      >
        <FileText class="size-3.5 shrink-0 opacity-70" />
        <span class="truncate">{{ node.name }}</span>
      </button>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @click="emit('select', node.id)">
        <FileText class="size-4" />
        Open
      </ContextMenuItem>
      <ContextMenuItem @click="emit('rename', node.id)">
        <Pencil class="size-4" />
        Rename…
      </ContextMenuItem>
      <ContextMenuItem variant="destructive" @click="emit('delete', node.id)">
        <Trash2 class="size-4" />
        Delete…
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>

  <ContextMenu v-else>
    <ContextMenuTrigger as-child>
      <Collapsible
        :open="folderOpen"
        @update:open="emit('toggle', node, $event)"
      >
        <CollapsibleTrigger as-child>
          <button
            type="button"
            :style="padStyle"
            :class="
              cn(
                'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                activeFolder === node.path
                  ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/70',
              )
            "
            @click="emit('selectFolder', node.path)"
          >
            <ChevronRight
              :class="cn('size-3.5 shrink-0 transition-transform', folderOpen ? 'rotate-90' : '')"
            />
            <Folder class="size-3.5 shrink-0 opacity-70" />
            <span class="truncate font-medium">{{ node.name }}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <NoteTreeNode
            v-for="child in node.children"
            :key="child.kind === 'folder' ? child.path : child.id"
            :node="child"
            :depth="depth + 1"
            :active-id="activeId"
            :active-folder="activeFolder"
            :open-folders="openFolders"
            @toggle="(f, o) => emit('toggle', f, o)"
            @select="emit('select', $event)"
            @select-folder="emit('selectFolder', $event)"
            @create-untitled="emit('createUntitled', $event)"
            @create-named="emit('createNamed', $event)"
            @create-folder="emit('createFolder', $event)"
            @rename="emit('rename', $event)"
            @delete="emit('delete', $event)"
            @delete-folder="emit('deleteFolder', $event)"
          />
        </CollapsibleContent>
      </Collapsible>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @click="emit('createUntitled', node.path)">
        <FilePlus2 class="size-4" />
        New note here
      </ContextMenuItem>
      <ContextMenuItem @click="emit('createNamed', node.path)">
        <FileText class="size-4" />
        New named note…
      </ContextMenuItem>
      <ContextMenuItem @click="emit('createFolder', node.path)">
        <FolderPlus class="size-4" />
        New subfolder…
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" @click="emit('deleteFolder', node.path)">
        <Trash2 class="size-4" />
        Delete folder…
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
