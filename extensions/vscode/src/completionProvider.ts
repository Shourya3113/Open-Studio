import * as vscode from 'vscode';
import {
  extractContext,
  formatFimPrompt,
  cleanPrediction,
  QWEN_FIM_STOP_TOKENS,
  DEBOUNCE_MS,
  MAX_PREFIX_CHARS,
  MAX_SUFFIX_CHARS,
} from './fim';
import { streamOllamaGenerate } from './ollamaClient';

export interface CompletionMetrics {
  lastLatencyMs: number;
  totalRequests: number;
  completedRequests: number;
  abortedRequests: number;
}

export class OpenStudioCompletionProvider implements vscode.InlineCompletionItemProvider {
  private currentAbortFn: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingDebounceCancel: (() => void) | null = null;

  public metrics: CompletionMetrics = {
    lastLatencyMs: 0,
    totalRequests: 0,
    completedRequests: 0,
    abortedRequests: 0,
  };

  public async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    // 1. Abort previous in-flight inference
    if (this.currentAbortFn) {
      this.currentAbortFn();
      this.currentAbortFn = null;
      this.metrics.abortedRequests++;
    }

    if (this.pendingDebounceCancel) {
      this.pendingDebounceCancel();
      this.pendingDebounceCancel = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // 2. Read configuration
    const config = vscode.workspace.getConfiguration('openstudio');
    const endpoint = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');
    const model = config.get<string>('autocompleteModel', 'qwen2.5-coder:1.5b');
    const debounceMs = config.get<number>('debounceMs', DEBOUNCE_MS);
    const maxPrefix = config.get<number>('maxPrefixChars', MAX_PREFIX_CHARS);
    const maxSuffix = config.get<number>('maxSuffixChars', MAX_SUFFIX_CHARS);
    const temperature = config.get<number>('temperature', 0.1);

    // 3. Debounce window (safe cancelable promise)
    const proceed = await new Promise<boolean>((resolve) => {
      this.pendingDebounceCancel = () => resolve(false);
      this.debounceTimer = setTimeout(() => {
        this.pendingDebounceCancel = null;
        this.debounceTimer = null;
        resolve(true);
      }, debounceMs);
    });

    if (!proceed || token.isCancellationRequested) {
      return undefined;
    }

    // 4. Extract context
    const fullContent = document.getText();
    const offset = document.offsetAt(position);
    const { prefix, suffix } = extractContext(fullContent, offset, maxPrefix, maxSuffix);

    // Skip autocomplete if prefix is completely empty or all whitespace
    if (!prefix.trim()) {
      return undefined;
    }

    const prompt = formatFimPrompt(prefix, suffix);

    return new Promise<vscode.InlineCompletionItem[] | undefined>((resolve) => {
      let prediction = '';
      this.metrics.totalRequests++;
      const requestStart = Date.now();

      token.onCancellationRequested(() => {
        if (this.currentAbortFn) {
          this.currentAbortFn();
          this.currentAbortFn = null;
          this.metrics.abortedRequests++;
        }
        resolve(undefined);
      });

      this.currentAbortFn = streamOllamaGenerate(
        {
          endpoint,
          model,
          prompt,
          temperature,
          stop: QWEN_FIM_STOP_TOKENS,
          keep_alive: -1, // Resident in VRAM
        },
        (tokenDelta) => {
          prediction += tokenDelta;

          // Early stopping: truncate multi-line blocks or excessive length
          if (prediction.includes('\n\n') || prediction.length > 200) {
            if (this.currentAbortFn) {
              this.currentAbortFn();
              this.currentAbortFn = null;
            }
          }
        },
        () => {
          this.currentAbortFn = null;
          this.metrics.completedRequests++;
          this.metrics.lastLatencyMs = Date.now() - requestStart;

          const cleaned = cleanPrediction(prediction);
          if (!cleaned || token.isCancellationRequested) {
            resolve(undefined);
            return;
          }

          const completionRange = new vscode.Range(position, position);
          const item = new vscode.InlineCompletionItem(cleaned, completionRange);
          resolve([item]);
        },
        (err) => {
          this.currentAbortFn = null;
          console.warn('[Open Studio] Inline completion error:', err.message);
          resolve(undefined);
        }
      );
    });
  }

  public dispose(): void {
    if (this.currentAbortFn) {
      this.currentAbortFn();
      this.currentAbortFn = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
