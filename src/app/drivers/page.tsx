'use client';

import { useSimulation } from '@/hooks/useSimulation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Driver, DriverState } from '@/simulation/types';
import { Battery, Navigation, Clock, DollarSign, Zap } from 'lucide-react';

const stateColors: Record<DriverState, string> = {
    idle: 'var(--text-muted)',
    traveling: 'var(--brand-primary)',
    queued: 'var(--status-warning)',
    swapping: 'var(--status-success)',
    completed: 'var(--status-success)',
    abandoned: 'var(--status-emergency)',
};

const stateLabels: Record<DriverState, string> = {
    idle: 'Idle',
    traveling: 'Traveling',
    queued: 'In Queue',
    swapping: 'Swapping',
    completed: 'Completed',
    abandoned: 'Abandoned',
};

function DriverRow({ driver, stations }: { driver: Driver; stations: any[] }) {
    const targetStation = driver.targetStationId
        ? stations.find(s => s.id === driver.targetStationId)
        : null;

    return (
        <tr
            style={{
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            {/* Driver Name */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{
                    fontSize: 'var(--font-sm)',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                }}>
                    {driver.name}
                </div>
                <div style={{
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-muted)',
                    marginTop: 'var(--space-2xs)',
                }}>
                    {driver.id}
                </div>
            </td>

            {/* Battery Level */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <Battery
                        size={16}
                        color={driver.batteryLevel > 30 ? 'var(--status-success)' : 'var(--status-emergency)'}
                    />
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                        {driver.batteryLevel.toFixed(0)}%
                    </span>
                </div>
            </td>

            {/* State */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: 'var(--space-2xs) var(--space-xs)',
                        fontSize: 'var(--font-xs)',
                        fontWeight: 500,
                        color: stateColors[driver.state],
                        background: `${stateColors[driver.state]}15`,
                        borderRadius: 'var(--radius-sm)',
                    }}
                >
                    {stateLabels[driver.state]}
                </span>
            </td>

            {/* Target Station */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                {targetStation ? (
                    <div>
                        <div style={{
                            fontSize: 'var(--font-sm)',
                            color: 'var(--text-primary)',
                        }}>
                            {targetStation.name}
                        </div>
                        <div style={{
                            fontSize: 'var(--font-xs)',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-2xs)',
                        }}>
                            {targetStation.location}
                        </div>
                    </div>
                ) : (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        None
                    </span>
                )}
            </td>

            {/* Wait Time */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <Clock size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                        {driver.waitTime > 0 ? `${driver.waitTime.toFixed(0)}m` : '-'}
                    </span>
                </div>
            </td>

            {/* Swaps Today */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <Zap size={16} color="var(--brand-primary)" />
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                        {driver.swapsToday}
                    </span>
                </div>
            </td>

            {/* Owed Amount */}
            <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <DollarSign size={16} color="var(--text-muted)" />
                    <span style={{
                        fontSize: 'var(--font-sm)',
                        color: 'var(--text-primary)',
                    }}>
                        ₹{driver.owedAmount.toFixed(2)}
                    </span>
                </div>
            </td>
        </tr>
    );
}

export default function DriversPage() {
    const { state, toggleSimulation, reset, setSpeed } = useSimulation();
    const drivers = state?.drivers || [];
    const stations = state?.stations || [];

    // Count drivers by state
    const stateCounts = drivers.reduce((acc, driver) => {
        acc[driver.state] = (acc[driver.state] || 0) + 1;
        return acc;
    }, {} as Record<DriverState, number>);

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                background: 'var(--bg-primary)',
            }}
        >
            <Sidebar activeTab="drivers" onTabChange={() => {}} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Header
                    state={state}
                    onToggleSimulation={toggleSimulation}
                    onReset={reset}
                    onSpeedChange={setSpeed}
                />

                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        padding: 'var(--space-md)',
                        gap: 'var(--space-md)',
                    }}
                >
                    {/* Header Section */}
                    <div>
                        <h1 style={{
                            fontSize: 'var(--font-2xl)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: 'var(--space-xs)',
                        }}>
                            Drivers
                        </h1>
                        <p style={{
                            fontSize: 'var(--font-sm)',
                            color: 'var(--text-muted)',
                        }}>
                            Real-time view of all active drivers in the network
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 'var(--space-sm)',
                    }}>
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                Total Drivers
                            </div>
                            <div style={{
                                fontSize: 'var(--font-2xl)',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginTop: 'var(--space-2xs)',
                            }}>
                                {drivers.length}
                            </div>
                        </div>

                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                Traveling
                            </div>
                            <div style={{
                                fontSize: 'var(--font-2xl)',
                                fontWeight: 600,
                                color: 'var(--brand-primary)',
                                marginTop: 'var(--space-2xs)',
                            }}>
                                {stateCounts.traveling || 0}
                            </div>
                        </div>

                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                In Queue
                            </div>
                            <div style={{
                                fontSize: 'var(--font-2xl)',
                                fontWeight: 600,
                                color: 'var(--status-warning)',
                                marginTop: 'var(--space-2xs)',
                            }}>
                                {stateCounts.queued || 0}
                            </div>
                        </div>

                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                Swapping
                            </div>
                            <div style={{
                                fontSize: 'var(--font-2xl)',
                                fontWeight: 600,
                                color: 'var(--status-success)',
                                marginTop: 'var(--space-2xs)',
                            }}>
                                {stateCounts.swapping || 0}
                            </div>
                        </div>

                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                Idle
                            </div>
                            <div style={{
                                fontSize: 'var(--font-2xl)',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                marginTop: 'var(--space-2xs)',
                            }}>
                                {stateCounts.idle || 0}
                            </div>
                        </div>
                    </div>

                    {/* Drivers Table */}
                    <div
                        style={{
                            flex: 1,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{
                                        background: 'var(--bg-tertiary)',
                                        borderBottom: '1px solid var(--border-subtle)',
                                    }}>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Driver
                                        </th>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Battery
                                        </th>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Status
                                        </th>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Target Station
                                        </th>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Wait Time
                                        </th>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Swaps Today
                                        </th>
                                        <th style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            Owed Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map(driver => (
                                        <DriverRow
                                            key={driver.id}
                                            driver={driver}
                                            stations={stations}
                                        />
                                    ))}
                                </tbody>
                            </table>

                            {drivers.length === 0 && (
                                <div style={{
                                    padding: 'var(--space-2xl)',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                }}>
                                    No drivers in the simulation
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
