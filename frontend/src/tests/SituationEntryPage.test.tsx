import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SituationEntryPage } from '../pages/SituationEntryPage';
import { apiClient } from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
      get: vi.fn(),
    },
  };
});

describe('SituationEntryPage Component', () => {
  it('renders situation entry form with character counters and guidelines', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Describe the Situation')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/My manager assigned an urgent project/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Privacy & AI Disclosure:/i)).toBeInTheDocument();
  });

  it('renders clear error message when AI provider fails with 503 or error details', async () => {
    (apiClient.post as any).mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          detail: {
            code: 'AI_PROVIDER_NOT_CONFIGURED',
            message: 'AI provider is not configured. Please configure GEMINI_API_KEY.',
          },
        },
      },
    });

    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const textarea = screen.getByPlaceholderText(/My manager assigned an urgent project/i);
    fireEvent.change(textarea, {
      target: { value: 'My colleague criticized my architecture proposal publicly in front of team.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Generate Reflection Map/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('AI provider is not configured. Please configure GEMINI_API_KEY.')
      ).toBeInTheDocument();
    });
  });

  it('populates realistic workplace scenario and optional context when Fill Demo Scenario clicked', () => {
    render(
      <BrowserRouter>
        <SituationEntryPage />
      </BrowserRouter>
    );

    const demoBtn = screen.getByRole('button', { name: /Fill Demo Scenario: Workload & Priorities/i });
    fireEvent.click(demoBtn);

    const textarea = screen.getByDisplayValue(/My manager asked me to take on an urgent project/i);
    expect(textarea).toBeInTheDocument();

    const contextArea = screen.getByDisplayValue(/Maintaining a reputation for reliable delivery without burnout/i);
    expect(contextArea).toBeInTheDocument();
  });
});
