import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ReflectionSession, Hypothesis } from '../types';
import { ReflectionMap } from '../components/map/ReflectionMap';
import { HypothesisModal } from '../components/reflection/HypothesisModal';
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
} from 'lucide-react';

export const ReflectionViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ReflectionSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clarification question state
  const [answer, setAnswer] = useState('');
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarifySuccess, setClarifySuccess] = useState(false);

  // Hypothesis modal state
  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);

  // Session saving / completion state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) return;
      try {
        const res = await apiClient.get<ReflectionSession>(`/reflections/${id}`);
        setSession(res.data);
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.detail?.message ||
            err.response?.data?.detail ||
            'Could not load reflection session.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  // Handle Clarification submission (PRD §7 FR-06 & FR-07)
  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !answer.trim() || isClarifying) return;

    setIsClarifying(true);
    setErrorMessage(null);
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
      setErrorMessage(
        err.response?.data?.detail?.message ||
          'Failed to update reflection with clarification.'
      );
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
      alert(
        err.response?.data?.detail?.message ||
          'Failed to update hypothesis status.'
      );
    }
  };

  // Handle explicit save (PRD §7 FR-10 & §12.2)
  const handleSave = async () => {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      await apiClient.post(`/reflections/${id}/save`, {
        title: session?.title || session?.state.encounter.description.slice(0, 80),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to save reflection session.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle completion (PRD §7 FR-09)
  const handleComplete = async () => {
    if (!id || isCompleting) return;
    setIsCompleting(true);
    try {
      const res = await apiClient.post<ReflectionSession>(
        `/reflections/${id}/complete`,
        {}
      );
      setSession(res.data);
    } catch (err: any) {
      alert('Failed to complete reflection.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-200">
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
            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] bg-paper-100 text-charcoal-700">
              {session.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-paper-300 bg-white hover:bg-paper-100 text-charcoal-800 text-xs font-medium transition-colors shadow-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-sage-700" />
                <span className="text-sage-700">Saved to History</span>
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-charcoal-900 hover:bg-charcoal-800 text-paper-50 text-xs font-medium transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5 text-sage-300" />
              <span>{isCompleting ? 'Finishing...' : 'Complete Pause'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Map Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-charcoal-600">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-4 h-4 text-sage-700" />
            Interactive Reflection Map
          </span>
          <span className="text-[11px] text-charcoal-500 hidden sm:inline">
            Scroll to zoom • Drag to pan • Click hypotheses to inspect
          </span>
        </div>

        <ReflectionMap
          state={session.state}
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
              Multiple distinct next steps with trade-offs. No single choice is prescribed as universally best.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {session.state.possible_responses.map((resp, idx) => (
              <div
                key={resp.id || idx}
                className="paper-card p-5 space-y-3 flex flex-col justify-between bg-white border border-paper-200 hover:border-paper-400 transition-colors"
              >
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-sage-800 uppercase tracking-wider">
                    Option {idx + 1}
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

                <div className="pt-3 border-t border-paper-200 text-[10px] text-charcoal-500 italic">
                  <strong>When fitting:</strong> {resp.appropriate_when}
                </div>
              </div>
            ))}
          </div>
        </div>
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
