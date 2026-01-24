'use client';

import { Scenario } from '@/simulation/station';
import { predefinedScenarios } from '@/data/mockData';

interface ScenarioPanelProps {
    activeScenario: Scenario | null;
    onSelectScenario: (scenario: Scenario | null) => void;
    isRunning: boolean;
}

export function ScenarioPanel({ activeScenario, onSelectScenario, isRunning }: ScenarioPanelProps) {
    const getScenarioIcon = (id: string) => {
        switch (id) {
            case 'scenario-rush-hour':
                return '🚗';
            case 'scenario-add-stations':
                return '➕';
            case 'scenario-fire-emergency':
                return '🔥';
            case 'scenario-power-outage':
                return '⚡';
            case 'scenario-upgrade-chargers':
                return '🔌';
            case 'scenario-festival':
                return '🎉';
            default:
                return '📊';
        }
    };

    const getScenarioBadge = (id: string) => {
        if (id.includes('fire') || id.includes('power')) {
            return <span className="badge badge-danger">Emergency</span>;
        }
        if (id.includes('rush') || id.includes('festival')) {
            return <span className="badge badge-warning">Demand</span>;
        }
        if (id.includes('add') || id.includes('upgrade')) {
            return <span className="badge badge-success">Infrastructure</span>;
        }
        return null;
    };

    return (
        <div className="glass-card p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Scenario Lab</h2>
                {activeScenario && (
                    <button
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                        onClick={() => onSelectScenario(null)}
                    >
                        Clear Selection
                    </button>
                )}
            </div>

            <p className="text-sm text-slate-400 mb-5">
                Select a scenario to simulate &quot;what-if&quot; experiments on the network.
            </p>

            {/* Scenario Categories */}
            <div className="space-y-3">
                {/* Emergency Scenarios */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>🚨</span> Emergency Scenarios
                    </h3>
                    <div className="space-y-2">
                        {predefinedScenarios
                            .filter((s) => s.id.includes('fire') || s.id.includes('power'))
                            .map((scenario) => (
                                <button
                                    key={scenario.id}
                                    className={`scenario-card w-full text-left ${activeScenario?.id === scenario.id ? 'active' : ''
                                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => !isRunning && onSelectScenario(scenario)}
                                    disabled={isRunning}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getScenarioIcon(scenario.id)}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white text-sm">{scenario.name}</span>
                                                {getScenarioBadge(scenario.id)}
                                            </div>
                                            <p className="text-xs text-slate-400">{scenario.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>

                {/* Demand Scenarios */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>📈</span> Demand Scenarios
                    </h3>
                    <div className="space-y-2">
                        {predefinedScenarios
                            .filter((s) => s.id.includes('rush') || s.id.includes('festival'))
                            .map((scenario) => (
                                <button
                                    key={scenario.id}
                                    className={`scenario-card w-full text-left ${activeScenario?.id === scenario.id ? 'active' : ''
                                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => !isRunning && onSelectScenario(scenario)}
                                    disabled={isRunning}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getScenarioIcon(scenario.id)}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white text-sm">{scenario.name}</span>
                                                {getScenarioBadge(scenario.id)}
                                            </div>
                                            <p className="text-xs text-slate-400">{scenario.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>

                {/* Infrastructure Scenarios */}
                <div>
                    <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>🏗️</span> Infrastructure Scenarios
                    </h3>
                    <div className="space-y-2">
                        {predefinedScenarios
                            .filter((s) => s.id.includes('add') || s.id.includes('upgrade'))
                            .map((scenario) => (
                                <button
                                    key={scenario.id}
                                    className={`scenario-card w-full text-left ${activeScenario?.id === scenario.id ? 'active' : ''
                                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => !isRunning && onSelectScenario(scenario)}
                                    disabled={isRunning}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getScenarioIcon(scenario.id)}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white text-sm">{scenario.name}</span>
                                                {getScenarioBadge(scenario.id)}
                                            </div>
                                            <p className="text-xs text-slate-400">{scenario.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            </div>

            {/* Active Scenario Info */}
            {activeScenario && (
                <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getScenarioIcon(activeScenario.id)}</span>
                        <span className="font-semibold text-white">{activeScenario.name}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-3">{activeScenario.description}</p>
                    <div className="text-xs text-slate-400">
                        <strong className="text-indigo-400">Interventions:</strong>
                        <ul className="mt-1 space-y-1">
                            {activeScenario.interventions.map((intervention, index) => (
                                <li key={index} className="flex items-center gap-1">
                                    <span className="text-indigo-400">•</span>
                                    <span className="capitalize">{intervention.type.replace(/_/g, ' ')}</span>
                                    {intervention.stationId && (
                                        <span className="text-slate-500">({intervention.stationId})</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
