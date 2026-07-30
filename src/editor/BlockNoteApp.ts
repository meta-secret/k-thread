import '@blocknote/core/fonts/inter.css'
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

const shouldOpenWikilinkMenu = (tr: Transaction): boolean => {
  const { $from } = tr.selection
  if ($from.parentOffset < 2) return false
  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 2),
    $from.parentOffset,
    undefined,
    '\ufffc',
  )
  return textBefore.endsWith('[[')
}

export function BlockNoteApp(props: BlockNoteAppProps): ReactElement {
  const known = useMemo(() => new Set(props.noteIds), [props.noteIds])
  const navigateRef = useRef(props.onNavigate)
  navigateRef.current = props.onNavigate

  const schema = useMemo(
    () =>
      createObsidianSchema((target) => {
        navigateRef.current(target)
      }, known),
    [known],
  )

  const editor = useCreateBlockNote({ schema }) as ObsidianEditor
  const ready = useRef(false)
  const lastKey = useRef('')
  const markdownRef = useRef(props.markdown)
  markdownRef.current = props.markdown

  useEffect(() => {
    let cancelled = false
    ready.current = false
    const prepared = prepareObsidianMarkdown(markdownRef.current)
    const blocks = editor.tryParseMarkdownToBlocks(prepared)
    if (cancelled) return
    editor.replaceBlocks(editor.document, blocks)
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
      onChange: () => {
        if (!ready.current || lastKey.current !== props.docKey) return
        props.onChange(finalizeObsidianMarkdown(editor.blocksToMarkdownLossy(editor.document)))
      },
    },
    createElement(Suggestions, {
      triggerCharacter: '/',
      getItems: async (query: string) =>
        filterSuggestionItems(
          [...obsidianSlashItems(editor), ...getDefaultReactSlashMenuItems(editor)],
          query,
        ),
    }),
    createElement(Suggestions, {
      triggerCharacter: '[',
      shouldOpen: shouldOpenWikilinkMenu,
      getItems: async (query: string) => noteSuggestionItems(editor, props.noteIds, query),
    }),
    createElement(Suggestions, {
      triggerCharacter: '#',
      getItems: async (query: string) => tagSuggestionItems(editor, props.tags, query),
    }),
  )
}
