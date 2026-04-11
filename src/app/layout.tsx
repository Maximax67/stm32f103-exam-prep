import './globals.css';

import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';

export const metadata: Metadata = {
  title: 'STM32F103 — Підготовка до екзамену',
  description: 'Інтерактивний тренажер з STM32',
};

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-mono',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>{children}</body>
    </html>
  );
}
