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
        <div className="mt-8 pt-6 border-t border-gray-700/50 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm text-gray-400">
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
                className="hover:text-blue-400 transition-colors"
             >
                Feedback?
            </button>
        </div>
    );
};