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
  'ouvert', 'fermé', 'horaires',
  // Weather
  'wetter', 'weather', 'météo', 'regen', 'rain', 'schnee', 'snow', 'temperatur',
  // Transport / schedules
  'fahrplan', 'zug', 'bus', 'train', 'schedule', 'timetable', 'abfahrt', 'departure',
  'horaire', 'prochain', 'nächster', 'next',
  // Events
  'event', 'veranstaltung', 'festival', 'konzert', 'concert', 'heute', 'today', 'morgen',
  'tomorrow', 'diese woche', 'this week', 'cette semaine', 'aktuell', 'current',
  // Prices (can change)
  'preis', 'kosten', 'price', 'cost', 'prix', 'ticket', 'eintritt', 'entry',
];

// Destinations/attractions that guests commonly ask about
const INTERLAKEN_ATTRACTIONS = [
  'jungfraujoch', 'schilthorn', 'harder kulm', 'niederhorn', 'niesen',
  'schynige platte', 'grindelwald first', 'männlichen', 'kleine scheidegg',
  'trümmelbachfälle', 'aareschlucht', 'beatushöhlen', 'blausee', 'oeschinensee',
  'brienzersee', 'thunersee', 'paragliding', 'skywings',
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

  // Check for real-time keywords
  const hasRealtimeKeyword = REALTIME_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  // Check if asking about attractions (might need current info)
  const asksAboutAttraction = INTERLAKEN_ATTRACTIONS.some((attraction) =>
    lowerMessage.includes(attraction)
  );

  // Needs web search if has realtime keyword AND mentions an attraction
  // OR if specifically asking about opening times, weather, schedules
  const specificRealtimeQuestions = [
    'offen', 'geöffnet', 'öffnungszeiten', 'open', 'opening',
    'wetter', 'weather', 'météo',
    'fahrplan', 'zug', 'train', 'schedule',
  ];

  const isSpecificRealtimeQuestion = specificRealtimeQuestions.some((q) =>
    lowerMessage.includes(q)
  );

  return (hasRealtimeKeyword && asksAboutAttraction) || isSpecificRealtimeQuestion;
}

/**
 * Perform a web search using Tavily API
 */
export async function searchWeb(query: string, language: string): Promise<WebSearchResult | null> {
  try {
    const client = getTavilyClient();

    // Add location context to the query
    const enhancedQuery = `${query} Interlaken Schweiz Switzerland`;

    const response = await client.search(enhancedQuery, {
      searchDepth: 'basic',
      maxResults: 3,
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
  const intro = {
    de: '## AKTUELLE INFORMATIONEN AUS DEM WEB',
    en: '## CURRENT INFORMATION FROM THE WEB',
    fr: '## INFORMATIONS ACTUELLES DU WEB',
  };

  const note = {
    de: 'Hinweis: Diese Informationen wurden gerade aus dem Internet abgerufen und sind aktuell.',
    en: 'Note: This information was just retrieved from the internet and is current.',
    fr: 'Note: Ces informations viennent d\'être récupérées sur Internet et sont actuelles.',
  };

  return `
${intro[language as keyof typeof intro] || intro.en}
${searchResult.results}

${note[language as keyof typeof note] || note.en}
Sources: ${searchResult.sources.join(', ')}
`;
}
