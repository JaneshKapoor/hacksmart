'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, Driver } from '@/simulation/types';
import { percentToGeo as percentToGeoUtil } from '@/lib/geoUtils';

interface LeafletMapProps {
    stations: Station[];
    drivers: Driver[];
    onStationClick?: (station: Station) => void;
    showConnections?: boolean;
    showDrivers?: boolean;
}

const DELHI_NCR_CENTER: [number, number] = [28.6139, 77.2090];
const DEFAULT_ZOOM = 11;

// Status to color mapping
const STATUS_COLORS: Record<string, string> = {
    operational: '#10b981',
    low_inventory: '#f59e0b',
    overloaded: '#f97316',
    fire: '#ef4444',
    power_outage: '#64748b',
    offline: '#475569',
    maintenance: '#3b82f6',
};

const DRIVER_COLORS: Record<string, string> = {
    normal: '#22d3ee',
    low: '#f59e0b',
    critical: '#ef4444',
};

function createStationIcon(station: Station): L.DivIcon {
    const color = STATUS_COLORS[station.status] || STATUS_COLORS.operational;
    const isEmergency = station.status === 'fire' || station.status === 'power_outage';
    const isOperational = station.status === 'operational';
    const isLowStock = station.status === 'low_inventory';

    // Pulse animation for different states
    const pulseAnimation = isEmergency
        ? 'animation: emergencyPulse 0.8s infinite;'
        : isOperational
            ? 'animation: operationalPulse 2s infinite;'
            : isLowStock
                ? 'animation: warningPulse 1.5s infinite;'
                : '';

    // Glow intensity based on status
    const glowIntensity = isEmergency ? 30 : isOperational ? 15 : 10;
    const glow = `box-shadow: 0 0 ${glowIntensity}px ${color}88, 0 0 ${glowIntensity * 2}px ${color}44;`;

    // Outer pulse ring for operational stations
    const pulseRing = isOperational ? `
        <div style="
            position: absolute; inset: -8px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: pulseRing 2s ease-out infinite;
            opacity: 0;
        "></div>
    ` : isEmergency ? `
        <div style="
            position: absolute; inset: -6px;
            border-radius: 50%;
            background: ${color}33;
            animation: pulseRing 1s ease-out infinite;
        "></div>
    ` : '';

    return L.divIcon({
        className: 'custom-station-marker',
        html: `
            <style>
                @keyframes operationalPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes emergencyPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
                @keyframes warningPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                }
                @keyframes pulseRing {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2); opacity: 0; }
                }
            </style>
            <div style="
                position: relative;
                width: 36px; height: 36px;
            ">
                ${pulseRing}
                <div style="
                    width: 36px; height: 36px; border-radius: 50%;
                    background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
                    border: 3px solid ${color};
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-size: 12px; font-weight: 700;
                    ${glow} ${pulseAnimation}
                    position: relative; cursor: pointer;
                    transition: transform 0.2s ease;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                </div>
                ${station.queueLength > 0 ? `
                    <div style="
                        position: absolute; top: -4px; right: -4px;
                        min-width: 20px; height: 20px; border-radius: 10px;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        border: 2px solid #0f172a;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 10px; font-weight: 700; color: white; padding: 0 4px;
                        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
                    ">${station.queueLength}</div>
                ` : ''}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -22],
    });
}

function createStationPopup(station: Station): string {
    const color = STATUS_COLORS[station.status] || STATUS_COLORS.operational;
    const inventoryPct = (station.currentInventory / station.inventoryCap) * 100;
    const inventoryColor = inventoryPct < 20 ? '#ef4444' : inventoryPct < 50 ? '#f59e0b' : '#10b981';
    const utilizationColor = station.utilizationRate > 0.85 ? '#ef4444' : station.utilizationRate > 0.65 ? '#f59e0b' : '#10b981';

    return `
        <div style="font-family: 'Inter', -apple-system, sans-serif; min-width: 260px; color: #f8fafc;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 700; font-size: 15px; letter-spacing: -0.02em;">${station.name}</span>
                <span style="
                    background: linear-gradient(135deg, ${color}33 0%, ${color}22 100%);
                    color: ${color};
                    padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.05em;
                    border: 1px solid ${color}44;
                ">${station.status.replace('_', ' ')}</span>
            </div>
            
            <!-- Location -->
            <div style="color: #64748b; font-size: 11px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${station.location}
            </div>
            
            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 14px;">
                <div style="background: rgba(30, 41, 59, 0.6); padding: 10px; border-radius: 10px; border-left: 3px solid #22d3ee;">
                    <div style="color: #64748b; font-size: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        Wait Time
                    </div>
                    <div style="font-weight: 700; font-size: 16px; color: #22d3ee;">${station.avgWaitTime.toFixed(1)}<span style="font-size: 11px; font-weight: 500; color: #64748b;">m</span></div>
                </div>
                <div style="background: rgba(30, 41, 59, 0.6); padding: 10px; border-radius: 10px; border-left: 3px solid #3b82f6;">
                    <div style="color: #64748b; font-size: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                        </svg>
                        Chargers
                    </div>
                    <div style="font-weight: 700; font-size: 16px; color: #3b82f6;">${station.activeChargers}<span style="font-size: 11px; font-weight: 500; color: #64748b;">/${station.chargers}</span></div>
                </div>
                <div style="background: rgba(30, 41, 59, 0.6); padding: 10px; border-radius: 10px; border-left: 3px solid ${inventoryColor};">
                    <div style="color: #64748b; font-size: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${inventoryColor}" stroke-width="2">
                            <rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect>
                            <line x1="23" y1="13" x2="23" y2="11"></line>
                        </svg>
                        Inventory
                    </div>
                    <div style="font-weight: 700; font-size: 16px; color: ${inventoryColor};">${station.currentInventory}<span style="font-size: 11px; font-weight: 500; color: #64748b;">/${station.inventoryCap}</span></div>
                </div>
                <div style="background: rgba(30, 41, 59, 0.6); padding: 10px; border-radius: 10px; border-left: 3px solid ${utilizationColor};">
                    <div style="color: #64748b; font-size: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${utilizationColor}" stroke-width="2">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
                        </svg>
                        Utilization
                    </div>
                    <div style="font-weight: 700; font-size: 16px; color: ${utilizationColor};">${(station.utilizationRate * 100).toFixed(0)}<span style="font-size: 11px; font-weight: 500; color: #64748b;">%</span></div>
                </div>
            </div>
            
            <!-- Inventory Progress Bar -->
            <div style="background: rgba(30, 41, 59, 0.6); padding: 10px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px;">
                    <span style="color: #94a3b8;">Battery Level</span>
                    <span style="color: ${inventoryColor}; font-weight: 600;">${inventoryPct.toFixed(0)}%</span>
                </div>
                <div style="height: 6px; background: #1e293b; border-radius: 4px; overflow: hidden;">
                    <div style="
                        height: 100%; width: ${inventoryPct}%; 
                        background: linear-gradient(90deg, ${inventoryColor}cc, ${inventoryColor});
                        border-radius: 4px;
                        box-shadow: 0 0 10px ${inventoryColor}66;
                    "></div>
                </div>
            </div>
        </div>
    `;
}

export default function LeafletMap({
    stations,
    drivers,
    onStationClick,
    showConnections = true,
    showDrivers = true,
}: LeafletMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map());
    const driverMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());
    const connectionLinesRef = useRef<L.Polyline[]>([]);

    // Initialize map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: DELHI_NCR_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: false,
        });

        // Dark CartoDB tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Zoom control in bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Attribution
        L.control.attribution({ position: 'bottomright', prefix: false })
            .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>')
            .addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update station markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const existingIds = new Set(stationMarkersRef.current.keys());
        const currentIds = new Set(stations.map((s) => s.id));

        // Remove markers for stations that no longer exist
        existingIds.forEach((id) => {
            if (!currentIds.has(id)) {
                const marker = stationMarkersRef.current.get(id);
                if (marker) {
                    marker.remove();
                    stationMarkersRef.current.delete(id);
                }
            }
        });

        // Add or update markers
        stations.forEach((station) => {
            const pos: [number, number] = station.geoPosition
                ? [station.geoPosition.lat, station.geoPosition.lng]
                : percentToGeo(station.position.x, station.position.y);

            const existing = stationMarkersRef.current.get(station.id);
            if (existing) {
                existing.setLatLng(pos);
                existing.setIcon(createStationIcon(station));
                existing.getPopup()?.setContent(createStationPopup(station));
            } else {
                const marker = L.marker(pos, { icon: createStationIcon(station) })
                    .addTo(map)
                    .bindPopup(createStationPopup(station), {
                        className: 'dark-popup',
                        closeButton: false,
                        maxWidth: 280,
                    });

                marker.on('click', () => {
                    onStationClick?.(station);
                });

                stationMarkersRef.current.set(station.id, marker);
            }
        });
    }, [stations, onStationClick]);

    // Update driver markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !showDrivers) return;

        const existingIds = new Set(driverMarkersRef.current.keys());
        const currentIds = new Set(drivers.map((d) => d.id));

        existingIds.forEach((id) => {
            if (!currentIds.has(id)) {
                const marker = driverMarkersRef.current.get(id);
                if (marker) {
                    marker.remove();
                    driverMarkersRef.current.delete(id);
                }
            }
        });

        drivers.forEach((driver) => {
            const pos: [number, number] = percentToGeo(driver.position.x, driver.position.y);
            const color = DRIVER_COLORS[driver.batteryLevel] || DRIVER_COLORS.normal;
            const isCritical = driver.batteryLevel === 'critical';
            const isLow = driver.batteryLevel === 'low';

            const existing = driverMarkersRef.current.get(driver.id);
            if (existing) {
                existing.setLatLng(pos);
                existing.setStyle({
                    fillColor: color,
                    color,
                    radius: isCritical ? 6 : isLow ? 5 : 4,
                    weight: isCritical ? 2 : 1.5,
                    fillOpacity: 0.95,
                });
            } else {
                const marker = L.circleMarker(pos, {
                    radius: isCritical ? 6 : isLow ? 5 : 4,
                    fillColor: color,
                    color,
                    weight: isCritical ? 2 : 1.5,
                    fillOpacity: 0.95,
                    className: isCritical ? 'driver-critical' : '',
                }).addTo(map);

                driverMarkersRef.current.set(driver.id, marker);
            }
        });
    }, [drivers, showDrivers]);

    // Update connection lines
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !showConnections) return;

        // Remove old lines
        connectionLinesRef.current.forEach((line) => line.remove());
        connectionLinesRef.current = [];

        stations.forEach((station, i) => {
            stations.slice(i + 1).forEach((other) => {
                const posA: [number, number] = station.geoPosition
                    ? [station.geoPosition.lat, station.geoPosition.lng]
                    : percentToGeo(station.position.x, station.position.y);
                const posB: [number, number] = other.geoPosition
                    ? [other.geoPosition.lat, other.geoPosition.lng]
                    : percentToGeo(other.position.x, other.position.y);

                // Calculate distance in km (approximate)
                const dLat = Math.abs(posA[0] - posB[0]);
                const dLng = Math.abs(posA[1] - posB[1]);
                const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;

                if (approxKm < 15) {
                    const isActive = station.status === 'operational' && other.status === 'operational';
                    const line = L.polyline([posA, posB], {
                        color: isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(71, 85, 105, 0.2)',
                        weight: 1,
                        dashArray: isActive ? undefined : '6 4',
                    }).addTo(map);
                    connectionLinesRef.current.push(line);
                }
            });
        });
    }, [stations, showConnections]);

    return (
        <div ref={containerRef} className="w-full h-full" style={{ background: '#0f172a' }} />
    );
}

// Wrapper to convert geoUtils output to Leaflet [lat, lng] tuple
function percentToGeo(x: number, y: number): [number, number] {
    const { lat, lng } = percentToGeoUtil(x, y);
    return [lat, lng];
}
