'use client';

import { BookOpen, ExternalLink, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const PDF_BASE = process.env.NODE_ENV === 'production' ? '/stm32f103-exam-prep' : '';

interface PdfViewerProps {
  page?: number;
  onClose: () => void;
}

export function PdfViewer({ page, onClose }: PdfViewerProps) {
  const pdfUrl = page ? `${PDF_BASE}/rm0008.pdf#page=${page}` : `${PDF_BASE}/rm0008.pdf`;

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '1024px',
          height: '90vh',
          borderRadius: '16px',
          border: '1px solid rgba(100,116,139,0.5)',
          background: '#080b0f',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-900/70 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <BookOpen size={14} className="text-violet-400" />
            <span className="font-mono text-sm font-semibold text-slate-200">RM0008</span>
            <span className="hidden text-slate-700 sm:block">·</span>
            <span className="hidden font-mono text-xs text-slate-500 sm:block">
              STM32F10xxx Reference Manual
            </span>
          </div>

          <div className="flex items-center gap-2">
            {page && page !== 1 && (
              <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-xs text-violet-300">
                с.&nbsp;{page}
              </span>
            )}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-600/80 px-2.5 py-1 font-mono text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            >
              <ExternalLink size={11} />
              <span className="hidden sm:inline">відкрити</span>
            </a>
            <button
              onClick={onClose}
              aria-label="Закрити"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-red-500/40 hover:bg-red-500/8 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <iframe
          key={page}
          src={pdfUrl}
          title="RM0008 Reference Manual"
          style={{ flex: 1, width: '100%', border: 'none', background: 'white', minHeight: 0 }}
        />
      </div>
    </div>,
    document.body,
  );
}
