<script setup lang="ts">
import { FilePlus2, FileText, Plus } from '@lucide/vue'
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
import { cn } from '@/lib/utils'
import type { Doc, DocId } from '@/types'

defineProps<{
  docs: readonly Doc[]
  activeId: DocId | ''
}>()

const emit = defineEmits<{
  select: [id: DocId]
  createUntitled: []
  createNamed: []
}>()
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r bg-sidebar text-sidebar-foreground">
    <div class="flex items-center justify-between gap-2 px-3 py-3">
      <div class="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Notes
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="icon-sm" variant="outline" aria-label="Create note">
            <Plus class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem @click="emit('createUntitled')">
            <FilePlus2 class="size-4" />
            New note
            <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('createNamed')">
            <FileText class="size-4" />
            New named note…
            <DropdownMenuShortcut>⇧⌘N</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <Separator />

    <ScrollArea class="min-h-0 flex-1">
      <ul class="space-y-0.5 p-2">
        <li v-for="doc in docs" :key="doc.id">
          <button
            type="button"
            :class="
              cn(
                'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors',
                doc.id === activeId
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/70',
              )
            "
            @click="emit('select', doc.id)"
          >
            <span class="text-sm font-medium">{{ doc.title }}</span>
            <span v-if="doc.id.includes('/')" class="truncate text-xs text-muted-foreground">
              {{ doc.id }}
            </span>
          </button>
        </li>
        <li v-if="docs.length === 0" class="px-2.5 py-6 text-center text-sm text-muted-foreground">
          No notes yet
        </li>
      </ul>
    </ScrollArea>
  </aside>
</template>
