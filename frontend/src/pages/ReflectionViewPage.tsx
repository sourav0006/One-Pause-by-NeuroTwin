import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, formatApiError } from '../api/client';
import { ReflectionSession, Hypothesis } from '../types';
import { ReflectionMap } from '../components/map/ReflectionMap';
import { HypothesisModal } from '../components/reflection/HypothesisModal';
import { CompletionRecap } from '../components/reflection/CompletionRecap';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  HelpCircle,
  Send,
  AlertCircle,
  Clock,
  Layers,
  Check,
  FileCheck,
  X,
} from 'lucide-react';

export const ReflectionViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ReflectionSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Clarification question state
  const [answer, setAnswer] = useState('');
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarifySuccess, setClarifySuccess] = useState(false);

  // Hypothesis modal state
  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);

  // Option selection state (PRD §7 FR-08 & FR-09)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Session saving / completion state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'recap'>('map');

  // Load session whenever ID changes, resetting session state immediately
  // to avoid flashing stale graphs from previous sessions
  useEffect(() => {
    let isCancelled = false;

    // Reset local state immediately on ID switch
    setSession(null);
    setIsLoading(true);
    setErrorMessage(null);
    setActionError(null);
    setSelectedOptionId(null);
    setViewMode('map');

    const fetchSession = async () => {
      if (!id) return;
      try {
        const res = await apiClient.get<ReflectionSession>(`/reflections/${id}`);
        if (isCancelled) return;
        setSession(res.data);
        if (res.data.selected_response_id) {
          setSelectedOptionId(res.data.selected_response_id);
        }
        if (res.data.status === 'completed') {
          setViewMode('recap');
        }
      } catch (err: any) {
        if (isCancelled) return;
        setErrorMessage(formatApiError(err));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Option reconciliation: clear selectedOptionId if options regenerate without it
  useEffect(() => {
    if (selectedOptionId && session?.state?.possible_responses) {
      const exists = session.state.possible_responses.some(
        (r) => r.id === selectedOptionId
      );
      if (!exists) {
        setSelectedOptionId(null);
      }
    }
  }, [session, selectedOptionId]);

  // Handle Clarification submission (PRD §7 FR-06 & FR-07)
  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !answer.trim() || isClarifying) return;

    setIsClarifying(true);
    setActionError(null);
    setClarifySuccess(false);

    try {
      const res = await apiClient.post<ReflectionSession>(
        `/reflections/${id}/clarify`,
        { answer: answer.trim() }
      );
      setSession(res.data);
      setAnswer('');
      setClarifySuccess(true);
      setTimeout(() => setClarifySuccess(false), 4000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    } finally {
      setIsClarifying(false);
    }
  };

  // Handle Hypothesis patch (PRD §7 FR-05 & §10.2)
  const handleUpdateHypothesis = async (
    hypId: string,
    status: 'active' | 'corrected' | 'dismissed',
    note?: string
  ) => {
    if (!id) return;
    setActionError(null);
    try {
      const res = await apiClient.patch<ReflectionSession>(
        `/reflections/${id}/hypotheses/${hypId}`,
        {
          status,
          corrected_text: note,
        }
      );
      setSession(res.data);
    } catch (err: any) {
      setActionError(formatApiError(err));
    }
  };

  // Handle explicit save (PRD §7 FR-10 & §12.2)
  const handleSave = async () => {
    if (!id || isSaving) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const res = await apiClient.post<ReflectionSession>(`/reflections/${id}/save`, {
        title: session?.title || session?.state.encounter.description.slice(0, 80),
      });
      setSession(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle completion (PRD §7 FR-09)
  const handleComplete = async () => {
    if (!id || isCompleting) return;
    setIsCompleting(true);
    setActionError(null);
    try {
      const res = await apiClient.post<ReflectionSession>(
        `/reflections/${id}/complete`,
        {
          selected_option_id: selectedOptionId || undefined,
        }
      );
      setSession(res.data);
      setViewMode('recap');
    } catch (err: any) {
      setActionError(formatApiError(err));
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-8 h-8 border-3 border-sage-700 border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-charcoal-700 text-sm">
          Loading reflection map...
        </p>
      </div>
    );
  }

  if (errorMessage || !session) {
    return (
      <div className="flex-1 max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-lg font-medium text-charcoal-900">
          Reflection Unavailable
        </h3>
        <p className="text-xs text-charcoal-600 leading-relaxed">
          {errorMessage || 'The requested reflection could not be found.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-charcoal-900 text-paper-50 hover:bg-charcoal-800"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-6 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-200 print:hidden">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal-800 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <h2 className="font-serif text-2xl font-medium text-charcoal-900">
            {session.title || 'Reflection Map'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-charcoal-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>•</span>
            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] bg-paper-100 text-charcoal-700 font-mono">
              {session.status.replace('_', ' ')}
            </span>
            {session.is_saved && (
              <>
                <span>•</span>
                <span className="text-[10px] text-sage-800 bg-sage-100 px-2 py-0.5 rounded font-medium">
                  Saved to History
                </span>
              </>
            )}
            {(session.state.encounter.description.includes('[DEV FIXTURE]') ||
              session.state.reported_facts.some((f) => f.text.includes('[DEV FIXTURE]'))) && (
              <>
                <span>•</span>
                <span className="text-[10px] text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded font-mono font-semibold tracking-tight">
                  DEV DEMO FIXTURES (Offline)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & View Toggles */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {session.status === 'completed' && (
            <div className="flex rounded-lg bg-paper-200/60 p-1 border border-paper-300 text-xs mr-2">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-charcoal-900 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Map View
              </button>
              <button
                onClick={() => setViewMode('recap')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'recap'
                    ? 'bg-white text-charcoal-900 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Summary Recap
              </button>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || session.is_saved}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shadow-xs ${
              session.is_saved
                ? 'bg-sage-100 text-sage-800 border border-sage-300'
                : 'border border-paper-300 bg-white hover:bg-paper-100 text-charcoal-800'
            }`}
          >
            {session.is_saved || saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-sage-700" />
                <span className="text-sage-700">Saved in History</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-charcoal-600" />
                <span>{isSaving ? 'Saving...' : 'Save Reflection'}</span>
              </>
            )}
          </button>

          {session.status !== 'completed' && (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-charcoal-900 hover:bg-charcoal-800 text-paper-50 text-xs font-medium transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5 text-sage-300" />
              <span>{isCompleting ? 'Finishing...' : 'Complete Pause'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dismissible In-App Action Error Banner */}
      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3 shadow-xs print:hidden animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="p-1 rounded-md text-red-600 hover:text-red-900 hover:bg-red-100 transition-colors"
            title="Dismiss error"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Render View Mode: Recap or Map */}
      {viewMode === 'recap' ? (
        <CompletionRecap
          session={session}
          selectedOptionId={selectedOptionId}
          onSave={handleSave}
          isSaved={session.is_saved}
        />
      ) : (
        <>
          {/* Main Interactive Map Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-charcoal-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-4 h-4 text-sage-700" />
                Interactive Reflection Map
              </span>
              <span className="text-[11px] text-charcoal-500 hidden sm:inline">
                Scroll to zoom • Drag to pan • Click any node to inspect details or revise hypotheses
              </span>
            </div>

            <ReflectionMap
              state={session.state}
              onUpdateHypothesis={handleUpdateHypothesis}
              onSelectOption={(optId) =>
                setSelectedOptionId(selectedOptionId === optId ? null : optId)
              }
              selectedOptionId={selectedOptionId}
              onSelectHypothesis={(hyp) => setSelectedHypothesis(hyp)}
            />
          </div>

          {/* Clarification Flow Section (PRD §7 FR-06 & FR-07) */}
          {session.state.follow_up_question && (
            <div className="paper-card p-6 bg-gradient-to-r from-paper-100 via-white to-softblue-50/40 border border-paper-300 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-softblue-100 text-softblue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-softblue-800">
                    Targeted Follow-up Question
                  </span>
                  <h4 className="font-serif text-lg font-medium text-charcoal-900 leading-snug">
                    {session.state.follow_up_question.text}
                  </h4>
                  <p className="text-xs text-charcoal-500">
                    <strong>Purpose:</strong> {session.state.follow_up_question.purpose}
                  </p>
                </div>
              </div>

              {clarifySuccess && (
                <div className="p-3 rounded-lg bg-sage-50 border border-sage-200 text-sage-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sage-700" />
                  <span>
                    Clarification incorporated! The reflection map has updated with your response as reported information.
                  </span>
                </div>
              )}

              <form onSubmit={handleClarifySubmit} className="space-y-3 pt-1">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer to clarify priorities or resolve unknowns..."
                  rows={3}
                  maxLength={2000}
                  required
                  className="w-full p-3 text-xs sm:text-sm rounded-lg border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-sage-700 leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-charcoal-400">
                    Your answer is added as user-reported information.
                  </span>
                  <button
                    type="submit"
                    disabled={isClarifying || !answer.trim()}
                    className="py-2 px-4 rounded-lg bg-charcoal-900 hover:bg-charcoal-800 text-paper-50 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {isClarifying ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-sage-300" />
                        <span>Update Map with Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Balanced Next Steps Section (PRD §7 FR-08) */}
          {session.state.possible_responses && session.state.possible_responses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-paper-200">
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-medium text-charcoal-900">
                  Balanced Response Possibilities
                </h3>
                <p className="text-xs text-charcoal-600">
                  Multiple distinct next steps with trade-offs. You can select one deliberate path, or complete without choosing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {session.state.possible_responses.map((resp, idx) => {
                  const isSelected = selectedOptionId === resp.id;
                  return (
                    <div
                      key={resp.id || idx}
                      className={`paper-card p-5 space-y-3 flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-sage-50/70 border-2 border-sage-600 ring-2 ring-sage-200'
                          : 'bg-white border border-paper-200 hover:border-paper-400'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sage-800 uppercase tracking-wider">
                            Option {idx + 1}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-sage-800 bg-sage-200/80 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-sage-800" />
                              Selected
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-sm font-semibold text-charcoal-900 leading-snug">
                          {resp.action}
                        </h4>

                        {/* Benefits */}
                        {resp.benefits && resp.benefits.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[11px] font-medium text-sage-800">
                              Potential Benefits:
                            </div>
                            <ul className="text-[11px] text-charcoal-600 list-disc list-inside space-y-0.5">
                              {resp.benefits.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Risks */}
                        {resp.risks && resp.risks.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[11px] font-medium text-ochre-800">
                              Potential Trade-offs / Risks:
                            </div>
                            <ul className="text-[11px] text-charcoal-600 list-disc list-inside space-y-0.5">
                              {resp.risks.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-paper-200 space-y-3">
                        <p className="text-[10px] text-charcoal-500 italic">
                          <strong>When fitting:</strong> {resp.appropriate_when}
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOptionId(isSelected ? null : resp.id);
                          }}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-sage-700 text-white hover:bg-sage-800'
                              : 'bg-paper-100 text-charcoal-800 hover:bg-paper-200 border border-paper-300'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Chosen Response</span>
                            </>
                          ) : (
                            <span>Choose this response</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Complete without selecting button */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal-900 text-paper-50 text-xs font-medium hover:bg-charcoal-800 transition-colors shadow-sm"
                >
                  <FileCheck className="w-4 h-4 text-sage-300" />
                  <span>
                    {selectedOptionId
                      ? 'Confirm & View Summary'
                      : 'Complete Reflection without Choosing'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hypothesis Inspection Modal */}
      <HypothesisModal
        hypothesis={selectedHypothesis}
        onClose={() => setSelectedHypothesis(null)}
        onUpdate={handleUpdateHypothesis}
      />
    </div>
  );
};
