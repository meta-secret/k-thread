import '@blocknote/core/fonts/inter.css'
import '@blocknote/core/style.css'
import '@blocknote/mantine/style.css'
import { filterSuggestionItems } from '@blocknote/core/extensions'
import { BlockNoteView } from '@blocknote/mantine'
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react'
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  type FunctionComponent,
  type ReactElement,
} from 'react'
import type { Transaction } from '@tiptap/pm/state'
import { finalizeObsidianMarkdown, prepareObsidianMarkdown } from '@/lib/obsidian'
import {
  createObsidianSchema,
  noteSuggestionItems,
  obsidianSlashItems,
  tagSuggestionItems,
  type ObsidianEditor,
} from './obsidianSchema'

export type BlockNoteAppProps = {
  docKey: string
  markdown: string
  noteIds: readonly string[]
  tags: readonly string[]
  onChange: (markdown: string) => void
  onNavigate: (target: string) => void
}

const View = BlockNoteView as FunctionComponent<Record<string, unknown>>
const Suggestions = SuggestionMenuController as FunctionComponent<Record<string, unknown>>

const charBefore = (tr: Transaction, offset = 1): string => {
  const { $from } = tr.selection
  if ($from.parentOffset < offset) return ''
  return $from.parent.textBetween(
    $from.parentOffset - offset,
    $from.parentOffset,
    undefined,
    '\ufffc',
  )
}

/** Slash menu: keep out of table cells (BlockNote default). */
const shouldOpenSlashMenu = (tr: Transaction): boolean =>
  !tr.selection.$from.parent.type.isInGroup('tableContent')

/** Wikilink menu only after `[[`. */
const shouldOpenWikilinkMenu = (tr: Transaction): boolean => charBefore(tr, 2) === '[['

/**
 * Tag menu only when `#` starts a token (start of block / whitespace),
 * so markdown headings and mid-word hashes do not steal `/`.
 */
const shouldOpenTagMenu = (tr: Transaction): boolean => {
  const { $from } = tr.selection
  if ($from.parentOffset === 0) return true
  return /\s/.test(charBefore(tr, 1))
}

const floatingUIOptions = {
  useFloatingOptions: {
    strategy: 'fixed' as const,
  },
  elementProps: {
    style: { zIndex: 1200 },
  },
}

export function BlockNoteApp(props: BlockNoteAppProps): ReactElement {
  const known = useMemo(() => new Set(props.noteIds), [props.noteIds])
  const navigateRef = useRef(props.onNavigate)
  navigateRef.current = props.onNavigate
  const onChangeRef = useRef(props.onChange)
  onChangeRef.current = props.onChange
  const noteIdsRef = useRef(props.noteIds)
  noteIdsRef.current = props.noteIds
  const tagsRef = useRef(props.tags)
  tagsRef.current = props.tags
  const markdownRef = useRef(props.markdown)
  markdownRef.current = props.markdown

  const schema = useMemo(
    () =>
      createObsidianSchema((target) => {
        navigateRef.current(target)
      }, known),
    [known],
  )

  // Keep editor instance stable; schema is applied on first mount only.
  const editor = useCreateBlockNote({ schema }, []) as ObsidianEditor
  const ready = useRef(false)
  const lastKey = useRef('')
  const portalEl = useMemo(() => {
    if (typeof document === 'undefined') return undefined
    const existing = document.getElementById('k-thread-bn-portal')
    if (existing) return existing
    const el = document.createElement('div')
    el.id = 'k-thread-bn-portal'
    el.className = 'bn-mantine bn-root light k-thread-bn-portal'
    el.setAttribute('data-mantine-color-scheme', 'light')
    el.setAttribute('data-color-scheme', 'light')
    document.body.appendChild(el)
    return el
  }, [])

  useEffect(() => {
    let cancelled = false
    ready.current = false
    const original = markdownRef.current
    const prepared = prepareObsidianMarkdown(original)
    const blocks = editor.tryParseMarkdownToBlocks(prepared)
    if (cancelled) return
    editor.replaceBlocks(editor.document, blocks)
    // Heal callouts that were previously persisted as code fences.
    if (/```[\s\S]*?>\s*\[!/.test(original) || /data-obsidian-raw[\s\S]*?>\s*\[!/.test(original)) {
      const healed = finalizeObsidianMarkdown(editor.blocksToMarkdownLossy(editor.document))
      if (healed !== original) onChangeRef.current(healed)
    }
    ready.current = true
    lastKey.current = props.docKey
    return () => {
      cancelled = true
    }
  }, [editor, props.docKey])

  return createElement(
    View,
    {
      editor,
      theme: 'light',
      className: 'k-thread-blocknote',
      slashMenu: false,
      emojiPicker: false,
      portalElements: {
        default: portalEl ?? null,
        slashMenu: portalEl ?? null,
      },
      onChange: () => {
        if (!ready.current || lastKey.current !== props.docKey) return
        onChangeRef.current(finalizeObsidianMarkdown(editor.blocksToMarkdownLossy(editor.document)))
      },
    },
    createElement(Suggestions, {
      triggerCharacter: '/',
      shouldOpen: shouldOpenSlashMenu,
      portalElement: portalEl,
      floatingUIOptions,
      getItems: async (query: string) =>
        filterSuggestionItems(
          [...obsidianSlashItems(editor), ...getDefaultReactSlashMenuItems(editor)],
          query,
        ),
    }),
    createElement(Suggestions, {
      triggerCharacter: '[',
      shouldOpen: shouldOpenWikilinkMenu,
      portalElement: portalEl,
      floatingUIOptions,
      getItems: async (query: string) =>
        noteSuggestionItems(editor, noteIdsRef.current, query),
    }),
    createElement(Suggestions, {
      triggerCharacter: '#',
      shouldOpen: shouldOpenTagMenu,
      portalElement: portalEl,
      floatingUIOptions,
      getItems: async (query: string) => tagSuggestionItems(editor, tagsRef.current, query),
    }),
  )
}
