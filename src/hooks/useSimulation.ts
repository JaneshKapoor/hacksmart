'use client';

// Re-export from shared context so both pages share the same simulation state
export { useSharedSimulation as useSimulation } from '@/contexts/SimulationContext';
