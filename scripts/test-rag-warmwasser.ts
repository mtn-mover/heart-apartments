/**
 * Test RAG retrieval for warm water / boiler info
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { retrieveContext } from '../lib/rag/retrieval';

async function test() {
  console.log('Testing RAG for: warmwasser boiler manuell starten\n');

  const result = await retrieveContext('wie startet man den boiler manuell warmwasser');

  console.log('Confidence:', result.confidence);
  console.log('Chunks found:', result.chunks.length);

  if (result.chunks.length === 0) {
    console.log('\n❌ NO CHUNKS FOUND - RAG might not be working!');
  } else {
    result.chunks.forEach((c, i) => {
      console.log('\n--- Chunk', i + 1, '---');
      console.log('Source:', c.source);
      console.log('Content preview:', c.content.substring(0, 500));
    });
  }
}

test().catch(console.error);
