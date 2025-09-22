import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import VotingPage from './components/VotingPage';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userProfile } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  if (adminOnly && (!userProfile || !userProfile.isAdmin)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { currentUser, userProfile } = useAuth();
  
  if (!currentUser) {
    return <LoginPage />;
  }
  
  if (userProfile?.isAdmin) {
    return (
      <Routes>
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }
  
  if (userProfile?.hasVoted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Vote Submitted Successfully!</h2>
          <p className="text-gray-600">Thank you for participating in the election.</p>
          <p className="text-sm text-gray-500 mt-2">You have been automatically logged out.</p>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/student" element={
        <ProtectedRoute>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/vote" element={
        <ProtectedRoute>
          <VotingPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
