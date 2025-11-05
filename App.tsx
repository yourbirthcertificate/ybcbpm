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
import { FileTypeBadge } from './components/FileTypeBadge';
import { MetadataDisplay } from './components/MetadataDisplay';
import { SettingsMenu } from './components/SettingsMenu';

// Types
import type { MusicalInsight, BpmCandidate, TrackMetadata, FileInfo, SongFact, Settings, AnalysisResult } from './types';

// Services
import { getMusicalInsights, getSongFacts } from './services/geminiService';
import { logInfo, logError, downloadLogs, setVerboseLogging } from './services/loggingService';

// The BpmAnalyser is attached to the window object from the script in index.html
declare global {
  interface Window {
    BpmAnalyser: {
      analyse: (buffer: AudioBuffer) => Promise<AnalysisResult>;
    }
    jsmediatags: any;
  }
}

const FLAVOR_TEXTS = [
  'Analyzing the rhythm matrix...',
  'Locating the groove...',
  'Counting the beats...',
  'Fun Fact: The average pop song has a tempo between 110 and 130 BPM.',
  'Calibrating the metronome...',
  'Decoding audio frequencies...',
  'Synchronizing with the beat...',
  'Hang tight, this track is a banger...',
  'Did you know? The term "tempo" comes from the Italian word for "time".',
  'Just a moment, finding the pulse...'
];

