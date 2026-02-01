'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutGrid,
    Users,
    LogOut,
    AlertTriangle,
} from 'lucide-react';
import { logout } from '@/app/login/actions';

interface SidebarProps {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', path: '/' },
    { id: 'drivers', icon: Users, label: 'Drivers', path: '/drivers' },
    { id: 'last-mile', icon: AlertTriangle, label: 'Last Mile', path: '/last-mile' },
];

export function Sidebar({ activeTab = 'dashboard', onTabChange }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const router = useRouter();

    const handleNavClick = (item: typeof navItems[0]) => {
        router.push(item.path);
        onTabChange?.(item.id);
    };

    return (
        <aside
            className="sidebar"
            style={{
                width: isCollapsed ? '60px' : '60px',
                minWidth: isCollapsed ? '60px' : '60px',
                height: '100vh',
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--space-md) 0',
                transition: 'width var(--transition-normal)',
            }}
        >
            {/* Main Navigation */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '44px',
                                height: '44px',
                                margin: '0 auto',
                                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                            }}
                            title={item.label}
                        >
                            <Icon size={20} />
                        </button>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <button
                    onClick={() => logout()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        margin: '0 auto',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                    }}
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
}
