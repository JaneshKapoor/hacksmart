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
}

export interface Driver {
    id: string;
    position: Position;
    geoPosition: GeoPosition;
    state: DriverState;
    targetStationId: string | null;
    batteryLevel: number;
    waitTime: number;
    travelTime: number;
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
