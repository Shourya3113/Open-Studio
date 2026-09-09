export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokensCount?: number;
  tokPerSec?: string;
  isStreaming?: boolean;
  error?: string;
}

export const CHATML_STOP_TOKENS = [
  '<|im_end|>',
  '<|endoftext|>',
  '<|im_start|>',
  '### Human:',
  '### Assistant:',
];

export const DEFAULT_SYSTEM_PROMPT = 
  "You are Open Studio Assistant, an expert AI software engineer running 100% locally and air-gapped on the user's machine. " +
  "Provide precise, idiomatic, production-ready code with concise explanations. " +
  "Always format code snippets in markdown code blocks with the correct language tag.";

/**
 * Formats a series of conversation messages into a standard ChatML prompt.
 * Supported natively by Qwen2.5-Coder, Llama 3, Mistral, and DeepSeek.
 */
export function buildChatMLPrompt(
  messages: ChatMessage[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): string {
  const parts: string[] = [];

  // Inject system instructions
  if (systemPrompt && systemPrompt.trim()) {
    parts.push(`<|im_start|>system\n${systemPrompt.trim()}<|im_end|>`);
  }

  // Inject conversation turns
  for (const msg of messages) {
    if (msg.isStreaming && !msg.content.trim()) {
      continue;
    }
    parts.push(`<|im_start|>${msg.role}\n${msg.content.trim()}<|im_end|>`);
  }

  // Prompt assistant to begin generation
  parts.push('<|im_start|>assistant\n');

  return parts.join('\n');
}

/**
 * Injects repository structural skeleton (@repo) and/or BM25 lexical search snippets (@codebase)
 */
export async function augmentPromptWithRepoContext(
  userQuery: string,
  baseSystemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<{ systemPrompt: string; hasRepoContext: boolean }> {
  const hasRepoTag = /@repo\b|@skeleton\b/i.test(userQuery);
  const hasCodebaseTag = /@codebase\b/i.test(userQuery);

  if (!hasRepoTag && !hasCodebaseTag) {
    return { systemPrompt: baseSystemPrompt, hasRepoContext: false };
  }

  let augmented = baseSystemPrompt;

  // Handle @codebase: BM25 lexical retrieval over workspace files
  if (hasCodebaseTag) {
    const { searchBM25, formatBM25ContextBlock } = await import('../rag/bm25Search');
    const cleanQuery = userQuery.replace(/@codebase/gi, '').trim();
    const results = await searchBM25(cleanQuery || 'main', 5);
    const bm25Block = formatBM25ContextBlock(results);
    if (bm25Block) {
      augmented = `${augmented}\n\n${bm25Block}`;
    }
  }

  // Handle @repo: Tree-sitter structural AST skeleton map
  if (hasRepoTag) {
    const { getRepoSkeleton } = await import('../ast/repoMap');
    const skeleton = await getRepoSkeleton('.');
    augmented = `${augmented}\n\n${skeleton.composite_prompt}`;
  }

  return { systemPrompt: augmented, hasRepoContext: true };
}
