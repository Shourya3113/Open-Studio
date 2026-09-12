import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => {
  class MockPosition {
    constructor(public line: number, public character: number) {}
  }

  class MockRange {
    constructor(public start: MockPosition, public end: MockPosition) {}
    get isEmpty() {
      return this.start.line === this.end.line && this.start.character === this.end.character;
    }
  }

  class MockSelection extends MockRange {
    public anchor: MockPosition;
    public active: MockPosition;
    public isReversed = false;
    constructor(start: MockPosition, end: MockPosition) {
      super(start, end);
      this.anchor = start;
      this.active = end;
    }
  }

  class MockUri {
    constructor(public fsPath: string) {}
    static file(path: string): MockUri {
      return new MockUri(path);
    }
  }

  return {
    Position: MockPosition,
    Range: MockRange,
    Selection: MockSelection,
    Uri: MockUri,
    workspace: {
      workspaceFolders: [{ uri: new MockUri('d:/projects/Open Studio') }],
    },
  };
});

import {
  getEditorContext,
  buildChatMLPrompt,
  buildQuickActionPrompt,
  FRUGAL_SYSTEM_PROMPT,
} from './promptBuilder';
import * as vscode from 'vscode';

describe('VS Code Extension - PromptBuilder', () => {
  describe('getEditorContext', () => {
    it('returns undefined when editor is not provided', () => {
      expect(getEditorContext(undefined)).toBeUndefined();
    });

    it('returns undefined when editor document is missing', () => {
      const mockEditor = {} as vscode.TextEditor;
      expect(getEditorContext(mockEditor)).toBeUndefined();
    });

    it('extracts editor context with active selection', () => {
      const mockEditor = {
        document: {
          fileName: 'd:/projects/Open Studio/src/math/calculator.ts',
          languageId: 'typescript',
          lineCount: 42,
          getText: (range?: any) => 'export function add(a: number, b: number): number {\n  return a + b;\n}',
        },
        selection: new (vscode as any).Selection(
          new (vscode as any).Position(10, 0),
          new (vscode as any).Position(12, 1)
        ),
      } as unknown as vscode.TextEditor;

      const context = getEditorContext(mockEditor);
      expect(context).toBeDefined();
      expect(context?.filePath).toBe('d:/projects/Open Studio/src/math/calculator.ts');
      expect(context?.relativePath).toBe('src/math/calculator.ts');
      expect(context?.languageId).toBe('typescript');
      expect(context?.selectedText).toContain('export function add');
      expect(context?.selectionRange).toEqual({
        startLine: 11,
        endLine: 13,
        startChar: 1,
        endChar: 2,
      });
      expect(context?.cursorLine).toBe(13);
      expect(context?.totalLines).toBe(42);
    });

    it('handles editor with no selection (cursor only)', () => {
      const cursorPos = new (vscode as any).Position(5, 4);
      const mockEditor = {
        document: {
          fileName: 'd:/projects/Open Studio/README.md',
          languageId: 'markdown',
          lineCount: 20,
          getText: () => '',
        },
        selection: new (vscode as any).Selection(cursorPos, cursorPos),
      } as unknown as vscode.TextEditor;

      const context = getEditorContext(mockEditor);
      expect(context).toBeDefined();
      expect(context?.selectedText).toBe('');
      expect(context?.cursorLine).toBe(6);
      expect(context?.relativePath).toBe('README.md');
    });
  });

  describe('buildChatMLPrompt', () => {
    it('builds valid ChatML with system prompt when context is omitted', () => {
      const prompt = buildChatMLPrompt('How do I run tests?');

      expect(prompt).toContain('<|im_start|>system');
      expect(prompt).toContain(FRUGAL_SYSTEM_PROMPT);
      expect(prompt).toContain('<|im_end|>');
      expect(prompt).toContain('<|im_start|>user\nHow do I run tests?<|im_end|>');
      expect(prompt).toContain('<|im_start|>assistant\n');
    });

    it('embeds active file and selection context into user message', () => {
      const context = {
        filePath: '/workspace/src/app.ts',
        relativePath: 'src/app.ts',
        languageId: 'typescript',
        selectedText: 'const x = 10;',
        selectionRange: {
          startLine: 5,
          endLine: 5,
          startChar: 1,
          endChar: 14,
        },
        cursorLine: 5,
        totalLines: 30,
      };

      const prompt = buildChatMLPrompt('Refactor this variable', context);

      expect(prompt).toContain('Active Editor Context:');
      expect(prompt).toContain('- File: src/app.ts (typescript)');
      expect(prompt).toContain('- Selection (Lines 5-5):');
      expect(prompt).toContain('```typescript\nconst x = 10;\n```');
      expect(prompt).toContain('Refactor this variable');
    });

    it('includes cursor line if there is no selected text', () => {
      const context = {
        filePath: '/workspace/src/app.ts',
        relativePath: 'src/app.ts',
        languageId: 'typescript',
        selectedText: '',
        cursorLine: 18,
        totalLines: 30,
      };

      const prompt = buildChatMLPrompt('What does this file do?', context);

      expect(prompt).toContain('- Cursor at line: 18');
      expect(prompt).toContain('What does this file do?');
    });
  });

  describe('buildQuickActionPrompt', () => {
    const snippet = 'function fib(n: number): number { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }';

    it('builds explain action prompt', () => {
      const result = buildQuickActionPrompt('explain', snippet, 'src/math.ts', 'typescript');

      expect(result.action).toBe('explain');
      expect(result.userPrompt).toContain('Please explain this typescript code from \'src/math.ts\'');
      expect(result.userPrompt).toContain('algorithmic complexity');
      expect(result.fullPrompt).toContain('<|im_start|>system');
      expect(result.fullPrompt).toContain('<|im_start|>assistant');
    });

    it('builds refactor action prompt with frugal diff request', () => {
      const result = buildQuickActionPrompt('refactor', snippet, 'src/math.ts', 'typescript');

      expect(result.action).toBe('refactor');
      expect(result.userPrompt).toContain('Refactor the following typescript code');
      expect(result.userPrompt).toContain('using frugal SEARCH/REPLACE diff blocks');
      expect(result.userPrompt).toContain(snippet);
    });

    it('builds generateTests action prompt', () => {
      const result = buildQuickActionPrompt('generateTests', snippet, 'src/math.ts', 'typescript');

      expect(result.action).toBe('generateTests');
      expect(result.userPrompt).toContain('Generate comprehensive unit tests');
      expect(result.userPrompt).toContain('happy paths, edge cases');
    });

    it('builds fix action prompt with bug detection request', () => {
      const result = buildQuickActionPrompt('fix', snippet, 'src/math.ts', 'typescript');

      expect(result.action).toBe('fix');
      expect(result.userPrompt).toContain('Analyze the following typescript code');
      expect(result.userPrompt).toContain('for bugs, edge case crashes');
      expect(result.userPrompt).toContain('frugal SEARCH/REPLACE diff blocks');
    });
  });
});
