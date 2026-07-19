'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { de as rdpDe, enGB as rdpEn } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { useLocale, useTranslations } from 'next-intl';
import { addDaysString, toDateString, todayString } from '@/lib/booking/dates';

interface DayInfo {
  available: boolean;
  minStay: number;
}

export interface AvailabilityMeta {
  active: boolean;
  directDiscountPct: number;
}

interface Props {
  apartmentId: string;
  checkIn?: string;
  checkOut?: string;
  onSelect: (range: { checkIn?: string; checkOut?: string }) => void;
  onMeta?: (meta: AvailabilityMeta) => void;
}

function parseDS(s: string): Date {
  return new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
}

/**
 * Month calendar fed by /api/booking/availability (which reads Smoobu).
 * Check-out is exclusive: the departure day itself needs no free night, so
 * the first day of a blocked stretch stays selectable as check-out
 * (back-to-back turnovers work).
 */
export default function AvailabilityCalendar({ apartmentId, checkIn, checkOut, onSelect, onMeta }: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const [dayMap, setDayMap] = useState<Record<string, DayInfo>>({});
  const requestedMonths = useRef<Set<string>>(new Set());
  const [active, setActive] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [month, setMonth] = useState<Date>(checkIn ? parseDS(checkIn) : new Date());

  const today = todayString();

  // requestedMonths is a ref so this callback stays stable — a failed fetch
  // must NOT retrigger the effect (that would loop while the API is down).
  const loadMonth = useCallback(
    async (monthKey: string) => {
      if (requestedMonths.current.has(monthKey)) return;
      requestedMonths.current.add(monthKey);
      try {
        const res = await fetch(`/api/booking/availability?apartment=${apartmentId}&month=${monthKey}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          active: boolean;
          directDiscountPct?: number;
          days?: { date: string; available: boolean; minStay: number }[];
        };
        setActive(data.active);
        onMeta?.({ active: data.active, directDiscountPct: data.directDiscountPct ?? 0 });
        if (data.active && data.days) {
          setDayMap((prev) => {
            const next = { ...prev };
            for (const d of data.days!) next[d.date] = { available: d.available, minStay: d.minStay };
            return next;
          });
        }
      } catch {
        setLoadError(true);
      }
    },
    [apartmentId, onMeta]
  );

  useEffect(() => {
    const key = toDateString(month).slice(0, 7);
    const next = addDaysString(`${key}-01`, 32).slice(0, 7);
    void loadMonth(key);
    void loadMonth(next);
  }, [month, loadMonth]);

  const isDisabled = useCallback(
    (date: Date): boolean => {
      const s = toDateString(date);
      if (s < today) return true;
      const selectingCheckout = !!checkIn && !checkOut;
      if (selectingCheckout && s > checkIn!) {
        // Check-out candidate: every night from check-in up to (not incl.) s must be free
        for (let d = checkIn!; d < s; d = addDaysString(d, 1)) {
          if (!dayMap[d]?.available) return true;
        }
        return false;
      }
      // Check-in candidate: its own night must be free (unknown = not loaded yet → blocked)
      return !dayMap[s]?.available;
    },
    [today, checkIn, checkOut, dayMap]
  );

  const selected: DateRange | undefined = checkIn
    ? { from: parseDS(checkIn), to: checkOut ? parseDS(checkOut) : undefined }
    : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    const from = range?.from ? toDateString(range.from) : undefined;
    const to = range?.to ? toDateString(range.to) : undefined;
    onSelect({ checkIn: from, checkOut: to && to !== from ? to : undefined });
  };

  if (active === false) return null;

  const minStay = checkIn && !checkOut ? (dayMap[checkIn]?.minStay ?? 1) : 1;
  const maxMonth = new Date();
  maxMonth.setMonth(maxMonth.getMonth() + 18);

  return (
    <div>
      <DayPicker
        mode="range"
        min={2}
        selected={selected}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
        startMonth={new Date()}
        endMonth={maxMonth}
        disabled={isDisabled}
        excludeDisabled
        resetOnSelect
        locale={locale === 'de' ? rdpDe : rdpEn}
      />
      {active === null && !loadError && (
        <p className="text-sm text-slate-500 mt-2 animate-pulse">…</p>
      )}
      {loadError && <p className="text-sm text-red-600 mt-2">{t('errors.generic')}</p>}
      {minStay > 1 && (
        <p className="text-sm text-heart-coral-600 mt-2">{t('minStayHint', { nights: minStay })}</p>
      )}
      {checkIn && (
        <button
          type="button"
          onClick={() => onSelect({})}
          className="text-sm text-slate-500 underline mt-2 hover:text-slate-700"
        >
          {t('clearDates')}
        </button>
      )}
    </div>
  );
}
