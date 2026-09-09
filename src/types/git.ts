export interface Checkpoint {
  id: string;
  refName: string;
  commitHash: string;
  timestamp: string;
  timestampEpochSecs: number;
  branch: string;
  summary: string;
  filePaths: string[];
}

export interface RestoreResult {
  success: boolean;
  checkpointId: string;
  restoredFiles: string[];
  message: string;
}
