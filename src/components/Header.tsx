// components/Header.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

export default function Header({ 
  title, 
  subtitle, 
  showBackButton = false,
  backUrl = '/'
}: HeaderProps) {
  return (
    <div className="text-center mb-6 relative">
      {showBackButton && (
        <Link 
          href={backUrl}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Link>
      )}
      <h1 className="text-2xl font-bold text-primary">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}
