import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from './chatStore';

describe('Chat Store (Zustand)', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
  });

  it('initializes with default state', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isGenerating).toBe(false);
    expect(state.selectedModel).toBe('qwen2.5-coder:1.5b');
    expect(state.abortFn).toBeNull();
  });

  it('updates selected model', () => {
    useChatStore.getState().setSelectedModel('qwen2.5-coder:7b');
    expect(useChatStore.getState().selectedModel).toBe('qwen2.5-coder:7b');
  });

  it('updates system prompt', () => {
    useChatStore.getState().setSystemPrompt('Custom instruction');
    expect(useChatStore.getState().systemPrompt).toBe('Custom instruction');
  });

  it('does not send empty or whitespace-only messages', async () => {
    await useChatStore.getState().sendMessage('   ');
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(useChatStore.getState().isGenerating).toBe(false);
  });

  it('sends a user message and streams assistant response', async () => {
    const store = useChatStore.getState();
    const sendPromise = store.sendMessage('Write hello world in python');

    // Messages should be populated immediately
    const intermediateMessages = useChatStore.getState().messages;
    expect(intermediateMessages).toHaveLength(2);
    expect(intermediateMessages[0].role).toBe('user');
    expect(intermediateMessages[0].content).toBe('Write hello world in python');
    expect(intermediateMessages[1].role).toBe('assistant');

    await sendPromise;
    await vi.waitFor(
      () => {
        expect(useChatStore.getState().isGenerating).toBe(false);
      },
      { timeout: 1500, interval: 25 }
    );

    const finalMessages = useChatStore.getState().messages;
    expect(finalMessages).toHaveLength(2);
    expect(finalMessages[1].content.length).toBeGreaterThan(0);
  });

  it('stops in-flight generation when stopGeneration is called', async () => {
    const abortMock = vi.fn();
    useChatStore.setState({
      isGenerating: true,
      abortFn: abortMock,
      messages: [
        { id: '1', role: 'user', content: 'test', timestamp: 1 },
        { id: '2', role: 'assistant', content: 'generating...', isStreaming: true, timestamp: 2 },
      ],
    });

    useChatStore.getState().stopGeneration();

    expect(abortMock).toHaveBeenCalledTimes(1);
    expect(useChatStore.getState().isGenerating).toBe(false);
    expect(useChatStore.getState().messages[1].isStreaming).toBe(false);
  });

  it('clears all messages and resets generation state', () => {
    useChatStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'test', timestamp: 1 },
        { id: '2', role: 'assistant', content: 'reply', timestamp: 2 },
      ],
      genStats: '50 tokens',
    });

    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().genStats).toBeNull();
  });

  it('deletes a single message by id', () => {
    useChatStore.setState({
      messages: [
        { id: 'msg-1', role: 'user', content: 'one', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: 'two', timestamp: 2 },
      ],
    });

    useChatStore.getState().deleteMessage('msg-1');
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].id).toBe('msg-2');
  });

  it('retries last user message', async () => {
    useChatStore.setState({
      messages: [
        { id: 'msg-1', role: 'user', content: 'First question', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: 'First answer', timestamp: 2 },
      ],
    });

    await useChatStore.getState().retryLastMessage();
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('First question');
    expect(msgs[1].role).toBe('assistant');
  });
});
