'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';

interface LogoProps {
  variant?: 'stacked' | 'horizontal' | 'icon';
  className?: string;
  href?: string;
  inverted?: boolean;
}

export default function Logo({
  variant = 'horizontal',
  className = '',
  href = '/',
  inverted = false
}: LogoProps) {
  // Use the actual logo image
  const logoSrc = '/logo/little-heart-logo.jpg';

  const content = (
    <div className={`flex items-center ${variant === 'stacked' ? 'flex-col' : 'flex-row'} ${className}`}>
      {variant === 'icon' ? (
        // Icon only - heart symbol (fallback for icon variant)
        <div className={`flex items-center justify-center rounded-full ${inverted ? 'bg-heart-cream-50' : 'bg-heart-coral-500'}`} style={{ width: 48, height: 48 }}>
          <span className={`text-2xl ${inverted ? 'text-heart-coral-500' : 'text-white'}`}>
            &#10084;
          </span>
        </div>
      ) : (
        // Full logo image
        <Image
          src={logoSrc}
          alt="Little Heart Guesthouse Interlaken"
          width={variant === 'stacked' ? 200 : 280}
          height={variant === 'stacked' ? 150 : 80}
          className={`object-contain ${inverted ? 'brightness-0 invert' : ''}`}
          priority
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}
