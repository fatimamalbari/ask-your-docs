import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAskMutation } from './queries';
import type { ChatMessage } from './types';

interface Focus {
  id: number | null;
  n: number | null;
}

interface ChatState {
  messages: ChatMessage[];
  selectedDoc: string | null;
  focus: Focus;
  busy: boolean;
  ask: (question: string) => void;
  toggleDoc: (name: string) => void;
  setFocus: (focus: Focus) => void;
}

const ChatContext = createContext<ChatState | null>(null);

let nextId = 1;

// Lives above the router so the conversation survives moving between pages.
export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>({ id: null, n: null });
  const mutation = useAskMutation();

  const ask = useCallback(
    (question: string) => {
      const id = nextId++;
      setMessages((m) => [...m, { id, question, status: 'pending' }]);
      setFocus({ id, n: null });
      mutation.mutate(
        { question, doc: selectedDoc },
        {
          onSuccess: (result) =>
            setMessages((m) => m.map((x) => (x.id === id ? { id, question, status: 'done', result } : x))),
          onError: () =>
            setMessages((m) => m.map((x) => (x.id === id ? { id, question, status: 'error' } : x))),
        },
      );
    },
    [mutation, selectedDoc],
  );

  const value = useMemo<ChatState>(
    () => ({
      messages,
      selectedDoc,
      focus,
      busy: mutation.isPending,
      ask,
      toggleDoc: (name) => setSelectedDoc((cur) => (cur === name ? null : name)),
      setFocus,
    }),
    [messages, selectedDoc, focus, mutation.isPending, ask],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatState {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
