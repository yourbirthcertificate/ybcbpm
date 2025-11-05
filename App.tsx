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

const HERO_FEATURES = [
    {
        icon: '🌊',
        title: 'Waveform Explorer',
        description: 'Seek through peaks, lock onto downbeats, and watch the waveform dance in real time.'
    },
    {
        icon: '🧠',
        title: 'AI Storytelling',
        description: 'Uncover trivia and mood cues that pair with the detected tempo using Gemini insights.'
    },
    {
        icon: '🎚️',
        title: 'Metronome Sync',
        description: 'Trigger a perfectly aligned click track to feel the groove exactly as analysed.'
    },
    {
        icon: '📈',
        title: 'Confidence Visuals',
        description: 'Inspect alternate BPM candidates and understand how stable your tempo really is.'
    }
];


/**
 * Analyzes the phase of the beat grid by creating a histogram of peak timings.
 * This is more robust than relying on a single peak.
 * @param peaks - An array of peak times in seconds.
 * @param beatInterval - The duration of a single beat in seconds.
 * @returns The phase (start time of the first beat) in seconds.
 */
const findBestPhase = (peaks: number[], beatInterval: number): number => {
    if (!peaks || peaks.length < 2 || beatInterval <= 0) {
        return (peaks?.[0] || 0) % beatInterval;
    }

    const numBins = 32; // Resolution for phase histogram
    const bins = new Array(numBins).fill(0);
    const relevantPeaks = peaks.slice(0, Math.min(peaks.length, 150));

    for (const peakTime of relevantPeaks) {
        const phaseFraction = (peakTime % beatInterval) / beatInterval;
        const binIndex = Math.floor(phaseFraction * numBins);
        bins[binIndex]++;
    }

    let maxCount = -1;
    let bestBinIndex = -1;
    for (let i = 0; i < numBins; i++) {
        // Smooth histogram by considering neighboring bins
        const count = bins[i] + bins[(i + 1) % numBins] * 0.5 + bins[(i - 1 + numBins) % numBins] * 0.5;
        if (count > maxCount) {
            maxCount = count;
            bestBinIndex = i;
        }
    }

    if (bestBinIndex === -1) {
        return (peaks[0] || 0) % beatInterval;
    }
    
    const bestPhaseFraction = (bestBinIndex + 0.5) / numBins;
    return bestPhaseFraction * beatInterval;
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
    const [isAdjustingBeat, setIsAdjustingBeat] = useState(false);
    const [userOverriddenBeat, setUserOverriddenBeat] = useState<number | null>(null);

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
        setIsAdjustingBeat(false);
        setUserOverriddenBeat(null);
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
                    const fetchedInsights = await getMusicalInsights(detectedBpm, parsedMetadata);
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
    
    const handleFeedbackSubmit = (feedback: { correctBpm: string; correctKey: string; comments: string }) => {
        logInfo("Feedback submitted", { 
            ...feedback, 
            fileName: file?.name, 
            detectedBpm: analysisResult?.candidates[0]?.tempo,
            detectedKey: analysisResult?.key,
        });
        downloadLogs();
        setIsFeedbackModalOpen(false);
    };

    const detectedBpm = analysisResult?.candidates?.[0]?.tempo;

    const beatInfo = React.useMemo(() => {
        if (!activeBpm || !analysisResult?.peaks || analysisResult.peaks.length === 0) {
            return { phase: 0, interval: 0, firstBeat: 0, isUserDefined: false };
        }
        const beatInterval = 60.0 / activeBpm;
        const isUserDefined = userOverriddenBeat !== null;

        if (isUserDefined) {
            const phase = userOverriddenBeat % beatInterval;
            return { phase, interval: beatInterval, firstBeat: userOverriddenBeat, isUserDefined };
        }
        
        const phase = findBestPhase(analysisResult.peaks, beatInterval);

        // Find the first actual peak that occurs close to a beat on the grid defined by the phase
        let firstBeat = 0;
        const tolerance = beatInterval / 4; // Allow some deviation
        for (const peakTime of analysisResult.peaks) {
            const timeSincePhase = peakTime - phase;
            const remainder = timeSincePhase % beatInterval;
            if (remainder < tolerance || beatInterval - remainder < tolerance) {
                firstBeat = peakTime;
                break;
            }
        }
        // Fallback if no peak is close enough
        if (firstBeat === 0) {
            firstBeat = analysisResult.peaks[0] || 0;
        }

        return { phase, interval: beatInterval, firstBeat, isUserDefined: false };
    }, [analysisResult?.peaks, activeBpm, userOverriddenBeat]);

    const handleBeatAdjust = (time: number) => {
        setUserOverriddenBeat(time);
        setIsAdjustingBeat(false);
        logInfo(`User adjusted first beat to ${time.toFixed(3)}s`);
    };

    const handleResetBeat = () => {
        setUserOverriddenBeat(null);
        logInfo("User reset first beat adjustment.");
    };

    return (
        <div className="app-background text-white min-h-screen font-sans flex flex-col">
            <div className="diagonal-grid"></div>
            <header className="relative z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <span className="hero-badge"><span role="img" aria-hidden="true">🪄</span> Tempo Intelligence</span>
                        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-300 via-sky-300 to-purple-300 text-transparent bg-clip-text">
                            YBCBPM <span className="text-white/60 text-base align-middle">DEV MODE 🚧</span>
                        </h1>
                    </div>
                    <p className="text-sm md:text-base text-slate-300 max-w-xl md:text-right">
                        Discover the heartbeat of any track with an immersive analysis suite that feels as good as it sounds.
                    </p>
                </div>
            </header>

            <main className="relative z-10 flex-grow w-full">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
                    <div className="w-full space-y-12">
                    {!file && (
                        <section className="glass-card relative overflow-hidden animate-fade-in">
                            <div className="hero-shimmer"></div>
                            <div className="relative z-10 px-6 md:px-12 py-10 md:py-14">
                                <div className="grid lg:grid-cols-[1.15fr,1fr] gap-10 items-center">
                                    <div className="text-left space-y-6">
                                        <div className="inline-flex items-center gap-3 text-blue-200/80 uppercase tracking-[0.35em] text-xs font-semibold">
                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                                            Ready to Groove
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                                            Drop a track. Unlock its heartbeat.
                                        </h2>
                                        <p className="text-base md:text-lg text-slate-300 max-w-xl">
                                            Upload any audio file to explore tempo precision, waveform peaks, and AI-powered context that make your next mix smarter.
                                        </p>
                                        <div className="hidden lg:flex items-center gap-6 text-sm text-slate-300">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-lg">1</span>
                                                <span>Drop your song</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-lg">2</span>
                                                <span>Analyze the groove</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/20 text-lg">3</span>
                                                <span>Share the insights</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <FileUpload onFileSelect={handleFileSelect} />
                                    </div>
                                </div>

                                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {HERO_FEATURES.map((feature) => (
                                        <div key={feature.title} className="feature-card">
                                            <div className="text-2xl">{feature.icon}</div>
                                            <h3 className="mt-3 text-lg font-semibold text-white">{feature.title}</h3>
                                            <p className="mt-1 text-sm text-slate-300 leading-relaxed">{feature.description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10">
                                    <SettingsMenu
                                        settings={settings}
                                        onSettingsChange={handleSettingsChange}
                                        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
                                    />
                                </div>
                            </div>
                        </section>
                    )}
                    
                    {isLoading && (
                        <div className="glass-card flex flex-col items-center justify-center gap-4 animate-fade-in p-10 md:p-14 text-center">
                            <Loader />
                            <p className="text-lg text-slate-200 font-semibold">Analyzing "{file?.name}"...</p>
                            <p className="text-sm text-slate-400">{loadingMessage || "This might take a moment for larger files."}</p>
                        </div>
                    )}

                    {error && (
                         <div className="animate-fade-in glass-card border-red-500/30 max-w-4xl mx-auto px-8 py-10 text-center">
                            <h3 className="text-2xl font-bold text-red-300 mb-2">An Error Occurred</h3>
                            <p className="text-red-200 mb-6">{error}</p>
                            <button onClick={resetState} className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">
                                Try Again
                            </button>
                        </div>
                    )}

                    {analysisResult && !isLoading && !error && detectedBpm && (
                        <div className="animate-fade-in space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <button onClick={() => {
                                    setIsAdjustingBeat(false);
                                    resetState();
                                }} className="text-blue-300 hover:text-blue-200 transition-colors text-sm flex items-center gap-2">
                                    <span aria-hidden>&larr;</span> Analyze another file
                                </button>
                                <div className="flex items-center justify-end gap-3 min-w-0 bg-slate-900/60 border border-white/10 rounded-full px-4 py-2">
                                    <p className="text-slate-200 text-sm font-mono truncate max-w-xs sm:max-w-sm" title={file?.name}>{metadata?.title ? `${metadata.artist} - ${metadata.title}` : file?.name}</p>
                                    <FileTypeBadge type={fileType} />
                                </div>
                            </div>

                             <div className="grid lg:grid-cols-[400px,1fr] xl:grid-cols-[420px,1fr] gap-8 xl:gap-12 items-start">
                                {/* Left Column */}
                                <div className="w-full lg:sticky lg:top-8">
                                    <MetadataDisplay
                                        metadata={metadata}
                                        fileInfo={fileInfo}
                                        songFacts={songFacts}
                                        isLoadingFacts={loadingSongFacts}
                                    />
                                </div>
                                
                                {/* Right Column */}
                                <div className="w-full space-y-8">
                                    <div className="glass-card rounded-3xl p-6 md:p-7 space-y-6">
                                        <BpmDisplay
                                            bpm={detectedBpm}
                                            tempoVariability={analysisResult.tempoVariability}
                                            year={metadata?.year}
                                            firstBeatTime={beatInfo.firstBeat}
                                            isUserDefined={beatInfo.isUserDefined}
                                            isAdjusting={isAdjustingBeat}
                                            onAdjustClick={() => setIsAdjustingBeat(true)}
                                            onCancelAdjust={() => setIsAdjustingBeat(false)}
                                            onResetBeat={handleResetBeat}
                                            musicalKey={analysisResult.key}
                                            keyConfidence={analysisResult.keyConfidence}
                                        />

                                        <WaveformVisualizer
                                            audioBuffer={audioBuffer}
                                            peaks={analysisResult.peaks}
                                            duration={audioBuffer?.duration || 0}
                                            currentTime={currentTime}
                                            onSeek={(time) => setCurrentTime(time)}
                                            beatInfo={beatInfo}
                                            isAdjusting={isAdjustingBeat}
                                            onBeatAdjust={handleBeatAdjust}
                                        />

                                        <TempoControls
                                            audioBuffer={audioBuffer}
                                            detectedBpm={detectedBpm}
                                            activeBpm={activeBpm}
                                            onBpmChange={setActiveBpm}
                                            currentTime={currentTime}
                                            onTimeUpdate={setCurrentTime}
                                            beatInfo={beatInfo}
                                        />
                                    </div>

                                    <BpmAnalysisVisualizer candidates={analysisResult.candidates} detectedBpm={detectedBpm} />

                                    {loadingInsights && (
                                        <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center gap-3">
                                            <Loader small />
                                            <p className="text-slate-300">Getting AI insights...</p>
                                        </div>
                                    )}
                                    {insights && <MusicalInsights insights={insights} />}
                                    
                                    <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col items-center gap-4 text-center">
                                        <h3 className="text-lg font-semibold text-slate-100">Was the analysis incorrect?</h3>
                                        <button
                                            onClick={() => setIsFeedbackModalOpen(true)}
                                            className="bg-slate-800/80 hover:bg-slate-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            Submit Feedback
                                        </button>
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
                detectedKey={analysisResult?.key}
                fileName={file?.name}
            />
        </div>
    );
};

export default App;