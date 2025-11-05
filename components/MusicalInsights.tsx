

import React from 'react';
import type { MusicalInsight } from '../types';

interface MusicalInsightsProps {
  insights: MusicalInsight;
}

const InsightCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="glass-card p-5 md:p-6 rounded-2xl border border-white/10">
        <h4 className="text-md font-semibold text-slate-200 mb-2">{title}</h4>
        {children}
    </div>
);


export const MusicalInsights: React.FC<MusicalInsightsProps> = ({ insights }) => {
  return (
    <div className="mt-8 text-left animate-fade-in">
        <h3 className="text-2xl font-bold text-center mb-6 text-slate-100">Musical Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard title="Common Genres">
                <ul className="list-disc list-inside text-slate-300">
                    {insights.genres.map((genre) => <li key={genre}>{genre}</li>)}
                </ul>
            </InsightCard>

            <InsightCard title="General Mood">
                <p className="text-slate-300">{insights.mood}</p>
            </InsightCard>

            <div className="md:col-span-2">
                 <InsightCard title="Similar Songs">
                    <ul className="space-y-2">
                        {insights.exampleSongs.map((song) => {
                            const searchQuery = encodeURIComponent(`${song.title} ${song.artist}`);
                            const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
                            return (
                                <li key={song.title}>
                                    <a
                                        href={youtubeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-300 hover:text-white transition-colors group inline-block"
                                        title={`Search for "${song.title}" on YouTube`}
                                    >
                                        <span className="font-semibold text-slate-100 group-hover:underline">{song.title}</span> by {song.artist}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </InsightCard>
            </div>
        </div>
    </div>
  );
};