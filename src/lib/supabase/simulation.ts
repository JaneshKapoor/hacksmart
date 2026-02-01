import { createClient } from '@/lib/supabase/client';
import { Station, Driver, SimulationState as SimState, FailedRide } from '@/simulation/types';

// ============================================================================
// Supabase Simulation Database Operations
// ============================================================================

export interface DBStation {
    id: string;
    ocm_id: number | null;
    name: string;
    location: string;
    address: string | null;
    operator: string | null;
    latitude: number;
    longitude: number;
    chargers: number;
    active_chargers: number;
    charger_type: string;
    max_power_kw: number | null;
    min_power_kw: number | null;
    inventory_cap: number;
    current_inventory: number;
    charging_batteries: number;
    bays: number;
    queue_length: number;
    utilization_rate: number;
    avg_wait_time: number;
    total_swaps: number;
    lost_swaps: number;
    peak_queue_length: number;
    status: string;
    operating_hours_start: number;
    operating_hours_end: number;
    coverage_radius: number;
    usage_cost: string | null;
    is_real_station: boolean;
    created_at: string;
    updated_at: string;
}

export interface DBDriver {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    state: string;
    target_station_id: string | null;
    battery_level: number;
    wait_time: number;
    travel_time: number;
    owed_amount: number;
    swaps_today: number;
    created_at: string;
    updated_at: string;
}

export interface DBSimulationState {
    id: string;
    is_running: boolean;
    is_paused: boolean;
    speed: number;
    simulation_time: string;
    day: number;
    active_scenario_type: string;
    active_scenario_params: any;
    weather_data: any;
    carbon_data: any;
    updated_at: string;
}

// Convert Station to DB format
export function stationToDB(station: Station): Omit<DBStation, 'id' | 'created_at' | 'updated_at'> {
    return {
        ocm_id: station.id.startsWith('real-station-')
            ? parseInt(station.id.replace('real-station-', ''))
            : null,
        name: station.name,
        location: station.location,
        address: station.address || null,
        operator: station.operator || null,
        latitude: station.geoPosition.lat,
        longitude: station.geoPosition.lng,
        chargers: station.chargers,
        active_chargers: station.activeChargers,
        charger_type: station.chargerType,
        max_power_kw: station.maxPowerKW || null,
        min_power_kw: station.minPowerKW || null,
        inventory_cap: station.inventoryCap,
        current_inventory: station.currentInventory,
        charging_batteries: station.chargingBatteries,
        bays: station.bays,
        queue_length: station.queueLength,
        utilization_rate: station.utilizationRate,
        avg_wait_time: station.avgWaitTime,
        total_swaps: station.totalSwaps,
        lost_swaps: station.lostSwaps,
        peak_queue_length: station.peakQueueLength,
        status: station.status,
        operating_hours_start: station.operatingHours.start,
        operating_hours_end: station.operatingHours.end,
        coverage_radius: station.coverageRadius,
        usage_cost: station.usageCost || null,
        is_real_station: station.isRealStation || false,
    };
}

// Convert DB format to Station
export function dbToStation(db: DBStation): Station {
    return {
        id: db.id,
        name: db.name,
        location: db.location,
        address: db.address || undefined,
        operator: db.operator || undefined,
        position: { x: 0, y: 0 }, // Will be recalculated
        geoPosition: {
            lat: db.latitude,
            lng: db.longitude,
        },
        chargers: db.chargers,
        activeChargers: db.active_chargers,
        chargerType: db.charger_type as any,
        maxPowerKW: db.max_power_kw || undefined,
        minPowerKW: db.min_power_kw || undefined,
        inventoryCap: db.inventory_cap,
        currentInventory: db.current_inventory,
        chargingBatteries: db.charging_batteries,
        bays: db.bays,
        queueLength: db.queue_length,
        utilizationRate: db.utilization_rate,
        avgWaitTime: db.avg_wait_time,
        totalSwaps: db.total_swaps,
        lostSwaps: db.lost_swaps,
        peakQueueLength: db.peak_queue_length,
        status: db.status as any,
        operatingHours: {
            start: db.operating_hours_start,
            end: db.operating_hours_end,
        },
        coverageRadius: db.coverage_radius,
        usageCost: db.usage_cost || undefined,
        isRealStation: db.is_real_station,
        connectionDetails: undefined, // TODO: Load from station_connections table
    };
}

// Convert Driver to DB format
export function driverToDB(driver: Driver): Omit<DBDriver, 'id' | 'created_at' | 'updated_at'> {
    return {
        name: driver.name,
        latitude: driver.geoPosition.lat,
        longitude: driver.geoPosition.lng,
        state: driver.state,
        target_station_id: driver.targetStationId,
        battery_level: driver.batteryLevel,
        wait_time: driver.waitTime,
        travel_time: driver.travelTime,
        owed_amount: driver.owedAmount,
        swaps_today: driver.swapsToday,
    };
}

// Convert DB format to Driver
export function dbToDriver(db: DBDriver): Driver {
    return {
        id: db.id,
        name: db.name,
        position: { x: 0, y: 0 }, // Will be recalculated
        geoPosition: {
            lat: db.latitude,
            lng: db.longitude,
        },
        state: db.state as any,
        targetStationId: db.target_station_id,
        batteryLevel: db.battery_level,
        waitTime: db.wait_time,
        travelTime: db.travel_time,
        owedAmount: db.owed_amount,
        swapsToday: db.swaps_today,
    };
}

// ============================================================================
// Database Operations
// ============================================================================

export async function saveStationsToDB(stations: Station[]): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient();

        // Convert stations to DB format
        const dbStations = stations.map(stationToDB);

        // Upsert stations (insert or update based on ocm_id)
        const { error } = await supabase
            .from('stations')
            .upsert(dbStations, {
                onConflict: 'ocm_id',
                ignoreDuplicates: false,
            });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Failed to save stations to DB:', error);
        return { success: false, error: error.message };
    }
}

export async function loadStationsFromDB(): Promise<Station[]> {
    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('stations')
            .select('*')
            .order('name');

        if (error) throw error;
        if (!data || data.length === 0) return [];

        return data.map(dbToStation);
    } catch (error) {
        console.error('Failed to load stations from DB:', error);
        return [];
    }
}

export async function updateStationInDB(stationId: string, updates: Partial<DBStation>): Promise<void> {
    try {
        const supabase = createClient();

        const { error } = await supabase
            .from('stations')
            .update(updates)
            .eq('id', stationId);

        if (error) throw error;
    } catch (error) {
        console.error('Failed to update station in DB:', error);
    }
}

export async function saveDriversToDB(drivers: Driver[]): Promise<void> {
    try {
        const supabase = createClient();

        // Delete existing drivers first
        await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (drivers.length === 0) return;

        // Convert drivers to DB format
        const dbDrivers = drivers.map(driverToDB);

        const { error } = await supabase
            .from('drivers')
            .insert(dbDrivers);

        if (error) throw error;
    } catch (error) {
        console.error('Failed to save drivers to DB:', error);
    }
}

export async function loadDriversFromDB(): Promise<Driver[]> {
    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('drivers')
            .select('*');

        if (error) throw error;
        if (!data || data.length === 0) return [];

        return data.map(dbToDriver);
    } catch (error) {
        console.error('Failed to load drivers from DB:', error);
        return [];
    }
}

export async function saveSimulationStateToDB(state: SimState): Promise<void> {
    try {
        const supabase = createClient();

        // Get the singleton simulation state ID
        const { data: existing } = await supabase
            .from('simulation_state')
            .select('id')
            .limit(1)
            .single();

        const stateData = {
            is_running: state.isRunning,
            is_paused: state.isPaused,
            speed: state.speed,
            simulation_time: state.currentTime.toISOString(),
            day: state.day,
            active_scenario_type: state.activeScenario.type,
            active_scenario_params: state.activeScenario.params,
            weather_data: state.weather,
            carbon_data: state.carbon,
        };

        if (existing) {
            await supabase
                .from('simulation_state')
                .update(stateData)
                .eq('id', existing.id);
        } else {
            await supabase
                .from('simulation_state')
                .insert(stateData);
        }
    } catch (error) {
        console.error('Failed to save simulation state to DB:', error);
    }
}

export async function createStationSnapshot(stationId: string, station: Station): Promise<void> {
    try {
        const supabase = createClient();

        const snapshot = {
            station_id: stationId,
            snapshot_time: new Date().toISOString(),
            current_inventory: station.currentInventory,
            queue_length: station.queueLength,
            utilization_rate: station.utilizationRate,
            status: station.status,
            total_swaps: station.totalSwaps,
        };

        await supabase
            .from('station_snapshots')
            .insert(snapshot);
    } catch (error) {
        // Silently fail - snapshots are optional
        console.debug('Failed to create station snapshot:', error);
    }
}

// ============================================================================
// Failed Rides Operations
// ============================================================================

