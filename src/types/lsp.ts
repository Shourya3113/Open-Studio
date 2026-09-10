export interface LspRange {
  start_line: number;
  start_character: number;
  end_line: number;
  end_character: number;
}

export interface LspLocation {
  file_path: string;
  range: LspRange;
}

export interface LspHoverResponse {
  contents: string;
  range?: LspRange | null;
}

export interface LspStatus {
  running: boolean;
  language: string;
  server_name: string;
  root_uri?: string | null;
  error?: string | null;
}

export interface LspDiagnostic {
  file_path: string;
  range: LspRange;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
}
