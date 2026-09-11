import { create } from 'zustand';
import { 
  ChatMessage, 
  buildChatMLPrompt, 
  CHATML_STOP_TOKENS, 
  DEFAULT_SYSTEM_PROMPT,
  augmentPromptWithContext
} from '../features/chat/promptBuilder';
import { 
  extractFileMentions, 
  resolveFileContent, 
  injectFileContext 
} from '../features/chat/fileMention';
import { useEditorStore } from './editorStore';
import { useSettingsStore } from './settingsStore';
import { streamCompletion } from '../services/inference';
import { routeTask } from '../features/router/taskRouter';

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  selectedModel: string;
  systemPrompt: string;
  abortFn: (() => void) | null;
  genStats: string | null;

  // Actions
  setSelectedModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  sendMessage: (content: string, modelOverride?: string) => Promise<void>;
  stopGeneration: () => void;
  retryLastMessage: () => Promise<void>;
  clearMessages: () => void;
  deleteMessage: (id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isGenerating: false,
  selectedModel: 'qwen2.5-coder:1.5b',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  abortFn: null,
  genStats: null,

  setSelectedModel: (model: string) => set({ selectedModel: model }),
  
  setSystemPrompt: (prompt: string) => set({ systemPrompt: prompt }),

  sendMessage: async (content: string, modelOverride?: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isGenerating) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const asstId = `msg_asst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assistantMessage: ChatMessage = {
      id: asstId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const newMessages = [...get().messages, userMessage, assistantMessage];
    set({
      messages: newMessages,
      isGenerating: true,
      genStats: null,
    });

    let model = modelOverride || get().selectedModel;
    let temperature = 0.2;
    let keepAlive: string | undefined = undefined;
    let priority: 'autocomplete' | 'chat' | 'background' | 'abort' = 'chat';
    let routeRationale: string | undefined = undefined;

    // Dynamic Multi-Model Task Router & VRAM Arbiter integration
    const autoRouterEnabled = useSettingsStore.getState().settings.autoModelRouter;
    if ((autoRouterEnabled || model === 'auto') && !modelOverride) {
      try {
        const decision = await routeTask(undefined, trimmed);
        model = decision.model_name;
        temperature = decision.temperature;
        keepAlive = decision.keep_alive;
        priority = decision.priority;
        routeRationale = `${decision.task_type}: ${decision.rationale}`;
      } catch (routerErr) {
        console.warn('Task router routing fallback:', routerErr);
      }
    }

    // Resolve @file mentions for grounding context
    const mentions = extractFileMentions(trimmed);
    let enrichedContent = trimmed;
    if (mentions.length > 0) {
      const openBuffers = useEditorStore.getState().buffers;
      const resolved = await Promise.all(
        mentions.map((m) => resolveFileContent(m, openBuffers))
      );
      const validFiles = resolved.filter(Boolean) as { relPath: string; content: string }[];
      if (validFiles.length > 0) {
        enrichedContent = injectFileContext(trimmed, validFiles);
      }
    }

    // Hybrid codebase context augmentation (@codebase, @repo, @search)
    const editorState = useEditorStore.getState();
    const activeFile = editorState.activeBufferId ? editorState.buffers[editorState.activeBufferId]?.filePath : undefined;
    const openFilesList = Object.values(editorState.buffers).map((b) => b.filePath);

    const { systemPrompt: augmentedSystemPrompt, contextSummary } = await augmentPromptWithContext(
      trimmed,
      get().systemPrompt,
      activeFile,
      openFilesList
    );

    if (contextSummary) {
      userMessage.contextSummary = contextSummary;
      set((state) => ({
        messages: state.messages.map((m) => (m.id === userMessage.id ? { ...m, contextSummary } : m)),
      }));
    }

    const messagesForPrompt = newMessages.map((m) =>
      m.id === userMessage.id ? { ...m, content: enrichedContent } : m
    );
    const prompt = buildChatMLPrompt(messagesForPrompt, augmentedSystemPrompt);

    try {
      const cancel = await streamCompletion(
        {
          model,
          prompt,
          temperature,
          stop_tokens: CHATML_STOP_TOKENS,
          priority,
          keep_alive: keepAlive,
        },
        (tokenDelta) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === asstId ? { ...m, content: m.content + tokenDelta, model, routeRationale } : m
            ),
          }));
        },
        (stats) => {
          let tokPerSec: string | undefined;
          let statsLabel = 'Completed';

          if (stats.eval_count && stats.eval_duration) {
            const speed = (stats.eval_count / (stats.eval_duration / 1e9)).toFixed(1);
            tokPerSec = `${speed} tok/s`;
            statsLabel = `${stats.eval_count} tokens • ${tokPerSec}`;
          }

          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === asstId
                ? {
                    ...m,
                    isStreaming: false,
                    tokensCount: stats.eval_count,
                    tokPerSec,
                    model,
                    routeRationale,
                  }
                : m
            ),
            isGenerating: false,
            abortFn: null,
            genStats: statsLabel,
          }));
        }
      );

      set({ abortFn: cancel });
    } catch (err) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === asstId
            ? {
                ...m,
                isStreaming: false,
                error: `Inference failed: ${String(err)}`,
              }
            : m
        ),
        isGenerating: false,
        abortFn: null,
      }));
    }
  },

  stopGeneration: () => {
    const { abortFn, messages } = get();
    if (abortFn) {
      abortFn();
    }
    set({
      isGenerating: false,
      abortFn: null,
      messages: messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      ),
    });
  },

  retryLastMessage: async () => {
    const { messages, isGenerating, sendMessage } = get();
    if (isGenerating || messages.length === 0) return;

    // Find the last user message
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserPrompt = messages[lastUserIndex].content;
    // Truncate messages up to the last user message (exclusive)
    const truncated = messages.slice(0, lastUserIndex);
    set({ messages: truncated });

    // Re-send
    await sendMessage(lastUserPrompt);
  },

  clearMessages: () => {
    const { abortFn } = get();
    if (abortFn) {
      abortFn();
    }
    set({
      messages: [],
      isGenerating: false,
      abortFn: null,
      genStats: null,
    });
  },

  deleteMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },
}));
