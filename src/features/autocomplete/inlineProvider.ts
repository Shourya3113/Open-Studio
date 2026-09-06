import * as monaco from 'monaco-editor';
import { 
  extractContext, 
  formatFimPrompt, 
  QWEN_FIM_STOP_TOKENS,
  DEBOUNCE_MS,
  cleanPrediction
} from './fim';
import { streamCompletion } from '../../services/inference';

export { DEBOUNCE_MS, cleanPrediction };

let currentAbortFn: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function registerInlineCompletionProvider(
  languages: string[] = ['typescript', 'javascript', 'rust', 'python', 'markdown', 'html', 'css', 'json']
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerInlineCompletionsProvider(lang, {
      provideInlineCompletions: async (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        _context: monaco.languages.InlineCompletionContext,
        token: monaco.CancellationToken
      ): Promise<monaco.languages.InlineCompletions<monaco.languages.InlineCompletion> | undefined> => {
        // Abort previous in-flight inference
        if (currentAbortFn) {
          currentAbortFn();
          currentAbortFn = null;
        }

        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }

        // Wait 30ms debouncing window
        await new Promise<void>((resolve) => {
          debounceTimer = setTimeout(() => {
            resolve();
          }, DEBOUNCE_MS);
        });

        if (token.isCancellationRequested) {
          return undefined;
        }

        const offset = model.getOffsetAt(position);
        const fullContent = model.getValue();
        const { prefix, suffix } = extractContext(fullContent, offset);

        // Don't autocomplete on completely empty files or empty prefix
        if (!prefix.trim()) {
          return undefined;
        }

        const fimPrompt = formatFimPrompt(prefix, suffix);

        return new Promise<monaco.languages.InlineCompletions<monaco.languages.InlineCompletion> | undefined>(
          async (resolve) => {
            let prediction = '';

            token.onCancellationRequested(() => {
              if (currentAbortFn) {
                currentAbortFn();
                currentAbortFn = null;
              }
              resolve(undefined);
            });

            try {
              const abort = await streamCompletion(
                {
                  model: 'qwen2.5-coder:1.5b',
                  prompt: fimPrompt,
                  temperature: 0.1,
                  stop_tokens: QWEN_FIM_STOP_TOKENS,
                  keep_alive: '-1', // Resident in VRAM
                  priority: 'autocomplete',
                },
                (tokenDelta) => {
                  prediction += tokenDelta;
                  // Stop generation early if newline boundary or long completion
                  if (prediction.includes('\n\n') || prediction.length > 200) {
                    if (currentAbortFn) {
                      currentAbortFn();
                      currentAbortFn = null;
                    }
                  }
                },
                () => {
                  currentAbortFn = null;
                  const cleaned = cleanPrediction(prediction);
                  if (!cleaned) {
                    resolve(undefined);
                    return;
                  }

                  resolve({
                    items: [
                      {
                        insertText: cleaned,
                        range: new monaco.Range(
                          position.lineNumber,
                          position.column,
                          position.lineNumber,
                          position.column
                        ),
                      },
                    ],
                  });
                }
              );

              currentAbortFn = abort;
            } catch {
              resolve(undefined);
            }
          }
        );
      },
      disposeInlineCompletions: () => {},
    });

    disposables.push(disposable);
  }

  return disposables;
}
