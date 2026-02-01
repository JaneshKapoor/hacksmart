-- ============================================================================
-- Failed Rides Table for Last Mile Analytics & ML Training
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.failed_rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Driver Information
    driver_id TEXT NOT NULL,
    driver_name TEXT NOT NULL,

    -- Location Data
    failure_latitude DOUBLE PRECISION NOT NULL,
    failure_longitude DOUBLE PRECISION NOT NULL,
    origin_latitude DOUBLE PRECISION NOT NULL,
    origin_longitude DOUBLE PRECISION NOT NULL,

    -- Battery & Journey Data
    battery_level DOUBLE PRECISION NOT NULL,
    travel_time INTEGER NOT NULL DEFAULT 0,
    wait_time INTEGER NOT NULL DEFAULT 0,

    -- Target Station Data
    target_station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
    target_station_name TEXT,
    target_station_distance DOUBLE PRECISION,

    -- Failure Context
    failure_reason TEXT NOT NULL, -- 'critical_battery', 'low_battery', 'no_stations_available', 'no_inventory', 'rerouting_failed', 'excessive_queue', 'destination_failed'
    failure_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    simulation_day INTEGER NOT NULL,
    hour_of_day INTEGER NOT NULL,

    -- Environmental Context
    weather_condition TEXT,
    weather_multiplier DOUBLE PRECISION,
    temperature DOUBLE PRECISION,

    -- Network State at Time of Failure
    operational_stations_count INTEGER NOT NULL DEFAULT 0,
    total_network_inventory INTEGER NOT NULL DEFAULT 0,
    network_utilization DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_network_wait_time DOUBLE PRECISION NOT NULL DEFAULT 0,

    -- Nearby Stations Context (stored as JSONB for flexibility)
    nearby_stations JSONB DEFAULT '[]',

    -- Rerouting History
    was_rerouted BOOLEAN NOT NULL DEFAULT false,
    reroute_attempts INTEGER NOT NULL DEFAULT 0,

    -- Financial Impact
    owed_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    swaps_today INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics and filtering
CREATE INDEX IF NOT EXISTS idx_failed_rides_reason ON public.failed_rides(failure_reason);
CREATE INDEX IF NOT EXISTS idx_failed_rides_timestamp ON public.failed_rides(failure_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_failed_rides_battery ON public.failed_rides(battery_level);
CREATE INDEX IF NOT EXISTS idx_failed_rides_day ON public.failed_rides(simulation_day);
CREATE INDEX IF NOT EXISTS idx_failed_rides_hour ON public.failed_rides(hour_of_day);
CREATE INDEX IF NOT EXISTS idx_failed_rides_rerouted ON public.failed_rides(was_rerouted);
CREATE INDEX IF NOT EXISTS idx_failed_rides_target_station ON public.failed_rides(target_station_id);

-- Composite index for ML training queries
CREATE INDEX IF NOT EXISTS idx_failed_rides_ml_training
    ON public.failed_rides(failure_reason, battery_level, hour_of_day, operational_stations_count);

-- Row Level Security
ALTER TABLE public.failed_rides ENABLE ROW LEVEL SECURITY;

-- Policies (allow authenticated users to read/write failed rides data)
CREATE POLICY "Allow authenticated users to read failed rides" ON public.failed_rides
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write failed rides" ON public.failed_rides
    FOR ALL TO authenticated USING (true);

-- Comments for documentation
COMMENT ON TABLE public.failed_rides IS 'Comprehensive dataset of failed rides for ML training and last mile analytics';
COMMENT ON COLUMN public.failed_rides.failure_reason IS 'Categorical reason for ride failure: critical_battery, low_battery, no_stations_available, no_inventory, rerouting_failed, excessive_queue, destination_failed';
COMMENT ON COLUMN public.failed_rides.nearby_stations IS 'Array of nearby station snapshots at time of failure (JSON format)';
COMMENT ON COLUMN public.failed_rides.network_utilization IS 'Average utilization rate of operational stations at time of failure';
