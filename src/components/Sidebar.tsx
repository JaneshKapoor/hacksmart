'use client';

import { useState } from 'react';
import {
    LayoutGrid,
    Home,
    BarChart3,
    Settings,
    HelpCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Zap,
} from 'lucide-react';

interface SidebarProps {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
];

const bottomItems = [
    { id: 'help', icon: HelpCircle, label: 'Help' },
    { id: 'logout', icon: LogOut, label: 'Logout' },
];

export function Sidebar({ activeTab = 'dashboard', onTabChange }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

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
            {/* Logo */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-md)',
                    marginBottom: 'var(--space-lg)',
                }}
            >
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Zap size={20} color="white" />
                </div>
            </div>

            {/* Main Navigation */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange?.(item.id)}
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

            {/* Bottom Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange?.(item.id)}
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
                            title={item.label}
                        >
                            <Icon size={20} />
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
