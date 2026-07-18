/**
 * Booking emails, de/en by booking.locale (fr guests get en).
 * All money/date content comes from the stored price_breakdown snapshot —
 * the same data the confirmation page renders, so both always match.
 */

import type { BookingRow, PropertyConfig } from '../supabase';
import { getApartmentById } from '@/data/apartments';
import { chf } from '../booking/format';
import { groupNightlyRates } from '../booking/pricing';
import type { OutgoingEmail } from './resend';

const COLORS = {
  coral: '#E57373',
  charcoal: '#2C3E50',
  cream: '#FAF9F6',
};

function lang(locale: string): 'de' | 'en' {
  return locale === 'de' ? 'de' : 'en';
}

function formatDate(dateStr: string, locale: 'de' | 'en'): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(locale === 'de' ? 'de-CH' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function apartmentTitle(booking: BookingRow, locale: 'de' | 'en'): string {
  const apt = getApartmentById(booking.apartment_id);
  return apt ? `${apt.name} — ${apt[locale].title}` : booking.apartment_id.toUpperCase();
}

function breakdownRows(booking: BookingRow, locale: 'de' | 'en'): { label: string; amount: string }[] {
  const b = booking.price_breakdown;
  const t =
    locale === 'de'
      ? {
          nights: (n: number, rate: string) => `${n} ${n === 1 ? 'Nacht' : 'Nächte'} à ${rate}`,
          discount: (pct: number) => `Direktbuchungs-Rabatt (−${pct}%)`,
          cleaning: 'Endreinigung',
          cityTax: (adults: number, nights: number) => `Kurtaxe (${adults} Erw. × ${nights} Nächte)`,
        }
      : {
          nights: (n: number, rate: string) => `${n} ${n === 1 ? 'night' : 'nights'} at ${rate}`,
          discount: (pct: number) => `Direct booking discount (−${pct}%)`,
          cleaning: 'Cleaning fee',
          cityTax: (adults: number, nights: number) => `City tax (${adults} adults × ${nights} nights)`,
        };

  const rows = groupNightlyRates(b.nightlyRates).map((g) => ({
    label: t.nights(g.nights, chf(g.rateRappen)),
    amount: chf(g.subtotalRappen),
  }));
  if (b.discountRappen > 0) {
    rows.push({ label: t.discount(b.discountPct), amount: `−${chf(b.discountRappen)}` });
  }
  if (b.cleaningFeeRappen > 0) {
    rows.push({ label: t.cleaning, amount: chf(b.cleaningFeeRappen) });
  }
  if (b.cityTaxRappen > 0) {
    rows.push({ label: t.cityTax(b.adults, b.nights), amount: chf(b.cityTaxRappen) });
  }
  return rows;
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${COLORS.cream};font-family:Arial,Helvetica,sans-serif;color:${COLORS.charcoal};">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#ffffff;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 4px;font-size:22px;color:${COLORS.coral};">Little Heart Guesthouse</h1>
    <h2 style="margin:0 0 24px;font-size:17px;font-weight:600;">${title}</h2>
    ${bodyHtml}
  </div>
  <p style="text-align:center;font-size:12px;color:#8a8a8a;margin-top:16px;">Little Heart Guesthouse · Interlaken, Switzerland</p>
</div>
</body></html>`;
}

function breakdownTable(booking: BookingRow, locale: 'de' | 'en'): string {
  const totalLabel = locale === 'de' ? 'Total (bezahlt)' : 'Total (paid)';
  const rows = breakdownRows(booking, locale)
    .map(
      (r) =>
        `<tr><td style="padding:6px 0;font-size:14px;">${r.label}</td><td style="padding:6px 0;font-size:14px;text-align:right;white-space:nowrap;">${r.amount}</td></tr>`
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}
<tr><td style="padding:10px 0 0;font-size:15px;font-weight:bold;border-top:1px solid #e5e5e5;">${totalLabel}</td>
<td style="padding:10px 0 0;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #e5e5e5;">${chf(booking.total_rappen)}</td></tr></table>`;
}

export function guestConfirmationEmail(booking: BookingRow, cfg: PropertyConfig): OutgoingEmail {
  const locale = lang(booking.locale);
  const title = apartmentTitle(booking, locale);
  const checkIn = formatDate(booking.check_in, locale);
  const checkOut = formatDate(booking.check_out, locale);

  const t =
    locale === 'de'
      ? {
          subject: `Buchungsbestätigung ${booking.reference} — Little Heart Guesthouse`,
          heading: 'Ihre Buchung ist bestätigt',
          hello: `Liebe/r ${booking.guest_first_name} ${booking.guest_last_name}`,
          intro: `Vielen Dank für Ihre Direktbuchung! Wir freuen uns, Sie in Interlaken willkommen zu heissen.`,
          reference: 'Buchungsreferenz',
          stay: 'Aufenthalt',
          arrival: `Anreise: ${checkIn}, ab ${cfg.checkin_time} Uhr`,
          departure: `Abreise: ${checkOut}, bis ${cfg.checkout_time} Uhr`,
          guests: `Gäste: ${booking.adults} Erwachsene${booking.children ? `, ${booking.children} Kinder` : ''}`,
          address: cfg.address ? `Adresse: ${cfg.address}` : '',
          checkinInfo:
            'Alle Details zum Check-in (Schlüssel, Anfahrt) erhalten Sie von Diana einige Tage vor der Anreise per E-Mail.',
          questions: 'Fragen? Antworten Sie einfach auf diese E-Mail.',
        }
      : {
          subject: `Booking confirmation ${booking.reference} — Little Heart Guesthouse`,
          heading: 'Your booking is confirmed',
          hello: `Dear ${booking.guest_first_name} ${booking.guest_last_name}`,
          intro: `Thank you for booking directly with us! We look forward to welcoming you to Interlaken.`,
          reference: 'Booking reference',
          stay: 'Your stay',
          arrival: `Check-in: ${checkIn}, from ${cfg.checkin_time}`,
          departure: `Check-out: ${checkOut}, until ${cfg.checkout_time}`,
          guests: `Guests: ${booking.adults} adults${booking.children ? `, ${booking.children} children` : ''}`,
          address: cfg.address ? `Address: ${cfg.address}` : '',
          checkinInfo:
            'Diana will email you all check-in details (keys, directions) a few days before your arrival.',
          questions: 'Questions? Just reply to this email.',
        };

  const bodyHtml = `
<p style="font-size:14px;">${t.hello},</p>
<p style="font-size:14px;">${t.intro}</p>
<p style="font-size:14px;margin:20px 0 4px;"><strong>${t.reference}:</strong>
  <span style="font-size:18px;letter-spacing:1px;color:${COLORS.coral};font-weight:bold;">${booking.reference}</span></p>
<p style="font-size:15px;font-weight:600;margin:20px 0 6px;">${title}</p>
<p style="font-size:14px;margin:0;">${t.arrival}<br>${t.departure}<br>${t.guests}${t.address ? `<br>${t.address}` : ''}</p>
${breakdownTable(booking, locale)}
<p style="font-size:13px;">${t.checkinInfo}</p>
<p style="font-size:13px;">${t.questions}</p>`;

  const text = [
    `${t.hello},`,
    t.intro,
    ``,
    `${t.reference}: ${booking.reference}`,
    title,
    t.arrival,
    t.departure,
    t.guests,
    t.address,
    ``,
    ...breakdownRows(booking, locale).map((r) => `${r.label}: ${r.amount}`),
    `Total: ${chf(booking.total_rappen)}`,
    ``,
    t.checkinInfo,
    t.questions,
  ]
    .filter(Boolean)
    .join('\n');

  return { to: booking.guest_email, subject: t.subject, html: layout(t.heading, bodyHtml), text };
}

export function hostNotificationEmail(booking: BookingRow, to: string): OutgoingEmail {
  const title = apartmentTitle(booking, 'de');
  const subject = `Neue Direktbuchung ${booking.reference} — ${getApartmentById(booking.apartment_id)?.name ?? booking.apartment_id}`;
  const lines = [
    `Wohnung: ${title}`,
    `Zeitraum: ${booking.check_in} bis ${booking.check_out} (${booking.price_breakdown.nights} Nächte)`,
    `Gäste: ${booking.adults} Erwachsene, ${booking.children} Kinder`,
    `Gast: ${booking.guest_first_name} ${booking.guest_last_name} · ${booking.guest_email}${booking.guest_phone ? ` · ${booking.guest_phone}` : ''}`,
    booking.guest_message ? `Nachricht: ${booking.guest_message}` : '',
    `Total bezahlt: ${chf(booking.total_rappen)} (via Stripe)`,
    ``,
    `Die Reservierung ist bereits in Smoobu eingetragen (Airbnb/Booking.com werden automatisch geblockt).`,
  ].filter(Boolean);

  const bodyHtml = `<p style="font-size:14px;">${lines.join('<br>')}</p>`;
  return {
    to,
    subject,
    html: layout('Neue Direktbuchung 🎉', bodyHtml),
    text: lines.join('\n'),
  };
}

/** TWINT edge case: payment auto-captured but the dates were gone in Smoobu —
 *  the guest was refunded automatically and needs to hear it clearly. */
export function guestRefundEmail(booking: BookingRow): OutgoingEmail {
  const locale = lang(booking.locale);
  const t =
    locale === 'de'
      ? {
          subject: `Buchung ${booking.reference} leider nicht möglich — Betrag zurückerstattet`,
          heading: 'Buchung nicht möglich — Rückerstattung unterwegs',
          body: `Liebe/r ${booking.guest_first_name}, leider wurde der gewünschte Zeitraum in genau diesem Moment über eine andere Plattform gebucht. Ihre Zahlung von ${chf(booking.total_rappen)} wurde vollständig zurückerstattet (je nach Bank dauert das 2–5 Werktage). Es tut uns sehr leid! Gerne können Sie andere Daten oder eine unserer anderen Wohnungen wählen.`,
        }
      : {
          subject: `Booking ${booking.reference} not possible — payment refunded`,
          heading: 'Booking not possible — refund on its way',
          body: `Dear ${booking.guest_first_name}, unfortunately the selected dates were booked through another platform at that very moment. Your payment of ${chf(booking.total_rappen)} has been fully refunded (this takes 2–5 business days depending on your bank). We are very sorry! You are welcome to choose different dates or one of our other apartments.`,
        };

  return {
    to: booking.guest_email,
    subject: t.subject,
    html: layout(t.heading, `<p style="font-size:14px;">${t.body}</p>`),
    text: t.body,
  };
}

export function hostCancellationEmail(booking: BookingRow, to: string): OutgoingEmail {
  const subject = `Direktbuchung ${booking.reference} wurde in Smoobu storniert`;
  const text = [
    `Die Direktbuchung ${booking.reference} (${booking.apartment_id.toUpperCase()}, ${booking.check_in}–${booking.check_out}, ${booking.guest_first_name} ${booking.guest_last_name}) wurde in Smoobu storniert.`,
    ``,
    `WICHTIG: Falls dem Gast eine Rückerstattung zusteht, bitte manuell im Stripe-Dashboard auslösen (Zahlung ${booking.stripe_payment_intent_id ?? '—'}).`,
  ].join('\n');
  return { to, subject, html: layout('Buchung storniert', `<p style="font-size:14px;">${text.replaceAll('\n', '<br>')}</p>`), text };
}
