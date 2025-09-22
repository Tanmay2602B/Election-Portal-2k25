import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const LiveClock = ({ className = "", showIcon = true, showDate = true }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex items-center ${className}`}>
      {showIcon && <Clock className="h-5 w-5 mr-2 text-blue-600" />}
      <div className="text-center">
        <div className="text-lg font-mono font-bold text-gray-900">
          {formatTime(time)}
        </div>
        {showDate && (
          <div className="text-sm text-gray-600">
            {formatDate(time)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClock;