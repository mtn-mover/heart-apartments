'use client';

import { useTranslations } from 'next-intl';
import type { QuoteBreakdown } from '@/lib/booking/pricing';
import { groupNightlyRates } from '@/lib/booking/pricing';
import { chf } from '@/lib/booking/format';

/** The one place a price is displayed — confirmation page and booking flow
 *  both render this, and the email table mirrors the same breakdown data. */
export default function PriceBreakdown({ quote }: { quote: QuoteBreakdown }) {
  const t = useTranslations('booking');
  const groups = groupNightlyRates(quote.nightlyRates);

  return (
    <div className="text-sm text-heart-charcoal-800">
      <dl className="space-y-1.5">
        {groups.map((g) => (
          <div key={g.from} className="flex justify-between gap-4">
            <dt className="text-slate-600">{t('nightsAt', { nights: g.nights, rate: chf(g.rateRappen) })}</dt>
            <dd className="whitespace-nowrap">{chf(g.subtotalRappen)}</dd>
          </div>
        ))}
        {quote.discountRappen > 0 && (
          <div className="flex justify-between gap-4 text-heart-sage-700">
            <dt>{t('priceDiscount', { pct: quote.discountPct })}</dt>
            <dd className="whitespace-nowrap">−{chf(quote.discountRappen)}</dd>
          </div>
        )}
        {quote.cleaningFeeRappen > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">{t('priceCleaning')}</dt>
            <dd className="whitespace-nowrap">{chf(quote.cleaningFeeRappen)}</dd>
          </div>
        )}
        {quote.cityTaxRappen > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {t('priceCityTax', { adults: quote.adults, nights: quote.nights })}
            </dt>
            <dd className="whitespace-nowrap">{chf(quote.cityTaxRappen)}</dd>
          </div>
        )}
      </dl>
      <div className="flex justify-between gap-4 border-t border-slate-200 mt-3 pt-3 font-semibold text-base">
        <span>{t('priceTotal')}</span>
        <span>{chf(quote.totalRappen)}</span>
      </div>
      <p className="text-xs text-slate-500 mt-2">{t('taxNote')}</p>
    </div>
  );
}
