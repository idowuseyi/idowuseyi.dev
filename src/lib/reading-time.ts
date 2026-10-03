const WORDS_PER_MINUTE = 200;

/**
 * Whole minutes to read `text`, never less than 1.
 *
 * Deliberately not a dependency: the `reading-time` package is this much
 * logic. Code fences are stripped before counting because a long listing
 * is scanned, not read word by word, and counting it inflates the estimate.
 */
export function readingTime(text: string): number {
  const prose = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_~\[\]()|-]/g, ' ');
  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
