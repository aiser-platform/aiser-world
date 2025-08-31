import { NextRequest, NextResponse } from 'next/server';

// Simple fallback for build time
const getBackendUrl = () => {
  try {
    // Dynamic import to avoid build issues
    const { getBackendUrlForApi } = require('@/utils/backendUrl');
    return getBackendUrlForApi();
  } catch {
    // Fallback for build time
    return 'http://127.0.0.1:8000';
  }
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/conversations/?${searchParams.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch conversations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/conversations/`, {
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
        console.error('Failed to create conversation:', error);
        return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
        );
    }
}
