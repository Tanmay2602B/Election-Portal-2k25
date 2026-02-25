import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import UpcomingElection from './UpcomingElection';

// New Modular Components
import StudentHeader from './student/StudentHeader';
import StudentWelcome from './student/StudentWelcome';
import StudentVotingStatus from './student/StudentVotingStatus';

function StudentDashboard() {
  const { userProfile, logout, getVotingStatus, isVotingActive, checkVotingSchedule, getTotalPositions, getPositions } = useAuth();
  const navigate = useNavigate();
  const [totalPositions, setTotalPositions] = useState(0);
  const [positions, setPositions] = useState([]);
  const [votingCredits, setVotingCredits] = useState(0);
  const [usedCredits, setUsedCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVotes: 0,
    participationRate: 0,
    lastLogin: null
  });

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      // Refresh voting schedule
      await checkVotingSchedule();

      // Get total positions for credit calculation
      const totalPos = await getTotalPositions();
      const positionsData = await getPositions();

      setTotalPositions(totalPos);
      setPositions(positionsData);
      setVotingCredits(totalPos); // Each position = 1 credit
      setUsedCredits(userProfile?.hasVoted ? totalPos : 0); // If voted, all credits used

      // Set mock stats
      setStats({
        totalVotes: userProfile?.hasVoted ? totalPos : 0,
        participationRate: userProfile?.hasVoted ? 100 : 0,
        lastLogin: userProfile?.lastLoginTime || new Date()
      });

    } catch (error) {
      console.error('Error initializing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVoting = () => {
    const votingStatus = getVotingStatus();
    if (votingStatus.status === 'active' && votingCredits > 0) {
      navigate('/vote');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const votingStatus = getVotingStatus();
  const canVote = isVotingActive() && !userProfile?.hasVoted;
  const remainingCredits = votingCredits - usedCredits;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] pb-10">
      <StudentHeader userProfile={userProfile} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">

        {/* Upcoming Election Component (Wrapped for style if needed, but it seems handled) */}
        <div>
          <UpcomingElection isAdmin={false} />
        </div>

        {/* Welcome & Stats */}
        <StudentWelcome
          userProfile={userProfile}
          stats={stats}
          votingCredits={votingCredits}
          usedCredits={usedCredits}
        />

        {/* Voting Status & Action */}
        <StudentVotingStatus
          votingStatus={votingStatus}
          initializeDashboard={initializeDashboard}
          canVote={canVote}
          remainingCredits={remainingCredits}
          userProfile={userProfile}
          totalPositions={totalPositions}
          votingCredits={votingCredits}
          handleStartVoting={handleStartVoting}
        />

      </main>
    </div>
  );
}

export default StudentDashboard;