'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

export default function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/logo/logo_opal_heart.png"
                alt="Opal Heart Guesthouse"
                width={240}
                height={72}
                className="brightness-0 invert h-16 w-auto"
              />
            </Link>
            <p className="text-slate-400 text-sm">
              {t('tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
              {t('quickLinks')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">
                  {nav('home')}
                </Link>
              </li>
              <li>
                <Link href="/apartments" className="text-slate-400 hover:text-white transition-colors text-sm">
                  {nav('apartments')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-400 hover:text-white transition-colors text-sm">
                  {nav('about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-white transition-colors text-sm">
                  {nav('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Book With Us */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
              {t('followUs')}
            </h3>
            <a
              href="https://www.airbnb.com/users/show/140468679"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 16.894c-.236.67-.94 1.294-1.685 1.504-.18.05-.37.077-.567.077-.457 0-.932-.145-1.424-.432-.633-.37-1.25-.95-1.833-1.723-.495.476-1.015.862-1.544 1.146-.587.315-1.18.476-1.763.476-.507 0-.984-.126-1.418-.373-.513-.294-.916-.72-1.197-1.267-.28-.548-.422-1.173-.422-1.858 0-.943.294-1.793.874-2.533.58-.74 1.373-1.327 2.358-1.745-.126-.37-.22-.72-.28-1.045-.067-.37-.1-.718-.1-1.04 0-.757.22-1.378.655-1.852.434-.474.994-.712 1.668-.712.447 0 .855.126 1.213.376.36.25.65.6.865 1.05.216.448.324.95.324 1.5 0 .582-.135 1.14-.404 1.665l1.63 2.833c.277-.465.48-.988.606-1.565l1.664.39c-.17.793-.447 1.51-.83 2.145l1.63 2.833c.16.277.1.633-.136.86zm-4.55-3.76l-1.36-2.36c-.48.337-.854.72-1.12 1.146-.266.426-.4.88-.4 1.358 0 .342.075.644.223.902.148.257.35.453.606.586.256.134.535.2.836.2.324 0 .662-.093 1.013-.28.35-.188.697-.448 1.04-.78l-.84-1.772zm.166-4.83c0-.317-.066-.6-.2-.848-.132-.248-.306-.437-.52-.567-.214-.13-.448-.195-.702-.195-.316 0-.58.11-.792.33-.212.22-.318.507-.318.862 0 .178.022.37.066.574.044.204.117.43.218.676l1.64-1.107c.067-.196.1-.388.1-.574l.508-.15z"/>
              </svg>
              <span className="text-sm">Airbnb</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-400 text-sm">
              © {currentYear} Opal Heart Guesthouse. {t('copyright')}
            </p>
            <p className="text-slate-500 text-sm flex items-center">
              {t('madeWith')} <span className="text-opal-teal mx-1">❤️</span> in Interlaken
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
