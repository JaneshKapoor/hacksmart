import { NextResponse } from 'next/server';

// Module-level cache (10 minutes)
let cachedData: { data: WeatherResponse; timestamp: number } | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000;

interface WeatherResponse {
    multiplier: number;
    condition: string;
    description: string;
    temperature: number;
    isFallback: boolean;
}

// WMO Weather Code to condition mapping
// https://open-meteo.com/en/docs
function wmoToCondition(code: number): { condition: string; description: string; multiplier: number } {
    if (code === 0) return { condition: 'clear', description: 'Clear sky', multiplier: 1.0 };
    if (code <= 3) return { condition: 'cloudy', description: 'Partly cloudy', multiplier: 1.0 };
    if (code <= 48) return { condition: 'fog', description: 'Fog', multiplier: 1.1 };
    if (code <= 55) return { condition: 'drizzle', description: 'Drizzle', multiplier: 1.15 };
    if (code <= 57) return { condition: 'freezing_drizzle', description: 'Freezing drizzle', multiplier: 1.2 };
    if (code <= 65) return { condition: 'rain', description: 'Rain', multiplier: 1.3 };
    if (code <= 67) return { condition: 'freezing_rain', description: 'Freezing rain', multiplier: 1.4 };
    if (code <= 77) return { condition: 'snow', description: 'Snow', multiplier: 1.3 };
    if (code <= 82) return { condition: 'rain_showers', description: 'Rain showers', multiplier: 1.35 };
    if (code <= 86) return { condition: 'snow_showers', description: 'Snow showers', multiplier: 1.3 };
    if (code === 95) return { condition: 'thunderstorm', description: 'Thunderstorm', multiplier: 1.5 };
    if (code <= 99) return { condition: 'thunderstorm_hail', description: 'Thunderstorm with hail', multiplier: 1.5 };
    return { condition: 'unknown', description: 'Unknown', multiplier: 1.0 };
}

// Temperature-based multiplier (extreme heat/cold increases demand)
function temperatureMultiplier(tempC: number): number {
    if (tempC >= 45) return 1.3;
    if (tempC >= 40) return 1.2;
    if (tempC >= 35) return 1.1;
    if (tempC <= 5) return 1.15;
    return 1.0;
}

const FALLBACK: WeatherResponse = {
    multiplier: 1.0,
    condition: 'unknown',
    description: 'Weather data unavailable',
    temperature: 30,
    isFallback: true,
};

export async function GET() {
    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION_MS) {
        return NextResponse.json(cachedData.data);
    }

    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,precipitation,rain,weather_code,apparent_temperature';
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (!response.ok) {
            console.error('Open-Meteo API error:', response.status);
            return NextResponse.json(FALLBACK);
        }

        const json = await response.json();
        const current = json.current;

        if (!current) {
            return NextResponse.json(FALLBACK);
        }

        const weatherCode = current.weather_code ?? 0;
        const temperature = current.temperature_2m ?? 30;
        const { condition, description, multiplier: weatherMult } = wmoToCondition(weatherCode);
        const tempMult = temperatureMultiplier(temperature);
        const finalMultiplier = Math.round(Math.max(weatherMult, tempMult) * 100) / 100;

        const data: WeatherResponse = {
            multiplier: finalMultiplier,
            condition,
            description,
            temperature,
            isFallback: false,
        };

        cachedData = { data, timestamp: Date.now() };
        return NextResponse.json(data);
    } catch (error) {
        console.error('Weather fetch error:', error);
        return NextResponse.json(FALLBACK);
    }
}
