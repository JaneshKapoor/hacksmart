'use client';

import { SimulationNotification } from '@/simulation/types';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NotificationBannerProps {
    notifications: SimulationNotification[];
}

export function NotificationBanner({ notifications }: NotificationBannerProps) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => new Set([...prev, id]));
    };

    // Show only the most recent, non-dismissed notification
    const visibleNotifications = notifications
        .filter(n => !dismissedIds.has(n.id))
        .slice(-1);

    // Auto-dismiss after 2 seconds
    useEffect(() => {
        if (visibleNotifications.length > 0) {
            const notification = visibleNotifications[0];
            const timer = setTimeout(() => {
                handleDismiss(notification.id);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [visibleNotifications]);

    if (visibleNotifications.length === 0) {
        return null;
    }

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
                position: 'fixed',
                top: '80px',
                right: 'var(--space-lg)',
                zIndex: 1000,
                maxWidth: '400px',
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
                            padding: 'var(--space-md)',
                            background: style.background,
                            border: `1px solid ${style.borderColor}`,
                            borderRadius: 'var(--radius-lg)',
                            color: style.color,
                            fontSize: '0.875rem',
                            lineHeight: '1.25rem',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                            animation: 'slideInRight 0.3s ease-out',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <Icon size={18} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{notification.message}</div>
                            <div
                                style={{
                                    fontSize: '0.75rem',
                                    opacity: 0.7,
                                    marginTop: '4px',
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
            <style jsx>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
