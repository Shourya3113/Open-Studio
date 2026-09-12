import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkOllamaHealth, streamOllamaGenerate } from './ollamaClient';

describe('VS Code Extension - Ollama Local Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('checkOllamaHealth', () => {
    it('returns online and hasModel when endpoints respond with target model', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/api/version')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ version: '0.5.4' }),
          };
        }
        if (url.endsWith('/api/tags')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              models: [{ name: 'qwen2.5-coder:1.5b' }, { name: 'llama3:8b' }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const status = await checkOllamaHealth('http://127.0.0.1:11434', 'qwen2.5-coder:1.5b');
      expect(status.online).toBe(true);
      expect(status.version).toBe('0.5.4');
      expect(status.hasModel).toBe(true);
      expect(status.models).toContain('qwen2.5-coder:1.5b');
    });

    it('returns hasModel false when model is not downloaded', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/api/version')) {
          return { ok: true, json: async () => ({ version: '0.5.4' }) };
        }
        if (url.endsWith('/api/tags')) {
          return { ok: true, json: async () => ({ models: [{ name: 'llama3:8b' }] }) };
        }
        return { ok: false };
      });

      const status = await checkOllamaHealth('http://127.0.0.1:11434', 'qwen2.5-coder:1.5b');
      expect(status.online).toBe(true);
      expect(status.hasModel).toBe(false);
    });

    it('returns online false when network request fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const status = await checkOllamaHealth('http://127.0.0.1:11434');
      expect(status.online).toBe(false);
      expect(status.hasModel).toBe(false);
      expect(status.error).toContain('Connection refused');
    });
  });

  describe('streamOllamaGenerate', () => {
    it('streams NDJSON chunks and triggers onToken and onComplete', async () => {
      const chunks = [
        JSON.stringify({ response: 'function ' }),
        JSON.stringify({ response: 'add(a, b) {\n' }),
        JSON.stringify({ response: '  return a + b;\n}\n', done: true }),
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk + '\n'));
          }
          controller.close();
        },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      });

      const tokens: string[] = [];
      let completed = false;

      await new Promise<void>((resolve) => {
        streamOllamaGenerate(
          {
            model: 'qwen2.5-coder:1.5b',
            prompt: 'test prompt',
          },
          (delta) => {
            tokens.push(delta);
          },
          () => {
            completed = true;
            resolve();
          },
          (err) => {
            throw err;
          }
        );
      });

      expect(tokens.join('')).toBe('function add(a, b) {\n  return a + b;\n}\n');
      expect(completed).toBe(true);
    });

    it('aborts cleanly when abort handle is called', async () => {
      let readCount = 0;
      const stream = new ReadableStream({
        async pull(controller) {
          readCount++;
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(JSON.stringify({ response: 'tok_' + readCount }) + '\n'));
          await new Promise((r) => setTimeout(r, 50));
        },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      });

      const tokens: string[] = [];
      const onError = vi.fn();

      const abort = streamOllamaGenerate(
        {
          model: 'qwen2.5-coder:1.5b',
          prompt: 'test',
        },
        (delta) => {
          tokens.push(delta);
        },
        () => {},
        onError
      );

      // Wait 30ms then abort
      await new Promise((r) => setTimeout(r, 30));
      abort();

      expect(onError).not.toHaveBeenCalled();
    });
  });
});
