import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { apiClient } from '../api/client';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when user has no saved reflections', async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/health') return Promise.resolve({ data: { status: 'ok', database: 'healthy' } });
      if (url === '/reflections') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No saved reflections yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Start a pause')).toBeInTheDocument();
  });

  it('renders list of saved reflections and opens delete confirmation', async () => {
    const mockReflections = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Overload with Manager Task',
        initial_situation: 'My manager assigned urgent task but I am at capacity',
        status: 'in_progress',
        is_saved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/health') return Promise.resolve({ data: { status: 'ok', database: 'healthy' } });
      if (url === '/reflections') return Promise.resolve({ data: mockReflections });
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Overload with Manager Task')).toBeInTheDocument();
    });

    // Click delete icon button
    const deleteBtn = screen.getByTitle('Delete reflection');
    fireEvent.click(deleteBtn);

    // Confirmation modal should appear
    expect(screen.getByText('Delete Reflection?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete Permanently')).toBeInTheDocument();

    // Cancel deletion
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Delete Reflection?')).not.toBeInTheDocument();
  });
});
