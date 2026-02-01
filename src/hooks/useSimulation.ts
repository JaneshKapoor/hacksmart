'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine } from '@/simulation/engine';
import { SimulationState, Station, Scenario, WeatherData, CarbonData } from '@/simulation/types';
import { fetchRealStations } from '@/lib/stationAdapter';
import {
    loadStationsFromDB,
    saveStationsToDB,
    saveDriversToDB,
    saveSimulationStateToDB,
    createStationSnapshot,
} from '@/lib/supabase/simulation';
import { geoToPercent } from '@/lib/geoUtils';

export function useSimulation() {
    const engineRef = useRef<SimulationEngine | null>(null);
    const [state, setState] = useState<SimulationState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize engine and load data
    useEffect(() => {
        const engine = new SimulationEngine((newState) => {
            setState(newState);
            // Sync to Supabase on state change (throttled)
            syncToSupabase(newState);
        });
        engineRef.current = engine;
        setState(engine.getState());

        let syncTimeout: NodeJS.Timeout;
        const syncToSupabase = (state: SimulationState) => {
            // Throttle syncs to every 5 seconds during simulation
            clearTimeout(syncTimeout);
            syncTimeout = setTimeout(async () => {
                if (state.isRunning && !state.isPaused) {
                    try {
                        // Save stations and drivers to DB
                        await Promise.all([
                            saveStationsToDB(state.stations),
                            saveDriversToDB(state.drivers),
                            saveSimulationStateToDB(state),
                        ]);

                        // Create snapshots every 5 minutes
                        if (state.currentTime.getMinutes() % 5 === 0) {
                            state.stations.forEach(station => {
                                createStationSnapshot(station.id, station);
                            });
                        }
                    } catch (error) {
                        console.error('Failed to sync to Supabase:', error);
                    }
                }
            }, 5000);
        };

        // Load initial data
        const loadData = async () => {
            try {
                setIsLoading(true);

                // Try to load stations from Supabase first
                let stations = await loadStationsFromDB();

                // If no stations in DB, fetch from API and save
                if (stations.length === 0) {
                    console.log('No stations in DB, fetching from API...');
                    stations = await fetchRealStations();

                    if (stations.length > 0) {
                        // Save to Supabase for future use
                        await saveStationsToDB(stations);
                        console.log('Saved stations to Supabase');
                    }
                } else {
                    console.log(`Loaded ${stations.length} stations from Supabase`);
                    // Recalculate position percentages from geo coordinates
                    stations = stations.map(s => ({
                        ...s,
                        position: geoToPercent(s.geoPosition.lat, s.geoPosition.lng),
                    }));
                }

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
            clearTimeout(syncTimeout);
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

    const toggleStationFailure = useCallback((stationId: string) => {
        engineRef.current?.toggleStationFailure(stationId);
    }, []);

    const refreshFromAPI = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Refreshing stations from API...');

            // Fetch fresh data from API
            const stations = await fetchRealStations();

            if (stations.length > 0) {
                // Save to Supabase
                await saveStationsToDB(stations);
                console.log('Refreshed and saved stations to Supabase');

                // Update engine with new stations
                engineRef.current?.setStations(stations);
            }

            setError(null);
        } catch (e: any) {
            setError('Failed to refresh from API');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
        toggleStationFailure,
        refreshFromAPI,
    };
}
