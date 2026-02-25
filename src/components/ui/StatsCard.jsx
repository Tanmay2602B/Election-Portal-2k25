import React from 'react';
import Card from './Card';

const StatsCard = ({ title, value, icon: Icon, color = "indigo", subtext }) => {
    const colorStyles = {
        indigo: "from-indigo-500 to-purple-500",
        emerald: "from-emerald-500 to-teal-500",
        amber: "from-amber-500 to-orange-500",
        rose: "from-rose-500 to-pink-500",
        blue: "from-blue-500 to-cyan-500"
    };

    return (
        <Card hover className="relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
                    {subtext && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            {subtext}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorStyles[color]} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-white" size={24} />
                </div>
            </div>

            {/* Background decoration */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${colorStyles[color]} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300`} />
        </Card>
    );
};

export default StatsCard;
