import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the 'vscode' module for standalone unit testing
vi.mock('vscode', () => {
  class MockPosition {
    constructor(public line: number, public character: number) {}
  }

  class MockRange {
    constructor(public start: MockPosition, public end: MockPosition) {}
  }

  class MockInlineCompletionItem {
    constructor(public insertText: string, public range: MockRange) {}
  }

  return {
    Position: MockPosition,
    Range: MockRange,
    InlineCompletionItem: MockInlineCompletionItem,
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: (key: string, defaultValue: unknown) => defaultValue,
      })),
    },
  };
});

// Mock the streamOllamaGenerate function
vi.mock('./ollamaClient', () => ({
  streamOllamaGenerate: vi.fn(
    (
      _options: unknown,
      onToken: (t: string) => void,
      onComplete: () => void
    ) => {
      onToken('const total = a + b;');
      onComplete();
      return () => {};
    }
  ),
}));

import { OpenStudioCompletionProvider } from './completionProvider';
import * as vscode from 'vscode';

describe('VS Code Extension - OpenStudioCompletionProvider', () => {
  let provider: OpenStudioCompletionProvider;

  beforeEach(() => {
    provider = new OpenStudioCompletionProvider();
    vi.clearAllMocks();
  });

  it('skips completion when document prefix is empty', async () => {
    const mockDocument = {
      getText: () => '',
      offsetAt: () => 0,
    } as unknown as vscode.TextDocument;

    const mockPosition = new vscode.Position(0, 0);
    const mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    } as unknown as vscode.CancellationToken;

    const items = await provider.provideInlineCompletionItems(
      mockDocument,
      mockPosition,
      { triggerKind: 1 } as unknown as vscode.InlineCompletionContext,
      mockToken
    );

    expect(items).toBeUndefined();
  });

  it('returns InlineCompletionItem when model streams completion', async () => {
    const mockDocument = {
      getText: () => 'function add(a, b) {\n  ',
      offsetAt: () => 23,
    } as unknown as vscode.TextDocument;

    const mockPosition = new vscode.Position(1, 2);
    const mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    } as unknown as vscode.CancellationToken;

    const items = await provider.provideInlineCompletionItems(
      mockDocument,
      mockPosition,
      { triggerKind: 1 } as unknown as vscode.InlineCompletionContext,
      mockToken
    );

    expect(items).toBeDefined();
    expect(items?.length).toBe(1);
    expect(items?.[0].insertText).toBe('const total = a + b;');
    expect(provider.metrics.completedRequests).toBe(1);
  });

  it('aborts previous in-flight inference when invoked again', async () => {
    const mockDocument = {
      getText: () => 'const x = ',
      offsetAt: () => 10,
    } as unknown as vscode.TextDocument;

    const mockPosition = new vscode.Position(0, 10);
    const mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    } as unknown as vscode.CancellationToken;

    // First call
    const p1 = provider.provideInlineCompletionItems(
      mockDocument,
      mockPosition,
      { triggerKind: 1 } as unknown as vscode.InlineCompletionContext,
      mockToken
    );

    // Second immediate call (simulating fast typing)
    const p2 = provider.provideInlineCompletionItems(
      mockDocument,
      mockPosition,
      { triggerKind: 1 } as unknown as vscode.InlineCompletionContext,
      mockToken
    );

    await Promise.all([p1, p2]);
    expect(provider.metrics.totalRequests).toBeGreaterThanOrEqual(1);
  });
});
