import React from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LiveClock from '../LiveClock';

const AdminSchedule = ({
    votingSchedule,
    setVotingSchedule,
    handleSaveSchedule,
    saving,
    saveStatus,
    formatDuration,

    handleStartVoting,
    handleEndVoting,
    loadData
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white">Election Schedule</h2>
                    <p className="text-gray-400 text-sm">Configure timing and voting rules</p>
                </div>
                <Button onClick={loadData} icon={RefreshCw} variant="ghost">Refresh</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Settings - Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar className="text-indigo-400" size={20} />
                            Timing Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={votingSchedule.votingStart}
                                    onChange={(e) => setVotingSchedule(prev => ({ ...prev, votingStart: e.target.value }))}
                                    className="glass-input w-full px-4 py-3 rounded-xl"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">End Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={votingSchedule.votingEnd}
                                    onChange={(e) => setVotingSchedule(prev => ({ ...prev, votingEnd: e.target.value }))}
                                    className="glass-input w-full px-4 py-3 rounded-xl"
                                    required
                                />
                            </div>
                        </div>

                        {votingSchedule.votingStart && votingSchedule.votingEnd && (
                            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
                                <div className="flex items-center gap-2 text-indigo-300 text-sm">
                                    <Clock size={16} />
                                    <span>Duration: {formatDuration(new Date(votingSchedule.votingEnd) - new Date(votingSchedule.votingStart))}</span>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/10 flex items-center justify-end">
                            <Button
                                onClick={handleSaveSchedule}
                                disabled={!votingSchedule.votingStart || !votingSchedule.votingEnd || saving}
                                variant={saveStatus === 'success' ? 'success' : saveStatus === 'error' ? 'danger' : 'primary'}
                                icon={saveStatus === 'success' ? CheckCircle : saveStatus === 'error' ? AlertCircle : Calendar}
                            >
                                {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved Successfully' : saveStatus === 'error' ? 'Save Failed' : 'Save Schedule'}
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-bold text-white mb-6">Advanced Settings</h3>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                                <input
                                    type="checkbox"
                                    checked={votingSchedule.enableDepartmentalVoting}
                                    onChange={(e) => setVotingSchedule(prev => ({ ...prev, enableDepartmentalVoting: e.target.checked }))}
                                    className="mt-1 h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                />
                                <div>
                                    <span className="block font-medium text-white">Departmental Voting</span>
                                    <span className="block text-sm text-gray-400 mt-1">Enable separate elections per department</span>
                                </div>
                            </label>

                            {votingSchedule.enableDepartmentalVoting && (
                                <div className="ml-8 animate-fade-in">
                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                                        <input
                                            type="checkbox"
                                            checked={votingSchedule.allowCrossDepartmentVoting}
                                            onChange={(e) => setVotingSchedule(prev => ({ ...prev, allowCrossDepartmentVoting: e.target.checked }))}
                                            className="mt-1 h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                        />
                                        <div>
                                            <span className="block font-medium text-white">Cross-Department Voting</span>
                                            <span className="block text-sm text-gray-400 mt-1">Allow students to vote for candidates in other departments (Open Election)</span>
                                        </div>
                                    </label>

                                    {!votingSchedule.allowCrossDepartmentVoting && (
                                        <div className="mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2 text-orange-300 text-sm">
                                            <AlertCircle size={16} />
                                            Students will be restricted to their own department's candidates.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Status Panel - Right Column */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
                        <div className="mb-6 flex justify-center">
                            <LiveClock showIcon={true} />
                        </div>

                        <div className={`p-6 rounded-2xl mb-6 text-center border ${votingSchedule.isActive
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                            }`}>
                            <div className={`w-4 h-4 rounded-full mx-auto mb-3 ${votingSchedule.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                }`} />
                            <h4 className={`text-lg font-bold ${votingSchedule.isActive ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {votingSchedule.isActive ? 'VOTING ACTIVE' : 'VOTING CLOSED'}
                            </h4>
                            <p className="text-sm text-gray-400 mt-2">
                                {votingSchedule.isActive
                                    ? 'Students can cast votes'
                                    : 'Voting access is disabled'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <Button
                                onClick={handleStartVoting}
                                disabled={votingSchedule.isActive}
                                variant="success"
                                className="w-full justify-center"
                            >
                                Start Voting Now
                            </Button>
                            <Button
                                onClick={handleEndVoting}
                                disabled={!votingSchedule.isActive}
                                variant="danger"
                                className="w-full justify-center"
                            >
                                End Voting Now
                            </Button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={votingSchedule.isActive}
                                    onChange={(e) => setVotingSchedule(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                />
                                <span className="text-sm text-gray-300">Manual Override</span>
                            </label>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminSchedule;
