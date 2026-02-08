'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import ChatMessage from './ChatMessage';
import ChatInput, { type ChatInputRef } from './ChatInput';
import QuickActions from './QuickActions';
import { getWelcomeMessage } from '@/lib/rag/prompts';
import type { Message, ChatResponse } from '@/lib/rag/types';

const DIANA_PHONE = '41793003328';

interface ChatWindowProps {
  onClose: () => void;
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const [conversationLanguage, setConversationLanguage] = useState(locale);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: getWelcomeMessage(locale),
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [locale]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setLastQuestion(content);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          conversationHistory: messages,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data: ChatResponse = await response.json();

      // Update session ID and detected language
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      if (data.detectedLanguage) {
        setConversationLanguage(data.detectedLanguage);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        showWhatsApp: data.suggestWhatsApp,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: locale === 'de'
          ? 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.'
          : 'Sorry, an error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Re-focus input after response
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  };

  const openWhatsApp = () => {
    const greetings: Record<string, string> = {
      de: 'Hallo Diana, ich chatte gerade mit dem Chatbot auf der Little Heart Webseite und bräuchte deine Hilfe',
      en: 'Hello Diana, I\'m chatting with the chatbot on the Little Heart website and need your help',
      fr: 'Bonjour Diana, je suis en train de chatter avec le chatbot du site Little Heart et j\'aurais besoin de votre aide',
    };
    const greeting = greetings[conversationLanguage] || greetings.en;
    const text = lastQuestion
      ? `${greeting}: ${lastQuestion}`
      : greeting;
    window.open(`https://wa.me/${DIANA_PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const inputPlaceholder = locale === 'de'
    ? 'Schreibe eine Nachricht...'
    : locale === 'fr'
      ? 'Écrivez un message...'
      : 'Type a message...';

  return (
    <div
      className="
        fixed bottom-6 right-6 z-50
        w-[380px] max-w-[calc(100vw-48px)]
        h-[550px] max-h-[calc(100vh-120px)]
        bg-white rounded-2xl shadow-2xl
        flex flex-col
        overflow-hidden
        animate-in slide-in-from-bottom-4 duration-300
      "
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#E57373] to-[#EF5350] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">💬</span>
            </div>
            <div>
              <h3 className="font-semibold">Diana&apos;s Assistent</h3>
              <p className="text-xs text-white/80">
                {locale === 'de' ? 'Hier um zu helfen' : 'Here to help'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id}>
            <ChatMessage message={message} />
            {message.showWhatsApp && (
              <div className="mt-2 ml-2">
                <button
                  onClick={openWhatsApp}
                  className="
                    inline-flex items-center gap-2
                    px-4 py-2
                    bg-green-500 hover:bg-green-600
                    rounded-full
                    text-sm text-white font-medium
                    transition-colors duration-200
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.88L2 22l5.23-1.37C8.69 21.53 10.31 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                  </svg>
                  {locale === 'de' ? 'Diana kontaktieren' : 'Contact Diana'}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions + Input */}
      {messages.length <= 1 && (
        <QuickActions onSelect={sendMessage} locale={locale} />
      )}
      <ChatInput
        ref={chatInputRef}
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={inputPlaceholder}
      />
    </div>
  );
}
