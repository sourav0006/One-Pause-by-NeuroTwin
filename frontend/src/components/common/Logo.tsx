import React from 'react';
import logoBadge from '../../assets/logo_badge.png';
import logoTransparent from '../../assets/logo_transparent.png';
import logoBlush from '../../assets/logo_blush.png';

export interface LogoProps {
  /** Size in pixels (width & height for square/badge variants) */
  size?: number;
  /**
   * - 'badge': Circular avatar badge with warm blush background (ideal for Navbar & compact UI)
   * - 'hero': Warm blush framed art card (ideal for landing page)
   * - 'blush': Rectangular art print with native warm blush background
   * - 'transparent': Raw artwork with transparent background
   */
  variant?: 'badge' | 'hero' | 'blush' | 'transparent';
  /** Optional additional CSS classes */
  className?: string;
  /** Accessible alternative text */
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  variant = 'badge',
  className = '',
  alt = 'ONE PAUSE — Reflective Brain Logo',
}) => {
  if (variant === 'hero') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-3xl bg-[#ECDCCF] border border-[#dfccbf] shadow-sm overflow-hidden p-3 transition-transform duration-500 ease-out hover:scale-105 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logoTransparent}
          alt={alt}
          className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xs"
          loading="eager"
        />
      </div>
    );
  }

  if (variant === 'blush') {
    return (
      <img
        src={logoBlush}
        alt={alt}
        className={`object-contain rounded-2xl select-none pointer-events-none shadow-xs ${className}`}
        style={{ width: size, height: 'auto' }}
        loading="eager"
      />
    );
  }

  if (variant === 'transparent') {
    return (
      <img
        src={logoTransparent}
        alt={alt}
        className={`object-contain select-none pointer-events-none ${className}`}
        style={{ width: size, height: 'auto' }}
        loading="eager"
      />
    );
  }

  // Default: 'badge' (circular avatar badge)
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 transition-transform duration-300 ease-out ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoBadge}
        alt={alt}
        className="w-full h-full object-cover select-none pointer-events-none"
        loading="eager"
      />
    </div>
  );
};
