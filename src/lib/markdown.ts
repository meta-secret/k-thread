import { marked, type Tokens } from 'marked'
import type { DocId } from '../types'
import { resolveWikilink } from './wikilink'

const WIKILINK = /(!?)\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g

export const renderMarkdown = (body: string, known: ReadonlySet<DocId>): string => {
  let withLinks = body.replace(WIKILINK, (_full, bang, target, _heading, alias) => {
    const rawTarget = typeof target === 'string' ? target.trim() : ''
    const id = resolveWikilink(rawTarget, known)
    const label = typeof alias === 'string' && alias.length > 0 ? alias : rawTarget
    const exists = known.has(id)
    const embed = bang === '!'
    const cls = [
      'wiki-link',
      exists ? '' : 'is-missing',
      embed ? 'is-embed' : '',
    ]
      .filter((c) => c.length > 0)
      .join(' ')
    return `<a href="#" class="${cls}" data-wiki="${id}">${embed ? '!' : ''}${label}</a>`
  })

  withLinks = withLinks.replace(/(^|[\s([{])#([A-Za-z0-9_][\w/-]*)/gm, (_full, prefix, tag) => {
    return `${prefix}<span class="obsidian-tag">#${tag}</span>`
  })

  withLinks = withLinks.replace(/==([^=\n]+)==/g, '<mark class="obsidian-highlight">$1</mark>')

  const renderer = new marked.Renderer()
  renderer.link = ({ href, title, text }: Tokens.Link): string => {
    const t = typeof title === 'string' && title.length > 0 ? ` title="${title}"` : ''
    return `<a href="${href}"${t} target="_blank" rel="noreferrer">${text}</a>`
  }

  return marked.parse(withLinks, { async: false, renderer }) as string
}
