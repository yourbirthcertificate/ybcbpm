import React from 'react';

interface ToggleSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    title?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, title }) => {
    const handleToggle = () => {
        onChange(!checked);
    };

    const backgroundClass = checked ? 'bg-blue-600' : 'bg-gray-600';
    const knobClass = checked ? 'translate-x-5' : 'translate-x-0';

    return (
        <label htmlFor={label} className="flex items-center cursor-pointer group" title={title}>
            <span className="mr-3 text-gray-400 group-hover:text-white transition-colors">{label}</span>
            <div className="relative">
                <input id={label} type="checkbox" className="sr-only" checked={checked} onChange={handleToggle} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${backgroundClass}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${knobClass}`}></div>
            </div>
        </label>
    );
};
