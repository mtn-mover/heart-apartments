'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function DianaSection() {
  const t = useTranslations('diana');

  const stats = [
    { icon: '⭐', text: t('superhost') },
    { icon: '🌟', text: t('guests') },
    { icon: '💬', text: t('responseRate') },
    { icon: '⚡', text: t('responseTime') },
    { icon: '🗣️', text: t('languages') },
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-heart-sage-50 to-heart-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Photo Placeholder */}
          <div className="relative">
            <div className="aspect-square max-w-[400px] mx-auto rounded-2xl bg-heart-sage-100 flex items-center justify-center border-2 border-heart-coral-300 shadow-lg">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">👩‍💼</div>
                <p className="text-heart-charcoal-700 font-medium">Diana&apos;s Photo</p>
                <p className="text-heart-charcoal-500 text-sm">Coming Soon</p>
              </div>
            </div>
            {/* Superhost Badge */}
            <div className="absolute -bottom-4 -right-4 lg:right-auto lg:-left-4 bg-white rounded-xl shadow-lg p-4 border border-heart-coral-200">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-semibold text-heart-charcoal-800">Superhost</p>
                  <p className="text-xs text-heart-charcoal-500">seit 2016</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-heart-charcoal-800 mb-6 font-heading">
              {t('title')}
            </h2>
            <p className="text-lg text-heart-charcoal-700 mb-8 leading-relaxed">
              {t('intro')}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 bg-white rounded-lg p-3 shadow-sm border border-heart-sage-200"
                >
                  <span className="text-xl text-heart-coral-500">{stat.icon}</span>
                  <span className="text-sm text-heart-charcoal-700">{stat.text}</span>
                </div>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="border-l-4 border-heart-coral-500 pl-4 mb-8">
              <p className="text-heart-charcoal-600 italic">&ldquo;{t('quote')}&rdquo;</p>
            </blockquote>

            {/* CTA Button */}
            <Link
              href="/about"
              className="inline-flex items-center px-6 py-3 bg-heart-coral-500 hover:bg-heart-coral-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {t('moreAbout')}
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
