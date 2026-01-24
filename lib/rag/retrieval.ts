import OpenAI from 'openai';
import { supabase } from '../supabase';
import type { SearchResult } from '../supabase';
import type { RetrievalResult, DocumentChunk } from './types';

// Lazy initialization to prevent build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export async function searchDocuments(
  queryEmbedding: number[],
  matchThreshold = 0.3,
  matchCount = 5
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('Error searching documents:', error);
    return [];
  }

  return data || [];
}

export async function retrieveContext(query: string): Promise<RetrievalResult> {
  const embedding = await createEmbedding(query);
  const results = await searchDocuments(embedding);

  const chunks: DocumentChunk[] = results.map((result) => ({
    content: result.content,
    source: result.source,
    chunkIndex: 0,
    metadata: {},
  }));

  // Calculate average confidence from similarity scores
  const avgSimilarity = results.length > 0
    ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
    : 0;

  return {
    chunks,
    confidence: avgSimilarity,
  };
}

// Keywords that should trigger Diana contact
const DIANA_KEYWORDS = [
  'booking', 'buchung', 'reservation', 'reservierung',
  'payment', 'zahlung', 'bezahlung', 'refund', 'rückerstattung',
  'cancel', 'stornierung', 'stornieren', 'absagen',
  'special request', 'sonderwunsch', 'besondere anfrage',
  'problem', 'issue', 'complaint', 'beschwerde',
  'early check-in', 'früher einchecken', 'late checkout', 'später auschecken',
  'price', 'preis', 'discount', 'rabatt', 'kosten',
  'änderung', 'change', 'modify',
];

// Greetings and small talk - don't suggest Diana for these
const GREETING_PATTERNS = [
  'hallo', 'hello', 'hi', 'hey', 'guten tag', 'guten morgen', 'guten abend',
  'bonjour', 'salut', 'bonsoir',
  'danke', 'thank', 'merci',
  'tschüss', 'bye', 'auf wiedersehen', 'au revoir',
  'wie geht', 'how are', 'comment allez',
];

function isGreetingOrSmallTalk(message: string): boolean {
  const lower = message.toLowerCase().trim();
  // Short messages that are likely greetings
  if (lower.length < 30) {
    return GREETING_PATTERNS.some((pattern) => lower.includes(pattern));
  }
  return false;
}

export function shouldSuggestDiana(
  confidence: number,
  userMessage: string,
  assistantResponse: string
): boolean {
  const lowerMessage = userMessage.toLowerCase();

  // Never suggest Diana for greetings or small talk
  if (isGreetingOrSmallTalk(userMessage)) {
    return false;
  }

  // Check for Diana-specific keywords FIRST (these always need Diana)
  if (DIANA_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return true;
  }

  // Check for uncertainty in response
  const uncertainPhrases = [
    "i'm not sure", "ich bin nicht sicher",
    "i don't have information", "keine information",
    "please contact", "bitte kontaktieren",
    "i cannot", "ich kann nicht",
    "not available", "nicht verfügbar",
  ];

  const lowerResponse = assistantResponse.toLowerCase();
  if (uncertainPhrases.some((phrase) => lowerResponse.includes(phrase))) {
    return true;
  }

  // If we found relevant documents (confidence > 0.3), the bot can answer
  // Only suggest Diana if confidence is very low (indicates poor match)
  // Threshold lowered because good semantic matches can still be 0.3-0.5

  return false;
}
