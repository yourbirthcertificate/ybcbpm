import React, { useState, useEffect } from 'react';
import { formatBpm } from '../utils/formatters';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: { correctBpm: string; correctKey: string; comments: string }) => void;
  detectedBpm?: number;
  detectedKey?: string | null;
  fileName?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, detectedBpm, detectedKey, fileName }) => {
  const [correctBpm, setCorrectBpm] = useState('');
  const [correctKey, setCorrectKey] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCorrectBpm('');
      setCorrectKey('');
      setComments('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ correctBpm, correctKey, comments: comments.trim() });
  };

  const hasFileInfo = typeof detectedBpm !== 'undefined' && fileName;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-700 w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Submit Feedback</h2>
        {hasFileInfo && (
            <div className="text-center mb-6">
                <p className="text-gray-400 mb-2">File: <span className="font-mono">{fileName}</span></p>
                <div className="flex justify-center gap-6">
                    <p className="text-gray-400">Detected BPM: <span className="font-bold text-white">{formatBpm(detectedBpm)}</span></p>
                    {detectedKey && <p className="text-gray-400">Detected Key: <span className="font-bold text-white">{detectedKey}</span></p>}
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit}>
            {hasFileInfo && (
              <>
                <div className="mb-4">
                    <label htmlFor="correct-bpm" className="block text-sm font-medium text-gray-300 mb-2">What is the correct BPM?</label>
                    <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+(\.[0-9]{1,2})?"
                    id="correct-bpm"
                    value={correctBpm}
                    onChange={(e) => setCorrectBpm(e.target.value)}
                    placeholder="e.g., 120.55"
                    required
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                 <div className="mb-4">
                    <label htmlFor="correct-key" className="block text-sm font-medium text-gray-300 mb-2">What is the correct Key? (Optional)</label>
                    <input
                    type="text"
                    id="correct-key"
                    value={correctKey}
                    onChange={(e) => setCorrectKey(e.target.value)}
                    placeholder="e.g., C# minor"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
              </>
            )}

          <div className="mb-6">
            <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
                {hasFileInfo ? "Additional Comments (Optional)" : "Comments / Suggestions"}
            </label>
            <textarea
              id="comments"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={hasFileInfo ? "Any other details you'd like to share?" : "What's on your mind?"}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-blue-500 focus:border-blue-500"
              required={!hasFileInfo}
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Submit & Download Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};