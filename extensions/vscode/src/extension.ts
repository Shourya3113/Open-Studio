import * as vscode from 'vscode';
import { OpenStudioCompletionProvider } from './completionProvider';
import { checkOllamaHealth } from './ollamaClient';
import { parseFrugalDiff, applyFrugalDiff } from './frugalDiff';

let completionProvider: OpenStudioCompletionProvider | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

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

  // 2. Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openstudio.checkHealth';
  statusBarItem.text = '$(zap) Open Studio: Connecting...';
  statusBarItem.tooltip = 'Open Studio Local AI: Click to verify Ollama status';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 3. Health Check Command
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

  // 4. Manual Autocomplete Trigger Command
  const triggerAutocompleteCommand = vscode.commands.registerCommand(
    'openstudio.triggerAutocomplete',
    async () => {
      await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    }
  );
  context.subscriptions.push(triggerAutocompleteCommand);

  // 5. Apply Frugal Diff Command
  const applyFrugalDiffCommand = vscode.commands.registerCommand(
    'openstudio.applyFrugalDiff',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Open Studio: No active text editor');
        return;
      }

      // Check active selection or clipboard for diff content
      const selection = editor.selection;
      let diffText = editor.document.getText(selection);

      if (!diffText.trim()) {
        diffText = await vscode.env.clipboard.readText();
      }

      if (!diffText.trim()) {
        vscode.window.showWarningMessage(
          'Open Studio: No frugal diff block found in selection or clipboard.'
        );
        return;
      }

      const parsedFiles = parseFrugalDiff(diffText);
      if (parsedFiles.length === 0 || parsedFiles[0].hunks.length === 0) {
        vscode.window.showWarningMessage(
          'Open Studio: Could not parse any SEARCH/REPLACE diff hunks.'
        );
        return;
      }

      const originalText = editor.document.getText();
      const preview = applyFrugalDiff(originalText, parsedFiles[0].hunks);

      if (!preview.success && preview.appliedCount === 0) {
        vscode.window.showErrorMessage(
          `Open Studio: Failed to apply diff hunk: ${preview.results[0]?.error || 'No matching block found'}`
        );
        return;
      }

      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(editor.document.lineCount, 0)
      );

      const success = await editor.edit((editBuilder) => {
        editBuilder.replace(fullRange, preview.patchedContent);
      });

      if (success) {
        vscode.window.showInformationMessage(
          `Open Studio: Applied ${preview.appliedCount}/${preview.totalCount} frugal diff hunk(s) successfully.`
        );
      } else {
        vscode.window.showErrorMessage('Open Studio: Failed to apply editor edit.');
      }
    }
  );
  context.subscriptions.push(applyFrugalDiffCommand);

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
}
