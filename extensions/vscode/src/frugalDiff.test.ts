import { describe, it, expect } from 'vitest';
import {
  extractLineHint,
  cleanFilePath,
  parseFrugalDiff,
  applyFrugalDiff,
} from './frugalDiff';

describe('VS Code Extension - Frugal Diff Parser & Matcher', () => {
  describe('extractLineHint', () => {
    it('extracts line number from varied header formats', () => {
      expect(extractLineHint('<<<<<<< SEARCH (line 42)')).toBe(42);
      expect(extractLineHint('<<<<<<< SEARCH (lines: 105)')).toBe(105);
      expect(extractLineHint('<<<<<<< SEARCH line 7')).toBe(7);
      expect(extractLineHint('<<<<<<< SEARCH')).toBeUndefined();
    });
  });

  describe('cleanFilePath', () => {
    it('normalizes file paths and strips prefixes', () => {
      expect(cleanFilePath('FILE: src/index.ts')).toBe('src/index.ts');
      expect(cleanFilePath('File: `lib/utils.py`')).toBe('lib/utils.py');
      expect(cleanFilePath('*** "components\\Button.tsx"')).toBe('components/Button.tsx');
    });
  });

  describe('parseFrugalDiff', () => {
    it('parses single-file frugal diff block', () => {
      const diffText = `
FILE: src/math.ts
<<<<<<< SEARCH (line 10)
function add(a: number, b: number): number {
  return a - b;
}
=======
function add(a: number, b: number): number {
  return a + b;
}
>>>>>>> REPLACE
`;

      const files = parseFrugalDiff(diffText);
      expect(files.length).toBe(1);
      expect(files[0].filePath).toBe('src/math.ts');
      expect(files[0].hunks.length).toBe(1);

      const hunk = files[0].hunks[0];
      expect(hunk.lineHint).toBe(10);
      expect(hunk.search).toContain('return a - b;');
      expect(hunk.replace).toContain('return a + b;');
    });

    it('parses multiple hunks across files', () => {
      const diffText = `
FILE: src/a.ts
<<<<<<< SEARCH
const a = 1;
=======
const a = 2;
>>>>>>> REPLACE

FILE: src/b.ts
<<<<<<< SEARCH
const b = 1;
=======
const b = 2;
>>>>>>> REPLACE
`;

      const files = parseFrugalDiff(diffText);
      expect(files.length).toBe(2);
      expect(files[0].filePath).toBe('src/a.ts');
      expect(files[1].filePath).toBe('src/b.ts');
    });
  });

  describe('applyFrugalDiff (3-Tier Matcher)', () => {
    it('applies exact match replacement (Tier 1)', () => {
      const original = 'line 1\nline 2: to replace\nline 3';
      const hunks = [
        {
          id: 'hunk-1',
          search: 'line 2: to replace',
          replace: 'line 2: replaced!',
        },
      ];

      const result = applyFrugalDiff(original, hunks);
      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(1);
      expect(result.results[0].tier).toBe('exact');
      expect(result.patchedContent).toBe('line 1\nline 2: replaced!\nline 3');
    });

    it('applies line-anchored match when multiple similar lines exist (Tier 2)', () => {
      const original = 'target line\nsome text\ntarget line\nother text';
      const hunks = [
        {
          id: 'hunk-1',
          lineHint: 3,
          search: 'target line',
          replace: 'updated line 3',
        },
      ];

      const result = applyFrugalDiff(original, hunks);
      expect(result.success).toBe(true);
      expect(result.patchedContent).toBe('target line\nsome text\nupdated line 3\nother text');
    });

    it('applies whitespace-trimmed match when indentation differs (Tier 3)', () => {
      const original = '  function test() {\n    const x = 10;\n  }';
      const hunks = [
        {
          id: 'hunk-1',
          search: 'function test() {\n  const x = 10;\n}',
          replace: 'function test() {\n  const x = 20;\n}',
        },
      ];

      const result = applyFrugalDiff(original, hunks);
      expect(result.success).toBe(true);
      expect(result.results[0].tier).toBe('whitespaceTrimmed');
      expect(result.patchedContent).toContain('const x = 20;');
    });

    it('fails gracefully when search block is absent', () => {
      const original = 'completely different content';
      const hunks = [
        {
          id: 'hunk-1',
          search: 'nonexistent block',
          replace: 'replacement',
        },
      ];

      const result = applyFrugalDiff(original, hunks);
      expect(result.success).toBe(false);
      expect(result.appliedCount).toBe(0);
      expect(result.results[0].error).toBe('Search block not found in document');
      expect(result.patchedContent).toBe(original);
    });
  });
});
