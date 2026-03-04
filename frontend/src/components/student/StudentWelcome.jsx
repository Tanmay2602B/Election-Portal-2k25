import React from 'react';
import { User, CreditCard, Star, Trophy } from 'lucide-react';
import Card from '../ui/Card';

const StudentWelcome = ({ userProfile, stats, votingCredits, usedCredits }) => {
    const remainingCredits = votingCredits - usedCredits;

    return (
        <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="border-l-4 border-indigo-500">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-300">
                        <User size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Welcome, {userProfile?.name}!</h2>
                        <p className="text-gray-400 text-sm">Dashboard Overview</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm font-medium text-gray-400 block mb-1">Student ID</span>
                        <p className="text-lg font-bold text-white font-mono">{userProfile?.studentId || 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm font-medium text-gray-400 block mb-1">Class</span>
                        <p className="text-lg font-bold text-white">{userProfile?.class || 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm font-medium text-gray-400 block mb-1">Status</span>
                        <p className={`text-lg font-bold ${userProfile?.hasVoted ? 'text-green-400' : 'text-orange-400'}`}>
                            {userProfile?.hasVoted ? 'Voted ✓' : 'Not Voted'}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm font-medium text-gray-400 block mb-1">Participation</span>
                        <p className="text-lg font-bold text-white">{stats.participationRate}%</p>
                    </div>
                </div>
            </Card>

            {/* Credit Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-white relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <CreditCard className="text-indigo-200" />
                            <h3 className="text-xl font-bold">Voting Credits</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-indigo-200 text-sm">Total Available</span>
                                <span className="text-2xl font-bold">{votingCredits}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-indigo-200 text-sm">Used Credits</span>
                                <span className="text-2xl font-bold text-white/70">{usedCredits}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/20">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-indigo-100">Remaining</span>
                                <span className="text-3xl font-bold text-yellow-300 drop-shadow-lg">{remainingCredits}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="flex flex-col justify-center items-center text-center">
                        <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400 mb-3">
                            <Star size={24} />
                        </div>
                        <div className="text-sm text-gray-400">Positions</div>
                        <div className="text-2xl font-bold text-white">{votingCredits}</div>
                    </Card>
                    <Card className="flex flex-col justify-center items-center text-center">
                        <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 mb-3">
                            <Trophy size={24} />
                        </div>
                        <div className="text-sm text-gray-400">Your Impact</div>
                        <div className="text-2xl font-bold text-white">100%</div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentWelcome;
