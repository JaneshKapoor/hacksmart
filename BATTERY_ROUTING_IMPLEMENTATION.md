# Battery-Aware Rerouting Implementation

## Overview
This implementation adds battery feasibility checks when drivers are rerouted due to station failures. The system now verifies that drivers have sufficient battery to reach alternative stations before rerouting them.

## Key Features

### 1. Battery Calculation Functions
- `estimateBatteryNeeded(distance)`: Calculates required battery percentage for a given distance
  - Uses conversion rate: 1% battery ≈ 1.5 units of travel
  - Includes 20% safety buffer for realistic estimation

- `canReachStation(driver, station)`: Validates if a driver can physically reach a station based on current battery level

### 2. Enhanced Station Selection
The `selectStation()` method now includes optional battery feasibility filtering:
- Filters out unreachable stations before scoring
- Only considers stations within the driver's battery range
- Returns `null` if no reachable stations exist

### 3. Intelligent Rerouting Logic
When a station fails, the `rerouteDrivers()` method now:
1. Checks battery feasibility before assigning new destinations
2. Calculates exact battery needed for the new route
3. Tracks drivers who cannot be rerouted due to insufficient battery
4. Records appropriate failure reasons (`station_too_far`, `rerouting_failed`)
5. Generates console warnings and UI notifications for stranded drivers

### 4. User Notifications
Added a comprehensive notification system:

**New Types:**
- `SimulationNotification`: Notification data structure
- `NotificationType`: Categories (battery_warning, reroute_failure, station_failure, info)

**UI Component:**
- `NotificationBanner`: Displays up to 3 recent notifications
- Color-coded by severity (red for battery warnings, yellow for station failures)
- Dismissible with timestamps
- Auto-limits to 50 stored notifications

### 5. Failure Tracking
Enhanced failure reason tracking:
- `station_too_far`: Station exists but exceeds battery range
- `rerouting_failed`: No operational stations available
- Distinguishes between network unavailability vs. battery constraints

## Battery Consumption Model

**Constants:**
- Average battery drain: 0.5-1.5% per tick (per minute)
- Range estimation: 1% battery = 1.5 units of travel
- Safety margin: 20% added to all battery calculations
- Critical battery thresholds:
  - Critical: ≤15%
  - Very Low: ≤20%
  - Low: ≤25%
  - Moderate: ≤30%

**Drain Multipliers:**
- Normal drivers: 1.0x
- Low battery drivers (<15%): 1.5x (faster drain)

## User Experience Improvements

### Console Warnings
When rerouting fails due to battery:
```
[REROUTE FAILED] Driver Rider #1234 (Battery: 8.5%)
cannot reach station EESL - Janakpuri - needs 12.3% battery for 15.4 units

[BATTERY WARNING] Station "Fortum - Rohini Sector..." failure caused 3
driver(s) to be stranded due to insufficient battery for rerouting
```

### UI Notifications
- Real-time alerts appear below the header
- Show driver count affected by battery issues
- Include station name and failure context
- Can be dismissed individually
- Persist in simulation state for review

## Files Modified

1. **src/simulation/types.ts**
   - Added `SimulationNotification` interface
   - Added `NotificationType` enum
   - Added `notifications` array to `SimulationState`

2. **src/simulation/engine.ts**
   - Added `estimateBatteryNeeded()` helper
   - Added `canReachStation()` validation
   - Modified `selectStation()` to filter by battery feasibility
   - Enhanced `rerouteDrivers()` with battery checks
   - Added `addNotification()` method
   - Updated `toggleStationFailure()` to notify users

3. **src/components/NotificationBanner.tsx** (NEW)
   - Notification display component
   - Color-coded severity levels
   - Dismissible notifications
   - Timestamp display

4. **src/app/page.tsx**
   - Integrated NotificationBanner component
   - Passes notifications from simulation state

## Testing Scenarios

To test the battery-aware rerouting:

1. **Scenario 1: Normal Rerouting**
   - Start simulation with multiple operational stations
   - Toggle a station to failure
   - Observe drivers with sufficient battery successfully reroute

2. **Scenario 2: Battery-Constrained Rerouting**
   - Wait for drivers with low battery (10-15%) to appear
   - Toggle their target station to failure
   - Check console for battery warnings
   - Verify UI notification appears
   - Confirm drivers marked as abandoned with `station_too_far` reason

3. **Scenario 3: Remote Drivers**
   - Look for drivers spawned at map edges (outliers)
   - Toggle nearest station to failure
   - Verify battery calculations prevent unreachable reroutes

## Future Enhancements

Potential improvements:
- Add "rescue" mechanism to send mobile charging units
- Implement battery prediction for queue wait times
- Create battery risk visualization on map
- Add user preference for battery safety margins
- Track battery-related metrics in KPIs
- Export battery failure analytics to Last Mile data
