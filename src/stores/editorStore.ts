import { create } from 'zustand';
import { EditorBuffer, SplitDirection, getLanguageFromPath } from '../types/editor';

interface EditorState {
  buffers: Record<string, EditorBuffer>;
  openBufferIds: string[];
  activeBufferId: string | null;
  splitActiveBufferId: string | null;
  splitDirection: SplitDirection;
  savedSnapshots: Record<string, string>;

  // Actions
  openFile: (filePath: string, content?: string, language?: string) => string;
  closeFile: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  saveFile: (id: string) => void;
  setActiveBuffer: (id: string) => void;
  setSplitActiveBuffer: (id: string | null) => void;
  setSplitDirection: (direction: SplitDirection) => void;
  updateCursor: (id: string, line: number, column: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  buffers: {},
  openBufferIds: [],
  activeBufferId: null,
  splitActiveBufferId: null,
  splitDirection: 'none',
  savedSnapshots: {},

  openFile: (filePath: string, content = '', language?: string) => {
    const { buffers } = get();

    // Check if buffer with this path already exists
    const existingId = Object.keys(buffers).find((id) => buffers[id].filePath === filePath);
    if (existingId) {
      set({ activeBufferId: existingId });
      return existingId;
    }

    const id = `buf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const detectedLang = language || getLanguageFromPath(filePath);

    const newBuffer: EditorBuffer = {
      id,
      filePath,
      fileName,
      language: detectedLang,
      content,
      isDirty: false,
      cursorPosition: { line: 1, column: 1 },
    };

    set((state) => ({
      buffers: { ...state.buffers, [id]: newBuffer },
      openBufferIds: [...state.openBufferIds, id],
      activeBufferId: id,
      savedSnapshots: { ...state.savedSnapshots, [id]: content },
    }));

    return id;
  },

  closeFile: (id: string) => {
    const { openBufferIds, activeBufferId, splitActiveBufferId } = get();
    const newOpenIds = openBufferIds.filter((bufId) => bufId !== id);

    let nextActiveId = activeBufferId;
    if (activeBufferId === id) {
      const closedIndex = openBufferIds.indexOf(id);
      nextActiveId = newOpenIds[closedIndex] || newOpenIds[closedIndex - 1] || null;
    }

    let nextSplitId = splitActiveBufferId;
    if (splitActiveBufferId === id) {
      nextSplitId = newOpenIds.length > 1 ? newOpenIds.find((bId) => bId !== nextActiveId) || null : null;
    }

    set((state) => {
      const newBuffers = { ...state.buffers };
      delete newBuffers[id];

      const newSnapshots = { ...state.savedSnapshots };
      delete newSnapshots[id];

      return {
        buffers: newBuffers,
        openBufferIds: newOpenIds,
        activeBufferId: nextActiveId,
        splitActiveBufferId: nextSplitId,
        savedSnapshots: newSnapshots,
        splitDirection: newOpenIds.length === 0 ? 'none' : state.splitDirection,
      };
    });
  },

  updateContent: (id: string, content: string) => {
    set((state) => {
      const buffer = state.buffers[id];
      if (!buffer) return state;

      const original = state.savedSnapshots[id] ?? '';
      const isDirty = content !== original;

      return {
        buffers: {
          ...state.buffers,
          [id]: {
            ...buffer,
            content,
            isDirty,
          },
        },
      };
    });
  },

  saveFile: (id: string) => {
    set((state) => {
      const buffer = state.buffers[id];
      if (!buffer) return state;

      return {
        buffers: {
          ...state.buffers,
          [id]: {
            ...buffer,
            isDirty: false,
          },
        },
        savedSnapshots: {
          ...state.savedSnapshots,
          [id]: buffer.content,
        },
      };
    });
  },

  setActiveBuffer: (id: string) => {
    set({ activeBufferId: id });
  },

  setSplitActiveBuffer: (id: string | null) => {
    set({ splitActiveBufferId: id });
  },

  setSplitDirection: (direction: SplitDirection) => {
    const { openBufferIds, activeBufferId } = get();
    if (direction !== 'none') {
      const otherId = openBufferIds.find((id) => id !== activeBufferId) || activeBufferId;
      set({ splitDirection: direction, splitActiveBufferId: otherId });
    } else {
      set({ splitDirection: 'none', splitActiveBufferId: null });
    }
  },

  updateCursor: (id: string, line: number, column: number) => {
    set((state) => {
      const buffer = state.buffers[id];
      if (!buffer) return state;

      return {
        buffers: {
          ...state.buffers,
          [id]: {
            ...buffer,
            cursorPosition: { line, column },
          },
        },
      };
    });
  },
}));
