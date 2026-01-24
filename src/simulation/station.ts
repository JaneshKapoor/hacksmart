// Station Node Model - Core data structures for the simulation

export interface Position {
  x: number;
  y: number;
}

export type StationStatus = 'operational' | 'overloaded' | 'offline' | 'fire' | 'power_outage' | 'low_inventory';

export interface Station {
  id: string;
  name: string;
  position: Position;
  chargers: number;
  activeChargers: number; // chargers currently working (not failed)
  bays: number;
  inventoryCap: number;
  currentInventory: number;
  chargingBatteries: number;
  queueLength: number;
  status: StationStatus;
  utilizationRate: number;
  avgWaitTime: number; // in minutes
}

export interface Driver {
  id: string;
  position: Position;
  targetStationId: string | null;
  status: 'seeking' | 'en_route' | 'swapping' | 'complete' | 'rerouting';
  eta: number; // in minutes
}

export interface SwapRequest {
  id: string;
  driverId: string;
  stationId: string;
  timestamp: number;
  waitTime: number;
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned' | 'rerouted';
}

export interface SimulationEvent {
  id: string;
  type: 'swap_request' | 'battery_charged' | 'replenishment' | 'fire' | 'overload' | 'charger_failure' | 'power_outage' | 'no_battery';
  stationId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface DemandCurve {
  hour: number;
  baseLoad: number;
  weatherMultiplier: number;
  festivalMultiplier: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  interventions: Intervention[];
  demandModifier: number;
}

export interface Intervention {
  type: 'add_station' | 'remove_station' | 'modify_chargers' | 'change_policy' | 'trigger_emergency' | 'demand_shift';
  stationId?: string;
  value?: number | string;
  position?: Position;
  emergencyType?: 'fire' | 'overload' | 'charger_failure' | 'power_outage' | 'no_battery';
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
}

export interface SimulationState {
  time: number; // simulation time in minutes
  stations: Station[];
  drivers: Driver[];
  events: SimulationEvent[];
  baselineKPIs: KPIMetrics;
  scenarioKPIs: KPIMetrics;
  isRunning: boolean;
  speed: number; // 1x, 2x, 4x
  activeScenario: Scenario | null;
}
