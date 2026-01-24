'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine } from '@/simulation/engine';
import { SimulationState, ScenarioType, Intervention } from '@/simulation/types';

export function useSimulation() {
    const engineRef = useRef<SimulationEngine | null>(null);
    const [state, setState] = useState<SimulationState | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        engineRef.current = new SimulationEngine();
        setState(engineRef.current.getState());

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const start = useCallback(() => {
        if (!engineRef.current) return;

        engineRef.current.setRunning(true);
        setState({ ...engineRef.current.getState() });

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

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
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        setState({ ...engineRef.current.getState() });
    }, []);

    const reset = useCallback(() => {
        if (!engineRef.current) return;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
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

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        engineRef.current.setScenario(type);
        setState({ ...engineRef.current.getState() });
    }, []);

    const applyInterventions = useCallback((interventions: Intervention[]) => {
        if (!engineRef.current) return;

        engineRef.current.applyInterventions(interventions);
        setState({ ...engineRef.current.getState() });
    }, []);

    return {
        state,
        start,
        pause,
        reset,
        setSpeed,
        setScenario,
        applyInterventions,
    };
}
