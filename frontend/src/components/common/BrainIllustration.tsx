import React from 'react';
import { Logo } from './Logo';

export interface BrainIllustrationProps {
  className?: string;
  size?: number;
}

export const BrainIllustration: React.FC<BrainIllustrationProps> = ({
  className = '',
  size = 160,
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <Logo size={size} variant="hero" alt="ONE PAUSE Brain Illustration" />
    </div>
  );
};
