import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getApartmentById } from '@/data/apartments';
import { isDateString } from '@/lib/booking/dates';
import BookingFlow from '@/components/booking/BookingFlow';

// Deliberately dynamic (no generateStaticParams): personal, behind user intent,
// and kept out of the index/sitemap.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const apartment = getApartmentById(id);
  const t = await getTranslations({ locale, namespace: 'booking' });
  return {
    title: apartment ? t('title', { name: apartment.name }) : 'Book',
    robots: { index: false, follow: false },
  };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const apartment = getApartmentById(id);
  if (!apartment) notFound();

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);
  const checkIn = str(sp.checkIn);
  const checkOut = str(sp.checkOut);
  const adults = Number(str(sp.adults));
  const children = Number(str(sp.children));

  const t = await getTranslations({ locale, namespace: 'booking' });
  const data = apartment[locale === 'de' ? 'de' : 'en'];

  return (
    <div className="min-h-screen bg-heart-cream-50/50">
      <section className="py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 hidden sm:block">
              <Image
                src={apartment.images[0].src}
                alt={apartment.images[0].alt}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-heart-charcoal-800">
                {t('title', { name: apartment.name })}
              </h1>
              <p className="text-slate-600 text-sm md:text-base">{data.title} · {data.location}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
            <BookingFlow
              apartmentId={id}
              initialCheckIn={checkIn && isDateString(checkIn) ? checkIn : undefined}
              initialCheckOut={checkOut && isDateString(checkOut) ? checkOut : undefined}
              initialAdults={Number.isInteger(adults) && adults >= 1 ? adults : undefined}
              initialChildren={Number.isInteger(children) && children >= 0 ? children : undefined}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
