import React from 'react';

interface LoaderProps {
  small?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ small = false }) => {
  const size = small ? 24 : 56;
  const barWidth = small ? 4 : 8;
  const gap = small ? 2 : 4;
  const numBars = 4;
  const totalWidth = numBars * barWidth + (numBars - 1) * gap;
  const startX = (size - totalWidth) / 2;
  
  const bars = Array.from({ length: numBars }).map((_, i) => {
    const delay = `${i * 0.15}s`;
    return (
      <rect
        key={i}
        x={startX + i * (barWidth + gap)}
        y={size * 0.35}
        width={barWidth}
        height={size * 0.3}
        rx={barWidth / 2}
        ry={barWidth / 2}
      >
        <animate 
            attributeName="height" 
            values={`${size*0.3};${size*0.7};${size*0.3}`} 
            begin={delay} 
            dur="1.2s" 
            repeatCount="indefinite" 
            calcMode="spline"
            keyTimes="0; 0.5; 1"
            keySplines="0.5 0 0.5 1; 0.5 0 0.5 1"
        />
        <animate 
            attributeName="y" 
            values={`${size*0.35};${size*0.15};${size*0.35}`} 
            begin={delay} 
            dur="1.2s" 
            repeatCount="indefinite" 
            calcMode="spline"
            keyTimes="0; 0.5; 1"
            keySplines="0.5 0 0.5 1; 0.5 0 0.5 1"
        />
      </rect>
    );
  });

  return (
    <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`} 
        className="text-blue-400" 
        fill="currentColor"
        role="status"
        aria-label="Loading..."
    >
      {bars}
    </svg>
  );
};