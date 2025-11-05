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

    const backgroundClass = checked
        ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_18px_rgba(59,130,246,0.35)]'
        : 'bg-slate-600/80 hover:bg-slate-500/80';
    const knobClass = checked ? 'translate-x-5' : 'translate-x-0';

    return (
        <label htmlFor={label} className="flex items-center gap-3 cursor-pointer group" title={title}>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{label}</span>
            <div className="relative">
                <input id={label} type="checkbox" className="sr-only" checked={checked} onChange={handleToggle} />
                <div className={`block w-11 h-6 rounded-full transition-all duration-200 ${backgroundClass}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${knobClass}`}></div>
            </div>
        </label>
    );
};
