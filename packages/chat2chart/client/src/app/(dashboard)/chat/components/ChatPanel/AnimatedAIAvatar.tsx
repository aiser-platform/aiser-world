'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from 'antd';
import Image from 'next/image';

interface AnimatedAIAvatarProps {
  size?: number;
  isThinking?: boolean;
  isSpeaking?: boolean;
}

const AnimatedAIAvatar: React.FC<AnimatedAIAvatarProps> = ({ 
  size = 40, 
  isThinking = false,
  isSpeaking = false 
}) => {
  const [pulse, setPulse] = useState(false);
  
  useEffect(() => {
    if (isThinking || isSpeaking) {
      const pulseInterval = setInterval(() => {
        setPulse(prev => !prev);
      }, 1000);
      return () => clearInterval(pulseInterval);
    } else {
      setPulse(false);
    }
  }, [isThinking, isSpeaking]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        size={size}
        className={isThinking || isSpeaking ? 'aiser-avatar-animated' : ''}
        style={{
          background: 'linear-gradient(135deg, #030712 0%, #0d1f3f 100%)',
          border: `2px solid ${pulse ? '#00c2cb' : 'rgba(255,255,255,0.25)'}`,
          boxShadow: pulse 
            ? `0 0 16px rgba(0, 194, 203, 0.45)`
            : '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'visible',
          animation: (isThinking || isSpeaking) ? 'aiser-avatar-pulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <div style={{ width: size - 12, height: size - 12, position: 'relative' }}>
          <Image
            src="/aiser-logo.png"
            alt="Aiser AI"
            fill
            sizes="100%"
            style={{ objectFit: 'contain', borderRadius: '12px' }}
          />
        </div>
      </Avatar>
      
      {/* Thinking indicator */}
      {isThinking && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '12px',
            height: '12px',
            backgroundColor: '#52c41a',
            borderRadius: '50%',
            animation: 'aiser-avatar-pulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(82, 196, 26, 0.6)',
          }}
        />
      )}
    </div>
  );
};

export default AnimatedAIAvatar;

