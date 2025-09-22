import React, { useState } from 'react';
import { Calendar, Clock, RefreshCw, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CountdownTimer from './CountdownTimer';

function UpcomingElection({ isAdmin = false, onScheduleSave = null }) {
  const { votingSchedule, getVotingStatus, refreshVotingSchedule } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  const votingStatus = getVotingStatus();

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMessage('');
    
    try {
      await refreshVotingSchedule();
      setRefreshMessage('✅ Schedule refreshed successfully!');
      setTimeout(() => setRefreshMessage(''), 3000);
    } catch (error) {
      setRefreshMessage('❌ Failed to refresh schedule');
      setTimeout(() => setRefreshMessage(''), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Not set';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'not_started': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ended': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5" />;
      case 'not_started': return <Clock className="h-5 w-5" />;
      case 'ended': return <AlertCircle className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-white mr-3" />
            <h3 className="text-lg font-bold text-white">
              🗳️ Upcoming Election Schedule
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {refreshMessage && (
              <span className="text-sm text-white bg-white bg-opacity-20 px-3 py-1 rounded-full">
                {refreshMessage}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Refresh schedule"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="ml-1 text-sm">Refresh</span>
            </button>
            {isAdmin && onScheduleSave && (
              <button
                onClick={onScheduleSave}
                className="flex items-center px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                title="Edit schedule"
              >
                <Save className="h-4 w-4" />
                <span className="ml-1 text-sm">Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!votingSchedule || (!votingSchedule.votingStart && !votingSchedule.votingEnd) ? (
          <div className="text-center py-8">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-600 mb-2">No Election Scheduled</h4>
            <p className="text-gray-500">
              {isAdmin ? 'Set up an election schedule to get started.' : 'Check back later for election announcements.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getStatusColor(votingStatus.status)}`}>
              {getStatusIcon(votingStatus.status)}
              <span className="ml-2 font-medium">
                {votingStatus.status === 'active' && '🟢 Voting Active'}
                {votingStatus.status === 'not_started' && '🔵 Voting Scheduled'}
                {votingStatus.status === 'ended' && '🔴 Voting Ended'}
                {votingStatus.status === 'not_scheduled' && '⚪ Not Scheduled'}
              </span>
            </div>

            {/* Election Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-900">Voting Starts</span>
                </div>
                <p className="text-blue-800 text-sm">
                  {formatDateTime(votingSchedule.votingStart)}
                </p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-semibold text-red-900">Voting Ends</span>
                </div>
                <p className="text-red-800 text-sm">
                  {formatDateTime(votingSchedule.votingEnd)}
                </p>
              </div>
            </div>

            {/* Duration Info */}
            {votingSchedule.votingStart && votingSchedule.votingEnd && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-purple-900">Election Duration</span>
                    <p className="text-purple-800 text-sm">
                      {(() => {
                        const start = votingSchedule.votingStart.seconds 
                          ? new Date(votingSchedule.votingStart.seconds * 1000) 
                          : new Date(votingSchedule.votingStart);
                        const end = votingSchedule.votingEnd.seconds 
                          ? new Date(votingSchedule.votingEnd.seconds * 1000) 
                          : new Date(votingSchedule.votingEnd);
                        const hours = Math.round((end - start) / (1000 * 60 * 60));
                        const days = Math.floor(hours / 24);
                        const remainingHours = hours % 24;
                        
                        if (days > 0) {
                          return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
                        }
                        return `${hours} hour${hours !== 1 ? 's' : ''}`;
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-purple-600">
                      {votingSchedule.enableDepartmentalVoting ? '🏢 Departmental Mode' : '🌐 General Election'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Countdown Timer */}
            {votingStatus.countdown && votingStatus.timeRemaining > 0 && (
              <CountdownTimer 
                targetTime={votingStatus.status === 'not_started' ? votingStatus.startTime : votingStatus.endTime}
                status={votingStatus.status}
                onTimeUp={handleRefresh}
              />
            )}

            {/* Special Notice */}
            {votingSchedule.enableDepartmentalVoting && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Departmental Voting Mode</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      {votingSchedule.allowCrossDepartmentVoting 
                        ? 'Students can vote for all departments including their own.'
                        : 'Students cannot vote for their own department - cross-department voting only.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UpcomingElection;