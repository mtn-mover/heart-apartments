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
      <div className="bg-gray-50 py-4 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              {nav('home')}
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/apartments" className="text-gray-500 hover:text-gray-700">
              {nav('apartments')}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{apartment.name}</span>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {data.title}
              </h1>

              {/* Airbnb-style Specs */}
              <div className="text-gray-600 mb-4">
                <span>{specs.guests} {specs.guests === 1 ? t('guest') : t('guests')}</span>
                <span className="mx-2">·</span>
                <span>{specs.bedrooms} {specs.bedrooms === 1 ? t('bedroom') : t('bedrooms')}</span>
                <span className="mx-2">·</span>
                <span>{specs.beds} {specs.beds === 1 ? t('bed') : t('beds')}</span>
                <span className="mx-2">·</span>
                <span>{formatBaths(specs.baths)} {specs.baths === 1 ? t('bath') : t('baths')}</span>
              </div>

              <p className="text-gray-600 mb-6">{data.subtitle}</p>

              <div className="prose prose-gray max-w-none">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('description')}</h2>
                <p className="text-gray-600 leading-relaxed">{data.description}</p>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('amenities')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {apartment.amenities.map((amenity) => {
                  const icon = amenityIcons[amenity];
                  if (!icon) return null;
                  return (
                    <div
                      key={amenity}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-2xl">{icon.icon}</span>
                      <span className="text-gray-700 font-medium">{amenityT(icon.key)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('location')}</h2>
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-gray-700 font-medium">{data.location}</p>
                  <p className="text-gray-500 text-sm mt-1">Interlaken, Switzerland</p>
                </div>
              </div>
            </div>

            {/* Ideal For */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('idealFor')}</h2>
              <div className="flex flex-wrap gap-2">
                {data.idealFor.map((item, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-rose-50 text-rose-700 rounded-full text-sm font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              {/* Airbnb-style Specs in Sidebar */}
              <div className="text-center mb-6 pb-6 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-sm text-gray-600">{specs.guests} {t('guests')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🛏️</div>
                    <div className="text-sm text-gray-600">{specs.bedrooms} {t('bedrooms')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🛋️</div>
                    <div className="text-sm text-gray-600">{specs.beds} {t('beds')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🚿</div>
                    <div className="text-sm text-gray-600">{formatBaths(specs.baths)} {t('baths')}</div>
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
                      className="flex items-center space-x-2 text-sm text-gray-600"
                    >
                      <span>{icon.icon}</span>
                      <span>{amenityT(icon.key)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2 text-gray-600 mb-6 pb-6 border-b">
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
              <p className="text-center text-xs text-gray-500 mt-4">
                Secure booking via Airbnb
              </p>
            </div>
          </div>
        </div>

        {/* Other Apartments */}
        <section className="mt-16 pt-16 border-t">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('otherApartments')}</h2>
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
            className="inline-flex items-center text-rose-600 font-medium hover:text-rose-700"
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