const DEFAULT_SETTINGS: Settings = {
    useGemini: true,
    debugMode: false,
    verboseLogging: false,
};

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [insights, setInsights] = useState<MusicalInsight | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [activeBpm, setActiveBpm] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [songFacts, setSongFacts] = useState<SongFact | null>(null);
    const [loadingSongFacts, setLoadingSongFacts] = useState(false);
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const savedSettings = localStorage.getItem('ybcbpm-settings');
            return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    });
    
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

    useEffect(() => {
        try {
            localStorage.setItem('ybcbpm-settings', JSON.stringify(settings));
            setVerboseLogging(settings.verboseLogging);
        } catch (e) {
            logError("Failed to save settings to localStorage", e);
        }
    }, [settings]);

    const handleSettingsChange = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetState = useCallback(() => {
        setFile(null);
        setFileType(null);
        setMetadata(null);
        setAudioBuffer(null);
        setIsLoading(false);
        setLoadingMessage(null);
        setError(null);
        setAnalysisResult(null);
        setInsights(null);
        setLoadingInsights(false);
        setActiveBpm(0);
        setCurrentTime(0);
        setIsFeedbackModalOpen(false);
        setFileInfo(null);
        setSongFacts(null);
        setLoadingSongFacts(false);
        logInfo("State has been reset.");
    }, []);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        resetState();
        setIsLoading(true);
        setFile(selectedFile);
        setLoadingMessage(FLAVOR_TEXTS[Math.floor(Math.random() * FLAVOR_TEXTS.length)]);

        // Determine file type
        let determinedType = '';
        const mimeType = selectedFile.type;
        const extension = selectedFile.name.split('.').pop()?.toUpperCase();

        if (mimeType) {
            switch (mimeType) {
                case 'audio/mpeg':
                    determinedType = 'MP3';
                    break;
                case 'audio/flac':
                case 'audio/x-flac':
                    determinedType = 'FLAC';
                    break;
                case 'audio/wav':
                case 'audio/x-wav':
                    determinedType = 'WAV';
                    break;
                case 'audio/ogg':
                    determinedType = 'OGG';
                    break;
                default:
                    if (extension && ['MP3', 'FLAC', 'WAV', 'OGG', 'M4A', 'AAC'].includes(extension)) {
                        determinedType = extension;
                    }
                    break;
            }
        } else if (extension && ['MP3', 'FLAC', 'WAV', 'OGG', 'M4A', 'AAC'].includes(extension)) {
            determinedType = extension;
        }
        setFileType(determinedType);
        logInfo(`File selected: ${selectedFile.name}`, { type: selectedFile.type, size: selectedFile.size });

        const metadataPromise = new Promise<TrackMetadata | null>((resolve) => {
            if (!window.jsmediatags) {
                logError("jsmediatags library not found.");
                resolve(null);
                return;
            }
            window.jsmediatags.read(selectedFile, {
                onSuccess: (tagObject: any) => {
                    const { title, artist, album, year, picture, genre, track, TCOM /* Composer */ } = tagObject.tags;
                    let albumArtUrl: string | undefined = undefined;
                    if (picture) {
                        let base64String = "";
                        for (let i = 0; i < picture.data.length; i++) {
                            base64String += String.fromCharCode(picture.data[i]);
                        }
                        albumArtUrl = `data:${picture.format};base64,${window.btoa(base64String)}`;
                    }
                    const parsedData: TrackMetadata = { 
                        title, 
                        artist, 
                        album, 
                        year, 
                        albumArtUrl,
                        genre,
                        track,
                        composer: TCOM,
                     };
                    logInfo("Metadata parsed successfully", parsedData);
                    resolve(parsedData);
                },
                onError: (error: any) => {
                    logError("Failed to read metadata", error);
                    resolve(null);
                }
            });
        });

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
            
            const calculatedFileInfo: FileInfo = {
                duration: decodedAudioBuffer.duration,
                sampleRate: decodedAudioBuffer.sampleRate,
                channels: decodedAudioBuffer.numberOfChannels,
                size: selectedFile.size,
                bitrate: (selectedFile.size * 8) / decodedAudioBuffer.duration
            };
            setFileInfo(calculatedFileInfo);
            logInfo("File info calculated", calculatedFileInfo);

            const [parsedMetadata, result] = await Promise.all([
                metadataPromise,
                window.BpmAnalyser.analyse(decodedAudioBuffer)
            ]);

            setMetadata(parsedMetadata);

            if (settings.useGemini && parsedMetadata?.title && parsedMetadata?.artist) {
                setLoadingSongFacts(true);
                getSongFacts(parsedMetadata.title, parsedMetadata.artist)
                    .then(facts => {
                        if (facts && facts.facts.length > 0) {
                            setSongFacts(facts);
                            logInfo("Song facts fetched", facts);
                        }
                    })
                    .catch(factError => {
                        logError("Failed to fetch song facts", factError);
                    })
                    .finally(() => {
                        setLoadingSongFacts(false);
                    });
            }

            logInfo("BPM analysis complete.", result);
            
            if (!result || result.candidates.length === 0) {
                throw new Error("BPM analysis failed to produce results.");
            }
            
            setAnalysisResult(result);
            const detectedBpm = result.candidates[0].tempo;
            setActiveBpm(detectedBpm);

            if (settings.useGemini) {
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
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during analysis.";
            setError(`Failed to process audio file. Please ensure it's a valid, non-corrupted audio file. Error: ${errorMessage}`);
            logError("Error in handleFileSelect", e);
            setAudioBuffer(null);
        } finally {
            setIsLoading(false);
        }

    }, [resetState, settings.useGemini]);
    
    const handleFeedbackSubmit = (feedback: { correctBpm: string; comments: string }) => {
        logInfo("Feedback submitted", { ...feedback, fileName: file?.name, detectedBpm: analysisResult?.candidates[0]?.tempo });
        downloadLogs();
        setIsFeedbackModalOpen(false);
    };

    const detectedBpm = analysisResult?.candidates?.[0]?.tempo;

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
            <header className="py-4 px-6 md:px-8 border-b border-gray-800 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-20">
                <h1 className="text-2xl font-bold">YBCBPM - v1.0</h1>
            </header>
            
            <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center text-center">
                <div className="w-full max-w-7xl">
                    {!file && (
                        <div className="animate-fade-in max-w-4xl mx-auto">
                            <h2 className="text-4xl font-bold mb-2">Find the Tempo of Any Song</h2>
                            <p className="text-lg text-gray-400 mb-8">Upload an audio file to get started.</p>
                            <FileUpload onFileSelect={handleFileSelect} />
                            <SettingsMenu 
                                settings={settings} 
                                onSettingsChange={handleSettingsChange}
                                onOpenFeedback={() => setIsFeedbackModalOpen(true)}
                            />
                        </div>
                    )}
                    
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center gap-4 animate-fade-in p-8">
                            <Loader />
                            <p className="text-lg text-gray-400">Analyzing "{file?.name}"...</p>
                            <p className="text-sm text-gray-500">{loadingMessage || "This might take a moment for larger files."}</p>
                        </div>
                    )}
                    
                    {error && (
                         <div className="animate-fade-in bg-red-900/50 border border-red-700 p-6 rounded-lg max-w-4xl mx-auto">
                            <h3 className="text-2xl font-bold text-red-300 mb-2">An Error Occurred</h3>
                            <p className="text-red-200 mb-6">{error}</p>
                            <button onClick={resetState} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                Try Again
                            </button>
                        </div>
                    )}

                    {analysisResult && !isLoading && !error && detectedBpm && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={resetState} className="text-blue-400 hover:text-blue-300 transition-colors text-sm">&larr; Analyze another file</button>
                                 <div className="flex items-center min-w-0">
                                    <p className="text-gray-400 text-sm font-mono truncate" title={file?.name}>{file?.name}</p>
                                    <FileTypeBadge type={fileType} />
                                 </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="w-full md:w-1/3 flex-shrink-0">
                                    <MetadataDisplay 
                                        metadata={metadata} 
                                        fileInfo={fileInfo}
                                        songFacts={songFacts}
                                        isLoadingFacts={loadingSongFacts}
                                    />
                                </div>
                                
                                <div className="w-full md:w-2/3 space-y-8">
                                    <div className="bg-gray-800/50 p-6 md:p-8 rounded-2xl border border-gray-700 shadow-xl space-y-8">
                                        <BpmDisplay 
                                            bpm={detectedBpm} 
                                            tempoVariability={analysisResult.tempoVariability}
                                            year={metadata?.year}
                                        />
                                        
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
                                            peaks={analysisResult.peaks}
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
                                    
                                    <div className="!mt-12 border-t border-gray-700 pt-8 flex flex-col items-center gap-4">
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
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            <FeedbackModal 
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSubmit={handleFeedbackSubmit}
                detectedBpm={detectedBpm}
                fileName={file?.name}
            />
        </div>
    );
};

export default App;