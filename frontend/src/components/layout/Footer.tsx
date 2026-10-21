import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-paper-200 bg-paper-50 py-8 mt-auto text-xs text-charcoal-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sage-700" />
          <span>
            ONE PAUSE is a reflection aid. It does not provide psychological diagnosis or clinical advice.
          </span>
        </div>
        <div className="text-charcoal-400">
          Structured reflection • Local MVP
        </div>
      </div>
    </footer>
  );
};
