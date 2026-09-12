import * as vscode from 'vscode';
import { OpenStudioCompletionProvider } from './completionProvider';
import { checkOllamaHealth } from './ollamaClient';
import {
  OpenStudioDiffContentProvider,
  createVirtualDiffUri,
  OPENSTUDIO_DIFF_SCHEME,
} from './diff/virtualDocProvider';
import { DiffHistoryManager } from './diff/diffHistory';
import { applyMultiFilePatch, dryRunMultiFilePatch } from './diff/patchOrchestrator';
import { ChatViewProvider } from './chat/chatViewProvider';

let completionProvider: OpenStudioCompletionProvider | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let chatViewProvider: ChatViewProvider | null = null;

/**
 * Extension entrypoint: activated when VS Code finishes initialization.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Initialize inline completion provider
  completionProvider = new OpenStudioCompletionProvider();

  const providerDisposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    completionProvider
  );
  context.subscriptions.push(providerDisposable);

  // 2. Virtual Document Content Provider for Side-by-Side Diff Previews
  const diffProvider = OpenStudioDiffContentProvider.getInstance();
  const diffProviderDisposable = vscode.workspace.registerTextDocumentContentProvider(
    OPENSTUDIO_DIFF_SCHEME,
    diffProvider
  );
  context.subscriptions.push(diffProviderDisposable);

  // 3. Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openstudio.checkHealth';
  statusBarItem.text = '$(zap) Open Studio: Connecting...';
  statusBarItem.tooltip = 'Open Studio Local AI: Click to verify Ollama status';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 4. Health Check Command
  const checkHealthCommand = vscode.commands.registerCommand(
    'openstudio.checkHealth',
    async () => {
      const config = vscode.workspace.getConfiguration('openstudio');
      const endpoint = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');
      const model = config.get<string>('autocompleteModel', 'qwen2.5-coder:1.5b');

      if (statusBarItem) {
        statusBarItem.text = '$(sync~spin) Open Studio: Checking...';
      }

      const status = await checkOllamaHealth(endpoint, model);

      if (status.online) {
        if (statusBarItem) {
          statusBarItem.text = `$(zap) Open Studio: ${model}`;
          statusBarItem.tooltip = `Ollama v${status.version} Online\nEndpoint: ${endpoint}\nModel: ${model} (Resident in VRAM)`;
        }
        vscode.window.showInformationMessage(
          `Open Studio Local AI is online (v${status.version}). Autocomplete model '${model}' is ready.`
        );
      } else {
        if (statusBarItem) {
          statusBarItem.text = '$(alert) Open Studio: Offline';
          statusBarItem.tooltip = `Ollama connection failed: ${status.error || 'Server not reachable'}`;
        }
        vscode.window.showWarningMessage(
          `Open Studio Local AI: Cannot reach Ollama at ${endpoint}. Start Ollama with 'ollama serve'.`
        );
      }
    }
  );
  context.subscriptions.push(checkHealthCommand);

  // 5. Manual Autocomplete Trigger Command
  const triggerAutocompleteCommand = vscode.commands.registerCommand(
    'openstudio.triggerAutocomplete',
    async () => {
      await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    }
  );
  context.subscriptions.push(triggerAutocompleteCommand);

  // Helper to read diff text from editor selection or clipboard
  const getDiffInput = async (): Promise<string> => {
    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
      const selected = editor.document.getText(editor.selection);
      if (selected.trim()) return selected;
    }
    return (await vscode.env.clipboard.readText()) || '';
  };

  // 6. Preview Frugal Diff Command (Side-by-Side native VS Code Diff Inspector)
  const previewFrugalDiffCommand = vscode.commands.registerCommand(
    'openstudio.previewFrugalDiff',
    async () => {
      const diffText = await getDiffInput();
      if (!diffText.trim()) {
        vscode.window.showWarningMessage(
          'Open Studio: No diff found in active selection or clipboard to preview.'
        );
        return;
      }

      const dryRun = await dryRunMultiFilePatch(diffText);
      if (dryRun.totalHunks === 0) {
        vscode.window.showWarningMessage(
          'Open Studio: Could not parse any SEARCH/REPLACE diff blocks.'
        );
        return;
      }

      if (dryRun.files.length === 0 || dryRun.files[0].preview.appliedCount === 0) {
        vscode.window.showErrorMessage(
          `Open Studio: Diff preview failed: ${dryRun.errors[0] || 'No matching block found in document'}`
        );
        return;
      }

      const targetFile = dryRun.files[0];
      const virtualUri = createVirtualDiffUri(targetFile.filePath);

      diffProvider.setVirtualContent(virtualUri, targetFile.preview.patchedContent);

      await vscode.commands.executeCommand(
        'vscode.diff',
        targetFile.uri,
        virtualUri,
        `${targetFile.filePath} ↔ Open Studio (Proposed Diff)`
      );
    }
  );
  context.subscriptions.push(previewFrugalDiffCommand);

  // 7. Apply Frugal Diff Command (Multi-File with Dry-Run & Rollback Tracking)
  const applyFrugalDiffCommand = vscode.commands.registerCommand(
    'openstudio.applyFrugalDiff',
    async () => {
      const diffText = await getDiffInput();
      if (!diffText.trim()) {
        vscode.window.showWarningMessage(
          'Open Studio: No frugal diff block found in selection or clipboard.'
        );
        return;
      }

      const result = await applyMultiFilePatch(diffText, 'Applied via Open Studio Command');

      if (result.success) {
        vscode.window.showInformationMessage(
          `Open Studio: Applied ${result.appliedHunks}/${result.totalHunks} hunk(s) across ${result.filesModified.length} file(s) successfully.`
        );
      } else {
        vscode.window.showErrorMessage(
          `Open Studio: Failed to apply diff: ${result.error || 'Unknown error'}`
        );
      }
    }
  );
  context.subscriptions.push(applyFrugalDiffCommand);

  // 8. Rollback Last Applied Diff Command
  const rollbackLastDiffCommand = vscode.commands.registerCommand(
    'openstudio.rollbackLastDiff',
    async () => {
      const result = await DiffHistoryManager.getInstance().rollbackLastSession();
      if (result.success) {
        vscode.window.showInformationMessage(
          `Open Studio: Rolled back ${result.rolledBackFiles.length} file(s) to pre-patch state: ${result.rolledBackFiles.join(', ')}`
        );
      } else {
        vscode.window.showWarningMessage(
          `Open Studio: Rollback failed: ${result.error || 'No applied diff sessions to roll back'}`
        );
      }
    }
  );
  context.subscriptions.push(rollbackLastDiffCommand);

  // 9. Sidebar Webview Chat Panel
  chatViewProvider = new ChatViewProvider(context.extensionUri);
  const chatViewDisposable = vscode.window.registerWebviewViewProvider(
    ChatViewProvider.viewType,
    chatViewProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }
  );
  context.subscriptions.push(chatViewDisposable);

  // 10. Open Chat Command
  const openChatCommand = vscode.commands.registerCommand('openstudio.openChat', async () => {
    await vscode.commands.executeCommand('openstudio.chatView.focus');
  });
  context.subscriptions.push(openChatCommand);

  // 11. Quick-Action Context Commands
  const explainCodeCommand = vscode.commands.registerCommand('openstudio.explainCode', async () => {
    if (chatViewProvider) {
      await chatViewProvider.executeQuickAction('explain');
    }
  });
  context.subscriptions.push(explainCodeCommand);

  const refactorCodeCommand = vscode.commands.registerCommand('openstudio.refactorCode', async () => {
    if (chatViewProvider) {
      await chatViewProvider.executeQuickAction('refactor');
    }
  });
  context.subscriptions.push(refactorCodeCommand);

  const generateTestsCommand = vscode.commands.registerCommand('openstudio.generateTests', async () => {
    if (chatViewProvider) {
      await chatViewProvider.executeQuickAction('generateTests');
    }
  });
  context.subscriptions.push(generateTestsCommand);

  const fixCodeCommand = vscode.commands.registerCommand('openstudio.fixCode', async () => {
    if (chatViewProvider) {
      await chatViewProvider.executeQuickAction('fix');
    }
  });
  context.subscriptions.push(fixCodeCommand);

  // Initial silent background health check
  void vscode.commands.executeCommand('openstudio.checkHealth');
}

/**
 * Extension teardown: cleans up timers and active connections.
 */
export function deactivate(): void {
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = null;
  }
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }
  if (chatViewProvider) {
    chatViewProvider.abortGeneration();
    chatViewProvider = null;
  }
  OpenStudioDiffContentProvider.getInstance().dispose();
}
