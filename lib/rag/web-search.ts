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

// Keywords that indicate a need for real-time/current information
const REALTIME_KEYWORDS = [
  // Opening hours / availability
  'offen', 'geöffnet', 'öffnungszeiten', 'open', 'opening hours', 'closed', 'geschlossen',
  'ouvert', 'fermé', 'horaires', 'saison', 'season', 'betrieb',
  // Weather
  'wetter', 'weather', 'météo', 'regen', 'rain', 'schnee', 'snow', 'temperatur',
  // Transport / schedules
  'fahrplan', 'zug', 'bus', 'train', 'schedule', 'timetable', 'abfahrt', 'departure',
  'horaire', 'prochain', 'nächster', 'next', 'wie komme ich', 'how to get', 'how do i get',
  'comment aller', 'anreise', 'hinfahrt',
  // Events
  'event', 'veranstaltung', 'festival', 'konzert', 'concert', 'heute', 'today', 'morgen',
  'tomorrow', 'diese woche', 'this week', 'cette semaine', 'aktuell', 'current',
  // Prices (can change)
  'preis', 'kosten', 'price', 'cost', 'prix', 'ticket', 'eintritt', 'entry',
];

// Destinations/attractions that guests commonly ask about
// Include common typos, partial words, and variations to catch more queries
const INTERLAKEN_ATTRACTIONS = [
  // Jungfraujoch (many spelling variations and typos)
  'jungfraujoch', 'jungfrau', 'jungrau', 'jungfraubahn', 'top of europe',
  // Schynige Platte (many spelling variations and typos)
  'schynige', 'schinige', 'swchinige',
  // Other mountains
  'schilthorn', 'piz gloria', 'harder kulm', 'harder', 'niederhorn', 'niesen',
  'grindelwald first', 'first bahn', 'männlichen', 'mannlichen', 'kleine scheidegg',
  // Waterfalls and gorges
  'trümmelbach', 'trummelbach', 'aareschlucht', 'aare schlucht',
  // Caves and lakes
  'beatushöhlen', 'beatus', 'blausee', 'oeschinensee', 'brienzersee', 'thunersee',
  // Activities
  'paragliding', 'gleitschirm', 'skywings', 'tandemflug',
  // General activity keywords that suggest wanting to do something
  'bergbahn', 'seilbahn', 'gondel', 'ausflug', 'wandern', 'wanderung', 'besichtigen',
];

export interface WebSearchResult {
  query: string;
  results: string;
  sources: string[];
}

/**
 * Check if the message requires real-time information from the web
 */
export function needsWebSearch(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Check if asking about attractions - ALWAYS search to check availability!
  const asksAboutAttraction = INTERLAKEN_ATTRACTIONS.some((attraction) =>
    lowerMessage.includes(attraction)
  );

  // If asking about ANY attraction, always do web search to check if it's open/available
  if (asksAboutAttraction) {
    return true;
  }

  // Also search for general real-time questions (weather, schedules without specific attraction)
  const generalRealtimeQuestions = [
    'wetter', 'weather', 'météo',
    'fahrplan', 'schedule', 'timetable',
    'heute', 'today', 'morgen', 'tomorrow',
  ];

  return generalRealtimeQuestions.some((q) => lowerMessage.includes(q));
}

/**
 * Perform a web search using Tavily API
 */
export async function searchWeb(query: string, language: string): Promise<WebSearchResult | null> {
  try {
    const client = getTavilyClient();

    // Add location context AND availability keywords to the query
    // This ensures we get current opening status, not just general info
    const enhancedQuery = `${query} Interlaken Schweiz öffnungszeiten aktuell geöffnet 2025`;

    const response = await client.search(enhancedQuery, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
    });

    if (!response.results || response.results.length === 0) {
      return null;
    }

    // Format results for the LLM
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

/**
 * Build a context string from web search results
 */
export function buildWebSearchContext(searchResult: WebSearchResult, language: string): string {
  return `
## CRITICAL: REAL-TIME WEB SEARCH RESULTS - YOU MUST USE THIS!

The following information was just retrieved from the internet (January 2025) and is CURRENT.

**Live Search Results:**
${searchResult.results}

**Sources:** ${searchResult.sources.slice(0, 2).join(', ')}

## YOUR RESPONSE MUST:
1. **START with availability status** - First sentence must clearly state if the attraction is OPEN or CLOSED right now
   - Example: "✅ Das Jungfraujoch ist aktuell geöffnet!" or "⚠️ Die Schynige Platte hat Winterpause (bis Mai)."
2. **Include specific info** from the search results (opening hours, prices, conditions)
3. **THEN add** Diana's tips from the knowledge base
4. Do NOT just give links - give the actual information!

If the search results don't clearly indicate availability, say so honestly.
`;
}
