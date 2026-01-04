'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';

interface LogoProps {
  variant?: 'horizontal' | 'icon';
  className?: string;
  href?: string;
}

export default function Logo({
  variant = 'horizontal',
  className = '',
  href = '/'
}: LogoProps) {
  const logoSrc = variant === 'horizontal'
    ? '/logo/logo_opal_heart.png'
    : '/images/favicon.png';

  const dimensions = variant === 'horizontal'
    ? { width: 200, height: 60 }
    : { width: 48, height: 48 };

  const content = (
    <Image
      src={logoSrc}
      alt="Opal Heart Guesthouse"
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
