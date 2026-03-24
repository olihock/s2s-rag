import React, { useRef, useEffect, useState } from 'react';
import type { ChatMessage, SupportedLanguage } from '../types/types';
import { queryWithChat } from '../services/api';

interface ChatWindowProps {
  language: SupportedLanguage;
  onClose: () => void;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  language,
  onClose,
  messages,
  onMessagesChange,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const result = await queryWithChat(userMessage.text, language);
      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: result.answer,
        sources: result.sources,
        timestamp: new Date(),
      };
      onMessagesChange([...updatedMessages, botMessage]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: `Fehler: ${errorText}`,
        timestamp: new Date(),
      };
      onMessagesChange([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chat"
    >
      <div className="flex flex-col w-full max-w-lg h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
          <span className="font-semibold text-sm">Chat</span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Konversation löschen"
              onClick={() => onMessagesChange([])}
              className="p-1 rounded hover:bg-primary-700 transition-colors"
              title="Verlauf löschen"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <button
              aria-label="Chat schließen"
              onClick={onClose}
              className="p-1 rounded hover:bg-primary-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !isLoading && (
            <p className="text-center text-gray-400 text-sm mt-8">Stellen Sie eine Frage...</p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.text}
              </div>

              {/* Sources */}
              {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 max-w-[80%] space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Quellen
                  </p>
                  {msg.sources.map((source, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <p className="font-medium text-gray-700">{source.filename}</p>
                      <p className="text-gray-500 line-clamp-2">{source.chunkText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex items-end gap-2 p-3 border-t">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Nachricht eingeben..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Nachricht senden"
            className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
