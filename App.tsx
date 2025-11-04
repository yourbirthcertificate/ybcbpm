import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { BpmAnalysisVisualizer } from './components/BpmAnalysisVisualizer';
import { MusicalInsights } from './components/MusicalInsights';
import { TempoControls } from './components/TempoControls';
import { FeedbackModal } from './components/FeedbackModal';
import type { MusicalInsight, BpmCandidate } from './types';
import { getMusicalInsights } from './services/geminiService';
import { logError, logInfo, downloadLogs } from './services/loggingService';
import { DownloadIcon } from './components/icons/DownloadIcon';

declare global {
  interface Window {
    BpmAnalyser: {
      analyse: (buffer: AudioBuffer) => Promise<{ candidates: BpmCandidate[], peaks: number[] }>;
    };
  }
}

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<{
        detectedBpm: number;
        candidates: BpmCandidate[];
        peaks: number[];
    } | null>(null);
    
    const [activeBpm, setActiveBpm] = useState<number | null>(null);
    const [musicalInsights, setMusicalInsights] = useState<MusicalInsight | null>(null);
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);
    
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    useEffect(() => { logInfo("App initialized.") }, []);

    const findBestBpm = useCallback((candidates: BpmCandidate[], peakTimes: number[]): number => {
        if (candidates.length === 0) return 0;
        if (peakTimes.length === 0) return candidates[0].tempo;

        let bestTempo = candidates[0].tempo;
        let bestScore = -Infinity;
        const evaluationPeaks = peakTimes.slice(0, 64);

        candidates.forEach((candidate, index) => {
            const tempo = candidate.tempo;
            const secondsPerBeat = 60 / tempo;
            let alignment = 0;

            for (let i = 1; i < evaluationPeaks.length; i++) {
                const peakTime = evaluationPeaks[i];
                const expectedBeats = Math.round(peakTime / secondsPerBeat);
                const expectedTime = expectedBeats * secondsPerBeat;
                const error = Math.abs(expectedTime - peakTime);
                const tolerance = secondsPerBeat * 0.15;

                if (error < tolerance) {
                    alignment += 1 - (error / tolerance);
                }
            }

            const confidenceBoost = candidates.length - index;
            const combinedScore = alignment + candidate.count + confidenceBoost * 0.1;

            if (combinedScore > bestScore) {
                bestScore = combinedScore;
                bestTempo = tempo;
            }
        });

        return bestTempo;
    }, []);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        logInfo(`File selected.`, { name: selectedFile.name });
        setFile(selectedFile);
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setMusicalInsights(null);
        setAudioBuffer(null);
        setActiveBpm(null);

        try {
            logInfo(`Starting BPM analysis for file:`, { name: selectedFile.name });
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await selectedFile.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Basic silence check before deep analysis
            const rms = decodedBuffer.getChannelData(0).reduce((acc, val) => acc + val * val, 0);
            if (Math.sqrt(rms / decodedBuffer.length) < 0.001) {
                throw new Error("The audio file appears to be silent.");
            }
            
            setAudioBuffer(decodedBuffer);
            
            if (window.BpmAnalyser) {
                const { candidates, peaks } = await window.BpmAnalyser.analyse(decodedBuffer);
                const bestBpm = findBestBpm(candidates, peaks);
                const result = { detectedBpm: bestBpm, candidates, peaks };
                
                setAnalysisResult(result);
                setActiveBpm(bestBpm);
                logInfo('BPM analysis complete.', { detectedBpm: bestBpm, candidates: candidates.slice(0, 10)});

            } else {
                throw new Error("BPM Analysis library not found.");
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during processing.';
            logError('Error processing file', e);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [findBestBpm]);
    
    const handleFetchInsights = useCallback(async () => {
        if (!activeBpm) return;
        setIsInsightsLoading(true);
        setMusicalInsights(null);
        try {
            logInfo('Fetching musical insights for BPM:', { bpm: activeBpm });
            const insights = await getMusicalInsights(activeBpm);
            setMusicalInsights(insights);
            logInfo('Successfully fetched musical insights.', insights);
        } catch (e) {
            logError("Failed to fetch musical insights", e);
            // Optionally set an error state for insights
        } finally {
            setIsInsightsLoading(false);
        }
    }, [activeBpm]);

    const handleReset = () => {
        logInfo('Resetting application state.');
        setFile(null);
        setAudioBuffer(null);
        setIsLoading(false);
        setError(null);
        setAnalysisResult(null);
        setMusicalInsights(null);
        setActiveBpm(null);
    };
    
    const handleFeedbackSubmit = (feedback: { correctBpm: string; comments: string }) => {
        logInfo("Feedback submitted", { fileName: file?.name, detectedBpm: analysisResult?.detectedBpm, correctedBpm: feedback.correctBpm, comments: feedback.comments, candidates: analysisResult?.candidates });
        setIsFeedbackModalOpen(false);
        downloadLogs();
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex flex-col items-center justify-center h-64"><Loader /><p className="mt-4 text-gray-400">Analyzing your audio...</p></div>;
        }

        if (error) {
            return (
                <div className="text-center bg-red-900/50 p-6 rounded-lg border border-red-500/50">
                    <p className="font-bold text-lg mb-2 text-red-400">Analysis Failed</p>
                    <p className="text-red-300">{error}</p>
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={handleReset} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                            Try Again
                        </button>
                        <button onClick={downloadLogs} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                           <DownloadIcon className="w-4 h-4" /> Download Log
                        </button>
                    </div>
                </div>
            );
        }

        if (file && analysisResult && audioBuffer && activeBpm) {
            return (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                            <div>
                                <h2 className="text-3xl font-bold truncate max-w-md" title={file.name}>{file.name}</h2>
                                <p className="text-gray-400">Analysis complete. Select a tempo variation and preview.</p>
                            </div>
                            <button onClick={handleReset} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Analyze Another
                            </button>
                        </div>

                         <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 space-y-4">
                             <WaveformVisualizer audioBuffer={audioBuffer} peaks={analysisResult.peaks} />
                             <TempoControls 
                                detectedBpm={analysisResult.detectedBpm} 
                                audioBuffer={audioBuffer} 
                                activeBpm={activeBpm}
                                onBpmChange={setActiveBpm}
                            />
                         </div>
                    </div>
                    
                    <div className="text-center">
                         <button 
                            onClick={handleFetchInsights} 
                            disabled={isInsightsLoading}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg transition-opacity text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Get Musical Insights
                        </button>
                    </div>

                    {isInsightsLoading ? (
                         <div className="flex flex-col items-center justify-center h-40">
                             <Loader small />
                             <p className="mt-3 text-gray-400">Getting insights from Gemini...</p>
                         </div>
                    ) : musicalInsights ? (
                        <MusicalInsights insights={musicalInsights} />
                    ) : null}

                    <BpmAnalysisVisualizer candidates={analysisResult.candidates} detectedBpm={activeBpm} />
                </div>
            );
        }

        return <FileUpload onFileSelect={handleFileSelect} />;
    };
    
    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <main className="container mx-auto p-4 md:p-8 max-w-4xl">
                <header className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                            AI BPM Detector
                        </span>
                    </h1>
                    <p className="mt-3 text-lg text-gray-400">
                        Upload an audio file to detect its tempo and get musical insights.
                    </p>
                </header>

                {renderContent()}

            </main>
            <footer className="text-center p-6 text-gray-500 text-sm">
                 {analysisResult && (
                     <div className="mb-4">
                        <button 
                            onClick={() => setIsFeedbackModalOpen(true)}
                            className="text-blue-400 hover:underline"
                        >
                            Was this BPM incorrect? Provide feedback.
                        </button>
                    </div>
                 )}
                 <p>&copy; {new Date().getFullYear()} AI BPM Detector. Powered by Gemini.</p>
            </footer>
            
            {analysisResult && file && (
                 <FeedbackModal 
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    onSubmit={handleFeedbackSubmit}
                    detectedBpm={analysisResult.detectedBpm}
                    fileName={file.name}
                />
            )}
        </div>
    );
};

export default App;