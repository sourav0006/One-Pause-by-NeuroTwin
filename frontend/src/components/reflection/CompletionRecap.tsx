import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReflectionSession } from '../../types';
import {
  CheckCircle2,
  Printer,
  Bookmark,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileText,
  Compass,
  Check,
  MessageSquare,
} from 'lucide-react';

interface CompletionRecapProps {
  session: ReflectionSession;
  selectedOptionId?: string | null;
  onSave: () => Promise<void>;
  isSaved: boolean;
}

export const CompletionRecap: React.FC<CompletionRecapProps> = ({
  session,
  selectedOptionId,
  onSave,
  isSaved,
}) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const selectedOption = session.state.possible_responses.find(
    (opt) => opt.id === (selectedOptionId || session.selected_response_id)
  );

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Print-only Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-serif font-bold text-charcoal-900">ONE PAUSE — Reflection Summary</h1>
        <p className="text-xs text-charcoal-600 italic">"Before you respond, see."</p>
        <p className="text-[11px] text-charcoal-500 mt-1">
          Date: {new Date(session.created_at).toLocaleDateString()} • Status: Completed
        </p>
      </div>

      {/* Screen Header */}
      <div className="paper-card p-6 sm:p-8 bg-gradient-to-r from-sage-50/70 via-white to-paper-100 border border-sage-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-sage-800">
            <CheckCircle2 className="w-4 h-4 text-sage-700" />
            <span>Reflection Completed</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-900">
            Pause Summary & Deliberate Path
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed max-w-xl">
            You took time to see before responding. Below is a concise recap of the facts, interpretations, and trade-offs you explored.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-paper-300 bg-white hover:bg-paper-100 text-charcoal-800 text-xs font-medium transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
          </button>

          <button
            onClick={handleSaveClick}
            disabled={isSaving || isSaved}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shadow-xs ${
              isSaved
                ? 'bg-sage-100 text-sage-800 border border-sage-300'
                : 'border border-paper-300 bg-white hover:bg-paper-100 text-charcoal-800'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-sage-700" />
                <span>Saved to History</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-charcoal-600" />
                <span>{isSaving ? 'Saving...' : 'Save to History'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-charcoal-900 hover:bg-charcoal-800 text-paper-50 text-xs font-medium transition-colors shadow-xs"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recap Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Original Situation & Stated Facts */}
        <div className="paper-card p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-800 uppercase tracking-wider border-b border-paper-200 pb-2">
            <FileText className="w-4 h-4 text-sage-700" />
            <span>Situation & Reported Facts</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-charcoal-500 block mb-1">
              Original Situation:
            </span>
            <p className="text-xs font-serif italic text-charcoal-900 bg-paper-50 p-3 rounded-lg border border-paper-200 leading-relaxed">
              "{session.initial_situation}"
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-medium text-charcoal-500 block">
              Explicit Facts ({session.state.reported_facts.length}):
            </span>
            <ul className="space-y-1.5">
              {session.state.reported_facts.map((fact) => (
                <li
                  key={fact.id}
                  className="text-xs text-charcoal-800 flex items-start gap-2 bg-sage-50/50 p-2 rounded border border-sage-200/60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-600 mt-1.5 shrink-0" />
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 2. Hypotheses & Unknowns */}
        <div className="paper-card p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-800 uppercase tracking-wider border-b border-paper-200 pb-2">
            <Sparkles className="w-4 h-4 text-ochre-700" />
            <span>Examined Hypotheses & Unknowns</span>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-medium text-charcoal-500 block">
              Tentative Interpretations:
            </span>
            <div className="space-y-2">
              {session.state.hypotheses.map((hyp) => (
                <div
                  key={hyp.id}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    hyp.status === 'dismissed'
                      ? 'bg-paper-100/50 border-paper-200 opacity-60 line-through'
                      : 'bg-ochre-50/50 border-ochre-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-ochre-800 font-mono">
                    <span>{hyp.id}</span>
                    <span className="capitalize font-semibold">{hyp.status}</span>
                  </div>
                  <p className="italic text-charcoal-800 leading-relaxed">"{hyp.text}"</p>
                  {hyp.user_note && (
                    <p className="text-[10px] text-ochre-900 not-italic pt-1 border-t border-ochre-200">
                      <strong>Correction:</strong> {hyp.user_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {session.state.unknowns.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-paper-200">
              <span className="text-[11px] font-medium text-charcoal-500 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-softblue-600" />
                Remaining Unknowns:
              </span>
              <ul className="space-y-1">
                {session.state.unknowns.map((unk) => (
                  <li
                    key={unk.id}
                    className="text-xs text-charcoal-700 bg-softblue-50/40 p-2 rounded border border-softblue-200/50"
                  >
                    {unk.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Reported Behavioural Context (Phase 2) */}
      {session.state.behavioural_answers && session.state.behavioural_answers.length > 0 && (
        <div className="paper-card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-paper-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-800 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-sage-700" />
              <span>Reported Behavioural Context</span>
            </div>
            <span className="text-[10px] text-sage-800 bg-sage-50 border border-sage-200 px-2 py-0.5 rounded font-medium">
              Source: User-Reported
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {session.state.behavioural_answers.map((ans, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-paper-50 border border-paper-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sage-800">
                  {ans.theme}
                </span>
                <p className="text-xs font-medium text-charcoal-800 leading-snug">
                  {ans.question}
                </p>
                <p className="text-xs text-charcoal-600 bg-white p-2 rounded border border-paper-200 italic">
                  "{ans.answer}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Chosen Response vs. Open Next Steps */}
      <div className="paper-card p-6 bg-white space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-800 uppercase tracking-wider border-b border-paper-200 pb-2">
          <Compass className="w-4 h-4 text-sage-700" />
          <span>Next Step & Response Trade-offs</span>
        </div>

        {selectedOption ? (
          <div className="p-4 rounded-xl bg-sage-50/80 border border-sage-300 space-y-2">
            <span className="text-[10px] uppercase font-bold text-sage-800 tracking-wider">
              Selected Deliberate Choice
            </span>
            <h4 className="font-serif text-base font-semibold text-charcoal-900">
              {selectedOption.action}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <strong className="text-sage-800 text-[11px]">Key Benefits:</strong>
                <ul className="list-disc list-inside text-charcoal-700 mt-1 space-y-0.5">
                  {selectedOption.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="text-ochre-800 text-[11px]">Trade-offs & Risks:</strong>
                <ul className="list-disc list-inside text-charcoal-700 mt-1 space-y-0.5">
                  {selectedOption.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-[11px] text-charcoal-500 italic pt-2">
              Fitting circumstances: {selectedOption.appropriate_when}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-paper-100/60 border border-paper-200 text-xs text-charcoal-600 leading-relaxed">
            <strong>Open Completion:</strong> No specific action option was locked in. You paused, explored the possibilities, and retain the flexibility to choose in your own time without pressure.
          </div>
        )}
      </div>
    </div>
  );
};
