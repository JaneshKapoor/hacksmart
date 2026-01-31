// Enhanced Simulation Engine with improved KPIs, demand modeling, and all scenarios

import {
    Station, Driver, SimulationState, KPIMetrics, TimeSeriesPoint,
    ScenarioConfig, Intervention, DemandConfig, PricingConfig, InventoryConfig,
    SimulationAlert, ScenarioType
} from './types';
import {
    initialStations, initialDrivers, baselineKPIs,
    defaultDemandConfig, defaultPricingConfig, defaultInventoryConfig,
    demandCurves, IEX_WHOLESALE_PRICE_CURVE, DELHI_TOD_MULTIPLIERS, CHARGER_POWER_KW,
    DRIVER_NAMES, generateVehicleId
} from './mockData';
import type { WeatherData, CarbonData, RoutingMatrix } from './types';
import { haversine, percentToGeo } from '@/lib/geoUtils';

export interface EngineConfig {
    stations?: Station[];
    drivers?: Driver[];
}

// Poisson-distributed random number
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

const AVG_SWAP_DURATION = 4; // minutes per swap
const DRIVER_SPEED = 8; // units per minute (percentage-based)
const MAX_DRIVERS = 50;

export class SimulationEngine {
    private state: SimulationState;
    private config: EngineConfig;
    private recentSwaps: number[] = []; // timestamps of recent completed swaps
    private _lastElectricityCost: number = 0;
    private _lastEffectiveRate: number = 0;

    constructor(config?: EngineConfig) {
        this.config = config || {};
        this.state = this.createInitialState();
    }

    private createInitialState(): SimulationState {
        const stations = this.config.stations
            ? JSON.parse(JSON.stringify(this.config.stations))
            : JSON.parse(JSON.stringify(initialStations));
        const drivers = this.config.drivers
            ? JSON.parse(JSON.stringify(this.config.drivers))
            : JSON.parse(JSON.stringify(initialDrivers));

        const computedBaseline = this.computeBaselineKPIs(stations);

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const timeInMinutes = currentHour * 60 + currentMinute;

        return {
            time: timeInMinutes,
            day: 1,
            hour: currentHour,
            stations,
            drivers,
            baselineKPIs: computedBaseline,
            scenarioKPIs: { ...computedBaseline },
            timeSeriesData: [],
            isRunning: false,
            speed: 1,
            activeScenario: null,
            interventions: [],
            demandConfig: { ...defaultDemandConfig },
            pricingConfig: { ...defaultPricingConfig },
            inventoryConfig: { ...defaultInventoryConfig },
            alerts: [],
        };
    }

    private computeBaselineKPIs(stations: Station[]): KPIMetrics {
        const operational = stations.filter(
            (s) => s.status !== 'fire' && s.status !== 'power_outage' && s.status !== 'offline'
        );
        if (operational.length === 0) return { ...baselineKPIs };

        const totalWaitTime = operational.reduce((sum, s) => sum + s.avgWaitTime, 0);
        const activeChargers = operational.reduce((sum, s) => sum + s.activeChargers, 0);
        const totalInventory = operational.reduce((sum, s) => sum + s.inventoryCap, 0);
        const currentInventory = operational.reduce((sum, s) => sum + s.currentInventory, 0);
        const chargingCount = operational.reduce((sum, s) => sum + s.chargingBatteries, 0);
        const totalSwaps = operational.reduce((sum, s) => sum + s.totalSwaps, 0);
        const totalLostSwaps = operational.reduce((sum, s) => sum + s.lostSwaps, 0);

        return {
            avgWaitTime: totalWaitTime / operational.length,
            lostSwaps: totalLostSwaps,
            idleInventory: Math.max(0, totalInventory - currentInventory - chargingCount),
            chargerUtilization: activeChargers > 0 ? chargingCount / activeChargers : 0,
            operationalCost: this.calculateOperationalCost(operational),
            cityThroughput: Math.floor((activeChargers * 60) / AVG_SWAP_DURATION),
            reroutedDrivers: 0,
            emergencyEvents: 0,
            revenue: totalSwaps * 150,
            peakWaitTime: Math.max(...operational.map((s) => s.avgWaitTime), 0),
            averageQueueLength: operational.reduce((sum, s) => sum + s.queueLength, 0) / operational.length,
        };
    }

