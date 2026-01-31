'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine } from '@/simulation/engine';
import { SimulationState, Station, Scenario, WeatherData, CarbonData } from '@/simulation/types';
import { fetchRealStations } from '@/lib/stationAdapter';

export function useSimulation() {
    const engineRef = useRef<SimulationEngine | null>(null);
    const [state, setState] = useState<SimulationState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize engine and load data
    useEffect(() => {
        const engine = new SimulationEngine((newState) => {
            setState(newState);
        });
        engineRef.current = engine;
        setState(engine.getState());

        // Load initial data
        const loadData = async () => {
            try {
                setIsLoading(true);

                // Fetch stations
                const stations = await fetchRealStations();
                if (stations.length > 0) {
                    engine.setStations(stations);
                }

                // Fetch weather
                try {
                    const weatherRes = await fetch('/api/weather');
                    if (weatherRes.ok) {
                        const weather: WeatherData = await weatherRes.json();
                        engine.setWeather(weather);
                    }
                } catch (e) {
                    console.warn('Failed to fetch weather:', e);
                }

                // Fetch carbon intensity
                try {
                    const carbonRes = await fetch('/api/carbon');
                    if (carbonRes.ok) {
                        const carbon: CarbonData = await carbonRes.json();
                        engine.setCarbon(carbon);
                    }
                } catch (e) {
                    console.warn('Failed to fetch carbon:', e);
                }

                setError(null);
            } catch (e) {
                setError('Failed to load simulation data');
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();

        return () => {
            engine.destroy();
        };
    }, []);

    const start = useCallback(() => {
        engineRef.current?.start();
    }, []);

    const pause = useCallback(() => {
        engineRef.current?.pause();
    }, []);

    const resume = useCallback(() => {
        engineRef.current?.resume();
    }, []);

    const reset = useCallback(() => {
        engineRef.current?.reset();
    }, []);

    const setSpeed = useCallback((speed: number) => {
        engineRef.current?.setSpeed(speed);
    }, []);

    const setScenario = useCallback((scenario: Scenario) => {
        engineRef.current?.setScenario(scenario);
    }, []);

    const toggleSimulation = useCallback(() => {
        if (!state) return;
        
        if (!state.isRunning) {
            start();
        } else if (state.isPaused) {
            resume();
        } else {
            pause();
        }
    }, [state, start, pause, resume]);

    return {
        state,
        isLoading,
        error,
        start,
        pause,
        resume,
        reset,
        setSpeed,
        setScenario,
        toggleSimulation,
    };
}
