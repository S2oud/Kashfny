// components/Button.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({ 
  children, 
  onClick, 
  href, 
  variant = 'primary', 
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = ''
}: ButtonProps) {
  const baseStyles = "py-2 px-4 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantStyles = {
    primary: "border border-transparent text-white bg-primary hover:bg-primary/90 focus:ring-primary",
    secondary: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary",
    danger: "border border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  };
  
  const widthStyle = fullWidth ? "w-full" : "";
  
  const buttonStyle = `${baseStyles} ${variantStyles[variant]} ${widthStyle} ${className}`;
  
  if (href) {
    return (
      <Link 
        href={href}
        className={buttonStyle}
      >
        {children}
      </Link>
    );
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonStyle}
    >
      {children}
    </button>
  );
}
