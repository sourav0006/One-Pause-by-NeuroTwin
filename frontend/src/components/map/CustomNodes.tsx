import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  FileText,
  HelpCircle,
  Sparkles,
  Target,
  ArrowRightCircle,
  Edit2,
} from 'lucide-react';
import { Hypothesis, PossibleResponse } from '../../types';

// 1. Encounter / Situation Node
export const EncounterNode = memo(({ data }: NodeProps) => {
  return (
    <div className="px-4 py-3 rounded-xl bg-white border-2 border-charcoal-700 shadow-sm max-w-xs text-left">
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-charcoal-700" />
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-500 mb-1">
        <FileText className="w-3 h-3 text-charcoal-700" />
        <span>Situation Encounter</span>
      </div>
      <p className="text-xs font-serif font-medium text-charcoal-900 leading-snug">
        {(data as any).description}
      </p>
    </div>
  );
});

// 2. User Reported Fact Node (Solid sage border)
export const FactNode = memo(({ data }: NodeProps) => {
  return (
    <div className="px-3.5 py-2.5 rounded-lg bg-sage-50/80 border-2 border-sage-500 shadow-xs max-w-xs text-left">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-sage-600" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-sage-600" />
      <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-sage-900 mb-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-700" />
          Reported Fact
        </span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sage-200/60 font-mono">user</span>
      </div>
      <p className="text-xs text-charcoal-800 leading-normal">
        {(data as any).text}
      </p>
    </div>
  );
});

// 3. Tentative AI Hypothesis Node (Dashed ochre border, editable / dismissible)
export const HypothesisNode = memo(({ data }: NodeProps) => {
  const hyp = data as unknown as Hypothesis & {
    onSelectHypothesis?: (hyp: Hypothesis) => void;
  };

  const isDismissed = hyp.status === 'dismissed';
  const isCorrected = hyp.status === 'corrected';

  return (
    <div
      onClick={() => hyp.onSelectHypothesis?.(hyp)}
      className={`px-3.5 py-2.5 rounded-lg border-2 border-dashed shadow-xs max-w-xs text-left transition-all cursor-pointer hover:shadow-md ${
        isDismissed
          ? 'bg-paper-100/50 border-paper-300 opacity-50 line-through'
          : isCorrected
          ? 'bg-ochre-50/90 border-ochre-500 ring-1 ring-ochre-300'
          : 'bg-ochre-50/60 border-ochre-400 hover:border-ochre-600'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-ochre-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-ochre-500" />
      <div className="flex items-center justify-between text-[10px] text-ochre-800 font-medium mb-1">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-ochre-700" />
          <span>Hypothesis (AI)</span>
        </span>
        <span className="capitalize text-[9px] px-1.5 py-0.5 rounded bg-ochre-100 text-ochre-800 font-mono">
          {hyp.status}
        </span>
      </div>

      <p className="text-xs italic text-charcoal-800 leading-normal">
        "{hyp.text}"
      </p>

      {hyp.user_note && (
        <div className="mt-1.5 pt-1 border-t border-ochre-200 text-[10px] text-ochre-900 not-italic">
          <strong>Note:</strong> {hyp.user_note}
        </div>
      )}

      <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-ochre-700/80 border-t border-ochre-100">
        <span className="text-[9px]">Click to inspect or change</span>
        <Edit2 className="w-3 h-3" />
      </div>
    </div>
  );
});

// 4. Unknown / Missing Context Node (Dotted soft-blue border)
export const UnknownNode = memo(({ data }: NodeProps) => {
  return (
    <div className="px-3.5 py-2.5 rounded-lg bg-softblue-50/70 border-2 border-dotted border-softblue-400 shadow-xs max-w-xs text-left">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-softblue-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-softblue-500" />
      <div className="flex items-center gap-1 text-[10px] font-semibold text-softblue-900 mb-1">
        <HelpCircle className="w-3 h-3 text-softblue-700" />
        <span>Unknown / Context Gap</span>
      </div>
      <p className="text-xs text-charcoal-800 leading-normal">
        {(data as any).text}
      </p>
    </div>
  );
});

// 5. Goal Node (Subtle mauve border)
export const GoalNode = memo(({ data }: NodeProps) => {
  return (
    <div className="px-3 py-2 rounded-lg bg-mauve-50/80 border border-mauve-400 shadow-xs max-w-xs text-left">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-mauve-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-mauve-500" />
      <div className="flex items-center gap-1 text-[10px] font-semibold text-mauve-900 mb-0.5">
        <Target className="w-3 h-3 text-mauve-700" />
        <span>Stated Goal</span>
      </div>
      <p className="text-xs text-charcoal-800">
        {(data as any).text}
      </p>
    </div>
  );
});

// 6. Response Option Node
export const ResponseOptionNode = memo(({ data }: NodeProps) => {
  const opt = data as unknown as PossibleResponse;
  return (
    <div className="px-4 py-3 rounded-xl bg-white border border-paper-300 shadow-sm max-w-xs text-left">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-charcoal-600" />
      <div className="flex items-center gap-1 text-[10px] font-bold text-charcoal-700 mb-1">
        <ArrowRightCircle className="w-3.5 h-3.5 text-sage-700" />
        <span>Possible Response</span>
      </div>
      <h5 className="text-xs font-semibold text-charcoal-900 leading-snug mb-1">
        {opt.action}
      </h5>
      <p className="text-[11px] text-charcoal-500 leading-normal">
        {opt.appropriate_when}
      </p>
    </div>
  );
});

export const nodeTypes = {
  encounter: EncounterNode,
  fact: FactNode,
  hypothesis: HypothesisNode,
  unknown: UnknownNode,
  goal: GoalNode,
  response: ResponseOptionNode,
};
