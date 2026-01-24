'use client';

import { ReactNode } from 'react';
import { Header } from './Header';

interface PageLayoutProps {
    children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-950">
            <Header />
            <main className="max-w-screen-2xl mx-auto px-6 py-6">
                {children}
            </main>
        </div>
    );
}
