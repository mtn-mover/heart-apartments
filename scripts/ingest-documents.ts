/**
 * Document Ingestion Script
 *
 * This script extracts content from Word documents in the Bot_Info folder,
 * creates embeddings using OpenAI, and stores them in Neon Postgres for RAG.
 *
 * Usage: npx tsx scripts/ingest-documents.ts
 *
 * Prerequisites:
 * - Neon database with pgvector (db/migrations/001_chatbot.sql applied)
 * - Environment variables set in .env.local
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const sql = neon(process.env.DATABASE_URL!);

interface DocumentChunk {
  content: string;
  source: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

// A single failed insert must not let the script report success with an
// incomplete RAG corpus — main() checks this and exits nonzero.
let insertFailures = 0;

// Extract text from Word document
async function extractDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Split document into chunks
function chunkDocument(
  content: string,
  source: string,
  chunkSize = 800,
  overlap = 100
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    // Skip very short paragraphs
    if (paragraph.trim().length < 10) {
      continue;
    }

    if ((currentChunk + paragraph).length > chunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        source,
        chunkIndex: chunkIndex++,
        metadata: { type: 'document' },
      });

      // Keep some overlap for context
      const words = currentChunk.split(' ');
      currentChunk = words.slice(-Math.floor(overlap / 5)).join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Add last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      source,
      chunkIndex: chunkIndex++,
      metadata: { type: 'document' },
    });
  }

  return chunks;
}

// Create embedding for text
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Process a single document
async function ingestDocument(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  console.log(`Processing: ${fileName}`);

  const content = await extractDocx(filePath);
  const chunks = chunkDocument(content, fileName);

  // Anchor every chunk to its document: Diana's docs say "W4"/"GG18" while
  // guests ask about "HEART4"/"HEART5" — the filename carries the mapping
  // into the embedding and the prompt context.
  const docLabel = fileName.replace(/\.docx$/i, '');
  for (const chunk of chunks) {
    chunk.content = `[Dokument: ${docLabel}]\n${chunk.content}`;
  }

  console.log(`  Found ${chunks.length} chunks`);

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content);

    try {
      await sql`
        insert into documents (content, source, metadata, embedding)
        values (${chunk.content}, ${chunk.source}, ${JSON.stringify(chunk.metadata)}::jsonb,
                ${JSON.stringify(embedding)}::vector)
      `;
      console.log(`  Inserted chunk ${chunk.chunkIndex}`);
    } catch (error) {
      console.error(`  Error inserting chunk ${chunk.chunkIndex}:`, error);
      insertFailures++;
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// Ingest structured apartment data
async function ingestApartmentData(): Promise<void> {
  console.log('\nProcessing apartment data...');

  // Dynamic import for ES modules
  const { apartments } = await import('../data/apartments');

  for (const apt of apartments) {
    const content = `
Apartment: ${apt.name}
Title: ${apt.en.title}
Description: ${apt.en.description}
Location: ${apt.en.location}
Ideal for: ${apt.en.idealFor}

Specifications:
- Guests: ${apt.specs.guests}
- Bedrooms: ${apt.specs.bedrooms}
- Beds: ${apt.specs.beds}
- Bathrooms: ${apt.specs.baths}

Amenities: ${apt.amenities.join(', ')}

Book on Airbnb: ${apt.airbnbUrl}

---

Apartment: ${apt.name}
Titel: ${apt.de.title}
Beschreibung: ${apt.de.description}
Lage: ${apt.de.location}
Ideal für: ${apt.de.idealFor}
    `.trim();

    const embedding = await createEmbedding(content);

    try {
      await sql`
        insert into documents (content, source, metadata, embedding)
        values (${content}, ${`apartments/${apt.id}`},
                ${JSON.stringify({ type: 'apartment', apartmentId: apt.id })}::jsonb,
                ${JSON.stringify(embedding)}::vector)
      `;
      console.log(`  Inserted: ${apt.id}`);
    } catch (error) {
      console.error(`  Error inserting ${apt.id}:`, error);
      insertFailures++;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// Clear existing documents (optional)
async function clearDocuments(): Promise<void> {
  console.log('Clearing existing documents...');
  try {
    await sql`delete from documents`;
    console.log('Documents cleared.');
  } catch (error) {
    // Abort: continuing after a failed clear would ingest against stale data
    // and create duplicate/inconsistent retrieval results.
    console.error('Error clearing documents:', error);
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  console.log('=== Document Ingestion Script ===\n');

  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set');
    process.exit(1);
  }

  // Clear existing documents
  await clearDocuments();

  // Ingest every .docx in Bot_Info/ (folder is gitignored — the docs contain
  // WiFi passwords etc.). Name files so the apartment mapping is explicit,
  // e.g. "Wohnungsinfo HEART5 (GG18).docx" — the filename is prefixed into
  // every chunk and therefore into embeddings and the prompt context.
  const botInfoDir = path.join(process.cwd(), 'Bot_Info');
  let docFiles: string[] = [];
  try {
    docFiles = (await fs.readdir(botInfoDir)).filter((f) => f.toLowerCase().endsWith('.docx')).sort();
  } catch {
    console.log('  Bot_Info/ not found — ingesting apartment data only.');
  }
  if (docFiles.length === 0) {
    console.log('  No .docx files in Bot_Info/ — ingesting apartment data only.');
  }

  for (const file of docFiles) {
    await ingestDocument(path.join(botInfoDir, file));
  }

  // Ingest apartment data
  await ingestApartmentData();

  if (insertFailures > 0) {
    console.error(`\n❌ ${insertFailures} chunk(s) failed to insert — RAG corpus is incomplete.`);
    process.exit(1);
  }
  console.log('\n=== Ingestion Complete ===');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
