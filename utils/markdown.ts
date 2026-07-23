// Thin inline-Markdown renderer (handoff-spec §3). Prose fields are constrained
// inline Markdown — bold/italic (plus inline code + links); block-level syntax is
// already rejected by the schema's `mdInline` guard, so this only has to handle
// the inline set. Output is used via `v-html`, so HTML is escaped first: authored
// prose can style itself but can never inject markup.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Render a thin inline-Markdown string to safe HTML.
 * Supports bold, italic, inline code, and links; everything else passes through
 * as escaped text.
 */
export function renderInline(md: string): string {
  let out = escapeHtml(md)

  // Inline code first, so its contents aren't re-processed as emphasis.
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`)

  // Links: [text](url). The URL is already HTML-escaped by escapeHtml above; the
  // char class additionally forbids quotes so a URL can't break out of the href
  // attribute. (Authored prose is trusted + Zod-validated, but keep it safe.)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s"]+)\)/g,
    (_m, text, url) => `<a href="${url}">${text}</a>`,
  )

  // Bold before italic so `**x**` isn't mis-parsed as two italics.
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')

  return out
}
