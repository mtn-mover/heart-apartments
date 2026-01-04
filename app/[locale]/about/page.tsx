import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Meet Diana, your Superhost at Opal Heart Guesthouse in Interlaken. Discover our story, values, and commitment to Swiss hospitality.',
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AboutPageContent />;
}

function AboutPageContent() {
  const t = useTranslations('about');

  const values = [
    { key: 'value1', icon: '💎' },
    { key: 'value2', icon: '🏔️' },
    { key: 'value3', icon: '🤝' },
    { key: 'value4', icon: '🌿' },
  ];

  const standards = [
    'standard1',
    'standard2',
    'standard3',
    'standard4',
    'standard5',
  ];

  const awards = [
    { key: 'award1', icon: '⭐' },
    { key: 'award2', icon: '🏆' },
    { key: 'award3', icon: '💯' },
    { key: 'award4', icon: '🎖️' },
    { key: 'award5', icon: '👑' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/heart3/heards3_22_patio.jpg"
            alt="Opal Heart Guesthouse - Interlaken"
            fill
            className="object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 font-heading">{t('title')}</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 font-heading">{t('storyTitle')}</h2>
              <p className="text-lg text-slate-600 leading-relaxed">{t('storyText')}</p>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/images/heart1/heards_1_1_dining_area.jpg"
                alt="Opal Heart Guesthouse Interior"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Diana Section */}
      <section className="py-16 md:py-24 bg-opal-pearl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Diana Photo */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-opal-blue to-opal-teal rounded-2xl transform rotate-3"></div>
                <div className="relative bg-slate-200 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
                  {/* Placeholder for Diana's photo */}
                  <div className="text-center p-8">
                    <span className="text-8xl mb-4 block">👩</span>
                    <p className="text-slate-500 text-sm">Diana's Photo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Diana Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 font-heading">{t('dianaTitle')}</h2>
              <blockquote className="text-xl italic text-opal-blue mb-6 border-l-4 border-opal-blue pl-4">
                "{t('dianaQuote')}"
              </blockquote>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">{t('dianaText')}</p>

              {/* Diana Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-opal-blue/10">
                  <span className="text-2xl mb-1 block">⭐</span>
                  <p className="font-semibold text-slate-900">Superhost</p>
                  <p className="text-sm text-slate-500">Since 2018</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-opal-blue/10">
                  <span className="text-2xl mb-1 block">🌟</span>
                  <p className="font-semibold text-slate-900">500+ Guests</p>
                  <p className="text-sm text-slate-500">Welcomed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12 font-heading">{t('valuesTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value) => (
              <div
                key={value.key}
                className="bg-white rounded-2xl p-8 shadow-lg border border-opal-blue/10 hover:shadow-xl transition-shadow"
              >
                <span className="text-4xl mb-4 block">{value.icon}</span>
                <h3 className="text-xl font-semibold text-slate-900 mb-2 font-heading">
                  {t(`${value.key}Title` as keyof typeof t)}
                </h3>
                <p className="text-slate-600">
                  {t(`${value.key}Text` as keyof typeof t)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Swiss Quality Standards */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">{t('standardsTitle')}</h2>
          <div className="max-w-3xl mx-auto">
            <ul className="space-y-4">
              {standards.map((standard) => (
                <li
                  key={standard}
                  className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-5"
                >
                  <span className="flex-shrink-0 w-8 h-8 bg-opal-teal rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-lg">{t(standard as keyof typeof t)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12 font-heading">{t('awardsTitle')}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {awards.map((award) => (
              <div
                key={award.key}
                className="flex items-center space-x-3 bg-alpine-gold/10 border border-alpine-gold/30 rounded-full px-6 py-3"
              >
                <span className="text-2xl">{award.icon}</span>
                <span className="font-medium text-slate-900">{t(award.key as keyof typeof t)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-opal-pearl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 font-heading">{t('ctaTitle')}</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            {t('ctaText')}
          </p>
          <Link
            href="/apartments"
            className="inline-flex items-center px-8 py-4 bg-opal-blue hover:bg-opal-teal text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            {t('ctaButton')}
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
