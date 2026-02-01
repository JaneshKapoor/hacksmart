'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, Driver, StationStatus } from '@/simulation/types';
import { DELHI_NCR_BOUNDS } from '@/lib/geoUtils';

interface MapViewProps {
    stations: Station[];
    drivers: Driver[];
    onStationClick?: (station: Station) => void;
    onMapClick?: () => void;
    selectedStationId?: string | null;
}

// Custom marker icons based on status
const createStationIcon = (status: StationStatus, isSelected: boolean = false) => {
    const colors: Record<StationStatus, string> = {
        operational: '#10b981',
        'low-stock': '#f59e0b',
        overloaded: '#f97316',
        emergency: '#ef4444',
        offline: '#6b7280',
    };

    const color = colors[status] || colors.operational;
    const borderColor = isSelected ? '#3b82f6' : 'white';
    const borderWidth = isSelected ? '4px' : '3px';

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 28px;
                height: 28px;
                background: ${color};
                border: ${borderWidth} solid ${borderColor};
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
    });
};

const driverIcon = L.divIcon({
    className: 'driver-marker',
    html: `
        <div style="
            width: 12px;
            height: 12px;
            background: #3b82f6;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

// Component to fit bounds
function FitBounds() {
    const map = useMap();

    useEffect(() => {
        const bounds = L.latLngBounds(
            [DELHI_NCR_BOUNDS.south, DELHI_NCR_BOUNDS.west],
            [DELHI_NCR_BOUNDS.north, DELHI_NCR_BOUNDS.east]
        );
        map.fitBounds(bounds, { padding: [20, 20] });
    }, [map]);

    return null;
}

// Component to handle map clicks for deselection
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
    useMapEvents({
        click: () => {
            onMapClick();
        },
    });
    return null;
}

export function MapView({ stations, drivers, onStationClick, onMapClick, selectedStationId }: MapViewProps) {
    const center: [number, number] = [28.6139, 77.2090]; // Delhi center

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <MapContainer
                center={center}
                zoom={11}
                zoomControl={false}
                style={{ height: '100%', width: '100%', background: 'var(--bg-primary)' }}
            >
                {/* Dark theme tile layer */}
                <TileLayer
                    attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />

                <ZoomControl position="bottomright" />
                <FitBounds />
                {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

                {/* Station markers */}
                {stations.map((station) => (
                    <Marker
                        key={station.id}
                        position={[station.geoPosition.lat, station.geoPosition.lng]}
                        icon={createStationIcon(station.status, station.id === selectedStationId)}
                        eventHandlers={{
                            click: () => onStationClick?.(station),
                        }}
                    >
                        <Popup>
                            <div style={{
                                padding: '8px',
                                minWidth: '180px',
                                color: 'var(--text-primary)',
                            }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    marginBottom: '8px',
                                    color: '#fff',
                                }}>
                                    {station.name}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#a0aec0',
                                    marginBottom: '8px',
                                }}>
                                    {station.location}
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '4px',
                                    fontSize: '0.7rem',
                                }}>
                                    <div style={{ color: '#a0aec0' }}>Inventory:</div>
                                    <div style={{ color: '#fff' }}>{station.currentInventory}/{station.inventoryCap}</div>
                                    <div style={{ color: '#a0aec0' }}>Queue:</div>
                                    <div style={{ color: '#fff' }}>{station.queueLength}</div>
                                    <div style={{ color: '#a0aec0' }}>Swaps:</div>
                                    <div style={{ color: '#fff' }}>{station.totalSwaps}</div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Driver markers */}
                {drivers.filter(d => d.state === 'traveling').map((driver) => (
                    <Marker
                        key={driver.id}
                        position={[driver.geoPosition.lat, driver.geoPosition.lng]}
                        icon={driverIcon}
                    >
                        <Popup>
                            <div style={{ padding: '4px', minWidth: '220px', color: 'var(--text-primary)' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '32px', height: '32px',
                                            borderRadius: '50%',
                                            border: '1px solid var(--brand-primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--brand-primary)'
                                        }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                        </div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>
                                            {driver.name || 'Rider'}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        color: '#60a5fa',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        border: '1px solid rgba(59, 130, 246, 0.3)'
                                    }}>
                                        EN ROUTE
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', color: '#a0aec0' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect>
                                                <line x1="22" y1="11" x2="22" y2="13"></line>
                                            </svg>
                                            Battery Level
                                        </span>
                                        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{Math.round(driver.batteryLevel)}%</span>
                                    </div>
                                    <div style={{
                                        height: '6px',
                                        width: '100%',
                                        background: '#374151',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${driver.batteryLevel}%`,
                                            height: '100%',
                                            background: '#fbbf24',
                                            borderRadius: '3px'
                                        }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{
                                        background: '#2d3748',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #4a5568',
                                        borderLeft: '3px solid #a855f7'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginBottom: '4px' }}>Owed (₹)</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d8b4fe' }}>
                                            ₹{driver.owedAmount || 0}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: '#2d3748',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #4a5568',
                                        borderLeft: '3px solid #06b6d4'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginBottom: '4px' }}>Swaps Today</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#67e8f9' }}>
                                            {driver.swapsToday || 0}
                                        </div>
                                    </div>
                                </div>
                                {driver.targetStationId && (
                                    <div style={{
                                        marginTop: '12px',
                                        fontSize: '0.75rem',
                                        color: '#a0aec0',
                                        textAlign: 'center',
                                        borderTop: '1px solid #4a5568',
                                        paddingTop: '8px'
                                    }}>
                                        Heading to: <span style={{ color: '#fff' }}>
                                            {stations.find(s => s.id === driver.targetStationId)?.name || 'Station'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Map Legend */}
            <div
                className="map-legend"
                style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    zIndex: 1000,
                }}
            >
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--status-operational)' }} />
                    <span>Operational</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--status-low-stock)' }} />
                    <span>Low Stock</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--status-overloaded)' }} />
                    <span>Overloaded</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--status-emergency)' }} />
                    <span>Emergency</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--brand-secondary)' }} />
                    <span>Driver</span>
                </div>
            </div>
        </div>
    );
}
