import { marked, type Tokens } from 'marked'
import type { DocId } from '../types'
import { resolveWikilink } from './wikilink'

const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g

export const renderMarkdown = (body: string, known: ReadonlySet<DocId>): string => {
  const withLinks = body.replace(WIKILINK, (_full, target, _heading, alias) => {
    const rawTarget = typeof target === 'string' ? target.trim() : ''
    const id = resolveWikilink(rawTarget, known)
    const label = typeof alias === 'string' && alias.length > 0 ? alias : rawTarget
    const exists = known.has(id)
    const cls = exists ? 'wiki-link' : 'wiki-link is-missing'
    return `<a href="#" class="${cls}" data-wiki="${id}">${label}</a>`
  })

  const renderer = new marked.Renderer()
  renderer.link = ({ href, title, text }: Tokens.Link): string => {
    const t = typeof title === 'string' && title.length > 0 ? ` title="${title}"` : ''
    return `<a href="${href}"${t} target="_blank" rel="noreferrer">${text}</a>`
  }

  return marked.parse(withLinks, { async: false, renderer }) as string
}
