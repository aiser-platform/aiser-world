import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';
import { extractAccessToken } from '@/utils/cookieParser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendBase = getBackendUrlForApi();
    
    // Use extractAccessToken for reliable token extraction
    const accessToken = extractAccessToken(request);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Also forward cookies
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const response = await fetch(`${backendBase}/assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to save asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save asset' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendBase = getBackendUrlForApi();
    
    // Use extractAccessToken for reliable token extraction
    const accessToken = extractAccessToken(request);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Also forward cookies
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    // Build query string from search params
    const queryString = searchParams.toString();
    const url = queryString ? `${backendBase}/assets?${queryString}` : `${backendBase}/assets`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to get assets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get assets' },
      { status: 500 }
    );
  }
}


