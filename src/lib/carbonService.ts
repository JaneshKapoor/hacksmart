import { CarbonData } from '@/simulation/types';

export async function fetchCarbonIntensity(): Promise<CarbonData> {
    try {
        const response = await fetch('/api/carbon');
        if (!response.ok) throw new Error(`Carbon API returned ${response.status}`);
        const data = await response.json();
        return data as CarbonData;
    } catch (error) {
        console.error('Failed to fetch carbon intensity:', error);
        return {
            carbonIntensity: 720,
            zone: 'IN-NO',
            isFallback: true,
            timestamp: new Date().toISOString(),
        };
    }
}
