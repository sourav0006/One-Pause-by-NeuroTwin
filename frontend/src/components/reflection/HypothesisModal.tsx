import React, { useState, useEffect } from 'react';
import { Hypothesis } from '../../types';
import { Sparkles, Check, X, Edit3, AlertCircle } from 'lucide-react';

interface HypothesisModalProps {
  hypothesis: Hypothesis | null;
  onClose: () => void;
  onUpdate: (
    hypothesisId: string,
    status: 'active' | 'corrected' | 'dismissed',
    correctedText?: string
  ) => Promise<void>;
}

export const HypothesisModal: React.FC<HypothesisModalProps> = ({
  hypothesis,
  onClose,
  onUpdate,
}) => {
  if (!hypothesis) return null;

  const [correctionNote, setCorrectionNote] = useState(hypothesis.user_note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStatusChange = async (
    status: 'active' | 'corrected' | 'dismissed',
    text?: string
  ) => {
    setIsSubmitting(true);
    try {
      await onUpdate(hypothesis.id, status, text);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-paper-300 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-ochre-700 font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Tentative AI Hypothesis</span>
            </div>
            <h3 className="font-serif text-lg font-medium text-charcoal-900">
              Inspect or Revise Hypothesis
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-charcoal-600 p-1 rounded-lg hover:bg-paper-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-xl bg-ochre-50/70 border border-dashed border-ochre-300 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-ochre-800">
            <span className="capitalize">Confidence: <strong>{hypothesis.confidence}</strong></span>
            <span className="capitalize px-2 py-0.5 rounded bg-ochre-100 font-mono text-[10px]">
              Status: {hypothesis.status}
            </span>
          </div>
          <p className="font-serif italic text-sm text-charcoal-900 leading-relaxed">
            "{hypothesis.text}"
          </p>
        </div>

        {/* Uncertainty Disclose */}
        <p className="text-xs text-charcoal-500 leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-sage-700 shrink-0 mt-0.5" />
          <span>
            This is an AI-generated possibility based on your situation. It is not a clinical assessment or guaranteed fact. You remain in complete control.
          </span>
        </p>

        {/* Correction form if expanded */}
        {showCorrectionInput ? (
          <div className="space-y-3 pt-2">
            <label className="text-xs font-medium text-charcoal-700 block">
              Your Correction or Clarification Note
            </label>
            <textarea
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="e.g. Actually, my main concern is work quality rather than reputation..."
              rows={3}
              maxLength={500}
              className="w-full p-3 text-xs rounded-lg border border-paper-300 focus:outline-none focus:ring-1 focus:ring-sage-700"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCorrectionInput(false)}
                className="px-3 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !correctionNote.trim()}
                onClick={() => handleStatusChange('corrected', correctionNote.trim())}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-charcoal-900 text-paper-50 hover:bg-charcoal-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Correction'}
              </button>
            </div>
          </div>
        ) : (
          /* Action Buttons */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              disabled={isSubmitting}
              onClick={() => handleStatusChange('active')}
              className="py-2.5 px-3 rounded-lg border border-sage-300 bg-sage-50/70 hover:bg-sage-100 text-sage-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-sage-700" />
              <span>Accept Plausible</span>
            </button>

            <button
              disabled={isSubmitting}
              onClick={() => setShowCorrectionInput(true)}
              className="py-2.5 px-3 rounded-lg border border-ochre-300 bg-ochre-50/70 hover:bg-ochre-100 text-ochre-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-ochre-700" />
              <span>Correct Note</span>
            </button>

            <button
              disabled={isSubmitting}
              onClick={() => handleStatusChange('dismissed')}
              className="py-2.5 px-3 rounded-lg border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-red-600" />
              <span>Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
