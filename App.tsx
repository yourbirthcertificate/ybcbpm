import React, { useState, useCallback, useEffect, useRef } from 'react';

// Components
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { BpmDisplay } from './components/BpmDisplay';
import { MusicalInsights } from './components/MusicalInsights';
import { BpmAnalysisVisualizer } from './components/BpmAnalysisVisualizer';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { TempoControls } from './components/TempoControls';
import { FeedbackModal } from './components/FeedbackModal';
import { DownloadIcon } from './components/icons/DownloadIcon';

// Types
import type { MusicalInsight, BpmCandidate } from './types';

// Services
import { getMusicalInsights } from './services/geminiService';
import { logInfo, logError, downloadLogs } from './services/loggingService';

// The BpmAnalyser is attached to the window object from the script in index.html
declare global {
  interface Window {
    BpmAnalyser: {
      analyse: (buffer: AudioBuffer) => Promise<{ candidates: BpmCandidate[], peaks: number[] }>;
    }
  }
}

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<{ candidates: BpmCandidate[], peaks: number[] } | null>(null);
    const [insights, setInsights] = useState<MusicalInsight | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [activeBpm, setActiveBpm] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    
    useEffect(() => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                setError("Web Audio API is not supported in this browser.");
                logError("AudioContext initialization failed", e);
            }
        }
    }, []);

    const resetState = useCallback(() => {
        setFile(null);
        setAudioBuffer(null);
        setIsLoading(false);
        setError(null);
        setAnalysisResult(null);
        setInsights(null);
        setLoadingInsights(false);
        setActiveBpm(0);
        setCurrentTime(0);
        setIsFeedbackModalOpen(false);
        logInfo("State has been reset.");
    }, []);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        resetState();
        setIsLoading(true);
        setFile(selectedFile);
        logInfo(`File selected: ${selectedFile.name}`, { type: selectedFile.type, size: selectedFile.size });

        if (!audioContextRef.current) {
            setError("AudioContext not available. Please refresh the page.");
            setIsLoading(false);
            return;
        }

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const decodedAudioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            setAudioBuffer(decodedAudioBuffer);
            
            logInfo("Audio decoding successful.");
            const result = await window.BpmAnalyser.analyse(decodedAudioBuffer);
            logInfo("BPM analysis complete.", result);
            
            if (!result || result.candidates.length === 0) {
                throw new Error("BPM analysis failed to produce results.");
            }
            
            setAnalysisResult(result);
            const detectedBpm = result.candidates[0].tempo;
            setActiveBpm(detectedBpm);

            setLoadingInsights(true);
            try {
                const fetchedInsights = await getMusicalInsights(detectedBpm);
                setInsights(fetchedInsights);
                logInfo("Musical insights fetched.", fetchedInsights);
            } catch (insightError) {
                logError("Failed to fetch musical insights.", insightError);
            } finally {
                setLoadingInsights(false);
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during analysis.";
            setError(`Failed to process audio file. Please ensure it's a valid, non-corrupted audio file. Error: ${errorMessage}`);
            logError("Error in handleFileSelect", e);
            setAudioBuffer(null);
        } finally {
            setIsLoading(false);
        }

    }, [resetState]);
    
    const handleFeedbackSubmit = (feedback: { correctBpm: string; comments: string }) => {
        logInfo("Feedback submitted", { ...feedback, fileName: file?.name, detectedBpm: analysisResult?.candidates[0]?.tempo });
        downloadLogs();
        setIsFeedbackModalOpen(false);
    };

    const detectedBpm = analysisResult?.candidates?.[0]?.tempo;

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
            <header className="py-4 px-6 md:px-8 border-b border-gray-800 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-20">
                <h1 className="text-2xl font-bold">AI BPM Detector</h1>
            </header>
            
            <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center text-center">
                <div className="w-full max-w-4xl">
                    {!file && (
                        <div className="animate-fade-in">
                            <h2 className="text-4xl font-bold mb-2">Find the Tempo of Any Song</h2>
                            <p className="text-lg text-gray-400 mb-8">Upload an audio file to get started.</p>
                            <FileUpload onFileSelect={handleFileSelect} />
                        </div>
                    )}
                    
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center gap-4 animate-fade-in p-8">
                            <Loader />
                            <p className="text-lg text-gray-400">Analyzing "{file?.name}"...</p>
                            <p className="text-sm text-gray-500">This might take a moment for larger files.</p>
                        </div>
                    )}
                    
                    {error && (
                         <div className="animate-fade-in bg-red-900/50 border border-red-700 p-6 rounded-lg">
                            <h3 className="text-2xl font-bold text-red-300 mb-2">An Error Occurred</h3>
                            <p className="text-red-200 mb-6">{error}</p>
                            <button onClick={resetState} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                Try Again
                            </button>
                        </div>
                    )}

                    {analysisResult && !isLoading && !error && detectedBpm && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={resetState} className="text-blue-400 hover:text-blue-300 transition-colors text-sm">&larr; Analyze another file</button>
                                 <p className="text-gray-400 text-sm font-mono truncate max-w-xs" title={file?.name}>{file?.name}</p>
                            </div>
                            
                            <div className="bg-gray-800/50 p-6 md:p-8 rounded-2xl border border-gray-700 shadow-xl space-y-8">
                                <BpmDisplay bpm={detectedBpm} />
                                
                                <WaveformVisualizer 
                                 audioBuffer={audioBuffer} 
                                 peaks={analysisResult.peaks}
                                 duration={audioBuffer?.duration || 0}
                                 currentTime={currentTime}
                                 onSeek={(time) => setCurrentTime(time)}
                               />
                                
                                <TempoControls 
                                    audioBuffer={audioBuffer}
                                    detectedBpm={detectedBpm}
                                    activeBpm={activeBpm}
                                    onBpmChange={setActiveBpm}
                                    currentTime={currentTime}
                                    onTimeUpdate={setCurrentTime}
                                />
                            </div>
                            
                            <BpmAnalysisVisualizer candidates={analysisResult.candidates} detectedBpm={detectedBpm} />

                            {loadingInsights && (
                                 <div className="mt-8 flex flex-col items-center justify-center gap-3">
                                    <Loader small />
                                    <p className="text-gray-400">Getting AI insights...</p>
                                 </div>
                            )}
                            {insights && <MusicalInsights insights={insights} />}
                            
                            <div className="mt-12 border-t border-gray-700 pt-8 flex flex-col items-center gap-4">
                                <h3 className="text-lg font-semibold text-gray-300">Was the analysis incorrect?</h3>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setIsFeedbackModalOpen(true)}
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg transition-colors"
                                    >
                                        Submit Feedback
                                    </button>
                                    <button
                                        onClick={downloadLogs}
                                        title="Download session logs for debugging"
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold p-2.5 rounded-lg transition-colors flex items-center"
                                    >
                                        <DownloadIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            {detectedBpm && <FeedbackModal 
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSubmit={handleFeedbackSubmit}
                detectedBpm={detectedBpm}
                fileName={file?.name || ''}
            />}
        </div>
    );
};

export default App;
