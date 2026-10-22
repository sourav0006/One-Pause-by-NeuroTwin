import { memo, KeyboardEvent } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  FileText,
  HelpCircle,
  Sparkles,
  Target,
  ArrowRightCircle,
  CheckCircle2,
  Edit3,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Hypothesis, PossibleResponse } from '../../types';

interface NodeCommonData {
  id: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

const handleKeyDown = (e: KeyboardEvent, onSelect?: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onSelect?.();
  }
};

// 1. Encounter / Situation Node (Anchor at Top)
export const EncounterNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as NodeCommonData & { description: string };
  const isSelected = !!nodeData.isSelected;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={nodeData.onSelect}
      onKeyDown={(e) => handleKeyDown(e, nodeData.onSelect)}
      aria-label={`Encounter node: ${nodeData.description}. Click or press Enter to inspect.`}
      className={`px-4 py-3 rounded-xl bg-white border-2 border-charcoal-700 shadow-sm max-w-xs text-left cursor-pointer transition-all duration-150 focus:outline-none ${
        isSelected
          ? 'ring-2 ring-charcoal-900 ring-offset-2 ring-offset-paper-50 shadow-md scale-[1.02]'
          : 'hover:border-charcoal-900 hover:shadow-md'
      }`}
    >
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-charcoal-700" />
      <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-charcoal-600 mb-1">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-charcoal-800" />
          <span>Situation Encounter</span>
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-paper-100 text-charcoal-600">
          anchor
        </span>
      </div>
      <p className="text-xs font-serif font-medium text-charcoal-900 leading-snug">
        {nodeData.description}
      </p>
      <div className="mt-2 pt-1 border-t border-paper-200 text-[10px] text-charcoal-400 flex items-center justify-between">
        <span>Click to inspect full situation</span>
      </div>
    </div>
  );
});

// 2. User Reported Fact Node (Solid sage border, grounded)
export const FactNode = memo(({ data }: NodeProps) => {
  const fact = data as unknown as NodeCommonData & { text: string; source: 'user' };
  const isSelected = !!fact.isSelected;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={fact.onSelect}
      onKeyDown={(e) => handleKeyDown(e, fact.onSelect)}
      aria-label={`Reported Fact: ${fact.text}. Click or press Enter to inspect.`}
      className={`px-3.5 py-2.5 rounded-lg bg-sage-50/90 border-2 border-sage-500 shadow-xs max-w-xs text-left cursor-pointer transition-all duration-150 focus:outline-none ${
        isSelected
          ? 'ring-2 ring-sage-800 ring-offset-2 ring-offset-paper-50 shadow-md scale-[1.02] border-sage-700'
          : 'hover:border-sage-700 hover:shadow-sm'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-sage-600" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-sage-600" />
      <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-sage-900 mb-1">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-sage-700" />
          <span>Reported Fact</span>
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sage-200/80 text-sage-900 font-mono font-bold uppercase tracking-wider">
          user
        </span>
      </div>
      <p className="text-xs text-charcoal-900 leading-normal font-sans">
        {fact.text}
      </p>
      <div className="mt-2 pt-1 border-t border-sage-200/70 text-[10px] text-sage-800/80 flex items-center justify-between">
        <span>Grounded observation</span>
      </div>
    </div>
  );
});

// 3. Tentative AI Hypothesis Node (Dashed ochre border, editable / dismissible)
export const HypothesisNode = memo(({ data }: NodeProps) => {
  const hyp = data as unknown as NodeCommonData & Hypothesis;
  const isSelected = !!hyp.isSelected;

  const isDismissed = hyp.status === 'dismissed';
  const isCorrected = hyp.status === 'corrected';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={hyp.onSelect}
      onKeyDown={(e) => handleKeyDown(e, hyp.onSelect)}
      aria-label={`Tentative Hypothesis: ${hyp.text}. Status: ${hyp.status}. Click or press Enter to inspect or revise.`}
      className={`px-3.5 py-2.5 rounded-lg border-2 border-dashed shadow-xs max-w-xs text-left cursor-pointer transition-all duration-150 focus:outline-none ${
        isSelected
          ? 'ring-2 ring-ochre-800 ring-offset-2 ring-offset-paper-50 shadow-md scale-[1.02]'
          : 'hover:shadow-md'
      } ${
        isDismissed
          ? 'bg-paper-100/60 border-paper-300 opacity-60 line-through'
          : isCorrected
          ? 'bg-ochre-50/95 border-ochre-500 ring-1 ring-ochre-300'
          : 'bg-ochre-50/80 border-ochre-400 hover:border-ochre-600'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-ochre-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-ochre-500" />
      <div className="flex items-center justify-between text-[10px] text-ochre-900 font-medium mb-1">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] text-ochre-800">
          <Sparkles className="w-3.5 h-3.5 text-ochre-700" />
          <span>Hypothesis (AI)</span>
        </span>
        <span className="capitalize text-[9px] px-1.5 py-0.5 rounded bg-ochre-200/70 text-ochre-900 font-mono font-semibold">
          {hyp.status}
        </span>
      </div>

      <p className="text-xs italic text-charcoal-900 leading-normal font-serif">
        "{hyp.text}"
      </p>

      {hyp.user_note && (
        <div className="mt-1.5 pt-1 border-t border-ochre-200 text-[10px] text-ochre-900 not-italic bg-ochre-100/50 p-1 rounded">
          <strong>Your Note:</strong> {hyp.user_note}
        </div>
      )}

      <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-ochre-800 border-t border-ochre-200/60">
        <span className="text-[9px] font-medium">Click to inspect or change</span>
        <Edit3 className="w-3 h-3 text-ochre-700" />
      </div>
    </div>
  );
});

