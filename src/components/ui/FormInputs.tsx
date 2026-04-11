'use client';

import React from 'react';

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}

export function Select({ label, value, onChange, options, hint }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-xs tracking-widest text-slate-400 uppercase">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 65535,
  hint,
}: NumberInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-xs tracking-widest text-slate-400 uppercase">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function Checkbox({ label, checked, onChange, hint }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="group flex cursor-pointer items-center gap-3">
        <div
          onClick={() => onChange(!checked)}
          className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border-2 transition-all ${
            checked
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-600 bg-slate-800 group-hover:border-emerald-600'
          }`}
        >
          {checked && (
            <svg
              className="h-3 w-3 text-slate-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        <span className="font-mono text-sm text-slate-200">{label}</span>
      </label>
      {hint && <p className="ml-8 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300/80">
      <span>⚡</span>
      <span>{children}</span>
    </div>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
