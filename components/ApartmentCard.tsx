'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Apartment } from '@/data/apartments';

interface ApartmentCardProps {
  apartment: Apartment;
  priority?: boolean;
}

export default function ApartmentCard({ apartment, priority = false }: ApartmentCardProps) {
  const locale = useLocale() as 'en' | 'de';
  const t = useTranslations('apartment');
  const data = apartment[locale];
  const { specs } = apartment;

  // Format baths (1.5 -> "1.5")
  const formatBaths = (baths: number) => {
    return baths % 1 === 0 ? baths.toString() : baths.toFixed(1);
  };

  return (
    <Link
      href={`/apartments/${apartment.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={apartment.images[0].src}
          alt={data.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          priority={priority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-opal-blue transition-colors font-heading">
          {apartment.name}
        </h3>
        <p className="text-sm text-slate-600 mb-3 line-clamp-1">
          {data.subtitle}
        </p>

        {/* Airbnb-style Specs */}
        <div className="text-sm text-slate-600 mb-4">
          <span>{specs.guests} {specs.guests === 1 ? t('guest') : t('guests')}</span>
          <span className="mx-1">·</span>
          <span>{specs.bedrooms} {specs.bedrooms === 1 ? t('bedroom') : t('bedrooms')}</span>
          <span className="mx-1">·</span>
          <span>{specs.beds} {specs.beds === 1 ? t('bed') : t('beds')}</span>
          <span className="mx-1">·</span>
          <span>{formatBaths(specs.baths)} {specs.baths === 1 ? t('bath') : t('baths')}</span>
        </div>

        {/* View Details Button */}
        <div className="flex items-center justify-between">
          <span className="text-opal-blue font-medium text-sm group-hover:underline">
            {t('viewDetails')} →
          </span>
        </div>
      </div>
    </Link>
  );
}
