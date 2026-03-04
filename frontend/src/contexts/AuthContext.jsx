import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingSchedule, setVotingSchedule] = useState(null);

  useEffect(() => {
    checkAuth();
    refreshVotingSchedule();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/user');
      setCurrentUser({ token });
      setUserProfile(res.data);
    } catch (error) {
      console.error('Auth verification failed', error);
      localStorage.removeItem('token');
      setCurrentUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (studentId, password) => {
    const res = await api.post('/auth/login', { studentId, password });
    localStorage.setItem('token', res.data.token);
    setCurrentUser({ token: res.data.token });
    setUserProfile(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setUserProfile(null);
    window.location.href = '/';
  };

  const refreshVotingSchedule = async () => {
    try {
      const res = await api.get('/settings/votingSchedule');
      setVotingSchedule(res.data);
      return res.data;
    } catch {
      setVotingSchedule(null);
      return null;
    }
  };

  const checkVotingSchedule = refreshVotingSchedule;

  const isVotingActive = () => {
    return votingSchedule?.isActive || false;
  };

  const getVotingStatus = () => {
    if (!votingSchedule) return { status: 'not_scheduled', message: 'Loading...' };

    const now = new Date();
    // If date string, convert. MongoDB stores ISO strings usually or Date objects if Mongoose
    const start = new Date(votingSchedule.votingStart);
    const end = new Date(votingSchedule.votingEnd);

    if (votingSchedule.isActive) {
      return {
        status: 'active',
        message: 'Voting is currently active!',
        countdown: true,
        endTime: votingSchedule.votingEnd,
        timeRemaining: end.getTime() - now.getTime()
      };
    } else if (now < start) {
      return {
        status: 'not_started',
        message: 'Voting has not started yet.',
        countdown: true,
        startTime: votingSchedule.votingStart,
        timeRemaining: start.getTime() - now.getTime()
      };
    } else if (now > end) {
      return {
        status: 'ended',
        message: 'Voting duration has ended.',
        countdown: false
      };
    }

    return { status: 'not_scheduled', message: 'Voting unavailable' };
  };

  const submitVote = async (votes) => {
    await api.post('/votes', votes);
    // update local profile
    setUserProfile(prev => ({ ...prev, hasVoted: true }));
  };

  const getTotalPositions = async () => {
    const res = await api.get('/positions');
    return res.data.length;
  };

  const getPositions = async () => {
    const res = await api.get('/positions');
    return res.data;
  };

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    refreshVotingSchedule,
    checkVotingSchedule,
    votingSchedule,
    isVotingActive,
    getVotingStatus,
    submitVote,
    getTotalPositions,
    getPositions
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};