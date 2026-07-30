import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core/extensions'
import type { DefaultReactSuggestionItem } from '@blocknote/react'
import {
  createCalloutBlock,
  createCommentBlock,
  createFrontmatterBlock,
  createPluginCodeBlock,
} from './obsidianBlocks'
import {
  createWikilinkSpec,
  ObsidianComment,
  ObsidianHighlight,
  ObsidianTag,
  type WikilinkNavigate,
} from './obsidianInline'

export const createObsidianSchema = (
  onNavigate: WikilinkNavigate,
  known: ReadonlySet<string>,
) =>
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      obsidianFrontmatter: createFrontmatterBlock(),
      obsidianCallout: createCalloutBlock(),
      obsidianCommentBlock: createCommentBlock(),
      obsidianPluginCode: createPluginCodeBlock(),
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      obsidianWikilink: createWikilinkSpec(onNavigate, known),
      obsidianTag: ObsidianTag,
      obsidianComment: ObsidianComment,
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
  const q = query.trim().replace(/^#/, '')
  const merged = new Set(tags)
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

export const obsidianSlashItems = (editor: ObsidianEditor): DefaultReactSuggestionItem[] => [
  {
    title: 'Callout',
    subtext: 'Obsidian [!note] callout',
    aliases: ['callout', 'admonition', 'obsidian'],
    group: 'Obsidian',
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'obsidianCallout',
        props: {
          calloutType: 'note',
          title: '',
          fold: 'none',
          body: '',
        },
      })
    },
  },
  {
    title: 'Frontmatter',
    subtext: 'YAML properties block',
    aliases: ['yaml', 'frontmatter', 'properties'],
    group: 'Obsidian',
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'obsidianFrontmatter',
        props: { yaml: 'title: \ntags: []\n' },
      })
    },
  },
  {
    title: 'Comment block',
    subtext: '%% hidden comment %%',
    aliases: ['comment', '%%'],
    group: 'Obsidian',
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'obsidianCommentBlock',
        props: { body: '' },
      })
    },
  },
  {
    title: 'Dataview',
    subtext: 'Dataview query fence (not executed)',
    aliases: ['dataview', 'query', 'dv'],
    group: 'Obsidian',
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'obsidianPluginCode',
        props: {
          lang: 'dataview',
          code: 'TABLE file.ctime FROM ""\nSORT file.ctime DESC',
        },
      })
    },
  },
  {
    title: 'DataviewJS',
    subtext: 'DataviewJS fence (not executed)',
    aliases: ['dataviewjs', 'dvjs'],
    group: 'Obsidian',
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'obsidianPluginCode',
        props: {
          lang: 'dataviewjs',
          code: 'dv.list(dv.pages().file.name)',
        },
      })
    },
  },
]
