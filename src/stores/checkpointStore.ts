import { create } from 'zustand';
import { Checkpoint } from '../types/git';
import { listCheckpoints, createCheckpoint, restoreCheckpoint } from '../features/git/checkpoint';
import { useEditorStore } from './editorStore';

interface CheckpointState {
  checkpoints: Checkpoint[];
  selectedCheckpointId: string | null;
  searchQuery: string;
  isLoading: boolean;
  isCreating: boolean;
  restoringId: string | null;
  statusMessage: { type: 'success' | 'error'; text: string } | null;
  isCreateModalOpen: boolean;

  // Actions
  fetchCheckpoints: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  selectCheckpoint: (id: string | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  createManualCheckpoint: (summary: string) => Promise<boolean>;
  rollbackToCheckpoint: (checkpointId: string) => Promise<boolean>;
  clearStatusMessage: () => void;
  getFilteredCheckpoints: () => Checkpoint[];
}

export const useCheckpointStore = create<CheckpointState>((set, get) => ({
  checkpoints: [],
  selectedCheckpointId: null,
  searchQuery: '',
  isLoading: false,
  isCreating: false,
  restoringId: null,
  statusMessage: null,
  isCreateModalOpen: false,

  fetchCheckpoints: async () => {
    set({ isLoading: true });
    try {
      const list = await listCheckpoints();
      set({ checkpoints: list, isLoading: false });
    } catch {
      set({ checkpoints: [], isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  selectCheckpoint: (id: string | null) => {
    set({ selectedCheckpointId: id });
  },

  setCreateModalOpen: (open: boolean) => {
    set({ isCreateModalOpen: open });
  },

  createManualCheckpoint: async (summary: string) => {
    const cleanSummary = summary.trim() || 'Manual developer snapshot';
    set({ isCreating: true, statusMessage: null });

    try {
      const cp = await createCheckpoint(cleanSummary);
      if (cp) {
        await get().fetchCheckpoints();
        set({
          isCreating: false,
          isCreateModalOpen: false,
          statusMessage: {
            type: 'success',
            text: `Snapshot created: "${cleanSummary}"`,
          },
        });
        return true;
      }
      set({
        isCreating: false,
        statusMessage: {
          type: 'error',
          text: 'Failed to create snapshot.',
        },
      });
      return false;
    } catch (err: any) {
      set({
        isCreating: false,
        statusMessage: {
          type: 'error',
          text: err?.message || 'Error creating snapshot',
        },
      });
      return false;
    }
  },

  rollbackToCheckpoint: async (checkpointId: string) => {
    set({ restoringId: checkpointId, statusMessage: null });

    try {
      const res = await restoreCheckpoint(checkpointId);
      if (res && res.success) {
        // Reload open editor buffers if they were affected
        const editorBuffers = useEditorStore.getState().buffers;
        const openPaths = Object.values(editorBuffers).map((b) => b.filePath);

        for (const filePath of res.restoredFiles) {
          if (openPaths.includes(filePath)) {
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              const freshContent = await invoke<string>('read_file_content', { path: filePath });
              useEditorStore.getState().updateFileContentByPath(filePath, freshContent);
            } catch {
              // Ignore in browser mode
            }
          }
        }

        await get().fetchCheckpoints();
        set({
          restoringId: null,
          statusMessage: {
            type: 'success',
            text: `Workspace reverted to checkpoint ${checkpointId.slice(0, 8)}`,
          },
        });
        return true;
      } else {
        set({
          restoringId: null,
          statusMessage: {
            type: 'error',
            text: res?.message || `Failed to restore checkpoint ${checkpointId}`,
          },
        });
        return false;
      }
    } catch (err: any) {
      set({
        restoringId: null,
        statusMessage: {
          type: 'error',
          text: err?.message || 'Error executing rollback',
        },
      });
      return false;
    }
  },

  clearStatusMessage: () => {
    set({ statusMessage: null });
  },

  getFilteredCheckpoints: () => {
    const { checkpoints, searchQuery } = get();
    if (!searchQuery.trim()) return checkpoints;

    const q = searchQuery.toLowerCase().trim();
    return checkpoints.filter((cp) => {
      const matchSummary = cp.summary.toLowerCase().includes(q);
      const matchHash = cp.commitHash.toLowerCase().includes(q);
      const matchBranch = cp.branch.toLowerCase().includes(q);
      const matchFile = cp.filePaths.some((p) => p.toLowerCase().includes(q));
      return matchSummary || matchHash || matchBranch || matchFile;
    });
  },
}));
