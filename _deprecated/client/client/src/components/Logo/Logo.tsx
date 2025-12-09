import React from 'react';
import Image from 'next/image';
import { useDarkMode } from '@/hooks/useDarkMode';

interface LogoProps {
    collapsed?: boolean;
}

const Logo: React.FC<LogoProps> = ({ collapsed = false }) => {
    const [isDarkMode] = useDarkMode();

    return (
        <div className="p-3  flex items-center justify-center">
            <Image
                src={
                    collapsed
                        ? '/svg/logo.svg'
                        : isDarkMode
                          ? '/svg/logo-horizontal-white.svg'
                          : '/svg/logo-horizontal.svg'
                }
                alt="Aiser Logo"
                width={collapsed ? 32 : 120}
                height={32}
                priority
            />
        </div>
    );
};

export default Logo;
