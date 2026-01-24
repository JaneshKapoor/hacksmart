'use client';

import { useState, useEffect, useRef } from 'react';

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    unit?: string;
    showValue?: boolean;
    disabled?: boolean;
}

export function Slider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    unit = '',
    showValue = true,
    disabled = false,
}: SliderProps) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
            {(label || showValue) && (
                <div className="flex items-center justify-between">
                    {label && <span className="text-sm text-slate-400">{label}</span>}
                    {showValue && (
                        <span className="text-sm font-medium text-slate-200">
                            {value}{unit}
                        </span>
                    )}
                </div>
            )}
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    disabled={disabled}
                    className="
            w-full h-2 appearance-none cursor-pointer
            bg-slate-700 rounded-full
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-blue-500
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-blue-500/30
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:bg-blue-500
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            disabled:cursor-not-allowed
          "
                    style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #334155 ${percentage}%, #334155 100%)`,
                    }}
                />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function Toggle({ enabled, onChange, label, disabled = false }: ToggleProps) {
    return (
        <label
            className={`
        flex items-center gap-3 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => !disabled && onChange(!enabled)}
                disabled={disabled}
                className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${enabled ? 'bg-blue-500' : 'bg-slate-700'}
        `}
            >
                <span
                    className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-md
            transition-transform duration-200 ease-in-out
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
                />
            </button>
            {label && <span className="text-sm text-slate-300">{label}</span>}
        </label>
    );
}

interface SegmentedControlProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
    return (
        <div className="inline-flex bg-slate-800 rounded-lg p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`
            px-3 py-1.5 text-sm font-medium rounded-md
            transition-all duration-200
            ${value === option.value
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }
          `}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export function AnimatedCounter({
    value,
    duration = 800,
    decimals = 0,
    prefix = '',
    suffix = '',
    className = '',
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const previousValue = useRef(value);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const diff = endValue - startValue;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const currentValue = startValue + diff * easeOut;
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    return (
        <span className={`tabular-nums ${className}`}>
            {prefix}
            {displayValue.toFixed(decimals)}
            {suffix}
        </span>
    );
}
