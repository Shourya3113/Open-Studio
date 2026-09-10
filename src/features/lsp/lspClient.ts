import {
  LspHoverResponse,
  LspLocation,
  LspStatus,
} from '../../types/lsp';

// In-memory document store for test/browser environments
const mockDocs: Map<string, string> = new Map();
const mockRunningServers: Set<string> = new Set();

/**
 * Starts or attaches to an LSP server process for the specified language
 */
export async function startLspServer(
  language: string,
  rootPath?: string,
  serverCmd?: string
): Promise<LspStatus> {
  const langLower = language.toLowerCase();
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<LspStatus>('start_lsp_server', {
      language: langLower,
      rootPath,
      serverCmd,
    });
  } catch {
    mockRunningServers.add(langLower);
    return {
      running: true,
      language: langLower,
      server_name: serverCmd || `${langLower}-language-server`,
      root_uri: rootPath ? `file://${rootPath}` : null,
      error: null,
    };
  }
}

/**
 * Stops an LSP server process
 */
export async function stopLspServer(language: string): Promise<LspStatus> {
  const langLower = language.toLowerCase();
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<LspStatus>('stop_lsp_server', {
      language: langLower,
    });
  } catch {
    mockRunningServers.delete(langLower);
    return {
      running: false,
      language: langLower,
      server_name: 'stopped',
      root_uri: null,
      error: null,
    };
  }
}

/**
 * Queries the current running status of an LSP server
 */
export async function getLspStatus(language: string): Promise<LspStatus> {
  const langLower = language.toLowerCase();
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<LspStatus>('get_lsp_status', {
      language: langLower,
    });
  } catch {
    const isRunning = mockRunningServers.has(langLower);
    return {
      running: isRunning,
      language: langLower,
      server_name: isRunning ? `${langLower}-language-server` : 'not started',
      root_uri: null,
      error: null,
    };
  }
}

/**
 * Sends a textDocument/didOpen notification to the language server
 */
export async function sendLspDidOpen(
  language: string,
  filePath: string,
  content: string
): Promise<void> {
  const langLower = language.toLowerCase();
  mockDocs.set(filePath, content);

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('send_lsp_did_open', {
      language: langLower,
      filePath,
      content,
    });
  } catch {
    // In-memory fallback
  }
}

/**
 * Sends a textDocument/didChange notification to the language server
 */
export async function sendLspDidChange(
  language: string,
  filePath: string,
  content: string,
  version = 1
): Promise<void> {
  const langLower = language.toLowerCase();
  mockDocs.set(filePath, content);

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('send_lsp_did_change', {
      language: langLower,
      filePath,
      content,
      version,
    });
  } catch {
    // In-memory fallback
  }
}

/**
 * Requests hover type information at a cursor position
 */
export async function requestLspHover(
  language: string,
  filePath: string,
  line: number,
  character: number
): Promise<LspHoverResponse | null> {
  const langLower = language.toLowerCase();
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<LspHoverResponse | null>('request_lsp_hover', {
      language: langLower,
      filePath,
      line,
      character,
    });
  } catch {
    const content = mockDocs.get(filePath);
    if (!content) return null;

    const lines = content.split('\n');
    if (line >= lines.length) return null;

    const currentLine = lines[line];
    const word = getWordAtPosition(currentLine, character);
    if (!word) return null;

    let sig = `(identifier) ${word}: any`;
    if (currentLine.includes('function ') || currentLine.includes('fn ') || currentLine.includes('def ')) {
      sig = `(function) ${word}: definition`;
    } else if (currentLine.includes('class ') || currentLine.includes('struct ')) {
      sig = `(class) ${word}: type declaration`;
    } else if (currentLine.includes('interface ') || currentLine.includes('type ')) {
      sig = `(interface) ${word}: type contract`;
    }

    return {
      contents: sig,
      range: {
        start_line: line,
        start_character: 0,
        end_line: line,
        end_character: currentLine.length,
      },
    };
  }
}

/**
 * Requests definition locations for symbol under cursor
 */
export async function requestLspDefinition(
  language: string,
  filePath: string,
  line: number,
  character: number
): Promise<LspLocation[]> {
  const langLower = language.toLowerCase();
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<LspLocation[]>('request_lsp_definition', {
      language: langLower,
      filePath,
      line,
      character,
    });
  } catch {
    const content = mockDocs.get(filePath);
    if (!content) return [];

    const lines = content.split('\n');
    if (line >= lines.length) return [];

    const word = getWordAtPosition(lines[line], character);
    if (!word) return [];

    const locations: LspLocation[] = [];
    for (const [docPath, docContent] of mockDocs.entries()) {
      const docLines = docContent.split('\n');
      docLines.forEach((lStr, lIdx) => {
        const trimmed = lStr.trim();
        const isDecl =
          trimmed.startsWith('export function ') ||
          trimmed.startsWith('function ') ||
          trimmed.startsWith('pub fn ') ||
          trimmed.startsWith('fn ') ||
          trimmed.startsWith('def ') ||
          trimmed.startsWith('class ') ||
          trimmed.startsWith('interface ') ||
          trimmed.startsWith('const ') ||
          trimmed.startsWith('let ');

        if (isDecl && trimmed.includes(word)) {
          locations.push({
            file_path: docPath,
            range: {
              start_line: lIdx,
              start_character: 0,
              end_line: lIdx,
              end_character: lStr.length,
            },
          });
        }
      });
    }

    return locations;
  }
}

function getWordAtPosition(line: string, character: number): string {
  if (character >= line.length) return '';
  let start = character;
  while (start > 0 && /[\w$]/.test(line[start - 1])) {
    start--;
  }
  let end = character;
  while (end < line.length && /[\w$]/.test(line[end])) {
    end++;
  }
  return line.slice(start, end);
}
