import React from 'react';
import { Vote, Clock, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import CountdownTimer from '../CountdownTimer';

const StudentVotingStatus = ({
    votingStatus,
    initializeDashboard,
    canVote,
    remainingCredits,
    userProfile,
    totalPositions,
    votingCredits,
    handleStartVoting
}) => {

    const getStatusConfig = () => {
        switch (votingStatus.status) {
            case 'active':
                return {
                    icon: Vote,
                    color: 'green',
                    title: 'Voting is Now Active!',
                    borderColor: 'border-green-500/30',
                    bgColor: 'bg-green-500/10',
                    textColor: 'text-green-400'
                };
            case 'not_started':
                return {
                    icon: Clock,
                    color: 'yellow',
                    title: 'Voting Has Not Started',
                    borderColor: 'border-yellow-500/30',
                    bgColor: 'bg-yellow-500/10',
                    textColor: 'text-yellow-400'
                };
            case 'ended':
                return {
                    icon: AlertTriangle,
                    color: 'red',
                    title: 'Voting Has Ended',
                    borderColor: 'border-red-500/30',
                    bgColor: 'bg-red-500/10',
                    textColor: 'text-red-400'
                };
            default:
                return {
                    icon: Calendar,
                    color: 'gray',
                    title: 'Voting Schedule Not Set',
                    borderColor: 'border-gray-500/30',
                    bgColor: 'bg-gray-500/10',
                    textColor: 'text-gray-400'
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <Card className={`text-center py-8 ${config.borderColor} ${config.bgColor} border`}>
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${config.bgColor} border ${config.borderColor} ${config.textColor}`}>
                    <Icon size={32} />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${config.textColor}`}>{config.title}</h3>
                <p className="text-gray-300 max-w-lg mx-auto">{votingStatus.message}</p>

                {/* Countdown */}
                {votingStatus.countdown && votingStatus.timeRemaining > 0 && (
                    <div className="mt-6">
                        <CountdownTimer
                            targetTime={votingStatus.status === 'not_started' ? votingStatus.startTime : votingStatus.endTime}
                            status={votingStatus.status}
                            onTimeUp={() => initializeDashboard()}
                        />
                    </div>
                )}
            </Card>

            {/* Action Area */}
            {userProfile?.hasVoted ? (
                <Card className="bg-emerald-500/10 border-emerald-500/30 text-center py-6">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-300 mb-2">Voting Completed!</h3>
                    <p className="text-emerald-200/70 max-w-xl mx-auto">
                        Thank you for participating. You have successfully used all {votingCredits} voting credits.
                        Your votes have been securely recorded.
                    </p>
                </Card>
            ) : (
                <div className="flex justify-center">
                    <Button
                        onClick={handleStartVoting}
                        disabled={!canVote || remainingCredits === 0 || totalPositions === 0}
                        variant={canVote && remainingCredits > 0 ? "primary" : "secondary"}
                        icon={Vote}
                        className="px-12 py-5 text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform"
                    >
                        {canVote && remainingCredits > 0 ? `Start Voting (${remainingCredits} Credits)` :
                            totalPositions === 0 ? 'No Positions Available' :
                                'Voting Not Available'}
                    </Button>
                </div>
            )}

            {/* Instructions */}
            {canVote && remainingCredits > 0 && (
                <Card className="bg-blue-500/5 border-blue-500/10">
                    <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
                        <Calendar size={20} /> Voting Instructions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">1</span>
                                You have {votingCredits} voting credits for {totalPositions} positions.
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">2</span>
                                Each position requires exactly 1 credit.
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">3</span>
                                You must use ALL credits to complete the process.
                            </li>
                        </ul>
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">4</span>
                                Review selections carefully before submitting.
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">5</span>
                                Once submitted, votes cannot be changed.
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">6</span>
                                You will be logged out automatically after voting.
                            </li>
                        </ul>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default StudentVotingStatus;
