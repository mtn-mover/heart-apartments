/**
 * Document Ingestion Script
 *
 * This script extracts content from Word documents in the Bot_Info folder,
 * creates embeddings using OpenAI, and stores them in Supabase for RAG.
 *
 * Usage: npx tsx scripts/ingest-documents.ts
 *
 * Prerequisites:
 * - Supabase project with pgvector enabled
 * - Environment variables set in .env.local
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface DocumentChunk {
  content: string;
  source: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

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

  console.log(`  Found ${chunks.length} chunks`);

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content);

    const { error } = await supabase.from('documents').insert({
      content: chunk.content,
      source: chunk.source,
      metadata: chunk.metadata,
      embedding,
    });

    if (error) {
      console.error(`  Error inserting chunk ${chunk.chunkIndex}:`, error.message);
    } else {
      console.log(`  Inserted chunk ${chunk.chunkIndex}`);
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

    const { error } = await supabase.from('documents').insert({
      content,
      source: `apartments/${apt.id}`,
      metadata: { type: 'apartment', apartmentId: apt.id },
      embedding,
    });

    if (error) {
      console.error(`  Error inserting ${apt.id}:`, error.message);
    } else {
      console.log(`  Inserted: ${apt.id}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// Clear existing documents (optional)
async function clearDocuments(): Promise<void> {
  console.log('Clearing existing documents...');
  const { error } = await supabase.from('documents').delete().neq('id', 0);
  if (error) {
    console.error('Error clearing documents:', error.message);
  } else {
    console.log('Documents cleared.');
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY is not set');
    process.exit(1);
  }

  // Clear existing documents
  await clearDocuments();

  // Path to Bot_Info folder
  const botInfoDir = path.join(process.cwd(), 'Bot_Info');

  // Document files to process
  const docFiles = [
    'Wohnungsinfo heart 1-4.docx',
    'Wohnungsinfo Heart 5.docx',
    'heart 4 elektrische Heizung in Bad und kl. Zimmer.docx',
    'Diverse Links.docx',
  ];

  // Process each document
  for (const file of docFiles) {
    const filePath = path.join(botInfoDir, file);
    try {
      await fs.access(filePath);
      await ingestDocument(filePath);
    } catch {
      console.log(`  Skipping (not found): ${file}`);
    }
  }

  // Ingest apartment data
  await ingestApartmentData();

  console.log('\n=== Ingestion Complete ===');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
