import React from 'react';

interface FileTypeBadgeProps {
  type: string | null;
}

export const FileTypeBadge: React.FC<FileTypeBadgeProps> = ({ type }) => {
  if (!type) {
    return null;
  }

  return (
    <span className="bg-gray-700 text-gray-300 text-xs font-mono font-bold px-2 py-1 rounded-md ml-2 flex-shrink-0">
      {type}
    </span>
  );
};
