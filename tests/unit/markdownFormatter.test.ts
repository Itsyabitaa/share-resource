import { describe, it, expect } from 'vitest'
import { formatToMarkdown, quickFormat, isAlreadyMarkdown } from '../../utils/markdownFormatter'

describe('Markdown Formatter Utility', () => {
  it('converts plain text to formatted markdown with correct headings', () => {
    const text = 'MY FIRST TITLE\n\nSome introductory paragraph.\n\nMY SECOND HEADING\n\nSome details.'
    const formatted = formatToMarkdown(text)
    
    // First heading is treated as H1 (#), second is H2 (##)
    expect(formatted).toContain('# MY FIRST TITLE')
    expect(formatted).toContain('## MY SECOND HEADING')
  })

  it('detects underline headings (=== and ---)', () => {
    const text = 'Main Heading\n===\n\nSub Heading\n---'
    const formatted = formatToMarkdown(text)
    
    expect(formatted).toContain('# Main Heading')
    expect(formatted).toContain('## Sub Heading')
  })

  it('detects and formats bullet lists', () => {
    const text = 'List of things:\n• item 1\n• item 2\n- item 3'
    const formatted = formatToMarkdown(text)
    
    expect(formatted).toContain('- item 1')
    expect(formatted).toContain('- item 2')
    expect(formatted).toContain('- item 3')
  })

  it('detects and formats numbered lists', () => {
    const text = 'Steps:\n1) Open page\n2) Click button\n3. Done'
    const formatted = formatToMarkdown(text)
    
    expect(formatted).toContain('1. Open page')
    expect(formatted).toContain('1. Click button')
    expect(formatted).toContain('3. Done')
  })

  it('detects and formats indented code blocks', () => {
    const text = 'To install, run:\n\n    npm install\n    npm run dev'
    const formatted = formatToMarkdown(text)
    
    expect(formatted).toContain('```\nnpm install\nnpm run dev\n```')
  })

  it('detects and formats plain text links', () => {
    const text = 'For docs visit http://example.com or check https://github.com/repo.'
    const formatted = formatToMarkdown(text)
    
    expect(formatted).toContain('[http://example.com](http://example.com)')
    expect(formatted).toContain('[https://github.com/repo](https://github.com/repo)')
  })

  it('quickFormat calls formatToMarkdown successfully', () => {
    const text = 'MY TITLE\n\nHello.'
    expect(quickFormat(text)).toBe(formatToMarkdown(text))
  })

  it('correctly identifies whether text is already markdown', () => {
    const markdownText = '# Heading 1\n\n- list item 1\n- list item 2\n\n```js\nconsole.log(1)\n```'
    expect(isAlreadyMarkdown(markdownText)).toBe(true)

    const plainText = 'Just a regular plain text paragraph with no formatting.'
    expect(isAlreadyMarkdown(plainText)).toBe(false)
  })
})
