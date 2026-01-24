'use client';

import { Station } from '@/simulation/station';

interface StationDetailsProps {
    station: Station | null;
    onClose: () => void;
}

export function StationDetails({ station, onClose }: StationDetailsProps) {
    if (!station) return null;

    const getStatusColor = (status: Station['status']) => {
        switch (status) {
            case 'operational':
                return 'text-emerald-400';
            case 'low_inventory':
                return 'text-amber-400';
            case 'overloaded':
                return 'text-orange-400';
            case 'fire':
                return 'text-red-400';
            case 'power_outage':
                return 'text-gray-400';
            default:
                return 'text-slate-400';
        }
    };

    const getStatusBadge = (status: Station['status']) => {
        switch (status) {
            case 'operational':
                return <span className="badge badge-success">Operational</span>;
            case 'low_inventory':
                return <span className="badge badge-warning">Low Inventory</span>;
            case 'overloaded':
                return <span className="badge badge-warning">Overloaded</span>;
            case 'fire':
                return <span className="badge badge-danger">🔥 Fire Alert</span>;
            case 'power_outage':
                return <span className="badge badge-danger">⚡ Power Outage</span>;
            default:
                return <span className="badge badge-info">{status}</span>;
        }
    };

    const inventoryPercent = (station.currentInventory / station.inventoryCap) * 100;
    const chargerPercent = (station.activeChargers / station.chargers) * 100;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 fade-in">
            <div className="glass-card p-6 max-w-md w-full mx-4 slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{station.name}</h2>
                        <p className="text-xs text-slate-400">{station.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Status */}
                <div className="mb-6">
                    {getStatusBadge(station.status)}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Queue Length</div>
                        <div className={`text-2xl font-bold ${station.queueLength > 5 ? 'text-red-400' : 'text-white'}`}>
                            {station.queueLength}
                        </div>
                        <div className="text-xs text-slate-500">vehicles waiting</div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Avg Wait Time</div>
                        <div className={`text-2xl font-bold ${station.avgWaitTime > 5 ? 'text-amber-400' : 'text-white'}`}>
                            {station.avgWaitTime.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-500">minutes</div>
                    </div>
                </div>

                {/* Inventory Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Battery Inventory</span>
                        <span className="text-sm font-medium text-white">
                            {station.currentInventory} / {station.inventoryCap}
                        </span>
                    </div>
                    <div className="progress-bar h-3">
                        <div
                            className={`progress-bar-fill ${inventoryPercent < 20
                                    ? 'bg-red-500'
                                    : inventoryPercent < 50
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                }`}
                            style={{ width: `${inventoryPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                        <span>🔋 {station.chargingBatteries} charging</span>
                        <span>{inventoryPercent.toFixed(0)}% full</span>
                    </div>
                </div>

                {/* Charger Status */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Charger Status</span>
                        <span className="text-sm font-medium text-white">
                            {station.activeChargers} / {station.chargers} active
                        </span>
                    </div>
                    <div className="progress-bar h-3">
                        <div
                            className={`progress-bar-fill ${chargerPercent < 50 ? 'bg-red-500' : 'bg-indigo-500'
                                }`}
                            style={{ width: `${chargerPercent}%` }}
                        />
                    </div>
                </div>

                {/* Utilization */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Charger Utilization</span>
                        <span className={`text-sm font-medium ${station.utilizationRate > 0.9 ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                            {(station.utilizationRate * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="progress-bar h-3">
                        <div
                            className={`progress-bar-fill ${station.utilizationRate > 0.9
                                    ? 'bg-red-500'
                                    : station.utilizationRate > 0.7
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                }`}
                            style={{ width: `${station.utilizationRate * 100}%` }}
                        />
                    </div>
                </div>

                {/* Location */}
                <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-700">
                    📍 Position: ({station.position.x.toFixed(1)}, {station.position.y.toFixed(1)})
                </div>
            </div>
        </div>
    );
}
