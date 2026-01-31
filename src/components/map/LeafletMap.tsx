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
    const pulse = isEmergency ? 'animation: pulse 1.5s infinite;' : '';
    const glow = isEmergency ? `box-shadow: 0 0 20px ${color}88;` : `box-shadow: 0 0 10px ${color}44;`;

    return L.divIcon({
        className: 'custom-station-marker',
        html: `
            <div style="
                width: 32px; height: 32px; border-radius: 50%;
                background: ${color}; border: 2px solid ${color}cc;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 11px; font-weight: 700;
                ${glow} ${pulse}
                position: relative; cursor: pointer;
            ">
                ${station.queueLength > 0 ? station.queueLength : ''}
                ${station.queueLength > 0 ? `
                    <div style="
                        position: absolute; top: -6px; right: -6px;
                        min-width: 16px; height: 16px; border-radius: 8px;
                        background: #0f172a; border: 1px solid #334155;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 9px; font-weight: 700; color: white; padding: 0 3px;
                    ">${station.queueLength}</div>
                ` : ''}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    });
}

function createStationPopup(station: Station): string {
    const color = STATUS_COLORS[station.status] || STATUS_COLORS.operational;
    const inventoryPct = (station.currentInventory / station.inventoryCap) * 100;
    const inventoryColor = inventoryPct < 20 ? '#ef4444' : inventoryPct < 50 ? '#f59e0b' : '#10b981';

    return `
        <div style="font-family: Inter, sans-serif; min-width: 220px; color: #f8fafc;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 14px;">${station.name}</span>
                <span style="
                    background: ${color}22; color: ${color};
                    padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 500;
                ">${station.status.replace('_', ' ')}</span>
            </div>
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 10px;">${station.location}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div>
                    <div style="color: #64748b; font-size: 10px;">Wait Time</div>
                    <div style="font-weight: 600;">${station.avgWaitTime.toFixed(1)}m</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 10px;">Chargers</div>
                    <div style="font-weight: 600;">${station.activeChargers}/${station.chargers}</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 10px;">Inventory</div>
                    <div style="font-weight: 600;">${station.currentInventory}/${station.inventoryCap}</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 10px;">Utilization</div>
                    <div style="font-weight: 600;">${(station.utilizationRate * 100).toFixed(0)}%</div>
                </div>
            </div>
            <div style="margin-top: 8px;">
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${inventoryPct}%; background: ${inventoryColor}; border-radius: 2px;"></div>
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

            const existing = driverMarkersRef.current.get(driver.id);
            if (existing) {
                existing.setLatLng(pos);
                existing.setStyle({ fillColor: color, color });
            } else {
                const marker = L.circleMarker(pos, {
                    radius: 4,
                    fillColor: color,
                    color,
                    weight: 1,
                    fillOpacity: 0.9,
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
