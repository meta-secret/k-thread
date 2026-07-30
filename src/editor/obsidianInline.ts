import { createStyleSpec } from '@blocknote/core'
import { createReactInlineContentSpec } from '@blocknote/react'
import { createElement, type ReactElement } from 'react'
import {
  formatWikilink,
  wikilinkLabel,
  type ParsedWikilink,
} from '@/lib/obsidian'

export type WikilinkNavigate = (target: string) => void

const readAttr = (el: HTMLElement, name: string): string => {
  const value = el.getAttribute(name)
  return typeof value === 'string' ? value : ''
}

export const createWikilinkSpec = (onNavigate: WikilinkNavigate, known: ReadonlySet<string>) =>
  createReactInlineContentSpec(
    {
      type: 'obsidianWikilink' as const,
      propSchema: {
        target: { default: '' },
        heading: { default: '' },
        alias: { default: '' },
        embed: {
          default: 'false',
          values: ['true', 'false'],
        },
      },
      content: 'none',
    },
    {
      render: (props): ReactElement => {
        const link: ParsedWikilink = {
          target: props.inlineContent.props.target,
          heading: props.inlineContent.props.heading,
          alias: props.inlineContent.props.alias,
          embed: props.inlineContent.props.embed === 'true',
        }
        const exists = known.has(link.target)
        const label = `${link.embed ? '!' : ''}${wikilinkLabel(link)}`
        return createElement(
          'span',
          {
            className: [
              'obsidian-wikilink',
              link.embed ? 'is-embed' : '',
              exists ? 'is-exists' : 'is-missing',
            ]
              .filter((c) => c.length > 0)
              .join(' '),
            contentEditable: false,
            title: formatWikilink(link),
            onClick: (event: MouseEvent) => {
              event.preventDefault()
              event.stopPropagation()
              if (link.target.length > 0) onNavigate(link.target)
            },
          },
          label,
        )
      },
      toExternalHTML: (props): ReactElement => {
        const link: ParsedWikilink = {
          target: props.inlineContent.props.target,
          heading: props.inlineContent.props.heading,
          alias: props.inlineContent.props.alias,
          embed: props.inlineContent.props.embed === 'true',
        }
        return createElement('span', null, formatWikilink(link))
      },
      parse: (element: HTMLElement) => {
        if (element.getAttribute('data-obsidian-wikilink') !== 'true') return
        const embed = readAttr(element, 'data-embed') === 'true' ? ('true' as const) : ('false' as const)
        return {
          target: readAttr(element, 'data-target'),
          heading: readAttr(element, 'data-heading'),
          alias: readAttr(element, 'data-alias'),
          embed,
        }
      },
    },
  )

export const ObsidianTag = createReactInlineContentSpec(
  {
    type: 'obsidianTag' as const,
    propSchema: {
      tag: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props): ReactElement =>
      createElement(
        'span',
        {
          className: 'obsidian-tag',
          contentEditable: false,
        },
        `#${props.inlineContent.props.tag}`,
      ),
    toExternalHTML: (props): ReactElement =>
      createElement('span', null, `#${props.inlineContent.props.tag}`),
    parse: (element: HTMLElement) => {
      if (element.getAttribute('data-obsidian-tag') !== 'true') return
      const tag = readAttr(element, 'data-tag')
      if (tag.length === 0) return
      return { tag }
    },
  },
)

export const ObsidianHighlight = createStyleSpec(
  {
    type: 'obsidianHighlight' as const,
    propSchema: 'boolean',
  },
  {
    render: () => {
      const dom = document.createElement('mark')
      dom.className = 'obsidian-highlight'
      dom.setAttribute('data-obsidian-highlight', 'true')
      return { dom, contentDOM: dom }
    },
    toExternalHTML: () => {
      const dom = document.createElement('span')
      const start = document.createTextNode('==')
      const content = document.createElement('span')
      const end = document.createTextNode('==')
      dom.append(start, content, end)
      return { dom, contentDOM: content }
    },
    parse: (element: HTMLElement) => {
      if (element.tagName === 'MARK' && element.getAttribute('data-obsidian-highlight') === 'true') {
        return true
      }
      return
    },
  },
)
