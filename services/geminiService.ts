import { GoogleGenAI, Type } from '@google/genai';
import type { MusicalInsight, SongFact, TrackMetadata } from '../types';
import { logError } from './loggingService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        genres: {
            type: Type.ARRAY,
            description: "A list of 2-4 common music genres relevant to the song or its tempo.",
            items: { type: Type.STRING }
        },
        exampleSongs: {
            type: Type.ARRAY,
            description: "A list of 3 similar, well-known songs that fans of the analyzed track might also enjoy.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the song." },
                    artist: { type: Type.STRING, description: "The artist of the song." }
                },
                required: ["title", "artist"]
            }
        },
        mood: {
            type: Type.STRING,
            description: "A brief, one-sentence description of the analyzed song's general mood or feeling."
        }
    },
    required: ["genres", "exampleSongs", "mood"]
};


export const getMusicalInsights = async (bpm: number, metadata: TrackMetadata | null): Promise<MusicalInsight> => {
    try {
        let prompt = `You are a music expert. The tempo of a song is approximately ${bpm.toFixed(1)} BPM.`;

        if (metadata?.title && metadata.artist) {
            prompt = `You are a music expert analyzing the song "${metadata.title}" by "${metadata.artist}", which has a tempo of approximately ${bpm.toFixed(1)} BPM.`;
        }
        
        prompt += " Provide a brief analysis. Include common music genres for this style and tempo, three similar well-known songs that fans might enjoy, and the general mood of this song.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        return parsedJson as MusicalInsight;
    } catch (error) {
        logError("Error fetching musical insights from Gemini API", error);
        throw new Error("Failed to get musical insights from Gemini.");
    }
};

export const getSongFacts = async (title: string, artist: string): Promise<SongFact> => {
    try {
        const prompt = `You are a music historian. Provide 2-3 interesting facts or pieces of trivia about the song "${title}" by ${artist}. Focus on production details, its cultural impact, or unique information. Present the facts as a bulleted list, with each fact on a new line starting with '* '.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text;
        let facts = text.split('\n')
                          .map(line => line.trim())
                          .filter(line => line.startsWith('* '))
                          .map(line => line.substring(2).trim());

        // Fallback for when the model doesn't use bullet points
        if (facts.length === 0 && text.trim().length > 0) {
            facts = text.split('\n')
                        .map(line => line.trim())
                        .filter(Boolean)
                        .map(line => line.replace(/^[-*]\s*/, '')); // remove leading bullet points if any
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((chunk: any) => chunk.web && { uri: chunk.web.uri, title: chunk.web.title })
            .filter((source: any): source is { uri: string; title: string } => !!source);

        return { facts, sources };
    } catch (error) {
        logError("Error fetching song facts from Gemini API", error);
        // Return a non-throwing empty state so the UI doesn't break
        return { facts: [] };
    }
};