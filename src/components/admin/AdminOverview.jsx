import React from 'react';
import { Users, UserCheck, Vote, BarChart3, Plus, Clock, AlertTriangle } from 'lucide-react';
import StatsCard from '../ui/StatsCard';
import Button from '../ui/Button';
import Card from '../ui/Card';
import UpcomingElection from '../UpcomingElection';

const AdminOverview = ({
    stats,
    positions,
    candidates,
    students,
    votingSchedule,
    onScheduleSave,
    setModalType,
    setEditItem,
    setShowModal,
    seedTestStudents,
    handleStartVoting,
    handleEndVoting,
    setActiveTab
}) => {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p className="text-gray-400">Welcome back, Admin. Here's what's happening today.</p>
            </div>

            {/* Upcoming Election Component */}
            <div className="glass-panel rounded-2xl p-1">
                <UpcomingElection
                    isAdmin={true}
                    onScheduleSave={() => setActiveTab('schedule')}
                />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Students"
                    value={stats.totalStudents}
                    icon={Users}
                    color="blue"
                    subtext="Registered voters"
                />
                <StatsCard
                    title="Voted"
                    value={stats.votedStudents}
                    icon={UserCheck}
                    color="emerald"
                    subtext={`${stats.votingPercentage}% Turnout`}
                />
                <StatsCard
                    title="Total Votes"
                    value={stats.totalVotes}
                    icon={Vote}
                    color="indigo"
                    subtext="Across all positions"
                />
                <StatsCard
                    title="Turnout"
                    value={`${stats.votingPercentage}%`}
                    icon={BarChart3}
                    color="amber"
                    subtext="Participation rate"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Vote className="text-indigo-400" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => { setModalType('position'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                            className="justify-start h-14"
                        >
                            Add New Position
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => { setModalType('candidate'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                            className="justify-start h-14"
                        >
                            Add New Candidate
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => { setModalType('student'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                            className="justify-start h-14"
                        >
                            Register Student
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={seedTestStudents}
                            icon={Users}
                            className="justify-start h-14 text-orange-300 hover:text-orange-200 hover:bg-orange-500/10 border-orange-500/30"
                        >
                            Seed Test Data
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 flex gap-4">
                        <Button
                            variant={votingSchedule.isActive ? "secondary" : "success"}
                            onClick={handleStartVoting}
                            disabled={votingSchedule.isActive}
                            icon={Vote}
                            className="flex-1 py-4"
                        >
                            {votingSchedule.isActive ? 'Voting Active' : 'Start Voting Now'}
                        </Button>

                        <Button
                            variant={!votingSchedule.isActive ? "secondary" : "danger"}
                            onClick={handleEndVoting}
                            disabled={!votingSchedule.isActive}
                            icon={Clock}
                            className="flex-1 py-4"
                        >
                            End Voting Session
                        </Button>
                    </div>
                </Card>

                {/* Getting Started / Status */}
                <Card>
                    <h3 className="text-xl font-bold text-white mb-6">System Status</h3>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Election Status</span>
                                {votingSchedule.isActive ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                                        Active
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                {votingSchedule.isActive
                                    ? "Students can currently cast their votes."
                                    : "Voting is currently closed."}
                            </p>
                        </div>

                        {positions.length === 0 && (
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                <div className="flex items-center gap-2 mb-2 text-blue-300">
                                    <AlertTriangle size={16} />
                                    <span className="font-bold text-sm">Setup Required</span>
                                </div>
                                <p className="text-xs text-blue-200/70">
                                    No positions found. Please add positions and candidates to start.
                                </p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminOverview;
