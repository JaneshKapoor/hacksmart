'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout';
import { useSimulation } from '@/hooks/useSimulation';
import { Search, SlidersHorizontal, MapPin, Eye, Navigation } from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'inactive' | 'on_break';

function getStatusCategory(status: string): { label: string; color: string; bg: string } {
    switch (status) {
        case 'en_route':
        case 'seeking':
        case 'swapping':
        case 'rerouting':
            return { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
        case 'complete':
        case 'abandoned':
            return { label: 'Inactive', color: 'text-red-400', bg: 'bg-red-500/20' };
        default:
            return { label: 'On Break', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    }
}

function getFilterCategory(status: string): StatusFilter {
    switch (status) {
        case 'en_route':
        case 'seeking':
        case 'swapping':
        case 'rerouting':
            return 'active';
        case 'complete':
        case 'abandoned':
            return 'inactive';
        default:
            return 'on_break';
    }
}

export default function DriversPage() {
    const { state } = useSimulation();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const filteredDrivers = useMemo(() => {
        if (!state) return [];
        return state.drivers.filter((driver) => {
            // Search filter
            const query = searchQuery.toLowerCase();
            if (query) {
                const matchesName = driver.name.toLowerCase().includes(query);
                const matchesVehicle = driver.vehicleId.toLowerCase().includes(query);
                if (!matchesName && !matchesVehicle) return false;
            }
            // Status filter
            if (statusFilter !== 'all') {
                if (getFilterCategory(driver.status) !== statusFilter) return false;
            }
            return true;
        });
    }, [state, searchQuery, statusFilter]);

    const stationNameMap = useMemo(() => {
        if (!state) return new Map<string, string>();
        const map = new Map<string, string>();
        state.stations.forEach((s) => map.set(s.id, s.name));
        return map;
    }, [state]);

    if (!state) {
        return (
            <AppShell>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Loading Drivers...</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="p-6">
                {/* Page header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-white">Drivers</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {state.drivers.length} total drivers in network
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name or vehicle..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64 pl-9 pr-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                        </div>

                        {/* Status filter */}
                        <div className="relative">
                            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="pl-9 pr-8 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="on_break">On Break</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="text-left py-3 pl-5 pr-4 text-slate-400 font-medium text-xs">Driver Name</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs">Status</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs">Current Location</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs">Vehicle ID</th>
                                    <th className="text-right py-3 px-4 text-slate-400 font-medium text-xs">Battery Level</th>
                                    <th className="text-center py-3 pl-4 pr-5 text-slate-400 font-medium text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDrivers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">
                                            {state.drivers.length === 0
                                                ? 'No drivers in simulation. Start the simulation to see drivers.'
                                                : 'No drivers match your search or filter.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDrivers.map((driver) => {
                                        const statusInfo = getStatusCategory(driver.status);
                                        const stationName = driver.targetStationId
                                            ? stationNameMap.get(driver.targetStationId) || 'Unknown'
                                            : 'No destination';

                                        return (
                                            <tr
                                                key={driver.id}
                                                className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors"
                                            >
                                                <td className="py-3 pl-5 pr-4">
                                                    <span className="text-white font-medium">{driver.name}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                                                        <MapPin size={12} className="text-slate-500 shrink-0" />
                                                        {stationName}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-slate-400 font-mono text-xs">{driver.vehicleId}</span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    driver.batteryPercent < 20 ? 'bg-red-500' :
                                                                    driver.batteryPercent < 45 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                }`}
                                                                style={{ width: `${driver.batteryPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-medium tabular-nums ${
                                                            driver.batteryPercent < 20 ? 'text-red-400' :
                                                            driver.batteryPercent < 45 ? 'text-amber-400' : 'text-emerald-400'
                                                        }`}>
                                                            {driver.batteryPercent}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pl-4 pr-5">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            title="View details"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            title="Locate on map"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                                                        >
                                                            <Navigation size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
