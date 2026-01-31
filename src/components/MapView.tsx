'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, Driver, StationStatus } from '@/simulation/types';
import { DELHI_NCR_BOUNDS } from '@/lib/geoUtils';

interface MapViewProps {
    stations: Station[];
    drivers: Driver[];
    onStationClick?: (station: Station) => void;
}

// Custom marker icons based on status
const createStationIcon = (status: StationStatus) => {
    const colors: Record<StationStatus, string> = {
        operational: '#10b981',
        'low-stock': '#f59e0b',
        overloaded: '#f97316',
        emergency: '#ef4444',
        offline: '#6b7280',
    };

    const color = colors[status] || colors.operational;

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 28px;
                height: 28px;
                background: ${color};
                border: 3px solid white;
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

export function MapView({ stations, drivers, onStationClick }: MapViewProps) {
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

                {/* Station markers */}
                {stations.map((station) => (
                    <Marker
                        key={station.id}
                        position={[station.geoPosition.lat, station.geoPosition.lng]}
                        icon={createStationIcon(station.status)}
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
                    />
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
