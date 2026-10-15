/**
 * Minimal CKEditor HTML to Lexical conversion for the songbook import.
 *
 * The production corpus only ever contains `<p>` runs, `<br>` inside a
 * paragraph and `<strong>` spans, so an explicit parser is enough and no
 * HTML-to-Lexical dependency is needed.
 */

export type LexicalTextNode = {
  type: 'text'
  text: string
  format: number
  detail: 0
  mode: 'normal'
  style: ''
  version: 1
}

export type LexicalLineBreakNode = {
  type: 'linebreak'
  version: 1
}

export type LexicalInlineNode = LexicalTextNode | LexicalLineBreakNode

export type LexicalParagraphNode = {
  type: 'paragraph'
  children: LexicalInlineNode[]
  direction: 'ltr'
  format: ''
  indent: 0
  textFormat: number
  textStyle: ''
  version: 1
}

export type LexicalEditorState = {
  root: {
    type: 'root'
    children: LexicalParagraphNode[]
    direction: 'ltr'
    format: ''
    indent: 0
    version: 1
  }
}

const BOLD_FORMAT = 1
const TEXT_VERSION = 1 as const

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: '\u00a0',
  quot: '"',
}

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const codePoint = Number.parseInt(entity.slice(2), 16)
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
    }

    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10)
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
    }

    const named = NAMED_ENTITIES[entity.toLowerCase()]
    return named ?? match
  })
}

/**
 * Splits the inner HTML of one paragraph into text and line break nodes,
 * merging neighbouring runs that carry the same formatting.
 */
function parseInlineHtml(html: string): LexicalInlineNode[] {
  const nodes: LexicalInlineNode[] = []
  const tokenPattern = /<(\/?)(strong|b)\b[^>]*>|<br\s*\/?>/gi
  let bold = false
  let cursor = 0

  const pushText = (raw: string) => {
    if (!raw) {
      return
    }

    const text = decodeEntities(raw)
    const format = bold ? BOLD_FORMAT : 0
    const previous = nodes[nodes.length - 1]

    if (previous && previous.type === 'text' && previous.format === format) {
      previous.text += text
      return
    }

    nodes.push({
      detail: 0,
      format,
      mode: 'normal',
      style: '',
      text,
      type: 'text',
      version: TEXT_VERSION,
    })
  }

  for (const match of html.matchAll(tokenPattern)) {
    pushText(html.slice(cursor, match.index))

    const tag = match[2]?.toLowerCase()
    if (tag === 'strong' || tag === 'b') {
      bold = match[1] !== '/'
    } else {
      nodes.push({ type: 'linebreak', version: TEXT_VERSION })
    }

    cursor = (match.index ?? 0) + match[0].length
  }

  pushText(html.slice(cursor))

  return nodes
}

function paragraphNode(children: LexicalInlineNode[]): LexicalParagraphNode {
  const firstText = children.find((child): child is LexicalTextNode => child.type === 'text')

  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: firstText?.format ?? 0,
    textStyle: '',
    type: 'paragraph',
    version: TEXT_VERSION,
  }
}

export function htmlToLexical(html: string | null | undefined): LexicalEditorState {
  const children: LexicalParagraphNode[] = []
  const source = (html ?? '').trim()

  if (source) {
    const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi
    let cursor = 0

    for (const match of source.matchAll(paragraphPattern)) {
      const between = source.slice(cursor, match.index).trim()
      if (between) {
        children.push(paragraphNode(parseInlineHtml(between)))
      }

      children.push(paragraphNode(parseInlineHtml(match[1] ?? '')))
      cursor = (match.index ?? 0) + match[0].length
    }

    const trailing = source.slice(cursor).trim()
    if (trailing) {
      children.push(paragraphNode(parseInlineHtml(trailing)))
    }
  }

  return {
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: TEXT_VERSION,
    },
  }
}
