import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, formatApiError } from '../api/client';
import { SessionSummary } from '../types';
import { Logo } from '../components/common/Logo';
import {
  PlusCircle,
  Clock,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Trash2,
  AlertCircle,
  X,
  Search,
  RotateCcw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<{ status: string; database: string } | null>(null);

  // Search and status filter state (Prompt 7)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  // Deletion modal state
  const [sessionToDelete, setSessionToDelete] = useState<SessionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setErrorMessage(null);
    try {
      // 1. Health check
      try {
        const healthRes = await apiClient.get('/health');
        setApiHealth(healthRes.data);
      } catch {
        // non-blocking
      }

      // 2. Saved reflections
      const res = await apiClient.get<SessionSummary[]>('/reflections');
      setSessions(res.data);
    } catch (err: any) {
      setErrorMessage(formatApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/reflections/${sessionToDelete.id}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      setDeleteToast('Reflection deleted successfully.');
      setTimeout(() => setDeleteToast(null), 3500);
      setSessionToDelete(null);
    } catch (err: any) {
      alert(formatApiError(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered reflections by search query & status
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        s.initial_situation.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === 'completed').length,
    [sessions]
  );
  const inProgressCount = useMemo(
    () => sessions.filter((s) => s.status === 'in_progress').length,
    [sessions]
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-8">
      {/* Toast Notification */}
      {deleteToast && (
        <div className="p-3 rounded-lg bg-sage-50 border border-sage-200 text-sage-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sage-700" />
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            aria-label="Dismiss notification"
            className="text-sage-600 hover:text-sage-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="paper-card p-6 sm:p-8 bg-gradient-to-r from-paper-100 via-white to-sage-50/50 border border-paper-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-sage-700 bg-sage-100/70 px-2 py-0.5 rounded">
              Reflective Workspace
            </span>
            {apiHealth && (
              <span className="text-[10px] text-charcoal-400 font-mono">
                Engine: {apiHealth.status}
              </span>
            )}
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-900">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed max-w-xl">
            Take a breath before responding. Examine facts, surface tentative interpretations, and explore deliberate choices.
          </p>
        </div>

        <button
          onClick={() => navigate('/pause')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-paper-50 text-xs sm:text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-sage-300" />
          <span>Start a New Pause</span>
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-medium underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Saved Reflections Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-charcoal-500" />
            <h3 className="font-serif text-lg font-medium text-charcoal-900">
              Saved Reflections
            </h3>
            <span className="text-xs text-charcoal-500 font-medium">
              ({sessions.length})
            </span>
          </div>

          {/* Search Input & Status Filter Controls */}
          {sessions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title or situation..."
                  aria-label="Search saved reflections"
                  className="pl-8 pr-7 py-1.5 text-xs rounded-lg border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-sage-700 w-48 sm:w-56"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-2 text-charcoal-400 hover:text-charcoal-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center rounded-lg bg-paper-100 p-0.5 border border-paper-200 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    statusFilter === 'all'
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    statusFilter === 'completed'
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  Completed ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in_progress')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    statusFilter === 'in_progress'
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  In Progress ({inProgressCount})
                </button>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="paper-card p-12 text-center text-charcoal-500">
            <div className="w-6 h-6 border-2 border-sage-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading saved reflections...</p>
          </div>
        ) : sessions.length === 0 ? (
          /* Empty State (PRD §8.1) */
          <div className="paper-card p-10 text-center space-y-4 border-dashed border-paper-300">
            <div className="flex justify-center mx-auto">
              <Logo size={48} variant="badge" className="shadow-xs" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-base font-medium text-charcoal-800">
                No saved reflections yet
              </h4>
              <p className="text-xs text-charcoal-500 max-w-sm mx-auto leading-relaxed">
                Reflections are only saved when you explicitly choose to keep them. Start your first pause whenever you encounter a challenging moment.
              </p>
            </div>
            <button
              onClick={() => navigate('/pause')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-paper-100 hover:bg-paper-200 text-charcoal-800 text-xs font-medium border border-paper-200 transition-colors"
            >
              <span>Begin a new pause</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          /* Empty Search / Filter State (Prompt 7) */
          <div className="paper-card p-8 text-center space-y-3 border-dashed border-paper-300">
            <p className="text-xs text-charcoal-600 font-medium">
              No saved reflections match your search or filter.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-300 bg-white hover:bg-paper-100 text-xs text-charcoal-800 font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-sage-700" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="paper-card paper-card-interactive p-5 flex flex-col justify-between space-y-4 relative group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-charcoal-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] bg-paper-100 text-charcoal-600 font-mono">
                        {session.status.replace('_', ' ')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(session);
                        }}
                        className="text-charcoal-400 hover:text-red-600 p-1 rounded hover:bg-paper-200 transition-colors"
                        title="Delete reflection"
                        aria-label={`Delete reflection ${session.title || session.initial_situation.slice(0, 20)}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-serif text-base font-medium text-charcoal-900 line-clamp-1">
                    {session.title || 'Untitled reflection'}
                  </h4>
                  <p className="text-xs text-charcoal-600 line-clamp-2 mt-1 leading-relaxed">
                    "{session.initial_situation}"
                  </p>
                </div>

                <div className="pt-2 border-t border-paper-200 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/reflections/${session.id}`)}
                    className="text-xs font-medium text-sage-700 hover:text-sage-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Open reflection map</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Task 1 & Task 5) */}
      {sessionToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border border-paper-300 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3
                id="delete-dialog-title"
                className="font-serif text-lg font-medium text-charcoal-900"
              >
                Delete Reflection?
              </h3>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                Are you sure you want to delete "
                <span className="font-semibold text-charcoal-800">
                  {sessionToDelete.title || 'this reflection'}
                </span>
                "? This will permanently delete the structured map state. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg text-charcoal-600 hover:bg-paper-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
