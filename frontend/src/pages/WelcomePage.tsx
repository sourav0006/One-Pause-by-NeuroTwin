import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BrainIllustration } from '../components/common/BrainIllustration';
import { PauseCountdown } from '../components/common/PauseCountdown';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, Compass, Layers } from 'lucide-react';

export const INITIAL_PAUSE_SESSION_KEY = 'onepause_initial_pause_completed';

export const WelcomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [hasCompletedInitialPause, setHasCompletedInitialPause] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(INITIAL_PAUSE_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handlePauseComplete = useCallback(() => {
    try {
      sessionStorage.setItem(INITIAL_PAUSE_SESSION_KEY, 'true');
    } catch {}
    setHasCompletedInitialPause(true);
  }, []);

  // Phase 1: Initial-entry 8-second cognitive countdown before revealing homepage
  if (!hasCompletedInitialPause) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        <div className="paper-card p-8 sm:p-12 max-w-lg w-full bg-white text-center shadow-md">
          <PauseCountdown
            durationSeconds={8}
            onComplete={handlePauseComplete}
            onSkip={handlePauseComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Minimal Brain Illustration */}
        <div className="flex justify-center">
          <BrainIllustration size={160} />
        </div>

        {/* Hero Copy */}
        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-charcoal-900 tracking-tight">
            Before you respond, <span className="italic text-sage-900">see.</span>
          </h1>
          <p className="text-lg text-charcoal-600 max-w-xl mx-auto leading-relaxed">
            ONE PAUSE is an AI-assisted reflective tool that helps you examine everyday situations,
            separate facts from interpretations, and choose deliberate responses.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-charcoal-900 text-paper-50 font-medium hover:bg-charcoal-800 transition-all shadow-sm"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth?mode=register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-charcoal-900 text-paper-50 font-medium hover:bg-charcoal-800 transition-all shadow-sm"
              >
                Start a Pause
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/auth?mode=login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-paper-300 bg-white/70 text-charcoal-800 font-medium hover:bg-white transition-all"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          <div className="paper-card p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-sage-50 text-sage-700 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-medium text-base text-charcoal-900">Show, Don't Lecture</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Unfold your situation into an interactive conceptual map instead of reading lengthy AI essays.
            </p>
          </div>

          <div className="paper-card p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-ochre-50 text-ochre-700 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-medium text-base text-charcoal-900">Ask, Don't Diagnose</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Resolve meaningful uncertainties with one targeted question rather than assigning personality labels.
            </p>
          </div>

          <div className="paper-card p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-softblue-50 text-softblue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-medium text-base text-charcoal-900">Preserve Uncertainty</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Strictly distinguish user-reported facts from tentative AI hypotheses and known unknowns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
