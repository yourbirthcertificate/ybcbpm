
import React from 'react';

interface LoaderProps {
  small?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ small = false }) => {
  const sizeClasses = small ? 'w-5 h-5 border-2' : 'w-12 h-12 border-4';
  return (
    <div className={`
      ${sizeClasses}
      border-blue-400
      border-t-transparent
      rounded-full
      animate-spin
    `}
    role="status"
    aria-label="Loading...">
    </div>
  );
};
