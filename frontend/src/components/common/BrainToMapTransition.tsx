import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';

interface BrainToMapTransitionProps {
  onTransitionComplete?: () => void;
  statusMessage?: string;
}

export const BrainToMapTransition: React.FC<BrainToMapTransitionProps> = ({
  statusMessage = 'Unfolding situation into reflection network...',
}) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setStage(2);
      return;
    }

    const t1 = setTimeout(() => setStage(1), 600);
    const t2 = setTimeout(() => setStage(2), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Expanding Network Rings */}
        <div
          className={`absolute rounded-full border border-sage-300 transition-all duration-1000 ease-out ${
            stage >= 1 ? 'w-44 h-44 opacity-40 scale-110' : 'w-24 h-24 opacity-0 scale-75'
          }`}
        />
        <div
          className={`absolute rounded-full border border-dashed border-ochre-300 transition-all duration-1000 delay-200 ease-out ${
            stage >= 2 ? 'w-52 h-52 opacity-30 scale-125' : 'w-28 h-28 opacity-0 scale-75'
          }`}
        />

        {/* Central Brain Logo */}
        <div className="relative z-10 transition-transform duration-700 ease-out">
          <Logo size={112} variant="badge" className="shadow-sm" />
        </div>
      </div>

      <div className="text-center space-y-1.5 max-w-sm">
        <h4 className="font-serif text-base font-medium text-charcoal-900">
          Before you respond, see.
        </h4>
        <p className="text-xs text-charcoal-500 leading-relaxed animate-pulse">
          {statusMessage}
        </p>
      </div>
    </div>
  );
};
