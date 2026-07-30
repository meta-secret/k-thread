import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import { createElement, useEffect, useRef, type FunctionComponent, type ReactElement } from 'react'

export type BlockNoteAppProps = {
  docKey: string
  markdown: string
  onChange: (markdown: string) => void
}

const View = BlockNoteView as FunctionComponent<Record<string, unknown>>

export function BlockNoteApp(props: BlockNoteAppProps): ReactElement {
  const editor = useCreateBlockNote()
  const ready = useRef(false)
  const lastKey = useRef('')
  const markdownRef = useRef(props.markdown)
  markdownRef.current = props.markdown

  useEffect(() => {
    let cancelled = false
    ready.current = false
    const blocks = editor.tryParseMarkdownToBlocks(markdownRef.current)
    if (cancelled) return
    editor.replaceBlocks(editor.document, blocks)
    ready.current = true
    lastKey.current = props.docKey
    return () => {
      cancelled = true
    }
  }, [editor, props.docKey])

  return createElement(View, {
    editor,
    theme: 'light',
    className: 'k-thread-blocknote',
    onChange: () => {
      if (!ready.current || lastKey.current !== props.docKey) return
      props.onChange(editor.blocksToMarkdownLossy(editor.document))
    },
  })
}
