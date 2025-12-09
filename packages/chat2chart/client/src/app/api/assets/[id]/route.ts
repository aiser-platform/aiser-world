import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';

export async function GET(
  request: NextRequest,
  context: { params?: any }
) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const assetId = resolvedParams?.id;
    
    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const backendBase = getBackendUrlForApi();
    const cookies = request.cookies;
    const accessToken = cookies.get('access_token')?.value;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${backendBase}/assets/${assetId}`, {
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
    console.error('Failed to get asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params?: any }
) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const assetId = resolvedParams?.id;
    
    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const backendBase = getBackendUrlForApi();
    const cookies = request.cookies;
    const accessToken = cookies.get('access_token')?.value;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${backendBase}/assets/${assetId}`, {
      method: 'DELETE',
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
    console.error('Failed to delete asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset' },
      { status: 500 }
    );
  }
}


