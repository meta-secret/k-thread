import { marked, type Tokens } from 'marked'
import { isPluginFenceLang } from './obsidian'
import type { DocId } from '../types'
import { resolveWikilink } from './wikilink'

const WIKILINK = /(!?)\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g

const renderCallouts = (markdown: string): string => {
  const lines = markdown.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const start = line.match(/^>\s*\[!([A-Za-z0-9_-]+)\]([+-])?(?:\s+(.*))?$/)
    if (!start) {
      out.push(line)
      i += 1
      continue
    }
    const type = (start[1] ?? 'note').toLowerCase()
    const title = (start[3] ?? '').trim()
    const body: string[] = []
    i += 1
    while (i < lines.length) {
      const next = lines[i] ?? ''
      if (!next.startsWith('>')) break
      body.push(next.replace(/^>\s?/, ''))
      i += 1
    }
    out.push(
      `<aside class="obsidian-callout" data-callout-type="${type}"><div class="obsidian-callout-title">${title.length > 0 ? title : type}</div><div class="obsidian-callout-body">${body.join('<br>')}</div></aside>`,
    )
  }
  return out.join('\n')
}

export const renderMarkdown = (body: string, known: ReadonlySet<DocId>): string => {
  let md = body

  // Frontmatter
  if (md.startsWith('---\n')) {
    const end = md.indexOf('\n---', 4)
    if (end >= 0) {
      const yaml = md.slice(4, end)
      const rest = md.slice(end + 4).replace(/^\n/, '')
      md = `<section class="obsidian-frontmatter"><div class="label">YAML</div><pre>${yaml}</pre></section>\n\n${rest}`
    }
  }

  // Plugin fences before generic markdown
  md = md.replace(/^```([^\n`]*)\n([\s\S]*?)^```\s*$/gm, (full, langRaw: string, code: string) => {
    const lang = (langRaw.trim().split(/\s+/)[0] ?? '').toLowerCase()
    if (!isPluginFenceLang(lang)) return full
    return `<section class="obsidian-plugin"><div class="label">${lang} (not executed)</div><pre><code>${code}</code></pre></section>`
  })

  md = md.replace(/^%%\s*\n([\s\S]*?)^%%\s*$/gm, (_full, comment: string) => {
    return `<section class="obsidian-comment-block"><div class="label">comment</div><pre>${comment}</pre></section>`
  })

  md = renderCallouts(md)

  md = md.replace(/%%([^%\n]+)%%/g, '<span class="obsidian-comment">%%$1%%</span>')

  md = md.replace(WIKILINK, (_full, bang, target, _heading, alias) => {
    const rawTarget = typeof target === 'string' ? target.trim() : ''
    const id = resolveWikilink(rawTarget, known)
    const label = typeof alias === 'string' && alias.length > 0 ? alias : rawTarget
    const exists = known.has(id)
    const embed = bang === '!'
    const cls = ['wiki-link', exists ? '' : 'is-missing', embed ? 'is-embed' : '']
      .filter((c) => c.length > 0)
      .join(' ')
    return `<a href="#" class="${cls}" data-wiki="${id}">${embed ? '!' : ''}${label}</a>`
  })

  md = md.replace(/(^|[\s([{])#([A-Za-z0-9_][\w/-]*)/gm, (_full, prefix, tag) => {
    return `${prefix}<span class="obsidian-tag">#${tag}</span>`
  })

  md = md.replace(/==([^=\n]+)==/g, '<mark class="obsidian-highlight">$1</mark>')

  const renderer = new marked.Renderer()
  renderer.link = ({ href, title, text }: Tokens.Link): string => {
    const t = typeof title === 'string' && title.length > 0 ? ` title="${title}"` : ''
    return `<a href="${href}"${t} target="_blank" rel="noreferrer">${text}</a>`
  }

  return marked.parse(md, { async: false, renderer }) as string
}