    loadNewStations(newStations: Station[]): void {
        this.config.stations = newStations;
        this.state = this.createInitialState();
        this.recentSwaps = [];
    }

    getState(): SimulationState {
        return this.state;
    }

    reset(): void {
        const currentScenario = this.state.activeScenario;
        const currentInterventions = this.state.interventions;
        this.state = this.createInitialState();
        this.recentSwaps = [];
        this.state.activeScenario = currentScenario;
        this.state.interventions = currentInterventions;

        currentInterventions.forEach((int) => this.applyIntervention(int));
        this.recalculateKPIs();
    }

    setScenario(type: ScenarioType): void {
        if (type === 'baseline') {
            this.state.activeScenario = null;
            this.state.interventions = [];
            this.reset();
        } else {
            this.state.activeScenario = {
                type,
                name: type,
                description: '',
                params: {},
            };
        }
    }

    applyInterventions(interventions: Intervention[]): void {
        this.state.interventions = interventions;
        this.reset();
        interventions.forEach((int) => this.applyIntervention(int));
        this.recalculateKPIs();
    }

    private applyIntervention(intervention: Intervention): void {
        switch (intervention.type) {
            case 'add_station':
                if (intervention.position) {
                    const newStation: Station = {
                        id: `station-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        name: `New Station`,
                        location: 'New Location',
                        position: intervention.position,
                        chargers: (intervention.params?.chargers as number) || 8,
                        activeChargers: (intervention.params?.chargers as number) || 8,
                        chargerType: 'mixed',
                        bays: (intervention.params?.bays as number) || 40,
                        inventoryCap: 30,
                        currentInventory: 25,
                        chargingBatteries: 3,
                        queueLength: 0,
                        status: 'operational',
                        utilizationRate: 0.5,
                        avgWaitTime: 2.0,
                        totalSwaps: 0,
                        lostSwaps: 0,
                        peakQueueLength: 0,
                        operatingHours: { start: 0, end: 24 },
                        coverageRadius: 3,
                        isNew: true,
                    };
                    this.state.stations.push(newStation);
                }
                break;

            case 'remove_station':
                if (intervention.stationId) {
                    const station = this.state.stations.find((s) => s.id === intervention.stationId);
                    if (station) {
                        station.status = 'offline';
                        station.activeChargers = 0;
                        this.rerouteFromStation(intervention.stationId);
                        this.addAlert('warning', `Station ${station.name} taken offline`, station.id);
                    }
                }
                break;

            case 'modify_chargers':
                if (intervention.stationId && typeof intervention.value === 'number') {
                    const newChargerCount = intervention.value;
                    const station = this.state.stations.find((s) => s.id === intervention.stationId);
                    if (station) {
                        station.chargers = Math.max(1, newChargerCount);
                        station.activeChargers = Math.max(1, newChargerCount);
                    }
                }
                break;

            case 'trigger_emergency':
                if (intervention.stationId && intervention.emergencyType) {
                    const station = this.state.stations.find((s) => s.id === intervention.stationId);
                    if (station) {
                        switch (intervention.emergencyType) {
                            case 'fire':
                                station.status = 'fire';
                                station.activeChargers = 0;
                                this.addAlert('danger', `Fire emergency at ${station.name}!`, station.id);
                                break;
                            case 'power_outage':
                                station.status = 'power_outage';
                                station.activeChargers = 0;
                                this.addAlert('danger', `Power outage at ${station.name}`, station.id);
                                break;
                            case 'overload':
                                station.status = 'overloaded';
                                station.queueLength = station.bays * 2;
                                this.addAlert('warning', `${station.name} is overloaded`, station.id);
                                break;
                            case 'charger_failure':
                                station.activeChargers = Math.max(1, Math.floor(station.chargers / 2));
                                this.addAlert('warning', `Charger failure at ${station.name}`, station.id);
                                break;
                            case 'no_battery':
                                station.currentInventory = 0;
                                station.status = 'low_inventory';
                                this.addAlert('warning', `No batteries at ${station.name}`, station.id);
                                break;
                        }
                        this.rerouteFromStation(station.id);
                        this.state.scenarioKPIs.emergencyEvents++;
                    }
                }
                break;

            case 'demand_shift':
                if (typeof intervention.value === 'number') {
                    const demandMultiplier = intervention.value;
                    this.state.demandConfig.weatherMultiplier = demandMultiplier;
                    this.state.stations.forEach((station) => {
                        if (station.status === 'offline' || station.status === 'fire' || station.status === 'power_outage') return;
                        station.queueLength = Math.floor(station.queueLength * demandMultiplier);
                        station.utilizationRate = Math.min(0.99, station.utilizationRate * demandMultiplier);
                        station.avgWaitTime *= demandMultiplier;
                        if (station.utilizationRate > 0.9 && station.status === 'operational') {
                            station.status = 'overloaded';
                        }
                    });
                }
                break;

            case 'pricing_change':
                if (typeof intervention.value === 'number') {
                    const priceMultiplier = intervention.value;
                    this.state.pricingConfig.peakMultiplier = priceMultiplier;
                    const priceEffect = 1 - (priceMultiplier - 1) * 0.3;
                    this.state.demandConfig.weatherMultiplier *= priceEffect;
                }
                break;

            case 'schedule_maintenance':
                if (intervention.stationId) {
                    const station = this.state.stations.find((s) => s.id === intervention.stationId);
                    if (station) {
                        station.status = 'maintenance';
                        station.activeChargers = Math.max(1, Math.floor(station.chargers * 0.3));
                        this.addAlert('info', `${station.name} scheduled for maintenance`, station.id);
                        this.rerouteFromStation(station.id);
                    }
                }
                break;

            case 'change_policy':
                if (intervention.params) {
                    const { safetyStock, rebalanceThreshold } = intervention.params as { safetyStock?: number; rebalanceThreshold?: number };
                    if (safetyStock !== undefined) {
                        this.state.inventoryConfig.safetyStock = safetyStock;
                    }
                    if (rebalanceThreshold !== undefined) {
                        this.state.inventoryConfig.rebalanceThreshold = rebalanceThreshold;
                    }
                    // Apply inventory rebalancing immediately
                    this.state.stations.forEach((station) => {
                        if (station.status === 'offline' || station.status === 'fire' || station.status === 'power_outage') return;
                        const threshold = this.state.inventoryConfig.safetyStock;
                        if (station.currentInventory < threshold) {
                            // Simulate emergency restocking
                            station.currentInventory = Math.min(station.inventoryCap, threshold + 5);
                            this.addAlert('info', `Restocked ${station.name} to safety level`, station.id);
                        }
                    });
                }
                break;
        }
    }

    private addAlert(type: 'info' | 'warning' | 'danger', message: string, stationId?: string): void {
        this.state.alerts.unshift({
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type,
            message,
            stationId,
            timestamp: this.state.time,
        });
        if (this.state.alerts.length > 10) {
            this.state.alerts.pop();
        }
    }

    private rerouteFromStation(stationId: string): void {
        const affectedDrivers = this.state.drivers.filter(
            (d) => d.targetStationId === stationId && d.status !== 'complete' && d.status !== 'abandoned'
        );

        affectedDrivers.forEach((driver) => {
            driver.originalStationId = driver.targetStationId || undefined;
            const nearest = this.findNearestAvailableStation(driver.position, stationId);
            if (nearest) {
                driver.targetStationId = nearest.id;
                driver.status = 'rerouting';
                driver.eta = this.calculateETA(driver.position, nearest.position);
                this.state.scenarioKPIs.reroutedDrivers++;
            } else {
                driver.status = 'abandoned';
                this.state.scenarioKPIs.lostSwaps++;
            }
        });
    }

    private findNearestAvailableStation(position: { x: number; y: number }, excludeId: string): Station | null {
        const available = this.state.stations.filter(
            (s) =>
                s.id !== excludeId &&
                s.status === 'operational' &&
                s.currentInventory > 0 &&
                s.activeChargers > 0
        );

        if (available.length === 0) return null;

        return available.reduce((nearest, station) => {
            const distCurrent = this.getDistanceMetric(position, station);
            const distNearest = this.getDistanceMetric(position, nearest);
            const scoreCurrent = distCurrent + station.avgWaitTime * 2;
            const scoreNearest = distNearest + nearest.avgWaitTime * 2;
            return scoreCurrent < scoreNearest ? station : nearest;
        });
    }

    /**
     * Get distance metric from an arbitrary position to a station.
     * Uses Haversine via geo coordinates for realistic distances.
     */
    private getDistanceMetric(position: { x: number; y: number }, station: Station): number {
        const fromGeo = percentToGeo(position.x, position.y);
        const toGeo = station.geoPosition || percentToGeo(station.position.x, station.position.y);
        // Return distance in km for scoring
        return haversine(fromGeo.lat, fromGeo.lng, toGeo.lat, toGeo.lng) / 1000;
    }

    /**
     * Look up routing matrix distance between two known stations (in meters).
     * Returns null if matrix unavailable or stations not found.
     */
    private getMatrixDistance(fromStationId: string, toStationId: string): number | null {
        const matrix = this.state.routingMatrix;
        if (!matrix || matrix.fallback || !matrix.distances) return null;
        const fromIdx = matrix.stationIds.indexOf(fromStationId);
        const toIdx = matrix.stationIds.indexOf(toStationId);
        if (fromIdx === -1 || toIdx === -1) return null;
        return matrix.distances[fromIdx][toIdx];
    }

    /**
     * Look up routing matrix duration between two known stations (in seconds).
     */
    private getMatrixDuration(fromStationId: string, toStationId: string): number | null {
        const matrix = this.state.routingMatrix;
        if (!matrix || matrix.fallback || !matrix.durations) return null;
        const fromIdx = matrix.stationIds.indexOf(fromStationId);
        const toIdx = matrix.stationIds.indexOf(toStationId);
        if (fromIdx === -1 || toIdx === -1) return null;
        return matrix.durations[fromIdx][toIdx];
    }

    private calculateDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }

    private calculateETA(from: { x: number; y: number }, to: { x: number; y: number }): number {
        // Try geo-based ETA: haversine distance / average city speed (~25 km/h)
        const fromGeo = percentToGeo(from.x, from.y);
        const toGeo = percentToGeo(to.x, to.y);
        const distMeters = haversine(fromGeo.lat, fromGeo.lng, toGeo.lat, toGeo.lng);
        const avgSpeedMPerMin = (25 * 1000) / 60; // 25 km/h in m/min
        const geoEta = Math.max(1, Math.ceil(distMeters / avgSpeedMPerMin));
        return geoEta;
    }

    step(): void {
        if (!this.state.isRunning) return;

        this.state.time += 1;
        this.state.hour = Math.floor(this.state.time / 60) % 24;

        if (this.state.time % 1440 === 0) {
            this.state.day += 1;
        }

        // Get current demand level using Poisson distribution
        const hourDemand = demandCurves[this.state.hour] * this.state.demandConfig.weatherMultiplier;
        const lambda = hourDemand * 0.2 * (this.state.stations.length / 8); // Scale with station count
        const requestCount = poissonRandom(lambda);

        for (let i = 0; i < requestCount; i++) {
            this.generateSwapRequest();
        }

        this.updateDrivers();
        this.updateStations();

        // Record time series data every 30 minutes
        if (this.state.time % 30 === 0) {
            this.recordTimeSeriesPoint();
        }

        // Clean old swap timestamps (keep last 60 min)
        this.recentSwaps = this.recentSwaps.filter(t => this.state.time - t <= 60);

        this.recalculateKPIs();
    }

    private generateSwapRequest(): void {
        const operational = this.state.stations.filter(
            (s) => s.status === 'operational' || s.status === 'low_inventory'
        );
        if (operational.length === 0) return;

        // Smart station selection: pick nearest station from a random spawn point
        const spawnX = Math.random() * 100;
        const spawnY = Math.random() * 100;
        const spawnPos = { x: spawnX, y: spawnY };

        // Score each station and pick the best (weighted random)
        const scored = operational.map(s => ({
            station: s,
            score: this.calculateDistance(spawnPos, s.position) + s.avgWaitTime * 3,
        }));
        scored.sort((a, b) => a.score - b.score);

        // Pick from top 3 with weighted probability (closer = more likely)
        const topN = scored.slice(0, Math.min(3, scored.length));
        const totalInverseScore = topN.reduce((sum, s) => sum + (1 / s.score), 0);
        let rand = Math.random() * totalInverseScore;
        let target = topN[0].station;
        for (const s of topN) {
            rand -= (1 / s.score);
            if (rand <= 0) { target = s.station; break; }
        }

        target.queueLength += 1;
        if (target.queueLength > target.bays * 1.5 && target.status === 'operational') {
            target.status = 'overloaded';
        }

        const batteryLevel: Driver['batteryLevel'] = Math.random() < 0.15 ? 'critical' : Math.random() < 0.35 ? 'low' : 'normal';
        const batteryPercent = batteryLevel === 'critical'
            ? Math.floor(Math.random() * 15) + 1
            : batteryLevel === 'low'
                ? Math.floor(Math.random() * 25) + 20
                : Math.floor(Math.random() * 40) + 45;
        const swapsToday = Math.floor(Math.random() * 5);
        const driverName = DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)];
        const vehicleId = generateVehicleId();
        const newDriver: Driver = {
            id: `driver-${this.state.time}-${Math.random().toString(36).slice(2, 6)}`,
            name: driverName,
            vehicleId,
            position: {
                x: target.position.x + (Math.random() - 0.5) * 15,
                y: target.position.y + (Math.random() - 0.5) * 15,
            },
            targetStationId: target.id,
            status: 'en_route',
            eta: this.calculateETA(
                { x: target.position.x + (Math.random() - 0.5) * 15, y: target.position.y + (Math.random() - 0.5) * 15 },
                target.position
            ),
            batteryLevel,
            batteryPercent,
            swapsToday,
            amountOwed: swapsToday * 99,
        };
        this.state.drivers.push(newDriver);

        if (this.state.drivers.length > MAX_DRIVERS) {
            this.state.drivers = this.state.drivers.slice(-MAX_DRIVERS);
        }
    }

    private updateDrivers(): void {
        this.state.drivers.forEach((driver) => {
            if (driver.status === 'en_route' || driver.status === 'rerouting') {
                driver.eta = Math.max(0, driver.eta - 1);

                // Linear movement toward target
                const target = this.state.stations.find((s) => s.id === driver.targetStationId);
                if (target) {
                    const dx = target.position.x - driver.position.x;
                    const dy = target.position.y - driver.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.5) {
                        const step = Math.min(DRIVER_SPEED, dist);
                        driver.position.x += (dx / dist) * step;
                        driver.position.y += (dy / dist) * step;
                    }
                }

                if (driver.eta === 0) {
                    driver.status = 'swapping';
                    driver.waitTime = 0;
                }

                // Battery drain while traveling
                driver.batteryPercent = Math.max(1, driver.batteryPercent - (Math.random() < 0.3 ? 1 : 0));
                if (driver.batteryPercent < 20 && driver.batteryLevel !== 'critical') {
                    driver.batteryLevel = 'critical';
                } else if (driver.batteryPercent < 45 && driver.batteryLevel === 'normal') {
                    driver.batteryLevel = 'low';
                }
            } else if (driver.status === 'swapping') {
                // Fixed swap duration: increment wait time, complete after AVG_SWAP_DURATION
                driver.waitTime = (driver.waitTime || 0) + 1;
                if (driver.waitTime >= AVG_SWAP_DURATION) {
                    driver.swapsToday += 1;
                    driver.amountOwed += 99;
                    driver.batteryPercent = Math.min(100, 80 + Math.floor(Math.random() * 20));
                    driver.batteryLevel = 'normal';
                    driver.status = 'complete';
                    driver.completedAt = this.state.time;
                    const station = this.state.stations.find((s) => s.id === driver.targetStationId);
                    if (station) {
                        station.queueLength = Math.max(0, station.queueLength - 1);
                        station.currentInventory = Math.max(0, station.currentInventory - 1);
                        station.totalSwaps += 1;
                        this.recentSwaps.push(this.state.time);
                    }
                }
            } else if (driver.status === 'seeking') {
                // Seeking drivers look for nearest station
                const nearest = this.findNearestAvailableStation(driver.position, '');
                if (nearest) {
                    driver.targetStationId = nearest.id;
                    driver.status = 'en_route';
                    driver.eta = this.calculateETA(driver.position, nearest.position);
                } else {
                    driver.status = 'abandoned';
                    this.state.scenarioKPIs.lostSwaps++;
                }
            }
        });

        // Mark abandoned drivers with completedAt, then remove after 30 ticks
        this.state.drivers.forEach((d) => {
            if (d.status === 'abandoned' && !d.completedAt) {
                d.completedAt = this.state.time;
            }
        });
        this.state.drivers = this.state.drivers.filter((d) => {
            if (d.status !== 'complete' && d.status !== 'abandoned') return true;
            if (!d.completedAt) return true;
            return this.state.time - d.completedAt < 30;
        });
    }

    private updateStations(): void {
        this.state.stations.forEach((station) => {
            if (station.status === 'fire' || station.status === 'power_outage' || station.status === 'offline') {
                return;
            }

            // Charge batteries
            if (station.chargingBatteries > 0 && station.activeChargers > 0) {
                const chargeProb = Math.min(0.95, station.activeChargers * 0.06);
                if (Math.random() < chargeProb) {
                    station.currentInventory = Math.min(station.inventoryCap, station.currentInventory + 1);
                    station.chargingBatteries = Math.max(0, station.chargingBatteries - 1);
                }
            }

            // Replenish charging queue
            if (station.chargingBatteries < station.activeChargers) {
                const slotsAvailable = station.activeChargers - station.chargingBatteries;
                const batteriesToCharge = station.inventoryCap - station.currentInventory - station.chargingBatteries;
                if (batteriesToCharge > 0) {
                    station.chargingBatteries += Math.min(slotsAvailable, Math.ceil(batteriesToCharge * 0.15));
                }
            }

            // Update wait time using queuing model: (queue * swap_duration) / chargers
            if (station.activeChargers > 0) {
                station.avgWaitTime = Math.max(0.3,
                    (station.queueLength * AVG_SWAP_DURATION) / station.activeChargers +
                    (Math.random() * 0.4 - 0.2) // small noise
                );
            } else {
                station.avgWaitTime = station.queueLength * AVG_SWAP_DURATION;
            }
            station.peakQueueLength = Math.max(station.peakQueueLength, station.queueLength);

            // Update utilization: actual charger usage
            if (station.activeChargers > 0) {
                station.utilizationRate = Math.min(0.99, station.chargingBatteries / station.activeChargers);
            }

            // Status transitions
            if (station.status === 'operational' && station.currentInventory < 5) {
                station.status = 'low_inventory';
                this.addAlert('warning', `Low inventory at ${station.name}`, station.id);
            } else if (station.status === 'low_inventory' && station.currentInventory >= 10) {
                station.status = 'operational';
            }
            if (station.status === 'overloaded' && station.queueLength <= station.bays * 0.3) {
                station.status = 'operational';
            }
        });
    }

    private recordTimeSeriesPoint(): void {
        const point: TimeSeriesPoint = {
            time: this.state.time,
            avgWaitTime: this.state.scenarioKPIs.avgWaitTime,
            throughput: this.state.scenarioKPIs.cityThroughput,
            lostSwaps: this.state.scenarioKPIs.lostSwaps,
            utilization: this.state.scenarioKPIs.chargerUtilization,
            cost: this.state.scenarioKPIs.operationalCost,
        };
        this.state.timeSeriesData.push(point);

        if (this.state.timeSeriesData.length > 48) {
            this.state.timeSeriesData.shift();
        }
    }

    private recalculateKPIs(): void {
        const operational = this.state.stations.filter(
            (s) => s.status !== 'fire' && s.status !== 'power_outage' && s.status !== 'offline'
        );

        if (operational.length === 0) return;

        const totalWaitTime = operational.reduce((sum, s) => sum + s.avgWaitTime, 0);
        const activeChargers = operational.reduce((sum, s) => sum + s.activeChargers, 0);
        const totalInventory = operational.reduce((sum, s) => sum + s.inventoryCap, 0);
        const currentInventory = operational.reduce((sum, s) => sum + s.currentInventory, 0);
        const chargingCount = operational.reduce((sum, s) => sum + s.chargingBatteries, 0);
        const totalLostSwaps = operational.reduce((sum, s) => sum + s.lostSwaps, 0);
        const totalSwaps = operational.reduce((sum, s) => sum + s.totalSwaps, 0);

        // Track actual throughput from recent swaps
        const actualThroughput = this.recentSwaps.length > 0
            ? Math.round(this.recentSwaps.length * (60 / Math.max(1, this.recentSwaps.length)))
            : Math.floor((activeChargers * 60) / AVG_SWAP_DURATION);

        const opCost = this.calculateOperationalCost(operational);

        // Carbon footprint calculation
        const carbonIntensity = this.state.carbonData?.carbonIntensity ?? 720;
        const kwhPerSwap = 3.5;
        const carbonFootprintPerSwap = carbonIntensity * kwhPerSwap; // gCO2 per swap

        this.state.scenarioKPIs = {
            ...this.state.scenarioKPIs,
            avgWaitTime: totalWaitTime / operational.length,
            lostSwaps: totalLostSwaps + this.state.drivers.filter(d => d.status === 'abandoned').length,
            idleInventory: Math.max(0, totalInventory - currentInventory - chargingCount),
            chargerUtilization: activeChargers > 0 ? chargingCount / activeChargers : 0,
            operationalCost: opCost,
            cityThroughput: Math.max(actualThroughput, Math.floor((activeChargers * 60) / AVG_SWAP_DURATION * 0.7)),
            revenue: totalSwaps * 150,
            peakWaitTime: Math.max(...operational.map(s => s.avgWaitTime), 0),
            averageQueueLength: operational.reduce((sum, s) => sum + s.queueLength, 0) / operational.length,
            electricityCost: this._lastElectricityCost,
            carbonIntensity,
            carbonFootprintPerSwap,
            totalCarbonFootprint: carbonFootprintPerSwap * totalSwaps,
        };
    }

    private calculateOperationalCost(stations: Station[]): number {
        const hour = this.state?.hour ?? 8;
        const effectiveRate = IEX_WHOLESALE_PRICE_CURVE[hour] * DELHI_TOD_MULTIPLIERS[hour];
        this._lastEffectiveRate = effectiveRate;

        let fixedCost = 0;
        let electricityCost = 0;

        stations.forEach((station) => {
            fixedCost += 5000;  // Base station cost per day
            fixedCost += station.chargers * 500;  // Per charger maintenance
            fixedCost += station.inventoryCap * 100;  // Inventory holding cost

            // Electricity cost: charging batteries * charger power * (1 min / 60) * rate
            electricityCost += station.chargingBatteries * CHARGER_POWER_KW * (1 / 60) * effectiveRate;
        });

        this._lastElectricityCost = electricityCost;
        return fixedCost + electricityCost;
    }

    setWeatherData(data: WeatherData): void {
        this.state.weatherData = data;
        this.state.demandConfig.weatherMultiplier = data.multiplier;
    }

    setCarbonIntensity(data: CarbonData): void {
        this.state.carbonData = data;
    }

    setRoutingMatrix(matrix: RoutingMatrix): void {
        this.state.routingMatrix = matrix;
    }

    getEffectiveRate(): number {
        return this._lastEffectiveRate;
    }

    setRunning(running: boolean): void {
        this.state.isRunning = running;
    }

    setSpeed(speed: number): void {
        this.state.speed = speed;
    }
}