export interface DBFailedRide {
    id?: string;
    driver_id: string;
    driver_name: string;
    failure_latitude: number;
    failure_longitude: number;
    origin_latitude: number;
    origin_longitude: number;
    battery_level: number;
    travel_time: number;
    wait_time: number;
    target_station_id: string | null;
    target_station_name: string | null;
    target_station_distance: number | null;
    failure_reason: string;
    failure_timestamp: string;
    simulation_day: number;
    hour_of_day: number;
    weather_condition: string | null;
    weather_multiplier: number | null;
    temperature: number | null;
    operational_stations_count: number;
    total_network_inventory: number;
    network_utilization: number;
    avg_network_wait_time: number;
    nearby_stations: any;
    was_rerouted: boolean;
    reroute_attempts: number;
    owed_amount: number;
    swaps_today: number;
    created_at?: string;
}

// Convert FailedRide to DB format
export function failedRideToDB(ride: FailedRide): Omit<DBFailedRide, 'id' | 'created_at'> {
    return {
        driver_id: ride.driverId,
        driver_name: ride.driverName,
        failure_latitude: ride.failureGeoPosition.lat,
        failure_longitude: ride.failureGeoPosition.lng,
        origin_latitude: ride.originGeoPosition.lat,
        origin_longitude: ride.originGeoPosition.lng,
        battery_level: ride.batteryLevel,
        travel_time: ride.travelTime,
        wait_time: ride.waitTime,
        target_station_id: ride.targetStationId,
        target_station_name: ride.targetStationName,
        target_station_distance: ride.targetStationDistance,
        failure_reason: ride.failureReason,
        failure_timestamp: ride.failureTimestamp.toISOString(),
        simulation_day: ride.simulationDay,
        hour_of_day: ride.hourOfDay,
        weather_condition: ride.weatherCondition,
        weather_multiplier: ride.weatherMultiplier,
        temperature: ride.temperature,
        operational_stations_count: ride.operationalStationsCount,
        total_network_inventory: ride.totalNetworkInventory,
        network_utilization: ride.networkUtilization,
        avg_network_wait_time: ride.avgNetworkWaitTime,
        nearby_stations: ride.nearbyStations,
        was_rerouted: ride.wasRerouted,
        reroute_attempts: ride.rerouteAttempts,
        owed_amount: ride.owedAmount,
        swaps_today: ride.swapsToday,
    };
}

// Convert DB format to FailedRide
export function dbToFailedRide(db: DBFailedRide): FailedRide {
    return {
        driverId: db.driver_id,
        driverName: db.driver_name,
        failurePosition: { x: 0, y: 0 }, // Position not stored in DB
        failureGeoPosition: { lat: db.failure_latitude, lng: db.failure_longitude },
        originPosition: { x: 0, y: 0 },
        originGeoPosition: { lat: db.origin_latitude, lng: db.origin_longitude },
        batteryLevel: db.battery_level,
        travelTime: db.travel_time,
        waitTime: db.wait_time,
        targetStationId: db.target_station_id,
        targetStationName: db.target_station_name,
        targetStationDistance: db.target_station_distance,
        failureReason: db.failure_reason as any,
        failureTimestamp: new Date(db.failure_timestamp),
        simulationDay: db.simulation_day,
        hourOfDay: db.hour_of_day,
        weatherCondition: db.weather_condition,
        weatherMultiplier: db.weather_multiplier,
        temperature: db.temperature,
        operationalStationsCount: db.operational_stations_count,
        totalNetworkInventory: db.total_network_inventory,
        networkUtilization: db.network_utilization,
        avgNetworkWaitTime: db.avg_network_wait_time,
        nearbyStations: db.nearby_stations || [],
        wasRerouted: db.was_rerouted,
        rerouteAttempts: db.reroute_attempts,
        owedAmount: db.owed_amount,
        swapsToday: db.swaps_today,
    };
}

export async function saveFailedRidesToDB(failedRides: FailedRide[]): Promise<void> {
    if (failedRides.length === 0) return;

    try {
        const supabase = createClient();
        const dbFailedRides = failedRides.map(failedRideToDB);

        const { error } = await supabase
            .from('failed_rides')
            .insert(dbFailedRides);

        if (error) throw error;
    } catch (error) {
        console.error('Failed to save failed rides to DB:', error);
    }
}

export async function loadFailedRidesFromDB(limit: number = 1000): Promise<FailedRide[]> {
    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('failed_rides')
            .select('*')
            .order('failure_timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (!data || data.length === 0) return [];

        return data.map(dbToFailedRide);
    } catch (error) {
        console.error('Failed to load failed rides from DB:', error);
        return [];
    }
}

export async function saveFailedRideToDB(ride: FailedRide): Promise<void> {
    try {
        const supabase = createClient();
        const dbRide = failedRideToDB(ride);

        const { error } = await supabase
            .from('failed_rides')
            .insert(dbRide);

        if (error) throw error;
    } catch (error) {
        console.error('Failed to save failed ride to DB:', error);
    }
}
