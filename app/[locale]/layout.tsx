import type { Metadata } from 'next';
import { Inter, Playfair_Display, Sacramento } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const sacramento = Sacramento({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-sacramento',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: 'Little Heart Guesthouse | Cozy Apartments in Interlaken, Switzerland',
    template: '%s | Little Heart Guesthouse',
  },
  description: 'Discover 5 cozy apartments in central Interlaken, perfect for exploring the Swiss Alps and Jungfrau region. Superhost since 2016. Little in size, big in heart.',
  keywords: ['Interlaken apartments', 'Swiss Alps accommodation', 'Jungfrau region', 'vacation rental Interlaken', 'Switzerland holiday', 'Little Heart Guesthouse', 'Superhost Interlaken', 'cozy apartments'],
  authors: [{ name: 'Little Heart Guesthouse' }],
  icons: {
    icon: [
      { url: '/logo/little-heart-icon.jpg', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/logo/little-heart-icon.jpg', type: 'image/jpeg' },
    ],
  },
  openGraph: {
    title: 'Little Heart Guesthouse - Cozy Apartments in Interlaken',
    description: 'Cozy apartments, generous hospitality. 5 beautiful apartments in central Interlaken, Switzerland. Superhost since 2016.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'de_DE',
    siteName: 'Little Heart Guesthouse',
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${playfair.variable} ${sacramento.variable} font-body antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow pt-24 md:pt-28">
              {children}
            </main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
