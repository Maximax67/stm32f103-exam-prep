'use client';

import { AlertTriangle, Check, ChevronDown, Info, Zap } from 'lucide-react';
import React from 'react';

// ─── Select ───────────────────────────────────────────────────────────────────

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
      <label className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 pr-8 font-mono text-sm text-slate-100 transition-all hover:border-slate-600 focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-500"
        />
      </div>
      {hint && <p className="flex items-center gap-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

// ─── NumberInput ──────────────────────────────────────────────────────────────

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
      <label className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-sm text-slate-100 transition-all hover:border-slate-600 focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
      />
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function Checkbox({ label, checked, onChange, hint }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="group flex cursor-pointer items-center gap-2.5"
        onClick={() => onChange(!checked)}
      >
        <div
          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-all ${
            checked
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-600 bg-slate-800 group-hover:border-emerald-600/70'
          }`}
        >
          {checked && <Check size={10} className="stroke-3 text-slate-900" />}
        </div>
        <span className="font-mono text-sm text-slate-200">{label}</span>
      </label>
      {hint && <p className="ml-7 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

// ─── InfoBadge ────────────────────────────────────────────────────────────────

export function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-xs leading-relaxed text-amber-300/85">
      <Zap size={12} className="mt-0.5 shrink-0 text-amber-400" />
      <span>{children}</span>
    </div>
  );
}

// ─── WarningBadge ─────────────────────────────────────────────────────────────

export function WarningBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2.5 text-xs leading-relaxed text-red-400">
      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-400" />
      <span>{children}</span>
    </div>
  );
}

// ─── NoteBadge ────────────────────────────────────────────────────────────────

export function NoteBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/8 px-3 py-2.5 text-xs leading-relaxed text-sky-300/85">
      <Info size={12} className="mt-0.5 shrink-0 text-sky-400" />
      <span>{children}</span>
    </div>
  );
}

// ─── FormGrid ─────────────────────────────────────────────────────────────────

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
