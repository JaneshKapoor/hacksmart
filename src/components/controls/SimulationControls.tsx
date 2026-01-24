'use client';

import { useState } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { Button, SegmentedControl } from '@/components/ui';

interface SimulationControlsProps {
    isRunning: boolean;
    speed: number;
    time: number;
    day: number;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
}

export function SimulationControls({
    isRunning,
    speed,
    time,
    day,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
}: SimulationControlsProps) {
    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60) % 24;
        const mins = minutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
    };

    const speedOptions = [
        { value: '1', label: '1x' },
        { value: '2', label: '2x' },
        { value: '4', label: '4x' },
        { value: '8', label: '8x' },
    ];

    return (
        <div className="flex items-center justify-between gap-6 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl px-5 py-3">
            {/* Left: Playback controls */}
            <div className="flex items-center gap-2">
                {!isRunning ? (
                    <Button variant="primary" size="md" onClick={onStart}>
                        <Play size={16} />
                        Run Simulation
                    </Button>
                ) : (
                    <Button variant="secondary" size="md" onClick={onPause}>
                        <Pause size={16} />
                        Pause
                    </Button>
                )}

                <Button variant="ghost" size="md" onClick={onReset}>
                    <RotateCcw size={16} />
                </Button>
            </div>

            {/* Center: Time display */}
            <div className="flex items-center gap-6">
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Simulation Time</div>
                    <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                            {isRunning ? 'LIVE' : 'PAUSED'}
                        </div>
                        <div className="text-xl font-bold text-white font-mono tracking-wide">
                            {formatTime(time)}
                        </div>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-700" />

                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Day</div>
                    <div className="text-xl font-bold text-white">{day}</div>
                </div>

                {/* Progress bar */}
                <div className="w-32">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                            style={{ width: `${((time % 1440) / 1440) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-500">
                        <span>12 AM</span>
                        <span>12 PM</span>
                        <span>12 AM</span>
                    </div>
                </div>
            </div>

            {/* Right: Speed control */}
            <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Speed</span>
                <SegmentedControl
                    options={speedOptions}
                    value={speed.toString()}
                    onChange={(val) => onSpeedChange(Number(val))}
                />
            </div>
        </div>
    );
}
