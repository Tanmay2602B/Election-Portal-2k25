import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Vote, LogOut, User, Clock, AlertTriangle, Calendar, CreditCard, Star, Trophy, CheckCircle } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import UpcomingElection from './UpcomingElection';
import LiveClock from './LiveClock';

function StudentDashboard() {
  const { userProfile, logout, getVotingStatus, isVotingActive, checkVotingSchedule, getTotalPositions, getPositions } = useAuth();
  const navigate = useNavigate();
  const [totalPositions, setTotalPositions] = useState(0);
  const [positions, setPositions] = useState([]);
  const [votingCredits, setVotingCredits] = useState(0);
  const [usedCredits, setUsedCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [votingHistory, setVotingHistory] = useState([]);
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
      
      // Set mock stats (in a real app, this would come from the database)
      setStats({
        totalVotes: userProfile?.hasVoted ? totalPos : 0,
        participationRate: userProfile?.hasVoted ? 100 : 0,
        lastLogin: userProfile?.lastLoginTime || new Date()
      });
      
      // Set mock voting history (in a real app, this would come from the database)
      if (userProfile?.hasVoted) {
        setVotingHistory([
          {
            id: 1,
            date: userProfile?.voteTimestamp || new Date(),
            positions: positionsData.length,
            status: 'Completed'
          }
        ]);
      }
      
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

  const votingStatus = getVotingStatus();
  const canVote = isVotingActive() && !userProfile?.hasVoted;
  const remainingCredits = votingCredits - usedCredits;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <Vote className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Student Council Election</h1>
                <p className="text-sm text-gray-500">Voting Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <LiveClock className="bg-blue-100 px-4 py-2 rounded-lg" showIcon={true} showDate={false} />
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upcoming Election Section */}
        <div className="mb-8">
          <UpcomingElection isAdmin={false} />
        </div>

        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Welcome, {userProfile?.name}!</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-blue-800">Student ID</span>
              <p className="text-lg font-bold text-blue-900">{userProfile?.studentId || 'N/A'}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-green-800">Class</span>
              <p className="text-lg font-bold text-green-900">{userProfile?.class || 'N/A'}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-purple-800">Status</span>
              <p className="text-lg font-bold text-purple-900">
                {userProfile?.hasVoted ? 'Voted ✓' : 'Not Voted'}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-amber-800">Participation</span>
              <p className="text-lg font-bold text-amber-900">{stats.participationRate}%</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-blue-600">{votingCredits}</div>
            <div className="text-sm text-gray-600">Total Credits</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">{usedCredits}</div>
            <div className="text-sm text-gray-600">Used Credits</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-yellow-600">{remainingCredits}</div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.participationRate}%</div>
            <div className="text-sm text-gray-600">Participation</div>
          </div>
        </div>
        
        {/* Voting Credits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Credits Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center mb-4">
              <CreditCard className="h-8 w-8 mr-3" />
              <h3 className="text-xl font-bold">Voting Credits</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Total Credits:</span>
                <span className="text-2xl font-bold">{votingCredits}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Used Credits:</span>
                <span className="text-2xl font-bold text-red-300">{usedCredits}</span>
              </div>
              <div className="border-t border-blue-400 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-100">Remaining Credits:</span>
                  <span className="text-3xl font-bold text-yellow-300">{remainingCredits}</span>
                </div>
              </div>
            </div>
            
            {/* Credit Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round((usedCredits / votingCredits) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-400 rounded-full h-3">
                <div 
                  className="bg-yellow-300 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(usedCredits / votingCredits) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Positions Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <Trophy className="h-8 w-8 text-yellow-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-900">Election Positions</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600">Total Positions:</span>
                <span className="font-bold text-gray-900">{totalPositions}</span>
              </div>
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <Star className="h-4 w-4 inline mr-1" />
                Each position requires 1 voting credit
              </div>
              {positions.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Available Positions:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {positions.map((position, index) => (
                      <div key={position.id} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                        {index + 1}. {position.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voting Status with Countdown */}
        <div className={`rounded-xl p-6 mb-8 shadow-lg border ${
          votingStatus.status === 'active' ? 'bg-green-50 border-green-200' : 
          votingStatus.status === 'not_started' ? 'bg-yellow-50 border-yellow-200' :
          votingStatus.status === 'ended' ? 'bg-red-50 border-red-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center mb-3">
            {
              votingStatus.status === 'active' ? <Vote className="h-7 w-7 text-green-600 mr-3" /> :
              votingStatus.status === 'not_started' ? <Clock className="h-7 w-7 text-yellow-600 mr-3" /> :
              votingStatus.status === 'ended' ? <AlertTriangle className="h-7 w-7 text-red-600 mr-3" /> :
              <Calendar className="h-7 w-7 text-gray-600 mr-3" />
            }
            <h3 className={`text-xl font-bold ${
              votingStatus.status === 'active' ? 'text-green-900' : 
              votingStatus.status === 'not_started' ? 'text-yellow-900' :
              votingStatus.status === 'ended' ? 'text-red-900' :
              'text-gray-900'
            }`}>
              {
                votingStatus.status === 'active' ? 'Voting is Now Active!' : 
                votingStatus.status === 'not_started' ? 'Voting Has Not Started' :
                votingStatus.status === 'ended' ? 'Voting Has Ended' :
                'Voting Schedule Not Set'
              }
            </h3>
          </div>
          <p className={`text-lg ${
            votingStatus.status === 'active' ? 'text-green-800' : 
            votingStatus.status === 'not_started' ? 'text-yellow-800' :
            votingStatus.status === 'ended' ? 'text-red-800' :
            'text-gray-800'
          }`}>
            {votingStatus.message}
          </p>
        </div>

        {/* Countdown Timer */}
        {votingStatus.countdown && votingStatus.timeRemaining > 0 && (
          <CountdownTimer 
            targetTime={votingStatus.status === 'not_started' ? votingStatus.startTime : votingStatus.endTime}
            status={votingStatus.status}
            onTimeUp={() => {
              // Refresh the voting status when countdown ends
              initializeDashboard();
            }}
          />
        )}

        {/* Voting Instructions */}
        {canVote && remainingCredits > 0 && (
          <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Voting Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">1.</span>
                  You have {votingCredits} voting credits for {totalPositions} positions
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">2.</span>
                  Each position requires exactly 1 credit to vote
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">3.</span>
                  You must use ALL credits to complete voting
                </li>
              </ul>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">4.</span>
                  Review your selections carefully before submitting
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">5.</span>
                  Once submitted, you cannot change your votes
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">6.</span>
                  You will be automatically logged out after voting
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Voting Completed Message */}
        {userProfile?.hasVoted && (
          <div className="bg-green-50 rounded-xl p-6 mb-8 border border-green-200">
            <div className="flex items-center mb-3">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-xl font-bold text-green-900">Voting Completed!</h3>
            </div>
            <p className="text-green-800">
              Thank you for participating in the election! You have successfully used all {votingCredits} voting credits.
              Your votes have been securely recorded.
            </p>
          </div>
        )}

        {/* Start Voting Button */}
        <div className="text-center">
          <button
            onClick={handleStartVoting}
            disabled={!canVote || remainingCredits === 0 || totalPositions === 0}
            className={`inline-flex items-center px-12 py-4 font-bold text-lg rounded-xl transition-all duration-300 shadow-lg transform hover:scale-105 ${
              canVote && remainingCredits > 0 && totalPositions > 0
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl' 
                : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
            }`}
          >
            <Vote className="h-7 w-7 mr-3" />
            {canVote && remainingCredits > 0 ? `Start Voting (${remainingCredits} Credits)` : 
             userProfile?.hasVoted ? 'Voting Completed' :
             totalPositions === 0 ? 'No Positions Available' :
             'Voting Not Available'}
          </button>
        </div>

        {/* Voting History */}
        {votingHistory.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <Calendar className="h-6 w-6 text-indigo-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-900">Voting History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Positions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {votingHistory.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.positions} positions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Important Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center mb-3">
            <Clock className="h-6 w-6 text-yellow-600 mr-2" />
            <span className="font-bold text-yellow-800">Important Notice:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-yellow-700">
            <div>
              <p className="mb-2">
                🔒 <strong>Device Lock:</strong> This device can only be used once for voting.
              </p>
              <p>
                ⏰ <strong>Time Limit:</strong> You can only vote during the scheduled voting period.
              </p>
            </div>
            <div>
              <p className="mb-2">
                💳 <strong>Credit System:</strong> Use all {votingCredits} credits to complete your vote.
              </p>
              <p>
                🔐 <strong>Security:</strong> Your vote is encrypted and cannot be traced back to you.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;