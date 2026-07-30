/** Shared Obsidian syntax helpers for markdown ↔ editor bridge. */

export type ParsedWikilink = {
  target: string
  heading: string
  alias: string
  embed: boolean
}

export const PLUGIN_FENCE_LANGS = [
  'dataview',
  'dataviewjs',
  'templater',
  'templater-js',
  'js-engine',
  'meta-bind',
  'meta-bind-button',
  'meta-bind-embed',
  'meta-bind-js-view',
  'calculator',
  'chart',
  'leaflet',
  'mapview',
  'tasks',
  'ad-note',
  'ad-tip',
  'ad-warning',
  'ad-danger',
] as const

export type PluginFenceLang = (typeof PLUGIN_FENCE_LANGS)[number]

export const isPluginFenceLang = (lang: string): boolean =>
  PLUGIN_FENCE_LANGS.includes(lang.toLowerCase() as PluginFenceLang)

export const parseWikilinkInner = (inner: string): Omit<ParsedWikilink, 'embed'> => {
  let rest = inner.trim()
  let alias = ''
  const pipe = rest.indexOf('|')
  if (pipe >= 0) {
    alias = rest.slice(pipe + 1).trim()
    rest = rest.slice(0, pipe).trim()
  }
  let heading = ''
  const hash = rest.indexOf('#')
  if (hash >= 0) {
    heading = rest.slice(hash + 1).trim()
    rest = rest.slice(0, hash).trim()
  }
  return { target: rest, heading, alias }
}

export const formatWikilink = (link: ParsedWikilink): string => {
  const heading = link.heading.length > 0 ? `#${link.heading}` : ''
  const alias = link.alias.length > 0 ? `|${link.alias}` : ''
  const core = `[[${link.target}${heading}${alias}]]`
  return link.embed ? `!${core}` : core
}

export const wikilinkLabel = (link: Omit<ParsedWikilink, 'embed'>): string =>
  link.alias.length > 0 ? link.alias : link.target

const escAttr = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const escHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type FenceToken = { id: string; html: string }

const extractFences = (markdown: string): { text: string; fences: FenceToken[] } => {
  const fences: FenceToken[] = []
  const text = markdown.replace(
    /^```([^\n`]*)\n([\s\S]*?)^```\s*$/gm,
    (_full, langRaw: string, body: string) => {
      const lang = langRaw.trim().split(/\s+/)[0] ?? ''
      const id = `@@FENCE_${fences.length}@@`
      if (isPluginFenceLang(lang)) {
        fences.push({
          id,
          html: `<div data-obsidian-plugin="true" data-lang="${escAttr(lang)}"><pre>${escHtml(body.replace(/\n$/, ''))}</pre></div>`,
        })
      } else {
        fences.push({
          id,
          html: `\`\`\`${langRaw}\n${body}\`\`\``,
        })
      }
      return id
    },
  )
  return { text, fences }
}

const restoreFences = (text: string, fences: FenceToken[]): string => {
  let out = text
  for (const fence of fences) {
    out = out.replace(fence.id, fence.html)
  }
  return out
}

const transformCallouts = (markdown: string): string => {
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
    const foldMark = start[2] ?? ''
    const fold = foldMark === '-' ? 'folded' : foldMark === '+' ? 'open' : 'none'
    const title = (start[3] ?? '').trim()
    const bodyLines: string[] = []
    i += 1
    while (i < lines.length) {
      const next = lines[i] ?? ''
      if (!next.startsWith('>')) break
      bodyLines.push(next.replace(/^>\s?/, ''))
      i += 1
    }

    out.push(
      `<div data-obsidian-callout="true" data-type="${escAttr(type)}" data-title="${escAttr(title)}" data-fold="${fold}"><div data-obsidian-callout-body>${escHtml(bodyLines.join('\n'))}</div></div>`,
    )
  }

  return out.join('\n')
}

const transformBlockComments = (markdown: string): string =>
  markdown.replace(/^%%\s*\n([\s\S]*?)^%%\s*$/gm, (_full, body: string) => {
    return `<div data-obsidian-comment-block="true"><pre>${escHtml(body.replace(/\n$/, ''))}</pre></div>`
  })

const transformInlineComments = (markdown: string): string =>
  markdown.replace(/%%([^%\n](?:[\s\S]*?[^%\n])?)%%/g, (_full, body: string) => {
    if (body.includes('\n')) return _full
    return `<span data-obsidian-comment="true">${escHtml(body)}</span>`
  })

