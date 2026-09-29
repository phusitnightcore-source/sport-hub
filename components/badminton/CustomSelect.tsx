'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

export interface SelectOption {
    value: string;
    label: string;
    icon?: string;
    description?: string;
}

interface CustomSelectProps {
    value: string;
    onChangeAction: (value: string) => void;
    options: SelectOption[];
    label?: string;
    placeholder?: string;
    className?: string;
    icon?: string;
}

export default function CustomSelect({
    value,
    onChangeAction,
    options,
    label,
    placeholder = 'เลือกตัวเลือก...',
    className = '',
    icon
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`space-y-1.5 ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 block">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-left group"
                    style={{
                        background: 'var(--input-bg)',
                        borderColor: 'var(--input-border)',
                        color: 'var(--foreground)'
                    }}
                >
                    <div className="flex items-center gap-2.5 truncate">
                        {icon && <Icon icon={icon} className="shrink-0 transition-colors opacity-60 group-hover:text-orange-500" width={18} />}
                        {selectedOption?.icon && <Icon icon={selectedOption.icon} className="text-orange-500 shrink-0" width={18} />}
                        <span className={selectedOption ? '' : 'opacity-60 font-medium'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <Icon
                        icon="solar:alt-arrow-down-linear"
                        className={`transition-transform duration-300 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
                        width={18}
                    />
                </button>

                {isOpen && (
                    <div
                        className="absolute z-[120] w-full mt-2 rounded-2xl shadow-2xl border py-2 animate-in fade-in zoom-in-95 duration-200 origin-top overflow-hidden"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="max-h-60 overflow-y-auto scrollbar-hide">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChangeAction(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left ${
                                        value === option.value
                                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                            : 'hover:bg-[var(--gray-100)]'
                                    }`}
                                    style={{
                                        color: value === option.value ? undefined : 'var(--foreground)'
                                    }}
                                >
                                    {option.icon && (
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                            value === option.value ? 'bg-orange-500 text-white' : 'bg-[var(--gray-100)] text-[var(--muted)]'
                                        }`}>
                                            <Icon icon={option.icon} width={18} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate">{option.label}</p>
                                        {option.description && (
                                            <p className="text-[10px] font-bold opacity-60 truncate leading-tight">{option.description}</p>
                                        )}
                                    </div>
                                    {value === option.value && (
                                        <Icon icon="solar:check-circle-bold" className="text-orange-500 shrink-0" width={18} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
