import { InjectedContextSummary } from '../../types/context';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokensCount?: number;
  tokPerSec?: string;
  isStreaming?: boolean;
  error?: string;
  contextSummary?: InjectedContextSummary;
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
 * with multi-file relevance ranking and dynamic context budgeting.
 */
export async function augmentPromptWithContext(
  userQuery: string,
  baseSystemPrompt: string = DEFAULT_SYSTEM_PROMPT,
  activeFile?: string | null,
  openFiles?: string[]
): Promise<{
  systemPrompt: string;
  hasRepoContext: boolean;
  contextSummary?: InjectedContextSummary;
}> {
  const hasRepoTag = /@repo\b|@skeleton\b/i.test(userQuery);
  const hasCodebaseTag = /@codebase\b/i.test(userQuery);
  const hasSearchTag = /@search\b/i.test(userQuery);

  if (!hasRepoTag && !hasCodebaseTag && !hasSearchTag) {
    return { systemPrompt: baseSystemPrompt, hasRepoContext: false };
  }

  let augmented = baseSystemPrompt;
  let contextSummary: InjectedContextSummary | undefined;

  const { aggregateContext, resultToSummary } = await import('../rag/contextAggregator');
  const cleanQuery = userQuery.replace(/@(codebase|repo|skeleton|search)/gi, '').trim() || 'main';

  const aggResult = await aggregateContext({
    query: cleanQuery,
    active_file: activeFile,
    open_files: openFiles,
    include_skeleton: hasRepoTag,
    max_tokens: 3000,
    max_snippets: 5,
  });

  contextSummary = resultToSummary(aggResult);

  // If @codebase or @search was requested, inject BM25 formatted snippets
  if (hasCodebaseTag || hasSearchTag) {
    const { formatBM25ContextBlock } = await import('../rag/bm25Search');
    const bm25CompatBlock = formatBM25ContextBlock(
      aggResult.snippets.map((s) => ({
        file_path: s.file_path,
        score: s.score,
        matching_lines: [s.line_number],
        snippet: s.snippet,
        matched_terms: s.matched_terms,
      }))
    );
    if (bm25CompatBlock) {
      augmented = `${augmented}\n\n${bm25CompatBlock}`;
    }
  }

  // If @repo was requested, inject Tree-sitter structural AST skeleton map
  if (hasRepoTag) {
    const { getRepoSkeleton } = await import('../ast/repoMap');
    const skeleton = await getRepoSkeleton('.');
    augmented = `${augmented}\n\n${skeleton.composite_prompt}`;
  }

  return { systemPrompt: augmented, hasRepoContext: true, contextSummary };
}

/**
 * Backwards-compatible wrapper for augmentPromptWithContext
 */
export async function augmentPromptWithRepoContext(
  userQuery: string,
  baseSystemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<{ systemPrompt: string; hasRepoContext: boolean; contextSummary?: InjectedContextSummary }> {
  return augmentPromptWithContext(userQuery, baseSystemPrompt);
}
