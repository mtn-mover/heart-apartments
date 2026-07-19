import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSql } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { retrieveContext, shouldSuggestDiana, shouldSuggestBooking } from '@/lib/rag/retrieval';
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
    // Every request costs OpenAI + Anthropic (+ possibly Tavily) calls —
    // bound it per IP. 30 messages per 15 min is far above real guest usage.
    if (!(await rateLimit('chat', request, 30, 900))) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body: ChatRequest = await request.json();
    const { sessionId, locale } = body;

    // Guardrails against an unauthenticated cost/abuse vector: cap the message
    // length and the client-supplied history so a single request can't drive
    // an unbounded number/size of LLM + search calls.
    const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : '';
    if (!message.trim()) {
      return NextResponse.json({ error: 'empty_message' }, { status: 400 });
    }
    const conversationHistory = (Array.isArray(body.conversationHistory) ? body.conversationHistory : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-10)
      .map((m) => ({ role: m.role, content: String(m.content ?? '').slice(0, 2000) }));

    // Create or get session
    let currentSessionId = sessionId;
    let knownApartment: string | null = null;

    const sql = getSql();
    if (!currentSessionId) {
      // Create new session
      try {
        const rows = await sql`insert into chat_sessions (locale) values (${locale}) returning id`;
        currentSessionId = rows[0]?.id as string | undefined;
      } catch (sessionError) {
        console.error('Error creating session:', sessionError);
      }
    } else {
      // Load existing session to get apartment
      try {
        const rows = await sql`select apartment from chat_sessions where id = ${currentSessionId}`;
        if (rows[0]?.apartment) {
          knownApartment = rows[0].apartment as string;
        }
      } catch (sessionError) {
        console.error('Error loading session:', sessionError);
      }
    }

    // Check if user is telling us their apartment in this message
    const detectedApartment = detectApartment(message);
    if (detectedApartment && !knownApartment) {
      knownApartment = detectedApartment;

      // Save apartment to session
      if (currentSessionId) {
        await sql`update chat_sessions set apartment = ${knownApartment} where id = ${currentSessionId}`.catch(
          (err) => console.error('Error saving apartment:', err)
        );
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

    // Conversation history is already capped to the last 10 (see top of handler)
    for (const msg of conversationHistory) {
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
      // Intent to visit (triggers search for availability)
      'will auf', 'möchte auf', 'will nach', 'möchte nach', 'gehen nach',
      'fahren nach', 'besuchen', 'besichtigen', 'ausflug', 'excursion',
      'wandern', 'hike', 'hiking', 'randonnée',
      // Attractions (always check availability) - including common misspellings
      'jungfrau', 'jungfraujoch', 'schynige', 'shynige', 'harder', 'hardergrat',
      'first', 'grindelwald', 'lauterbrunnen', 'mürren', 'murren', 'wengen',
      'brienz', 'thun', 'niesen', 'niederhorn', 'stockhorn', 'beatenberg',
      'st\\.? beatus', 'beatushöhle', 'trümmelbach', 'truemmelbach',
      'paragliding', 'gleitschirm', 'skywalk', 'skywings',
      'platte', 'kulm', 'joch',
    ].join('|'), 'i').test(lowerMessage);

    const toolChoiceConfig = needsWebSearch
      ? { type: 'tool' as const, name: 'search_web' }
      : { type: 'auto' as const };

    // First call to Claude with the search_web tool available
    // For queries that clearly need real-time info, require tool use
    let response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools: [WEB_SEARCH_TOOL],
      tool_choice: toolChoiceConfig,
      messages,
    });

    // Handle tool use - Claude may want to search the web.
    // IMPORTANT: Claude can request SEVERAL searches in one turn (parallel
    // tool use). Every tool_use id needs a matching tool_result, otherwise
    // the follow-up request is rejected with a 400.
    let toolRounds = 0;
    while (response.stop_reason === 'tool_use' && toolRounds < 3) {
      toolRounds++;
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );
      if (toolUseBlocks.length === 0) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUseBlock of toolUseBlocks) {
        let toolResult = 'No results found for this search query.';
        if (toolUseBlock.name === 'search_web') {
          const searchQuery = (toolUseBlock.input as { query: string }).query;
          // A failing search must degrade the answer, never crash the chat
          const searchResult = await searchWeb(searchQuery, detectedLanguage).catch((err) => {
            console.error('search_web failed:', err);
            return null;
          });
          if (searchResult) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
            toolResult = `Web search results (${dateStr}):\n\n${searchResult.results}\n\nSources: ${searchResult.sources.slice(0, 2).join(', ')}`;
          }
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: toolResult,
        });
      }

      // Continue the conversation with one result per tool call
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Call Claude again with the search results
      response = await getAnthropic().messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [WEB_SEARCH_TOOL],
        messages,
      });
    }

    // If the round cap was hit while Claude still wanted to search, its last
    // reply has only tool_use blocks (no text). Answer those tool calls and do
    // one final call WITHOUT tools so we always return a real text message.
    if (response.stop_reason === 'tool_use') {
      const pending = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: pending.map((b) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: 'No further searches available — please answer with what you have.',
        })),
      });
      // tools must stay declared (the history contains tool blocks);
      // tool_choice 'none' forces a plain text answer.
      response = await getAnthropic().messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [WEB_SEARCH_TOOL],
        tool_choice: { type: 'none' },
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
    const suggestBookingButton = shouldSuggestBooking(message, assistantResponse);
    const finalResponse = assistantResponse;

    // Save messages to chat history (best effort — never fail the response)
    if (currentSessionId) {
      await sql`
        insert into chat_messages (session_id, role, content)
        values (${currentSessionId}, 'user', ${message}),
               (${currentSessionId}, 'assistant', ${finalResponse})
      `.catch((err) => console.error('Error saving chat history:', err));
    }

    const chatResponse: ChatResponse = {
      response: finalResponse,
      sessionId: currentSessionId || '',
      confidence,
      suggestContactButton,
      suggestBookingButton,
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
