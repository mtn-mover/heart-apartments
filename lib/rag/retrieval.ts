import OpenAI from 'openai';
import { getSql } from '../db';
import type { SearchResult } from '../db';
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
  try {
    const sql = getSql();
    const vec = JSON.stringify(queryEmbedding); // '[0.1,0.2,…]' = pgvector literal
    const rows = await sql`
      select id, content, source,
             1 - (embedding <=> ${vec}::vector) as similarity
      from documents
      where 1 - (embedding <=> ${vec}::vector) > ${matchThreshold}
      order by embedding <=> ${vec}::vector
      limit ${matchCount}
    `;
    return rows as SearchResult[];
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
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
  const lowerResponse = assistantResponse.toLowerCase();

  // Never suggest Diana for greetings or small talk
  if (isGreetingOrSmallTalk(userMessage)) {
    return false;
  }

  // FALLBACK PHRASES - if Diana is mentioned as a fallback, DON'T show button
  // The bot gave a good answer and Diana is just a backup option
  const fallbackPhrases = [
    'falls es', 'if it', 'wenn es', // "Falls es nicht funktioniert..."
    'falls das', 'if that', 'wenn das',
    'ansonsten', 'otherwise', 'sonst',
    'immer noch', 'still', 'weiterhin',
    'sollte das', 'should that',
  ];

  // Check if Diana mention is in a fallback context
  const hasFallbackContext = fallbackPhrases.some((phrase) => {
    const phraseIndex = lowerResponse.indexOf(phrase);
    const dianaIndex = lowerResponse.indexOf('diana');
    // Fallback phrase appears before Diana mention (within 100 chars)
    return phraseIndex !== -1 && dianaIndex !== -1 && phraseIndex < dianaIndex && (dianaIndex - phraseIndex) < 100;
  });

  if (hasFallbackContext) {
    return false; // Bot gave good answer, Diana is just backup
  }

  // PRIMARY DIANA PHRASES - bot is recommending Diana as the main solution
  const primaryDianaPhrases = [
    // German - Diana as main recommendation
    'bitte kontaktiere diana', 'kontaktiere bitte diana',
    'wende dich an diana', 'diana kann dir helfen',
    'diana wird dir helfen', 'am besten diana',
    'diana direkt kontaktieren', 'schreib diana direkt',
    'diana kontaktieren', 'kontaktiere diana',
    'diana informieren', 'informiere diana',
    'diana sollte', 'schreib diana', 'erreiche diana',
    'diana bescheid', 'melde diana', 'sag diana',
    // Damage / problems that need Diana
    'schaden', 'kaputt', 'defekt', 'broken', 'damage',
    'problem', 'issue', 'nicht funktioniert', 'doesn\'t work',
    // Starting the response with Diana suggestion
    'für diese anfrage', 'for this request',
    'dafür ist diana', 'diana ist zuständig',
    // English
    'please contact diana', 'diana can help',
    'diana will help', 'best to contact diana',
    'contact diana', 'reach diana', 'tell diana',
    // French
    'contacte diana', 'diana peut t\'aider',
  ];

  if (primaryDianaPhrases.some((phrase) => lowerResponse.includes(phrase))) {
    return true;
  }

  // Default: bot handled it, no contact needed
  return false;
}

/**
 * Show the "check availability & book" button when the exchange is about a
 * NEW booking (availability, prices, how to book) — the assistant itself has
 * no availability data and always points to the direct-booking pages.
 */
export function shouldSuggestBooking(userMessage: string, assistantResponse: string): boolean {
  const lowerUser = userMessage.toLowerCase();
  const lowerResponse = assistantResponse.toLowerCase();

  const userBookingIntent = [
    // German
    'frei', 'verfügbar', 'verfügbarkeit', 'buchen', 'buchung', 'reservieren',
    'reservation', 'preis', 'kosten', 'was kostet', 'übernachtung',
    // English
    'available', 'availability', 'book', 'booking', 'reserve', 'price', 'cost',
    'how much', 'per night', 'vacancy',
    // French
    'disponible', 'disponibilité', 'réserver', 'réservation', 'prix', 'tarif',
  ];

  const responseBookingPhrases = [
    'direkt buchen', 'buchungsseite', 'direkt auf unserer website',
    'book directly', 'booking page', 'directly on our website',
    'réserver directement', 'sur notre site',
  ];

  return (
    userBookingIntent.some((kw) => lowerUser.includes(kw)) ||
    responseBookingPhrases.some((kw) => lowerResponse.includes(kw))
  );
}
