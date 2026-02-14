import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { retrieveContext, shouldSuggestDiana } from '@/lib/rag/retrieval';
import { buildSystemPrompt } from '@/lib/rag/prompts';
import { searchWeb } from '@/lib/rag/web-search';
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

// Define the web search tool for Claude
const WEB_SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_web',
  description: `Search the internet for real-time information. Use this tool when you need:
- Current weather forecasts
- Opening hours or availability of attractions (Jungfraujoch, Schynige Platte, etc.)
- Train/bus schedules
- Current events or prices
- Any information that might have changed recently

Do NOT use this tool for:
- WiFi passwords or apartment-specific info (you have this in your knowledge)
- Check-in/check-out times (you know this)
- Diana's contact info (you know this)`,
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query in German or English. Be specific about location (Interlaken) and what info you need.',
      },
    },
    required: ['query'],
  },
};

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

    // Build system prompt with RAG context
    const systemPrompt = buildSystemPrompt(detectedLanguage, chunks, confidence, knownApartment);

    // Build messages array for Claude
    const messages: Anthropic.MessageParam[] = [];

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

    // Check if this is a query that likely needs web search (real-time info)
    const lowerMessage = message.toLowerCase();
    const needsWebSearch = new RegExp([
      // Weather
      'wetter', 'weather', 'météo', 'meteo', 'regen', 'rain', 'schnee', 'snow', 'sonne', 'sun',
      // Time/dates
      'heute', 'today', "aujourd'hui", 'morgen', 'tomorrow', 'demain',
      'wochenende', 'weekend', 'diese woche', 'this week', 'cette semaine',
      // Opening hours / availability
      'öffnungszeit', 'opening', 'geöffnet', 'offen', 'open', 'ouvert',
      'geschlossen', 'closed', 'fermé', 'winterpause', 'saison',
      // Prices
      'preis', 'price', 'prix', 'kosten', 'cost', 'coût', 'ticket', 'eintritt',
      // Current info
      'aktuell', 'current', 'actuel', 'jetzt', 'now', 'maintenant',
      // Events / activities
      'event', 'veranstaltung', 'événement', 'fahrplan', 'schedule', 'horaire',
      'zug', 'train', 'bus', 'schiff', 'boat', 'seilbahn', 'cable car',
      // Attractions (always check availability)
      'jungfrau', 'schynige', 'harder', 'first', 'grindelwald', 'lauterbrunnen',
      'paragliding', 'gleitschirm',
    ].join('|'), 'i').test(lowerMessage);

    const toolChoiceConfig = needsWebSearch
      ? { type: 'tool' as const, name: 'search_web' }
      : { type: 'auto' as const };

    // First call to Claude with the search_web tool available
    // For queries that clearly need real-time info, require tool use
    let response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: [WEB_SEARCH_TOOL],
      tool_choice: toolChoiceConfig,
      messages,
    });

    // Handle tool use - Claude may want to search the web
    while (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (!toolUseBlock || toolUseBlock.name !== 'search_web') {
        break;
      }

      // Execute the web search
      const searchQuery = (toolUseBlock.input as { query: string }).query;
      const searchResult = await searchWeb(searchQuery, detectedLanguage);

      let toolResult: string;
      if (searchResult) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
        toolResult = `Web search results (${dateStr}):\n\n${searchResult.results}\n\nSources: ${searchResult.sources.slice(0, 2).join(', ')}`;
      } else {
        toolResult = 'No results found for this search query.';
      }

      // Continue the conversation with the tool result
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: toolResult,
          },
        ],
      });

      // Call Claude again with the search results
      response = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [WEB_SEARCH_TOOL],
        messages,
      });
    }

    // Extract text response
    const assistantResponse = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Check if we should suggest contacting Diana
    // The bot already mentions Diana in its response, so we just show the button
    const suggestContactButton = shouldSuggestDiana(confidence, message, assistantResponse);
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
      suggestContactButton,
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
