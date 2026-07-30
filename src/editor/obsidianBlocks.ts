import { createReactBlockSpec } from '@blocknote/react'
import { createElement, type ReactElement } from 'react'
import { CALLOUT_TYPES } from '@/lib/obsidian'

const readAttr = (el: HTMLElement, name: string): string => {
  const value = el.getAttribute(name)
  return typeof value === 'string' ? value : ''
}

const textFromPre = (el: HTMLElement): string => {
  const pre = el.querySelector('pre')
  return pre ? pre.textContent ?? '' : el.textContent ?? ''
}

const rawExport = (markdown: string): ReactElement =>
  createElement(
    'pre',
    { 'data-obsidian-raw': 'true' },
    createElement('code', null, markdown),
  )

export const createFrontmatterBlock = createReactBlockSpec(
  {
    type: 'obsidianFrontmatter' as const,
    propSchema: {
      yaml: { default: '' },
    },
    content: 'none',
  },
  {
    meta: { code: true },
    parse: (element: HTMLElement) => {
      if (element.getAttribute('data-obsidian-frontmatter') !== 'true') return
      return { yaml: textFromPre(element) }
    },
    toExternalHTML: (props): ReactElement =>
      rawExport(`---\n${props.block.props.yaml}\n---`),
    render: (props): ReactElement =>
      createElement(
        'div',
        { className: 'obsidian-frontmatter', contentEditable: false },
        createElement('div', { className: 'obsidian-frontmatter-label' }, 'YAML frontmatter'),
        createElement('textarea', {
          className: 'obsidian-frontmatter-editor',
          value: props.block.props.yaml,
          spellCheck: false,
          onChange: (event: { currentTarget: HTMLTextAreaElement }) => {
            props.editor.updateBlock(props.block, {
              type: 'obsidianFrontmatter',
              props: { yaml: event.currentTarget.value },
            })
          },
        }),
      ),
  },
)

export const createCalloutBlock = createReactBlockSpec(
  {
    type: 'obsidianCallout' as const,
    propSchema: {
      calloutType: {
        default: 'note',
        values: [...CALLOUT_TYPES],
      },
      title: { default: '' },
      fold: {
        default: 'none',
        values: ['none', 'folded', 'open'],
      },
      body: { default: '' },
    },
    content: 'none',
  },
  {
    parse: (element: HTMLElement) => {
      if (element.getAttribute('data-obsidian-callout') !== 'true') return
      const typeRaw = readAttr(element, 'data-type').toLowerCase()
      const calloutType = (CALLOUT_TYPES as readonly string[]).includes(typeRaw)
        ? (typeRaw as (typeof CALLOUT_TYPES)[number])
        : 'note'
      const foldRaw = readAttr(element, 'data-fold')
      const fold =
        foldRaw === 'folded' || foldRaw === 'open' || foldRaw === 'none' ? foldRaw : 'none'
      const bodyEl = element.querySelector('[data-obsidian-callout-body]')
      const body = bodyEl ? bodyEl.textContent ?? '' : ''
      return {
        calloutType,
        title: readAttr(element, 'data-title'),
        fold,
        body,
      }
    },
    toExternalHTML: (props): ReactElement => {
      const foldMark =
        props.block.props.fold === 'folded' ? '-' : props.block.props.fold === 'open' ? '+' : ''
      const title =
        props.block.props.title.length > 0 ? ` ${props.block.props.title}` : ''
      const header = `> [!${props.block.props.calloutType}]${foldMark}${title}`
      const body = props.block.props.body
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n')
      const md = body.length > 0 ? `${header}\n${body}` : header
      return rawExport(md)
    },
    render: (props): ReactElement =>
      createElement(
        'div',
        {
          className: 'obsidian-callout',
          'data-callout-type': props.block.props.calloutType,
          contentEditable: false,
        },
        createElement(
          'div',
          { className: 'obsidian-callout-header' },
          createElement(
            'select',
            {
              className: 'obsidian-callout-type',
              value: props.block.props.calloutType,
              onChange: (event: { currentTarget: HTMLSelectElement }) => {
                props.editor.updateBlock(props.block, {
                  type: 'obsidianCallout',
                  props: {
                    calloutType: event.currentTarget.value as (typeof CALLOUT_TYPES)[number],
                  },
                })
              },
            },
            ...CALLOUT_TYPES.map((type) =>
              createElement('option', { key: type, value: type }, type),
            ),
          ),
          createElement('input', {
            className: 'obsidian-callout-title',
            value: props.block.props.title,
            placeholder: 'Title (optional)',
            onChange: (event: { currentTarget: HTMLInputElement }) => {
              props.editor.updateBlock(props.block, {
                type: 'obsidianCallout',
                props: { title: event.currentTarget.value },
              })
            },
          }),
        ),
        createElement('textarea', {
          className: 'obsidian-callout-body',
          value: props.block.props.body,
          placeholder: 'Callout body…',
          onChange: (event: { currentTarget: HTMLTextAreaElement }) => {
            props.editor.updateBlock(props.block, {
              type: 'obsidianCallout',
              props: { body: event.currentTarget.value },
            })
          },
        }),
      ),
  },
)

export const createCommentBlock = createReactBlockSpec(
  {
    type: 'obsidianCommentBlock' as const,
    propSchema: {
      body: { default: '' },
    },
    content: 'none',
  },
  {
    parse: (element: HTMLElement) => {
      if (element.getAttribute('data-obsidian-comment-block') !== 'true') return
      return { body: textFromPre(element) }
    },
    toExternalHTML: (props): ReactElement =>
      rawExport(`%%\n${props.block.props.body}\n%%`),
    render: (props): ReactElement =>
      createElement(
        'div',
        { className: 'obsidian-comment-block', contentEditable: false },
        createElement('div', { className: 'obsidian-comment-label' }, '%% comment'),
        createElement('textarea', {
          className: 'obsidian-comment-editor',
          value: props.block.props.body,
          spellCheck: false,
          onChange: (event: { currentTarget: HTMLTextAreaElement }) => {
            props.editor.updateBlock(props.block, {
              type: 'obsidianCommentBlock',
              props: { body: event.currentTarget.value },
            })
          },
        }),
      ),
  },
)

export const createPluginCodeBlock = createReactBlockSpec(
  {
    type: 'obsidianPluginCode' as const,
    propSchema: {
      lang: { default: 'dataview' },
      code: { default: '' },
    },
    content: 'none',
  },
  {
    meta: { code: true },
    parse: (element: HTMLElement) => {
      if (element.getAttribute('data-obsidian-plugin') !== 'true') return
      return {
        lang: readAttr(element, 'data-lang') || 'dataview',
        code: textFromPre(element),
      }
    },
    toExternalHTML: (props): ReactElement =>
      rawExport(`\`\`\`${props.block.props.lang}\n${props.block.props.code}\n\`\`\``),
    render: (props): ReactElement =>
      createElement(
        'div',
        { className: 'obsidian-plugin-code', contentEditable: false },
        createElement(
          'div',
          { className: 'obsidian-plugin-label' },
          `${props.block.props.lang} (not executed)`,
        ),
        createElement('textarea', {
          className: 'obsidian-plugin-editor',
          value: props.block.props.code,
          spellCheck: false,
          onChange: (event: { currentTarget: HTMLTextAreaElement }) => {
            props.editor.updateBlock(props.block, {
              type: 'obsidianPluginCode',
              props: { code: event.currentTarget.value },
            })
          },
        }),
      ),
  },
)
