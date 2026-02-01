'use client';

import {
    Home,
    Play,
    Pause,
    RotateCcw,
    Cloud,
    Leaf,
    Users,
    MapPin,
    Zap,
    ChevronDown,
} from 'lucide-react';
import { SimulationState, WeatherData, CarbonData } from '@/simulation/types';

interface HeaderProps {
    state: SimulationState | null;
    onToggleSimulation: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
}

export function Header({ state, onToggleSimulation, onReset, onSpeedChange }: HeaderProps) {
    const isRunning = state?.isRunning && !state?.isPaused;
    const currentTime = state?.currentTime || new Date();
    const day = state?.day || 1;
    const weather = state?.weather;
    const carbon = state?.carbon;

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <header
            style={{
                height: '56px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 var(--space-lg)',
                position: 'relative',
            }}
        >
            {/* Left: Logo & Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, maxWidth: '40%' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Zap size={18} color="white" />
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>ElectriGo</span>
                </div>

                {/* Navigation */}
                <button className="btn btn-ghost" style={{ gap: 'var(--space-xs)' }}>
                    <Home size={16} />
                    <span>Home</span>
                </button>
            </div>

            {/* Center: Time & Status - Absolutely Centered */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-xs) var(--space-md)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: 10,
                }}
            >
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {state?.isPaused ? 'Paused' : 'Running'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {formatTime(currentTime)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Day {day}
                </span>
            </div>

            {/* Right side container */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, maxWidth: '40%', justifyContent: 'flex-end' }}>
                {/* Reset Button */}
                <button
                    className="btn btn-ghost"
                    onClick={onReset}
                    style={{ padding: 'var(--space-xs) var(--space-sm)' }}
                    title="Reset Simulation"
                >
                    <RotateCcw size={16} />
                </button>

                {/* Run Simulation Button */}
                <button
                    className="btn btn-primary"
                    onClick={onToggleSimulation}
                    style={{ gap: 'var(--space-xs)' }}
                >
                    {isRunning ? <Pause size={16} /> : <Play size={16} />}
                    <span>{isRunning ? 'Pause' : 'Run Simulation'}</span>
                </button>

                {/* Weather */}
                {weather && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Cloud size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.875rem' }}>{weather.temperature}°C</span>
                    </div>
                )}

                {/* Carbon */}
                {carbon && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Leaf size={16} color="var(--brand-primary)" />
                        <span style={{ fontSize: '0.875rem' }}>{carbon.carbonIntensity} gCO2</span>
                    </div>
                )}

                {/* Drivers & Stations */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-xs) var(--space-md)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem' }}>{state?.kpis.activeDrivers || 0} drivers</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem' }}>{state?.kpis.totalStations || 0} stations</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
