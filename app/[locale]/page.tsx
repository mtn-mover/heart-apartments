import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { apartments } from '@/data/apartments';
import ApartmentCard from '@/components/ApartmentCard';
import DianaSection from '@/components/DianaSection';
import ReviewsSection from '@/components/ReviewsSection';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePageContent />;
}

function HomePageContent() {
  const t = useTranslations('home');

  const features = [
    { icon: '🏔️', titleKey: 'feature1Title', textKey: 'feature1Text' },
    { icon: '✨', titleKey: 'feature2Title', textKey: 'feature2Text' },
    { icon: '💎', titleKey: 'feature3Title', textKey: 'feature3Text' },
    { icon: '🌟', titleKey: 'feature4Title', textKey: 'feature4Text' },
    { icon: '🎿', titleKey: 'feature5Title', textKey: 'feature5Text' },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/heart1/heards_1_1_dining_area.jpg"
            alt="Opal Heart Guesthouse - Interlaken"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight font-heading">
            {t('heroTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-2">
            {t('heroSubtitle')}
          </p>
          <p className="text-lg text-white/70 mb-8 flex items-center justify-center">
            <span className="mr-2">📍</span>
            {t('heroLocation')}
          </p>
          <Link
            href="/apartments"
            className="inline-flex items-center px-8 py-4 bg-opal-blue hover:bg-opal-teal text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            {t('viewApartments')}
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Featured Apartments Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">
              {t('featuredTitle')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('featuredSubtitle')}
            </p>
          </div>

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

      {/* Diana Section */}
      <DianaSection />

      {/* About Snippet Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="/images/heart5/heards5_1_living_room.jpg"
                alt="Swiss Chalet Interior"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 font-heading">
                {t('aboutSnippetTitle')}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('aboutSnippetText')}
              </p>
              <Link
                href="/about"
                className="inline-flex items-center text-opal-blue font-semibold hover:text-opal-teal transition-colors"
              >
                {t('learnMore')}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us / Features Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">
            {t('whyUsTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{t(feature.titleKey as keyof typeof t)}</h3>
                <p className="text-slate-400">{t(feature.textKey as keyof typeof t)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />
    </>
  );
}
