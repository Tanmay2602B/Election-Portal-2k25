import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function CountdownTimer({ targetTime, status, onTimeUp = () => { } }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!targetTime) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = typeof targetTime === 'string' ? new Date(targetTime).getTime() : targetTime;
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft(difference);
      } else {
        setTimeLeft(0);
        onTimeUp();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetTime, onTimeUp]);

  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return '00:00:00';

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  if (timeLeft <= 0 && status !== 'not_started') {
    return null;
  }

  const isWarning = status === 'active' && timeLeft < 3600000; // Less than 1 hour

  return (
    <div className={`glass-card rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden ${isWarning ? 'border-red-500/30' : 'border-indigo-500/20'}`}>
      <div className={`absolute top-0 w-full h-1 left-0 ${isWarning ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}></div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isWarning ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
            <Clock size={24} className={isWarning ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">
              {status === 'not_started' ? 'Voting Starts In' : 'Voting Ends In'}
            </h3>
            <p className="text-sm text-gray-400">
              {status === 'active' ? 'Make sure to cast your vote before time runs out.' : 'The election will begin soon. Be ready!'}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-mono">
          <span className={`text-4xl sm:text-5xl font-bold tracking-tight ${isWarning ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CountdownTimer;