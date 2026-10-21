import React, { useState, useEffect } from 'react';

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

        {/* Central Brain Morphology */}
        <svg
          viewBox="0 0 160 160"
          className="w-36 h-36 relative z-10 transition-transform duration-700 ease-out"
        >
          {/* Soft background pulse */}
          <circle cx="80" cy="80" r="65" fill="#E2ECE4" fillOpacity="0.4" />

          {/* Brain Left Hemisphere */}
          <path
            d="M74 35C58 35 44 46 44 64C44 72 48 78 52 83C46 89 44 98 47 106C50 115 58 124 74 125"
            stroke="#272B30"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          <path
            d="M52 64C56 64 64 61 68 54C72 48 74 42 74 35"
            stroke="#648572"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Brain Right Hemisphere */}
          <path
            d="M86 35C102 35 116 46 116 64C116 72 112 78 108 83C114 89 116 98 113 106C110 115 102 124 86 125"
            stroke="#272B30"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          <path
            d="M108 64C104 64 96 61 92 54C88 48 86 42 86 35"
            stroke="#5F88A2"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Radiating Synaptic Nodes (Unfolding into Network) */}
          <g className={`transition-opacity duration-700 ${stage >= 1 ? 'opacity-100' : 'opacity-20'}`}>
            {/* Fact Synapse */}
            <circle cx="48" cy="60" r="4.5" fill="#648572" />
            <line x1="48" y1="60" x2="28" y2="45" stroke="#648572" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="28" cy="45" r="3" fill="#648572" />

            {/* Hypothesis Synapse */}
            <circle cx="112" cy="60" r="4.5" fill="#C48D3F" />
            <line x1="112" y1="60" x2="132" y2="45" stroke="#C48D3F" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="132" cy="45" r="3" fill="#C48D3F" />

            {/* Unknown Synapse */}
            <circle cx="112" cy="100" r="4.5" fill="#5F88A2" />
            <line x1="112" y1="100" x2="132" y2="115" stroke="#5F88A2" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="132" cy="115" r="3" fill="#5F88A2" />

            {/* Core Synapse Center */}
            <circle cx="80" cy="80" r="5" fill="#272B30" />
          </g>
        </svg>
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
