'use client';

import { SimulationNotification } from '@/simulation/types';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useState } from 'react';

interface NotificationBannerProps {
    notifications: SimulationNotification[];
}

export function NotificationBanner({ notifications }: NotificationBannerProps) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    // Show only the 3 most recent, non-dismissed notifications
    const visibleNotifications = notifications
        .filter(n => !dismissedIds.has(n.id))
        .slice(-3)
        .reverse();

    if (visibleNotifications.length === 0) {
        return null;
    }

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => new Set([...prev, id]));
    };

    const getNotificationStyle = (type: SimulationNotification['type']) => {
        switch (type) {
            case 'battery_warning':
                return {
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    icon: AlertTriangle,
                };
            case 'reroute_failure':
                return {
                    background: 'rgba(251, 146, 60, 0.1)',
                    borderColor: 'rgba(251, 146, 60, 0.3)',
                    color: '#fb923c',
                    icon: XCircle,
                };
            case 'station_failure':
                return {
                    background: 'rgba(234, 179, 8, 0.1)',
                    borderColor: 'rgba(234, 179, 8, 0.3)',
                    color: '#eab308',
                    icon: AlertTriangle,
                };
            case 'info':
            default:
                return {
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6',
                    icon: Info,
                };
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
                padding: '0 var(--space-md)',
            }}
        >
            {visibleNotifications.map(notification => {
                const style = getNotificationStyle(notification.type);
                const Icon = style.icon;

                return (
                    <div
                        key={notification.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: style.background,
                            border: `1px solid ${style.borderColor}`,
                            borderRadius: 'var(--radius-md)',
                            color: style.color,
                            fontSize: '0.875rem',
                            lineHeight: '1.25rem',
                        }}
                    >
                        <Icon size={16} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{notification.message}</div>
                            <div
                                style={{
                                    fontSize: '0.75rem',
                                    opacity: 0.7,
                                    marginTop: '2px',
                                }}
                            >
                                {notification.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                        <button
                            onClick={() => handleDismiss(notification.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: style.color,
                                opacity: 0.6,
                                transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
