'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { SimulationEngine } from '@/simulation/engine';
import { SimulationState, ScenarioType, Intervention, Station, WeatherData, CarbonData } from '@/simulation/types';
import { fetchWeather } from '@/lib/weatherService';
import { fetchCarbonIntensity } from '@/lib/carbonService';
import { fetchRoutingMatrix } from '@/lib/routingService';

interface SimulationContextValue {
    state: SimulationState | null;
    start: () => void;
    pause: () => void;
    reset: () => void;
    setSpeed: (speed: number) => void;
    setScenario: (type: ScenarioType) => void;
    applyInterventions: (interventions: Intervention[]) => void;
    loadStations: (stations?: Station[]) => void;
    weatherData: WeatherData | null;
    carbonData: CarbonData | null;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
    const engineRef = useRef<SimulationEngine | null>(null);
    const [state, setState] = useState<SimulationState | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [carbonData, setCarbonData] = useState<CarbonData | null>(null);

    // Fetch weather and set on engine
    const refreshWeather = useCallback(async () => {
        const data = await fetchWeather();
        setWeatherData(data);
        if (engineRef.current) {
            engineRef.current.setWeatherData(data);
            setState({ ...engineRef.current.getState() });
        }
    }, []);

    // Fetch carbon and set on engine
    const refreshCarbon = useCallback(async () => {
        const data = await fetchCarbonIntensity();
        setCarbonData(data);
        if (engineRef.current) {
            engineRef.current.setCarbonIntensity(data);
            setState({ ...engineRef.current.getState() });
        }
    }, []);

    // Fetch routing matrix for current stations
    const refreshRouting = useCallback(async (stations: Station[]) => {
        const matrix = await fetchRoutingMatrix(stations);
        if (engineRef.current) {
            engineRef.current.setRoutingMatrix(matrix);
            setState({ ...engineRef.current.getState() });
        }
    }, []);

    useEffect(() => {
        engineRef.current = new SimulationEngine();
        setState(engineRef.current.getState());

        // Fetch all API data on init
        refreshWeather();
        refreshCarbon();
        refreshRouting(engineRef.current.getState().stations);

        // Poll weather every 5 minutes
        const weatherInterval = setInterval(refreshWeather, 5 * 60 * 1000);
        // Poll carbon every 15 minutes
        const carbonInterval = setInterval(refreshCarbon, 15 * 60 * 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            clearInterval(weatherInterval);
            clearInterval(carbonInterval);
        };
    }, [refreshWeather, refreshCarbon, refreshRouting]);

    const start = useCallback(() => {
        if (!engineRef.current) return;
        engineRef.current.setRunning(true);
        setState({ ...engineRef.current.getState() });

        if (intervalRef.current) clearInterval(intervalRef.current);

        const speed = engineRef.current.getState().speed;
        intervalRef.current = setInterval(() => {
            if (engineRef.current) {
                engineRef.current.step();
                setState({ ...engineRef.current.getState() });
            }
        }, 1000 / speed);
    }, []);

    const pause = useCallback(() => {
        if (!engineRef.current) return;
        engineRef.current.setRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setState({ ...engineRef.current.getState() });
    }, []);

    const reset = useCallback(() => {
        if (!engineRef.current) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        engineRef.current.reset();
        setState({ ...engineRef.current.getState() });
    }, []);

    const setSpeed = useCallback((speed: number) => {
        if (!engineRef.current) return;
        engineRef.current.setSpeed(speed);

        if (engineRef.current.getState().isRunning && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                if (engineRef.current) {
                    engineRef.current.step();
                    setState({ ...engineRef.current.getState() });
                }
            }, 1000 / speed);
        }
        setState({ ...engineRef.current.getState() });
    }, []);

    const setScenario = useCallback((type: ScenarioType) => {
        if (!engineRef.current) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        engineRef.current.setScenario(type);
        setState({ ...engineRef.current.getState() });
    }, []);

    const applyInterventions = useCallback((interventions: Intervention[]) => {
        if (!engineRef.current) return;
        engineRef.current.applyInterventions(interventions);
        setState({ ...engineRef.current.getState() });
    }, []);

    const loadStations = useCallback((stations?: Station[]) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        engineRef.current = new SimulationEngine(stations ? { stations } : undefined);
        // Re-apply weather and carbon data to new engine
        if (weatherData) engineRef.current.setWeatherData(weatherData);
        if (carbonData) engineRef.current.setCarbonIntensity(carbonData);
        setState(engineRef.current.getState());
        // Re-fetch routing matrix for new station set
        refreshRouting(engineRef.current.getState().stations);
    }, [weatherData, carbonData, refreshRouting]);

    return (
        <SimulationContext.Provider value={{
            state, start, pause, reset, setSpeed, setScenario, applyInterventions, loadStations,
            weatherData, carbonData,
        }}>
            {children}
        </SimulationContext.Provider>
    );
}

export function useSharedSimulation() {
    const ctx = useContext(SimulationContext);
    if (!ctx) throw new Error('useSharedSimulation must be used within SimulationProvider');
    return ctx;
}
