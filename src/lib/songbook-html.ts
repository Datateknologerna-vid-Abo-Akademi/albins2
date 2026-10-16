/**
 * Renders a stored Lexical editor state to the HTML the public songbook
 * client reads.
 *
 * The result is computed once, when a song is written, and stored on the song
 * (`contentHtml`). The read path serves that column verbatim, so the Worker
 * serving the songbook never has to load the Lexical HTML converter.
 */
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'

/** A Lexical editor state, the shape the HTML converter expects. */
export type LexicalState = Parameters<typeof convertLexicalToHTML>[0]['data']

/** An empty paragraph, however the HTML converter happens to spell the break. */
const EMPTY_PARAGRAPH = /<p>(?:<br\s*\/?>)+<\/p>/g

/**
 * Payload's HTML converter escapes single and double quotes as entities, and
 * renders an empty paragraph as `<p><br></p>`. The client searches the raw HTML
 * string rather than the rendered text, so quotes are kept literal, the way
 * CKEditor stored them, and a blank line is written back as `<p></p>`, which is
 * the form it had before. The extra `<br>` gives the blank line a marginally
 * different height and shifts the whole page by a pixel.
 */
export function toSongbookHtml(data: LexicalState): string {
  return convertLexicalToHTML({ data, disableContainer: true })
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replace(EMPTY_PARAGRAPH, '<p></p>')
}
