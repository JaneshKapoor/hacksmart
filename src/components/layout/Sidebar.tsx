'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Activity, Settings, LogOut } from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/drivers', label: 'Drivers', icon: Users },
    { href: '/analytics', label: 'Analytics', icon: Activity },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-[72px] bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 shrink-0">
            {/* Nav items */}
            <nav className="flex flex-col items-center gap-2 flex-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            <Icon size={20} />
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom icons */}
            <div className="flex flex-col items-center gap-2">
                <button
                    title="Settings"
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
                >
                    <Settings size={20} />
                </button>
                <button
                    title="Logout"
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );
}
