/**
 * Test script for web search functionality
 * Usage: npx tsx scripts/test-web-search.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { searchWeb } from '../lib/rag/web-search';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const testQueries = [
  'Wetter Interlaken morgen',
  'Schynige Platte Öffnungszeiten',
  'Jungfraujoch aktuell geöffnet',
  'Paragliding Interlaken Preise',
];

async function main() {
  console.log('🔍 WEB SEARCH TEST (Tool Calling Mode)\n');

  if (!process.env.TAVILY_API_KEY) {
    console.error('❌ TAVILY_API_KEY not set!');
    process.exit(1);
  }

  console.log('✅ TAVILY_API_KEY found\n');
  console.log('Now Claude decides when to search - these are example queries:\n');

  for (const query of testQueries) {
    console.log('='.repeat(60));
    console.log(`Query: "${query}"`);

    try {
      console.log('Searching...');
      const result = await searchWeb(query, 'de');
      if (result) {
        console.log(`\nResults:\n${result.results.substring(0, 500)}...`);
        console.log(`\nSources: ${result.sources.slice(0, 2).join(', ')}`);
      } else {
        console.log('No results found');
      }
    } catch (error) {
      console.error(`Error: ${error}`);
    }
    console.log();
  }

  console.log('✅ Test complete');
}

main().catch(console.error);
