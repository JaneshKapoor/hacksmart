'use client';

import { demandCurves } from '@/data/mockData';

interface DemandChartProps {
    currentHour?: number;
    demandMultiplier?: number;
}

export function DemandChart({ currentHour = 9, demandMultiplier = 1 }: DemandChartProps) {
    const maxLoad = Math.max(...demandCurves.map((d) => d.baseLoad * demandMultiplier));
    const chartHeight = 120;
    const chartWidth = 100;

    const getBarHeight = (load: number) => {
        return (load * demandMultiplier / maxLoad) * chartHeight;
    };

    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">24-Hour Demand Curve</h3>
                {demandMultiplier !== 1 && (
                    <span className="badge badge-warning">
                        {demandMultiplier}x Demand
                    </span>
                )}
            </div>

            <div className="relative h-32 flex items-end gap-0.5">
                {demandCurves.map((data, index) => {
                    const isCurrentHour = index === currentHour;
                    const barHeight = getBarHeight(data.baseLoad);

                    return (
                        <div
                            key={data.hour}
                            className="flex-1 flex flex-col items-center"
                            title={`${data.hour}:00 - ${(data.baseLoad * demandMultiplier * 100).toFixed(0)}% load`}
                        >
                            <div
                                className={`w-full rounded-t transition-all duration-500 ${isCurrentHour
                                        ? 'bg-gradient-to-t from-indigo-600 to-cyan-400'
                                        : data.baseLoad > 0.8
                                            ? 'bg-gradient-to-t from-orange-600 to-amber-400'
                                            : 'bg-gradient-to-t from-slate-600 to-slate-500'
                                    }`}
                                style={{
                                    height: `${barHeight}px`,
                                    opacity: isCurrentHour ? 1 : 0.6,
                                }}
                            />
                        </div>
                    );
                })}

                {/* Current hour indicator */}
                <div
                    className="absolute bottom-0 w-0.5 h-full bg-white/20"
                    style={{ left: `${(currentHour / 24) * 100}%` }}
                />
            </div>

            {/* Time labels */}
            <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
            </div>

            {/* Peak indicators */}
            <div className="flex justify-between mt-3 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-slate-400">Peak Hours</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-slate-400">Current</span>
                </div>
            </div>
        </div>
    );
}
