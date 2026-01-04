import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { apartments } from '@/data/apartments';

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
  const nav = useTranslations('nav');

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-opal-pearl py-4 border-b border-opal-blue/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-slate-500 hover:text-opal-blue transition-colors">
              {nav('home')}
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 font-medium">{nav('contact')}</span>
          </nav>
        </div>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Email */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-opal-pearl rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-opal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('email')}</h3>
              <a
                href="mailto:info@opalheartguesthouse.com"
                className="text-opal-blue hover:text-opal-teal font-medium transition-colors"
              >
                info@opalheartguesthouse.com
              </a>
            </div>

            {/* Address */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-opal-pearl rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-opal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('address')}</h3>
              <p className="text-slate-600">{t('addressText')}</p>
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

      {/* Map Section Placeholder */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-heading">Find Us in Interlaken</h2>
            <p className="text-slate-600">Central location, easy access to train stations and attractions</p>
          </div>
          <div className="bg-slate-200 rounded-2xl h-80 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-4 block">📍</span>
              <p className="text-slate-700 font-medium">Interlaken, Switzerland</p>
              <p className="text-slate-500 text-sm mt-2">200m from Interlaken West Station</p>
            </div>
          </div>
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
