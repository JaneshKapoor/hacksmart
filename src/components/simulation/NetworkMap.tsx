'use client';

import { useState } from 'react';
import { MapPin, Zap, AlertTriangle, Flame, Battery, Users } from 'lucide-react';
import { Station, Driver } from '@/simulation/types';
import { Badge } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';

interface NetworkMapProps {
    stations: Station[];
    drivers: Driver[];
    onStationClick?: (station: Station) => void;
    onAddStation?: (position: { x: number; y: number }) => void;
    isAddingStation?: boolean;
    showCoverage?: boolean;
    showConnections?: boolean;
    showDrivers?: boolean;
}

export function NetworkMap({
    stations,
    drivers,
    onStationClick,
    onAddStation,
    isAddingStation = false,
    showCoverage = false,
    showConnections = true,
    showDrivers = true,
}: NetworkMapProps) {
    const [hoveredStation, setHoveredStation] = useState<string | null>(null);

    const getStatusColor = (status: Station['status']) => {
        switch (status) {
            case 'operational':
                return { bg: 'bg-emerald-500', border: 'border-emerald-400', shadow: 'shadow-emerald-500/30' };
            case 'low_inventory':
                return { bg: 'bg-amber-500', border: 'border-amber-400', shadow: 'shadow-amber-500/30' };
            case 'overloaded':
                return { bg: 'bg-orange-500', border: 'border-orange-400', shadow: 'shadow-orange-500/30' };
            case 'fire':
                return { bg: 'bg-red-500', border: 'border-red-400', shadow: 'shadow-red-500/50' };
            case 'power_outage':
                return { bg: 'bg-slate-500', border: 'border-slate-400', shadow: 'shadow-slate-500/30' };
            case 'maintenance':
                return { bg: 'bg-blue-500', border: 'border-blue-400', shadow: 'shadow-blue-500/30' };
            case 'offline':
                return { bg: 'bg-slate-600', border: 'border-slate-500', shadow: '' };
            default:
                return { bg: 'bg-emerald-500', border: 'border-emerald-400', shadow: 'shadow-emerald-500/30' };
        }
    };

    const getStatusIcon = (status: Station['status']) => {
        switch (status) {
            case 'fire':
                return <Flame className="w-4 h-4 text-white" />;
            case 'power_outage':
                return <Zap className="w-4 h-4 text-white" />;
            case 'overloaded':
                return <AlertTriangle className="w-4 h-4 text-white" />;
            case 'low_inventory':
                return <Battery className="w-4 h-4 text-white" />;
            default:
                return <Zap className="w-4 h-4 text-white" />;
        }
    };

    const getDriverColor = (batteryLevel: Driver['batteryLevel']) => {
        switch (batteryLevel) {
            case 'critical':
                return 'bg-red-400';
            case 'low':
                return 'bg-amber-400';
            default:
                return 'bg-cyan-400';
        }
    };

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAddingStation || !onAddStation) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddStation({ x, y });
    };

    return (
        <div
            className={`
        relative w-full h-full min-h-[400px] overflow-hidden
        ${isAddingStation ? 'cursor-crosshair' : ''}
      `}
            onClick={handleMapClick}
        >
            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-purple-950/30 pointer-events-none" />

            {/* Connection lines */}
            {showConnections && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {stations.map((station, i) =>
                        stations.slice(i + 1).map((other) => {
                            const distance = Math.sqrt(
                                Math.pow(station.position.x - other.position.x, 2) +
                                Math.pow(station.position.y - other.position.y, 2)
                            );
                            if (distance < 35) {
                                const isActive = station.status === 'operational' && other.status === 'operational';
                                return (
                                    <line
                                        key={`${station.id}-${other.id}`}
                                        x1={`${station.position.x}%`}
                                        y1={`${station.position.y}%`}
                                        x2={`${other.position.x}%`}
                                        y2={`${other.position.y}%`}
                                        stroke={isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(71, 85, 105, 0.2)'}
                                        strokeWidth="1"
                                        strokeDasharray={isActive ? 'none' : '4 4'}
                                    />
                                );
                            }
                            return null;
                        })
                    )}

                    {/* Rerouting paths */}
                    {drivers
                        .filter((d) => d.status === 'rerouting' && d.originalStationId)
                        .map((driver) => {
                            const target = stations.find((s) => s.id === driver.targetStationId);
                            if (!target) return null;
                            return (
                                <path
                                    key={`reroute-${driver.id}`}
                                    d={`M ${driver.position.x}% ${driver.position.y}% Q ${(driver.position.x + target.position.x) / 2}% ${Math.min(driver.position.y, target.position.y) - 10}% ${target.position.x}% ${target.position.y}%`}
                                    fill="none"
                                    stroke="#f59e0b"
                                    strokeWidth="2"
                                    strokeDasharray="8 4"
                                    className="animate-dash"
                                />
                            );
                        })}
                </svg>
            )}

            {/* Coverage circles */}
            {showCoverage &&
                stations.map((station) => (
                    <div
                        key={`coverage-${station.id}`}
                        className="absolute rounded-full border border-blue-500/20 bg-blue-500/5 pointer-events-none"
                        style={{
                            left: `${station.position.x}%`,
                            top: `${station.position.y}%`,
                            width: `${station.coverageRadius * 10}%`,
                            height: `${station.coverageRadius * 10}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                ))}

            {/* Station markers */}
            {stations.map((station) => {
                const colors = getStatusColor(station.status);
                const isHovered = hoveredStation === station.id;
                const isPulsing = station.status === 'operational' && station.queueLength > 0;
                const isEmergency = station.status === 'fire' || station.status === 'power_outage';

                return (
                    <div
                        key={station.id}
                        className="absolute group"
                        style={{
                            left: `${station.position.x}%`,
                            top: `${station.position.y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: isHovered ? 20 : 10,
                        }}
                        onMouseEnter={() => setHoveredStation(station.id)}
                        onMouseLeave={() => setHoveredStation(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStationClick?.(station);
                        }}
                    >
                        {/* Pulse effect */}
                        {isPulsing && (
                            <div
                                className={`absolute inset-0 ${colors.bg} rounded-full animate-ping opacity-30`}
                                style={{ width: '48px', height: '48px', left: '-4px', top: '-4px' }}
                            />
                        )}

                        {/* Emergency glow */}
                        {isEmergency && (
                            <div
                                className="absolute inset-0 bg-red-500 rounded-full animate-pulse blur-lg opacity-50"
                                style={{ width: '60px', height: '60px', left: '-10px', top: '-10px' }}
                            />
                        )}

                        {/* Station node */}
                        <div
                            className={`
                relative w-10 h-10 rounded-full 
                ${colors.bg} ${colors.shadow}
                border-2 ${colors.border}
                flex items-center justify-center
                cursor-pointer
                transition-transform duration-200 ease-out
                shadow-lg
                ${isHovered ? 'scale-125' : ''}
                ${station.isNew ? 'animate-bounce' : ''}
              `}
                        >
                            {getStatusIcon(station.status)}

                            {/* Queue badge */}
                            {station.queueLength > 0 && (
                                <div
                                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] 
                             bg-slate-900 border border-slate-700 rounded-full
                             flex items-center justify-center"
                                >
                                    <span className="text-[10px] font-bold text-white px-1">
                                        {station.queueLength}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Tooltip card */}
                        {isHovered && (
                            <div
                                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2
                           bg-slate-900/95 backdrop-blur-sm border border-slate-700
                           rounded-lg p-3 min-w-[180px] z-30
                           shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-white text-sm">{station.name}</span>
                                    <Badge
                                        variant={
                                            station.status === 'operational' ? 'success' :
                                                station.status === 'low_inventory' || station.status === 'overloaded' ? 'warning' : 'danger'
                                        }
                                        dot
                                    >
                                        {station.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                    <MapPin size={10} />
                                    {station.location}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-slate-500">Inventory</span>
                                        <div className="text-slate-200 font-medium">
                                            {station.currentInventory}/{station.inventoryCap}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Wait Time</span>
                                        <div className="text-slate-200 font-medium">{station.avgWaitTime.toFixed(1)}m</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Chargers</span>
                                        <div className="text-slate-200 font-medium">{station.activeChargers}/{station.chargers}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Utilization</span>
                                        <div className="text-slate-200 font-medium">{(station.utilizationRate * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                                {/* Arrow */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-700" />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Drivers */}
            {showDrivers &&
                drivers.map((driver) => (
                    <div
                        key={driver.id}
                        className={`
              absolute w-2 h-2 rounded-full
              ${getDriverColor(driver.batteryLevel)}
              shadow-lg
              transition-all duration-500 ease-linear
              ${driver.status === 'rerouting' ? 'animate-pulse' : ''}
            `}
                        style={{
                            left: `${driver.position.x}%`,
                            top: `${driver.position.y}%`,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: `0 0 8px ${driver.batteryLevel === 'critical' ? '#ef4444' : driver.batteryLevel === 'low' ? '#f59e0b' : '#22d3ee'}`,
                        }}
                    />
                ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg p-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">Operational</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-400">Low Stock</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span className="text-slate-400">Overloaded</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="text-slate-400">Emergency</span>
                    </div>
                    {showDrivers && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-slate-400">Driver</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Map header */}
            <div className="absolute top-4 left-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MapPin size={14} className="text-blue-400" />
                    City Network Map
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                    {stations.filter((s) => s.status === 'operational').length}/{stations.length} stations active
                </p>
            </div>

            {/* Driver count */}
            <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-slate-400">
                <Users size={14} />
                <span>{drivers.length} drivers</span>
            </div>

            {/* Add station mode indicator */}
            {isAddingStation && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-full w-24 h-24 flex items-center justify-center animate-pulse">
                        <span className="text-blue-400 text-xs font-medium">Click to place</span>
                    </div>
                </div>
            )}
        </div>
    );
}
