import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getApartmentById } from '@/data/apartments';
import ConfirmationStatus from '@/components/booking/ConfirmationStatus';

export const metadata: Metadata = {
  title: 'Booking status',
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
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
  const ref = typeof sp.ref === 'string' ? sp.ref.toUpperCase() : '';
  if (!/^LH-[A-Z2-9]{6}$/.test(ref)) notFound();

  return (
    <div className="min-h-screen bg-heart-cream-50/50">
      <section className="py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ConfirmationStatus reference={ref} apartmentId={id} />
        </div>
      </section>
    </div>
  );
}
