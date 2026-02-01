import {
    Station,
    Driver,
    KPIs,
    SimulationState,
    Position,
    GeoPosition,
    INITIAL_KPIS,
    WeatherData,
    Scenario,
    DriverState,
    FailedRide,
    FailureReason,
    NearbyStationSnapshot,
} from './types';
import { geoToPercent, percentToGeo, haversine } from '@/lib/geoUtils';

// ============================================================================
// Simulation Constants
// ============================================================================

const DRIVER_SPEED = 8; // units per minute
const AVG_SWAP_DURATION = 4; // minutes
const CHARGE_COMPLETION_PROBABILITY_BASE = 0.06;
const MAX_CHARGE_COMPLETION_PROBABILITY = 0.95;

// Battery-aware routing constants
const BATTERY_CRITICAL = 15;
const BATTERY_VERY_LOW = 20;
const BATTERY_LOW = 25;
const BATTERY_MODERATE = 30;
const WAIT_TIME_WEIGHT_BASE = 3;

// Hourly demand curve (index = hour of day, value = demand multiplier)
const DEMAND_CURVE = [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.3,   // 00:00 - 05:00
    0.5, 0.8, 1.2, 1.0, 0.9, 0.85,     // 06:00 - 11:00
    0.9, 0.85, 0.8, 0.85, 0.9, 1.3,    // 12:00 - 17:00
    1.5, 1.4, 1.2, 0.9, 0.6, 0.35,     // 18:00 - 23:00
];

// ============================================================================
// Helper Functions
// ============================================================================

function poissonRandom(lambda: number): number {
    let L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    return k - 1;
}

function euclideanDistance(p1: Position, p2: Position): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function normalize(p: Position): Position {
    const magnitude = Math.sqrt(p.x * p.x + p.y * p.y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: p.x / magnitude, y: p.y / magnitude };
}

