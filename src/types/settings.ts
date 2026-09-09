export type EditorTheme = 'open-studio-dark' | 'vs-dark' | 'light';
export type WordWrapSetting = 'on' | 'off' | 'wordWrapColumn';

export interface OpenStudioSettings {
  ollamaEndpoint: string;
  autocompleteModel: string;
  chatModel: string;
  tabSize: number;
  fontSize: number;
  theme: EditorTheme;
  wordWrap: WordWrapSetting;
  formatOnSave: boolean;
  isFirstRun: boolean;
  telemetryDisabled: boolean; // Always true for 100% air-gap
}

export const DEFAULT_SETTINGS: OpenStudioSettings = {
  ollamaEndpoint: 'http://localhost:11434',
  autocompleteModel: 'qwen2.5-coder:1.5b',
  chatModel: 'qwen2.5-coder:7b',
  tabSize: 2,
  fontSize: 14,
  theme: 'open-studio-dark',
  wordWrap: 'on',
  formatOnSave: true,
  isFirstRun: true,
  telemetryDisabled: true,
};
