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
        <div className={`flex items-center space-x-2 ${className}`}>
            <Image
                src="/aiser-logo.png"
                alt="Aiser Logo"
                width={size}
                height={size}
                className="rounded-lg"
                priority
            />
            {showText && (
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        Aiser
                    </span>
                </div>
            )}
        </div>
    );
};

export default AiserLogo;