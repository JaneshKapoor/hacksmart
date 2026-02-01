// ============================================================================
// ElectriGo Simulation Types
// ============================================================================

export interface GeoPosition {
    lat: number;
    lng: number;
}

export interface Position {
    x: number;
    y: number;
}

export type StationStatus = 'operational' | 'low-stock' | 'overloaded' | 'emergency' | 'offline';
export type ChargerType = 'standard' | 'fast' | 'mixed';
export type DriverState = 'idle' | 'traveling' | 'queued' | 'swapping' | 'completed' | 'abandoned';

export interface ConnectionDetail {
    type: string;
    powerKW: number;
    quantity: number;
}

export interface Station {
    id: string;
    name: string;
    location: string;
    position: Position;
    geoPosition: GeoPosition;
    chargers: number;
    activeChargers: number;
    chargerType: ChargerType;
    bays: number;
    inventoryCap: number;
    currentInventory: number;
    chargingBatteries: number;
    queueLength: number;
    utilizationRate: number;
    avgWaitTime: number;
    totalSwaps: number;
    lostSwaps: number;
    peakQueueLength: number;
    status: StationStatus;
    operatingHours: { start: number; end: number };
    coverageRadius: number;

    // Additional real-world data from OCM API
    address?: string;
    operator?: string;
    usageCost?: string;
    connectionDetails?: ConnectionDetail[];
    maxPowerKW?: number;
    minPowerKW?: number;
    isRealStation?: boolean;
}

export interface Driver {
    id: string;
    name: string;
    position: Position;
    geoPosition: GeoPosition;
    state: DriverState;
    targetStationId: string | null;
    batteryLevel: number;
    waitTime: number;
    travelTime: number;
    owedAmount: number;
    swapsToday: number;
    rerouteAttempts?: number; // Track number of reroute attempts
}

export type FailureReason =
    | 'critical_battery'      // Battery ≤15% and no nearby station
    | 'low_battery'           // Battery ≤25% and couldn't reach station
    | 'station_too_far'       // Nearest station exceeds battery range
    | 'no_stations_available' // No operational stations in network
    | 'no_inventory'          // All stations out of batteries
    | 'network_congestion'    // All stations have excessive queues (>10)
    | 'excessive_queue'       // Target station queue too long for battery level
    | 'rerouting_failed'      // Station failed and no alternative found
    | 'multiple_reroutes'     // Exceeded maximum reroute attempts
    | 'destination_failed'    // Target station failed mid-journey
    | 'stranded';             // Driver stranded due to battery depletion mid-route

export interface NearbyStationSnapshot {
    stationId: string;
    stationName: string;
    distance: number;
    status: StationStatus;
    currentInventory: number;
    queueLength: number;
    avgWaitTime: number;
}

export interface FailedRide {
    // Driver Information
    driverId: string;
    driverName: string;

    // Location Data
    failurePosition: Position;
    failureGeoPosition: GeoPosition;
    originPosition: Position;
    originGeoPosition: GeoPosition;

    // Battery & Journey Data
    batteryLevel: number;
    travelTime: number;
    waitTime: number;

    // Target Station Data
    targetStationId: string | null;
    targetStationName: string | null;
    targetStationDistance: number | null;

    // Failure Context
    failureReason: FailureReason;
    failureTimestamp: Date;
    simulationDay: number;
    hourOfDay: number;

    // Environmental Context
    weatherCondition: string | null;
    weatherMultiplier: number | null;
    temperature: number | null;

    // Network State
    operationalStationsCount: number;
    totalNetworkInventory: number;
    networkUtilization: number;
    avgNetworkWaitTime: number;

    // Nearby Stations Context (for ML training)
    nearbyStations: NearbyStationSnapshot[];

    // Rerouting History
    wasRerouted: boolean;
    rerouteAttempts: number;

    // Financial Impact
    owedAmount: number;
    swapsToday: number;
}

export interface KPIs {
    avgWaitTime: number;
    lostSwaps: number;
    chargerUtilization: number;
    cityThroughput: number;
    activeDrivers: number;
    totalStations: number;
    operationalStations: number;
    totalInventory: number;
    totalCapacity: number;
    peakWaitTime: number;
    reroutedDrivers: number;
}

export interface WeatherData {
    multiplier: number;
    condition: string;
    description: string;
    temperature: number;
    isFallback: boolean;
}

export interface CarbonData {
    carbonIntensity: number;
    zone: string;
    isFallback: boolean;
    timestamp: string;
}

export type ScenarioType =
    | 'baseline'
    | 'station-ops'
    | 'capacity'
    | 'inventory'
    | 'demand'
    | 'network'
    | 'pricing'
    | 'failures'
    | 'growth';

export interface Scenario {
    type: ScenarioType;
    active: boolean;
    params: Record<string, number | string | boolean>;
}

export interface SimulationState {
    isRunning: boolean;
    isPaused: boolean;
    speed: number;
    currentTime: Date;
    day: number;
    stations: Station[];
    drivers: Driver[];
    kpis: KPIs;
    weather: WeatherData | null;
    carbon: CarbonData | null;
    activeScenario: Scenario;
    history: {
        time: Date;
        kpis: KPIs;
    }[];
    failedRides: FailedRide[];
}

export const INITIAL_KPIS: KPIs = {
    avgWaitTime: 0,
    lostSwaps: 0,
    chargerUtilization: 0,
    cityThroughput: 0,
    activeDrivers: 0,
    totalStations: 0,
    operationalStations: 0,
    totalInventory: 0,
    totalCapacity: 0,
    peakWaitTime: 0,
    reroutedDrivers: 0,
};
