import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { apartments, getApartmentById, getOtherApartments, amenityIcons } from '@/data/apartments';
import ImageGallery from '@/components/ImageGallery';
import BookingCTA from '@/components/BookingCTA';
import ApartmentCard from '@/components/ApartmentCard';

export function generateStaticParams() {
  return apartments.map((apartment) => ({
    id: apartment.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const apartment = getApartmentById(id);

  if (!apartment) {
    return { title: 'Apartment Not Found' };
  }

  const data = apartment[locale as 'en' | 'de'];

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: [apartment.images[0].src],
    },
  };
}

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const apartment = getApartmentById(id);

  if (!apartment) {
    notFound();
  }

  return <ApartmentDetailContent id={id} />;
}

function ApartmentDetailContent({ id }: { id: string }) {
  const t = useTranslations('apartment');
  const amenityT = useTranslations('amenities');
  const nav = useTranslations('nav');
  const locale = useLocale() as 'en' | 'de';

  const apartment = getApartmentById(id)!;
  const data = apartment[locale];
  const { specs } = apartment;
  const otherApartments = getOtherApartments(id).slice(0, 3);

  // Format baths (1.5 -> "1.5")
  const formatBaths = (baths: number) => {
    return baths % 1 === 0 ? baths.toString() : baths.toFixed(1);
  };

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
            <Link href="/apartments" className="text-slate-500 hover:text-opal-blue transition-colors">
              {nav('apartments')}
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 font-medium">{apartment.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Gallery & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <ImageGallery images={apartment.images} apartmentName={apartment.name} />

            {/* Title & Description */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 font-heading">
                {data.title}
              </h1>

              {/* Airbnb-style Specs */}
              <div className="text-slate-600 mb-4">
                <span>{specs.guests} {specs.guests === 1 ? t('guest') : t('guests')}</span>
                <span className="mx-2">·</span>
                <span>{specs.bedrooms} {specs.bedrooms === 1 ? t('bedroom') : t('bedrooms')}</span>
                <span className="mx-2">·</span>
                <span>{specs.beds} {specs.beds === 1 ? t('bed') : t('beds')}</span>
                <span className="mx-2">·</span>
                <span>{formatBaths(specs.baths)} {specs.baths === 1 ? t('bath') : t('baths')}</span>
              </div>

              <p className="text-slate-600 mb-6">{data.subtitle}</p>

              {/* Part of Opal Heart Guesthouse */}
              <div className="bg-opal-pearl rounded-xl p-4 mb-6 border border-opal-blue/20">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">💎</span>
                  <div>
                    <p className="font-semibold text-slate-900">{t('partOfGuesthouse')}</p>
                    <p className="text-sm text-slate-600">{t('guesthouseDescription')}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-slate max-w-none">
                <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('description')}</h2>
                <p className="text-slate-600 leading-relaxed">{data.description}</p>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 font-heading">{t('amenities')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {apartment.amenities.map((amenity) => {
                  const icon = amenityIcons[amenity];
                  if (!icon) return null;
                  return (
                    <div
                      key={amenity}
                      className="flex items-center space-x-3 p-3 bg-opal-pearl rounded-lg border border-opal-blue/10"
                    >
                      <span className="text-2xl">{icon.icon}</span>
                      <span className="text-slate-700 font-medium">{amenityT(icon.key)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 font-heading">{t('location')}</h2>
              <div className="flex items-start space-x-3 p-4 bg-opal-pearl rounded-lg border border-opal-blue/10">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-slate-700 font-medium">{data.location}</p>
                  <p className="text-slate-500 text-sm mt-1">Interlaken, Switzerland</p>
                </div>
              </div>
            </div>

            {/* Ideal For */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 font-heading">{t('idealFor')}</h2>
              <div className="flex flex-wrap gap-2">
                {data.idealFor.map((item, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-opal-pearl text-opal-blue rounded-full text-sm font-medium border border-opal-blue/20"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Host Section */}
            <div className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 font-heading">{t('hostedBy')}</h2>
              <div className="flex items-start space-x-4">
                {/* Host Photo Placeholder */}
                <div className="flex-shrink-0 w-16 h-16 bg-opal-pearl rounded-full flex items-center justify-center border-2 border-opal-blue/20">
                  <span className="text-3xl">👩</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-slate-900">Diana</h3>
                    <span className="inline-flex items-center px-2 py-0.5 bg-alpine-gold/20 text-alpine-gold rounded-full text-xs font-medium">
                      ⭐ Superhost
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-3">{t('hostBio')}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span className="flex items-center space-x-1">
                      <span>🌟</span>
                      <span>{t('hostRating')}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>💬</span>
                      <span>{t('hostResponse')}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
              {/* Airbnb-style Specs in Sidebar */}
              <div className="text-center mb-6 pb-6 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-sm text-slate-600">{specs.guests} {t('guests')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🛏️</div>
                    <div className="text-sm text-slate-600">{specs.bedrooms} {t('bedrooms')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🛋️</div>
                    <div className="text-sm text-slate-600">{specs.beds} {t('beds')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🚿</div>
                    <div className="text-sm text-slate-600">{formatBaths(specs.baths)} {t('baths')}</div>
                  </div>
                </div>
              </div>

              {/* Quick Amenities */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {apartment.amenities.slice(0, 4).map((amenity) => {
                  const icon = amenityIcons[amenity];
                  if (!icon) return null;
                  return (
                    <div
                      key={amenity}
                      className="flex items-center space-x-2 text-sm text-slate-600"
                    >
                      <span>{icon.icon}</span>
                      <span>{amenityT(icon.key)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2 text-slate-600 mb-6 pb-6 border-b border-slate-100">
                <span>📍</span>
                <span className="text-sm">Interlaken, Switzerland</span>
              </div>

              {/* Booking CTA */}
              <BookingCTA
                airbnbUrl={apartment.airbnbUrl}
                size="large"
                className="w-full"
              />

              {/* Airbnb Note */}
              <p className="text-center text-xs text-slate-500 mt-4">
                Secure booking via Airbnb
              </p>
            </div>
          </div>
        </div>

        {/* Other Apartments */}
        <section className="mt-16 pt-16 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 font-heading">{t('otherApartments')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherApartments.map((apt) => (
              <ApartmentCard key={apt.id} apartment={apt} />
            ))}
          </div>
        </section>

        {/* Back to Apartments */}
        <div className="mt-12 text-center">
          <Link
            href="/apartments"
            className="inline-flex items-center text-opal-blue font-medium hover:text-opal-teal transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            {t('backToApartments')}
          </Link>
        </div>
      </div>
    </div>
  );
}
