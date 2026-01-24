'use client';

interface SimulationControlsProps {
    isRunning: boolean;
    speed: number;
    time: number;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
}

export function SimulationControls({
    isRunning,
    speed,
    time,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
}: SimulationControlsProps) {
    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const speeds = [1, 2, 4, 8];

    return (
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
                {!isRunning ? (
                    <button
                        className="btn btn-primary"
                        onClick={onStart}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Run Simulation
                    </button>
                ) : (
                    <button
                        className="btn btn-secondary"
                        onClick={onPause}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Pause
                    </button>
                )}

                <button
                    className="btn btn-secondary"
                    onClick={onReset}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    Reset
                </button>
            </div>

            {/* Time Display */}
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Simulation Time</div>
                    <div className="text-2xl font-bold text-white font-mono">{formatTime(time)}</div>
                </div>

                {/* Speed indicator */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {isRunning ? 'RUNNING' : 'PAUSED'}
                </div>
            </div>

            {/* Speed Controls */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Speed:</span>
                <div className="flex bg-slate-800/50 rounded-lg p-1">
                    {speeds.map((s) => (
                        <button
                            key={s}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${speed === s
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                            onClick={() => onSpeedChange(s)}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
