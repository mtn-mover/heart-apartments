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
- [ ] Diana's echtes Foto hinzufügen (aktuell Platzhalter 👩)
- [ ] Apartment-Bilder optimieren falls nötig

## Letzte Änderungen (Stand: Januar 2025)
1. Komplettes Rebranding von "Opal Heart" zu "Little Heart"
2. Neues Farbschema implementiert
3. Neues Logo und Hero-Bild integriert
4. Seitenstruktur reorganisiert:
   - Hauptseite: Fokus auf Guesthouse-Philosophie
   - About: Fokus auf Host Diana
   - Apartments: Alle 5 Wohnungen

## Commands
```sh
npm run dev      # Development Server starten
npm run build    # Production Build
npm run lint     # Linting
git push         # Deploy via Vercel
```
