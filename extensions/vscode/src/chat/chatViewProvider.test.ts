import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => {
  class MockUri {
    constructor(public fsPath: string) {}
    static file(path: string): MockUri {
      return new MockUri(path);
    }
  }

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

  return {
    Uri: MockUri,
    Position: MockPosition,
    Range: MockRange,
    Selection: MockSelection,
    workspace: {
      workspaceFolders: [{ uri: new MockUri('d:/projects/Open Studio') }],
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string, defaultVal: unknown) => {
          if (key === 'ollamaEndpoint') return 'http://127.0.0.1:11434';
          if (key === 'chatModel') return 'qwen2.5-coder:7b';
          return defaultVal;
        }),
      })),
      openTextDocument: vi.fn(),
    },
    window: {
      activeTextEditor: undefined,
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
    },
    commands: {
      executeCommand: vi.fn(async () => {}),
    },
  };
});

let mockStreamError: Error | null = null;
let mockStreamTokens = ['Hello! ', 'Here is the ', 'solution.'];
let abortWasCalled = false;

vi.mock('../ollamaClient', () => ({
  checkOllamaHealth: vi.fn(async () => ({
    online: true,
    version: '0.3.12',
    models: ['qwen2.5-coder:7b'],
    hasModel: true,
  })),
  streamOllamaGenerate: vi.fn((_opts, onToken, onComplete, onError) => {
    abortWasCalled = false;
    if (mockStreamError) {
      onError(mockStreamError);
      return () => {
        abortWasCalled = true;
      };
    }
    for (const token of mockStreamTokens) {
      onToken(token);
    }
    onComplete();
    return () => {
      abortWasCalled = true;
    };
  }),
}));

vi.mock('../diff/patchOrchestrator', () => ({
  applyMultiFilePatch: vi.fn(async (diff: string) => {
    if (diff.includes('FAIL')) {
      return { success: false, appliedHunks: 0, totalHunks: 1, filesModified: [], error: 'Hunk mismatch' };
    }
    return { success: true, appliedHunks: 1, totalHunks: 1, filesModified: ['src/main.ts'] };
  }),
  dryRunMultiFilePatch: vi.fn(async (diff: string) => {
    if (diff.includes('FAIL')) {
      return { success: false, files: [], totalHunks: 1, appliedHunks: 0, failedHunks: 1, errors: ['Mismatch'] };
    }
    return {
      success: true,
      files: [
        {
          filePath: 'src/main.ts',
          uri: { fsPath: 'd:/projects/Open Studio/src/main.ts' },
          hunks: [],
          beforeContent: 'old',
          preview: { success: true, patchedContent: 'new', appliedCount: 1, totalCount: 1, results: [] },
        },
      ],
      totalHunks: 1,
      appliedHunks: 1,
      failedHunks: 0,
      errors: [],
    };
  }),
}));

vi.mock('../diff/virtualDocProvider', () => {
  const instance = {
    setVirtualContent: vi.fn(),
    dispose: vi.fn(),
  };
  return {
    OpenStudioDiffContentProvider: {
      getInstance: () => instance,
    },
    createVirtualDiffUri: (path: string) => ({ fsPath: path, scheme: 'openstudio-diff' }),
  };
});

import { ChatViewProvider } from './chatViewProvider';
import * as vscode from 'vscode';

