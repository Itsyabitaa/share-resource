/**
 * Markdown Formatter Utility
 * Converts plain text to well-formatted markdown
 */

interface FormatterOptions {
    detectHeadings?: boolean
    detectLists?: boolean
    detectCodeBlocks?: boolean
    detectLinks?: boolean
    preserveWhitespace?: boolean
}

const DEFAULT_OPTIONS: FormatterOptions = {
    detectHeadings: true,
    detectLists: true,
    detectCodeBlocks: true,
    detectLinks: true,
    preserveWhitespace: false,
}

/**
 * Main function to convert plain text to markdown
 */
export function formatToMarkdown(text: string, options: FormatterOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    if (!text || text.trim().length === 0) {
        return text
    }

    let lines = text.split('\n')

    // Process the text line by line
    lines = detectAndFormatHeadings(lines, opts)
    lines = detectAndFormatLists(lines, opts)
    lines = detectAndFormatCodeBlocks(lines, opts)
    lines = formatLinks(lines, opts)
    lines = normalizeParagraphs(lines, opts)

    return lines.join('\n')
}

/**
 * Detect and format headings
 */
function detectAndFormatHeadings(lines: string[], opts: FormatterOptions): string[] {
    if (!opts.detectHeadings) return lines

    const result: string[] = []
    let foundFirstHeading = false
    let firstNonEmptyLine = true

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        const nextLine = i < lines.length - 1 ? lines[i + 1]?.trim() : ''

        // Skip empty lines for first line detection
        if (trimmed.length === 0) {
            result.push(line)
            continue
        }

        // Skip if already a markdown heading
        if (trimmed.match(/^#{1,6}\s/)) {
            result.push(line)
            if (!foundFirstHeading && trimmed.length > 2) {
                foundFirstHeading = true
            }
            firstNonEmptyLine = false
            continue
        }

        // Check for underline-style headings (=== or ---)
        if (nextLine && (nextLine.match(/^={3,}$/) || nextLine.match(/^-{3,}$/))) {
            const level = nextLine.startsWith('=') ? 1 : 2
            // First heading should be H1
            const finalLevel = !foundFirstHeading ? 1 : level
            result.push(`${'#'.repeat(finalLevel)} ${trimmed}`)
            foundFirstHeading = true
            firstNonEmptyLine = false
            i++ // Skip the underline
            continue
        }

        // Check for ALL CAPS headings (at least 2 words, all uppercase)
        if (trimmed.length > 0 &&
            trimmed === trimmed.toUpperCase() &&
            trimmed.split(/\s+/).length >= 2 &&
            /^[A-Z\s\d]+$/.test(trimmed)) {
            // First ALL CAPS heading is title (H1), others are H2
            const level = !foundFirstHeading ? 1 : 2
            result.push(`${'#'.repeat(level)} ${trimmed}`)
            foundFirstHeading = true
            firstNonEmptyLine = false
            continue
        }

        // Check for lines ending with colon that look like headers
        if (trimmed.match(/^[A-Z][^.!?]*:$/) && trimmed.length < 60) {
            result.push(`### ${trimmed.slice(0, -1)}`)
            firstNonEmptyLine = false
            continue
        }

        // If this is the first non-empty line and looks like a title (not a list item)
        if (firstNonEmptyLine &&
            !trimmed.match(/^\d+[.)\s]/) && // Not a numbered list
            !trimmed.match(/^[-*•]\s/) && // Not a bullet list
            trimmed.length > 5 && // At least some length
            trimmed.length < 100 && // Not too long
            !trimmed.match(/[.!?]$/)) { // Doesn't end with sentence punctuation
            result.push(`# ${trimmed}`)
            foundFirstHeading = true
            firstNonEmptyLine = false
            continue
        }

        firstNonEmptyLine = false
        result.push(line)
    }

    return result
}

/**
 * Detect and format lists
 */
function detectAndFormatLists(lines: string[], opts: FormatterOptions): string[] {
    if (!opts.detectLists) return lines

    const result: string[] = []
    let inList = false

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Skip if already markdown list
        if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
            result.push(line)
            inList = true
            continue
        }

        // Detect bullet points (•, -, *, ○, etc.)
        const bulletMatch = trimmed.match(/^[•○●◦▪▫■□]\s+(.+)$/)
        if (bulletMatch) {
            const indent = line.match(/^\s*/)?.[0] || ''
            result.push(`${indent}- ${bulletMatch[1]}`)
            inList = true
            continue
        }

        // Detect numbered lists (1), (a), 1., a., etc.)
        const numberedMatch = trimmed.match(/^(?:\()?([a-z\d]+)(?:\)|\.)\s+(.+)$/i)
        if (numberedMatch && trimmed.length > 3) {
            const indent = line.match(/^\s*/)?.[0] || ''
            result.push(`${indent}1. ${numberedMatch[2]}`)
            inList = true
            continue
        }

        // Add blank line after list ends
        if (inList && trimmed.length === 0) {
            result.push(line)
            inList = false
            continue
        }

        result.push(line)
    }

    return result
}

