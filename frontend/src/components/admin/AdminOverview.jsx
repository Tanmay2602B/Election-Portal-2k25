import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Vote, BarChart3, Plus, Clock, AlertTriangle, Activity } from 'lucide-react';
import StatsCard from '../ui/StatsCard';
import Button from '../ui/Button';
import Card from '../ui/Card';
import UpcomingElection from '../UpcomingElection';

// Simple animated counter hook
function useAnimatedCounter(endValue, duration = 1000) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime = null;
        let animationFrame;

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Ease out quad
            const easeProgress = progress * (2 - progress);

            setCount(Math.floor(easeProgress * endValue));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(endValue);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [endValue, duration]);

    return count;
}

const AdminOverview = ({
    stats,
    positions,
    candidates,
    votingSchedule,
    setModalType,
    setEditItem,
    setShowModal,
    seedTestStudents,
    handleStartVoting,
    handleEndVoting,
    setActiveTab
}) => {
    const animatedTotalVotes = useAnimatedCounter(stats.totalVotes || 0);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p className="text-gray-400">Welcome back, Admin. Here's what's happening today.</p>
            </div>

            {/* Upcoming Election Component (Includes Live Countdown) */}
            <div className="glass-panel rounded-2xl p-1 mb-8">
                <UpcomingElection
                    isAdmin={true}
                    onScheduleSave={() => setActiveTab('schedule')}
                />
            </div>

            {/* Main Stats with Progress Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 relative overflow-hidden group border-indigo-500/20">
                    <div className="absolute -right-6 -top-6 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors">
                        <Vote size={120} />
                    </div>
                    <h3 className="text-gray-400 font-medium mb-1">Total Votes Cast</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            {animatedTotalVotes}
                        </span>
                        <span className="text-indigo-300 font-medium text-sm flex items-center gap-1">
                            <Activity size={14} className="animate-pulse" /> Live
                        </span>
                    </div>
                </Card>

                <Card className="p-6 relative overflow-hidden group border-emerald-500/20">
                    <div className="absolute -right-6 -top-6 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
                        <BarChart3 size={120} />
                    </div>
                    <h3 className="text-gray-400 font-medium mb-1">Voter Turnout</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                            {stats.votingPercentage}%
                        </span>
                        <span className="text-gray-500 font-medium text-sm">
                            ({stats.votedStudents} of {stats.totalStudents})
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-3 mt-2 overflow-hidden border border-white/5">
                        <div
                            className="bg-gradient-to-r from-emerald-400 to-teal-400 h-3 rounded-full relative transition-all duration-1000 ease-out"
                            style={{ width: `${stats.votingPercentage}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[slideRight_2s_infinite]"></div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Small Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Registered</p>
                        <p className="text-xl font-bold text-white">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <UserCheck size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Voted</p>
                        <p className="text-xl font-bold text-white">{stats.votedStudents}</p>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
                        <Vote size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Positions</p>
                        <p className="text-xl font-bold text-white">{positions.length}</p>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Candidates</p>
                        <p className="text-xl font-bold text-white">{candidates.length}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <Card className="lg:col-span-2 glass-card">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Vote className="text-indigo-400" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            variant="primary"
                            onClick={() => { setModalType('position'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                            className="justify-start h-12 glass-button shadow-none"
                        >
                            Add New Position
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => { setModalType('candidate'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                            className="justify-start h-12 glass-button shadow-none"
                        >
                            Add New Candidate
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => { setModalType('student'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                            className="justify-start h-12 glass-button shadow-none"
                        >
                            Register Student
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={seedTestStudents}
                            icon={Users}
                            className="justify-start h-12 text-orange-300 hover:text-orange-200 hover:bg-orange-500/10 border-orange-500/30"
                        >
                            Seed Test Data
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 flex gap-4">
                        <Button
                            variant={votingSchedule.isActive ? "secondary" : "success"}
                            onClick={handleStartVoting}
                            disabled={votingSchedule.isActive}
                            icon={Vote}
                            className="flex-1 py-4"
                        >
                            {votingSchedule.isActive ? 'Voting is Active' : 'Start Voting Now'}
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
                <Card className="glass-card">
                    <h3 className="text-xl font-bold text-white mb-6">System Status</h3>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400 text-sm">Election Status</span>
                                {votingSchedule.isActive ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping-slow"></span> Active
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                {votingSchedule.isActive
                                    ? "Students can currently cast their securely encrypted votes."
                                    : "Voting is currently locked and closed."}
                            </p>
                        </div>

                        {positions.length === 0 && (
                            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                                <div className="flex items-center gap-2 mb-2 text-indigo-300">
                                    <AlertTriangle size={16} />
                                    <span className="font-bold text-sm">Setup Required</span>
                                </div>
                                <p className="text-xs text-indigo-200/70">
                                    No positions found. Please add positions and candidates to enable the election.
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
