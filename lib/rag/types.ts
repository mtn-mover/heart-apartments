export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  showWhatsApp?: boolean;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  conversationHistory: Message[];
  locale: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  confidence: number;
  suggestWhatsApp: boolean;
}

export interface DocumentChunk {
  content: string;
  source: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalResult {
  chunks: DocumentChunk[];
  confidence: number;
}
