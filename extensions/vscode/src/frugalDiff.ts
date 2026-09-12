/**
 * Frugal Search/Replace Diff Parser and 3-Tier Matcher.
 * 98% token reduction vs full file rewrites, engineered for local 7B models.
 */

export interface DiffHunk {
  id: string;
  lineHint?: number;
  search: string;
  replace: string;
}

export interface FileDiff {
  filePath: string;
  hunks: DiffHunk[];
}

export type MatchTier = 'exact' | 'lineAnchored' | 'whitespaceTrimmed' | 'none';

export interface HunkApplicationResult {
  hunkId: string;
  success: boolean;
  tier: MatchTier;
  appliedLine?: number;
  error?: string;
}

export interface DiffPreviewResult {
  success: boolean;
  patchedContent: string;
  appliedCount: number;
  totalCount: number;
  results: HunkApplicationResult[];
}

/**
 * Parses line anchor hint from SEARCH block header (e.g. `<<<<<<< SEARCH (line 42)`).
 */
export function extractLineHint(header: string): number | undefined {
  const match = header.match(/line[s\s:#]*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Sanitizes and normalizes file paths from FILE: headers.
 */
export function cleanFilePath(raw: string): string {
  let trimmed = raw.trim();
  const prefixes = ['FILE:', 'File:', 'file:', '***', '---'];
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      trimmed = trimmed.substring(prefix.length).trim();
      break;
    }
  }
  return trimmed.replace(/^[`"'\s*:]+|[`"'\s*:]+$/g, '').replace(/\\/g, '/');
}

/**
 * Parses frugal search/replace diff blocks from raw LLM output.
 */
export function parseFrugalDiff(input: string): FileDiff[] {
  const files: FileDiff[] = [];
  let currentFilePath = 'untitled';
  let currentHunks: DiffHunk[] = [];
  let hunkCounter = 1;

  let state: 'scanning' | 'inSearch' | 'inReplace' = 'scanning';
  let lineHint: number | undefined;
  let searchLines: string[] = [];
  let replaceLines: string[] = [];

  const lines = input.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (state === 'scanning') {
      if (
        (trimmed.startsWith('FILE:') ||
          trimmed.startsWith('File:') ||
          trimmed.startsWith('file:') ||
          trimmed.startsWith('*** ') ||
          trimmed.startsWith('--- ')) &&
        !trimmed.startsWith('--- a/')
      ) {
        const newPath = cleanFilePath(trimmed);
        if (newPath) {
          if (currentHunks.length > 0) {
            files.push({ filePath: currentFilePath, hunks: currentHunks });
            currentHunks = [];
          }
          currentFilePath = newPath;
        }
        continue;
      }

      if (trimmed.startsWith('<<<<<<< SEARCH') || trimmed.startsWith('<<<<<<< search')) {
        lineHint = extractLineHint(trimmed);
        searchLines = [];
        state = 'inSearch';
      }
    } else if (state === 'inSearch') {
      if (trimmed.startsWith('=======')) {
        replaceLines = [];
        state = 'inReplace';
      } else {
        searchLines.push(line);
      }
    } else if (state === 'inReplace') {
      if (
        trimmed.startsWith('>>>>>>> REPLACE') ||
        trimmed.startsWith('>>>>>>> replace') ||
        trimmed.startsWith('>>>>>>>')
      ) {
        currentHunks.push({
          id: `hunk-${hunkCounter++}`,
          lineHint,
          search: searchLines.join('\n'),
          replace: replaceLines.join('\n'),
        });
        state = 'scanning';
      } else {
        replaceLines.push(line);
      }
    }
  }

  if (currentHunks.length > 0) {
    files.push({ filePath: currentFilePath, hunks: currentHunks });
  }

  return files;
}

/**
 * Finds all exact character indices of search string in document.
 */
function findAllExactMatches(document: string, search: string): number[] {
  const indices: number[] = [];
  let idx = document.indexOf(search);
  while (idx !== -1) {
    indices.push(idx);
    idx = document.indexOf(search, idx + 1);
  }
  return indices;
}

/**
 * Finds character offset anchored around a line hint.
 */
function findLineAnchoredMatch(
  document: string,
  search: string,
  lineHint: number,
  tolerance = 15
): number {
  const lines = document.split(/\r?\n/);
  const searchLines = search.split(/\r?\n/);

  const targetLineIdx = lineHint - 1;
  const startLine = Math.max(0, targetLineIdx - tolerance);
  const endLine = Math.min(lines.length - searchLines.length, targetLineIdx + tolerance);

  for (let l = startLine; l <= endLine; l++) {
    let matches = true;
    for (let sl = 0; sl < searchLines.length; sl++) {
      if (lines[l + sl] !== searchLines[sl]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return lines.slice(0, l).join('\n').length + (l > 0 ? 1 : 0);
    }
  }

  return -1;
}

/**
 * Finds match by trimming whitespace and normalizing indentation.
 */
function findWhitespaceTrimmedMatch(document: string, search: string): { index: number; length: number } {
  const docLines = document.split(/\r?\n/);
  const searchLines = search.split(/\r?\n/);

  const trimmedSearchLines = searchLines.map((l) => l.trim());

  for (let i = 0; i <= docLines.length - searchLines.length; i++) {
    let matches = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (docLines[i + j].trim() !== trimmedSearchLines[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      const matchStart = docLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
      const matchContent = docLines.slice(i, i + searchLines.length).join('\n');
      return { index: matchStart, length: matchContent.length };
    }
  }

  return { index: -1, length: 0 };
}

/**
 * Applies hunks sequentially using 3-tier matching.
 */
export function applyFrugalDiff(
  originalContent: string,
  hunks: DiffHunk[]
): DiffPreviewResult {
  let content = originalContent;
  const results: HunkApplicationResult[] = [];
  let appliedCount = 0;

  for (const hunk of hunks) {
    // Insertion special-case (empty search)
    if (!hunk.search) {
      if (hunk.lineHint && hunk.lineHint > 0) {
        const lines = content.split(/\r?\n/);
        const insertIdx = Math.min(lines.length, hunk.lineHint - 1);
        lines.splice(insertIdx, 0, hunk.replace);
        content = lines.join('\n');
        results.push({
          hunkId: hunk.id,
          success: true,
          tier: 'lineAnchored',
          appliedLine: hunk.lineHint,
        });
        appliedCount++;
      } else {
        content = hunk.replace + (content ? '\n' + content : '');
        results.push({
          hunkId: hunk.id,
          success: true,
          tier: 'exact',
          appliedLine: 1,
        });
        appliedCount++;
      }
      continue;
    }

    let matchIdx = -1;
    let matchLength = hunk.search.length;
    let tier: MatchTier = 'none';

    // Tier 1 & 2: Exact Match (with Line Hint Disambiguation if multiple occurrences)
    const exactMatches = findAllExactMatches(content, hunk.search);
    if (exactMatches.length === 1) {
      matchIdx = exactMatches[0];
      tier = 'exact';
    } else if (exactMatches.length > 1) {
      if (hunk.lineHint !== undefined) {
        // Disambiguate by proximity to lineHint
        const targetLine = hunk.lineHint;
        const ranked = exactMatches
          .map((idx) => {
            const lineNum = content.slice(0, idx).split('\n').length;
            return { idx, lineNum, dist: Math.abs(lineNum - targetLine) };
          })
          .sort((a, b) => a.dist - b.dist);

        matchIdx = ranked[0].idx;
        tier = 'lineAnchored';
      } else {
        // Fallback to first occurrence if no line hint
        matchIdx = exactMatches[0];
        tier = 'exact';
      }
    }

    // Tier 2 Fallback: Line-Anchored Window Match if exact substring wasn't found
    if (matchIdx === -1 && hunk.lineHint !== undefined) {
      matchIdx = findLineAnchoredMatch(content, hunk.search, hunk.lineHint);
      if (matchIdx !== -1) {
        tier = 'lineAnchored';
      }
    }

    // Tier 3: Whitespace-Trimmed Match
    if (matchIdx === -1) {
      const wsResult = findWhitespaceTrimmedMatch(content, hunk.search);
      if (wsResult.index !== -1) {
        matchIdx = wsResult.index;
        matchLength = wsResult.length;
        tier = 'whitespaceTrimmed';
      }
    }

    if (matchIdx !== -1) {
      const lineNum = content.slice(0, matchIdx).split('\n').length;
      content = content.slice(0, matchIdx) + hunk.replace + content.slice(matchIdx + matchLength);
      results.push({
        hunkId: hunk.id,
        success: true,
        tier,
        appliedLine: lineNum,
      });
      appliedCount++;
    } else {
      results.push({
        hunkId: hunk.id,
        success: false,
        tier: 'none',
        error: 'Search block not found in document',
      });
    }
  }

  return {
    success: appliedCount === hunks.length,
    patchedContent: content,
    appliedCount,
    totalCount: hunks.length,
    results,
  };
}
