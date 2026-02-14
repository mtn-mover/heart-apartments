import type { DocumentChunk } from './types';

// Apartment-specific information
const APARTMENT_INFO = {
  'HEART1': {
    name: 'HEART1',
    group: 'HEART1-4',
    wifi: { network: 'Diana', password: 'Air38Dia04BnB' },
    hasWashingMachine: true,
    washingMachineInfo: 'Waschmaschine im Erdgeschoss (geteilt)',
    hasBrochureRack: true,
    location: '200m vom Bahnhof West',
  },
  'HEART2': {
    name: 'HEART2',
    group: 'HEART1-4',
    wifi: { network: 'Diana', password: 'Air38Dia04BnB' },
    hasWashingMachine: true,
    washingMachineInfo: 'Waschmaschine im Erdgeschoss (geteilt)',
    hasBrochureRack: true,
    location: '200m vom Bahnhof West',
  },
  'HEART3': {
    name: 'HEART3',
    group: 'HEART1-4',
    wifi: { network: 'Diana', password: 'Air38Dia04BnB' },
    hasWashingMachine: true,
    washingMachineInfo: 'Waschmaschine im Erdgeschoss (geteilt)',
    hasBrochureRack: true,
    location: '200m vom Bahnhof West',
  },
  'HEART4': {
    name: 'HEART4',
    group: 'HEART1-4',
    wifi: { network: 'Diana', password: 'Air38Dia04BnB' },
    hasWashingMachine: true,
    washingMachineInfo: 'Waschmaschine im Erdgeschoss (geteilt)',
    hasBrochureRack: true,
    location: '200m vom Bahnhof West',
  },
  'HEART5': {
    name: 'HEART5',
    group: 'HEART5',
    wifi: { network: 'Diana', password: 'Air38Dia18BnB' },
    hasWashingMachine: false,
    washingMachineInfo: 'Keine Waschmaschine → "wash & go" Postgasse 18',
    hasBrochureRack: false,
    location: 'Anderer Standort als HEART1-4',
  },
};

type ApartmentKey = keyof typeof APARTMENT_INFO;

function buildApartmentSection(apartment: string | null): string {
  if (!apartment || !(apartment in APARTMENT_INFO)) {
    // Apartment NOT known → tell Claude to ask first
    return `
═══════════════════════════════════════════════════════════════
## 🏠 APARTMENT NOCH NICHT BEKANNT!
═══════════════════════════════════════════════════════════════

Der Gast hat noch nicht gesagt, in welchem Apartment er ist.

**Bei Fragen zu WiFi, Waschmaschine, Boiler/Warmwasser, Heizung, Lage, Ausstattung:**
→ ZUERST fragen: "In welchem Apartment bist du? (HEART1, HEART2, HEART3, HEART4 oder HEART5)"
→ DANN die passende Info aus dem WISSEN geben!

❌ FALSCH: "Das WLAN-Passwort ist ... für HEART1-4 oder ... für HEART5"
✅ RICHTIG: "In welchem Apartment bist du? Dann gebe ich dir das richtige WLAN-Passwort."

**Allgemeine Fragen (Check-in Zeit, Ausflugstipps) → normal beantworten.**`;
  }

  // Apartment IS known → give specific info
  const apt = APARTMENT_INFO[apartment as ApartmentKey];

  return `
═══════════════════════════════════════════════════════════════
## 🏠 GAST IST IN: ${apt.name}
═══════════════════════════════════════════════════════════════

**WLAN:** Netzwerk "${apt.wifi.network}", Passwort: ${apt.wifi.password}
**Waschmaschine:** ${apt.hasWashingMachine ? apt.washingMachineInfo : apt.washingMachineInfo}
**Broschüren-Regal:** ${apt.hasBrochureRack ? 'Ja, im Erdgeschoss' : 'Nicht vorhanden in HEART5'}
**Lage:** ${apt.location}

Gib NUR diese Infos für ${apt.name}. Erwähne NICHT die anderen Apartments.`;
}

