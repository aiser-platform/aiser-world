"use client";

import React from 'react';
import nextDynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';

export const dynamic = 'force-dynamic';

// Temporarily use static import to test the component
import MigratedDashboardStudio from './components/MigratedDashboardStudio';

// debug logs removed

class ErrorBoundary extends React.Component<any, { error: any }>{
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: any, info: any) { console.error('DashStudio ErrorBoundary caught', error, info); }
  render() { if (this.state.error) return (<div style={{ padding: 24 }}><h2>Something went wrong</h2><pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre></div>); return this.props.children; }
}

export default function DashStudioPage() {
  const { isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      {/* Simple client mount test element (dev-only) */}
      <ClientMountTest />
      <MigratedDashboardStudio />
    </ErrorBoundary>
  );
}

function ClientMountTest() {
  React.useEffect(() => {
    try {
      console.debug('DashStudio: ClientMountTest mounted');
      if (typeof window !== 'undefined') (window as any).__page_client_loaded = true;
    } catch (e) {}
  }, []);

  return (
    <div id="__simple_client_test" style={{ display: 'none' }}>client-mounted</div>
  );
}

