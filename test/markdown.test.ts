import { describe, expect, it } from 'vitest'
import { renderInline } from '~/utils/markdown'

describe('renderInline (thin inline Markdown)', () => {
  it('renders bold', () => {
    expect(renderInline('Top off — **no services** for 90 mi.')).toBe(
      'Top off — <strong>no services</strong> for 90 mi.',
    )
  })

  it('renders italic', () => {
    expect(renderInline('save the *long* light')).toBe(
      'save the <em>long</em> light',
    )
  })

  it('renders bold and italic together without cross-eating the markers', () => {
    expect(renderInline('**wide** and *low*')).toBe(
      '<strong>wide</strong> and <em>low</em>',
    )
  })

  it('supports __bold__ and _italic_ underscore forms', () => {
    expect(renderInline('__wide__ then _low_')).toBe(
      '<strong>wide</strong> then <em>low</em>',
    )
  })

  it('renders inline code', () => {
    expect(renderInline('use `US-95`')).toBe('use <code>US-95</code>')
  })

  it('renders links', () => {
    expect(renderInline('see [the map](https://ex.com/m)')).toBe(
      'see <a href="https://ex.com/m">the map</a>',
    )
  })

  it('escapes HTML so authored prose cannot inject markup', () => {
    expect(renderInline('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d')
    expect(renderInline('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('leaves plain text untouched', () => {
    expect(renderInline('Cracked playa at dusk.')).toBe('Cracked playa at dusk.')
  })
})
