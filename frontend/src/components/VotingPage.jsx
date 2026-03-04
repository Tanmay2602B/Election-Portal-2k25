import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Vote, CheckCircle, ArrowLeft, AlertTriangle, Users } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import Card from './ui/Card';
import Button from './ui/Button';
import StudentHeader from './student/StudentHeader';

function VotingPage() {
  const { userProfile, submitVote, getVotingStatus } = useAuth();
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [votingSettings, setVotingSettings] = useState(null);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(12);

  useEffect(() => {
    let timer;
    if (voteSubmitted && redirectCountdown > 0) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (voteSubmitted && redirectCountdown === 0) {
      navigate('/student'); // Or home, but auth might log them out
    }
    return () => clearInterval(timer);
  }, [voteSubmitted, redirectCountdown, navigate]);

  useEffect(() => {
    loadElectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadElectionData = async () => {
    try {
      //   const votingStatus = getVotingStatus();
      //   if (votingStatus.status !== 'active') {
      //     // Double check with API if actually active
      //   }

      const [scheduleRes, positionsRes, candidatesRes] = await Promise.all([
        api.get('/settings/votingSchedule'),
        api.get('/positions'),
        api.get('/candidates')
      ]);

      const settings = { ...scheduleRes.data }; // merged/renamed
      // Assuming settings endpoint returns the schedule object or full config. 
      // Our backend returns whatever is in 'votingSchedule' key which is the object.

      setVotingSettings(settings);

      const positionsData = positionsRes.data;
      let candidatesData = candidatesRes.data;

      // Filter Logic
      if (settings?.enableDepartmentalVoting && !settings?.allowCrossDepartmentVoting) {
        const studentDept = userProfile?.class;
        candidatesData = candidatesData.filter(candidate => candidate.class === studentDept);
        setDepartmentInfo({
          userDepartment: studentDept,
          restrictedMode: true,
          message: `You can only vote for candidates from your department (${studentDept})`
        });
      } else if (settings?.enableDepartmentalVoting && settings?.allowCrossDepartmentVoting) {
        setDepartmentInfo({
          userDepartment: userProfile?.class,
          restrictedMode: false,
          message: 'You can vote for candidates from all departments'
        });
      }

      setPositions(positionsData);
      setCandidates(candidatesData);
    } catch (error) {
      console.error('Error loading election data:', error);
      setError('Failed to load election data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteChange = (positionId, candidateId) => {
    setVotes(prev => ({
      ...prev,
      [positionId]: candidateId
    }));
  };

  const isAllPositionsVoted = () => {
    // Need to handle IDs that might be different or `_id` vs `id`
    return positions.every(position => votes[position._id || position.id]);
  };

  const handleSubmitVotes = async () => {
    if (!isAllPositionsVoted()) {
      setError('Please select a candidate for all positions before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const voteArray = Object.entries(votes).map(([positionId, candidateId]) => ({
        positionId,
        candidateId
      }));
      await submitVote(voteArray);
      setVoteSubmitted(true);
    } catch (error) {
      console.error('Error submitting votes:', error);
      setError('Failed to submit votes. ' + (error.response?.data?.msg || ''));
      setSubmitting(false);
    }
  };

  const handleGoBack = () => navigate('/student');

  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><LoadingSpinner message="Loading Ballot..." /></div>;
  }

  // Check if active (locally or via settings loaded)
  // For robustness, if we loaded data successfully, we assume we can render, 
  // but we should respect the 'isActive' flag from settings.
  if (votingSettings && (!votingSettings.isActive || getVotingStatus().status === 'ended' || getVotingStatus().status === 'not_started')) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-red-500/30 bg-red-500/10">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Voting Closed</h2>
          <p className="text-red-200">The election is currently not active. Return to the dashboard.</p>
          <Button onClick={handleGoBack} className="mt-6 w-full py-3">Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (voteSubmitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full glass-card p-12 text-center relative overflow-hidden animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border border-green-500/30 animate-float">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Thank You for Voting
            </h1>

            <p className="text-xl text-green-300 mb-2 font-medium animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Your vote has been securely recorded.
            </p>

            <p className="text-gray-400 mb-10 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              Thank you for participating in the election.
            </p>

            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-green-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(redirectCountdown / 12) * 100}%` }}
              ></div>
            </div>

            <p className="text-sm text-gray-500 animate-pulse">
              Redirecting to home page in {redirectCountdown} seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] pb-12">
      <StudentHeader userProfile={userProfile} onLogout={() => { }} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleGoBack} variant="ghost" className="p-2 rounded-full h-auto"><ArrowLeft size={24} /></Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Vote className="text-indigo-400" /> Cast Your Vote
              </h1>
              <p className="text-gray-400">Select one candidate for each position below</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-4">
            <span className="text-sm text-gray-300 whitespace-nowrap">Progress</span>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${(Object.keys(votes).length / positions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{Object.keys(votes).length}/{positions.length}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center text-red-200">
            <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
            {error}
          </div>
        )}

        {departmentInfo && (
          <div className={`p-4 rounded-xl border flex items-center ${departmentInfo.restrictedMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200' : 'bg-blue-500/10 border-blue-500/30 text-blue-200'}`}>
            <Users className="mr-3" />
            <div>
              <div className="font-bold">{departmentInfo.restrictedMode ? 'Department Locked' : 'Open Election'}</div>
              <div className="text-sm opacity-80">{departmentInfo.message}</div>
            </div>
          </div>
        )}

        {/* Voting Sections */}
        <div className="space-y-8">
          {positions.map(position => {
            const pid = position._id || position.id;
            const positionCandidates = candidates.filter(c => (c.positionId === pid) || (c.positionId._id === pid));
            const userVote = votes[pid];

            return (
              <Card key={pid} className={`relative overflow-hidden transition-all duration-500 ${userVote ? 'border-green-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : ''}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500" />

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">{position.name}</h3>
                    {position.description && <p className="text-gray-400 text-sm mt-1">{position.description}</p>}
                  </div>
                  {userVote && (
                    <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                      <CheckCircle size={16} />
                      <span className="text-xs font-bold">Selection Made</span>
                    </div>
                  )}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {positionCandidates.map(candidate => {
                    const cid = candidate._id || candidate.id;
                    const isSelected = userVote === cid;
                    return (
                      <div
                        key={cid}
                        onClick={() => handleVoteChange(pid, cid)}
                        className={`
                          relative group cursor-pointer rounded-xl p-4 border transition-all duration-300
                          ${isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-lg scale-[1.02]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }
                        `}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox circle */}
                          <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {candidate.photoURL ? (
                                <img src={candidate.photoURL} alt={candidate.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold border-2 border-white/10">
                                  {candidate.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h4 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>{candidate.name}</h4>
                                <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">{candidate.class}</span>
                              </div>
                            </div>
                            {candidate.bio && <p className="text-sm text-gray-400 line-clamp-2 pl-15">{candidate.bio}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Submit Section */}
        <Card className="text-center p-8 bg-gradient-to-b from-white/5 to-transparent">
          {!isAllPositionsVoted() ? (
            <div className="space-y-4">
              <p className="text-gray-400">You must select a candidate for every position to submit your ballot.</p>
              <Button disabled variant="secondary" className="w-full max-w-md mx-auto py-4 opacity-50 cursor-not-allowed">
                Complete All Selections to Submit
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-sm max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 font-bold mb-1">
                  <AlertTriangle size={16} /> Final Confirmation
                </div>
                Once submitted, your vote is final and cannot be changed. You will be logged out.
              </div>
              <Button
                onClick={handleSubmitVotes}
                disabled={submitting}
                variant="success"
                className="w-full max-w-md mx-auto py-4 text-lg shadow-xl shadow-green-500/20 hover:scale-105"
                icon={CheckCircle}
              >
                {submitting ? 'Encrypting & Submitting...' : 'Confirm & Cast Final Vote'}
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

export default VotingPage;