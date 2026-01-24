'use client';

import type { Message } from '@/lib/rag/types';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-2.5
          ${isUser
            ? 'bg-[#E57373] text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }
        `}
      >
        {/* Render markdown-like content */}
        <div className="text-sm whitespace-pre-wrap">
          {message.content.split('\n').map((line, i) => {
            // Bold text
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <p key={i} className="font-semibold">
                  {line.slice(2, -2)}
                </p>
              );
            }
            // Bullet points
            if (line.startsWith('• ') || line.startsWith('- ')) {
              return (
                <p key={i} className="ml-2">
                  {line}
                </p>
              );
            }
            // Empty line
            if (line.trim() === '') {
              return <br key={i} />;
            }
            // Regular text
            return <p key={i}>{line}</p>;
          })}
        </div>

        {/* Timestamp */}
        <div
          className={`
            text-[10px] mt-1
            ${isUser ? 'text-white/70' : 'text-gray-400'}
          `}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
