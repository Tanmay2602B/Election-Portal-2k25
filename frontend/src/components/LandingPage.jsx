import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Vote, Users, LogIn, Shield, TrendingUp,
  CheckCircle, BarChart3, ChevronRight, Lock,
  Eye, EyeOff, Key, FileCheck, Server, Fingerprint, AlertTriangle,
  Megaphone, Calendar, Clock, Zap, CheckCircle2
} from 'lucide-react';
import { getUpcomingElections } from '../utils/electionUtils';
import CountdownTimer from './CountdownTimer';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { AnnouncementCard } from './admin/AdminAnnouncements';

function LandingPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [votingStatus, setVotingStatus] = useState(null);
  const [liveStats, setLiveStats] = useState({ totalVoters: 0, totalVoted: 0, turnoutPercentage: 0 });
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/votes/stats');
      setLiveStats(res.data);
    } catch {
      // silently fail — stats are non-critical
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [electionData] = await Promise.all([
        getUpcomingElections().catch(() => null),
        fetchStats(),
        api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => {})
      ]);

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

      {/* Live Analytics Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="text-indigo-400" />
            <h2 className="text-2xl font-bold">Election Analytics</h2>
            <span className="ml-auto px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-slow"></span> Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Live Voter Turnout */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={64} />
              </div>
              <p className="text-gray-400 font-medium mb-2 text-sm">Live Voter Turnout</p>
              <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-4">
                {liveStats.turnoutPercentage}%
              </h3>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${liveStats.turnoutPercentage}%` }}
                />
              </div>
            </div>

            {/* Total Votes Cast */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Vote size={64} />
              </div>
              <p className="text-gray-400 font-medium mb-2 text-sm">Total Votes Cast</p>
              <h3 className="text-5xl font-bold text-white mb-4">
                {liveStats.totalVoted.toLocaleString()}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">Verified</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/20">Encrypted</span>
              </div>
            </div>

            {/* Total Registered Voters */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={64} />
              </div>
              <p className="text-gray-400 font-medium mb-2 text-sm">Registered Voters</p>
              <h3 className="text-5xl font-bold text-white mb-4">
                {liveStats.totalVoters.toLocaleString()}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/20">Eligible Students</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Election Status Section */}
      {votingStatus && (
        <section className="py-16 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-4">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-300">Election Status</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {votingStatus.status === 'active' ? '🗳️ Voting is Live Now' :
                 votingStatus.status === 'not_started' ? '📅 Election Coming Soon' :
                 '✅ Election Completed'}
              </h2>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className={`glass-card rounded-2xl p-6 md:p-8 border ${
                votingStatus.status === 'active' ? 'border-green-500/30 bg-green-500/5' :
                votingStatus.status === 'not_started' ? 'border-indigo-500/30 bg-indigo-500/5' :
                'border-gray-500/30 bg-gray-500/5'
              }`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        votingStatus.status === 'active' ? 'bg-green-500 animate-pulse' :
                        votingStatus.status === 'not_started' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <span className={`text-sm font-bold tracking-widest uppercase ${
                        votingStatus.status === 'active' ? 'text-green-400' :
                        votingStatus.status === 'not_started' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {votingStatus.status === 'active' ? 'Live' :
                         votingStatus.status === 'not_started' ? 'Upcoming' : 'Completed'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      {votingStatus.startTime && (
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-indigo-400 flex-shrink-0" />
                          <span>Opens: <strong className="text-white">{new Date(votingStatus.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                        </div>
                      )}
                      {votingStatus.endTime && (
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-red-400 flex-shrink-0" />
                          <span>Closes: <strong className="text-white">{new Date(votingStatus.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                  {votingStatus.status !== 'ended' && (
                    <div className="flex-shrink-0">
                      <CountdownTimer
                        targetTime={votingStatus.status === 'not_started' ? votingStatus.startTime : votingStatus.endTime}
                        status={votingStatus.status}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Announcements / Notice Board Section */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-4">
              <Megaphone className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Notice Board</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Latest Updates</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Important announcements and election notices from the administration.
            </p>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-14 glass-card rounded-2xl max-w-lg mx-auto border border-white/5">
              <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Announcements Yet</h3>
              <p className="text-gray-500 text-sm">Check back later for election updates and notices.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map(item => (
                <AnnouncementCard key={item._id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="py-20 border-t border-white/5 bg-white/[0.015]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-6">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-300">Security & Privacy</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Vote is{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Safe &amp; Anonymous
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Built with industry-grade security standards. Every vote is cryptographically secured, anonymized, and permanently recorded — no one can trace a vote back to a voter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:bg-indigo-500/20 transition-colors">
                <Lock className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">End-to-End Encryption</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                All vote submissions are encrypted using JWT-secured HTTPS connections. Your data is never transmitted in plain text.
              </p>
            </div>

            {/* Card 2 */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                <EyeOff className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Voter Anonymity</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Votes are stored separately from voter identities. Once cast, no administrator or system can link a vote to a specific student.
              </p>
            </div>

            {/* Card 3 */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors">
                <FileCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">One Vote Per Student</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                The system enforces a strict one-vote-per-student policy, verified at the database level. Duplicate votes are cryptographically impossible.
              </p>
            </div>

            {/* Card 4 */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition-colors">
                <Key className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Secure Authentication</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Access requires unique credentials verified against bcrypt-hashed passwords. Sessions are time-limited and automatically expire after voting.
              </p>
            </div>

            {/* Card 5 */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                <Server className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Immutable Audit Log</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Every action — from login to vote submission — is timestamped and permanently recorded. Results are verifiable and tamper-proof.
              </p>
            </div>

            {/* Card 6 */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-5 group-hover:bg-pink-500/20 transition-colors">
                <Fingerprint className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero Data Sharing</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Student data is never shared with third parties. The platform collects only the minimum information needed to verify eligibility and record votes.
              </p>
            </div>
          </div>

          {/* Security Notice Banner */}
          <div className="mt-10 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Security Notice</p>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Never share your Student ID or password with anyone — including administrators. The system will never ask for your credentials outside the official login page.
                If you suspect unauthorized access, contact the election committee immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0f172a] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Vote className="w-6 h-6 text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Secure Institutional Election System. All rights reserved.</p>
          <p className="text-xs text-gray-600 mt-1">All votes are anonymized, encrypted, and securely stored.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