const extractFrontmatter = (
  markdown: string,
): { frontmatterHtml: string; body: string } => {
  if (!markdown.startsWith('---\n') && markdown !== '---') {
    return { frontmatterHtml: '', body: markdown }
  }
  const end = markdown.indexOf('\n---', 4)
  if (end < 0) {
    return { frontmatterHtml: '', body: markdown }
  }
  const yaml = markdown.slice(4, end)
  let rest = markdown.slice(end + 4)
  if (rest.startsWith('\n')) rest = rest.slice(1)
  return {
    frontmatterHtml: `<div data-obsidian-frontmatter="true"><pre>${escHtml(yaml)}</pre></div>\n\n`,
    body: rest,
  }
}

/**
 * Rewrite Obsidian-specific markdown into HTML markers BlockNote can parse
 * into custom inline content / blocks / styles.
 */
export const prepareObsidianMarkdown = (markdown: string): string => {
  const { frontmatterHtml, body } = extractFrontmatter(markdown)
  const { text: withoutFences, fences } = extractFences(body)

  let out = withoutFences
  out = transformBlockComments(out)
  out = transformCallouts(out)
  out = transformInlineComments(out)

  // Embeds first so ![[...]] is not treated as a normal wikilink.
  out = out.replace(/!\[\[([^\]]+)\]\]/g, (_full, inner: string) => {
    const parsed = parseWikilinkInner(inner)
    const label = wikilinkLabel(parsed)
    return `<span data-obsidian-wikilink="true" data-embed="true" data-target="${escAttr(parsed.target)}" data-heading="${escAttr(parsed.heading)}" data-alias="${escAttr(parsed.alias)}">${escAttr(label)}</span>`
  })

  out = out.replace(/\[\[([^\]]+)\]\]/g, (_full, inner: string) => {
    const parsed = parseWikilinkInner(inner)
    const label = wikilinkLabel(parsed)
    return `<span data-obsidian-wikilink="true" data-embed="false" data-target="${escAttr(parsed.target)}" data-heading="${escAttr(parsed.heading)}" data-alias="${escAttr(parsed.alias)}">${escAttr(label)}</span>`
  })

  out = out.replace(/==([^=\n]+)==/g, (_full, text: string) => {
    return `<mark data-obsidian-highlight="true">${escAttr(text)}</mark>`
  })

  out = out.replace(/(^|[\s([{])#([A-Za-z0-9_][\w/-]*)/gm, (_full, prefix: string, tag: string) => {
    return `${prefix}<span data-obsidian-tag="true" data-tag="${escAttr(tag)}">#${escAttr(tag)}</span>`
  })

  out = restoreFences(out, fences)
  return `${frontmatterHtml}${out}`
}

const decodeHtml = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')

/** Clean BlockNote markdown export back toward Obsidian dialects. */
export const finalizeObsidianMarkdown = (markdown: string): string => {
  let out = markdown
    .replace(/<mark[^>]*data-obsidian-highlight[^>]*>(.*?)<\/mark>/gis, '==$1==')
    .replace(/<mark[^>]*class="[^"]*obsidian-highlight[^"]*"[^>]*>(.*?)<\/mark>/gis, '==$1==')

  // Custom blocks export as <pre data-obsidian-raw> or fenced obsidian-raw.
  out = out.replace(
    /<pre[^>]*data-obsidian-raw="true"[^>]*>\s*<code>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_full, body: string) => `${decodeHtml(body)}\n\n`,
  )
  out = out.replace(/```obsidian-raw\n([\s\S]*?)\n```/g, (_full, body: string) => `${body}\n\n`)

  out = out.replace(
    /<div[^>]*data-obsidian-frontmatter="true"[^>]*>\s*<pre>([\s\S]*?)<\/pre>\s*<\/div>/gi,
    (_full, yaml: string) => `---\n${decodeHtml(yaml)}\n---\n\n`,
  )

  out = out.replace(/<\/?span[^>]*>/g, '')
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export const CALLOUT_TYPES = [
  'note',
  'info',
  'tip',
  'success',
  'question',
  'warning',
  'failure',
  'danger',
  'bug',
  'example',
  'quote',
] as const

export type CalloutType = (typeof CALLOUT_TYPES)[number]
