declare module 'word-extractor' {
  class WordExtractor {
    extract(source: string | Buffer): Promise<{
      getBody(): string
      getHeaders(): string
      getFootnotes(): string
    }>
  }

  export = WordExtractor
}
