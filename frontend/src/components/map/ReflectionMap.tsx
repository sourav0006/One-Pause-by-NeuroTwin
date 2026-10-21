import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StructuredReflectionState, Hypothesis } from '../../types';
import { nodeTypes } from './CustomNodes';

interface ReflectionMapProps {
  state: StructuredReflectionState;
  onSelectHypothesis?: (hyp: Hypothesis) => void;
}

export const ReflectionMap: React.FC<ReflectionMapProps> = ({
  state,
  onSelectHypothesis,
}) => {
  // Convert StructuredReflectionState into React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // 1. Encounter Node (Top)
    flowNodes.push({
      id: 'encounter_node',
      type: 'encounter',
      position: { x: 340, y: 30 },
      data: {
        description: state.encounter.description,
      },
    });

    // 2. Reported Facts (Left / Mid-upper tier)
    state.reported_facts.forEach((fact, idx) => {
      const xPos = 60 + idx * 280;
      flowNodes.push({
        id: fact.id,
        type: 'fact',
        position: { x: xPos, y: 160 },
        data: {
          id: fact.id,
          text: fact.text,
          source: fact.source,
        },
      });

      // Default link from encounter to facts if not explicitly connected
      flowEdges.push({
        id: `e-encounter-${fact.id}`,
        source: 'encounter_node',
        target: fact.id,
        type: 'smoothstep',
        style: { stroke: '#959EA7', strokeWidth: 1.5 },
      });
    });

    // 3. Hypotheses (Mid-tier, distinctive dashed styling)
    state.hypotheses.forEach((hyp, idx) => {
      const xPos = 80 + idx * 300;
      flowNodes.push({
        id: hyp.id,
        type: 'hypothesis',
        position: { x: xPos, y: 320 },
        data: {
          ...hyp,
          onSelectHypothesis,
        },
      });
    });

    // 4. Unknowns (Parallel mid-tier)
    state.unknowns.forEach((unk, idx) => {
      const xPos = 500 + idx * 280;
      flowNodes.push({
        id: unk.id,
        type: 'unknown',
        position: { x: xPos, y: 320 },
        data: {
          id: unk.id,
          text: unk.text,
        },
      });
    });

    // 5. Goals
    state.goals.forEach((goal, idx) => {
      flowNodes.push({
        id: goal.id,
        type: 'goal',
        position: { x: 100 + idx * 260, y: 480 },
        data: {
          id: goal.id,
          text: goal.text,
        },
      });
    });

    // 6. Possible Responses (Bottom tier)
    state.possible_responses.forEach((resp, idx) => {
      const xPos = 80 + idx * 290;
      flowNodes.push({
        id: resp.id,
        type: 'response',
        position: { x: xPos, y: 580 },
        data: {
          ...resp,
        },
      });
    });

    // Connections from state
    if (state.connections && state.connections.length > 0) {
      state.connections.forEach((conn, idx) => {
        // Ensure both source and target exist in nodes
        const hasSource = flowNodes.some((n) => n.id === conn.source);
        const hasTarget = flowNodes.some((n) => n.id === conn.target);

        if (hasSource && hasTarget) {
          flowEdges.push({
            id: `edge-${conn.source}-${conn.target}-${idx}`,
            source: conn.source,
            target: conn.target,
            label: conn.label || undefined,
            type: 'smoothstep',
            animated: conn.source.startsWith('hypothesis'),
            style: {
              stroke: conn.source.startsWith('hypothesis') ? '#C48D3F' : '#648572',
              strokeWidth: 1.8,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: conn.source.startsWith('hypothesis') ? '#C48D3F' : '#648572',
            },
          });
        }
      });
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [state, onSelectHypothesis]);

  return (
    <div className="w-full h-[620px] rounded-2xl border border-paper-200 bg-paper-50 relative overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#C2C8CF" />
        <Controls className="!bg-white !border-paper-300 !rounded-lg !shadow-sm text-charcoal-700" />
      </ReactFlow>

      {/* Visual Legend (PRD §7 FR-05 & §8.2) */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-paper-200 shadow-xs text-xs space-y-1.5 z-10 pointer-events-none">
        <div className="text-[10px] font-semibold text-charcoal-500 uppercase tracking-wider">
          Map Legend
        </div>
        <div className="flex items-center gap-2 text-charcoal-700">
          <span className="w-3.5 h-3.5 rounded border-2 border-sage-500 bg-sage-50" />
          <span>Reported Fact (User)</span>
        </div>
        <div className="flex items-center gap-2 text-charcoal-700">
          <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-ochre-400 bg-ochre-50" />
          <span>Tentative Hypothesis (AI)</span>
        </div>
        <div className="flex items-center gap-2 text-charcoal-700">
          <span className="w-3.5 h-3.5 rounded border-2 border-dotted border-softblue-400 bg-softblue-50" />
          <span>Unknown / Missing Context</span>
        </div>
      </div>
    </div>
  );
};
