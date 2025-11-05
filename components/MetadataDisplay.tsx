import React from 'react';
import type { TrackMetadata, FileInfo, SongFact } from '../types';
import { MusicIcon } from './icons/MusicIcon';
import { Loader } from './Loader';
import { formatDuration, formatFileSize, formatSampleRate, formatBitrate } from '../utils/formatters';

interface MetadataDisplayProps {
    metadata: TrackMetadata | null;
    fileInfo: FileInfo | null;
    songFacts: SongFact | null;
    isLoadingFacts: boolean;
}

const MetadataRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="flex justify-between items-baseline gap-4">
            <p className="text-sm text-gray-400 flex-shrink-0">{label}</p>
            <p className="text-sm text-white font-mono truncate text-right">{String(value)}</p>
        </div>
    );
};

const SongFactsDisplay: React.FC<{ facts: SongFact | null; isLoading: boolean }> = ({ facts, isLoading }) => {
    if (isLoading) {
        return (
            <div className="mt-4">
                <h4 className="text-lg font-bold mb-3 text-gray-200">Song Facts & Trivia</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader small />
                    <span>Fetching...</span>
                </div>
            </div>
        );
    }

    if (!facts || facts.facts.length === 0) {
        return null;
    }

    const hasSources = facts.sources && facts.sources.length > 0;

    return (
        <div className="mt-4">
            <h4 className="text-lg font-bold mb-3 text-gray-200">Song Facts & Trivia</h4>
            <ul className="space-y-3 text-gray-300 text-sm list-disc list-outside ml-4">
                {facts.facts.map((fact, index) => (
                    <li key={index}>{fact}</li>
                ))}
            </ul>

            {hasSources && (
                <div className="mt-4">
                    <h5 className="text-md font-semibold text-gray-300 mb-2">Sources</h5>
                    <ul className="space-y-1 text-sm list-decimal list-outside ml-5">
                        {facts.sources?.map((source, index) => (
                             <li key={index}>
                                <a 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-400 hover:underline break-all"
                                    title={source.uri}
                                >
                                    {source.title || new URL(source.uri).hostname}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-xs text-gray-500 italic mt-3">
                * AI-generated facts {hasSources ? "grounded by Google Search" : ""}. Accuracy is not guaranteed.
            </p>
        </div>
    );
};

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ metadata, fileInfo, songFacts, isLoadingFacts }) => {
    const { title, artist, album, year, albumArtUrl, genre, track, composer } = metadata || {};

    return (
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl text-left h-full">
            <h3 className="text-xl font-bold text-center mb-6">Track Information</h3>
            <div className="flex flex-col items-center gap-6">
                <div className="w-48 h-48 rounded-lg bg-gray-700 flex items-center justify-center shadow-lg overflow-hidden">
                    {albumArtUrl ? (
                        <img src={albumArtUrl} alt={album || 'Album art'} className="w-full h-full object-cover" />
                    ) : (
                        <MusicIcon className="w-24 h-24 text-gray-500" />
                    )}
                </div>

                <div className="w-full text-center space-y-1">
                     <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{title || 'Unknown Title'}</h4>
                     <p className="text-lg text-gray-300">{artist || 'Unknown Artist'}</p>
                </div>

                <div className="w-full border-t border-gray-700 pt-4 space-y-2">
                    <MetadataRow label="Album" value={album} />
                    <MetadataRow label="Track" value={track} />
                    <MetadataRow label="Genre" value={genre} />
                    <MetadataRow label="Year" value={year} />
                    <MetadataRow label="Composer" value={composer} />
                </div>
            </div>
            
             <div className="mt-6 w-full border-t border-gray-700 pt-4 space-y-4">
                {fileInfo && (
                    <div>
                        <h4 className="text-lg font-bold mb-3 text-gray-200">File Information</h4>
                        <div className="space-y-1">
                            <MetadataRow label="Duration" value={formatDuration(fileInfo.duration)} />
                            <MetadataRow label="File Size" value={formatFileSize(fileInfo.size)} />
                            <MetadataRow label="Bitrate" value={formatBitrate(fileInfo.bitrate)} />
                            <MetadataRow label="Sample Rate" value={formatSampleRate(fileInfo.sampleRate)} />
                            <MetadataRow label="Channels" value={fileInfo.channels === 1 ? 'Mono' : fileInfo.channels === 2 ? 'Stereo' : fileInfo.channels} />
                        </div>
                    </div>
                )}
                <SongFactsDisplay facts={songFacts} isLoading={isLoadingFacts} />
            </div>
        </div>
    );
};