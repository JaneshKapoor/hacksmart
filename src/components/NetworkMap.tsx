'use client';

import { Station, Driver } from '@/simulation/station';

interface NetworkMapProps {
    stations: Station[];
    drivers: Driver[];
    onStationClick?: (station: Station) => void;
}

export function NetworkMap({ stations, drivers, onStationClick }: NetworkMapProps) {
    const getStatusColor = (status: Station['status']) => {
        switch (status) {
            case 'operational':
                return 'bg-emerald-500';
            case 'low_inventory':
                return 'bg-amber-500';
            case 'overloaded':
                return 'bg-orange-500';
            case 'fire':
                return 'bg-red-500';
            case 'power_outage':
                return 'bg-gray-500';
            case 'offline':
                return 'bg-slate-600';
            default:
                return 'bg-emerald-500';
        }
    };

    const getStatusAnimation = (status: Station['status']) => {
        if (status === 'fire') return 'station-fire';
        if (status === 'operational') return 'station-pulse';
        return '';
    };

    const getStatusIcon = (status: Station['status']) => {
        switch (status) {
            case 'fire':
                return '🔥';
            case 'power_outage':
                return '⚡';
            case 'overloaded':
                return '⚠️';
            case 'low_inventory':
                return '🔋';
            default:
                return '⚡';
        }
    };

    return (
        <div className="relative w-full h-[500px] glass-card overflow-hidden map-grid">
            {/* City background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-indigo-950/30 to-purple-950/50" />

            {/* Connection lines between stations */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {stations.map((station, i) =>
                    stations.slice(i + 1).map((otherStation) => {
                        const distance = Math.sqrt(
                            Math.pow(station.position.x - otherStation.position.x, 2) +
                            Math.pow(station.position.y - otherStation.position.y, 2)
                        );
                        if (distance < 35) {
                            return (
                                <line
                                    key={`${station.id}-${otherStation.id}`}
                                    x1={`${station.position.x}%`}
                                    y1={`${station.position.y}%`}
                                    x2={`${otherStation.position.x}%`}
                                    y2={`${otherStation.position.y}%`}
                                    className="connection-line"
                                />
                            );
                        }
                        return null;
                    })
                )}

                {/* Routes for rerouting drivers */}
                {drivers
                    .filter((d) => d.status === 'rerouting')
                    .map((driver) => {
                        const targetStation = stations.find((s) => s.id === driver.targetStationId);
                        if (!targetStation) return null;
                        return (
                            <line
                                key={`route-${driver.id}`}
                                x1={`${driver.position.x}%`}
                                y1={`${driver.position.y}%`}
                                x2={`${targetStation.position.x}%`}
                                y2={`${targetStation.position.y}%`}
                                stroke="#f59e0b"
                                strokeWidth="2"
                                className="route-line"
                            />
                        );
                    })}
            </svg>

            {/* Station nodes */}
            {stations.map((station) => (
                <div
                    key={station.id}
                    className={`station-node ${getStatusAnimation(station.status)}`}
                    style={{
                        left: `${station.position.x}%`,
                        top: `${station.position.y}%`,
                    }}
                    onClick={() => onStationClick?.(station)}
                >
                    <div
                        className={`relative w-12 h-12 rounded-full ${getStatusColor(station.status)} 
                       flex items-center justify-center text-white font-bold text-lg
                       shadow-lg transition-all duration-300`}
                    >
                        <span className="text-lg">{getStatusIcon(station.status)}</span>

                        {/* Queue indicator */}
                        {station.queueLength > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                            flex items-center justify-center text-xs font-bold animate-bounce">
                                {station.queueLength}
                            </div>
                        )}
                    </div>

                    {/* Station name tooltip */}
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap
                        bg-slate-900/90 px-2 py-1 rounded text-xs text-white opacity-0 
                        group-hover:opacity-100 transition-opacity pointer-events-none">
                        {station.name}
                    </div>

                    {/* Utilization ring */}
                    <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                        <circle
                            cx="24"
                            cy="24"
                            r="22"
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="3"
                        />
                        <circle
                            cx="24"
                            cy="24"
                            r="22"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeDasharray={`${station.utilizationRate * 138} 138`}
                            className="transition-all duration-500"
                        />
                    </svg>
                </div>
            ))}

            {/* Driver dots */}
            {drivers.map((driver) => (
                <div
                    key={driver.id}
                    className={`driver-dot ${driver.status === 'rerouting' ? 'driver-rerouting' : ''}`}
                    style={{
                        left: `${driver.position.x}%`,
                        top: `${driver.position.y}%`,
                    }}
                />
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-card p-3 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">Operational</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-slate-300">Low Inventory</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-slate-300">Overloaded</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-slate-300">Fire/Emergency</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-slate-300">Driver</span>
                </div>
            </div>

            {/* Map title */}
            <div className="absolute top-4 left-4">
                <h3 className="text-lg font-semibold text-white">City Network Map</h3>
                <p className="text-xs text-slate-400">{stations.length} stations active</p>
            </div>
        </div>
    );
}
