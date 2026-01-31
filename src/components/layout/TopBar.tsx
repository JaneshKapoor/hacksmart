'use client';

import { useRouter } from 'next/navigation';
import { Zap, Play, Pause, Cloud, Home } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';

export function TopBar() {
    const router = useRouter();
    const { state, start, pause, weatherData, carbonData } = useSimulation();

    return (
        <header className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
            {/* Left: Logo + Home */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-base font-bold text-white">
                        Electri<span className="text-cyan-400">Go</span>
                    </span>
                </button>

                <div className="h-6 w-px bg-slate-700/50" />

                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs border border-slate-700/50"
                >
                    <Home size={12} />
                    Home
                </button>
            </div>

            {/* Right: Sim controls + badges */}
            <div className="flex items-center gap-3">
                {/* Sim play/pause */}
                {state && (
                    <>
                        {!state.isRunning ? (
                            <button
                                onClick={start}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-xs transition-colors"
                            >
                                <Play size={13} />
                                Run Simulation
                            </button>
                        ) : (
                            <button
                                onClick={pause}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium text-xs transition-colors"
                            >
                                <Pause size={13} />
                                Pause
                            </button>
                        )}
                    </>
                )}

                {/* Weather badge */}
                {weatherData && !weatherData.isFallback && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-sky-500/10 border border-sky-500/30 text-sky-300">
                        <Cloud size={11} />
                        <span>{weatherData.temperature.toFixed(0)}C</span>
                    </div>
                )}

                {/* Carbon badge */}
                {carbonData && !carbonData.isFallback && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border ${
                        carbonData.carbonIntensity > 800
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                        <Zap size={11} />
                        <span>{carbonData.carbonIntensity} gCO2</span>
                    </div>
                )}

                {/* User avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs text-slate-400 font-medium">
                    A
                </div>
            </div>
        </header>
    );
}
