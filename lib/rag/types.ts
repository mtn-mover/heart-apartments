export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  showContactButton?: boolean;
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
  suggestContactButton: boolean;
  detectedLanguage: string;
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
