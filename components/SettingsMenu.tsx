import React from 'react';
import type { Settings } from '../types';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingsMenuProps {
    settings: Settings;
    onSettingsChange: (newSettings: Partial<Settings>) => void;
    onOpenFeedback: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ settings, onSettingsChange, onOpenFeedback }) => {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-6 flex flex-wrap justify-center items-center gap-5 text-sm text-slate-200 shadow-lg shadow-blue-900/20">
            <ToggleSwitch
                label="Gemini AI Features"
                checked={settings.useGemini}
                onChange={(checked) => onSettingsChange({ useGemini: checked })}
                title="Enables song facts and musical insights."
            />
            <ToggleSwitch
                label="Debug Mode"
                checked={settings.debugMode}
                onChange={(checked) => onSettingsChange({ debugMode: checked })}
                title="Enables additional debugging information."
            />
            <ToggleSwitch
                label="Verbose Logging"
                checked={settings.verboseLogging}
                onChange={(checked) => onSettingsChange({ verboseLogging: checked })}
                title="Prints detailed logs to the browser console."
            />
            <button
                onClick={onOpenFeedback}
                className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-slate-200 hover:border-blue-400/40 hover:text-blue-200 transition-colors"
            >
                Feedback?
            </button>
        </div>
    );
};