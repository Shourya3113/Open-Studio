import type { Checkpoint, RestoreResult } from '../../types/git';

// In-memory fallback for browser dev mode and unit tests
const mockCheckpoints: Checkpoint[] = [];

/**
 * Creates a shadow git checkpoint under `refs/ai-checkpoints/` before modifying files.
 */
export async function createCheckpoint(summary: string): Promise<Checkpoint | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<Checkpoint>('create_checkpoint', { summary });
  } catch {
    const epoch = Math.floor(Date.now() / 1000);
    const mock: Checkpoint = {
      id: `mock_commit_${Date.now()}`,
      refName: `refs/ai-checkpoints/main/${epoch}`,
      commitHash: `mock_${epoch}`,
      timestamp: new Date().toISOString(),
      timestampEpochSecs: epoch,
      branch: 'main',
      summary,
      filePaths: [],
    };
    mockCheckpoints.unshift(mock);
    return mock;
  }
}

/**
 * Lists all shadow git checkpoints sorted descending by date.
 */
export async function listCheckpoints(): Promise<Checkpoint[]> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<Checkpoint[]>('list_checkpoints');
  } catch {
    return [...mockCheckpoints];
  }
}

/**
 * Restores the workspace files to a specific shadow checkpoint commit.
 */
export async function restoreCheckpoint(checkpointId: string): Promise<RestoreResult | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<RestoreResult>('restore_checkpoint', { checkpointId });
  } catch {
    const found = mockCheckpoints.find((c) => c.id === checkpointId || c.commitHash === checkpointId);
    if (!found) {
      return {
        success: false,
        checkpointId,
        restoredFiles: [],
        message: 'Checkpoint not found in mock store',
      };
    }
    return {
      success: true,
      checkpointId,
      restoredFiles: found.filePaths,
      message: `Restored mock checkpoint: ${found.summary}`,
    };
  }
}
