'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    dot?: boolean;
    pulse?: boolean;
    className?: string;
}

export function Badge({
    variant = 'neutral',
    children,
    dot = false,
    pulse = false,
    className = '',
}: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        danger: 'bg-red-500/15 text-red-400 border-red-500/30',
        info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    };

    const dotColors: Record<BadgeVariant, string> = {
        success: 'bg-emerald-400',
        warning: 'bg-amber-400',
        danger: 'bg-red-400',
        info: 'bg-blue-400',
        neutral: 'bg-slate-400',
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5
        text-xs font-medium
        rounded-full border
        ${variants[variant]}
        ${className}
      `}
        >
            {dot && (
                <span
                    className={`
            w-1.5 h-1.5 rounded-full
            ${dotColors[variant]}
            ${pulse ? 'animate-pulse' : ''}
          `}
                />
            )}
            {children}
        </span>
    );
}
