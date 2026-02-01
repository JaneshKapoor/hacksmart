'use client';

import {
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';
import { ScenarioType, Scenario } from '@/simulation/types';

interface ScenariosProps {
    activeScenario: Scenario;
    onScenarioChange: (scenario: Scenario) => void;
    selectedStationId?: string | null;
    onToggleFailure?: (stationId: string) => void;
}

interface ScenarioTabData {
    type: ScenarioType;
    icon: React.ReactNode;
    label: string;
}

const scenarios: ScenarioTabData[] = [
    { type: 'demand', icon: <TrendingUp size={14} />, label: 'Demand' },
    { type: 'failures', icon: <AlertTriangle size={14} />, label: 'Failures' },
];

export function Scenarios({ activeScenario, onScenarioChange, selectedStationId, onToggleFailure }: ScenariosProps) {
    const handleScenarioClick = (scenarioType: ScenarioType) => {
        // Special handling for Failures scenario
        if (scenarioType === 'failures') {
            if (!selectedStationId) {
                alert('Please select a station on the map first');
                return;
            }
            // Toggle failure on the selected station
            onToggleFailure?.(selectedStationId);
        } else {
            // For other scenarios, use the existing logic
            onScenarioChange({
                type: scenarioType,
                active: true,
                params: {},
            });
        }
    };

    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                <span className="card-title">Scenarios</span>
                {selectedStationId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Station selected
                    </div>
                )}
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
                        onClick={() => handleScenarioClick(scenario.type)}
                        disabled={scenario.type === 'failures' && !selectedStationId}
                        style={{
                            opacity: scenario.type === 'failures' && !selectedStationId ? 0.5 : 1,
                            cursor: scenario.type === 'failures' && !selectedStationId ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {scenario.icon}
                        <span>{scenario.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
