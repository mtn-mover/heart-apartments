'use client';

import { useState } from 'react';
import { loadStripe, type StripeElementLocale } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useTranslations } from 'next-intl';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface Props {
  clientSecret: string;
  returnUrl: string;
  amountLabel: string; // preformatted, e.g. "CHF 540.00"
  locale: string;
}

export default function CheckoutPayment({ clientSecret, returnUrl, amountLabel, locale }: Props) {
  const t = useTranslations('booking');

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-600">
        Stripe is not configured (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing).
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: (locale === 'de' ? 'de' : 'en') as StripeElementLocale,
        appearance: {
          variables: {
            colorPrimary: '#E57373',
            colorText: '#2C3E50',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
        },
      }}
    >
      <PaymentForm returnUrl={returnUrl} amountLabel={amountLabel} note={t('paymentNote')} secure={t('paymentSecure')} pay={t('payNow', { amount: amountLabel })} processing={t('processing')} />
    </Elements>
  );
}

function PaymentForm({
  returnUrl,
  note,
  secure,
  pay,
  processing,
}: {
  returnUrl: string;
  amountLabel: string;
  note: string;
  secure: string;
  pay: string;
  processing: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    // On success Stripe redirects to returnUrl; on failure the guest can retry
    // with the same PaymentIntent (the booking stays pending until its TTL).
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3.5 text-sm
                   bg-heart-coral-500 text-white hover:bg-heart-coral-600 shadow-lg transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? processing : pay}
      </button>
      <p className="text-xs text-slate-500">{note}</p>
      <p className="text-xs text-slate-400">🔒 {secure}</p>
    </form>
  );
}
