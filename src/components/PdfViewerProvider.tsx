'use client';

import { useState } from 'react';

import { PdfViewer } from '@/components/PdfViewer';
import { PdfViewerContext } from '@/context/PdfViewerContext';

export function PdfViewerProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<number | null>(null);

  return (
    <PdfViewerContext.Provider
      value={{
        openPdf: (p = 1) => setPage(p),
        closePdf: () => setPage(null),
      }}
    >
      {children}
      {page !== null && <PdfViewer page={page} onClose={() => setPage(null)} />}
    </PdfViewerContext.Provider>
  );
}
