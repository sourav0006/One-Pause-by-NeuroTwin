import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { WelcomePage } from './pages/WelcomePage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { SituationEntryPage } from './pages/SituationEntryPage';
import { ReflectionViewPage } from './pages/ReflectionViewPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-paper-50 bg-paper-grid">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pause"
                element={
                  <ProtectedRoute>
                    <SituationEntryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reflect"
                element={
                  <ProtectedRoute>
                    <SituationEntryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reflections/:id"
                element={
                  <ProtectedRoute>
                    <ReflectionViewPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
