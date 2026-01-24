// Enhanced Station Types and Simulation State

export interface Position {
    x: number;
    y: number;
}

export type StationStatus =
    | 'operational'
    | 'overloaded'
    | 'offline'
    | 'fire'
    | 'power_outage'
    | 'low_inventory'
    | 'maintenance';

export interface Station {
    id: string;
    name: string;
    location: string;
    position: Position;
    chargers: number;
    activeChargers: number;
    chargerType: 'standard' | 'fast' | 'mixed';
    bays: number;
    inventoryCap: number;
    currentInventory: number;
    chargingBatteries: number;
    queueLength: number;
    status: StationStatus;
    utilizationRate: number;
    avgWaitTime: number;
    totalSwaps: number;
    lostSwaps: number;
    peakQueueLength: number;
    operatingHours: { start: number; end: number };
    coverageRadius: number; // in km
    isNew?: boolean;
}

export interface Driver {
    id: string;
    position: Position;
    targetStationId: string | null;
    originalStationId?: string; // For tracking reroutes
    status: 'seeking' | 'en_route' | 'swapping' | 'complete' | 'rerouting' | 'abandoned';
    eta: number;
    batteryLevel: 'normal' | 'low' | 'critical';
    waitTime?: number;
}

export type ScenarioType =
    | 'baseline'
    | 'station_ops'
    | 'capacity'
    | 'inventory'
    | 'demand'
    | 'network'
    | 'pricing'
    | 'failures'
    | 'growth'
    | 'combined';

export interface ScenarioConfig {
    type: ScenarioType;
    name: string;
    description: string;
    params: Record<string, unknown>;
}

export interface Intervention {
    id: string;
    type: 'add_station' | 'remove_station' | 'modify_chargers' | 'change_policy' |
    'trigger_emergency' | 'demand_shift' | 'pricing_change' | 'schedule_maintenance';
    stationId?: string;
    value?: number | string;
    position?: Position;
    emergencyType?: 'fire' | 'overload' | 'charger_failure' | 'power_outage' | 'no_battery';
    timing?: number; // simulation time when this intervention activates
    duration?: number; // how long the intervention lasts
    params?: Record<string, unknown>;
}

export interface DemandConfig {
    weatherMultiplier: number;
    eventName?: string;
    eventLocation?: Position;
    eventRadius?: number;
    eventSurge?: number;
    timeOfDayModifiers?: number[];
}

export interface PricingConfig {
    strategy: 'flat' | 'time_based' | 'station_based' | 'dynamic';
    peakMultiplier: number;
    offPeakDiscount: number;
    peakHours: { start: number; end: number };
}

export interface InventoryConfig {
    safetyStock: number;
    rebalanceThreshold: number;
    rebalanceFrequency: number; // hours
}

export interface GrowthConfig {
    rate: number; // percentage per year
    timeline: number; // months
    distribution: 'uniform' | 'area_specific';
}

export interface KPIMetrics {
    avgWaitTime: number;
    lostSwaps: number;
    idleInventory: number;
    chargerUtilization: number;
    operationalCost: number;
    cityThroughput: number;
    reroutedDrivers: number;
    emergencyEvents: number;
    revenue?: number;
    peakWaitTime?: number;
    averageQueueLength?: number;
}

export interface TimeSeriesPoint {
    time: number;
    avgWaitTime: number;
    throughput: number;
    lostSwaps: number;
    utilization: number;
    cost: number;
}

export interface SimulationState {
    time: number;
    day: number;
    hour: number;
    stations: Station[];
    drivers: Driver[];
    baselineKPIs: KPIMetrics;
    scenarioKPIs: KPIMetrics;
    timeSeriesData: TimeSeriesPoint[];
    isRunning: boolean;
    speed: number;
    activeScenario: ScenarioConfig | null;
    interventions: Intervention[];
    demandConfig: DemandConfig;
    pricingConfig: PricingConfig;
    inventoryConfig: InventoryConfig;
    alerts: SimulationAlert[];
}

export interface SimulationAlert {
    id: string;
    type: 'info' | 'warning' | 'danger';
    message: string;
    stationId?: string;
    timestamp: number;
}

export interface Insight {
    id: string;
    type: 'recommendation' | 'warning' | 'observation';
    title: string;
    description: string;
    impact?: string;
    action?: {
        label: string;
        intervention: Intervention;
    };
}

// Scenario presets for quick selection
export const SCENARIO_CATEGORIES: { type: ScenarioType; label: string; icon: string; description: string }[] = [
    { type: 'baseline', label: 'Baseline', icon: '📊', description: 'Current network state' },
    { type: 'station_ops', label: 'Station Ops', icon: '🏪', description: 'Add or remove stations' },
    { type: 'capacity', label: 'Capacity', icon: '⚡', description: 'Modify charger counts' },
    { type: 'inventory', label: 'Inventory', icon: '🔋', description: 'Stocking & rebalancing' },
    { type: 'demand', label: 'Demand', icon: '📈', description: 'Weather, events, time' },
    { type: 'network', label: 'Network', icon: '🗺️', description: 'Topology changes' },
    { type: 'pricing', label: 'Pricing', icon: '💰', description: 'Dynamic pricing' },
    { type: 'failures', label: 'Failures', icon: '🚨', description: 'Outages & emergencies' },
    { type: 'growth', label: 'Growth', icon: '📈', description: 'Scaling projections' },
    { type: 'combined', label: 'Combined', icon: '🔀', description: 'Multi-intervention' },
];

export const WEATHER_OPTIONS = [
    { value: 'normal', label: 'Normal', multiplier: 1.0 },
    { value: 'light_rain', label: 'Light Rain', multiplier: 1.2 },
    { value: 'heavy_rain', label: 'Heavy Rain', multiplier: 1.4 },
    { value: 'extreme_heat', label: 'Extreme Heat', multiplier: 1.3 },
];

export const FAILURE_TYPES = [
    { value: 'fire', label: 'Fire Emergency', icon: '🔥' },
    { value: 'power_outage', label: 'Power Outage', icon: '⚡' },
    { value: 'charger_failure', label: 'Charger Failure', icon: '🔌' },
    { value: 'overload', label: 'System Overload', icon: '⚠️' },
    { value: 'no_battery', label: 'No Battery', icon: '🔋' },
];
