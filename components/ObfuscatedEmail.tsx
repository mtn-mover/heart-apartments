'use client';

import { useState, useEffect } from 'react';

interface ObfuscatedEmailProps {
  user: string;
  domain: string;
  className?: string;
}

// Assembles email address client-side only to prevent crawler scraping
export default function ObfuscatedEmail({ user, domain, className }: ObfuscatedEmailProps) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(`${user}@${domain}`);
  }, [user, domain]);

  if (!email) {
    return <span className={className}>[JavaScript required]</span>;
  }

  return (
    <a href={`mailto:${email}`} className={className}>
      {email}
    </a>
  );
}
