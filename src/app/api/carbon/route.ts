import { NextResponse } from 'next/server';

// Module-level cache (15 minutes)
let cachedData: { data: CarbonResponse; timestamp: number } | null = null;
const CACHE_DURATION_MS = 15 * 60 * 1000;

interface CarbonResponse {
    carbonIntensity: number;
    zone: string;
    isFallback: boolean;
    timestamp: string;
}

// Average for India's Northern Regional Grid
const FALLBACK: CarbonResponse = {
    carbonIntensity: 720,
    zone: 'IN-NO',
    isFallback: true,
    timestamp: new Date().toISOString(),
};

export async function GET() {
    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION_MS) {
        return NextResponse.json(cachedData.data);
    }

    const apiKey = process.env.ELECTRICITY_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('ELECTRICITY_MAPS_API_KEY not set, returning fallback carbon data');
        return NextResponse.json(FALLBACK);
    }

    try {
        const response = await fetch(
            'https://api-access.electricitymaps.com/free-tier/carbon-intensity/latest?zone=IN-NO',
            {
                headers: { 'auth-token': apiKey },
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!response.ok) {
            console.error('Electricity Maps API error:', response.status);
            return NextResponse.json(FALLBACK);
        }

        const json = await response.json();

        const data: CarbonResponse = {
            carbonIntensity: json.carbonIntensity ?? 720,
            zone: json.zone ?? 'IN-NO',
            isFallback: false,
            timestamp: json.datetime ?? new Date().toISOString(),
        };

        cachedData = { data, timestamp: Date.now() };
        return NextResponse.json(data);
    } catch (error) {
        console.error('Carbon fetch error:', error);
        return NextResponse.json(FALLBACK);
    }
}
