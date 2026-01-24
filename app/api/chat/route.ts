import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { retrieveContext, shouldSuggestDiana } from '@/lib/rag/retrieval';
import { buildSystemPrompt, getDianaContactMessage } from '@/lib/rag/prompts';
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
    if (!currentSessionId) {
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
    }

    // Detect language from message
    const detectedLanguage = detectLanguage(message);

    // Retrieve relevant context from RAG
    const { chunks, confidence } = await retrieveContext(message);

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(detectedLanguage, chunks, confidence);

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
    const suggestWhatsApp = shouldSuggestDiana(confidence, message, assistantResponse);

    // If suggesting WhatsApp, append the contact message
    let finalResponse = assistantResponse;
    if (suggestWhatsApp) {
      finalResponse += '\n\n' + getDianaContactMessage(detectedLanguage);
    }

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
