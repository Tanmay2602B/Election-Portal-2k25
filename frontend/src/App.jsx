import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import VotingPage from './components/VotingPage';
import ErrorBoundary from './components/ErrorBoundary';

// Helper — works with both the JWT payload shape { role } and the DB shape { role }
const isAdmin = (profile) => profile?.role === 'admin';

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin(userProfile)) {
    return <Navigate to="/student" replace />;
  }

  return children;
}

function AppRoutes() {
  const { currentUser, userProfile } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          currentUser
            ? <Navigate to={isAdmin(userProfile) ? "/admin" : "/student"} replace />
            : <LoginPage />
        }
      />

      {/* Protected Admin Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Student Route */}
      <Route
        path="/student"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vote"
        element={
          <ProtectedRoute>
            <VotingPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={
          currentUser
            ? <Navigate to={isAdmin(userProfile) ? "/admin" : "/student"} replace />
            : <Navigate to="/" replace />
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
