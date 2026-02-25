import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Vote, 
  Calendar, 
  Clock, 
  Trophy, 
  Users, 
  LogIn,
  Shield,
  TrendingUp,
  Award,
  CheckCircle
} from 'lucide-react';
import { getLastElectionWinners, getUpcomingElections } from '../utils/electionUtils';
import CountdownTimer from './CountdownTimer';
import LoadingSpinner from './LoadingSpinner';

function LandingPage() {
  const navigate = useNavigate();
  const [winners, setWinners] = useState([]);
  const [upcomingElection, setUpcomingElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingStatus, setVotingStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [winnersData, electionData] = await Promise.all([
        getLastElectionWinners().catch(err => {
          console.error('Error loading winners:', err);
          return [];
        }),
        getUpcomingElections().catch(err => {
          console.error('Error loading elections:', err);
          return null;
        })
      ]);
      
      setWinners(winnersData || []);
      setUpcomingElection(electionData);
      
      // Calculate voting status
      if (electionData) {
        try {
          const now = new Date();
          const start = electionData.votingStart 
            ? (electionData.votingStart.seconds 
                ? new Date(electionData.votingStart.seconds * 1000)
                : new Date(electionData.votingStart))
            : null;
          const end = electionData.votingEnd 
            ? (electionData.votingEnd.seconds 
                ? new Date(electionData.votingEnd.seconds * 1000)
                : new Date(electionData.votingEnd))
            : null;

          if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
            if (now < start) {
              setVotingStatus({
                status: 'not_started',
                message: 'Voting will begin soon',
                startTime: start,
                endTime: end
              });
            } else if (now >= start && now <= end) {
              setVotingStatus({
                status: 'active',
                message: 'Voting is now active',
                startTime: start,
                endTime: end
              });
            } else {
              setVotingStatus({
                status: 'ended',
                message: 'Voting has ended',
                startTime: start,
                endTime: end
              });
            }
          }
        } catch (dateError) {
          console.error('Error processing dates:', dateError);
        }
      }
    } catch (error) {
      console.error('Error loading landing page data:', error);
      // Set empty state to prevent crash
      setWinners([]);
      setUpcomingElection(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Not set';
    try {
      const date = timestamp.seconds 
        ? new Date(timestamp.seconds * 1000) 
        : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Vote className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Election Portal
                </h1>
                <p className="text-xs text-gray-500">Student Council Elections</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full shadow-lg">
                <Vote className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
              Welcome to the{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Election Portal
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Your voice matters. Participate in transparent, secure, and democratic student council elections.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
              >
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Elections Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {upcomingElection ? (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 sm:px-8 py-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-white" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Upcoming Election
                  </h2>
                </div>
              </div>
              
              <div className="p-6 sm:p-8">
                {votingStatus && (
                  <div className="mb-6">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                      votingStatus.status === 'active' 
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : votingStatus.status === 'not_started'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {votingStatus.status === 'active' && <CheckCircle className="h-5 w-5 mr-2" />}
                      {votingStatus.status === 'not_started' && <Clock className="h-5 w-5 mr-2" />}
                      <span className="font-semibold">{votingStatus.message}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center mb-3">
                      <Clock className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-semibold text-blue-900">Voting Starts</span>
                    </div>
                    <p className="text-blue-800 text-sm sm:text-base">
                      {formatDateTime(upcomingElection.votingStart)}
                    </p>
                  </div>
                  
                  <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                    <div className="flex items-center mb-3">
                      <Clock className="h-5 w-5 text-red-600 mr-2" />
                      <span className="font-semibold text-red-900">Voting Ends</span>
                    </div>
                    <p className="text-red-800 text-sm sm:text-base">
                      {formatDateTime(upcomingElection.votingEnd)}
                    </p>
                  </div>
                </div>

                {/* Countdown Timer */}
                {votingStatus && votingStatus.status !== 'ended' && (
                  <div className="mt-6">
                    <CountdownTimer
                      targetTime={
                        votingStatus.status === 'not_started' 
                          ? votingStatus.startTime 
                          : votingStatus.endTime
                      }
                      status={votingStatus.status}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 sm:px-8 py-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-white" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Upcoming Election
                  </h2>
                </div>
              </div>
              
              <div className="p-6 sm:p-8 text-center">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Election Scheduled
                </h3>
                <p className="text-gray-500">
                  Check back later for upcoming election announcements.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Last Election Winners Section */}
      <section className="py-12 sm:py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-full">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Last Election Winners
            </h2>
            <p className="text-gray-600 text-lg">
              Celebrating our elected representatives
            </p>
          </div>

          {winners.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Previous Winners
              </h3>
              <p className="text-gray-500">
                Results will be displayed here after the first election.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {winners.map((result, index) => (
                <div
                  key={result.position.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        {result.position.name}
                      </h3>
                      {index === 0 && (
                        <Award className="h-5 w-5 text-yellow-300" />
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {result.winner && (
                      <>
                        <div className="flex items-center mb-4">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-full mr-4">
                            <Trophy className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-900">
                              {result.winner.candidate.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {result.winner.candidate.class || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Votes Received
                            </span>
                            <span className="font-semibold text-gray-900">
                              {result.winner.votes}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              Vote Percentage
                            </span>
                            <span className="font-semibold text-blue-600">
                              {result.winner.percentage}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Total Votes
                            </span>
                            <span className="font-semibold text-gray-700">
                              {result.totalVotes}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Why Choose Our Platform?
            </h2>
            <p className="text-gray-600 text-lg">
              Secure, transparent, and user-friendly election system
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="bg-blue-100 p-3 rounded-lg w-fit mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Voting</h3>
              <p className="text-gray-600">
                Advanced security measures ensure your vote is protected and counted accurately.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transparent Results</h3>
              <p className="text-gray-600">
                Real-time results and complete transparency in the election process.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Access</h3>
              <p className="text-gray-600">
                Simple and intuitive interface accessible on any device, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Vote className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">Election Portal</h3>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Student Council Election Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

