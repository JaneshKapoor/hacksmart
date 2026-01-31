import { WeatherData } from '@/simulation/types';

export async function fetchWeather(): Promise<WeatherData> {
    try {
        const response = await fetch('/api/weather');
        if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
        const data = await response.json();
        return data as WeatherData;
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return {
            multiplier: 1.0,
            condition: 'unknown',
            description: 'Weather data unavailable',
            temperature: 30,
            isFallback: true,
        };
    }
}
