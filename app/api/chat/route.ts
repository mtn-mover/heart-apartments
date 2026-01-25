import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { retrieveContext, shouldSuggestDiana } from '@/lib/rag/retrieval';
import { buildSystemPrompt } from '@/lib/rag/prompts';
import { needsWebSearch, searchWeb, buildWebSearchContext, isWeatherQuery } from '@/lib/rag/web-search';
import type { ChatRequest, ChatResponse } from '@/lib/rag/types';

// Lazy initialization to prevent build-time errors
let anthropicInstance: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicInstance = new Anthropic({ apiKey });
  }
  return anthropicInstance;
}

// Detect apartment from message content
function detectApartment(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Direct mentions of apartment numbers
  if (lowerText.includes('heart 5') || lowerText.includes('heart5') || lowerText.includes('herz 5')) {
    return 'HEART5';
  }
  if (lowerText.includes('heart 4') || lowerText.includes('heart4') || lowerText.includes('herz 4')) {
    return 'HEART4';
  }
  if (lowerText.includes('heart 3') || lowerText.includes('heart3') || lowerText.includes('herz 3')) {
    return 'HEART3';
  }
  if (lowerText.includes('heart 2') || lowerText.includes('heart2') || lowerText.includes('herz 2')) {
    return 'HEART2';
  }
  if (lowerText.includes('heart 1') || lowerText.includes('heart1') || lowerText.includes('herz 1')) {
    return 'HEART1';
  }

  // Shorthand references (just the number in context)
  const numberMatch = lowerText.match(/\b(apartment|wohnung|zimmer|room)\s*(nummer|number|nr\.?)?\s*([1-5])\b/i);
  if (numberMatch) {
    return `HEART${numberMatch[3]}`;
  }

  // Just a number as a response to "which apartment?"
  const justNumber = lowerText.match(/^\s*([1-5])\s*$/);
  if (justNumber) {
    return `HEART${justNumber[1]}`;
  }

  return null;
}

// Detect language from message content
function detectLanguage(text: string): string {
  const germanIndicators = [
    'ich', 'und', 'der', 'die', 'das', 'ist', 'ein', 'eine', 'für', 'mit',
    'wie', 'kann', 'bitte', 'meine', 'mein', 'hallo', 'guten', 'danke',
    'wo', 'wann', 'was', 'wer', 'warum', 'möchte', 'brauche', 'habe',
    'gibt', 'es', 'mir', 'sie', 'ihr', 'uns', 'nicht', 'auch', 'noch',
    'schon', 'hier', 'dort', 'heute', 'morgen', 'abend', 'nacht',
  ];
  const frenchIndicators = [
    'je', 'et', 'le', 'la', 'les', 'est', 'un', 'une', 'pour', 'avec',
    'comment', 'pouvez', 'merci', 'bonjour', 'bonsoir', 'où', 'quand',
    'qui', 'quoi', 'pourquoi', 'mon', 'ma', 'mes', 'votre', 'nous',
  ];

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  const germanMatches = words.filter((w) => germanIndicators.includes(w)).length;
  const frenchMatches = words.filter((w) => frenchIndicators.includes(w)).length;

  // Lower threshold to 1 for better detection of short messages
  if (germanMatches > frenchMatches && germanMatches >= 1) {
    return 'de';
  }
  if (frenchMatches > germanMatches && frenchMatches >= 1) {
    return 'fr';
  }
  return 'en';
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId, conversationHistory, locale } = body;

    // Create or get session
    let currentSessionId = sessionId;
    let knownApartment: string | null = null;

    if (!currentSessionId) {
      // Create new session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ locale })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
      } else {
        currentSessionId = session.id;
      }
    } else {
      // Load existing session to get apartment
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('apartment')
        .eq('id', currentSessionId)
        .single();

      if (session?.apartment) {
        knownApartment = session.apartment;
      }
    }

    // Check if user is telling us their apartment in this message
    const detectedApartment = detectApartment(message);
    if (detectedApartment && !knownApartment) {
      knownApartment = detectedApartment;

      // Save apartment to session
      if (currentSessionId) {
        await supabase
          .from('chat_sessions')
          .update({ apartment: knownApartment })
          .eq('id', currentSessionId);
      }
    }

    // Detect language from message
    const detectedLanguage = detectLanguage(message);

    // Retrieve relevant context from RAG
    const { chunks, confidence } = await retrieveContext(message);

    // Check if we need real-time web search
    let webSearchContext = '';
    const isWeather = isWeatherQuery(message);
    if (needsWebSearch(message)) {
      try {
        const searchResult = await searchWeb(message, detectedLanguage);
        if (searchResult) {
          webSearchContext = buildWebSearchContext(searchResult, detectedLanguage, isWeather);
        }
      } catch (error) {
        console.error('Web search failed:', error);
        // Continue without web search results
      }
    }

    // Build system prompt with context (and web search if available)
    let systemPrompt = buildSystemPrompt(detectedLanguage, chunks, confidence, knownApartment);
    if (webSearchContext) {
      systemPrompt += '\n\n' + webSearchContext;
    }

    // Build messages array for Claude
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude Sonnet
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Extract text response
    const assistantResponse = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Check if we should suggest WhatsApp contact
    // The bot already mentions Diana in its response, so we just show the button
    const suggestWhatsApp = shouldSuggestDiana(confidence, message, assistantResponse);
    const finalResponse = assistantResponse;

    // Save messages to chat history
    if (currentSessionId) {
      // Save user message
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'user',
        content: message,
      });

      // Save assistant message
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: finalResponse,
      });
    }

    const chatResponse: ChatResponse = {
      response: finalResponse,
      sessionId: currentSessionId || '',
      confidence,
      suggestWhatsApp,
      detectedLanguage,
    };

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
