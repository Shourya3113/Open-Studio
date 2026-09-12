import * as vscode from 'vscode';
import { streamOllamaGenerate, checkOllamaHealth } from '../ollamaClient';
import { applyMultiFilePatch, dryRunMultiFilePatch } from '../diff/patchOrchestrator';
import {
  OpenStudioDiffContentProvider,
  createVirtualDiffUri,
} from '../diff/virtualDocProvider';
import {
  QuickActionType,
  buildChatMLPrompt,
  buildQuickActionPrompt,
  getEditorContext,
} from './promptBuilder';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  isError?: boolean;
}

/**
 * Sidebar Webview View Provider for Open Studio AI Chat.
 * Provides 100% offline, native ChatML interaction with local models.
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'openstudio.chatView';

  private _view?: vscode.WebviewView;
  private _abortActiveStream?: () => void;
  private _isStreaming = false;
  private _messages: ChatMessage[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data: any) => {
      switch (data.command) {
        case 'sendMessage':
          await this.handleUserMessage(data.prompt);
          break;
        case 'abortGeneration':
          this.abortGeneration();
          break;
        case 'applyDiff':
          await this.handleApplyDiff(data.diff, data.diffId);
          break;
        case 'previewDiff':
          await this.handlePreviewDiff(data.diff);
          break;
        case 'clearChat':
          this.clearChat();
          break;
      }
    });

    // Update model status header when view opens
    void this.updateModelStatus();
  }

  /**
   * Checks local Ollama status and sends active model name to webview header.
   */
  public async updateModelStatus(): Promise<void> {
    if (!this._view) return;
    const config = vscode.workspace.getConfiguration('openstudio');
    const endpoint = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');
    const chatModel = config.get<string>('chatModel', 'qwen2.5-coder:7b');

    const status = await checkOllamaHealth(endpoint, chatModel);
    this._view.webview.postMessage({
      type: 'statusUpdate',
      online: status.online,
      model: chatModel,
    });
  }

  /**
   * Handles user chat message submission and initiates Ollama streaming.
   */
  public async handleUserMessage(prompt: string, overrideFullPrompt?: string): Promise<void> {
    if (!prompt.trim() && !overrideFullPrompt) {
      return;
    }

    this.abortGeneration();
    this._isStreaming = true;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: prompt.trim(),
    };
    this._messages.push(userMsg);

    const config = vscode.workspace.getConfiguration('openstudio');
    const endpoint = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');
    const model = config.get<string>('chatModel', 'qwen2.5-coder:7b');

    let fullPrompt = overrideFullPrompt;
    if (!fullPrompt) {
      const editorContext = getEditorContext(vscode.window.activeTextEditor);
      fullPrompt = buildChatMLPrompt(prompt, editorContext);
    }

    if (this._view) {
      this._view.webview.postMessage({ type: 'streamStart' });
    }

    let accumulatedResponse = '';

    this._abortActiveStream = streamOllamaGenerate(
      {
        endpoint,
        model,
        prompt: fullPrompt,
        temperature: 0.2,
      },
      (token: string) => {
        accumulatedResponse += token;
        if (this._view) {
          this._view.webview.postMessage({ type: 'tokenDelta', delta: token });
        }
      },
      () => {
        this._isStreaming = false;
        this._abortActiveStream = undefined;
        this._messages.push({
          id: `msg-${Date.now()}-assistant`,
          sender: 'assistant',
          text: accumulatedResponse,
        });
        if (this._view) {
          this._view.webview.postMessage({ type: 'streamComplete' });
        }
      },
      (error: Error) => {
        this._isStreaming = false;
        this._abortActiveStream = undefined;
        const errText = `Generation error: ${error.message}`;
        this._messages.push({
          id: `msg-${Date.now()}-system`,
          sender: 'system',
          text: errText,
          isError: true,
        });
        if (this._view) {
          this._view.webview.postMessage({
            type: 'systemMessage',
            text: errText,
            isError: true,
          });
        }
      }
    );
  }

  /**
   * Executes a quick action (explain, refactor, generateTests, fix) on the current selection.
   */
  public async executeQuickAction(
    action: QuickActionType,
    editor?: vscode.TextEditor
  ): Promise<void> {
    const activeEditor = editor || vscode.window.activeTextEditor;
    const context = getEditorContext(activeEditor);

    if (!context || !context.selectedText.trim()) {
      vscode.window.showWarningMessage(
        'Open Studio: Please select code in the active editor before running this action.'
      );
      return;
    }

    if (this._view) {
      this._view.show?.(true);
    } else {
      await vscode.commands.executeCommand('openstudio.chatView.focus');
    }

    const qPrompt = buildQuickActionPrompt(
      action,
      context.selectedText,
      context.relativePath || context.filePath,
      context.languageId
    );

    const actionLabels: Record<QuickActionType, string> = {
      explain: 'Explain Code',
      refactor: 'Refactor Code',
      generateTests: 'Generate Unit Tests',
      fix: 'Fix Bugs & Edge Cases',
    };

    const displayText = `[${actionLabels[action]}] ${context.relativePath} (Lines ${context.selectionRange?.startLine ?? 1}-${context.selectionRange?.endLine ?? 1})\n\`\`\`${context.languageId}\n${context.selectedText}\n\`\`\``;

    if (this._view) {
      this._view.webview.postMessage({
        type: 'injectUserMessage',
        text: displayText,
      });
    }

    await this.handleUserMessage(displayText, qPrompt.fullPrompt);
  }

  /**
   * Applies frugal search/replace diff block directly from chat.
   */
  public async handleApplyDiff(diffText: string, diffId?: string): Promise<void> {
    const result = await applyMultiFilePatch(diffText, 'Applied via Open Studio Chat');

    if (result.success) {
      const msg = `Applied ${result.appliedHunks}/${result.totalHunks} hunk(s) across ${result.filesModified.length} file(s).`;
      vscode.window.showInformationMessage(`Open Studio: ${msg}`);
      if (this._view) {
        this._view.webview.postMessage({
          type: 'diffResult',
          diffId,
          success: true,
          message: msg,
        });
      }
    } else {
      const err = result.error || 'Failed to apply diff block to file';
      vscode.window.showErrorMessage(`Open Studio: ${err}`);
      if (this._view) {
        this._view.webview.postMessage({
          type: 'diffResult',
          diffId,
          success: false,
          message: err,
        });
      }
    }
  }

  /**
   * Previews frugal diff block side-by-side using virtual document diff inspector.
   */
  public async handlePreviewDiff(diffText: string): Promise<void> {
    const dryRun = await dryRunMultiFilePatch(diffText);

    if (!dryRun.success || dryRun.files.length === 0 || dryRun.files[0].preview.appliedCount === 0) {
      const err = dryRun.errors[0] || 'Could not match search block in target file';
      vscode.window.showErrorMessage(`Open Studio Diff Preview Failed: ${err}`);
      return;
    }

    const target = dryRun.files[0];
    const virtualUri = createVirtualDiffUri(target.filePath);
    const diffProvider = OpenStudioDiffContentProvider.getInstance();
    diffProvider.setVirtualContent(virtualUri, target.preview.patchedContent);

    await vscode.commands.executeCommand(
      'vscode.diff',
      target.uri,
      virtualUri,
      `${target.filePath} ↔ Open Studio Diff`
    );
  }

  /**
   * Aborts currently active inference stream.
   */
  public abortGeneration(): void {
    if (this._abortActiveStream) {
      this._abortActiveStream();
      this._abortActiveStream = undefined;
    }
    this._isStreaming = false;
    if (this._view) {
      this._view.webview.postMessage({ type: 'streamAborted' });
    }
  }

  /**
   * Clears chat history.
   */
  public clearChat(): void {
    this.abortGeneration();
    this._messages = [];
    if (this._view) {
      this._view.webview.postMessage({ type: 'clearChat' });
    }
  }

  public get messages(): readonly ChatMessage[] {
    return this._messages;
  }

  public get isStreaming(): boolean {
    return this._isStreaming;
  }

  /**
   * Builds the 100% self-contained, air-gapped webview HTML string.
   */
  public getHtmlForWebview(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Open Studio AI</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      --btn-bg: var(--vscode-button-background, #0e639c);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
      --sec-btn-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --sec-btn-fg: var(--vscode-button-secondaryForeground, #ffffff);
      --sec-btn-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
      --input-bg: var(--vscode-input-background, #252526);
      --input-fg: var(--vscode-input-foreground, #cccccc);
      --border: var(--vscode-editorWidget-border, #454545);
      --bubble-user: var(--vscode-editor-inactiveSelectionBackground, #2d3748);
      --bubble-asst: var(--vscode-sideBar-background, #181818);
      --card-bg: var(--vscode-editorWidget-background, #252526);
      --badge-bg: var(--vscode-badge-background, #4d4d4d);
      --badge-fg: var(--vscode-badge-foreground, #ffffff);
      --diff-add: #2ea04333;
      --diff-del: #f8514933;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--font);
      font-size: 13px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    header {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg);
      flex-shrink: 0;
    }

    .header-title {
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--badge-bg);
      color: var(--badge-fg);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #73c991;
    }

    .status-dot.offline { background: #f85149; }

    .header-actions button {
      background: transparent;
      border: none;
      color: var(--fg);
      opacity: 0.7;
      cursor: pointer;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .header-actions button:hover { opacity: 1; background: var(--border); }

    #chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .msg {
      max-width: 96%;
      padding: 10px 12px;
      border-radius: 8px;
      line-height: 1.45;
      word-break: break-word;
    }

    .msg.user {
      align-self: flex-end;
      background: var(--bubble-user);
      border-bottom-right-radius: 2px;
    }

    .msg.assistant {
      align-self: flex-start;
      background: var(--bubble-asst);
      border: 1px solid var(--border);
      border-bottom-left-radius: 2px;
    }

    .msg.system {
      align-self: center;
      font-size: 11px;
      opacity: 0.8;
      background: transparent;
      border: 1px dashed var(--border);
      text-align: center;
    }

    .msg.system.error {
      border-color: #f85149;
      color: #f85149;
      opacity: 1;
    }

    .cursor {
      display: inline-block;
      width: 6px;
      height: 12px;
      background: var(--fg);
      margin-left: 2px;
      vertical-align: middle;
      animation: blink 0.8s infinite;
    }

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    pre {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px;
      margin: 8px 0;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
    }

    code {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
    }

    .diff-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin: 10px 0;
      overflow: hidden;
    }

    .diff-card-header {
      background: rgba(255, 255, 255, 0.05);
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }

    .diff-actions {
      display: flex;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.15);
      border-top: 1px solid var(--border);
    }

    .diff-btn {
      padding: 4px 10px;
      border-radius: 4px;
      border: none;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .diff-btn.apply {
      background: var(--btn-bg);
      color: var(--btn-fg);
    }
    .diff-btn.apply:hover { background: var(--btn-hover); }

    .diff-btn.preview {
      background: var(--sec-btn-bg);
      color: var(--sec-btn-fg);
    }
    .diff-btn.preview:hover { background: var(--sec-btn-hover); }

    .diff-status {
      font-size: 11px;
      padding: 4px 10px;
      margin-top: 4px;
    }
    .diff-status.success { color: #73c991; }
    .diff-status.error { color: #f85149; }

    footer {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      background: var(--bg);
      flex-shrink: 0;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    textarea {
      width: 100%;
      height: 64px;
      max-height: 140px;
      resize: none;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px;
      font-family: inherit;
      font-size: 12px;
      outline: none;
    }

    textarea:focus { border-color: var(--btn-bg); }

    .footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    .btn.primary { background: var(--btn-bg); color: var(--btn-fg); }
    .btn.primary:hover { background: var(--btn-hover); }

    .btn.stop { background: #d73a49; color: #ffffff; display: none; }
    .btn.stop:hover { background: #cb2431; }
  </style>
</head>
<body>
  <header>
    <div class="header-title">
      <span>⚡ Open Studio</span>
      <span class="status-badge" id="statusBadge">
        <span class="status-dot" id="statusDot"></span>
        <span id="modelName">Local Model</span>
      </span>
    </div>
    <div class="header-actions">
      <button id="clearBtn" title="Clear chat history">Clear</button>
    </div>
  </header>

  <div id="chat-messages">
    <div class="msg system">Ready for offline AI assistance. Ask anything or right-click code to explain/refactor.</div>
  </div>

  <footer>
    <div class="input-wrapper">
      <textarea id="promptInput" placeholder="Ask Open Studio AI... (Enter to send, Shift+Enter for new line)"></textarea>
      <div class="footer-actions">
        <button id="stopBtn" class="btn stop">Stop</button>
        <button id="sendBtn" class="btn primary">Send</button>
      </div>
    </div>
  </footer>

  <script>
    (function () {
      const vscode = acquireVsCodeApi();
      const messagesContainer = document.getElementById('chat-messages');
      const promptInput = document.getElementById('promptInput');
      const sendBtn = document.getElementById('sendBtn');
      const stopBtn = document.getElementById('stopBtn');
      const clearBtn = document.getElementById('clearBtn');
      const statusDot = document.getElementById('statusDot');
      const modelName = document.getElementById('modelName');

      let currentAssistantBubble = null;
      let currentAssistantText = '';
      let isStreaming = false;
      let diffBlockIdCounter = 0;

      function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      function escapeHtml(text) {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function renderMarkdown(rawText) {
        // Look for Frugal Diff blocks: FILE: ... <<<<<<< SEARCH ... >>>>>>> REPLACE
        const diffRegex = /((?:FILE:[^\\n]+\\n)?<{7}\\s*SEARCH[\\s\\S]*?={7}[\\s\\S]*?>{7}\\s*REPLACE)/g;
        
        let formatted = '';
        let lastIdx = 0;
        let match;

        while ((match = diffRegex.exec(rawText)) !== null) {
          const before = rawText.substring(lastIdx, match.index);
          formatted += formatRegularText(before);

          const diffChunk = match[1];
          const diffId = 'diff-' + (++diffBlockIdCounter);

          // Extract file path if header exists
          const fileMatch = diffChunk.match(/^FILE:\\s*([^\\n]+)/i);
          const targetFile = fileMatch ? fileMatch[1].trim() : 'Active Document';

          formatted += '<div class="diff-card" id="' + diffId + '">';
          formatted += '  <div class="diff-card-header">';
          formatted += '    <span>📄 ' + escapeHtml(targetFile) + '</span>';
          formatted += '    <span>Frugal Diff</span>';
          formatted += '  </div>';
          formatted += '  <pre><code>' + escapeHtml(diffChunk) + '</code></pre>';
          formatted += '  <div class="diff-actions">';
          formatted += '    <button class="diff-btn preview" data-diff="' + encodeURIComponent(diffChunk) + '">👁️ Preview Diff</button>';
          formatted += '    <button class="diff-btn apply" data-id="' + diffId + '" data-diff="' + encodeURIComponent(diffChunk) + '">⚡ Apply Diff</button>';
          formatted += '  </div>';
          formatted += '  <div class="diff-status" id="status-' + diffId + '"></div>';
          formatted += '</div>';

          lastIdx = match.index + match[0].length;
        }

        const remaining = rawText.substring(lastIdx);
        formatted += formatRegularText(remaining);
        return formatted;
      }

      function formatRegularText(text) {
        if (!text) return '';
        // Basic code block handling using RegExp without literal backticks
        const tripleBacktick = String.fromCharCode(96, 96, 96);
        const singleBacktick = String.fromCharCode(96);
        return text
          .split(tripleBacktick)
          .map(function (chunk, i) {
            if (i % 2 === 1) {
              const firstLineIdx = chunk.indexOf('\n');
              const code = firstLineIdx !== -1 ? chunk.substring(firstLineIdx + 1) : chunk;
              return '<pre><code>' + escapeHtml(code) + '</code></pre>';
            }
            return chunk
              .split(singleBacktick)
              .map(function (part, j) {
                if (j % 2 === 1) {
                  return '<code>' + escapeHtml(part) + '</code>';
                }
                return escapeHtml(part).replace(/\n/g, '<br>');
              })
              .join('');
          })
          .join('');
      }

      function attachDiffListeners(container) {
        const previewButtons = container.querySelectorAll('.diff-btn.preview');
        previewButtons.forEach(btn => {
          btn.onclick = function () {
            const diff = decodeURIComponent(btn.getAttribute('data-diff') || '');
            vscode.postMessage({ command: 'previewDiff', diff: diff });
          };
        });

        const applyButtons = container.querySelectorAll('.diff-btn.apply');
        applyButtons.forEach(btn => {
          btn.onclick = function () {
            const diff = decodeURIComponent(btn.getAttribute('data-diff') || '');
            const diffId = btn.getAttribute('data-id') || '';
            btn.disabled = true;
            btn.innerText = 'Applying...';
            vscode.postMessage({ command: 'applyDiff', diff: diff, diffId: diffId });
          };
        });
      }

      function sendUserMessage() {
        const text = promptInput.value.trim();
        if (!text || isStreaming) return;

        promptInput.value = '';

        // Add user bubble
        const bubble = document.createElement('div');
        bubble.className = 'msg user';
        bubble.innerHTML = formatRegularText(text);
        messagesContainer.appendChild(bubble);
        scrollToBottom();

        vscode.postMessage({ command: 'sendMessage', prompt: text });
      }

      sendBtn.onclick = sendUserMessage;
      stopBtn.onclick = function () {
        vscode.postMessage({ command: 'abortGeneration' });
      };

      clearBtn.onclick = function () {
        vscode.postMessage({ command: 'clearChat' });
      };

      promptInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendUserMessage();
        }
      });

      // Handle messages from Extension Host
      window.addEventListener('message', function (event) {
        const msg = event.data;
        if (!msg) return;

        switch (msg.type) {
          case 'statusUpdate':
            if (msg.online) {
              statusDot.className = 'status-dot';
              modelName.innerText = msg.model || 'Online';
            } else {
              statusDot.className = 'status-dot offline';
              modelName.innerText = 'Offline';
            }
            break;

          case 'injectUserMessage':
            const userBubble = document.createElement('div');
            userBubble.className = 'msg user';
            userBubble.innerHTML = formatRegularText(msg.text || '');
            messagesContainer.appendChild(userBubble);
            scrollToBottom();
            break;

          case 'streamStart':
            isStreaming = true;
            sendBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            currentAssistantText = '';

            currentAssistantBubble = document.createElement('div');
            currentAssistantBubble.className = 'msg assistant';
            currentAssistantBubble.innerHTML = '<span class="cursor"></span>';
            messagesContainer.appendChild(currentAssistantBubble);
            scrollToBottom();
            break;

          case 'tokenDelta':
            if (!currentAssistantBubble) return;
            currentAssistantText += msg.delta || '';
            currentAssistantBubble.innerHTML = renderMarkdown(currentAssistantText) + '<span class="cursor"></span>';
            attachDiffListeners(currentAssistantBubble);
            scrollToBottom();
            break;

          case 'streamComplete':
          case 'streamAborted':
            isStreaming = false;
            sendBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            if (currentAssistantBubble) {
              currentAssistantBubble.innerHTML = renderMarkdown(currentAssistantText);
              attachDiffListeners(currentAssistantBubble);
              currentAssistantBubble = null;
            }
            scrollToBottom();
            break;

          case 'systemMessage':
            const sysBubble = document.createElement('div');
            sysBubble.className = 'msg system' + (msg.isError ? ' error' : '');
            sysBubble.innerText = msg.text || '';
            messagesContainer.appendChild(sysBubble);
            scrollToBottom();
            break;

          case 'diffResult':
            if (msg.diffId) {
              const statusEl = document.getElementById('status-' + msg.diffId);
              if (statusEl) {
                statusEl.className = 'diff-status ' + (msg.success ? 'success' : 'error');
                statusEl.innerText = (msg.success ? '✓ ' : '✗ ') + msg.message;
              }
              const applyBtn = document.querySelector('button.diff-btn.apply[data-id="' + msg.diffId + '"]');
              if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.innerText = msg.success ? 'Applied' : 'Retry Apply';
              }
            }
            break;

          case 'clearChat':
            messagesContainer.innerHTML = '<div class="msg system">Chat cleared. Ready for offline AI assistance.</div>';
            currentAssistantBubble = null;
            currentAssistantText = '';
            break;
        }
      });
    })();
  </script>
</body>
</html>`;
  }
}
