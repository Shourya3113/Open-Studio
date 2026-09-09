import type { DiffHunk, FileDiff, DiffPreviewResult, HunkApplicationResult, MatchTier } from '../../types/diff';

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
 * Pure client-side parser for frugal diff blocks from raw LLM output.
 */
export function parseFrugalDiffClient(input: string): FileDiff[] {
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

interface MatchLocation {
  lineStart: number; // 1-based
  lineEnd: number; // 1-based
  tier: MatchTier;
  indentDelta: number;
}

/**
 * 3-tier matcher for diff hunks.
 */
function matchHunkClient(fileLines: string[], hunk: DiffHunk): { loc?: MatchLocation; error?: string } {
  if (!hunk.search) {
    const insertLine = hunk.lineHint ? Math.max(1, Math.min(fileLines.length + 1, hunk.lineHint)) : 1;
    return {
      loc: {
        lineStart: insertLine,
        lineEnd: Math.max(0, insertLine - 1),
        tier: 'exact',
        indentDelta: 0,
      },
    };
  }

  const searchLines = hunk.search.split('\n');
  const nSearch = searchLines.length;

  if (nSearch > fileLines.length) {
    return { error: `Search block (${nSearch} lines) exceeds target file length (${fileLines.length} lines)` };
  }

  // Tier 1: Exact line sequence
  const exactMatches: number[] = [];
  for (let i = 0; i <= fileLines.length - nSearch; i++) {
    const slice = fileLines.slice(i, i + nSearch);
    if (slice.every((val, idx) => val === searchLines[idx])) {
      exactMatches.push(i);
    }
  }

  if (exactMatches.length === 1) {
    const idx = exactMatches[0];
    return {
      loc: {
        lineStart: idx + 1,
        lineEnd: idx + nSearch,
        tier: 'exact',
        indentDelta: 0,
      },
    };
  } else if (exactMatches.length > 1) {
    if (hunk.lineHint !== undefined) {
      const targetIdx = Math.max(0, hunk.lineHint - 1);
      const sorted = [...exactMatches].sort((a, b) => Math.abs(a - targetIdx) - Math.abs(b - targetIdx));
      const d0 = Math.abs(sorted[0] - targetIdx);
      const d1 = Math.abs(sorted[1] - targetIdx);
      if (d0 < d1) {
        return {
          loc: {
            lineStart: sorted[0] + 1,
            lineEnd: sorted[0] + nSearch,
            tier: 'lineAnchored',
            indentDelta: 0,
          },
        };
      }
      return {
        error: `Ambiguous match: search block matched equally near line ${hunk.lineHint} (lines ${sorted[0] + 1} and ${sorted[1] + 1})`,
      };
    }
    return {
      error: `Ambiguous match: search block matches ${exactMatches.length} locations at lines: ${exactMatches.map((i) => i + 1).join(', ')}. Provide a line anchor hint.`,
    };
  }

  // Tier 2: Line-Number Anchored (window search)
  if (hunk.lineHint !== undefined) {
    const targetIdx = Math.max(0, hunk.lineHint - 1);
    const winStart = Math.max(0, targetIdx - 15);
    const winEnd = Math.min(fileLines.length - nSearch, targetIdx + 15);
    const winMatches: number[] = [];
    for (let i = winStart; i <= winEnd; i++) {
      const slice = fileLines.slice(i, i + nSearch);
      if (slice.every((val, idx) => val === searchLines[idx])) {
        winMatches.push(i);
      }
    }
    if (winMatches.length === 1) {
      const idx = winMatches[0];
      return {
        loc: {
          lineStart: idx + 1,
          lineEnd: idx + nSearch,
          tier: 'lineAnchored',
          indentDelta: 0,
        },
      };
    }
  }

  // Tier 3: Whitespace-Insensitive
  // Trailing trimmed
  const trailingMatches: number[] = [];
  for (let i = 0; i <= fileLines.length - nSearch; i++) {
    const slice = fileLines.slice(i, i + nSearch);
    if (slice.every((val, idx) => val.trimEnd() === searchLines[idx].trimEnd())) {
      trailingMatches.push(i);
    }
  }
  if (trailingMatches.length === 1) {
    const idx = trailingMatches[0];
    return {
      loc: {
        lineStart: idx + 1,
        lineEnd: idx + nSearch,
        tier: 'whitespaceInsensitive',
        indentDelta: 0,
      },
    };
  }

  // Fully trimmed
  const fullyTrimmedMatches: number[] = [];
  for (let i = 0; i <= fileLines.length - nSearch; i++) {
    const slice = fileLines.slice(i, i + nSearch);
    if (slice.every((val, idx) => val.trim() === searchLines[idx].trim())) {
      fullyTrimmedMatches.push(i);
    }
  }

  if (fullyTrimmedMatches.length === 1) {
    const idx = fullyTrimmedMatches[0];
    const origIndent = (fileLines[idx].match(/^\s*/) || [''])[0].length;
    const searchIndent = (searchLines[0].match(/^\s*/) || [''])[0].length;
    return {
      loc: {
        lineStart: idx + 1,
        lineEnd: idx + nSearch,
        tier: 'whitespaceInsensitive',
        indentDelta: origIndent - searchIndent,
      },
    };
  } else if (fullyTrimmedMatches.length > 1) {
    if (hunk.lineHint !== undefined) {
      const targetIdx = Math.max(0, hunk.lineHint - 1);
      const sorted = [...fullyTrimmedMatches].sort((a, b) => Math.abs(a - targetIdx) - Math.abs(b - targetIdx));
      const d0 = Math.abs(sorted[0] - targetIdx);
      const d1 = Math.abs(sorted[1] - targetIdx);
      if (d0 < d1) {
        const idx = sorted[0];
        const origIndent = (fileLines[idx].match(/^\s*/) || [''])[0].length;
        const searchIndent = (searchLines[0].match(/^\s*/) || [''])[0].length;
        return {
          loc: {
            lineStart: idx + 1,
            lineEnd: idx + nSearch,
            tier: 'whitespaceInsensitive',
            indentDelta: origIndent - searchIndent,
          },
        };
      }
    }
    return {
      error: `Ambiguous whitespace-insensitive match: search block matches multiple locations. Provide line anchor.`,
    };
  }

  return { error: 'Search block not found in file' };
}

/**
 * Pure client-side application of hunks against file content.
 */
export function applyHunksClient(originalContent: string, hunks: DiffHunk[]): DiffPreviewResult {
  const hasCrlf = originalContent.includes('\r\n');
  const newline = hasCrlf ? '\r\n' : '\n';
  const endsWithNewline = originalContent.endsWith('\n');

  const fileLines = originalContent.split(/\r?\n/);
  if (fileLines.length > 0 && fileLines[fileLines.length - 1] === '' && endsWithNewline) {
    fileLines.pop();
  }

  const hunkResults: { origIdx: number; res: HunkApplicationResult }[] = [];
  const matches: { origIdx: number; hunk: DiffHunk; loc: MatchLocation }[] = [];

  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    const match = matchHunkClient(fileLines, hunk);
    if (match.loc) {
      matches.push({ origIdx: i, hunk, loc: match.loc });
    } else {
      hunkResults.push({
        origIdx: i,
        res: {
          hunkId: hunk.id,
          success: false,
          error: match.error || 'Failed to match hunk',
        },
      });
    }
  }

  // Check for conflicts/overlapping hunks
  const nonOverlapping: typeof matches = [];
  for (const m of matches) {
    let overlaps = false;
    for (const other of nonOverlapping) {
      if (m.loc.lineStart <= other.loc.lineEnd && other.loc.lineStart <= m.loc.lineEnd) {
        overlaps = true;
        hunkResults.push({
          origIdx: m.origIdx,
          res: {
            hunkId: m.hunk.id,
            success: false,
            matchedTier: m.loc.tier,
            matchedLineStart: m.loc.lineStart,
            matchedLineEnd: m.loc.lineEnd,
            error: `Hunk conflicts with overlapping hunk '${other.hunk.id}' (lines ${other.loc.lineStart}-${other.loc.lineEnd})`,
          },
        });
        break;
      }
    }
    if (!overlaps) {
      nonOverlapping.push(m);
    }
  }

  // Sort descending by lineStart to splice bottom-to-top
  nonOverlapping.sort((a, b) => b.loc.lineStart - a.loc.lineStart);

  for (const m of nonOverlapping) {
    const replaceLines = m.hunk.replace
      ? m.hunk.replace.split(/\r?\n/).map((line) => {
          if (m.loc.indentDelta > 0) {
            return ' '.repeat(m.loc.indentDelta) + line;
          } else if (m.loc.indentDelta < 0) {
            const strip = -m.loc.indentDelta;
            const spaces = (line.match(/^ */) || [''])[0].length;
            return line.substring(Math.min(strip, spaces));
          }
          return line;
        })
      : [];

    const startIdx = Math.max(0, Math.min(fileLines.length, m.loc.lineStart - 1));
    const deleteCount = Math.max(0, m.loc.lineEnd - m.loc.lineStart + 1);

    fileLines.splice(startIdx, deleteCount, ...replaceLines);

    hunkResults.push({
      origIdx: m.origIdx,
      res: {
        hunkId: m.hunk.id,
        success: true,
        matchedTier: m.loc.tier,
        matchedLineStart: m.loc.lineStart,
        matchedLineEnd: m.loc.lineEnd,
      },
    });
  }

  hunkResults.sort((a, b) => a.origIdx - b.origIdx);
  const finalResults = hunkResults.map((r) => r.res);

  let modifiedContent = fileLines.join(newline);
  if (endsWithNewline && modifiedContent) {
    modifiedContent += newline;
  }

  return {
    originalContent,
    modifiedContent,
    hunkResults: finalResults,
    allApplied: finalResults.length > 0 && finalResults.every((r) => r.success),
  };
}

/**
 * Parses frugal diff blocks with Tauri backend IPC and client-side fallback.
 */
export async function parseFrugalDiff(diffText: string): Promise<FileDiff[]> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<FileDiff[]>('parse_frugal_diff', { diffText });
  } catch {
    return parseFrugalDiffClient(diffText);
  }
}

/**
 * Previews the application of diff hunks with Tauri backend IPC and client-side fallback.
 */
export async function previewFrugalDiff(originalContent: string, hunks: DiffHunk[]): Promise<DiffPreviewResult> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<DiffPreviewResult>('preview_frugal_diff', { originalContent, hunks });
  } catch {
    return applyHunksClient(originalContent, hunks);
  }
}

/**
 * Applies a FileDiff to a workspace file via Tauri IPC with client fallback.
 */
export async function applyFrugalDiff(workspaceRoot: string, fileDiff: FileDiff): Promise<DiffPreviewResult> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<DiffPreviewResult>('apply_frugal_diff', { workspaceRoot, fileDiff });
  } catch {
    return applyHunksClient('', fileDiff.hunks);
  }
}
