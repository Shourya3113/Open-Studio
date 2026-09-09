export type MatchTier = 'exact' | 'lineAnchored' | 'whitespaceInsensitive';

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

export interface HunkApplicationResult {
  hunkId: string;
  success: boolean;
  matchedTier?: MatchTier;
  matchedLineStart?: number;
  matchedLineEnd?: number;
  error?: string;
}

export interface DiffPreviewResult {
  originalContent: string;
  modifiedContent: string;
  hunkResults: HunkApplicationResult[];
  allApplied: boolean;
}
