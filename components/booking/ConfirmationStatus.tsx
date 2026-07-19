'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getApartmentById } from '@/data/apartments';
import type { QuoteBreakdown } from '@/lib/booking/pricing';
import PriceBreakdown from './PriceBreakdown';

interface StatusResponse {
  reference: string;
  status: 'pending_payment' | 'processing' | 'confirmed' | 'failed' | 'expired' | 'cancelled';
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  guestFirstName: string;
  quote: QuoteBreakdown;
}

/**
 * Rendered after the Stripe redirect. The webhook confirms the booking
 * asynchronously, so this polls /api/booking/status until it settles.
 * The email (needed as weak authz) comes from sessionStorage; if that is
 * gone (new browser/private mode) the guest is asked to type it once.
 */
export default function ConfirmationStatus({ reference, apartmentId }: { reference: string; apartmentId: string }) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const [email, setEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [result, setResult] = useState<StatusResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const apartment = getApartmentById(apartmentId);

  useEffect(() => {
    try {
      setEmail(sessionStorage.getItem(`lh-email-${reference}`));
    } catch {
      setEmail(null);
    }
  }, [reference]);

  const poll = useCallback(async () => {
    if (!email) return null;
    const res = await fetch(
      `/api/booking/status?ref=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`
    );
    if (res.status === 404) {
      setNotFound(true);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as StatusResponse;
  }, [reference, email]);

  useEffect(() => {
    if (!email) return;
    let stopped = false;
    let attempts = 0;

    const MAX_ATTEMPTS = 45; // ~90 s
    const tick = async () => {
      if (stopped) return;
      attempts += 1;
      const data = await poll().catch(() => null);
      if (stopped) return;
      if (data) {
        setResult(data);
        setNotFound(false);
        if (data.status === 'pending_payment' || data.status === 'processing') {
          if (attempts < MAX_ATTEMPTS) setTimeout(tick, 2000);
          else setTimedOut(true);
          return;
        }
        return;
      }
      if (!stopped && attempts < MAX_ATTEMPTS && !notFound) setTimeout(tick, 2000);
      else if (!stopped && !notFound) setTimedOut(true);
    };

    void tick();
    return () => {
      stopped = true;
    };
  }, [email, poll, notFound]);

  // No email available → ask once.
  if (email === null || notFound) {
    return (
      <div className="max-w-md mx-auto">
        <p className="text-sm text-slate-600 mb-4">{t('enterEmail')}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setNotFound(false);
            setResult(null);
            setEmail(emailInput.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            required
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="email@example.com"
          />
          <button
            type="submit"
            className="rounded-xl px-5 py-3 text-sm font-semibold bg-heart-coral-500 text-white hover:bg-heart-coral-600"
          >
            {t('showStatus')}
          </button>
        </form>
      </div>
    );
  }

  const settled = result && result.status !== 'pending_payment' && result.status !== 'processing';

  // Webhook hasn't settled the booking within the polling window — don't spin
  // forever; tell the guest their reference and that email will confirm.
  if (!settled && timedOut) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <h1 className="text-xl md:text-2xl font-bold mb-3 font-heading">{t('confTimeoutTitle')}</h1>
        <p className="text-slate-600 mb-4">{t('confTimeoutText')}</p>
        <p className="text-sm text-slate-500">
          {t('confReference')}:{' '}
          <span className="font-bold tracking-widest text-heart-coral-500">{reference}</span>
        </p>
      </div>
    );
  }

  if (!settled) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-heart-coral-200 border-t-heart-coral-500 rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold mb-2">{t('confPending')}</h2>
        <p className="text-sm text-slate-500">{t('confPendingText')}</p>
      </div>
    );
  }

  if (result.status === 'confirmed') {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-heart-sage-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-heart-sage-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 font-heading">{t('confTitle')}</h1>
        <p className="text-slate-600 mb-6">{t('confThanks', { name: result.guestFirstName })}</p>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-sm mb-6">
          <p className="text-sm text-slate-500 mb-1">{t('confReference')}</p>
          <p className="text-2xl font-bold tracking-widest text-heart-coral-500 mb-5">{result.reference}</p>
          {apartment && (
            <p className="text-sm font-semibold mb-1">
              {apartment.name} — {apartment[locale === 'de' ? 'de' : 'en'].title}
            </p>
          )}
          <p className="text-sm text-slate-600 mb-5">
            {result.checkIn} → {result.checkOut}
          </p>
          <PriceBreakdown quote={result.quote} />
        </div>
        <p className="text-sm text-slate-500">{t('confEmail')}</p>
      </div>
    );
  }

  // failed / expired / cancelled
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-3 font-heading">{t('confFailedTitle')}</h1>
      <p className="text-slate-600 mb-8">{t('confFailedText')}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/book/${apartmentId}`}
          className="inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 text-sm bg-heart-coral-500 text-white hover:bg-heart-coral-600"
        >
          {t('tryOtherDates')}
        </Link>
        {apartment && (
          <a
            href={apartment.airbnbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 text-sm bg-white text-heart-coral-500 border-2 border-heart-coral-500 hover:bg-heart-coral-50"
          >
            {t('bookOnAirbnb')}
          </a>
        )}
      </div>
    </div>
  );
}
