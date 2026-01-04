import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: 'Opal Heart Guesthouse | Luxury Apartments in Interlaken, Switzerland',
    template: '%s | Opal Heart Guesthouse',
  },
  description: 'Discover 5 beautiful apartments in central Interlaken, perfect for exploring the Swiss Alps and Jungfrau region. Superhost since 2016.',
  keywords: ['Interlaken apartments', 'Swiss Alps accommodation', 'Jungfrau region', 'vacation rental Interlaken', 'Switzerland holiday', 'Opal Heart Guesthouse', 'Superhost Interlaken'],
  authors: [{ name: 'Opal Heart Guesthouse' }],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Opal Heart Guesthouse - Your Alpine Sanctuary in Interlaken',
    description: 'Luxury apartments in central Interlaken, Switzerland. Superhost since 2016.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'de_DE',
    siteName: 'Opal Heart Guesthouse',
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
      <body className={`${inter.variable} ${playfair.variable} font-body antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow pt-20 md:pt-24">
              {children}
            </main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
