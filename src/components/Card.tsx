// components/Card.tsx
'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl ${className}`}>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
