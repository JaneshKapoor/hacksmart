'use client';

import {
    BarChart2,
    Building2,
    Battery,
    Box,
    TrendingUp,
    Network,
    DollarSign,
    AlertTriangle,
    Rocket,
} from 'lucide-react';
import { ScenarioType, Scenario } from '@/simulation/types';

interface ScenariosProps {
    activeScenario: Scenario;
    onScenarioChange: (scenario: Scenario) => void;
}

interface ScenarioTabData {
    type: ScenarioType;
    icon: React.ReactNode;
    label: string;
}

const scenarios: ScenarioTabData[] = [
    { type: 'baseline', icon: <BarChart2 size={14} />, label: 'Baseline' },
    { type: 'station-ops', icon: <Building2 size={14} />, label: 'Station Ops' },
    { type: 'capacity', icon: <Battery size={14} />, label: 'Capacity' },
    { type: 'inventory', icon: <Box size={14} />, label: 'Inventory' },
    { type: 'demand', icon: <TrendingUp size={14} />, label: 'Demand' },
    { type: 'network', icon: <Network size={14} />, label: 'Network' },
    { type: 'pricing', icon: <DollarSign size={14} />, label: 'Pricing' },
    { type: 'failures', icon: <AlertTriangle size={14} />, label: 'Failures' },
    { type: 'growth', icon: <Rocket size={14} />, label: 'Growth' },
];

export function Scenarios({ activeScenario, onScenarioChange }: ScenariosProps) {
    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="card-title">Scenarios</span>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                }}
            >
                {scenarios.map((scenario) => (
                    <button
                        key={scenario.type}
                        className={`scenario-tab ${activeScenario.type === scenario.type ? 'active' : ''}`}
                        onClick={() =>
                            onScenarioChange({
                                type: scenario.type,
                                active: true,
                                params: {},
                            })
                        }
                    >
                        {scenario.icon}
                        <span>{scenario.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
