export interface TitleToken {
  text: string;
  highlighted: boolean;
}

export function parseHighlightWords(value: string): string[] {
  return value
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
}

export function tokenizeTitle(line: string, highlightedWords: string): TitleToken[] {
  const highlights = new Set(parseHighlightWords(highlightedWords));
  return line.split(/(\s+)/).map((text) => ({
    text,
    highlighted: highlights.has(text.trim().toLowerCase())
  }));
}
