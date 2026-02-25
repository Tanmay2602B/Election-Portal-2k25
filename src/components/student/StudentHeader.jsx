import React from 'react';
import { LogOut } from 'lucide-react';
import LiveClock from '../LiveClock';

const StudentHeader = ({ userProfile, onLogout }) => {
    return (
        <header className="glass-panel sticky top-0 z-50 border-b border-white/10 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
                            V
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                Student Portal
                            </h1>
                            <p className="text-xs text-indigo-300">Secure Voting System</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block">
                            <LiveClock className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-indigo-200 text-sm font-medium" showIcon={true} showDate={false} />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">{userProfile?.name}</p>
                                <p className="text-xs text-gray-400">{userProfile?.studentId}</p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-xl text-red-300 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default StudentHeader;
