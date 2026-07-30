/** Shared Obsidian syntax helpers for markdown ↔ editor bridge. */

export type ParsedWikilink = {
  target: string
  heading: string
  alias: string
  embed: boolean
}

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

/** Escape attribute values for HTML injection into markdown. */
const escAttr = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Rewrite Obsidian-specific markdown into HTML markers BlockNote can parse
 * into custom inline content / styles.
 */
export const prepareObsidianMarkdown = (markdown: string): string => {
  let out = markdown

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

  // Highlights: ==text==
  out = out.replace(/==([^=\n]+)==/g, (_full, text: string) => {
    return `<mark data-obsidian-highlight="true">${escAttr(text)}</mark>`
  })

  // Tags: #tag or #tag/nested (avoid headings like "# Title" at line start with space)
  out = out.replace(/(^|[\s([{])#([A-Za-z0-9_][\w/-]*)/gm, (_full, prefix: string, tag: string) => {
    return `${prefix}<span data-obsidian-tag="true" data-tag="${escAttr(tag)}">#${escAttr(tag)}</span>`
  })

  return out
}

/** Clean BlockNote markdown export back toward Obsidian dialects. */
export const finalizeObsidianMarkdown = (markdown: string): string =>
  markdown
    .replace(/<mark[^>]*data-obsidian-highlight[^>]*>(.*?)<\/mark>/gis, '==$1==')
    .replace(/<mark[^>]*class="[^"]*obsidian-highlight[^"]*"[^>]*>(.*?)<\/mark>/gis, '==$1==')
    .replace(/<\/?span[^>]*>/g, '')

