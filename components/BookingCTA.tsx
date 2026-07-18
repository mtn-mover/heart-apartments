'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { todayString } from '@/lib/booking/dates';

interface BookingCTAProps {
  apartmentId: string;
  airbnbUrl: string;
  size?: 'default' | 'large';
  className?: string;
}

interface Meta {
  active: boolean;
  directDiscountPct: number;
}

const primaryClass =
  'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ' +
  'bg-heart-coral-500 text-white hover:bg-heart-coral-600 shadow-lg hover:shadow-xl hover:scale-105';

/**
 * Booking entry point. Whether direct booking is offered is decided
 * server-side (property_config.active via the availability API): active →
 * "book direct" primary with Airbnb as the alternative; not active (or API
 * unreachable) → the classic Airbnb button, exactly as before go-live.
 */
export default function BookingCTA({
  apartmentId,
  airbnbUrl,
  size = 'default',
  className,
}: BookingCTAProps) {
  const t = useTranslations('apartment');
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/booking/availability?apartment=${apartmentId}&month=${todayString().slice(0, 7)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setMeta({ active: !!data.active, directDiscountPct: data.directDiscountPct ?? 0 });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apartmentId]);

  const sizeClass = size === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm';

  if (meta?.active) {
    return (
      <div className={cn('space-y-3', className)}>
        <Link href={`/book/${apartmentId}`} className={cn(primaryClass, sizeClass, 'w-full')}>
          <span>
            {meta.directDiscountPct > 0
              ? t('bookDirectSave', { pct: meta.directDiscountPct })
              : t('bookDirect')}
          </span>
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <a
          href={airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-slate-500 underline hover:text-slate-700"
        >
          {t('bookAirbnbAlt')}
        </a>
        <p className="text-center text-xs text-slate-500">{t('secureNote')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <a
        href={airbnbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(primaryClass, sizeClass, 'w-full')}
      >
        <span>{t('bookNow')}</span>
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
      <p className="text-center text-xs text-slate-500">{t('secureAirbnb')}</p>
    </div>
  );
}