/**
 * Detect and format code blocks
 */
function detectAndFormatCodeBlocks(lines: string[], opts: FormatterOptions): string[] {
    if (!opts.detectCodeBlocks) return lines

    const result: string[] = []
    let inCodeBlock = false
    let codeBlockLines: string[] = []
    let codeBlockIndent = 0

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Skip if already in markdown code block
        if (trimmed.startsWith('```')) {
            result.push(line)
            continue
        }

        // Detect indented code (4+ spaces or 1+ tab)
        const indent = line.match(/^(\s+)/)?.[1] || ''
        const isIndented = indent.length >= 4 || indent.includes('\t')

        // Skip if it's a markdown list or heading (already formatted)
        const isMarkdownSyntax =
            trimmed.match(/^#{1,6}\s/) || // Heading
            trimmed.match(/^[-*+]\s/) || // Bullet list
            trimmed.match(/^\d+\.\s/) // Numbered list

        // Check if line looks like code (but not if it's markdown syntax)
        const looksLikeCode =
            !isMarkdownSyntax &&
            (isIndented ||
                trimmed.match(/^(function|const|let|var|class|def|public|private|if|for|while)\s/))

        if (looksLikeCode && trimmed.length > 0) {
            if (!inCodeBlock) {
                inCodeBlock = true
                codeBlockIndent = indent.length
                codeBlockLines = []
            }
            // Remove the common indent
            const dedented = line.substring(Math.min(codeBlockIndent, indent.length))
            codeBlockLines.push(dedented)
        } else {
            // End of code block
            if (inCodeBlock && codeBlockLines.length > 0) {
                result.push('```')
                result.push(...codeBlockLines)
                result.push('```')
                codeBlockLines = []
                inCodeBlock = false
            }
            result.push(line)
        }
    }

    // Handle remaining code block
    if (inCodeBlock && codeBlockLines.length > 0) {
        result.push('```')
        result.push(...codeBlockLines)
        result.push('```')
    }

    return result
}

/**
 * Format plain URLs to markdown links
 */
function formatLinks(lines: string[], opts: FormatterOptions): string[] {
    if (!opts.detectLinks) return lines

    const urlRegex = /(https?:\/\/[^\s]+)/g

    return lines.map(line => {
        // Skip if already has markdown links
        if (line.includes('](')) return line

        return line.replace(urlRegex, (url) => {
            // Clean up trailing punctuation
            const cleaned = url.replace(/[.,;:!?]+$/, '')
            return `[${cleaned}](${cleaned})`
        })
    })
}

/**
 * Normalize paragraphs and whitespace
 */
function normalizeParagraphs(lines: string[], opts: FormatterOptions): string[] {
    if (opts.preserveWhitespace) return lines

    const result: string[] = []
    let previousLineEmpty = false

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        const isEmpty = trimmed.length === 0

        // Skip multiple consecutive empty lines
        if (isEmpty) {
            if (!previousLineEmpty) {
                result.push('')
            }
            previousLineEmpty = true
        } else {
            result.push(line)
            previousLineEmpty = false
        }
    }

    // Remove leading/trailing empty lines
    while (result.length > 0 && result[0].trim() === '') {
        result.shift()
    }
    while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop()
    }

    return result
}

/**
 * Quick format function with sensible defaults
 */
export function quickFormat(text: string): string {
    return formatToMarkdown(text)
}

/**
 * Check if text is already well-formatted markdown
 */
export function isAlreadyMarkdown(text: string): boolean {
    const lines = text.split('\n')
    let markdownFeatures = 0

    for (const line of lines) {
        const trimmed = line.trim()

        // Check for markdown features
        if (trimmed.match(/^#{1,6}\s/)) markdownFeatures++
        if (trimmed.match(/^[-*+]\s/)) markdownFeatures++
        if (trimmed.match(/^\d+\.\s/)) markdownFeatures++
        if (trimmed.startsWith('```')) markdownFeatures++
        if (trimmed.match(/\[.+\]\(.+\)/)) markdownFeatures++

        // If we find enough markdown features, it's probably already markdown
        if (markdownFeatures >= 3) return true
    }

    return markdownFeatures >= 2
}
