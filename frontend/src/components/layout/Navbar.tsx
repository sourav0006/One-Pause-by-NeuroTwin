import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Compass } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b border-paper-200 bg-paper-50/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-sage-100 border border-sage-300 flex items-center justify-center text-sage-900 group-hover:bg-sage-200 transition-colors">
            <Compass className="w-4 h-4 text-sage-700" />
          </div>
          <div>
            <span className="font-serif text-xl font-medium tracking-tight text-charcoal-900">
              ONE PAUSE
            </span>
            <span className="hidden sm:inline-block ml-3 text-xs text-charcoal-500 font-sans italic border-l border-paper-300 pl-3">
              Before you respond, see.
            </span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 px-3 py-1.5 rounded-md hover:bg-paper-100 transition-colors"
              >
                Dashboard
              </Link>
              <div className="h-4 w-px bg-paper-300" />
              <div className="flex items-center gap-2 text-xs text-charcoal-600 bg-paper-100 px-2.5 py-1 rounded-full border border-paper-200">
                <UserIcon className="w-3.5 h-3.5 text-sage-700" />
                <span className="max-w-[120px] truncate">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal-900 p-1.5 rounded hover:bg-paper-200 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth?mode=login"
                className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 px-3 py-1.5 rounded-md hover:bg-paper-100 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/auth?mode=register"
                className="text-sm font-medium text-paper-50 bg-charcoal-800 hover:bg-charcoal-900 px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
