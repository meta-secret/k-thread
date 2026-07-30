import {
  BlockNoteSchema,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core'
import { filterSuggestionItems } from '@blocknote/core/extensions'
import type { DefaultReactSuggestionItem } from '@blocknote/react'
import {
  createWikilinkSpec,
  ObsidianHighlight,
  ObsidianTag,
  type WikilinkNavigate,
} from './obsidianInline'

export const createObsidianSchema = (
  onNavigate: WikilinkNavigate,
  known: ReadonlySet<string>,
) =>
  BlockNoteSchema.create({
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      obsidianWikilink: createWikilinkSpec(onNavigate, known),
      obsidianTag: ObsidianTag,
    },
    styleSpecs: {
      ...defaultStyleSpecs,
      obsidianHighlight: ObsidianHighlight,
    },
  })

export type ObsidianSchema = ReturnType<typeof createObsidianSchema>
export type ObsidianEditor = ObsidianSchema['BlockNoteEditor']

export const noteSuggestionItems = (
  editor: ObsidianEditor,
  notes: readonly string[],
  query: string,
): DefaultReactSuggestionItem[] => {
  const items = notes.map((id) => ({
    title: id,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'obsidianWikilink',
          props: {
            target: id,
            heading: '',
            alias: '',
            embed: 'false',
          },
        },
        ' ',
      ])
    },
  }))
  return filterSuggestionItems(items, query)
}

export const tagSuggestionItems = (
  editor: ObsidianEditor,
  tags: readonly string[],
  query: string,
): DefaultReactSuggestionItem[] => {
  const fromNotes = tags
  const q = query.trim().replace(/^#/, '')
  const merged = new Set(fromNotes)
  if (q.length > 0) merged.add(q)
  const items = [...merged].map((tag) => ({
    title: `#${tag}`,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'obsidianTag',
          props: { tag },
        },
        ' ',
      ])
    },
  }))
  return filterSuggestionItems(items, query)
}
