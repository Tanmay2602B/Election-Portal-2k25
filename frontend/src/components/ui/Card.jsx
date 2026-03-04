import React from 'react';

const Card = ({ children, className = '', hover = false }) => {
  return (
    <div 
      className={`
        glass-panel rounded-2xl p-6
        ${hover ? 'hover:scale-[1.02] hover:shadow-xl transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
