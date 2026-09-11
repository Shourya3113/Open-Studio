import { CapturedTerminalError } from './terminal';
import { DiagnosticItem } from './diagnostics';
import { FileDiff } from './diff';

export type RepairSourceType = 'terminal' | 'problem';

export interface DiagnosticRepairRequest {
  id: string;
  sourceType: RepairSourceType;
  terminalError?: CapturedTerminalError;
  diagnosticItem?: DiagnosticItem;
  filePath: string;
  line?: number;
  column?: number;
  errorMessage: string;
  errorCode?: string;
  contextSnippet?: string;
  tool?: string;
}

export interface DiagnosticRepairResult {
  requestId: string;
  fullContent: string;
  diffs: FileDiff[];
  explanation: string;
  modelUsed: string;
}
