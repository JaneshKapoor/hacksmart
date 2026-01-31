// Shared geo utilities for Delhi NCR coordinate conversions

export const DELHI_NCR_BOUNDS = {
    north: 28.88,
    south: 28.35,
    east: 77.55,
    west: 76.85,
};

/**
 * Haversine formula — distance between two geo points in meters
 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Convert percentage-based map position (0–100) to Delhi NCR geo coordinates
 */
export function percentToGeo(x: number, y: number): { lat: number; lng: number } {
    const lat = DELHI_NCR_BOUNDS.north - (y / 100) * (DELHI_NCR_BOUNDS.north - DELHI_NCR_BOUNDS.south);
    const lng = DELHI_NCR_BOUNDS.west + (x / 100) * (DELHI_NCR_BOUNDS.east - DELHI_NCR_BOUNDS.west);
    return { lat, lng };
}

/**
 * Convert Delhi NCR geo coordinates to percentage-based map position (0–100)
 */
export function geoToPercent(lat: number, lng: number): { x: number; y: number } {
    const x = ((lng - DELHI_NCR_BOUNDS.west) / (DELHI_NCR_BOUNDS.east - DELHI_NCR_BOUNDS.west)) * 100;
    const y = ((DELHI_NCR_BOUNDS.north - lat) / (DELHI_NCR_BOUNDS.north - DELHI_NCR_BOUNDS.south)) * 100;
    return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
    };
}
