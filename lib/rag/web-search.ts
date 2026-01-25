import { tavily } from '@tavily/core';

// Lazy initialization to prevent build-time errors
let tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavilyClient() {
  if (!tavilyClient) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY environment variable is not set');
    }
    tavilyClient = tavily({ apiKey });
  }
  return tavilyClient;
}

export interface WebSearchResult {
  query: string;
  results: string;
  sources: string[];
}

/**
 * Perform a web search using Tavily API
 * Claude provides the query directly - no need for keyword enhancement
 */
export async function searchWeb(query: string, language: string): Promise<WebSearchResult | null> {
  try {
    const client = getTavilyClient();

    // Add Interlaken context if not already present
    let enhancedQuery = query;
    if (!query.toLowerCase().includes('interlaken')) {
      enhancedQuery = `${query} Interlaken Schweiz`;
    }

    const response = await client.search(enhancedQuery, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
    });

    if (!response.results || response.results.length === 0) {
      return null;
    }

    // Format results for Claude
    const formattedResults = response.results
      .map((r) => `- ${r.title}: ${r.content}`)
      .join('\n');

    const sources = response.results.map((r) => r.url);

    return {
      query: enhancedQuery,
      results: response.answer || formattedResults,
      sources,
    };
  } catch (error) {
    console.error('Web search error:', error);
    return null;
  }
}
