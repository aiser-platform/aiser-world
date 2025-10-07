import { NextRequest, NextResponse } from 'next/server';
// Use server-safe backend resolution: map localhost->internal service when SSR
const BACKEND_URL = ((): string => {
    const env = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (env && /localhost|127\.0\.0\.1/.test(env)) return 'http://chat2chart-server:8000';
    return env || 'http://chat2chart-server:8000';
})();

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const response = await fetch(`${BACKEND_URL}/conversations/${params.id}?${searchParams.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch conversation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversation' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/conversations/${params.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to update conversation:', error);
        return NextResponse.json(
            { error: 'Failed to update conversation' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/conversations/${params.id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to add message to conversation:', error);
        return NextResponse.json(
            { error: 'Failed to add message to conversation' },
            { status: 500 }
        );
    }
}
