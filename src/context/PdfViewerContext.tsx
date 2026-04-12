'use client';

import { createContext, useContext } from 'react';

export interface PdfViewerContextType {
  openPdf: (page?: number) => void;
  closePdf: () => void;
}

export const PdfViewerContext = createContext<PdfViewerContextType>({
  openPdf: () => {},
  closePdf: () => {},
});

export function usePdfViewer() {
  return useContext(PdfViewerContext);
}
