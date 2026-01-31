'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, MapPin, Zap } from 'lucide-react';

export function Header() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Control Center', icon: Activity },
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <header className="sticky top-0 z-40 w-full">
            <div className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-screen-2xl mx-auto px-6 py-3.5">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">
                                    Electri<span className="text-cyan-400">Go</span>
                                </h1>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Digital Twin</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex items-center gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${isActive
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                            }
                    `}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* City Selector + Time */}
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin size={16} className="text-slate-500" />
                                <span className="text-slate-400">Delhi</span>
                            </div>
                            <div className="h-5 w-px bg-slate-700" />
                            <div className="text-sm">
                                <span className="text-slate-500">Live</span>
                                <span className="ml-2 inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-slate-300 font-medium">
                                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
