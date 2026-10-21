import React from 'react';

interface BrainIllustrationProps {
  className?: string;
  size?: number;
}

export const BrainIllustration: React.FC<BrainIllustrationProps> = ({
  className = '',
  size = 140,
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-700 ease-out hover:scale-105"
      >
        {/* Subtle background glow */}
        <circle cx="80" cy="80" r="70" fill="#E2ECE4" fillOpacity="0.4" />
        <circle cx="80" cy="80" r="50" fill="#FAF8F4" />

        {/* Brain Left Hemisphere - Minimal Charcoal Curvature */}
        <path
          d="M74 35C58 35 44 46 44 64C44 72 48 78 52 83C46 89 44 98 47 106C50 115 58 124 74 125"
          stroke="#272B30"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M52 64C56 64 64 61 68 54C72 48 74 42 74 35"
          stroke="#648572"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M52 83C59 83 67 86 74 81"
          stroke="#959EA7"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M56 104C63 103 69 110 74 116"
          stroke="#648572"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Brain Right Hemisphere - Minimal Charcoal Curvature */}
        <path
          d="M86 35C102 35 116 46 116 64C116 72 112 78 108 83C114 89 116 98 113 106C110 115 102 124 86 125"
          stroke="#272B30"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M108 64C104 64 96 61 92 54C88 48 86 42 86 35"
          stroke="#5F88A2"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M108 83C101 83 93 86 86 81"
          stroke="#959EA7"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M104 104C97 103 91 110 86 116"
          stroke="#C48D3F"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Central Gap & Connecting Synapse Nodes */}
        <line x1="80" y1="42" x2="80" y2="118" stroke="#DFD8CA" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Colored reflective synapse markers */}
        <circle cx="52" cy="64" r="3.5" fill="#648572" />
        <circle cx="108" cy="64" r="3.5" fill="#5F88A2" />
        <circle cx="52" cy="83" r="3.5" fill="#C48D3F" />
        <circle cx="108" cy="83" r="3.5" fill="#916B84" />
        <circle cx="80" cy="80" r="4" fill="#272B30" />
      </svg>
    </div>
  );
};
