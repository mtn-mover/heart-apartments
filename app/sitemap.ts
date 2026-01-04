import type { MetadataRoute } from 'next';
import { apartments } from '@/data/apartments';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://opal-heart-guesthouse.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['en', 'de'];
  const staticPages = ['', '/apartments', '/about', '/contact'];
  const apartmentIds = apartments.map((apt) => apt.id);

  const routes: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  for (const locale of locales) {
    for (const page of staticPages) {
      routes.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1 : 0.8,
      });
    }

    // Apartment detail pages
    for (const id of apartmentIds) {
      routes.push({
        url: `${baseUrl}/${locale}/apartments/${id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }
  }

  return routes;
}
