import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReflectionViewPage } from '../pages/ReflectionViewPage';
import { apiClient } from '../api/client';
import { ReflectionSession } from '../types';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockSession: ReflectionSession = {
  id: '33333333-3333-3333-3333-333333333333',
  initial_situation: 'My manager assigned an urgent project with tight deadline.',
  status: 'in_progress',
  is_saved: false,
  selected_response_id: undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  state: {
    encounter: { description: 'Examining urgent project assignment' },
    reported_facts: [
      { id: 'fact_1', text: 'Deliverables due by Friday at 5pm', source: 'user' },
    ],
    hypotheses: [
      {
        id: 'hypothesis_1',
        text: 'Feeling pressure to preserve rapport at the expense of capacity',
        source: 'ai',
        status: 'active',
        confidence: 'tentative',
      },
    ],
    unknowns: [
      { id: 'unknown_1', text: 'Can another teammate assist?' },
    ],
    goals: [
      { id: 'goal_1', text: 'Deliver quality work sustainably', source: 'user' },
    ],
    possible_responses: [
      {
        id: 'opt_1',
        action: 'Acknowledge request and negotiate milestone order',
        benefits: ['Protects commitments'],
        risks: ['Requires negotiating'],
        appropriate_when: 'High workload',
      },
    ],
    connections: [],
  },
};

describe('Presenter Navigation and Keyboard Ergonomics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to dashboard on Alt+D shortcut when not typing', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: mockSession });

    render(
      <MemoryRouter initialEntries={['/reflections/33333333-3333-3333-3333-333333333333']}>
        <Routes>
          <Route path="/reflections/:id" element={<ReflectionViewPage />} />
          <Route path="/dashboard" element={<div>Dashboard Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Examining urgent project assignment')).toBeInTheDocument();
    });

    // Press Alt+D while not focusing an input
    fireEvent.keyDown(window, { key: 'd', altKey: true });

    await waitFor(() => {
      expect(screen.getByText('Dashboard Landing Page')).toBeInTheDocument();
    });
  });

  it('does NOT trigger Alt+D navigation when user is typing in an input or textarea', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: mockSession });

    render(
      <MemoryRouter initialEntries={['/reflections/33333333-3333-3333-3333-333333333333']}>
        <Routes>
          <Route path="/reflections/:id" element={<ReflectionViewPage />} />
          <Route path="/dashboard" element={<div>Dashboard Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Examining urgent project assignment')).toBeInTheDocument();
    });

    // Focus on the clarify textarea if present, or simulate keydown originating from textarea
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    fireEvent.keyDown(textarea, { key: 'd', altKey: true });

    // Should NOT have navigated
    expect(screen.queryByText('Dashboard Landing Page')).not.toBeInTheDocument();
    document.body.removeChild(textarea);
  });

  it('supports completing a reflection without selecting an option', async () => {
    const completedSession: ReflectionSession = {
      ...mockSession,
      status: 'completed',
      selected_response_id: undefined,
    };

    (apiClient.get as any).mockResolvedValueOnce({ data: mockSession });
    (apiClient.post as any).mockResolvedValueOnce({ data: completedSession });

    render(
      <MemoryRouter initialEntries={['/reflections/33333333-3333-3333-3333-333333333333']}>
        <Routes>
          <Route path="/reflections/:id" element={<ReflectionViewPage />} />
          <Route path="/dashboard" element={<div>Dashboard Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Complete Reflection without Choosing/i })
      ).toBeInTheDocument();
    });

    // Click Complete without selecting
    const completeBtn = screen.getByRole('button', {
      name: /Complete Reflection without Choosing/i,
    });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/reflections/33333333-3333-3333-3333-333333333333/complete',
        { selected_option_id: undefined }
      );
      // Summary recap should be rendered with Open Completion
      expect(screen.getByText(/Pause Summary & Deliberate Path/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Completion:/i)).toBeInTheDocument();
    });
  });
});
