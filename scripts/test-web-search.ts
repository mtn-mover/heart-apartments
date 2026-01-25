/**
 * Test script for web search functionality
 * Usage: npx tsx scripts/test-web-search.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { needsWebSearch, searchWeb, buildWebSearchContext } from '../lib/rag/web-search';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const testQueries = [
  'Ist die Schynige Platte offen?',
  'Wann fährt der nächste Zug nach Grindelwald?',
  'Wie ist das Wetter morgen in Interlaken?',
  'Was sind die Öffnungszeiten vom Jungfraujoch?',
  'Wie ist das WLAN Passwort?', // Should NOT trigger web search
  'Wo kann ich Wäsche waschen?', // Should NOT trigger web search
];

async function main() {
  console.log('🔍 WEB SEARCH TEST\n');

  if (!process.env.TAVILY_API_KEY) {
    console.error('❌ TAVILY_API_KEY not set!');
    process.exit(1);
  }

  console.log('✅ TAVILY_API_KEY found\n');

  for (const query of testQueries) {
    console.log('='.repeat(60));
    console.log(`Query: "${query}"`);
    console.log(`Needs web search: ${needsWebSearch(query) ? 'YES' : 'NO'}`);

    if (needsWebSearch(query)) {
      try {
        console.log('Searching...');
        const result = await searchWeb(query, 'de');
        if (result) {
          console.log(`\nResults:\n${result.results.substring(0, 500)}...`);
          console.log(`\nSources: ${result.sources.join(', ')}`);
        } else {
          console.log('No results found');
        }
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }
    console.log();
  }

  console.log('✅ Test complete');
}

main().catch(console.error);
