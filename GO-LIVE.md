# Go-Live-Checkliste Direktbuchung

Stand 19.07.2026 — Branch `direktbuchung`. Alles gebaut, reviewed (CodeRabbit +
Security + Stabilität, alle Findings gefixt) und mit Mock-Smoobu durchgetestet.
Die Punkte unten sind die EINZIGEN verbleibenden Schritte bis zur ersten echten
Buchung, in sinnvoller Reihenfolge.

## A. Stripe (Stephan/Diana, ~30 Min)

1. Stripe-Konto auf Diana/ihre Firma (Identitätsprüfung, Bankkonto als Auszahlungsziel)
2. Zahlarten aktivieren: Karten, **TWINT**, Apple Pay, Google Pay
3. **Testmodus**-Keys in `.env.local` eintragen: `STRIPE_SECRET_KEY` (sk_test_…),
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_…)
4. → Claude: lokale E2E-Testbuchung fahren
   (`stripe listen --forward-to localhost:3005/api/booking/webhooks/stripe`,
   Karte 4242…, Decline 4000…9995, 3DS 4000 0025 0000 3155, TWINT-Testmodus)

## B. Smoobu-Onboarding (Diana mit Stephan, ~1–2 h)

1. Smoobu-Konto (Professional), 5 Wohnungen anlegen
2. Airbnb-Konto verbinden (host-initiiert), Booking.com-Listings via Smoobu-Wizard
3. API-Key erzeugen → `SMOOBU_API_KEY` (+ `SMOOBU_WEBHOOK_SECRET` selbst wählen)
4. Webhook in Smoobu eintragen: `https://heartbox-interlaken.ch/api/booking/webhooks/smoobu?token=<SECRET>`
5. `smoobu_property_id` je Wohnung in `property_config` eintragen (Claude)
6. → Claude: Client gegen echte API verifizieren (Auth-Header, Rates-Format,
   Reservation-Felder, Webhook-Payload/`cancellation`-Marker — Kommentare
   `verify against docs.smoobu.com` in lib/smoobu.ts). ⚠️ Api-Key-Auth wird
   ~Sept 2026 durch HMAC abgelöst — bei Einrichtung gleich prüfen.

## C. Resend / E-Mail (Stephan, ~15 Min + DNS)

1. Resend-Konto, Domain `heartbox-interlaken.ch` verifizieren (DKIM/SPF-DNS-Einträge)
2. `RESEND_API_KEY` + `BOOKING_NOTIFY_EMAIL` (Dianas Adresse) setzen
3. → Claude: Test-Mail real auslösen (Log-only-Modus abschalten prüfen)

## D. Inhalte von Diana

- [ ] Bot_Info-Word-Dokumente neu liefern → in `Bot_Info/` legen →
      `npx tsx scripts/ingest-documents.ts`
- [ ] Zahlen bestätigen (in `property_config` pflegen): Kurtaxe
      (Seed 3.20 CHF/Erw./Nacht — **plus Beherbergungsabgabe CHF 1 ab 16 J. prüfen**,
      Quelle interlaken.swiss), Endreinigung je Wohnung, Direktrabatt-% (Seed 10),
      Mindestnächte (Seed 2), Adressen je Wohnung (für Bestätigungsmail)
- [ ] Buchungsbedingungen freigeben: `/booking-terms` ist als ENTWURF live
      (7 Tage kostenlos / danach 1 Nacht / No-Show 100% — Diana muss das
      bestätigen oder ändern; Texte in `messages/*.json` → `bookingTerms`)

## E. Cutover (Claude, ~30 Min)

1. `npx tsx scripts/reset-test-bookings.ts --yes` (Testdaten leeren)
2. Alle Keys aus A–C in Vercel-Prod-Env eintragen; `SMOOBU_MOCK` NICHT setzen
3. Branch `direktbuchung` → master mergen (Booking bleibt unsichtbar solange
   `property_config.active=false`) — Vercel deployt automatisch
4. Alte `SUPABASE_*`-Env-Vars aus Vercel-Prod löschen (ab Merge unbenutzt)
5. Stripe-Webhook-Endpoint im Dashboard anlegen:
   `https://heartbox-interlaken.ch/api/booking/webhooks/stripe`
   Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `payment_intent.canceled` → `STRIPE_WEBHOOK_SECRET`
6. Apple-Pay-Domain-Verifikation im Stripe-Dashboard
7. **Soft-Launch:** `update property_config set active=true where id='heart1'`
8. Echte Erstbuchung (Stephan/Diana, kleiner Zeitraum) → prüfen: Smoobu-Eintrag,
   Airbnb blockt, beide Mails, Stripe-Auszahlung
9. Nach 1–2 sauberen Buchungen: alle fünf Wohnungen aktivieren

## Nette Ergänzungen nach dem Launch (optional)

- Chatbot-Tool `check_availability` (Muster WEB_SEARCH_TOOL in app/api/chat/route.ts)
- Vercel-Firewall-Regeln zusätzlich zum DB-Rate-Limiter
- Online-Storno für Gäste (v1: Diana storniert in Smoobu + refundiert in Stripe)
