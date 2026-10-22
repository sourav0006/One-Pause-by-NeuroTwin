import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, formatApiError } from '../api/client';
import { ReflectionSession } from '../types';
import { BrainToMapTransition } from '../components/common/BrainToMapTransition';
import { ArrowLeft, Sparkles, Send, Info, AlertCircle } from 'lucide-react';

const DEMO_SITUATION =
  "My manager asked me to take on an urgent project with an immediate deadline, but my schedule is already committed to quarterly team deliverables. I want to say yes to maintain rapport, but I am worried about compromising delivery quality.";

const DEMO_CONTEXT =
  "Maintaining a reputation for reliable delivery without burnout is important to me.";

export const SituationEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [situation, setSituation] = useState('');
  const [optionalContext, setOptionalContext] = useState('');
  const [showOptionalContext, setShowOptionalContext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoadDemoScenario = () => {
    setSituation(DEMO_SITUATION);
    setOptionalContext(DEMO_CONTEXT);
    setShowOptionalContext(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation.trim() || situation.trim().length < 10 || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post<ReflectionSession>('/reflections/analyze', {
        situation: situation.trim(),
        context: optionalContext.trim() || undefined,
      });

      // Smooth transition to reflection map
      navigate(`/reflections/${res.data.id}`);
    } catch (err: any) {
      setErrorMessage(formatApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        <div className="paper-card p-8 sm:p-12 max-w-lg w-full bg-white text-center shadow-md">
          <BrainToMapTransition statusMessage="Examining situation with Gemini reflection engine and structuring the network..." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 max-w-3xl mx-auto w-full space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </button>

      <div className="space-y-2">
        <h2 className="font-serif text-3xl font-medium text-charcoal-900">
          Describe the Situation
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          What is currently happening? Write what occurred or what is causing hesitation in your own words.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>Analysis Error:</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="paper-card p-6 sm:p-8 bg-white shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-charcoal-800">
                The Situation <span className="text-charcoal-400 font-normal">(required)</span>
              </label>
              <button
                type="button"
                onClick={handleLoadDemoScenario}
                className="text-[11px] text-sage-700 hover:text-sage-900 flex items-center gap-1 underline underline-offset-2"
                title="Fill realistic workplace workload scenario for live demonstration"
              >
                <Sparkles className="w-3 h-3" />
                Fill Demo Scenario: Workload & Priorities
              </button>
            </div>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="e.g. My manager assigned an urgent project while my calendar is completely packed..."
              rows={5}
              required
              minLength={10}
              maxLength={4000}
              disabled={isLoading}
              className="w-full p-3.5 text-sm rounded-lg border border-paper-300 bg-paper-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sage-700 focus:border-sage-700 leading-relaxed transition-colors disabled:opacity-60"
            />
            <div className="flex justify-between text-[11px] text-charcoal-400">
              <span>Minimum 10 characters</span>
              <span>{situation.length} / 4000</span>
            </div>
          </div>

          {/* Optional context toggle (PRD §8.1, §11) */}
          <div className="pt-2">
            {!showOptionalContext ? (
              <button
                type="button"
                onClick={() => setShowOptionalContext(true)}
                className="text-xs text-charcoal-500 hover:text-charcoal-800 flex items-center gap-1.5"
              >
                <span>+ Add optional personal context</span>
                <span className="text-[10px] text-charcoal-400">(e.g. priority or relationship detail)</span>
              </button>
            ) : (
              <div className="space-y-2 p-4 rounded-lg bg-paper-100/60 border border-paper-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-charcoal-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sage-700" />
                    Optional Context
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOptionalContext(false)}
                    className="text-[11px] text-charcoal-400 hover:text-charcoal-600"
                  >
                    Hide
                  </button>
                </div>
                <textarea
                  value={optionalContext}
                  onChange={(e) => setOptionalContext(e.target.value)}
                  placeholder="e.g. Protecting my professional reputation is a key concern for me..."
                  rows={2}
                  maxLength={1000}
                  disabled={isLoading}
                  className="w-full p-2.5 text-xs rounded border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-sage-700"
                />
              </div>
            )}
          </div>

          {/* Notice */}
          <div className="p-3 rounded-lg bg-paper-100/50 border border-paper-200 text-[11px] text-charcoal-500 leading-normal">
            <strong>Privacy & AI Disclosure:</strong> Your text is processed with Google Gemini structured reflection prompts to map facts, tentative hypotheses, and unknowns. It will not be permanently stored in user history unless you explicitly click "Save reflection".
          </div>

          <button
            type="submit"
            disabled={isLoading || situation.trim().length < 10}
            className="w-full py-3 px-5 rounded-xl bg-charcoal-900 text-paper-50 text-sm font-medium hover:bg-charcoal-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4 text-sage-300" />
            <span>Generate Reflection Map</span>
          </button>
        </form>
      </div>
    </div>
  );
};
