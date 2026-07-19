import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

// Linked from the booking flow (terms checkbox). The policy wording is a
// DRAFT until Diana signs it off — see GO-LIVE.md.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bookingTerms' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function BookingTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'bookingTerms' });

  const sections = ['s1', 's2', 's3', 's4', 's5'] as const;

  return (
    <div className="min-h-screen bg-heart-cream-50/50">
      <section className="py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-heart-charcoal-800 mb-3">
            {t('title')}
          </h1>
          <p className="text-slate-600 mb-2">{t('intro')}</p>
          <p className="text-xs text-heart-gold-700 bg-heart-gold-50 border border-heart-gold-200 rounded-lg px-3 py-2 inline-block mb-8">
            {t('draftNote')}
          </p>

          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s}>
                <h2 className="text-lg font-semibold text-heart-charcoal-800 mb-2">
                  {t(`${s}Title`)}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">{t(`${s}Text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
