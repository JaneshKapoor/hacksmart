// Enhanced Simulation Engine

import {
    Station, Driver, SimulationState, KPIMetrics, TimeSeriesPoint,
    ScenarioConfig, Intervention, DemandConfig, PricingConfig, InventoryConfig,
    SimulationAlert, ScenarioType
} from './types';
import {
    initialStations, initialDrivers, baselineKPIs,
    defaultDemandConfig, defaultPricingConfig, defaultInventoryConfig,
    demandCurves
} from './mockData';

export class SimulationEngine {
    private state: SimulationState;

    constructor() {
        this.state = this.createInitialState();
    }

    private createInitialState(): SimulationState {
        return {
            time: 480, // 8:00 AM
            day: 1,
            hour: 8,
            stations: JSON.parse(JSON.stringify(initialStations)),
            drivers: JSON.parse(JSON.stringify(initialDrivers)),
            baselineKPIs: { ...baselineKPIs },
            scenarioKPIs: { ...baselineKPIs },
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

    getState(): SimulationState {
        return this.state;
    }

    reset(): void {
        const currentScenario = this.state.activeScenario;
        const currentInterventions = this.state.interventions;
        this.state = this.createInitialState();
        this.state.activeScenario = currentScenario;
        this.state.interventions = currentInterventions;

        // Re-apply interventions
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
                        id: `station-new-${Date.now()}`,
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
                    const stationToRemove = this.state.stations.find((s) => s.id === intervention.stationId);
                    if (stationToRemove) {
                        stationToRemove.status = 'offline';
                        // Reroute drivers
                        this.rerouteFromStation(intervention.stationId);
                    }
                }
                break;

            case 'modify_chargers':
                if (intervention.stationId && typeof intervention.value === 'number') {
                    const station = this.state.stations.find((s) => s.id === intervention.stationId);
                    if (station) {
                        station.chargers = intervention.value;
                        station.activeChargers = intervention.value;
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
                                this.addAlert('danger', `🔥 Fire emergency at ${station.name}!`, station.id);
                                break;
                            case 'power_outage':
                                station.status = 'power_outage';
                                station.activeChargers = 0;
                                this.addAlert('danger', `⚡ Power outage at ${station.name}`, station.id);
                                break;
                            case 'overload':
                                station.status = 'overloaded';
                                station.queueLength = station.bays * 2;
                                this.addAlert('warning', `⚠️ ${station.name} is overloaded`, station.id);
                                break;
                            case 'charger_failure':
                                station.activeChargers = Math.floor(station.chargers / 2);
                                this.addAlert('warning', `🔌 Charger failure at ${station.name}`, station.id);
                                break;
                            case 'no_battery':
                                station.currentInventory = 0;
                                station.status = 'low_inventory';
                                this.addAlert('warning', `🔋 No batteries at ${station.name}`, station.id);
                                break;
                        }
                        this.rerouteFromStation(station.id);
                        this.state.scenarioKPIs.emergencyEvents++;
                    }
                }
                break;

            case 'demand_shift':
                if (typeof intervention.value === 'number') {
                    const multiplier = intervention.value;
                    this.state.demandConfig.weatherMultiplier = multiplier;
                    // Apply demand increase to all stations
                    this.state.stations.forEach((station) => {
                        station.queueLength = Math.floor(station.queueLength * multiplier);
                        station.utilizationRate = Math.min(0.99, station.utilizationRate * multiplier);
                        station.avgWaitTime *= multiplier;
                        if (station.utilizationRate > 0.9) {
                            station.status = 'overloaded';
                        }
                    });
                }
                break;

            case 'pricing_change':
                if (typeof intervention.value === 'number') {
                    this.state.pricingConfig.peakMultiplier = intervention.value;
                    // Pricing affects demand
                    const priceEffect = 1 - (intervention.value - 1) * 0.3; // 30% elasticity
                    this.state.demandConfig.weatherMultiplier *= priceEffect;
                }
                break;
        }
    }

    private addAlert(type: 'info' | 'warning' | 'danger', message: string, stationId?: string): void {
        this.state.alerts.unshift({
            id: `alert-${Date.now()}`,
            type,
            message,
            stationId,
            timestamp: this.state.time,
        });
        // Keep only last 10 alerts
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
            const distCurrent = this.calculateDistance(position, station.position);
            const distNearest = this.calculateDistance(position, nearest.position);
            const scoreCurrent = distCurrent + station.avgWaitTime * 2;
            const scoreNearest = distNearest + nearest.avgWaitTime * 2;
            return scoreCurrent < scoreNearest ? station : nearest;
        });
    }

    private calculateDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }

    private calculateETA(from: { x: number; y: number }, to: { x: number; y: number }): number {
        return Math.ceil(this.calculateDistance(from, to) / 5);
    }

    step(): void {
        if (!this.state.isRunning) return;

        this.state.time += 1;
        this.state.hour = Math.floor(this.state.time / 60) % 24;

        if (this.state.time % 1440 === 0) {
            this.state.day += 1;
        }

        // Get current demand level
        const hourDemand = demandCurves[this.state.hour] * this.state.demandConfig.weatherMultiplier;

        // Generate swap requests based on demand
        if (Math.random() < hourDemand * 0.15) {
            this.generateSwapRequest();
        }

        // Update drivers
        this.updateDrivers();

        // Update stations
        this.updateStations();

        // Record time series data every 30 minutes
        if (this.state.time % 30 === 0) {
            this.recordTimeSeriesPoint();
        }

        // Recalculate KPIs
        this.recalculateKPIs();
    }

    private generateSwapRequest(): void {
        const operational = this.state.stations.filter(
            (s) => s.status === 'operational' || s.status === 'low_inventory'
        );
        if (operational.length === 0) return;

        const target = operational[Math.floor(Math.random() * operational.length)];
        target.queueLength += 1;

        if (target.queueLength > target.bays * 1.5) {
            target.status = 'overloaded';
        }

        // Add a new driver
        const newDriver: Driver = {
            id: `driver-${Date.now()}`,
            position: {
                x: target.position.x + (Math.random() - 0.5) * 20,
                y: target.position.y + (Math.random() - 0.5) * 20,
            },
            targetStationId: target.id,
            status: 'en_route',
            eta: Math.ceil(Math.random() * 5) + 1,
            batteryLevel: Math.random() < 0.2 ? 'critical' : Math.random() < 0.4 ? 'low' : 'normal',
        };
        this.state.drivers.push(newDriver);

        // Limit drivers
        if (this.state.drivers.length > 20) {
            this.state.drivers = this.state.drivers.slice(-20);
        }
    }

    private updateDrivers(): void {
        this.state.drivers.forEach((driver) => {
            if (driver.status === 'en_route' || driver.status === 'rerouting') {
                driver.eta = Math.max(0, driver.eta - 1);
                if (driver.eta === 0) {
                    driver.status = 'swapping';
                }
                // Move towards target
                const target = this.state.stations.find((s) => s.id === driver.targetStationId);
                if (target) {
                    const dx = target.position.x - driver.position.x;
                    const dy = target.position.y - driver.position.y;
                    driver.position.x += dx * 0.1;
                    driver.position.y += dy * 0.1;
                }
            } else if (driver.status === 'swapping') {
                if (Math.random() < 0.2) {
                    driver.status = 'complete';
                    const station = this.state.stations.find((s) => s.id === driver.targetStationId);
                    if (station && station.queueLength > 0) {
                        station.queueLength -= 1;
                        station.currentInventory = Math.max(0, station.currentInventory - 1);
                        station.totalSwaps += 1;
                    }
                }
            }
        });

        // Remove completed drivers
        this.state.drivers = this.state.drivers.filter(
            (d) => d.status !== 'complete' && d.status !== 'abandoned'
        );
    }

    private updateStations(): void {
        this.state.stations.forEach((station) => {
            if (station.status === 'fire' || station.status === 'power_outage') {
                return; // Skip offline stations
            }

            // Charge batteries
            const chargeRate = station.activeChargers * 0.08;
            if (station.chargingBatteries > 0 && Math.random() < chargeRate) {
                station.currentInventory = Math.min(station.inventoryCap, station.currentInventory + 1);
                station.chargingBatteries = Math.max(0, station.chargingBatteries - 1);
            }

            // Replenish charging queue
            if (station.chargingBatteries < station.activeChargers) {
                const toCharge = station.inventoryCap - station.currentInventory - station.chargingBatteries;
                station.chargingBatteries = Math.min(station.activeChargers, station.chargingBatteries + Math.floor(toCharge * 0.1));
            }

            // Update wait time
            station.avgWaitTime = Math.max(0.5, station.queueLength * 1.2 + Math.random());
            station.peakQueueLength = Math.max(station.peakQueueLength, station.queueLength);

            // Update utilization
            if (station.activeChargers > 0) {
                station.utilizationRate = Math.min(0.99, station.chargingBatteries / station.activeChargers);
            }

            // Status transitions
            if (station.status === 'operational' && station.currentInventory < 5) {
                station.status = 'low_inventory';
            } else if (station.status === 'low_inventory' && station.currentInventory >= 10) {
                station.status = 'operational';
            }
            if (station.status === 'overloaded' && station.queueLength <= station.bays * 0.5) {
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

        // Keep last 48 points (24 hours at 30min intervals)
        if (this.state.timeSeriesData.length > 48) {
            this.state.timeSeriesData.shift();
        }
    }

    private recalculateKPIs(): void {
        const operational = this.state.stations.filter(
            (s) => s.status !== 'fire' && s.status !== 'power_outage' && s.status !== 'offline'
        );

        if (operational.length === 0) {
            return;
        }

        const totalWaitTime = operational.reduce((sum, s) => sum + s.avgWaitTime, 0);
        const totalChargers = operational.reduce((sum, s) => sum + s.chargers, 0);
        const activeChargers = operational.reduce((sum, s) => sum + s.activeChargers, 0);
        const totalInventory = operational.reduce((sum, s) => sum + s.inventoryCap, 0);
        const currentInventory = operational.reduce((sum, s) => sum + s.currentInventory, 0);
        const chargingCount = operational.reduce((sum, s) => sum + s.chargingBatteries, 0);
        const totalLostSwaps = operational.reduce((sum, s) => sum + s.lostSwaps, 0);
        const totalSwaps = operational.reduce((sum, s) => sum + s.totalSwaps, 0);

        this.state.scenarioKPIs = {
            ...this.state.scenarioKPIs,
            avgWaitTime: totalWaitTime / operational.length,
            lostSwaps: totalLostSwaps + Math.floor(this.state.drivers.filter(d => d.status === 'abandoned').length),
            idleInventory: Math.max(0, totalInventory - currentInventory - chargingCount),
            chargerUtilization: totalChargers > 0 ? activeChargers / totalChargers : 0,
            operationalCost: this.calculateOperationalCost(operational),
            cityThroughput: Math.floor((activeChargers * 60) / 4), // ~4 min per swap
            revenue: totalSwaps * 150, // ₹150 per swap
        };
    }

    private calculateOperationalCost(stations: Station[]): number {
        let cost = 0;
        stations.forEach((station) => {
            cost += 5000; // Base station cost per day
            cost += station.chargers * 500; // Per charger cost
            cost += station.inventoryCap * 100; // Inventory holding cost
            cost += station.activeChargers * 200; // Active usage cost
        });
        return cost;
    }

    setRunning(running: boolean): void {
        this.state.isRunning = running;
    }

    setSpeed(speed: number): void {
        this.state.speed = speed;
    }
}

export const simulationEngine = new SimulationEngine();
