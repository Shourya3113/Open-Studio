import type { SplitDirection } from '../types/editor';
import { useEditorStore } from './editorStore';

export const WORKSPACE_CONFIG_FILE = '.openstudio/workspace.json';
export const LOCAL_STORAGE_WORKSPACE_KEY = 'openstudio_workspace_state';

export interface PersistedBuffer {
  filePath: string;
  cursorPosition?: { line: number; column: number };
}

export interface PersistedLayout {
  sidebarWidth: number;
  bottomPanelHeight: number;
  isSidebarOpen: boolean;
  isBottomPanelOpen: boolean;
  activeTab: 'files' | 'search' | 'chat' | 'git' | 'settings';
}

export interface PersistedWorkspaceState {
  version: number;
  openFiles: PersistedBuffer[];
  activeFilePath: string | null;
  splitActiveFilePath: string | null;
  splitDirection: SplitDirection;
  recentFiles: string[];
  layout: PersistedLayout;
  lastSavedTimestamp: number;
}

const DEFAULT_LAYOUT: PersistedLayout = {
  sidebarWidth: 260,
  bottomPanelHeight: 220,
  isSidebarOpen: true,
  isBottomPanelOpen: false,
  activeTab: 'files',
};

let inMemoryStorage: string | null = null;

export function clearWorkspaceStorage(): void {
  inMemoryStorage = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_STORAGE_WORKSPACE_KEY);
    }
  } catch {
    // Ignore
  }
}

export function _setRawStorageForTest(raw: string | null): void {
  inMemoryStorage = raw;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (raw !== null) {
        window.localStorage.setItem(LOCAL_STORAGE_WORKSPACE_KEY, raw);
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_WORKSPACE_KEY);
      }
    }
  } catch {
    // Ignore
  }
}

/**
 * Serializes and saves workspace state to `.openstudio/workspace.json` and fallback storage.
 */
export async function saveWorkspaceState(
  state: PersistedWorkspaceState,
  workspacePath?: string
): Promise<boolean> {
  const jsonContent = JSON.stringify(state, null, 2);
  inMemoryStorage = jsonContent;

  // Always mirror to localStorage fallback
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_WORKSPACE_KEY, jsonContent);
    }
  } catch {
    // Ignore storage quota / access issues
  }

  // Write to workspace file via Tauri IPC if available
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const targetPath = workspacePath
      ? `${workspacePath.replace(/[/\\]+$/, '')}/${WORKSPACE_CONFIG_FILE}`
      : WORKSPACE_CONFIG_FILE;

    await invoke('write_file_content', {
      path: targetPath,
      content: jsonContent,
    });
    return true;
  } catch {
    // In browser dev mode / test mock
    return true;
  }
}

/**
 * Loads and parses workspace state from `.openstudio/workspace.json` or fallback storage.
 */
export async function loadWorkspaceState(
  workspacePath?: string
): Promise<PersistedWorkspaceState | null> {
  let rawContent: string | null = null;

  // Try reading from .openstudio/workspace.json via Tauri IPC
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const targetPath = workspacePath
      ? `${workspacePath.replace(/[/\\]+$/, '')}/${WORKSPACE_CONFIG_FILE}`
      : WORKSPACE_CONFIG_FILE;

    rawContent = await invoke<string>('read_file_content', { path: targetPath });
  } catch {
    // Fall back to localStorage or in-memory
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        rawContent = window.localStorage.getItem(LOCAL_STORAGE_WORKSPACE_KEY);
      }
    } catch {
      rawContent = null;
    }
  }

  if (!rawContent) {
    rawContent = inMemoryStorage;
  }

  if (!rawContent) return null;

  try {
    const parsed = JSON.parse(rawContent) as PersistedWorkspaceState;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.openFiles)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Gathers current workspace snapshot from editorStore and current layout.
 */
export function extractCurrentWorkspaceState(
  layout: PersistedLayout = DEFAULT_LAYOUT
): PersistedWorkspaceState {
  const editorState = useEditorStore.getState();
  const { buffers, openBufferIds, activeBufferId, splitActiveBufferId, splitDirection, recentFiles } =
    editorState;

  const openFiles: PersistedBuffer[] = openBufferIds
    .map((id) => buffers[id])
    .filter(Boolean)
    .map((buf) => ({
      filePath: buf.filePath,
      cursorPosition: buf.cursorPosition,
    }));

  const activeBuffer = activeBufferId ? buffers[activeBufferId] : null;
  const splitBuffer = splitActiveBufferId ? buffers[splitActiveBufferId] : null;

  return {
    version: 1,
    openFiles,
    activeFilePath: activeBuffer ? activeBuffer.filePath : null,
    splitActiveFilePath: splitBuffer ? splitBuffer.filePath : null,
    splitDirection,
    recentFiles: recentFiles || [],
    layout,
    lastSavedTimestamp: Date.now(),
  };
}

/**
 * Rehydrates editor buffers, active tabs, split layouts, and recent files from persisted state.
 */
export async function rehydrateWorkspace(
  persisted: PersistedWorkspaceState
): Promise<{ layout: PersistedLayout }> {
  const editorStore = useEditorStore.getState();

  // Restore open files in original tab order
  let targetActiveId: string | null = null;
  let targetSplitId: string | null = null;

  for (const item of persisted.openFiles) {
    let fileContent = '';

    // Read content from disk if possible
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      fileContent = await invoke<string>('read_file_content', { path: item.filePath });
    } catch {
      fileContent = '';
    }

    const bufId = editorStore.openFile(item.filePath, fileContent);

    if (item.cursorPosition) {
      editorStore.updateCursor(bufId, item.cursorPosition.line, item.cursorPosition.column);
    }

    if (persisted.activeFilePath && item.filePath === persisted.activeFilePath) {
      targetActiveId = bufId;
    }
    if (persisted.splitActiveFilePath && item.filePath === persisted.splitActiveFilePath) {
      targetSplitId = bufId;
    }
  }

  // Restore recent files after all buffers are opened so openFile doesn't override order
  if (Array.isArray(persisted.recentFiles)) {
    editorStore.setRecentFiles(persisted.recentFiles);
  }

  // Set active buffer
  if (targetActiveId) {
    editorStore.setActiveBuffer(targetActiveId);
  }

  // Restore split layout
  if (persisted.splitDirection && persisted.splitDirection !== 'none') {
    editorStore.setSplitDirection(persisted.splitDirection);
    if (targetSplitId) {
      editorStore.setSplitActiveBuffer(targetSplitId);
    }
  }

  return {
    layout: persisted.layout || DEFAULT_LAYOUT,
  };
}

/**
 * Starts debounced auto-sync subscriber listening to editorStore mutations.
 * Returns an unsubscription callback to cancel listeners.
 */
export function initWorkspacePersistence(options?: {
  debounceMs?: number;
  workspacePath?: string;
  getLayout?: () => PersistedLayout;
}): () => void {
  const debounceMs = options?.debounceMs ?? 500;
  let timeoutId: any = null;

  const unsubscribe = useEditorStore.subscribe(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const currentLayout = options?.getLayout ? options.getLayout() : DEFAULT_LAYOUT;
      const state = extractCurrentWorkspaceState(currentLayout);
      await saveWorkspaceState(state, options?.workspacePath);
    }, debounceMs);
  });

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    unsubscribe();
  };
}
