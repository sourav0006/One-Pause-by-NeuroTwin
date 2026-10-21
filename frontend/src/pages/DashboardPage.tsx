import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { SessionSummary } from '../types';
import {
  PlusCircle,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<{ status: string; database: string } | null>(null);

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
      setErrorMessage(
        err.response?.data?.detail?.message ||
          err.response?.data?.detail ||
          'Failed to load saved reflections from server.'
      );
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
      alert(
        err.response?.data?.detail?.message ||
          'Failed to delete reflection session.'
      );
    } finally {
      setIsDeleting(false);
    }
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
          <button onClick={() => setDeleteToast(null)} className="text-sage-600 hover:text-sage-800">
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
            {apiHealth?.database === 'healthy' && (
              <span className="flex items-center gap-1 text-[11px] text-sage-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage-700" />
                System ready
              </span>
            )}
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-900">
            Welcome, {user?.email.split('@')[0]}
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl leading-relaxed">
            Take a breath before reacting. Examine the situation, separate facts from assumptions, and choose a deliberate step.
          </p>
        </div>

        <button
          onClick={() => navigate('/pause')}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-charcoal-900 text-paper-50 text-sm font-medium hover:bg-charcoal-800 transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4 text-sage-300" />
          <span>Start a pause</span>
        </button>
      </div>

      {/* Error state if API call failed */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-charcoal-500" />
            <h3 className="font-serif text-lg font-medium text-charcoal-900">
              Saved Reflections
            </h3>
          </div>
          <span className="text-xs text-charcoal-500">
            {sessions.length} {sessions.length === 1 ? 'reflection' : 'reflections'}
          </span>
        </div>

        {isLoading ? (
          <div className="paper-card p-12 text-center text-charcoal-500">
            <div className="w-6 h-6 border-2 border-sage-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading saved reflections...</p>
          </div>
        ) : sessions.length === 0 ? (
          /* Empty State (PRD §8.1) */
          <div className="paper-card p-10 text-center space-y-4 border-dashed border-paper-300">
            <div className="w-12 h-12 rounded-full bg-paper-100 border border-paper-200 text-charcoal-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5 text-sage-700" />
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session) => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-paper-300 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-medium text-charcoal-900">
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
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-2 text-xs text-charcoal-700 hover:bg-paper-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
