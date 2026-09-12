/**
 * Fill-In-The-Middle (FIM) Context Extraction & Prompt Formatter for Qwen 2.5 Coder.
 */

export const MAX_PREFIX_CHARS = 1000;
export const MAX_SUFFIX_CHARS = 500;
export const DEBOUNCE_MS = 30;

export const QWEN_FIM_STOP_TOKENS = [
  '<|fim_prefix|>',
  '<|fim_suffix|>',
  '<|fim_middle|>',
  '<|fim_pad|>',
  '<|endoftext|>',
  '<|im_end|>',
  '\n\n\n',
];

/**
 * Extracts the prefix and suffix context around an offset position.
 * Clamps prefix to the last maxPrefix characters and suffix to the first maxSuffix characters.
 */
export function extractContext(
  content: string,
  offset: number,
  maxPrefix = MAX_PREFIX_CHARS,
  maxSuffix = MAX_SUFFIX_CHARS
): { prefix: string; suffix: string } {
  const safeOffset = Math.max(0, Math.min(content.length, offset));
  const rawPrefix = content.slice(0, safeOffset);
  const rawSuffix = content.slice(safeOffset);

  const prefix = rawPrefix.length > maxPrefix ? rawPrefix.slice(-maxPrefix) : rawPrefix;
  const suffix = rawSuffix.length > maxSuffix ? rawSuffix.slice(0, maxSuffix) : rawSuffix;

  return { prefix, suffix };
}

/**
 * Formats prefix and suffix into Qwen 2.5 Coder Fill-In-the-Middle (FIM) prompt syntax.
 */
export function formatFimPrompt(prefix: string, suffix: string): string {
  return `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
}

/**
 * Strips special FIM boundary tokens from prediction output.
 */
export function cleanPrediction(raw: string): string {
  let cleaned = raw;
  for (const token of QWEN_FIM_STOP_TOKENS) {
    cleaned = cleaned.split(token).join('');
  }
  return cleaned;
}
