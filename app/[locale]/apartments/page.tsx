import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
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
      {/* Hero Section with Apartment Image */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/heart1/heards_1_1_dining_area.jpg"
            alt="Modern apartment interior"
            fill
            priority
            quality={90}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center space-x-2 text-sm mb-6">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">
              {nav('home')}
            </Link>
            <span className="text-white/50">/</span>
            <span className="text-white font-medium">{nav('apartments')}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-heading">
            {t('featuredTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
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
