'use client';

import React from 'react';
import Image from 'next/image';

interface AiserLogoProps {
    size?: number;
    className?: string;
    showText?: boolean;
}

const AiserLogo: React.FC<AiserLogoProps> = ({ 
    size = 40, 
    className = '',
    showText = true 
}) => {
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            ...(className && { className })
        }}>
            <Image
                src="/aiser-logo.png"
                alt="Aiser Logo"
                width={size}
                height={size}
                style={{ borderRadius: '8px' }}
                priority
            />
            {showText && (
                <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: 'var(--color-text-primary)', // Use design system text color
                    lineHeight: '1.2'
                }} className="aiser-text">
                    Aiser
                </span>
            )}
        </div>
    );
};

export default AiserLogo;