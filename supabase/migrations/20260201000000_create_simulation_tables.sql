-- ============================================================================
-- ElectriGo Simulation Tables
-- ============================================================================

-- Stations Table
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocm_id INTEGER UNIQUE, -- Original Open Charge Map ID
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    address TEXT,
    operator TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    -- Charger Configuration
    chargers INTEGER NOT NULL DEFAULT 0,
    active_chargers INTEGER NOT NULL DEFAULT 0,
    charger_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'fast', 'mixed'
    max_power_kw DOUBLE PRECISION,
    min_power_kw DOUBLE PRECISION,

    -- Inventory & Capacity
    inventory_cap INTEGER NOT NULL DEFAULT 0,
    current_inventory INTEGER NOT NULL DEFAULT 0,
    charging_batteries INTEGER NOT NULL DEFAULT 0,
    bays INTEGER NOT NULL DEFAULT 0,

    -- Operational Metrics
    queue_length INTEGER NOT NULL DEFAULT 0,
    utilization_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_wait_time DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_swaps INTEGER NOT NULL DEFAULT 0,
    lost_swaps INTEGER NOT NULL DEFAULT 0,
    peak_queue_length INTEGER NOT NULL DEFAULT 0,

    -- Status & Operations
    status TEXT NOT NULL DEFAULT 'operational', -- 'operational', 'low-stock', 'overloaded', 'emergency', 'offline'
    operating_hours_start INTEGER NOT NULL DEFAULT 0,
    operating_hours_end INTEGER NOT NULL DEFAULT 24,
    coverage_radius DOUBLE PRECISION NOT NULL DEFAULT 2,

    -- Additional Data
    usage_cost TEXT,
    is_real_station BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connection Details Table (for station charger types)
CREATE TABLE IF NOT EXISTS public.station_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL,
    power_kw DOUBLE PRECISION NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    -- State
    state TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'traveling', 'queued', 'swapping', 'completed', 'abandoned'
    target_station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,

    -- Metrics
    battery_level DOUBLE PRECISION NOT NULL DEFAULT 50,
    wait_time INTEGER NOT NULL DEFAULT 0,
    travel_time INTEGER NOT NULL DEFAULT 0,
    owed_amount INTEGER NOT NULL DEFAULT 0,
    swaps_today INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Simulation State Table (singleton table)
CREATE TABLE IF NOT EXISTS public.simulation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_running BOOLEAN NOT NULL DEFAULT false,
    is_paused BOOLEAN NOT NULL DEFAULT true,
    speed INTEGER NOT NULL DEFAULT 1,
    simulation_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    day INTEGER NOT NULL DEFAULT 1,

    -- Scenario
    active_scenario_type TEXT NOT NULL DEFAULT 'baseline',
    active_scenario_params JSONB DEFAULT '{}',

    -- Weather & Carbon (cached)
    weather_data JSONB,
    carbon_data JSONB,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Station History/Snapshots (for analytics)
CREATE TABLE IF NOT EXISTS public.station_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Snapshot data
    current_inventory INTEGER NOT NULL,
    queue_length INTEGER NOT NULL,
    utilization_rate DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL,
    total_swaps INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stations_ocm_id ON public.stations(ocm_id);
CREATE INDEX IF NOT EXISTS idx_stations_status ON public.stations(status);
CREATE INDEX IF NOT EXISTS idx_stations_location ON public.stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_drivers_state ON public.drivers(state);
CREATE INDEX IF NOT EXISTS idx_drivers_target_station ON public.drivers(target_station_id);
CREATE INDEX IF NOT EXISTS idx_station_snapshots_station_time ON public.station_snapshots(station_id, snapshot_time DESC);

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON public.stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_state_updated_at BEFORE UPDATE ON public.simulation_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies (allow authenticated users to read/write simulation data)
CREATE POLICY "Allow authenticated users to read stations" ON public.stations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write stations" ON public.stations
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read connections" ON public.station_connections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write connections" ON public.station_connections
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read drivers" ON public.drivers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write drivers" ON public.drivers
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read simulation state" ON public.simulation_state
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write simulation state" ON public.simulation_state
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read snapshots" ON public.station_snapshots
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write snapshots" ON public.station_snapshots
    FOR ALL TO authenticated USING (true);

-- Insert initial simulation state record
INSERT INTO public.simulation_state (id, is_running, is_paused, speed, day)
VALUES (gen_random_uuid(), false, true, 1, 1)
ON CONFLICT DO NOTHING;
