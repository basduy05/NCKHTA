"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

export interface ChatContextData {
  word?: string;
  meaning_vn?: string;
  meaning_en?: string;
  pos?: string;
  level?: string;
  rule?: string;
  description?: string;
  test_type?: string;
  skill?: string;
  [key: string]: string | undefined;
}

interface ChatContextType {
  /** Current app feature the user is on (dictionary, vocabulary, grammar, etc.) */
  currentFeature: string;
  /** Context-specific data to pass to the AI (e.g. the word being viewed) */
  contextData: ChatContextData | null;
  /** Whether the chat panel is open */
  isChatOpen: boolean;
  /** Pending message to pre-fill in chat input */
  pendingMessage: string;

  setCurrentFeature: (feature: string) => void;
  setContextData: (data: ChatContextData | null) => void;
  openChat: (message?: string) => void;
  closeChat: () => void;
  /** Convenience: set feature + context in one call */
  updateChatContext: (feature: string, data?: ChatContextData | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentFeature, setCurrentFeature] = useState("general");
  const [contextData, setContextData] = useState<ChatContextData | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");

  const openChat = useCallback((message = "") => {
    setPendingMessage(message);
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setPendingMessage("");
  }, []);

  const updateChatContext = useCallback(
    (feature: string, data?: ChatContextData | null) => {
      setCurrentFeature(feature);
      if (data !== undefined) setContextData(data);
    },
    []
  );

  return (
    <ChatContext.Provider
      value={{
        currentFeature,
        contextData,
        isChatOpen,
        pendingMessage,
        setCurrentFeature,
        setContextData,
        openChat,
        closeChat,
        updateChatContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used inside ChatProvider");
  return ctx;
}
