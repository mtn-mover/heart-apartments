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

// Keywords that should trigger Diana contact (booking/payment issues only)
const DIANA_KEYWORDS = [
  'booking', 'buchung', 'reservation', 'reservierung',
  'payment', 'zahlung', 'bezahlung', 'refund', 'rückerstattung',
  'cancel', 'stornierung', 'stornieren', 'absagen',
  'special request', 'sonderwunsch', 'besondere anfrage',
  'complaint', 'beschwerde', 'reklamation',
  'early check-in', 'früher einchecken', 'late checkout', 'später auschecken',
  'discount', 'rabatt',
  'änderung buchung', 'change booking', 'modify reservation',
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
  const lowerResponse = assistantResponse.toLowerCase();

  // Never suggest Diana for greetings or small talk
  if (isGreetingOrSmallTalk(userMessage)) {
    return false;
  }

  // Booking/payment topics → always Diana (bot cannot handle these)
  if (DIANA_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return true;
  }

  // Check if bot gave a confident, helpful answer
  // Signs of a GOOD answer (don't suggest Diana):
  const goodAnswerSigns = [
    // Bot gave specific instructions
    'schritt', 'step', 'anleitung',
    // Bot gave specific info
    'passwort', 'password', '16:00', '10:00',
    // Bot asked a clarifying question (working on it)
    'in welchem apartment', 'which apartment',
  ];

  if (goodAnswerSigns.some((sign) => lowerResponse.includes(sign))) {
    return false;
  }

  // Signs of UNCERTAINTY in bot's response → suggest Diana
  const uncertainPhrases = [
    "i'm not sure", "ich bin nicht sicher",
    "i don't have", "ich habe keine",
    "keine information", "no information",
    "cannot help", "kann nicht helfen",
    "please contact", "bitte kontaktieren",
    "nicht verfügbar", "not available",
    "weiß ich nicht", "i don't know",
    "leider", "unfortunately",
  ];

  if (uncertainPhrases.some((phrase) => lowerResponse.includes(phrase))) {
    return true;
  }

  // Very low RAG confidence AND short response → probably couldn't help
  if (confidence < 0.25 && assistantResponse.length < 200) {
    return true;
  }

  // Default: bot handled it
  return false;
}
