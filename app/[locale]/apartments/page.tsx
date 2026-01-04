import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { apartments } from '@/data/apartments';
import ApartmentCard from '@/components/ApartmentCard';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  title: 'Our Apartments',
  description: 'Browse our collection of 5 modern apartments in central Interlaken. Air conditioning, elevator access, and walking distance to train stations.',
};

export default async function ApartmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ApartmentsPageContent />;
}

function ApartmentsPageContent() {
  const t = useTranslations('home');
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
            <span className="text-slate-900 font-medium">{nav('apartments')}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="py-12 md:py-16 bg-opal-pearl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">
            {t('featuredTitle')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('featuredSubtitle')}
          </p>
        </div>
      </section>

      {/* Apartments Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {apartments.map((apartment, index) => (
              <ApartmentCard
                key={apartment.id}
                apartment={apartment}
                priority={index < 3}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
