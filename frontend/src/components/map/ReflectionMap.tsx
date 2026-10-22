import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StructuredReflectionState, Hypothesis } from '../../types';
import { nodeTypes } from './CustomNodes';
import { computeReflectionLayout } from './layoutUtils';
import { NodeInspector, SelectedNodeInfo, ConnectedNodeInfo } from './NodeInspector';
import { Layers, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';

interface ReflectionMapProps {
  state: StructuredReflectionState;
  onUpdateHypothesis?: (
    hypId: string,
    status: 'active' | 'corrected' | 'dismissed',
    note?: string
  ) => Promise<void>;
  onSelectOption?: (optionId: string) => void;
  selectedOptionId?: string | null;
  onSelectHypothesis?: (hyp: Hypothesis) => void;
}

const ReflectionMapInner: React.FC<ReflectionMapProps> = ({
  state,
  onUpdateHypothesis,
  onSelectOption,
  selectedOptionId,
  onSelectHypothesis,
}) => {
  const reactFlow = useReactFlow();

  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect user's motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } catch {
      // Fallback gracefully if not supported
    }
  }, []);

  const handleSelectNode = useCallback(
    (nodeInfo: SelectedNodeInfo) => {
      setSelectedNode(nodeInfo);
      // If hypothesis and legacy callback provided, notify it
      if (nodeInfo.type === 'hypothesis' && onSelectHypothesis) {
        onSelectHypothesis(nodeInfo.data as Hypothesis);
      }
    },
    [onSelectHypothesis]
  );

  // Handle ESC key to dismiss selected node inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          (typeof target.closest === 'function' &&
            Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))));
      if (isTyping) return;

      if (e.key === 'Escape' && selectedNode) {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  // Compute deterministic layout
  const { nodes, edges } = useMemo(() => {
    const layout = computeReflectionLayout(
      state,
      selectedNode?.id || null,
      handleSelectNode
    );

    // Disable edge animation if user prefers reduced motion
    if (prefersReducedMotion) {
      layout.edges.forEach((e) => {
        e.animated = false;
      });
    }

    return layout;
  }, [state, selectedNode?.id, handleSelectNode, prefersReducedMotion]);

  // Compute connected nodes for the active selection
  const connectedNodes = useMemo<ConnectedNodeInfo[]>(() => {
    if (!selectedNode) return [];

    const results: ConnectedNodeInfo[] = [];

    // Map of ID to node label/type
    const nodeLookup = new Map<string, { label: string; type: string }>();
    nodeLookup.set('encounter_node', {
      label: state.encounter.description.slice(0, 45) + '...',
      type: 'encounter',
    });
    state.reported_facts.forEach((f) => {
      nodeLookup.set(f.id, { label: f.text.slice(0, 45) + '...', type: 'fact' });
    });
    state.hypotheses.forEach((h) => {
      nodeLookup.set(h.id, { label: h.text.slice(0, 45) + '...', type: 'hypothesis' });
    });
    state.unknowns.forEach((u) => {
      nodeLookup.set(u.id, { label: u.text.slice(0, 45) + '...', type: 'unknown' });
    });
    state.goals.forEach((g) => {
      nodeLookup.set(g.id, { label: g.text.slice(0, 45) + '...', type: 'goal' });
    });
    state.possible_responses.forEach((r) => {
      nodeLookup.set(r.id, { label: r.action.slice(0, 45) + '...', type: 'response' });
    });

    edges.forEach((edge) => {
      if (edge.source === selectedNode.id && nodeLookup.has(edge.target)) {
        const target = nodeLookup.get(edge.target)!;
        results.push({
          id: edge.target,
          type: target.type,
          label: target.label,
          direction: 'informs',
          relationship: typeof edge.label === 'string' ? edge.label : undefined,
        });
      } else if (edge.target === selectedNode.id && nodeLookup.has(edge.source)) {
        const source = nodeLookup.get(edge.source)!;
        results.push({
          id: edge.source,
          type: source.type,
          label: source.label,
          direction: 'informed_by',
          relationship: typeof edge.label === 'string' ? edge.label : undefined,
        });
      }
    });

    return results;
  }, [selectedNode, edges, state]);

  // Navigate to connected node
  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (targetNode) {
        setSelectedNode({
          id: targetNode.id,
          type: targetNode.type || 'unknown',
          data: targetNode.data,
        });
        reactFlow.setCenter(targetNode.position.x + 130, targetNode.position.y + 60, {
          duration: prefersReducedMotion ? 0 : 500,
          zoom: 1,
        });
      }
    },
    [nodes, reactFlow, prefersReducedMotion]
  );

  return (
    <div className="w-full flex flex-col md:flex-row gap-4 relative">
      {/* Canvas Area */}
      <div className="flex-1 min-h-[500px] sm:min-h-[580px] h-[55vh] sm:h-[65vh] rounded-2xl border border-paper-200 bg-paper-50 relative overflow-hidden shadow-inner focus-within:ring-1 focus-within:ring-sage-600">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, duration: prefersReducedMotion ? 0 : 400 }}
          minZoom={0.2}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          aria-label="Interactive reflection knowledge graph"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#C2C8CF" />
          <Controls
            className="!bg-white !border-paper-300 !rounded-xl !shadow-sm text-charcoal-700"
            showInteractive={false}
            aria-label="Map zoom and navigation controls"
          />
        </ReactFlow>

        {/* Collapsible Visual Legend */}
        <div className="absolute top-3 left-3 z-10 max-w-[240px]">
          <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-paper-300 shadow-sm text-xs transition-all overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              aria-label={showLegend ? 'Collapse map legend' : 'Expand map legend'}
              className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-charcoal-700 hover:bg-paper-50 transition-colors"
            >
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-charcoal-500">
                <Layers className="w-3.5 h-3.5 text-sage-700" />
                Map Legend
              </span>
              {showLegend ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showLegend && (
              <div className="px-3 pb-3 space-y-1.5 pt-0.5 border-t border-paper-100">
                <div className="flex items-center gap-2 text-charcoal-700">
                  <span className="w-3 h-3 rounded border-2 border-sage-500 bg-sage-50 shrink-0" />
                  <span>Reported Fact (User)</span>
                </div>
                <div className="flex items-center gap-2 text-charcoal-700">
                  <span className="w-3 h-3 rounded border-2 border-dashed border-ochre-400 bg-ochre-50 shrink-0" />
                  <span>Tentative Hypothesis (AI)</span>
                </div>
                <div className="flex items-center gap-2 text-charcoal-700">
                  <span className="w-3 h-3 rounded border-2 border-dotted border-softblue-500 bg-softblue-50 shrink-0" />
                  <span>Unknown / Missing Context</span>
                </div>
                <div className="flex items-center gap-2 text-charcoal-700">
                  <span className="w-3 h-3 rounded border border-mauve-500 bg-mauve-50 shrink-0" />
                  <span>Stated Goal</span>
                </div>
                <div className="flex items-center gap-2 text-charcoal-700">
                  <span className="w-3 h-3 rounded border border-paper-400 bg-white shrink-0" />
                  <span>Possible Response</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Presenter Quick Fit Controls Overlay */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => reactFlow.fitView({ padding: 0.15, duration: prefersReducedMotion ? 0 : 400 })}
            className="px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-xs border border-paper-300 shadow-xs text-[11px] font-medium text-charcoal-700 hover:text-charcoal-900 hover:bg-paper-50 transition-colors flex items-center gap-1.5"
            title="Reset view to fit all reflection nodes"
            aria-label="Fit map to view"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sage-700" />
            <span className="hidden sm:inline">Fit Map</span>
          </button>
        </div>

        {/* Floating helper hint */}
        <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-paper-200 text-[11px] text-charcoal-500 pointer-events-none">
          <span>Click any node to inspect details</span>
        </div>
      </div>

      {/* Docked Inspector Sidebar (Desktop) or Overlay Drawer (Mobile) */}
      {selectedNode && (
        <div className="shrink-0">
          <NodeInspector
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdateHypothesis={onUpdateHypothesis}
            onSelectOption={onSelectOption}
            selectedOptionId={selectedOptionId}
            connectedNodes={connectedNodes}
            onNavigateToNode={handleNavigateToNode}
          />
        </div>
      )}
    </div>
  );
};

export const ReflectionMap: React.FC<ReflectionMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ReflectionMapInner {...props} />
    </ReactFlowProvider>
  );
};