function generateDriverId(): string {
    return `driver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomPosition(): Position {
    return {
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
    };
}

function calculateBatteryUrgency(batteryLevel: number): number {
    if (batteryLevel <= BATTERY_CRITICAL) return 3.0;
    if (batteryLevel <= BATTERY_VERY_LOW) return 2.0;
    if (batteryLevel <= BATTERY_LOW) return 1.5;
    if (batteryLevel <= BATTERY_MODERATE) return 1.2;
    return 1.0;
}

// ============================================================================
// Simulation Engine Class
// ============================================================================

export class SimulationEngine {
    private state: SimulationState;
    private tickInterval: NodeJS.Timeout | null = null;
    private onStateChange: (state: SimulationState) => void;

    constructor(onStateChange: (state: SimulationState) => void) {
        this.onStateChange = onStateChange;
        this.state = this.createInitialState();
    }

    private createInitialState(): SimulationState {
        return {
            isRunning: false,
            isPaused: true,
            speed: 1,
            currentTime: new Date(),
            day: 1,
            stations: [],
            drivers: [],
            kpis: { ...INITIAL_KPIS },
            weather: null,
            carbon: null,
            activeScenario: { type: 'demand', active: true, params: {} },
            history: [],
            failedRides: [],
        };
    }

    public getState(): SimulationState {
        return this.state;
    }

    public setStations(stations: Station[]): void {
        this.state.stations = stations;

        // Calculate initial status for all stations based on inventory
        this.updateStationStatuses();

        // Populate initial drivers if we don't have any yet
        if (this.state.drivers.length === 0) {
            // Randomize initial driver count between 15-40 drivers
            const initialDriverCount = Math.floor(15 + Math.random() * 26);
            this.populateInitialDrivers(initialDriverCount);
        }

        this.recalculateKPIs();
        this.notifyChange();
    }

    private populateInitialDrivers(count: number): void {
        for (let i = 0; i < count; i++) {
            // 20% chance of creating an outlier driver for Last Mile data
            const isOutlier = Math.random() < 0.2;

            let pos: Position;
            let batteryLevel: number;

            if (isOutlier) {
                // Outlier scenarios for Last Mile analytics
                const outlierType = Math.random();

                if (outlierType < 0.4) {
                    // Critical battery outlier (3-12%)
                    batteryLevel = 3 + Math.random() * 9;
                    pos = randomPosition();
                } else if (outlierType < 0.7) {
                    // Very low battery outlier (8-18%)
                    batteryLevel = 8 + Math.random() * 10;
                    pos = randomPosition();
                } else {
                    // Remote location outlier (far from stations)
                    batteryLevel = 12 + Math.random() * 15; // 12-27%
                    // Position at map edges (harder to reach stations)
                    pos = Math.random() < 0.5
                        ? { x: 5 + Math.random() * 10, y: 5 + Math.random() * 90 } // Left edge
                        : { x: 85 + Math.random() * 10, y: 5 + Math.random() * 90 }; // Right edge
                }
            } else {
                // Normal driver
                pos = randomPosition();
                batteryLevel = 10 + Math.random() * 30; // 10-40%
            }

            const geoPos = percentToGeo(pos.x, pos.y);

            const driver: Driver = {
                id: generateDriverId(),
                name: `Rider #${Math.floor(Math.random() * 9000) + 1000}`,
                position: pos,
                geoPosition: geoPos,
                state: 'idle',
                targetStationId: null,
                batteryLevel,
                waitTime: 0,
                travelTime: 0,
                owedAmount: Math.floor(Math.random() * 500),
                swapsToday: Math.floor(Math.random() * 5),
                rerouteAttempts: 0,
            };

            // Select target station
            const target = this.selectStation(driver);
            if (target) {
                driver.targetStationId = target.id;
                driver.state = 'traveling';
                this.state.drivers.push(driver);
            } else if (isOutlier) {
                // For outliers that can't find stations, still add them as abandoned
                // so they get recorded in Last Mile
                driver.state = 'abandoned';
                const reason = this.determineFailureReason(driver);
                this.recordFailedRide(driver, reason, false);
                this.state.drivers.push(driver);
            }
        }
    }

    public setWeather(weather: WeatherData): void {
        this.state.weather = weather;
        this.notifyChange();
    }

    public setCarbon(carbon: { carbonIntensity: number; zone: string; isFallback: boolean; timestamp: string }): void {
        this.state.carbon = carbon;
        this.notifyChange();
    }

    public setScenario(scenario: Scenario): void {
        this.state.activeScenario = scenario;
        this.applyScenarioEffects();
        this.notifyChange();
    }

    public resetScenario(): void {
        // Clear all emergency statuses and restore proper status based on inventory
        for (const station of this.state.stations) {
            if (station.status === 'emergency') {
                // Force status to operational first so updateStationStatus doesn't skip it
                station.status = 'operational';
                this.updateStationStatus(station);
            }
        }

        // Reset scenario to default demand
        this.state.activeScenario = { type: 'demand', active: true, params: {} };
        this.state.kpis.reroutedDrivers = 0;

        this.recalculateKPIs();
        this.notifyChange();
    }

    public start(): void {
        if (this.tickInterval) return;

        this.state.isRunning = true;
        this.state.isPaused = false;

        const tickRate = 1000 / this.state.speed;
        this.tickInterval = setInterval(() => this.tick(), tickRate);
        this.notifyChange();
    }

    public pause(): void {
        this.state.isPaused = true;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.notifyChange();
    }

    public resume(): void {
        if (!this.state.isRunning) return;
        this.state.isPaused = false;

        const tickRate = 1000 / this.state.speed;
        this.tickInterval = setInterval(() => this.tick(), tickRate);
        this.notifyChange();
    }

    public reset(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }

        const stations = this.state.stations;
        const weather = this.state.weather;
        const carbon = this.state.carbon;

        this.state = this.createInitialState();
        this.state.stations = stations;
        this.state.weather = weather;
        this.state.carbon = carbon;

        // Reset station metrics
        this.state.stations = this.state.stations.map(s => ({
            ...s,
            queueLength: 0,
            totalSwaps: Math.floor(Math.random() * 200) + 50,
            lostSwaps: 0,
            utilizationRate: 0.3 + Math.random() * 0.4,
        }));

        this.recalculateKPIs();
        this.notifyChange();
    }

    public setSpeed(speed: number): void {
        this.state.speed = speed;

        if (this.tickInterval && !this.state.isPaused) {
            clearInterval(this.tickInterval);
            const tickRate = 1000 / speed;
            this.tickInterval = setInterval(() => this.tick(), tickRate);
        }

        this.notifyChange();
    }

    private tick(): void {
        // Advance time by 1 minute
        this.state.currentTime = new Date(this.state.currentTime.getTime() + 60000);

        // Check for day change
        if (this.state.currentTime.getHours() === 0 &&
            this.state.currentTime.getMinutes() === 0) {
            this.state.day++;
        }

        // Generate new drivers (demand)
        this.generateDemand();

        // Update all drivers
        this.updateDrivers();

        // Update all stations
        this.updateStations();

        // Recalculate KPIs
        this.recalculateKPIs();

        // Record history every 5 minutes
        if (this.state.currentTime.getMinutes() % 5 === 0) {
            this.state.history.push({
                time: new Date(this.state.currentTime),
                kpis: { ...this.state.kpis },
            });

            // Keep only last 2 hours of history
            if (this.state.history.length > 24) {
                this.state.history = this.state.history.slice(-24);
            }
        }

        this.notifyChange();
    }

    private generateDemand(): void {
        const hour = this.state.currentTime.getHours();
        const baseDemand = DEMAND_CURVE[hour];
        const weatherMultiplier = this.state.weather?.multiplier || 1.0;
        const stationCount = this.state.stations.filter(s => s.status === 'operational').length;

        // Add random variation to base demand (±30%)
        const demandVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3

        // Lambda for Poisson distribution with increased variability
        const lambda = baseDemand * weatherMultiplier * demandVariation * 0.3 * (stationCount / 8);
        const newDriverCount = poissonRandom(lambda);

        for (let i = 0; i < newDriverCount; i++) {
            // 25% chance of creating an outlier driver during peak hours (6-9, 17-20)
            // 15% chance during normal hours
            const isPeakHour = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
            const outlierChance = isPeakHour ? 0.25 : 0.15;
            const isOutlier = Math.random() < outlierChance;

            let pos: Position;
            let batteryLevel: number;

            if (isOutlier) {
                // Create outlier scenarios for Last Mile analytics
                const outlierType = Math.random();

                if (outlierType < 0.35) {
                    // Critical battery outlier (3-12%)
                    batteryLevel = 3 + Math.random() * 9;
                    pos = randomPosition();
                } else if (outlierType < 0.65) {
                    // Very low battery outlier (10-20%)
                    batteryLevel = 10 + Math.random() * 10;
                    pos = randomPosition();
                } else if (outlierType < 0.85) {
                    // Remote location outlier
                    batteryLevel = 15 + Math.random() * 15; // 15-30%
                    // Corners or edges of the map
                    const corner = Math.floor(Math.random() * 4);
                    switch (corner) {
                        case 0: pos = { x: 5 + Math.random() * 10, y: 5 + Math.random() * 10 }; break; // Top-left
                        case 1: pos = { x: 85 + Math.random() * 10, y: 5 + Math.random() * 10 }; break; // Top-right
                        case 2: pos = { x: 5 + Math.random() * 10, y: 85 + Math.random() * 10 }; break; // Bottom-left
                        default: pos = { x: 85 + Math.random() * 10, y: 85 + Math.random() * 10 }; // Bottom-right
                    }
                } else {
                    // Moderate battery but during high queue times (simulates excessive_queue failures)
                    batteryLevel = 20 + Math.random() * 15; // 20-35%
                    pos = randomPosition();
                }
            } else {
                // Normal driver
                pos = randomPosition();
                batteryLevel = 10 + Math.random() * 30; // 10-40%
            }

            const geoPos = percentToGeo(pos.x, pos.y);

            const driver: Driver = {
                id: generateDriverId(),
                name: `Rider #${Math.floor(Math.random() * 9000) + 1000}`,
                position: pos,
                geoPosition: geoPos,
                state: 'idle',
                targetStationId: null,
                batteryLevel,
                waitTime: 0,
                travelTime: 0,
                owedAmount: Math.floor(Math.random() * 500),
                swapsToday: Math.floor(Math.random() * 5),
                rerouteAttempts: 0,
            };

            // Select target station
            const target = this.selectStation(driver);
            if (target) {
                driver.targetStationId = target.id;
                driver.state = 'traveling';
            } else {
                driver.state = 'abandoned';
                const reason = this.determineFailureReason(driver);
                this.recordFailedRide(driver, reason, false);
            }

            this.state.drivers.push(driver);
        }

        // Remove abandoned and completed drivers older than 10 ticks
        this.state.drivers = this.state.drivers.filter(d =>
            d.state !== 'abandoned' && d.state !== 'completed'
        );
    }

    private selectStation(driver: Driver): Station | null {
        const operational = this.state.stations.filter(
            s => s.status === 'operational' && s.currentInventory > 0
        );

        if (operational.length === 0) {
            this.state.kpis.lostSwaps++;
            return null;
        }

        // Calculate battery urgency factor
        const batteryUrgencyFactor = calculateBatteryUrgency(driver.batteryLevel);
        const waitTimeWeight = WAIT_TIME_WEIGHT_BASE / batteryUrgencyFactor;

        // Score stations by distance (with battery urgency) + wait time
        const scored = operational.map(s => ({
            station: s,
            score: (euclideanDistance(driver.position, s.position) * batteryUrgencyFactor) +
                   (s.avgWaitTime * waitTimeWeight),
        })).sort((a, b) => a.score - b.score);

        // Take top 3 and do weighted random selection
        const top3 = scored.slice(0, 3);
        const totalInverseScore = top3.reduce((sum, s) => sum + (1 / s.score), 0);

        let random = Math.random() * totalInverseScore;
        for (const candidate of top3) {
            random -= 1 / candidate.score;
            if (random <= 0) return candidate.station;
        }

        return top3[0]?.station || null;
    }

    private determineFailureReason(driver: Driver): FailureReason {
        // Check if there are any operational stations
        const operationalStations = this.state.stations.filter(s => s.status === 'operational');
        if (operationalStations.length === 0) {
            return 'no_stations_available';
        }

        // Check if all stations have no inventory
        const stationsWithInventory = operationalStations.filter(s => s.currentInventory > 0);
        if (stationsWithInventory.length === 0) {
            return 'no_inventory';
        }

        // Calculate distances to all operational stations with inventory
        const stationDistances = stationsWithInventory.map(station => ({
            station,
            distance: euclideanDistance(driver.position, station.position),
        }));

        const nearestStation = stationDistances.sort((a, b) => a.distance - b.distance)[0];

        // Check for network congestion (all stations have queues > 10)
        const allStationsCongested = stationsWithInventory.every(s => s.queueLength > 10);
        if (allStationsCongested) {
            return 'network_congestion';
        }

        // Check if station is too far for current battery level
        // Approximate: 1% battery = ~1.5 units of travel
        const estimatedRange = driver.batteryLevel * 1.5;
        if (nearestStation && nearestStation.distance > estimatedRange) {
            return 'station_too_far';
        }

        // Check battery level with context
        if (driver.batteryLevel <= 2) {
            return 'stranded'; // Completely out of battery
        }

        if (driver.batteryLevel <= BATTERY_CRITICAL) {
            // Critical battery but station might be reachable
            if (nearestStation && nearestStation.distance > estimatedRange * 0.8) {
                return 'station_too_far';
            }
            return 'critical_battery';
        }

        if (driver.batteryLevel <= BATTERY_LOW) {
            return 'low_battery';
        }

        // Check if target station has excessive queue relative to battery
        const targetStation = driver.targetStationId
            ? this.state.stations.find(s => s.id === driver.targetStationId)
            : null;

        if (targetStation && targetStation.queueLength > 8 && driver.batteryLevel <= BATTERY_MODERATE) {
            return 'excessive_queue';
        }

        // Check for general network congestion with moderate battery
        const avgQueue = operationalStations.reduce((sum, s) => sum + s.queueLength, 0) / operationalStations.length;
        if (avgQueue > 6 && driver.batteryLevel <= BATTERY_MODERATE) {
            return 'network_congestion';
        }

        // Default to low battery
        return 'low_battery';
    }

    private updateDrivers(): void {
        for (const driver of this.state.drivers) {
            switch (driver.state) {
                case 'traveling':
                    this.moveDriver(driver);
                    break;
                case 'queued':
                    driver.waitTime++;
                    break;
                case 'swapping':
                    driver.waitTime++;
                    if (driver.waitTime >= AVG_SWAP_DURATION) {
                        driver.state = 'completed';
                        // Update station
                        const station = this.state.stations.find(s => s.id === driver.targetStationId);
                        if (station) {
                            station.totalSwaps++;
                            station.currentInventory = Math.max(0, station.currentInventory - 1);
                        }
                    }
                    break;
            }
        }
    }

    private moveDriver(driver: Driver): void {
        const station = this.state.stations.find(s => s.id === driver.targetStationId);
        if (!station) {
            driver.state = 'abandoned';
            this.recordFailedRide(driver, 'destination_failed', false);
            return;
        }

        const direction = {
            x: station.position.x - driver.position.x,
            y: station.position.y - driver.position.y,
        };
        const distance = euclideanDistance(driver.position, station.position);

        if (distance <= DRIVER_SPEED) {
            // Arrived at station
            driver.position = { ...station.position };
            driver.geoPosition = { ...station.geoPosition };
            driver.travelTime++;

            // Check if station has capacity
            if (station.queueLength === 0 && station.currentInventory > 0) {
                driver.state = 'swapping';
                driver.waitTime = 0;
            } else {
                driver.state = 'queued';
                driver.waitTime = 0;
                station.queueLength++;
            }
        } else {
            // Move towards station
            const normalized = normalize(direction);
            driver.position.x += normalized.x * DRIVER_SPEED;
            driver.position.y += normalized.y * DRIVER_SPEED;

            const newGeo = percentToGeo(driver.position.x, driver.position.y);
            driver.geoPosition = newGeo;
            driver.travelTime++;

            // Battery drain while traveling (0.5-1.5% per tick)
            // Outlier drivers (already low battery) drain faster
            const baseDrain = 0.5 + Math.random();
            const drainMultiplier = driver.batteryLevel < 15 ? 1.5 : 1.0;
            driver.batteryLevel = Math.max(0, driver.batteryLevel - (baseDrain * drainMultiplier));

            // Check if battery critically low mid-journey
            if (driver.batteryLevel <= 2) {
                driver.state = 'abandoned';
                this.recordFailedRide(driver, 'stranded', false);
                this.state.kpis.lostSwaps++;
                return;
            }

            // Occasionally check if driver should abandon due to low battery + long distance
            if (driver.batteryLevel < 10 && distance > 30 && Math.random() < 0.1) {
                driver.state = 'abandoned';
                this.recordFailedRide(driver, 'low_battery', false);
                this.state.kpis.lostSwaps++;
                return;
            }
        }
    }

    private updateStationStatus(station: Station): void {
        // Skip if station is in emergency or offline state
        if (station.status === 'emergency' || station.status === 'offline') return;

        // Update status based on conditions (multi-level system)
        const inventoryPercent = station.currentInventory / station.inventoryCap;

        if (station.queueLength > station.activeChargers * 2) {
            // Queue is overloaded (orange)
            station.status = 'overloaded';
        } else if (inventoryPercent < 0.2) {
            // Critical low inventory < 20% (orange)
            station.status = 'overloaded';
        } else if (inventoryPercent < 0.6) {
            // Low inventory 20-60% (yellow)
            station.status = 'low-stock';
        } else {
            // Healthy inventory >= 60% (green)
            station.status = 'operational';
        }
    }

    private updateStationStatuses(): void {
        for (const station of this.state.stations) {
            this.updateStationStatus(station);
        }
    }

    private updateStations(): void {
        for (const station of this.state.stations) {
            if (station.status === 'emergency' || station.status === 'offline') continue;

            // Battery charging simulation
            const chargeProb = Math.min(
                MAX_CHARGE_COMPLETION_PROBABILITY,
                station.activeChargers * CHARGE_COMPLETION_PROBABILITY_BASE
            );

            if (Math.random() < chargeProb && station.chargingBatteries > 0) {
                station.currentInventory = Math.min(
                    station.inventoryCap,
                    station.currentInventory + 1
                );
                station.chargingBatteries--;
            }

            // Refill chargers from uncharged pool (15% chance per tick)
            if (Math.random() < 0.15 && station.chargingBatteries < station.activeChargers) {
                station.chargingBatteries++;
            }

            // Process queue
            if (station.queueLength > 0 && station.currentInventory > 0) {
                const queuedDrivers = this.state.drivers.filter(
                    d => d.targetStationId === station.id && d.state === 'queued'
                );

                if (queuedDrivers.length > 0) {
                    const driver = queuedDrivers[0];
                    driver.state = 'swapping';
                    driver.waitTime = 0;
                    station.queueLength--;
                }
            }

            // Update station metrics
            station.avgWaitTime = (station.queueLength * AVG_SWAP_DURATION) /
                Math.max(1, station.activeChargers);
            station.utilizationRate = station.chargingBatteries /
                Math.max(1, station.activeChargers);
            station.peakQueueLength = Math.max(station.peakQueueLength, station.queueLength);

            // Update status
            this.updateStationStatus(station);
        }
    }

    private recalculateKPIs(): void {
        const operational = this.state.stations.filter(s => s.status !== 'offline');

        if (operational.length === 0) {
            this.state.kpis = { ...INITIAL_KPIS };
            return;
        }

        const totalWaitTime = operational.reduce((sum, s) => sum + s.avgWaitTime, 0);
        const totalUtilization = operational.reduce((sum, s) => sum + s.utilizationRate, 0);
        const totalSwaps = operational.reduce((sum, s) => sum + s.totalSwaps, 0);
        const totalInventory = operational.reduce((sum, s) => sum + s.currentInventory, 0);
        const totalCapacity = operational.reduce((sum, s) => sum + s.inventoryCap, 0);
        const totalLostSwaps = operational.reduce((sum, s) => sum + s.lostSwaps, 0);
        const peakWait = Math.max(...operational.map(s => s.avgWaitTime));

        this.state.kpis = {
            avgWaitTime: totalWaitTime / operational.length,
            lostSwaps: totalLostSwaps + this.state.kpis.lostSwaps,
            chargerUtilization: (totalUtilization / operational.length) * 100,
            cityThroughput: (totalSwaps / Math.max(1, this.state.day)) * 24,
            activeDrivers: this.state.drivers.filter(d =>
                d.state === 'traveling' || d.state === 'queued' || d.state === 'swapping'
            ).length,
            totalStations: this.state.stations.length,
            operationalStations: operational.length,
            totalInventory,
            totalCapacity,
            peakWaitTime: peakWait,
            reroutedDrivers: 0,
        };
    }

    private applyScenarioEffects(): void {
        const scenario = this.state.activeScenario;

        switch (scenario.type) {
            case 'failures':
                // Mark a random station as emergency
                if (this.state.stations.length > 0) {
                    const idx = Math.floor(Math.random() * this.state.stations.length);
                    this.state.stations[idx].status = 'emergency';
                    this.rerouteDrivers(this.state.stations[idx].id);
                }
                break;

            case 'capacity':
                // Adjust charger counts
                const delta = (scenario.params.chargerDelta as number) || 0;
                this.state.stations = this.state.stations.map(s => ({
                    ...s,
                    chargers: Math.max(1, s.chargers + delta),
                    activeChargers: Math.max(1, s.activeChargers + delta),
                }));
                break;

            case 'demand':
                // Weather already affects demand through weatherMultiplier
                break;
        }
    }

    private rerouteDrivers(failedStationId: string): void {
        const travelingDrivers = this.state.drivers.filter(
            d => d.targetStationId === failedStationId && d.state === 'traveling'
        );

        const queuedDrivers = this.state.drivers.filter(
            d => d.targetStationId === failedStationId && d.state === 'queued'
        );

        const failedStation = this.state.stations.find(s => s.id === failedStationId);

        // Reroute traveling drivers
        for (const driver of travelingDrivers) {
            // Track reroute attempts
            driver.rerouteAttempts = (driver.rerouteAttempts || 0) + 1;

            // Check if exceeded max reroute attempts (3)
            if (driver.rerouteAttempts > 3) {
                driver.state = 'abandoned';
                this.state.kpis.lostSwaps++;
                this.recordFailedRide(driver, 'multiple_reroutes', true);
                continue;
            }

            const newTarget = this.selectStation(driver);
            if (newTarget) {
                driver.targetStationId = newTarget.id;
                this.state.kpis.reroutedDrivers++;
            } else {
                driver.state = 'abandoned';
                this.state.kpis.lostSwaps++;
                this.recordFailedRide(driver, 'rerouting_failed', true);
            }
        }

        // Reroute queued drivers
        for (const driver of queuedDrivers) {
            // Track reroute attempts
            driver.rerouteAttempts = (driver.rerouteAttempts || 0) + 1;

            // Check if exceeded max reroute attempts (3)
            if (driver.rerouteAttempts > 3) {
                driver.state = 'abandoned';
                this.state.kpis.lostSwaps++;
                this.recordFailedRide(driver, 'multiple_reroutes', true);
                // Still decrement queue
                if (failedStation) {
                    failedStation.queueLength = Math.max(0, failedStation.queueLength - 1);
                }
                continue;
            }

            // Decrement failed station's queue count
            if (failedStation) {
                failedStation.queueLength = Math.max(0, failedStation.queueLength - 1);
            }

            // Change state from queued back to traveling
            driver.state = 'traveling';
            driver.waitTime = 0;

            // Find new target station (will use battery-aware logic)
            const newTarget = this.selectStation(driver);
            if (newTarget) {
                driver.targetStationId = newTarget.id;
                this.state.kpis.reroutedDrivers++;
            } else {
                driver.state = 'abandoned';
                this.state.kpis.lostSwaps++;
                this.recordFailedRide(driver, 'rerouting_failed', true);
            }
        }
    }

    private recordFailedRide(driver: Driver, reason: FailureReason, wasRerouted: boolean = false): void {
        const targetStation = driver.targetStationId
            ? this.state.stations.find(s => s.id === driver.targetStationId)
            : null;

        // Calculate distance to target station if available
        let targetDistance = null;
        if (targetStation) {
            targetDistance = euclideanDistance(driver.position, targetStation.position);
        }

        // Get nearby stations (within 30 units) for context
        const nearbyStations: NearbyStationSnapshot[] = this.state.stations
            .map(station => ({
                station,
                distance: euclideanDistance(driver.position, station.position),
            }))
            .filter(({ distance }) => distance <= 30)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5) // Top 5 nearest stations
            .map(({ station, distance }) => ({
                stationId: station.id,
                stationName: station.name,
                distance,
                status: station.status,
                currentInventory: station.currentInventory,
                queueLength: station.queueLength,
                avgWaitTime: station.avgWaitTime,
            }));

        // Calculate network metrics
        const operational = this.state.stations.filter(s => s.status === 'operational');
        const totalInventory = this.state.stations.reduce((sum, s) => sum + s.currentInventory, 0);
        const avgUtilization = operational.length > 0
            ? operational.reduce((sum, s) => sum + s.utilizationRate, 0) / operational.length
            : 0;
        const avgWaitTime = operational.length > 0
            ? operational.reduce((sum, s) => sum + s.avgWaitTime, 0) / operational.length
            : 0;

        const failedRide: FailedRide = {
            // Driver Information
            driverId: driver.id,
            driverName: driver.name,

            // Location Data
            failurePosition: { ...driver.position },
            failureGeoPosition: { ...driver.geoPosition },
            originPosition: { ...driver.position }, // We don't track origin, so use current as proxy
            originGeoPosition: { ...driver.geoPosition },

            // Battery & Journey Data
            batteryLevel: driver.batteryLevel,
            travelTime: driver.travelTime,
            waitTime: driver.waitTime,

            // Target Station Data
            targetStationId: driver.targetStationId,
            targetStationName: targetStation?.name || null,
            targetStationDistance: targetDistance,

            // Failure Context
            failureReason: reason,
            failureTimestamp: new Date(this.state.currentTime),
            simulationDay: this.state.day,
            hourOfDay: this.state.currentTime.getHours(),

            // Environmental Context
            weatherCondition: this.state.weather?.condition || null,
            weatherMultiplier: this.state.weather?.multiplier || null,
            temperature: this.state.weather?.temperature || null,

            // Network State
            operationalStationsCount: operational.length,
            totalNetworkInventory: totalInventory,
            networkUtilization: avgUtilization,
            avgNetworkWaitTime: avgWaitTime,

            // Nearby Stations Context
            nearbyStations,

            // Rerouting History
            wasRerouted,
            rerouteAttempts: driver.rerouteAttempts || 0,

            // Financial Impact
            owedAmount: driver.owedAmount,
            swapsToday: driver.swapsToday,
        };

        this.state.failedRides.push(failedRide);
    }

    public toggleStationFailure(stationId: string): void {
        const station = this.state.stations.find(s => s.id === stationId);
        if (!station) return;

        if (station.status === 'emergency') {
            // Remove emergency status - recalculate proper status based on inventory
            const inventoryPercent = station.currentInventory / station.inventoryCap;
            if (station.queueLength > station.activeChargers * 2) {
                station.status = 'overloaded';
            } else if (inventoryPercent < 0.2) {
                station.status = 'overloaded';
            } else if (inventoryPercent < 0.6) {
                station.status = 'low-stock';
            } else {
                station.status = 'operational';
            }
        } else {
            // Set to emergency status
            station.status = 'emergency';
            // Reroute drivers heading to this station
            this.rerouteDrivers(stationId);
        }

        this.recalculateKPIs();
        this.notifyChange();
    }

    private notifyChange(): void {
        this.onStateChange({ ...this.state });
    }

    public destroy(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
}
