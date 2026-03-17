import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { apartments } from '@/data/apartments';
import ObfuscatedEmail from '@/components/ObfuscatedEmail';
import LocationMap from '@/components/LocationMap';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Opal Heart Guesthouse. Book your stay in Interlaken, Switzerland.',
};

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ContactPageContent />;
}

function ContactPageContent() {
  const t = useTranslations('contact');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-16 md:py-24 bg-opal-pearl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">{t('title')}</h1>
          <p className="text-xl text-slate-600">{t('subtitle')}</p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            {/* Email */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-opal-pearl rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-opal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('email')}</h3>
              <ObfuscatedEmail
                user="info"
                domain="heartbox-interlaken.ch"
                className="text-opal-blue hover:text-opal-teal font-medium transition-colors"
              />
            </div>
          </div>

          {/* Booking Note */}
          <div className="mt-12 bg-opal-pearl border border-opal-blue/20 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 font-heading">{t('bookingNote')}</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {apartments.map((apartment) => (
                <a
                  key={apartment.id}
                  href={apartment.airbnbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-opal-blue hover:text-opal-blue transition-colors"
                >
                  {apartment.name}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-heading">{t('mapTitle')}</h2>
            <p className="text-slate-600">{t('mapSubtitle')}</p>
          </div>
          <LocationMap />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 font-heading">Ready to Book?</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Check out our apartments and book your stay through Airbnb for a secure and easy booking experience.
          </p>
          <Link
            href="/apartments"
            className="inline-flex items-center px-8 py-4 bg-opal-blue hover:bg-opal-teal text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Browse Apartments
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
