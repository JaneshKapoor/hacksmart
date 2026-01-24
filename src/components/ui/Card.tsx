'use client';

import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
    children,
    className = '',
    hover = true,
    glow = false,
    padding = 'md',
}: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={`
        bg-slate-900/80 backdrop-blur-xl
        border border-slate-800/50
        rounded-xl
        transition-all duration-300 ease-out
        ${hover ? 'hover:border-slate-700/80 hover:bg-slate-900/90' : ''}
        ${glow ? 'shadow-lg shadow-blue-500/10' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-4">
            <div>
                <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
