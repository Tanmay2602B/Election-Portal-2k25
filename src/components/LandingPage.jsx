import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Vote, Calendar, Clock, Trophy, Users, LogIn, Shield, TrendingUp, Award, CheckCircle, Activity, BarChart3, ChevronRight
} from 'lucide-react';
import { getLastElectionWinners, getUpcomingElections } from '../utils/electionUtils';
import CountdownTimer from './CountdownTimer';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

// Mock data for modern landing page analytics
const mockStats = {
  totalVotes: 1452,
  turnoutPercentage: 78.5,
  programs: [
    { name: 'Computer Science', turnout: 85 },
    { name: 'Electrical Eng.', turnout: 72 },
    { name: 'Mechanical Eng.', turnout: 68 },
    { name: 'Business Admin', turnout: 81 }
  ],
  recentVotes: [
    { program: 'Computer Science', time: 'Just now' },
    { program: 'Business Admin', time: '2 mins ago' },
    { program: 'Electrical Eng.', time: '5 mins ago' },
    { program: 'Computer Science', time: '12 mins ago' },
    { program: 'Mechanical Eng.', time: '15 mins ago' }
  ]
};

function LandingPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [winners, setWinners] = useState([]);
  const [upcomingElection, setUpcomingElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingStatus, setVotingStatus] = useState(null);
  const [liveVotes, setLiveVotes] = useState(mockStats.totalVotes);

  useEffect(() => {
    loadData();

    // Simulate live vote incrementing
    const interval = setInterval(() => {
      setLiveVotes(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [winnersData, electionData] = await Promise.all([
        getLastElectionWinners().catch(() => []),
        getUpcomingElections().catch(() => null)
      ]);

      setWinners(winnersData || []);
      setUpcomingElection(electionData);

      if (electionData) {
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
            setVotingStatus({ status: 'not_started', message: 'Voting will begin soon', startTime: start, endTime: end });
          } else if (now >= start && now <= end) {
            setVotingStatus({ status: 'active', message: 'Voting is active', startTime: start, endTime: end });
          } else {
            setVotingStatus({ status: 'ended', message: 'Election Closed', startTime: start, endTime: end });
          }
        }
      } else {
        setVotingStatus(null);
      }
    } catch (error) {
      console.error('Data load error:', error);
      setWinners([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner message="Loading Secure Portal..." />
      </div>
    );
  }

  const isClosed = votingStatus?.status === 'ended';

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-indigo-500/30">
      {/* Navigation Bar */}
      <nav className="border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Vote className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Election Portal</h1>
                <p className="text-xs text-indigo-300 font-medium">Institutional Voting System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <button
                  onClick={() => navigate(userProfile?.isAdmin ? '/admin' : '/student')}
                  className="glass-button px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2"
                >
                  Dashboard <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] -z-10 animate-pulse-glow" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-slide-up">
          {votingStatus?.status && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
              <span className={`w-2 h-2 rounded-full ${isClosed ? 'bg-red-500' : 'bg-green-500 animate-ping-slow'}`} />
              <span className="text-sm font-medium text-gray-300">
                {isClosed ? 'Election Closed' : votingStatus.message}
              </span>
            </div>
          )}

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            Shape the Future with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Secure Voting
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
            Next-generation institutional election platform ensuring transparency, anonymity, and cryptographic security for every single vote cast.
          </p>

          <div className="flex justify-center gap-4">
            {currentUser && userProfile?.hasVoted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-xl text-emerald-400 font-medium flex items-center gap-3">
                <CheckCircle className="w-5 h-5" /> You have already completed your vote.
              </div>
            ) : isClosed ? (
              <div className="bg-red-500/10 border border-red-500/20 px-8 py-4 rounded-xl text-red-400 font-medium flex items-center gap-3">
                <Shield className="w-5 h-5" /> Election has been closed.
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-2"
              >
                Cast Your Vote Now <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Analytics & Activity Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Turnout & Total Votes */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="text-indigo-400" />
                <h3 className="text-2xl font-bold">Election Analytics</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={64} />
                  </div>
                  <p className="text-gray-400 font-medium mb-2">Live Voter Turnout</p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                      {mockStats.turnoutPercentage}%
                    </h4>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-4 mt-auto">
                    <div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full" style={{ width: `${mockStats.turnoutPercentage}%` }}></div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={64} />
                  </div>
                  <p className="text-gray-400 font-medium mb-2">Total Votes Cast</p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-5xl font-bold text-white">
                      {liveVotes.toLocaleString()}
                    </h4>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 mt-auto">
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">Verified</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/20">Encrypted</span>
                  </div>
                </div>
              </div>

              {/* Program Analytics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {mockStats.programs.map((prog, i) => (
                  <div key={i} className="glass-card p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-white mb-1">{prog.turnout}%</div>
                    <div className="text-xs text-gray-400 font-medium truncate" title={prog.name}>{prog.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Board */}
            <div className="glass-card rounded-2xl flex flex-col h-full border-t border-white/10">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-indigo-400" size={20} />
                  <h3 className="font-bold">Recent Votes Cast</h3>
                </div>
                <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-slow"></span> Live
                </span>
              </div>
              <div className="p-6 flex-1 overflow-hidden flex flex-col justify-center space-y-4">
                {mockStats.recentVotes.map((vote, i) => (
                  <div key={i} className="flex items-center justify-between animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Vote size={14} className="text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Anonymized Voter</p>
                        <p className="text-xs text-gray-500">{vote.program}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{vote.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results or Timer Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(!isClosed && votingStatus) ? (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-center text-2xl font-bold mb-8 text-white">Election Timeline</h3>
              <CountdownTimer
                targetTime={votingStatus.status === 'not_started' ? votingStatus.startTime : votingStatus.endTime}
                status={votingStatus.status}
              />
            </div>
          ) : (isClosed && winners.length > 0) ? (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Official Election Results</h2>
                <p className="text-gray-400">The voting period has concluded. Here are the elected representatives.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {winners.map((result, index) => (
                  <div key={result.position.id} className="glass-card rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform">
                    <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-lg text-white">{result.position.name}</h3>
                        {index === 0 && <Award className="text-yellow-400 w-6 h-6" />}
                      </div>
                      {result.winner && (
                        <div>
                          <p className="text-2xl font-bold text-white mb-1">{result.winner.candidate.name}</p>
                          <p className="text-sm text-indigo-300 mb-6">{result.winner.candidate.class}</p>

                          <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Votes Received</span>
                              <span className="font-bold text-white">{result.winner.votes}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Vote Share</span>
                              <span className="font-bold text-emerald-400">{result.winner.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isClosed && winners.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-2xl max-w-3xl mx-auto">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Results Pending Publication</h3>
              <p className="text-gray-400">The election is closed, but the official results have not been finalized yet.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0f172a] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Vote className="w-6 h-6 text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Secure Institutional Election System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

