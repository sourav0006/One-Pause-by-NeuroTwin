import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HypothesisModal } from '../components/reflection/HypothesisModal';
import { Hypothesis } from '../types';

const mockHypothesis: Hypothesis = {
  id: 'hypothesis_1',
  text: 'May be worried about losing trust',
  source: 'ai',
  status: 'active',
  confidence: 'tentative',
};

describe('HypothesisModal', () => {
  it('renders hypothesis details and action buttons', () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <HypothesisModal
        hypothesis={mockHypothesis}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );

    expect(screen.getByText('Inspect or Revise Hypothesis')).toBeInTheDocument();
    expect(screen.getByText('"May be worried about losing trust"')).toBeInTheDocument();
    expect(screen.getByText('Accept Plausible')).toBeInTheDocument();
    expect(screen.getByText('Correct Note')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('triggers onUpdate with dismissed when Dismiss clicked', async () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <HypothesisModal
        hypothesis={mockHypothesis}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Dismiss'));
    });

    expect(onUpdate).toHaveBeenCalledWith('hypothesis_1', 'dismissed', undefined);
    expect(onClose).toHaveBeenCalled();
  });
});
