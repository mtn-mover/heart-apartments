'use client';

import { useTranslations } from 'next-intl';

export interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

interface Props {
  value: GuestData;
  onChange: (patch: Partial<GuestData>) => void;
  onSubmit: () => void;
  submitting: boolean;
}

const inputClass =
  'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-heart-charcoal-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-heart-coral-400 focus:border-heart-coral-400';

export default function GuestForm({ value, onChange, onSubmit, submitting }: Props) {
  const t = useTranslations('booking');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bk-first" className="block text-sm font-medium mb-1.5">
            {t('firstName')} *
          </label>
          <input
            id="bk-first"
            required
            maxLength={100}
            autoComplete="given-name"
            className={inputClass}
            value={value.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="bk-last" className="block text-sm font-medium mb-1.5">
            {t('lastName')} *
          </label>
          <input
            id="bk-last"
            required
            maxLength={100}
            autoComplete="family-name"
            className={inputClass}
            value={value.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label htmlFor="bk-email" className="block text-sm font-medium mb-1.5">
          {t('email')} *
        </label>
        <input
          id="bk-email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className={inputClass}
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="bk-phone" className="block text-sm font-medium mb-1.5">
          {t('phone')}
        </label>
        <input
          id="bk-phone"
          type="tel"
          maxLength={40}
          autoComplete="tel"
          className={inputClass}
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="bk-msg" className="block text-sm font-medium mb-1.5">
          {t('message')}
        </label>
        <textarea
          id="bk-msg"
          rows={3}
          maxLength={2000}
          className={inputClass}
          value={value.message}
          onChange={(e) => onChange({ message: e.target.value })}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3.5 text-sm
                   bg-heart-coral-500 text-white hover:bg-heart-coral-600 shadow-lg transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? t('creating') : t('continueToPayment')}
      </button>
    </form>
  );
}
