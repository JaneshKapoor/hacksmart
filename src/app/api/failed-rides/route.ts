import { NextResponse } from 'next/server';
import {
    loadFailedRidesFromDB,
    saveFailedRidesToDB,
    saveFailedRideToDB,
} from '@/lib/supabase/simulation';
import { FailedRide } from '@/simulation/types';

// GET - Fetch failed rides from database
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 1000;

    try {
        const failedRides = await loadFailedRidesFromDB(limit);

        return NextResponse.json({
            success: true,
            count: failedRides.length,
            data: failedRides,
        });
    } catch (error) {
        console.error('Failed to fetch failed rides:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch failed rides',
            },
            { status: 500 }
        );
    }
}

// POST - Save failed rides to database
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if it's a single ride or array of rides
        if (Array.isArray(body.failedRides)) {
            await saveFailedRidesToDB(body.failedRides as FailedRide[]);
            return NextResponse.json({
                success: true,
                count: body.failedRides.length,
                message: `Saved ${body.failedRides.length} failed rides`,
            });
        } else if (body.failedRide) {
            await saveFailedRideToDB(body.failedRide as FailedRide);
            return NextResponse.json({
                success: true,
                count: 1,
                message: 'Saved 1 failed ride',
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request body. Expected failedRides array or failedRide object',
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Failed to save failed rides:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to save failed rides',
            },
            { status: 500 }
        );
    }
}
