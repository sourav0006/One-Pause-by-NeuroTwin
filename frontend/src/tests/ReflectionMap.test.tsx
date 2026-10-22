import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
  it('renders legend and all node categories distinctly', () => {
    render(<ReflectionMap state={mockState} />);

    // Check legend items
    expect(screen.getByText('Map Legend')).toBeInTheDocument();
    expect(screen.getByText('Reported Fact (User)')).toBeInTheDocument();
    expect(screen.getByText('Tentative Hypothesis (AI)')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown / Missing Context').length).toBeGreaterThanOrEqual(1);

    // Check encounter description is present
    expect(screen.getByText('Manager assigned new urgent tasks')).toBeInTheDocument();

    // Check reported facts are rendered
    expect(screen.getByText('I have 3 active deliverables due Friday')).toBeInTheDocument();

    // Check hypothesis text is rendered
    expect(screen.getByText('"May be concerned about disappointing leadership"')).toBeInTheDocument();

    // Check unknown is rendered
    expect(screen.getByText('Whether the deadline can be extended')).toBeInTheDocument();

    // Check goal is rendered
    expect(screen.getByText('Protect health and deliver quality work')).toBeInTheDocument();

    // Check possible response is rendered
    expect(screen.getByText('Propose trade-off discussion')).toBeInTheDocument();
  });

  it('opens NodeInspector when a node is clicked', async () => {
    render(<ReflectionMap state={mockState} />);

    // Click on hypothesis node
    const hypNode = screen.getByText('"May be concerned about disappointing leadership"');
    fireEvent.click(hypNode);

    // Inspector should open with full text and action buttons
    expect(screen.getByLabelText('Node Details Inspector')).toBeInTheDocument();
    expect(screen.getByText('Tentative AI interpretation. Not a clinical diagnosis or confirmed motive. You may accept, correct, or dismiss it.')).toBeInTheDocument();
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('triggers hypothesis update when action button is clicked in inspector', async () => {
    const onUpdateHypothesis = vi.fn().mockResolvedValue(undefined);

    render(
      <ReflectionMap
        state={mockState}
        onUpdateHypothesis={onUpdateHypothesis}
      />
    );

    // Click hypothesis node
    fireEvent.click(screen.getByText('"May be concerned about disappointing leadership"'));

    // Click Accept button in inspector
    await act(async () => {
      fireEvent.click(screen.getByText('Accept'));
    });
    expect(onUpdateHypothesis).toHaveBeenCalledWith('hypothesis_1', 'active', undefined);
  });

  it('selects response option when clicked in inspector', () => {
    const onSelectOption = vi.fn();

    render(
      <ReflectionMap
        state={mockState}
        onSelectOption={onSelectOption}
      />
    );

    // Click response option node
    fireEvent.click(screen.getByText('Propose trade-off discussion'));

    // Verify option details appear in inspector
    expect(screen.getByText('Select this Option for Pause')).toBeInTheDocument();
    expect(screen.getByText('Sets clear expectations')).toBeInTheDocument();
    expect(screen.getByText('Manager may push back')).toBeInTheDocument();

    // Click select button
    fireEvent.click(screen.getByText('Select this Option for Pause'));
    expect(onSelectOption).toHaveBeenCalledWith('opt_1');
  });

  it('supports keyboard navigation via Enter key to open inspector', () => {
    render(<ReflectionMap state={mockState} />);

    const factNode = screen.getByLabelText(/Reported Fact: I have 3 active deliverables due Friday/i);
    fireEvent.keyDown(factNode, { key: 'Enter', code: 'Enter' });

    // Inspector should open for the fact node
    expect(screen.getByLabelText('Node Details Inspector')).toBeInTheDocument();
    expect(screen.getByText('Grounded Observation')).toBeInTheDocument();
  });

  it('closes inspector when close button is clicked', () => {
    render(<ReflectionMap state={mockState} />);

    // Open inspector
    fireEvent.click(screen.getByText('Protect health and deliver quality work'));
    expect(screen.getByLabelText('Node Details Inspector')).toBeInTheDocument();

    // Close inspector
    fireEvent.click(screen.getByLabelText('Close details inspector'));
    expect(screen.queryByLabelText('Node Details Inspector')).not.toBeInTheDocument();
  });
});
