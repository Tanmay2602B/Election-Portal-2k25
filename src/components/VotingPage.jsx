import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vote, CheckCircle, ArrowLeft, AlertTriangle, Users } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

function VotingPage() {
  const { userProfile, submitVote, getVotingStatus, isVotingActive } = useAuth();
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [votingSettings, setVotingSettings] = useState(null);
  const [departmentInfo, setDepartmentInfo] = useState(null);

  useEffect(() => {
    loadElectionData();
  }, []);

  const loadElectionData = async () => {
    try {
      // Check if voting is active
      const votingStatus = getVotingStatus();
      if (votingStatus.status !== 'active') {
        setError(`Voting is not currently active. ${votingStatus.message}`);
        setLoading(false);
        return;
      }

      // Load voting settings to check for departmental restrictions
      const settingsDoc = await getDoc(doc(db, 'settings', 'electionConfig'));
      let settings = null;
      if (settingsDoc.exists()) {
        settings = settingsDoc.data();
        setVotingSettings(settings);
      }

      // Load positions
      const positionsQuery = query(collection(db, 'positions'), orderBy('name'));
      const positionsSnapshot = await getDocs(positionsQuery);
      const positionsData = positionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load candidates
      const candidatesQuery = query(collection(db, 'candidates'), orderBy('name'));
      const candidatesSnapshot = await getDocs(candidatesQuery);
      let candidatesData = candidatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply departmental filtering if enabled
      if (settings?.enableDepartmentalVoting && !settings?.allowCrossDepartmentVoting) {
        // Student can only vote for their own department
        const studentDept = userProfile?.class; // Using class as department identifier
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
    return positions.every(position => votes[position.id]);
  };

  const handleSubmitVotes = async () => {
    if (!isVotingActive()) {
      const votingStatus = getVotingStatus();
      setError(`Voting is not currently active. ${votingStatus.message}`);
      return;
    }

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
      // Redirect will be handled by the AuthContext after successful submission
    } catch (error) {
      console.error('Error submitting votes:', error);
      setError('Failed to submit votes. Please try again.');
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate('/student');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading election data..." />
      </div>
    );
  }

  // If voting is not active, show status message
  const votingStatus = getVotingStatus();
  if (votingStatus.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Voting Not Available</h2>
          <p className="text-gray-600 mb-6">{votingStatus.message}</p>
          <button
            onClick={handleGoBack}
            className="btn-primary"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={handleGoBack}
                className="mr-4 p-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <Vote className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cast Your Vote</h1>
                <p className="text-sm text-gray-500">Select one candidate for each position</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Voting as: {userProfile?.name}</p>
              <p className="text-xs text-gray-500">ID: {userProfile?.studentId}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Departmental Voting Notice */}
        {departmentInfo && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center ${
            departmentInfo.restrictedMode 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <Users className={`h-5 w-5 mr-2 flex-shrink-0 ${
              departmentInfo.restrictedMode ? 'text-yellow-600' : 'text-blue-600'
            }`} />
            <div>
              <div className={`font-medium ${
                departmentInfo.restrictedMode ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                {departmentInfo.restrictedMode ? '🔒 Departmental Voting Mode' : '🌐 Cross-Department Voting Enabled'}
              </div>
              <div className={`text-sm ${
                departmentInfo.restrictedMode ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {departmentInfo.message}
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Voting Progress</span>
            <span className="text-sm text-gray-500">
              {Object.keys(votes).length} of {positions.length} positions selected
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(votes).length / positions.length) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {/* Voting Sections */}
        <div className="space-y-8">
          {positions.map(position => {
            const positionCandidates = candidates.filter(candidate => 
              candidate.positionId === position.id
            );

            return (
              <div key={position.id} className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {position.name}
                      </h3>
                      {position.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {position.description}
                        </p>
                      )}
                    </div>
                    {votes[position.id] && (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {positionCandidates.map(candidate => (
                      <div
                        key={candidate.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          votes[position.id] === candidate.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleVoteChange(position.id, candidate.id)}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            name={`position-${position.id}`}
                            value={candidate.id}
                            checked={votes[position.id] === candidate.id}
                            onChange={() => handleVoteChange(position.id, candidate.id)}
                            className="mt-1 mr-3 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {candidate.photoURL && (
                                <img
                                  src={candidate.photoURL}
                                  alt={candidate.name}
                                  className="h-12 w-12 rounded-full object-cover mr-3"
                                />
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {candidate.name}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-600">
                                    {candidate.class}
                                  </p>
                                  {departmentInfo && departmentInfo.userDepartment !== candidate.class && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Other Dept
                                    </span>
                                  )}
                                  {departmentInfo && departmentInfo.userDepartment === candidate.class && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      Your Dept
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {candidate.bio && (
                              <p className="text-sm text-gray-700">
                                {candidate.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <button
              onClick={handleSubmitVotes}
              disabled={!isAllPositionsVoted() || submitting}
              className="inline-flex items-center px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                  Submitting Votes...
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 mr-3" />
                  Submit My Votes
                </>
              )}
            </button>
            
            {!isAllPositionsVoted() && (
              <p className="text-sm text-gray-500 mt-2">
                Please select a candidate for all positions to enable submission
              </p>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Final Warning</p>
              <p className="text-yellow-700 text-sm mt-1">
                Once you submit your votes, you cannot change them. You will be automatically logged out and this device will be locked from future voting.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default VotingPage;