import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, PieChart as PieChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AdminResults = ({ stats, positions, candidates, votes, exportResults }) => {
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b'];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white">Election Results</h2>
                    <p className="text-gray-400 text-sm">Real-time analysis and reports</p>
                </div>
                <Button onClick={exportResults} icon={Download} variant="primary">
                    Export Report
                </Button>
            </div>

            {/* Participation Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BarChartIcon size={20} className="text-indigo-400" />
                        Voter Participation
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    { name: 'Total', value: stats.totalStudents },
                                    { name: 'Voted', value: stats.votedStudents },
                                    { name: 'Pending', value: stats.totalStudents - stats.votedStudents }
                                ]}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                    {
                                        [0, 1, 2].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <PieChartIcon size={20} className="text-pink-400" />
                        Turnout Distribution
                    </h3>
                    <div className="h-72 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Voted', value: stats.votedStudents },
                                        { name: 'Not Voted', value: stats.totalStudents - stats.votedStudents }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#10b981" stroke="none" />
                                    <Cell fill="#ef4444" stroke="none" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Position Results */}
            {positions.map(position => {
                const positionVotes = votes.filter(vote => vote.positionId === position.id);
                const positionCandidates = candidates.filter(c => c.positionId === position.id);

                const chartData = positionCandidates.map(candidate => {
                    const candidateVotes = positionVotes.filter(vote => vote.candidateId === candidate.id);
                    const percentage = positionVotes.length > 0 ? (candidateVotes.length / positionVotes.length * 100).toFixed(1) : 0;
                    return {
                        name: candidate.name,
                        votes: candidateVotes.length,
                        percentage: parseFloat(percentage),
                        class: candidate.class
                    };
                }).sort((a, b) => b.votes - a.votes);

                return (
                    <div key={position.id} className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h3 className="text-xl font-bold text-white">{position.name}</h3>
                            <p className="text-sm text-gray-400">{positionVotes.length} total votes cast</p>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Table */}
                            <div className="md:col-span-2 space-y-3">
                                {chartData.map((candidate, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-700'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{candidate.name}</p>
                                                <p className="text-xs text-gray-400">{candidate.class}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-white">{candidate.votes}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${candidate.percentage}%` }} />
                                                </div>
                                                <p className="text-xs text-gray-400 w-8">{candidate.percentage}%</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Chart */}
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="votes"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AdminResults;
