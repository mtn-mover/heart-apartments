/**
 * Test script for chatbot responses
 * Usage: npx tsx scripts/test-chat.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createEmbedding, searchDocuments } from '../lib/rag/retrieval';
import { buildSystemPrompt } from '../lib/rag/prompts';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface TestCase {
  name: string;
  message: string;
  locale: string;
  expectedBehavior: string;
}

const testCases: TestCase[] = [
  {
    name: 'WiFi-Frage (sollte nach Wohnung fragen)',
    message: 'Wie ist das WLAN Passwort?',
    locale: 'de',
    expectedBehavior: 'Sollte zuerst fragen, in welcher Wohnung der Gast ist',
  },
  {
    name: 'WiFi für HEART1',
    message: 'Ich bin in HEART1. Was ist das WLAN Passwort?',
    locale: 'de',
    expectedBehavior: 'Sollte Passwort für HEART1-4 geben: Air38Dia04BnB',
  },
  {
    name: 'WiFi für HEART5',
    message: 'Ich bin in HEART5. Was ist das WLAN Passwort?',
    locale: 'de',
    expectedBehavior: 'Sollte Passwort für HEART5 geben: Air38Dia18BnB',
  },
  {
    name: 'Waschmaschine allgemein',
    message: 'Wo kann ich Wäsche waschen?',
    locale: 'de',
    expectedBehavior: 'Sollte zuerst fragen, in welcher Wohnung der Gast ist',
  },
  {
    name: 'Waschmaschine HEART5',
    message: 'Ich bin in HEART5. Gibt es eine Waschmaschine?',
    locale: 'de',
    expectedBehavior: 'Sollte sagen, dass es keine Waschmaschine gibt und wash & go empfehlen',
  },
  {
    name: 'Heizung HEART4',
    message: 'Ich bin in HEART4. Wie funktioniert die Heizung?',
    locale: 'de',
    expectedBehavior: 'Sollte Info über elektrische Heizung im Bad und kleinen Zimmer geben',
  },
  {
    name: 'Check-in Zeit',
    message: 'Wann ist Check-in?',
    locale: 'de',
    expectedBehavior: 'Sollte 16:00 Uhr nennen',
  },
  {
    name: 'Lokale Tipps',
    message: 'Was kann man in Interlaken machen?',
    locale: 'de',
    expectedBehavior: 'Sollte Aktivitäten/Tipps aus den Dokumenten nennen',
  },
];

async function testChat(testCase: TestCase): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`Nachricht: "${testCase.message}"`);
  console.log(`Erwartetes Verhalten: ${testCase.expectedBehavior}`);
  console.log('-'.repeat(60));

  try {
    // Get embedding and search documents
    const embedding = await createEmbedding(testCase.message);
    const results = await searchDocuments(embedding, 0.3, 5);

    console.log(`\nGefundene Dokumente: ${results.length}`);
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. [${(r.similarity * 100).toFixed(1)}%] ${r.source}`);
      });
    }

    // Build context
    const chunks = results.map((r) => ({
      content: r.content,
      source: r.source,
      chunkIndex: 0,
      metadata: {},
    }));
    const avgSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;

    const systemPrompt = buildSystemPrompt(testCase.locale, chunks, avgSimilarity);

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: testCase.message }],
    });

    const assistantResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    console.log(`\nAntwort:\n${assistantResponse}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error(`Fehler: ${error}`);
  }
}

async function main(): Promise<void> {
  console.log('🤖 CHATBOT TEST SUITE\n');

  // Check environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY fehlt!');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY fehlt!');
    process.exit(1);
  }

  for (const testCase of testCases) {
    await testChat(testCase);
    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Alle Tests abgeschlossen');
}

main().catch(console.error);