// 4. Unknown / Missing Context Node (Dotted soft-blue border)
export const UnknownNode = memo(({ data }: NodeProps) => {
  const unk = data as unknown as NodeCommonData & { text: string };
  const isSelected = !!unk.isSelected;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={unk.onSelect}
      onKeyDown={(e) => handleKeyDown(e, unk.onSelect)}
      aria-label={`Unknown Context Gap: ${unk.text}. Click or press Enter to inspect.`}
      className={`px-3.5 py-2.5 rounded-lg bg-softblue-50/80 border-2 border-dotted border-softblue-400 shadow-xs max-w-xs text-left cursor-pointer transition-all duration-150 focus:outline-none ${
        isSelected
          ? 'ring-2 ring-softblue-800 ring-offset-2 ring-offset-paper-50 shadow-md scale-[1.02] border-softblue-600'
          : 'hover:border-softblue-600 hover:shadow-sm'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-softblue-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-softblue-500" />
      <div className="flex items-center justify-between text-[10px] font-semibold text-softblue-900 mb-1">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-softblue-700" />
          <span>Unknown / Missing Context</span>
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-softblue-200/70 text-softblue-900 font-mono">
          open
        </span>
      </div>
      <p className="text-xs text-charcoal-900 leading-normal font-sans">
        {unk.text}
      </p>
      <div className="mt-2 pt-1 border-t border-softblue-200/70 text-[10px] text-softblue-800/80 flex items-center justify-between">
        <span>Preserved uncertainty</span>
      </div>
    </div>
  );
});

// 5. Goal Node (Subtle mauve border)
export const GoalNode = memo(({ data }: NodeProps) => {
  const goal = data as unknown as NodeCommonData & { text: string; source?: string };
  const isSelected = !!goal.isSelected;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goal.onSelect}
      onKeyDown={(e) => handleKeyDown(e, goal.onSelect)}
      aria-label={`Goal: ${goal.text}. Click or press Enter to inspect.`}
      className={`px-3 py-2 rounded-lg bg-mauve-50/80 border-2 border-mauve-400 shadow-xs max-w-xs text-left cursor-pointer transition-all duration-150 focus:outline-none ${
        isSelected
          ? 'ring-2 ring-mauve-800 ring-offset-2 ring-offset-paper-50 shadow-md scale-[1.02] border-mauve-600'
          : 'hover:border-mauve-600 hover:shadow-sm'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-mauve-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-mauve-500" />
      <div className="flex items-center justify-between text-[10px] font-semibold text-mauve-900 mb-0.5">
        <span className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-mauve-700" />
          <span>Stated Goal</span>
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-mauve-200/70 text-mauve-900 font-mono">
          {goal.source || 'user'}
        </span>
      </div>
      <p className="text-xs font-medium text-charcoal-900">
        {goal.text}
      </p>
    </div>
  );
});

// 6. Response Option Node
export const ResponseOptionNode = memo(({ data }: NodeProps) => {
  const opt = data as unknown as NodeCommonData & PossibleResponse;
  const isSelected = !!opt.isSelected;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={opt.onSelect}
      onKeyDown={(e) => handleKeyDown(e, opt.onSelect)}
      aria-label={`Response option: ${opt.action}. Click or press Enter to inspect trade-offs.`}
      className={`px-4 py-3 rounded-xl bg-white border-2 shadow-sm max-w-xs text-left cursor-pointer transition-all duration-150 focus:outline-none ${
        isSelected
          ? 'ring-2 ring-sage-800 ring-offset-2 ring-offset-paper-50 shadow-md scale-[1.02] border-sage-600'
          : 'border-paper-300 hover:border-paper-500 hover:shadow-md'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-charcoal-600" />
      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-charcoal-700 mb-1">
        <span className="flex items-center gap-1.5">
          <ArrowRightCircle className="w-3.5 h-3.5 text-sage-700" />
          <span>Possible Response</span>
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-paper-100 text-charcoal-600">
          choice
        </span>
      </div>
      <h5 className="text-xs font-semibold text-charcoal-900 leading-snug mb-1 font-serif">
        {opt.action}
      </h5>

      {/* Trade-off summary chips (Not color alone: icons + text labels) */}
      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-paper-200 text-[10px]">
        <span className="flex items-center gap-0.5 text-sage-800 font-medium">
          <Check className="w-3 h-3 text-sage-600" />
          {opt.benefits?.length || 0} benefits
        </span>
        <span>•</span>
        <span className="flex items-center gap-0.5 text-ochre-800 font-medium">
          <ShieldAlert className="w-3 h-3 text-ochre-600" />
          {opt.risks?.length || 0} trade-offs
        </span>
      </div>
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
