import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Target,
  ArrowRightCircle,
  Edit3,
  Check,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Hypothesis, PossibleResponse } from '../../types';

export interface SelectedNodeInfo {
  id: string;
  type: string;
  data: any;
}

export interface ConnectedNodeInfo {
  id: string;
  type: string;
  label: string;
  direction: 'informs' | 'informed_by';
  relationship?: string;
}

interface NodeInspectorProps {
  selectedNode: SelectedNodeInfo | null;
  onClose: () => void;
  onUpdateHypothesis?: (
    hypId: string,
    status: 'active' | 'corrected' | 'dismissed',
    note?: string
  ) => Promise<void>;
  onSelectOption?: (optionId: string) => void;
  selectedOptionId?: string | null;
  connectedNodes?: ConnectedNodeInfo[];
  onNavigateToNode?: (nodeId: string) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  selectedNode,
  onClose,
  onUpdateHypothesis,
  onSelectOption,
  selectedOptionId,
  connectedNodes = [],
  onNavigateToNode,
}) => {
  if (!selectedNode) return null;

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync note text when selected hypothesis changes
  useEffect(() => {
    if (selectedNode?.type === 'hypothesis') {
      setNoteText((selectedNode.data as Hypothesis).user_note || '');
      setIsEditingNote(false);
    }
  }, [selectedNode]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleHypothesisAction = async (
    status: 'active' | 'corrected' | 'dismissed',
    customNote?: string
  ) => {
    if (!onUpdateHypothesis) return;
    setIsUpdating(true);
    try {
      await onUpdateHypothesis(selectedNode.id, status, customNote);
      setIsEditingNote(false);
    } finally {
      setIsUpdating(false);
    }
  };

  // Render header badge by type
  const renderTypeBadge = () => {
    switch (selectedNode.type) {
      case 'encounter':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-charcoal-100 text-charcoal-800">
            <FileText className="w-3.5 h-3.5 text-charcoal-700" />
            Situation Encounter
          </span>
        );
      case 'fact':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sage-100 text-sage-900">
            <CheckCircle2 className="w-3.5 h-3.5 text-sage-700" />
            Reported Fact (User)
          </span>
        );
      case 'hypothesis':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-ochre-100 text-ochre-900">
            <Sparkles className="w-3.5 h-3.5 text-ochre-700" />
            Tentative Hypothesis (AI)
          </span>
        );
      case 'unknown':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-softblue-100 text-softblue-900">
            <HelpCircle className="w-3.5 h-3.5 text-softblue-700" />
            Unknown / Context Gap
          </span>
        );
      case 'goal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-mauve-100 text-mauve-900">
            <Target className="w-3.5 h-3.5 text-mauve-700" />
            Stated Goal
          </span>
        );
      case 'response':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sage-100 text-sage-900">
            <ArrowRightCircle className="w-3.5 h-3.5 text-sage-700" />
            Possible Response
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Node Details Inspector"
      className="w-full sm:w-88 md:w-96 bg-white border border-paper-300 rounded-2xl shadow-lg p-5 flex flex-col space-y-4 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-paper-200">
        <div className="flex items-center gap-2">
          {renderTypeBadge()}
          <span className="text-[11px] font-mono text-charcoal-400">
            #{selectedNode.id}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details inspector"
          className="text-charcoal-400 hover:text-charcoal-700 p-1.5 rounded-lg hover:bg-paper-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content by Node Type */}
      <div className="space-y-4 flex-1">
        {/* 1. Situation Encounter */}
        {selectedNode.type === 'encounter' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal-500">
              Overview of Encounter
            </h4>
            <p className="font-serif text-sm text-charcoal-900 leading-relaxed bg-paper-50 p-3.5 rounded-xl border border-paper-200">
              {selectedNode.data.description}
            </p>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              This node anchors the reflection. All reported facts, hypotheses, and unknowns connect back to this primary situation.
            </p>
          </div>
        )}

        {/* 2. Reported Fact */}
        {selectedNode.type === 'fact' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-sage-800">
              Grounded Observation
            </h4>
            <div className="p-3.5 rounded-xl bg-sage-50/80 border border-sage-300 text-charcoal-900 font-sans text-sm leading-relaxed">
              {selectedNode.data.text}
            </div>
            <div className="p-3 rounded-lg bg-paper-50 border border-paper-200 text-xs text-charcoal-600 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
              <span>
                <strong>User Reported:</strong> This information was provided by you as an objective fact or direct personal experience.
              </span>
            </div>
          </div>
        )}

        {/* 3. Hypothesis */}
        {selectedNode.type === 'hypothesis' && (() => {
          const hyp = selectedNode.data as Hypothesis;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-charcoal-500">Status: <strong className="capitalize text-charcoal-800">{hyp.status}</strong></span>
                <span className="text-charcoal-500">Confidence: <strong className="capitalize text-charcoal-800">{hyp.confidence}</strong></span>
              </div>

              <div className="p-3.5 rounded-xl bg-ochre-50/80 border border-dashed border-ochre-400 space-y-2">
                <p className="font-serif italic text-sm text-charcoal-900 leading-relaxed">
                  "{hyp.text}"
                </p>
                {hyp.user_note && (
                  <div className="pt-2 border-t border-ochre-200/80 text-xs text-ochre-900 not-italic">
                    <strong>Your correction note:</strong> {hyp.user_note}
                  </div>
                )}
              </div>

              {/* Epistemic boundary notice */}
              <div className="p-2.5 rounded-lg bg-paper-50 border border-paper-200 text-[11px] text-charcoal-500 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-ochre-600 shrink-0 mt-0.5" />
                <span>
                  Tentative AI interpretation. Not a clinical diagnosis or confirmed motive. You may accept, correct, or dismiss it.
                </span>
              </div>

              {/* Inline Hypothesis Actions */}
              <div className="space-y-2 pt-1 border-t border-paper-200">
                <div className="text-xs font-semibold text-charcoal-700">
                  Manage Hypothesis:
                </div>

                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add your clarification or correction..."
                      rows={3}
                      maxLength={500}
                      className="w-full p-2.5 text-xs rounded-lg border border-paper-300 focus:outline-none focus:ring-1 focus:ring-sage-700"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingNote(false)}
                        className="px-3 py-1 text-xs text-charcoal-600 hover:bg-paper-100 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating || !noteText.trim()}
                        onClick={() => handleHypothesisAction('corrected', noteText.trim())}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-charcoal-900 text-white hover:bg-charcoal-800 disabled:opacity-40"
                      >
                        {isUpdating ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleHypothesisAction('active')}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                        hyp.status === 'active'
                          ? 'border-sage-500 bg-sage-100 text-sage-900 font-bold'
                          : 'border-paper-300 hover:bg-paper-100 text-charcoal-700'
                      }`}
                    >
                      <Check className="w-3 h-3 text-sage-600" />
                      <span>Accept</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setIsEditingNote(true)}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                        hyp.status === 'corrected'
                          ? 'border-ochre-500 bg-ochre-100 text-ochre-900 font-bold'
                          : 'border-paper-300 hover:bg-paper-100 text-charcoal-700'
                      }`}
                    >
                      <Edit3 className="w-3 h-3 text-ochre-600" />
                      <span>Correct</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleHypothesisAction('dismissed')}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                        hyp.status === 'dismissed'
                          ? 'border-red-400 bg-red-100 text-red-900 font-bold'
                          : 'border-paper-300 hover:bg-paper-100 text-charcoal-700'
                      }`}
                    >
                      <X className="w-3 h-3 text-red-600" />
                      <span>Dismiss</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 4. Unknown */}
        {selectedNode.type === 'unknown' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-softblue-800">
              Preserved Context Gap
            </h4>
            <div className="p-3.5 rounded-xl bg-softblue-50/80 border border-dotted border-softblue-400 text-charcoal-900 text-sm leading-relaxed">
              {selectedNode.data.text}
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Keeping this unknown explicitly in view prevents jumping to premature conclusions. Clarification questions are often formulated to resolve these gaps.
            </p>
          </div>
        )}

        {/* 5. Goal */}
        {selectedNode.type === 'goal' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-mauve-800">
              Guiding Value or Intended Outcome
            </h4>
            <div className="p-3.5 rounded-xl bg-mauve-50/80 border border-mauve-300 text-charcoal-900 font-medium text-sm leading-relaxed">
              {selectedNode.data.text}
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Goals help evaluate the trade-offs of different response possibilities.
            </p>
          </div>
        )}

        {/* 6. Response Option */}
        {selectedNode.type === 'response' && (() => {
          const resp = selectedNode.data as PossibleResponse;
          const isChosen = selectedOptionId === resp.id;

          return (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-paper-50 border border-paper-200 space-y-2">
                <h4 className="font-serif text-sm font-semibold text-charcoal-900 leading-snug">
                  {resp.action}
                </h4>
                <p className="text-xs text-charcoal-600">
                  <strong>Fitting when:</strong> {resp.appropriate_when}
                </p>
              </div>

              {/* Benefits */}
              {resp.benefits && resp.benefits.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-sage-800 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-sage-600" />
                    Potential Benefits:
                  </span>
                  <ul className="text-xs text-charcoal-700 space-y-1 pl-4 list-disc">
                    {resp.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trade-offs / Risks */}
              {resp.risks && resp.risks.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-ochre-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-ochre-600" />
                    Potential Trade-offs / Risks:
                  </span>
                  <ul className="text-xs text-charcoal-700 space-y-1 pl-4 list-disc">
                    {resp.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Selection Toggle */}
              {onSelectOption && (
                <div className="pt-2 border-t border-paper-200">
                  <button
                    type="button"
                    onClick={() => onSelectOption(resp.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      isChosen
                        ? 'bg-sage-700 text-white hover:bg-sage-800 shadow-xs'
                        : 'bg-paper-100 text-charcoal-800 hover:bg-paper-200 border border-paper-300'
                    }`}
                  >
                    {isChosen ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Chosen Response Option</span>
                      </>
                    ) : (
                      <span>Select this Option for Pause</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Connected Nodes List */}
        {connectedNodes.length > 0 && (
          <div className="pt-3 border-t border-paper-200 space-y-2">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
              Connected Elements in Graph
            </h5>
            <div className="space-y-1.5">
              {connectedNodes.map((cn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onNavigateToNode?.(cn.id)}
                  className="w-full text-left p-2 rounded-lg bg-paper-50 hover:bg-paper-100 border border-paper-200 text-xs flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <ArrowRight className="w-3 h-3 text-charcoal-400 group-hover:text-charcoal-700 shrink-0" />
                    <span className="font-medium text-charcoal-800 truncate">
                      {cn.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-charcoal-400 capitalize shrink-0 ml-2">
                    {cn.direction === 'informs' ? 'informs' : 'connected'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
