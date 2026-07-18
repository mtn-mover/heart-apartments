# Little Heart Guesthouse - Projektstand

## Projektübersicht
- **Name:** Little Heart Guesthouse (früher: Opal Heart Guesthouse)
- **Typ:** Next.js 16 Website für Ferienwohnungen in Interlaken, Schweiz
- **Host:** Diana (Airbnb Superhost seit 2016)
- **URL:** Vercel Auto-Deployment via GitHub

## Tech Stack
- **Framework:** Next.js 16.1.1 mit App Router
- **Styling:** Tailwind CSS 4 (Config via `@theme inline` in globals.css)
- **Internationalisierung:** next-intl (Deutsch/Englisch)
- **Sprache:** TypeScript
- **Fonts:** Inter, Playfair Display, Sacramento (via next/font)
- **Deployment:** Vercel (auto-deploy bei git push)

## Farbschema (Heart-Palette)
- `heart-coral` - Primary CTA/Accent (#E57373)
- `heart-sage` - Secondary/Nature (#8B9D83)
- `heart-gold` - Accent/Highlight (#D4A574)
- `heart-charcoal` - Text/Dark (#2C3E50)
- `heart-cream` - Background/Light (#FAF9F6)

## Wichtige Dateien
- `/app/globals.css` - Tailwind 4 Farbkonfiguration
- `/app/[locale]/layout.tsx` - Layout mit Fonts und Metadata
- `/app/[locale]/page.tsx` - Hauptseite
- `/app/[locale]/about/page.tsx` - Über uns / Diana
- `/app/[locale]/apartments/page.tsx` - Apartments-Übersicht
- `/messages/en.json` & `/messages/de.json` - Übersetzungen
- `/components/Logo.tsx` - Logo-Komponente
- `/public/logo/` - Logo-Dateien

## Aktuelle Seitenstruktur

### Hauptseite (/)
- Hero mit Bild (`/hero_little_heard.png`)
- Willkommen/Philosophie Sektion
- "Ihr Tor zu den Schweizer Alpen" (Interlaken Info)
- "Why Little Heart?" Features (5 Punkte)
- Reviews Sektion
- **Keine Apartment-Liste** (nur auf Apartments-Unterseite)

### About-Seite (/about)
- Hero mit Titel
- Diana/Host Vorstellung (prominenter erster Abschnitt)
- Our Story
- Values (4 Werte)
- Swiss Quality Standards (5 Punkte)
- Awards
- CTA zu Apartments

### Apartments-Seite (/apartments)
- Zeigt alle 5 Apartments
- ApartmentCard Komponenten

## Assets
- **Logo:** `/public/logo/little-heart-logo.png` (transparent PNG)
- **Favicon:** `/public/logo/little-heart-icon.jpg`
- **Hero:** `/public/hero_little_heard.png`
- **Apartment-Bilder:** `/public/images/heart1-5/`

## Offene Punkte / TODO
- [x] Diana's echtes Foto hinzugefügt (März 2026)
- [x] Bilder komprimiert + Lazy Loading (März 2026)
- [ ] **Direktbuchung Go-Live** — siehe Abschnitt "Direktbuchung" unten (Branch `direktbuchung`)

## Letzte Änderungen (Stand: Januar 2025)
1. Komplettes Rebranding von "Opal Heart" zu "Little Heart"
2. Neues Farbschema implementiert
3. Neues Logo und Hero-Bild integriert
4. Seitenstruktur reorganisiert:
   - Hauptseite: Fokus auf Guesthouse-Philosophie
   - About: Fokus auf Host Diana
   - Apartments: Alle 5 Wohnungen

## RAG-Chatbot "Diana's Assistent"

### Architektur
- **LLM:** Claude Sonnet (claude-sonnet-4-20250514)
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector-DB:** Supabase pgvector (Similarity Threshold: 0.3)
- **Web-Suche:** Tavily API (für aktuelle Infos)
- **Kontakt-Fallback:** Airbnb-Messenger-Button (Twilio/WhatsApp wurde entfernt)
- **Sprachen:** Automatische Erkennung (DE/EN/FR)

### Wichtige Dateien
| Datei | Zweck |
|-------|-------|
| `/lib/rag/prompts.ts` | System-Prompt, kritische Infos, Begrüßung |
| `/lib/rag/retrieval.ts` | RAG-Suche, Diana-Trigger Keywords |
| `/lib/rag/web-search.ts` | Tavily Web-Suche für aktuelle Infos |
| `/lib/rag/types.ts` | TypeScript Interfaces |
| `/app/api/chat/route.ts` | Chat-API, Spracherkennung |
| `/components/chat/` | Chat-UI Komponenten |
| `/scripts/ingest-documents.ts` | Dokumente in Supabase laden |
| `/scripts/test-chat.ts` | Chatbot-Tests |
| `/Bot_Info/*.docx` | Quelldokumente für RAG |

### Environment Variables (.env.local)
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
TAVILY_API_KEY=tvly-...
# Direktbuchung (siehe Abschnitt unten)
NEXT_PUBLIC_SITE_URL=...
SMOOBU_MOCK=1  # lokal; prod: SMOOBU_API_KEY + SMOOBU_WEBHOOK_SECRET
STRIPE_SECRET_KEY=... / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=... / STRIPE_WEBHOOK_SECRET=...
RESEND_API_KEY=... / BOOKING_FROM_EMAIL=... / BOOKING_NOTIFY_EMAIL=...
```

### Web-Suche (Tavily)
Bot sucht automatisch im Web bei Fragen über:
- **Öffnungszeiten:** "Ist die Schynige Platte offen?"
- **Wetter:** "Wie ist das Wetter morgen?"
- **Fahrpläne:** "Wann fährt der nächste Zug nach Grindelwald?"
- **Events:** "Was gibt es diese Woche in Interlaken?"

**Datei:** `/lib/rag/web-search.ts`

Keywords die Web-Suche auslösen:
```
offen, geöffnet, öffnungszeiten, wetter, fahrplan, zug, train, schedule
```

Test: `npx tsx scripts/test-web-search.ts`

---

## Chatbot Anpassungen

### 1. Kritische Apartment-Infos ändern
**Datei:** `/lib/rag/prompts.ts` → `buildSystemPrompt()`

Aktuelle Konfiguration:
```
WiFi Passwords:
- HEART1-4: Network "Diana", Password: Air38Dia04BnB
- HEART5: Network "Diana", Password: Air38Dia18BnB

Washing Machine:
- HEART1-4: YES (shared, ground floor)
- HEART5: NO → "wash & go" Postgasse 18

Check-in: 16:00 | Check-out: 10:00
Late arrival: Schlüsselbox, Code bei Diana anfragen
```

### 2. Begrüßungsnachricht ändern
**Datei:** `/lib/rag/prompts.ts` → `getWelcomeMessage()`

Verfügbare Sprachen: `de`, `en`, `fr`

### 3. Kontakt-/Buchungs-Buttons im Chat
**Datei:** `/lib/rag/retrieval.ts`
- `shouldSuggestDiana()` prüft die BOT-ANTWORT auf Phrasen ("kontaktiere diana", Schaden/Problem) → Airbnb-Messenger-Button
- `shouldSuggestBooking()` prüft User-Frage + Antwort auf Buchungs-Intent → Button "Verfügbarkeit prüfen & buchen" (→ /apartments)

**Alte Diana-Keywords** (historisch):
```
booking, buchung, reservation, payment, zahlung, refund,
cancel, stornierung, special request, problem, complaint,
early check-in, late checkout, price, discount, änderung
```

**Greeting-Patterns** (kein Button):
```
hallo, hello, hi, hey, guten tag, danke, thank, merci, bye
```

### 5. RAG-Dokumente aktualisieren
```sh
# 1. Word-Docs in Bot_Info/ ändern
# 2. Script ausführen:
npx tsx scripts/ingest-documents.ts
```

**Aktuell geladene Dokumente:**
- `Wohnungsinfo heart 1-4.docx` (22 Chunks)
- `Wohnungsinfo Heart 5.docx` (21 Chunks)
- `heart 4 elektrische Heizung...docx` (1 Chunk)
- `Diverse Links.docx` (1 Chunk)
- + 5 Apartments aus `/data/apartments.ts`

### 6. Neue Sprache hinzufügen
1. `/lib/rag/prompts.ts` → Messages-Objekte erweitern
3. `/app/api/chat/route.ts` → `detectLanguage()` erweitern

### 7. Chatbot testen
```sh
npx tsx scripts/test-chat.ts
```
Testet: WiFi, Waschmaschine, Heizung, Check-in, lokale Tipps

### 8. Bot-Regeln (System-Prompt)
- **HEART5 ist an einem ANDEREN ORT als HEART1-4!**
- Fragt IMMER zuerst nach Wohnung bei: Lage, Ausstattung, Parken, Wegbeschreibung, WiFi, Waschmaschine, Heizung, Küche, Bad, etc.
- Verwendet nur Infos aus dem richtigen Dokument:
  - HEART1-4 → "Wohnungsinfo heart 1-4.docx"
  - HEART5 → "Wohnungsinfo Heart 5.docx"
- Allgemeine Fragen (Tipps, Check-in Zeit) werden ohne Wohnungsfrage beantwortet
- Zeigt KEINE Telefonnummern/Kontaktdaten (nur Airbnb-Messenger-Button)
- Antwortet in der Sprache des Gastes

---

## Lessons Learned

### RAG + System-Prompt Hybrid
- **RAG allein reicht nicht für kritische Infos** - WiFi-Passwörter und apartment-spezifische Unterschiede wurden nicht zuverlässig gefunden
- **Hybrid-Ansatz:** System-Prompt für kritische Fakten (WiFi, Waschmaschine), RAG für Details (Aktivitäten, Tipps)
- **Similarity Threshold:** 0.7 war zu hoch, 0.3 funktioniert besser für semantische Suche

### Apartment-spezifische Infos
- HEART1-4 vs HEART5 haben unterschiedliche WiFi-Passwörter
- HEART5 hat KEINE Waschmaschine (HEART1-4 schon)
- Bot muss IMMER zuerst nach Wohnung fragen bei solchen Themen

### Testing
- Ohne Test-Script hätten wir falsche Antworten nicht gefunden
- `npx tsx scripts/test-chat.ts` vor jedem Deploy ausführen

### Vercel
- Preview-Deployments sind durch Vercel Auth geschützt
- Lokales Testen mit `npm run dev` oder Test-Script

---

## Commands
```sh
npm run dev      # Development Server starten
npm run build    # Production Build
npm run lint     # Linting
git push         # Deploy via Vercel

# Chatbot
npx tsx scripts/ingest-documents.ts  # Dokumente neu laden
npx tsx scripts/test-chat.ts         # Chatbot testen
```

---

## Direktbuchung (Smoobu + Stripe) — Branch `direktbuchung`

### Konzept
- **Smoobu** = Source of Truth für Kalender + Tagespreise. Diana pflegt beides in der Smoobu-App; Smoobu synct Airbnb + Booking.com in Echtzeit (zertifizierte API). Die Website liest live (kein DB-Spiegel der Verfügbarkeit!).
- **Zahlung:** Stripe. Karten/Wallets mit **manual capture** (belastet erst, wenn Smoobu die Reservierung bestätigt hat); TWINT kann kein manual capture → automatic + Auto-Refund im Fehlpfad.
- **Doppelbuchungs-Schutz strukturell:** Exclusion-Constraint `no_overlap` auf `bookings` (Postgres gist, daterange). Kein check-then-create.
- **Go-Live-Schalter:** `property_config.active` pro Wohnung (false = Website zeigt wie bisher nur Airbnb).
- **Konventionen:** Beträge in Rappen (Integer), Daten als `YYYY-MM-DD`-Strings, Check-out exklusiv.

### Wichtige Dateien
| Datei | Zweck |
|-------|-------|
| `supabase/migrations/20260718000000_booking.sql` | property_config, bookings (no_overlap!), webhook_events |
| `lib/smoobu.ts` / `lib/smoobu-mock.ts` | Smoobu-Client + deterministischer Mock (`SMOOBU_MOCK=1`) |
| `lib/booking/pricing.ts` | `computeQuote()` — EINZIGE Preisberechnung (serverseitig) |
| `lib/booking/service.ts` | Config laden, On-Read-Expiry, Mock-Property-IDs |
| `app/api/booking/*` | availability (CDN-Cache 120s), quote, create, status |
| `app/api/booking/webhooks/stripe/route.ts` | Statusmaschine: authorized → Smoobu → capture/void → Mails |
| `app/api/booking/webhooks/smoobu/route.ts` | Storno-Rückkanal (Token-geschützt) |
| `components/booking/*` | BookingFlow, AvailabilityCalendar (react-day-picker), Checkout |
| `app/[locale]/book/[id]/` | Buchungsseite + Confirmation (Status-Polling, noindex) |
| `lib/email/` | Resend-Mails (ohne RESEND_API_KEY: nur Konsolen-Log) |
| `components/BookingCTA.tsx` | Schaltet selbst um: active → "Direkt buchen −X%", sonst Airbnb |

### Buchungs-Status
`pending_payment` (30 min TTL, On-Read-Expiry) → `processing` (Webhook-Claim) → `confirmed` | `failed` / `expired` / `cancelled` (nur diese drei geben den Zeitraum frei)

### Scripts
```sh
npx tsx scripts/check-booking-schema.ts    # Migration angewendet?
npx tsx scripts/seed-property-config.ts    # 5 Zeilen seeden (idempotent)
npx tsx scripts/test-pricing.ts            # Pricing-Invarianten (pure, 13 Checks)
npx tsx scripts/test-double-booking.ts     # Exclusion-Constraint-Szenarien (braucht DB)
npx tsx scripts/reset-test-bookings.ts --yes  # Test-Buchungen löschen (NUR vor Go-Live)
stripe listen --forward-to localhost:3005/api/booking/webhooks/stripe  # lokale Webhooks
```

### Phasen-Status (Juli 2026)
- [x] Phase 0+1: Kern komplett gebaut, Build grün, Pricing-Tests grün, Migration gegen Postgres 17 verifiziert
- [ ] Migration in Supabase einspielen (SQL Editor) + Seed + test-double-booking
- [ ] Stripe-Testkeys → lokale E2E-Testbuchung (Mock-Smoobu)
- [x] Phase 3: Website-Integration (BookingCTA, Contact, Header-Nav, Chatbot-Buttons)
- [ ] Phase 2: Smoobu echt (Diana-Onboarding: Konto, Airbnb verbinden, Booking.com-Listings, API-Key; dann Auth-Header/Webhook-Format gegen docs.smoobu.com verifizieren — Achtung: Api-Key-Auth wird Sept 2026 von HMAC abgelöst)
- [ ] Phase 4: Härtung + Go-Live (Live-Keys, Resend-Domain DKIM, property_config.active=true erst nur HEART1)
- Offen mit Diana: Kurtaxe-Satz (Seed 3.20), Endreinigung, Rabatt-% (Seed 10), Mindestnächte, AGB/Storno-Text
