'use client';

import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

import { usePdfViewer } from '@/context/PdfViewerContext';

// ─── RM Reference badge ───────────────────────────────────────────────────────

interface RmRefProps {
  section: string;
  page?: number;
  label?: string;
}

export function RmRef({ section, page, label }: RmRefProps) {
  const { openPdf } = usePdfViewer();

  return (
    <button
      onClick={() => openPdf(page ?? 1)}
      title={page ? `Відкрити RM0008, с. ${page}` : 'Відкрити RM0008'}
      className="inline-flex cursor-pointer items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-300 transition-colors hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-violet-200"
    >
      <ExternalLink size={9} />
      {label ?? `RM0008 §${section}`}
      {page ? `, с. ${page}` : ''}
    </button>
  );
}

// ─── Single named section inside the panel ────────────────────────────────────

interface ExplanationSectionProps {
  title: string;
  children: React.ReactNode;
}

export function ExplanationSection({ title, children }: ExplanationSectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="font-mono text-[10px] font-bold tracking-widest text-emerald-400/80 uppercase">
        {title}
      </h4>
      <div className="space-y-2 leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

// ─── Main collapsible panel ───────────────────────────────────────────────────

interface ExplanationPanelProps {
  children: React.ReactNode;
  title?: string;
}

export function ExplanationPanel({
  children,
  title = 'Детальне пояснення коду',
}: ExplanationPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/40">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-slate-800/50 px-4 py-3 text-left transition-colors hover:bg-slate-800/80"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-emerald-400" />
          <span className="font-mono text-xs text-slate-400">{title}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-700/40 bg-[#060a0f]">
          <div className="space-y-6 px-5 py-5 text-sm">{children}</div>
        </div>
      )}
    </div>
  );
}
