/**
 * 100% Offline Local Ollama Client for VS Code.
 * Interacts directly with local Ollama daemon without external telemetry or cloud dependencies.
 */

export interface OllamaGenerateOptions {
  endpoint?: string;
  model: string;
  prompt: string;
  temperature?: number;
  stop?: string[];
  keep_alive?: string | number;
}

export interface OllamaHealthStatus {
  online: boolean;
  version?: string;
  models: string[];
  hasModel: boolean;
  error?: string;
}

/**
 * Checks connectivity and model availability against the local Ollama instance.
 */
export async function checkOllamaHealth(
  endpoint = 'http://127.0.0.1:11434',
  targetModel = 'qwen2.5-coder:1.5b'
): Promise<OllamaHealthStatus> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');

  try {
    const versionRes = await fetch(`${cleanEndpoint}/api/version`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!versionRes.ok) {
      return {
        online: false,
        models: [],
        hasModel: false,
        error: `Ollama returned HTTP ${versionRes.status}`,
      };
    }

    const versionData = (await versionRes.json()) as { version?: string };

    const tagsRes = await fetch(`${cleanEndpoint}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    let models: string[] = [];
    if (tagsRes.ok) {
      const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> };
      if (Array.isArray(tagsData.models)) {
        models = tagsData.models.map((m) => m.name);
      }
    }

    const normalizedTarget = targetModel.toLowerCase();
    const hasModel = models.some(
      (m) =>
        m.toLowerCase() === normalizedTarget ||
        m.toLowerCase().startsWith(normalizedTarget + ':') ||
        normalizedTarget.startsWith(m.toLowerCase() + ':')
    );

    return {
      online: true,
      version: versionData.version || 'unknown',
      models,
      hasModel,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      online: false,
      models: [],
      hasModel: false,
      error: `Could not connect to Ollama at ${cleanEndpoint}: ${msg}`,
    };
  }
}

/**
 * Streams completion tokens from local Ollama /api/generate endpoint.
 * Returns an abort handle function.
 */
export function streamOllamaGenerate(
  options: OllamaGenerateOptions,
  onToken: (token: string) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): () => void {
  const controller = new AbortController();
  const endpoint = (options.endpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');

  (async () => {
    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify({
          model: options.model,
          prompt: options.prompt,
          stream: true,
          options: {
            temperature: options.temperature ?? 0.1,
            stop: options.stop ?? [],
          },
          keep_alive:
            options.keep_alive === '-1' || options.keep_alive === -1 || options.keep_alive === undefined
              ? -1
              : options.keep_alive,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama generation failed with status ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Ollama response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed) as { response?: string; done?: boolean };
            if (parsed.response) {
              onToken(parsed.response);
            }
            if (parsed.done) {
              onComplete();
              return;
            }
          } catch {
            // Ignore incomplete JSON chunks until buffer completes
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim()) as { response?: string; done?: boolean };
          if (parsed.response) {
            onToken(parsed.response);
          }
        } catch {
          // Ignore
        }
      }

      onComplete();
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        // Expected cancellation, don't trigger error
        return;
      }
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => {
    controller.abort();
  };
}
