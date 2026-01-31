import { NextResponse } from 'next/server';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
let cachedData: { data: OCMStation[]; timestamp: number } | null = null;

interface OCMStation {
    ID: number;
    AddressInfo: {
        Title: string;
        AddressLine1?: string;
        Town?: string;
        StateOrProvince?: string;
        Latitude: number;
        Longitude: number;
    };
    NumberOfPoints?: number;
    Connections?: {
        ConnectionTypeID?: number;
        ConnectionType?: { Title: string };
        PowerKW?: number;
        Quantity?: number;
    }[];
    OperatorInfo?: {
        Title: string;
    };
    StatusType?: {
        IsOperational: boolean;
        Title: string;
    };
    UsageCost?: string;
}

// Real EV charging station locations in Delhi NCR (fallback when API is unavailable)
const FALLBACK_STATIONS: OCMStation[] = [
    { ID: 100001, AddressInfo: { Title: 'Tata Power - Connaught Place', Town: 'New Delhi', StateOrProvince: 'Delhi', Latitude: 28.6315, Longitude: 77.2167 }, NumberOfPoints: 12, Connections: [{ PowerKW: 50, Quantity: 8 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'Tata Power' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100002, AddressInfo: { Title: 'EESL - Nehru Place', Town: 'New Delhi', StateOrProvince: 'Delhi', Latitude: 28.5494, Longitude: 77.2530 }, NumberOfPoints: 8, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'EESL' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100003, AddressInfo: { Title: 'ChargeZone - Dwarka Sector 21', Town: 'Dwarka', StateOrProvince: 'Delhi', Latitude: 28.5523, Longitude: 77.0582 }, NumberOfPoints: 10, Connections: [{ PowerKW: 60, Quantity: 6 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'ChargeZone' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100004, AddressInfo: { Title: 'Fortum - Saket', Town: 'Saket', StateOrProvince: 'Delhi', Latitude: 28.5244, Longitude: 77.2090 }, NumberOfPoints: 6, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 2 }], OperatorInfo: { Title: 'Fortum' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100005, AddressInfo: { Title: 'Tata Power - India Gate', Town: 'New Delhi', StateOrProvince: 'Delhi', Latitude: 28.6129, Longitude: 77.2295 }, NumberOfPoints: 14, Connections: [{ PowerKW: 60, Quantity: 8 }, { PowerKW: 22, Quantity: 6 }], OperatorInfo: { Title: 'Tata Power' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100006, AddressInfo: { Title: 'EESL - Gurugram Sector 29', Town: 'Gurugram', StateOrProvince: 'Haryana', Latitude: 28.4595, Longitude: 77.0266 }, NumberOfPoints: 16, Connections: [{ PowerKW: 60, Quantity: 10 }, { PowerKW: 22, Quantity: 6 }], OperatorInfo: { Title: 'EESL' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100007, AddressInfo: { Title: 'ChargeZone - Noida Sector 18', Town: 'Noida', StateOrProvince: 'Uttar Pradesh', Latitude: 28.5706, Longitude: 77.3261 }, NumberOfPoints: 10, Connections: [{ PowerKW: 50, Quantity: 6 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'ChargeZone' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100008, AddressInfo: { Title: 'Statiq - Vasant Kunj', Town: 'Vasant Kunj', StateOrProvince: 'Delhi', Latitude: 28.5194, Longitude: 77.1567 }, NumberOfPoints: 8, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'Statiq' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100009, AddressInfo: { Title: 'Tata Power - Karol Bagh', Town: 'Karol Bagh', StateOrProvince: 'Delhi', Latitude: 28.6519, Longitude: 77.1905 }, NumberOfPoints: 6, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 2 }], OperatorInfo: { Title: 'Tata Power' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100010, AddressInfo: { Title: 'EESL - Lajpat Nagar', Town: 'Lajpat Nagar', StateOrProvince: 'Delhi', Latitude: 28.5700, Longitude: 77.2373 }, NumberOfPoints: 8, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'EESL' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100011, AddressInfo: { Title: 'ChargeZone - Gurugram Cyber City', Town: 'Gurugram', StateOrProvince: 'Haryana', Latitude: 28.4949, Longitude: 77.0889 }, NumberOfPoints: 20, Connections: [{ PowerKW: 60, Quantity: 12 }, { PowerKW: 22, Quantity: 8 }], OperatorInfo: { Title: 'ChargeZone' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100012, AddressInfo: { Title: 'Statiq - Greater Noida', Town: 'Greater Noida', StateOrProvince: 'Uttar Pradesh', Latitude: 28.4744, Longitude: 77.5040 }, NumberOfPoints: 12, Connections: [{ PowerKW: 60, Quantity: 8 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'Statiq' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100013, AddressInfo: { Title: 'Fortum - Rohini Sector 3', Town: 'Rohini', StateOrProvince: 'Delhi', Latitude: 28.7152, Longitude: 77.1212 }, NumberOfPoints: 8, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'Fortum' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100014, AddressInfo: { Title: 'Tata Power - Faridabad', Town: 'Faridabad', StateOrProvince: 'Haryana', Latitude: 28.4089, Longitude: 77.3178 }, NumberOfPoints: 10, Connections: [{ PowerKW: 50, Quantity: 6 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'Tata Power' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100015, AddressInfo: { Title: 'EESL - Janakpuri', Town: 'Janakpuri', StateOrProvince: 'Delhi', Latitude: 28.6219, Longitude: 77.0815 }, NumberOfPoints: 6, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 2 }], OperatorInfo: { Title: 'EESL' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100016, AddressInfo: { Title: 'ChargeZone - Ghaziabad', Town: 'Ghaziabad', StateOrProvince: 'Uttar Pradesh', Latitude: 28.6692, Longitude: 77.4538 }, NumberOfPoints: 8, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'ChargeZone' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100017, AddressInfo: { Title: 'Statiq - Aerocity', Town: 'Aerocity', StateOrProvince: 'Delhi', Latitude: 28.5561, Longitude: 77.1210 }, NumberOfPoints: 14, Connections: [{ PowerKW: 60, Quantity: 8 }, { PowerKW: 22, Quantity: 6 }], OperatorInfo: { Title: 'Statiq' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100018, AddressInfo: { Title: 'Tata Power - Rajouri Garden', Town: 'Rajouri Garden', StateOrProvince: 'Delhi', Latitude: 28.6466, Longitude: 77.1234 }, NumberOfPoints: 6, Connections: [{ PowerKW: 50, Quantity: 4 }, { PowerKW: 22, Quantity: 2 }], OperatorInfo: { Title: 'Tata Power' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100019, AddressInfo: { Title: 'EESL - Noida Sector 62', Town: 'Noida', StateOrProvince: 'Uttar Pradesh', Latitude: 28.6273, Longitude: 77.3649 }, NumberOfPoints: 10, Connections: [{ PowerKW: 50, Quantity: 6 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'EESL' }, StatusType: { IsOperational: true, Title: 'Operational' } },
    { ID: 100020, AddressInfo: { Title: 'ChargeZone - Manesar', Town: 'Manesar', StateOrProvince: 'Haryana', Latitude: 28.3616, Longitude: 76.9437 }, NumberOfPoints: 12, Connections: [{ PowerKW: 60, Quantity: 8 }, { PowerKW: 22, Quantity: 4 }], OperatorInfo: { Title: 'ChargeZone' }, StatusType: { IsOperational: true, Title: 'Operational' } },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat') || '28.6139';
    const lng = searchParams.get('lng') || '77.2090';
    const distance = searchParams.get('distance') || '50';
    const maxResults = searchParams.get('maxResults') || '200';

    // Return cached data if fresh
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return NextResponse.json({
            stations: cachedData.data,
            cached: true,
            count: cachedData.data.length,
        });
    }

    try {
        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&latitude=${lat}&longitude=${lng}&distance=${distance}&distanceunit=KM&maxresults=${maxResults}&compact=true&verbose=false`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            throw new Error(`Open Charge Map API returned ${response.status}`);
        }

        const data: OCMStation[] = await response.json();

        // Cache the response
        cachedData = { data, timestamp: Date.now() };

        return NextResponse.json({
            stations: data,
            cached: false,
            count: data.length,
        });
    } catch (error) {
        console.error('Failed to fetch from Open Charge Map, using fallback data:', error);

        // Return cached data even if stale
        if (cachedData) {
            return NextResponse.json({
                stations: cachedData.data,
                cached: true,
                stale: true,
                count: cachedData.data.length,
            });
        }

        // Return fallback stations based on real Delhi NCR locations
        return NextResponse.json({
            stations: FALLBACK_STATIONS,
            cached: false,
            fallback: true,
            count: FALLBACK_STATIONS.length,
        });
    }
}
