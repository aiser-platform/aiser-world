'use client';

import { DefaultRoute } from '@/context/AuthContext';

export default function HomePage() {
    return (
        <DefaultRoute>
            {/* This content won't be shown since DefaultRoute will redirect */}
            <div />
        </DefaultRoute>
    );
}
