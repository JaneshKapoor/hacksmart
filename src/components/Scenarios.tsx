'use client';

import {
    TrendingUp,
    AlertTriangle,
    RotateCcw,
} from 'lucide-react';
import { ScenarioType, Scenario } from '@/simulation/types';

interface ScenariosProps {
    activeScenario: Scenario;
    onScenarioChange: (scenario: Scenario) => void;
    onResetScenario: () => void;
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

export function Scenarios({ activeScenario, onScenarioChange, onResetScenario, selectedStationId, onToggleFailure }: ScenariosProps) {
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

    const handleReset = () => {
        onResetScenario();
    };

    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div className="card-header" style={{
                marginBottom: 'var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <span className="card-title">Scenarios</span>
                    {selectedStationId && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Station selected
                        </div>
                    )}
                </div>
                <button
                    onClick={handleReset}
                    style={{
                        padding: 'var(--space-xs)',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        transition: 'all var(--transition-fast)',
                    }}
                    title="Reset scenarios"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                >
                    <RotateCcw size={14} />
                </button>
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
