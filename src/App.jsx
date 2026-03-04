import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import VotingPage from './components/VotingPage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && (!userProfile || !userProfile.isAdmin)) {
    return <Navigate to="/login" replace />;
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
            ? <Navigate to={userProfile?.isAdmin ? "/admin" : "/student"} replace />
            : <LoginPage />
        }
      />

      {/* Protected Admin Routes - Must be logged in AND be admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Student Routes - Must be logged in AND be student */}
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

      {/* Default redirects */}
      <Route
        path="*"
        element={
          currentUser
            ? <Navigate to={userProfile?.isAdmin ? "/admin" : "/student"} replace />
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
