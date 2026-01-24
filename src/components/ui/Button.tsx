'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    isLoading?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'md',
    children,
    isLoading,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = `
    inline-flex items-center justify-center gap-2 font-medium
    rounded-lg transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

    const variants = {
        primary: `
      bg-gradient-to-r from-blue-600 to-blue-500
      hover:from-blue-500 hover:to-blue-400
      text-white shadow-lg shadow-blue-500/25
      focus:ring-blue-500
    `,
        secondary: `
      bg-slate-800 border border-slate-700
      hover:bg-slate-700 hover:border-slate-600
      text-slate-200
      focus:ring-slate-500
    `,
        danger: `
      bg-gradient-to-r from-red-600 to-rose-500
      hover:from-red-500 hover:to-rose-400
      text-white shadow-lg shadow-red-500/25
      focus:ring-red-500
    `,
        ghost: `
      bg-transparent hover:bg-slate-800
      text-slate-400 hover:text-slate-200
      focus:ring-slate-500
    `,
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : null}
            {children}
        </button>
    );
}
