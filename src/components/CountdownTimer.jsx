import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function CountdownTimer({ targetTime, status, onTimeUp = () => {} }) {
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

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetTime, onTimeUp]);

  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const { days, hours, minutes, seconds } = formatTime(timeLeft);

  if (timeLeft <= 0) {
    return null;
  }

  const getColorScheme = () => {
    if (status === 'not_started') {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        accent: 'text-blue-600'
      };
    } else if (status === 'active') {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-900',
        accent: 'text-orange-600'
      };
    }
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-900',
      accent: 'text-gray-600'
    };
  };

  const colors = getColorScheme();

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-6 mb-6`}>
      <div className="flex items-center mb-4">
        <Clock className={`h-6 w-6 ${colors.accent} mr-3`} />
        <h3 className={`text-lg font-bold ${colors.text}`}>
          {status === 'not_started' ? '⏰ Voting Starts In:' : '⚡ Voting Ends In:'}
        </h3>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${colors.text} bg-white rounded-lg py-3 px-2 shadow-sm border`}>
            {days.toString().padStart(2, '0')}
          </div>
          <div className={`text-sm font-medium ${colors.text} mt-2`}>Days</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${colors.text} bg-white rounded-lg py-3 px-2 shadow-sm border`}>
            {hours.toString().padStart(2, '0')}
          </div>
          <div className={`text-sm font-medium ${colors.text} mt-2`}>Hours</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${colors.text} bg-white rounded-lg py-3 px-2 shadow-sm border`}>
            {minutes.toString().padStart(2, '0')}
          </div>
          <div className={`text-sm font-medium ${colors.text} mt-2`}>Minutes</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${colors.text} bg-white rounded-lg py-3 px-2 shadow-sm border`}>
            {seconds.toString().padStart(2, '0')}
          </div>
          <div className={`text-sm font-medium ${colors.text} mt-2`}>Seconds</div>
        </div>
      </div>
      
      {status === 'not_started' && (
        <div className={`mt-4 text-center ${colors.text}`}>
          <p className="text-sm">Get ready to cast your vote when the time comes!</p>
        </div>
      )}
      
      {status === 'active' && (
        <div className={`mt-4 text-center ${colors.text}`}>
          <p className="text-sm font-medium">⚠️ Don't wait too long - make sure to submit your vote!</p>
        </div>
      )}
    </div>
  );
}

export default CountdownTimer;