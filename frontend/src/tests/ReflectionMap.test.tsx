import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReflectionMap } from '../components/map/ReflectionMap';
import { StructuredReflectionState } from '../types';

const mockState: StructuredReflectionState = {
  encounter: { description: 'Manager assigned new urgent tasks' },
  reported_facts: [
    { id: 'fact_1', text: 'I have 3 active deliverables due Friday', source: 'user' },
    { id: 'fact_2', text: 'My calendar has back-to-back reviews', source: 'user' },
  ],
  hypotheses: [
    {
      id: 'hypothesis_1',
      text: 'May be concerned about disappointing leadership',
      source: 'ai',
      status: 'active',
      confidence: 'tentative',
    },
  ],
  unknowns: [
    { id: 'unknown_1', text: 'Whether the deadline can be extended' },
  ],
  goals: [
    { id: 'goal_1', text: 'Protect health and deliver quality work', source: 'user' },
  ],
  follow_up_question: {
    text: 'What would happen if you asked to reprioritize?',
    purpose: 'Clarify manager flexibility',
  },
  possible_responses: [
    {
      id: 'opt_1',
      action: 'Propose trade-off discussion',
      benefits: ['Sets clear expectations'],
      risks: ['Manager may push back'],
      appropriate_when: 'High workload conflicts',
    },
  ],
  connections: [
    { source: 'fact_1', target: 'hypothesis_1', label: 'triggers' },
  ],
};

describe('ReflectionMap Component', () => {
  it('renders legend and node categories', () => {
    render(<ReflectionMap state={mockState} />);

    // Check legend items
    expect(screen.getByText('Map Legend')).toBeInTheDocument();
    expect(screen.getByText('Reported Fact (User)')).toBeInTheDocument();
    expect(screen.getByText('Tentative Hypothesis (AI)')).toBeInTheDocument();
    expect(screen.getByText('Unknown / Missing Context')).toBeInTheDocument();

    // Check encounter description is present
    expect(screen.getByText('Manager assigned new urgent tasks')).toBeInTheDocument();

    // Check reported facts are rendered
    expect(screen.getByText('I have 3 active deliverables due Friday')).toBeInTheDocument();

    // Check hypothesis text is rendered
    expect(screen.getByText('"May be concerned about disappointing leadership"')).toBeInTheDocument();

    // Check unknown is rendered
    expect(screen.getByText('Whether the deadline can be extended')).toBeInTheDocument();
  });
});