describe('VS Code Extension - ChatViewProvider', () => {
  let provider: ChatViewProvider;
  let mockWebview: any;
  let mockWebviewView: any;
  let postedMessages: any[] = [];
  let messageHandler: ((msg: any) => Promise<void>) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamError = null;
    mockStreamTokens = ['Hello! ', 'Here is the ', 'solution.'];
    abortWasCalled = false;
    postedMessages = [];
    messageHandler = null;

    mockWebview = {
      options: {},
      html: '',
      postMessage: vi.fn((msg: any) => {
        postedMessages.push(msg);
        return Promise.resolve(true);
      }),
      onDidReceiveMessage: vi.fn((handler: any) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };

    mockWebviewView = {
      viewType: 'openstudio.chatView',
      webview: mockWebview,
      show: vi.fn(),
    };

    provider = new ChatViewProvider(new (vscode as any).Uri('d:/projects/Open Studio'));
  });

  describe('Lifecycle and HTML Generation', () => {
    it('resolves webview view, sets options, and generates valid air-gapped HTML', () => {
      provider.resolveWebviewView(
        mockWebviewView,
        {} as any,
        { isCancellationRequested: false } as any
      );

      expect(mockWebview.options.enableScripts).toBe(true);
      expect(mockWebview.html).toContain('<!DOCTYPE html>');
      expect(mockWebview.html).toContain("Content-Security-Policy");
      expect(mockWebview.html).toContain("default-src 'none'");

      // Air-gapped verification: zero external remote script resources
      expect(mockWebview.html).not.toContain('http://');
      expect(mockWebview.html).not.toContain('https://');

      // Theme-matching verification
      expect(mockWebview.html).toContain('var(--vscode-editor-background');
      expect(mockWebview.html).toContain('var(--vscode-button-background');
      expect(mockWebview.html).toContain('id="chat-messages"');
      expect(mockWebview.html).toContain('id="promptInput"');
    });

    it('updates model status via postMessage', async () => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      await provider.updateModelStatus();

      expect(postedMessages).toContainEqual({
        type: 'statusUpdate',
        online: true,
        model: 'qwen2.5-coder:7b',
      });
    });
  });

  describe('Chat Streaming and Inference', () => {
    beforeEach(() => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    it('streams tokens and accumulates message history', async () => {
      await provider.handleUserMessage('Explain binary search');

      expect(postedMessages).toContainEqual({ type: 'streamStart' });
      expect(postedMessages).toContainEqual({ type: 'tokenDelta', delta: 'Hello! ' });
      expect(postedMessages).toContainEqual({ type: 'tokenDelta', delta: 'Here is the ' });
      expect(postedMessages).toContainEqual({ type: 'tokenDelta', delta: 'solution.' });
      expect(postedMessages).toContainEqual({ type: 'streamComplete' });

      expect(provider.messages).toHaveLength(2);
      expect(provider.messages[0].sender).toBe('user');
      expect(provider.messages[0].text).toBe('Explain binary search');
      expect(provider.messages[1].sender).toBe('assistant');
      expect(provider.messages[1].text).toBe('Hello! Here is the solution.');
      expect(provider.isStreaming).toBe(false);
    });

    it('handles stream error gracefully', async () => {
      mockStreamError = new Error('Model connection timeout');

      await provider.handleUserMessage('Trigger error');

      expect(postedMessages).toContainEqual({
        type: 'systemMessage',
        text: 'Generation error: Model connection timeout',
        isError: true,
      });

      expect(provider.isStreaming).toBe(false);
      expect(provider.messages[provider.messages.length - 1].isError).toBe(true);
    });

    it('aborts active generation', async () => {
      // Mock infinite stream
      (provider as any)._isStreaming = true;
      (provider as any)._abortActiveStream = () => {
        abortWasCalled = true;
      };

      provider.abortGeneration();

      expect(abortWasCalled).toBe(true);
      expect(provider.isStreaming).toBe(false);
      expect(postedMessages).toContainEqual({ type: 'streamAborted' });
    });

    it('clears chat history', () => {
      provider.clearChat();

      expect(provider.messages).toHaveLength(0);
      expect(postedMessages).toContainEqual({ type: 'clearChat' });
    });
  });

  describe('Frugal Diff Actions', () => {
    beforeEach(() => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    it('handles applyDiff with success status', async () => {
      const sampleDiff = 'FILE: src/main.ts\n<<<<<<< SEARCH\nfoo\n=======\nbar\n>>>>>>> REPLACE';

      await provider.handleApplyDiff(sampleDiff, 'diff-1');

      expect(postedMessages).toContainEqual({
        type: 'diffResult',
        diffId: 'diff-1',
        success: true,
        message: 'Applied 1/1 hunk(s) across 1 file(s).',
      });
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('handles applyDiff with failure status', async () => {
      const failingDiff = 'FAIL DIFF';

      await provider.handleApplyDiff(failingDiff, 'diff-fail');

      expect(postedMessages).toContainEqual({
        type: 'diffResult',
        diffId: 'diff-fail',
        success: false,
        message: 'Hunk mismatch',
      });
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('handles previewDiff by dispatching vscode.diff command', async () => {
      const sampleDiff = 'FILE: src/main.ts\n<<<<<<< SEARCH\nfoo\n=======\nbar\n>>>>>>> REPLACE';

      await provider.handlePreviewDiff(sampleDiff);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.diff',
        expect.anything(),
        expect.anything(),
        expect.stringContaining('src/main.ts ↔ Open Studio Diff')
      );
    });
  });

  describe('Quick-Action Execution', () => {
    beforeEach(() => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    it('shows warning when no code is selected in active editor', async () => {
      const mockEditor = {
        document: { fileName: 'test.ts', languageId: 'typescript', lineCount: 1, getText: () => '' },
        selection: new (vscode as any).Selection(
          new (vscode as any).Position(0, 0),
          new (vscode as any).Position(0, 0)
        ),
      } as unknown as vscode.TextEditor;

      await provider.executeQuickAction('explain', mockEditor);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Please select code')
      );
    });

    it('executes quick action when code is selected', async () => {
      const mockEditor = {
        document: {
          fileName: 'd:/projects/Open Studio/src/math.ts',
          languageId: 'typescript',
          lineCount: 10,
          getText: () => 'const sum = (a, b) => a + b;',
        },
        selection: new (vscode as any).Selection(
          new (vscode as any).Position(0, 0),
          new (vscode as any).Position(0, 29)
        ),
      } as unknown as vscode.TextEditor;

      await provider.executeQuickAction('refactor', mockEditor);

      expect(postedMessages).toContainEqual(
        expect.objectContaining({
          type: 'injectUserMessage',
          text: expect.stringContaining('[Refactor Code] src/math.ts'),
        })
      );
      expect(provider.messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Two-Way Webview IPC Reception', () => {
    it('dispatches commands received from webview onDidReceiveMessage', async () => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      expect(messageHandler).toBeDefined();

      // Test sendMessage command
      await messageHandler!({ command: 'sendMessage', prompt: 'Hello Ollama' });
      expect(postedMessages).toContainEqual({ type: 'streamStart' });

      // Test abortGeneration command
      await messageHandler!({ command: 'abortGeneration' });
      expect(postedMessages).toContainEqual({ type: 'streamAborted' });

      // Test clearChat command
      await messageHandler!({ command: 'clearChat' });
      expect(postedMessages).toContainEqual({ type: 'clearChat' });
    });
  });
});
