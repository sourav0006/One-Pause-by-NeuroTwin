import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { apiClient } from '../api/client';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Dispute in Architecture Review',
      initial_situation: 'Peer publicly questioned the DB migration plan',
      status: 'completed',
      is_saved: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

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
    expect(screen.getByText('Begin a new pause')).toBeInTheDocument();
  });

  it('renders list of saved reflections and opens delete confirmation', async () => {
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
      expect(screen.getByText('Dispute in Architecture Review')).toBeInTheDocument();
    });

    // Click delete icon button on first item
    const deleteBtns = screen.getAllByTitle('Delete reflection');
    fireEvent.click(deleteBtns[0]);

    // Confirmation modal should appear
    expect(screen.getByText('Delete Reflection?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete permanently/i })).toBeInTheDocument();

    // Cancel deletion
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Delete Reflection?')).not.toBeInTheDocument();
  });

  it('filters reflections by search query and resets filters', async () => {
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
      expect(screen.getByText('Dispute in Architecture Review')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search title or situation/i);

    // Type query matching second reflection by situation keyword "migration"
    fireEvent.change(searchInput, { target: { value: 'migration' } });
    expect(screen.queryByText('Overload with Manager Task')).not.toBeInTheDocument();
    expect(screen.getByText('Dispute in Architecture Review')).toBeInTheDocument();

    // Type query matching nothing
    fireEvent.change(searchInput, { target: { value: 'nonexistent keyword 12345' } });
    expect(screen.getByText('No saved reflections match your search or filter.')).toBeInTheDocument();

    // Click Reset Filters
    const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
    fireEvent.click(resetBtn);

    // Both should reappear
    expect(screen.getByText('Overload with Manager Task')).toBeInTheDocument();
    expect(screen.getByText('Dispute in Architecture Review')).toBeInTheDocument();
  });

  it('filters reflections by status tab', async () => {
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

    // Filter by completed
    const completedTab = screen.getByRole('button', { name: /Completed \(1\)/i });
    fireEvent.click(completedTab);

    expect(screen.queryByText('Overload with Manager Task')).not.toBeInTheDocument();
    expect(screen.getByText('Dispute in Architecture Review')).toBeInTheDocument();

    // Filter by in progress
    const inProgressTab = screen.getByRole('button', { name: /In Progress \(1\)/i });
    fireEvent.click(inProgressTab);

    expect(screen.getByText('Overload with Manager Task')).toBeInTheDocument();
    expect(screen.queryByText('Dispute in Architecture Review')).not.toBeInTheDocument();
  });
});
