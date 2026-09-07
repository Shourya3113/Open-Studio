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
