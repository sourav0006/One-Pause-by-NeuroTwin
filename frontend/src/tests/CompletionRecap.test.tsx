import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CompletionRecap } from '../components/reflection/CompletionRecap';
import { ReflectionSession } from '../types';

const mockSession: ReflectionSession = {
  id: 'session-123',
  initial_situation: 'My manager has given me another task, but I am already overloaded.',
  status: 'completed',
  is_saved: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  state: {
    encounter: { description: 'Manager assigned another task while user is overloaded' },
    reported_facts: [
      { id: 'fact_1', text: 'User is overloaded with existing deadlines', source: 'user' },
    ],
    hypotheses: [
      {
        id: 'hypothesis_1',
        text: 'Concerned about professional reputation',
        source: 'ai',
        status: 'active',
        confidence: 'tentative',
      },
    ],
    unknowns: [
      { id: 'unknown_1', text: 'Manager willingness to adjust deadlines' },
    ],
    goals: [],
    possible_responses: [
      {
        id: 'option_1',
        action: 'Discuss schedule transparently and agree on trade-offs',
        benefits: ['Preserves quality', 'Sets clear expectations'],
        risks: ['Initial discomfort'],
        appropriate_when: 'Manager appreciates proactive communication',
      },
    ],
    connections: [],
  },
};

describe('CompletionRecap Component', () => {
  it('renders situation, facts, hypotheses, and open completion message when no option is chosen', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <CompletionRecap
          session={mockSession}
          selectedOptionId={null}
          onSave={onSave}
          isSaved={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Pause Summary & Deliberate Path')).toBeInTheDocument();
    expect(screen.getByText(/My manager has given me another task/i)).toBeInTheDocument();
    expect(screen.getByText('User is overloaded with existing deadlines')).toBeInTheDocument();
    expect(screen.getByText('"Concerned about professional reputation"')).toBeInTheDocument();
    expect(screen.getByText('Manager willingness to adjust deadlines')).toBeInTheDocument();
    expect(screen.getByText(/Open Completion:/i)).toBeInTheDocument();
  });

  it('renders selected option details when user selected an option', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <CompletionRecap
          session={mockSession}
          selectedOptionId="option_1"
          onSave={onSave}
          isSaved={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Selected Deliberate Choice')).toBeInTheDocument();
    expect(
      screen.getByText('Discuss schedule transparently and agree on trade-offs')
    ).toBeInTheDocument();
    expect(screen.getByText('Preserves quality')).toBeInTheDocument();
    expect(screen.getByText('Initial discomfort')).toBeInTheDocument();
  });

  it('triggers onSave when save button is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <CompletionRecap
          session={mockSession}
          selectedOptionId="option_1"
          onSave={onSave}
          isSaved={false}
        />
      </BrowserRouter>
    );

    await fireEvent.click(screen.getByText('Save to History'));
    expect(onSave).toHaveBeenCalled();
  });
});
