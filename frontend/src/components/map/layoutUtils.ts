import { Node, Edge, MarkerType } from '@xyflow/react';
import { StructuredReflectionState } from '../../types';

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
  totalWidth: number;
  totalHeight: number;
}

export function computeReflectionLayout(
  state: StructuredReflectionState,
  selectedNodeId: string | null,
  onSelectNode: (nodeInfo: { id: string; type: string; data: any }) => void
): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const factCount = state.reported_facts?.length || 0;
  const hypCount = state.hypotheses?.length || 0;
  const unkCount = state.unknowns?.length || 0;
  const goalCount = state.goals?.length || 0;
  const respCount = state.possible_responses?.length || 0;

  // Sizing constants
  const FACT_WIDTH = 270;
  const HYP_WIDTH = 290;
  const UNK_WIDTH = 270;
  const GOAL_WIDTH = 260;
  const RESP_WIDTH = 300;
  const GAP_X = 24;

  // Compute tier widths
  const tier1Width = Math.max(0, factCount * FACT_WIDTH + (factCount - 1) * GAP_X);
  const tier2HypWidth = Math.max(0, hypCount * HYP_WIDTH + (hypCount - 1) * GAP_X);
  const tier2UnkWidth = Math.max(0, unkCount * UNK_WIDTH + (unkCount - 1) * GAP_X);
  const tier2Width = tier2HypWidth + 60 + tier2UnkWidth;
  const tier3Width = Math.max(0, goalCount * GOAL_WIDTH + (goalCount - 1) * GAP_X);
  const tier4Width = Math.max(0, respCount * RESP_WIDTH + (respCount - 1) * GAP_X);

  const canvasWidth = Math.max(940, tier1Width + 120, tier2Width + 120, tier4Width + 120);
  const centerX = canvasWidth / 2;

  // Tier 0: Encounter / Situation
  const encounterId = 'encounter_node';
  nodes.push({
    id: encounterId,
    type: 'encounter',
    position: { x: centerX - 160, y: 35 },
    data: {
      id: encounterId,
      description: state.encounter.description,
      isSelected: selectedNodeId === encounterId,
      onSelect: () =>
        onSelectNode({
          id: encounterId,
          type: 'encounter',
          data: state.encounter,
        }),
    },
  });

  // Tier 1: Reported Facts
  const tier1StartX = centerX - tier1Width / 2;
  state.reported_facts.forEach((fact, idx) => {
    const xPos = tier1StartX + idx * (FACT_WIDTH + GAP_X);
    nodes.push({
      id: fact.id,
      type: 'fact',
      position: { x: xPos, y: 175 },
      data: {
        ...fact,
        isSelected: selectedNodeId === fact.id,
        onSelect: () =>
          onSelectNode({
            id: fact.id,
            type: 'fact',
            data: fact,
          }),
      },
    });
  });

  // Tier 2: Hypotheses (Left of Center) & Unknowns (Right of Center)
  // Hypotheses
  const hypStartX = centerX - 30 - tier2HypWidth;
  state.hypotheses.forEach((hyp, idx) => {
    const xPos = hypStartX + idx * (HYP_WIDTH + GAP_X);
    nodes.push({
      id: hyp.id,
      type: 'hypothesis',
      position: { x: xPos, y: 335 },
      data: {
        ...hyp,
        isSelected: selectedNodeId === hyp.id,
        onSelect: () =>
          onSelectNode({
            id: hyp.id,
            type: 'hypothesis',
            data: hyp,
          }),
      },
    });
  });

  // Unknowns
  const unkStartX = centerX + 30;
  state.unknowns.forEach((unk, idx) => {
    const xPos = unkStartX + idx * (UNK_WIDTH + GAP_X);
    nodes.push({
      id: unk.id,
      type: 'unknown',
      position: { x: xPos, y: 335 },
      data: {
        ...unk,
        isSelected: selectedNodeId === unk.id,
        onSelect: () =>
          onSelectNode({
            id: unk.id,
            type: 'unknown',
            data: unk,
          }),
      },
    });
  });

  // Tier 3: Goals
  let currentY = 495;
  if (goalCount > 0) {
    const tier3StartX = centerX - tier3Width / 2;
    state.goals.forEach((goal, idx) => {
      const xPos = tier3StartX + idx * (GOAL_WIDTH + GAP_X);
      nodes.push({
        id: goal.id,
        type: 'goal',
        position: { x: xPos, y: currentY },
        data: {
          ...goal,
          isSelected: selectedNodeId === goal.id,
          onSelect: () =>
            onSelectNode({
              id: goal.id,
              type: 'goal',
              data: goal,
            }),
        },
      });
    });
    currentY += 120;
  }

  // Tier 4: Possible Responses
  if (respCount > 0) {
    const tier4StartX = centerX - tier4Width / 2;
    state.possible_responses.forEach((resp, idx) => {
      const xPos = tier4StartX + idx * (RESP_WIDTH + GAP_X);
      nodes.push({
        id: resp.id,
        type: 'response',
        position: { x: xPos, y: currentY },
        data: {
          ...resp,
          isSelected: selectedNodeId === resp.id,
          onSelect: () =>
            onSelectNode({
              id: resp.id,
              type: 'response',
              data: resp,
            }),
        },
      });
    });
    currentY += 160;
  }

  // --- Edge Generation ---
  const validNodeIds = new Set(nodes.map((n) => n.id));
  const connectedTargets = new Set<string>();

  // 1. Explicit connections from state
  if (state.connections && state.connections.length > 0) {
    state.connections.forEach((conn, idx) => {
      if (validNodeIds.has(conn.source) && validNodeIds.has(conn.target)) {
        connectedTargets.add(conn.target);
        const isHypothesisSource = conn.source.startsWith('hypothesis');
        const isUnknownSource = conn.source.startsWith('unknown');

        let strokeColor = '#648572'; // Sage default for facts
        if (isHypothesisSource) strokeColor = '#C48D3F'; // Ochre
        if (isUnknownSource) strokeColor = '#5F88A2'; // Soft-blue

        edges.push({
          id: `edge-${conn.source}-${conn.target}-${idx}`,
          source: conn.source,
          target: conn.target,
          label: conn.label || undefined,
          type: 'smoothstep',
          animated: isHypothesisSource,
          style: {
            stroke: strokeColor,
            strokeWidth: selectedNodeId === conn.source || selectedNodeId === conn.target ? 2.5 : 1.8,
            strokeDasharray: isUnknownSource ? '4,4' : undefined,
          },
          labelStyle: {
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            fill: strokeColor,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: '#FFFFFF',
            fillOpacity: 0.95,
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: strokeColor,
          },
        });
      }
    });
  }

  // 2. Default structural grounding edges to keep the graph coherent
  // Connect encounter to first facts
  state.reported_facts.forEach((fact) => {
    if (!connectedTargets.has(fact.id)) {
      edges.push({
        id: `struct-encounter-${fact.id}`,
        source: encounterId,
        target: fact.id,
        type: 'smoothstep',
        style: { stroke: '#959EA7', strokeWidth: 1.5 },
      });
      connectedTargets.add(fact.id);
    }
  });

  // Connect facts to hypotheses if not explicitly linked
  if (state.reported_facts.length > 0) {
    const firstFactId = state.reported_facts[0].id;
    state.hypotheses.forEach((hyp) => {
      if (!connectedTargets.has(hyp.id)) {
        edges.push({
          id: `struct-fact-${hyp.id}`,
          source: firstFactId,
          target: hyp.id,
          label: 'prompts',
          type: 'smoothstep',
          style: { stroke: '#C48D3F', strokeWidth: 1.5, strokeDasharray: '4,4' },
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#C48D3F' },
        });
        connectedTargets.add(hyp.id);
      }
    });
  }

  return {
    nodes,
    edges,
    totalWidth: canvasWidth,
    totalHeight: currentY + 40,
  };
}
