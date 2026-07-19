'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getApartmentById } from '@/data/apartments';
import type { QuoteBreakdown } from '@/lib/booking/pricing';
import { chf } from '@/lib/booking/format';
import { nightsBetween } from '@/lib/booking/dates';
import AvailabilityCalendar, { type AvailabilityMeta } from './AvailabilityCalendar';
import PriceBreakdown from './PriceBreakdown';
import GuestForm, { type GuestData } from './GuestForm';
import CheckoutPayment from './CheckoutPayment';

type Step = 'dates' | 'details' | 'payment';

interface ApiError {
  error: string;
  detail?: Record<string, number | string>;
}

interface Props {
  apartmentId: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
}

export default function BookingFlow({
  apartmentId,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
}: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const apartment = getApartmentById(apartmentId)!;
  const maxGuests = apartment.specs.guests;

  const [step, setStep] = useState<Step>('dates');
  const [checkIn, setCheckIn] = useState<string | undefined>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<string | undefined>(initialCheckOut);
  const [adults, setAdults] = useState(Math.min(initialAdults ?? 2, maxGuests));
  const [children, setChildren] = useState(Math.min(initialChildren ?? 0, Math.max(0, maxGuests - (initialAdults ?? 2))));
  const [meta, setMeta] = useState<AvailabilityMeta | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);

  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<ApiError | null>(null);

  const [guest, setGuest] = useState<GuestData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const errorText = useCallback(
    (err: ApiError | null): string | null => {
      if (!err) return null;
      switch (err.error) {
        case 'min_stay':
          return t('errors.min_stay', { nights: Number(err.detail?.minNights ?? 2) });
        case 'max_guests':
          return t('errors.max_guests', { max: Number(err.detail?.maxGuests ?? maxGuests) });
        case 'not_available':
          return t('errors.not_available');
        case 'past_date':
          return t('errors.past_date');
        case 'beyond_horizon':
          return t('errors.beyond_horizon');
        case 'dates_just_taken':
          return t('errors.dates_just_taken');
        case 'booking_inactive':
          return t('errors.booking_inactive');
        default:
          return t('errors.generic');
      }
    },
    [t, maxGuests]
  );

  // Debounced live quote whenever the stay parameters are complete.
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (!checkIn || !checkOut) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch('/api/booking/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apartmentId, checkIn, checkOut, adults, children }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok) {
          setQuote(data.quote as QuoteBreakdown);
        } else {
          setQuoteError(data as ApiError);
        }
      } catch {
        if (!controller.signal.aborted) setQuoteError({ error: 'generic' });
      } finally {
        if (!controller.signal.aborted) setQuoting(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [apartmentId, checkIn, checkOut, adults, children]);

  const createBooking = useCallback(async () => {
    if (!quote) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartmentId,
          checkIn,
          checkOut,
          adults,
          children,
          locale,
          guest: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            message: guest.message,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data as ApiError;
        setCreateError(err);
        if (err.error === 'dates_just_taken' || err.error === 'not_available') {
          // Clear the selection and force the calendar to refetch, so the guest
          // isn't stuck on dates that are no longer bookable.
          setStep('dates');
          setQuote(null);
          setCheckIn(undefined);
          setCheckOut(undefined);
          setCalendarKey((k) => k + 1);
        }
        return;
      }
      // The confirmation page needs the email for the status endpoint —
      // sessionStorage instead of URL params (no PII in URLs).
      try {
        sessionStorage.setItem(`lh-email-${data.reference}`, guest.email.trim());
      } catch {
        /* private mode etc. — the confirmation page falls back to an email prompt */
      }
      setQuote(data.quote as QuoteBreakdown);
      setClientSecret(data.clientSecret as string);
      setReference(data.reference as string);
      setStep('payment');
    } catch {
      setCreateError({ error: 'generic' });
    } finally {
      setCreating(false);
    }
  }, [apartmentId, checkIn, checkOut, adults, children, locale, guest, quote]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const summary = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const fmt = (s: string) =>
      new Date(`${s}T12:00:00Z`).toLocaleDateString(locale === 'de' ? 'de-CH' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    return `${fmt(checkIn)} → ${fmt(checkOut)} · ${t('nightsLabel', { count: nights })} · ${adults + children} 👤`;
  }, [checkIn, checkOut, nights, adults, children, locale, t]);

  const returnUrl =
    typeof window !== 'undefined' && reference
      ? `${window.location.origin}/${locale}/book/${apartmentId}/confirmation?ref=${reference}`
      : '';

  const steps: { key: Step; label: string }[] = [
    { key: 'dates', label: t('stepDates') },
    { key: 'details', label: t('stepDetails') },
    { key: 'payment', label: t('stepPayment') },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  if (meta && !meta.active) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-sm text-slate-600 mb-4">{t('widgetUnavailable')}</p>
        <a
          href={apartment.airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 text-sm
                     bg-heart-coral-500 text-white hover:bg-heart-coral-600 transition-all"
        >
          {t('bookOnAirbnb')}
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-6 text-sm">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">—</span>}
            <span
              className={
                i === stepIndex
                  ? 'font-semibold text-heart-coral-600'
                  : i < stepIndex
                    ? 'text-heart-sage-700'
                    : 'text-slate-400'
              }
            >
              {i < stepIndex ? '✓ ' : ''}
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {step === 'dates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-base font-semibold mb-3">{t('selectDates')}</h2>
            <AvailabilityCalendar
              key={calendarKey}
              apartmentId={apartmentId}
              checkIn={checkIn}
              checkOut={checkOut}
              onSelect={({ checkIn: ci, checkOut: co }) => {
                setCheckIn(ci);
                setCheckOut(co);
              }}
              onMeta={setMeta}
            />
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-adults" className="block text-sm font-medium mb-1.5">
                  {t('adults')}
                </label>
                <select
                  id="bk-adults"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm bg-white"
                  value={adults}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setAdults(n);
                    // Keep total within the apartment limit
                    setChildren((c) => Math.min(c, maxGuests - n));
                  }}
                >
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bk-children" className="block text-sm font-medium mb-1.5">
                  {t('children')}
                </label>
                <select
                  id="bk-children"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm bg-white"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                >
                  {Array.from({ length: Math.max(0, maxGuests - adults) + 1 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500">{t('maxGuestsHint', { count: maxGuests })}</p>

            {quoting && <p className="text-sm text-slate-500 animate-pulse">…</p>}
            {quote && (
              <div className="bg-heart-cream-50 rounded-2xl p-5">
                <PriceBreakdown quote={quote} />
              </div>
            )}
            {quoteError && <p className="text-sm text-red-600">{errorText(quoteError)}</p>}

            <button
              type="button"
              disabled={!quote}
              onClick={() => setStep('details')}
              className="w-full inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3.5 text-sm
                         bg-heart-coral-500 text-white hover:bg-heart-coral-600 shadow-lg transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('continueBtn')}
            </button>
          </div>
        </div>
      )}

      {step === 'details' && quote && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <button
              type="button"
              onClick={() => setStep('dates')}
              className="text-sm text-slate-500 underline mb-4 hover:text-slate-700"
            >
              ← {t('back')}
            </button>
            <h2 className="text-base font-semibold mb-3">{t('stepDetails')}</h2>
            <GuestForm value={guest} onChange={(p) => setGuest((g) => ({ ...g, ...p }))} onSubmit={createBooking} submitting={creating} />
            {createError && <p className="text-sm text-red-600 mt-3">{errorText(createError)}</p>}
          </div>
          <aside>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {t('summary')}
            </h3>
            <div className="bg-heart-cream-50 rounded-2xl p-5">
              {summary && <p className="text-sm mb-4">{summary}</p>}
              <PriceBreakdown quote={quote} />
            </div>
          </aside>
        </div>
      )}

      {step === 'payment' && quote && clientSecret && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-base font-semibold mb-3">{t('stepPayment')}</h2>
            <CheckoutPayment
              clientSecret={clientSecret}
              returnUrl={returnUrl}
              amountLabel={chf(quote.totalRappen)}
              locale={locale}
            />
          </div>
          <aside>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {t('summary')}
            </h3>
            <div className="bg-heart-cream-50 rounded-2xl p-5">
              {summary && <p className="text-sm mb-4">{summary}</p>}
              <PriceBreakdown quote={quote} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
