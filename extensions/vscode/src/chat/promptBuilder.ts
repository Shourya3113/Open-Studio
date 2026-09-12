import * as vscode from 'vscode';

export interface SelectionRange {
  startLine: number;
  endLine: number;
  startChar: number;
  endChar: number;
}

export interface EditorContext {
  filePath: string;
  relativePath: string;
  languageId: string;
  selectedText: string;
  selectionRange?: SelectionRange;
  cursorLine?: number;
  totalLines?: number;
}

export type QuickActionType = 'explain' | 'refactor' | 'generateTests' | 'fix';

export interface QuickActionPrompt {
  action: QuickActionType;
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string;
}

/**
 * Extracts structured editor context from the active VS Code text editor.
 */
export function getEditorContext(editor?: vscode.TextEditor): EditorContext | undefined {
  if (!editor || !editor.document) {
    return undefined;
  }

  const document = editor.document;
  const filePath = document.fileName || 'untitled';
  let relativePath = filePath;

  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const rootPath = folders[0].uri.fsPath;
    if (filePath.startsWith(rootPath)) {
      relativePath = filePath.substring(rootPath.length).replace(/^[/\\]+/, '').replace(/\\/g, '/');
    }
  }

  const selection = editor.selection;
  const hasSelection = selection && !selection.isEmpty;
  const selectedText = hasSelection ? document.getText(selection) : '';

  const selectionRange: SelectionRange | undefined = selection
    ? {
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
        startChar: selection.start.character + 1,
        endChar: selection.end.character + 1,
      }
    : undefined;

  const cursorLine = selection ? selection.active.line + 1 : undefined;

  return {
    filePath,
    relativePath,
    languageId: document.languageId || 'plaintext',
    selectedText,
    selectionRange,
    cursorLine,
    totalLines: document.lineCount,
  };
}

/**
 * System prompt template enforcing Frugal Search/Replace diff blocks for code edits.
 */
export const FRUGAL_SYSTEM_PROMPT = `You are Open Studio AI, an expert programming assistant operating 100% offline and locally.
When modifying code or proposing file changes, always use frugal search/replace diff blocks:

FILE: <relative_path>
<<<<<<< SEARCH
[exact lines from target file to replace]
=======
[new replacement lines]
>>>>>>> REPLACE

Rules:
1. The SEARCH block must match existing code EXACTLY, including indentation.
2. Keep SEARCH blocks small, surgical, and unique to the file.
3. Multiple diff blocks can be used for multi-line edits.
4. When writing new files, write the full content inside a standard markdown code block.
5. Provide concise, clear explanations before or after diff blocks.`;

/**
 * Formats a user message and optional editor context into ChatML format.
 */
export function buildChatMLPrompt(userPrompt: string, context?: EditorContext): string {
  let userSection = '';

  if (context && (context.selectedText || context.relativePath)) {
    userSection += 'Active Editor Context:\n';
    if (context.relativePath) {
      userSection += `- File: ${context.relativePath} (${context.languageId})\n`;
    }
    if (context.selectionRange && context.selectedText) {
      userSection += `- Selection (Lines ${context.selectionRange.startLine}-${context.selectionRange.endLine}):\n`;
      userSection += `\`\`\`${context.languageId}\n${context.selectedText}\n\`\`\`\n\n`;
    } else if (context.cursorLine) {
      userSection += `- Cursor at line: ${context.cursorLine}\n\n`;
    }
  }

  userSection += userPrompt.trim();

  return `<|im_start|>system\n${FRUGAL_SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${userSection}<|im_end|>\n<|im_start|>assistant\n`;
}

/**
 * Builds specialized prompts for editor quick actions (explain, refactor, generateTests, fix).
 */
export function buildQuickActionPrompt(
  action: QuickActionType,
  selectedCode: string,
  filePath = 'active_file',
  languageId = 'typescript'
): QuickActionPrompt {
  const codeBlock = `\`\`\`${languageId}\n${selectedCode}\n\`\`\``;
  let userPrompt = '';
  const customSystem = FRUGAL_SYSTEM_PROMPT;

  switch (action) {
    case 'explain':
      userPrompt = `Please explain this ${languageId} code from '${filePath}':\n\n${codeBlock}\n\nDetail what it does, the algorithmic complexity, potential bottlenecks, and key assumptions.`;
      break;

    case 'refactor':
      userPrompt = `Refactor the following ${languageId} code from '${filePath}' for enhanced readability, performance, and best practices. Output your changes using frugal SEARCH/REPLACE diff blocks:\n\n${codeBlock}`;
      break;

    case 'generateTests':
      userPrompt = `Generate comprehensive unit tests for this ${languageId} code from '${filePath}'. Include happy paths, edge cases, error conditions, and mocks where appropriate:\n\n${codeBlock}`;
      break;

    case 'fix':
      userPrompt = `Analyze the following ${languageId} code from '${filePath}' for bugs, edge case crashes, logic errors, or performance issues. Propose fixes using frugal SEARCH/REPLACE diff blocks:\n\n${codeBlock}`;
      break;
  }

  const fullPrompt = `<|im_start|>system\n${customSystem}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;

  return {
    action,
    systemPrompt: customSystem,
    userPrompt,
    fullPrompt,
  };
}