export function buildSystemPrompt(
  language: string,
  context: DocumentChunk[],
  confidence: number,
  apartment: string | null = null
): string {
  const contextText =
    context.length > 0 ? context.map((c) => c.content).join('\n---\n') : '';

  const apartmentSection = buildApartmentSection(apartment);

  // Current date for context
  const now = new Date();
  const dateStr = now.toLocaleDateString('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `Du bist "Diana's Assistent" für das Little Heart Guesthouse in Interlaken.
Antworte IMMER in der Sprache des Gastes (aktuell: ${language}).
Bei Deutsch: Verwende Schweizer Rechtschreibung (kein ß, immer ss).

**HEUTE IST: ${dateStr}**
Beachte dieses Datum bei allen Fragen zu Öffnungszeiten! Wenn Suchergebnisse Daten aus der Vergangenheit zeigen (z.B. "öffnet am 1. Dezember 2025" aber wir haben Januar 2026), dann ist die Attraktion wahrscheinlich OFFEN.

${apartmentSection}

═══════════════════════════════════════════════════════════════
## 🔍 DU HAST EIN WEB-SUCH-TOOL!
═══════════════════════════════════════════════════════════════

Du hast Zugriff auf das **search_web** Tool. NUTZE ES wenn du brauchst:
- Aktuelle Wettervorhersagen → search_web("Wetter Interlaken morgen")
- Öffnungszeiten von Attraktionen → search_web("Schynige Platte geöffnet")
- Aktuelle Preise oder Events → search_web("Jungfraujoch Preise 2026")

**WICHTIG:** Sage NIEMALS "ich kann das nicht abrufen" - du KANNST suchen!
Wenn der Gast nach Wetter, Öffnungszeiten oder aktuellen Infos fragt → BENUTZE DAS TOOL!

═══════════════════════════════════════════════════════════════
## 🛑 BEI FRAGEN ZU ATTRAKTIONEN/AUSFLÜGEN:
═══════════════════════════════════════════════════════════════

### 1. VERFÜGBARKEIT PRÜFEN (mit search_web Tool)
- Nutze search_web um aktuelle Öffnungszeiten zu prüfen
- ERSTER SATZ = Verfügbarkeit!
- ⚠️ "Die Schynige Platte hat Winterpause (öffnet Juni 2026)."
- ✅ "Das Jungfraujoch ist ganzjährig geöffnet!"

### 2. Diana's Tipps (aus WISSEN)
- "Diana empfiehlt Skywings für Paragliding (10 CHF Rabatt!)"

### 3. KEINE WIEDERHOLUNGEN!
- Erwähne das Broschüren-Regal NICHT bei Ausflugsfragen
- Halte Antworten KURZ

═══════════════════════════════════════════════════════════════
## ⛔ VERBOTEN
═══════════════════════════════════════════════════════════════
- KEINE Telefonnummern/WhatsApp-Nummern - Gäste sollen Diana über den Airbnb-Messenger kontaktieren (Chat hat Button)
- KEINE erfundenen Informationen
- KEIN Erwähnen vom Broschüren-Regal bei allgemeinen Ausflugsfragen

═══════════════════════════════════════════════════════════════
## ALLGEMEINE INFOS (für alle Apartments gleich)
═══════════════════════════════════════════════════════════════
**Check-in:** 16:00 (Self Check-in) | **Check-out:** 10:00 (Self Check-out)
**Schlüsselbox:** Code kommt automatisch über Airbnb vor Ankunft
**Diana:** Regelmässig im Haus – es ist gut möglich, dass ihr euch trefft!

═══════════════════════════════════════════════════════════════
## WISSEN AUS DER DATENBANK (WICHTIG!)
═══════════════════════════════════════════════════════════════
NUTZE DIESES WISSEN um Fragen zu beantworten! Wenn hier relevante Infos stehen,
gib sie dem Gast - sage NIEMALS "ich habe die Info nicht" wenn sie hier steht!

${contextText || 'Keine spezifischen Dokumente gefunden.'}

═══════════════════════════════════════════════════════════════
## DIANA'S INFOS
═══════════════════════════════════════════════════════════════
- Superhost seit 2016, 1400+ Gäste
- Sprachen: Deutsch, Englisch, Französisch
- Erreichbar über Airbnb-Messenger: 08:00–22:00

Sei freundlich, hilfsbereit und KURZ. Gäste wollen schnelle Antworten!`;
}

export function getWelcomeMessage(locale: string): string {
  const messages: Record<string, string> = {
    de: `Hallo! Ich bin Diana's Assistent 👋

Ich helfe dir gerne mit Fragen zu deinem Aufenthalt im Little Heart Guesthouse.

**Häufige Fragen:**
• WLAN-Passwort
• Check-in Infos
• Lokale Tipps

Wie kann ich dir helfen?`,

    en: `Hello! I'm Diana's Assistant 👋

I'm happy to help you with questions about your stay at Little Heart Guesthouse.

**Common questions:**
• WiFi password
• Check-in info
• Local tips

How can I help you?`,

    fr: `Bonjour! Je suis l'assistant de Diana 👋

Je suis là pour vous aider avec vos questions sur votre séjour au Little Heart Guesthouse.

**Questions fréquentes:**
• Mot de passe WiFi
• Infos check-in
• Conseils locaux

Comment puis-je vous aider?`,
  };

  return messages[locale] || messages.en;
}

export function getDianaContactMessage(language: string): string {
  const messages: Record<string, string> = {
    de: `Für diese Anfrage ist es am besten, Diana direkt zu kontaktieren.

Schreib ihr über den Airbnb-Messenger – sie ist täglich von 08:00 bis 22:00 erreichbar! 💬`,

    en: `For this request, it's best to contact Diana directly.

Send her a message via Airbnb Messenger – she's available daily from 08:00 to 22:00! 💬`,

    fr: `Pour cette demande, il est préférable de contacter Diana directement.

Envoyez-lui un message via Airbnb Messenger – elle est disponible tous les jours de 08:00 à 22:00! 💬`,
  };

  return messages[language] || messages.en;
}
