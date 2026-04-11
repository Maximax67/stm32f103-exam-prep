import './globals.css';

import type { Metadata } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://maximax67.github.io/stm32f103-exam-prep/'
    : 'http://localhost:3000';

const ICONS_PREFIX = process.env.NODE_ENV === 'production' ? '/stm32f103-exam-prep' : '';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'STM32F103 — Підготовка до екзамену',
    template: '%s · STM32F103',
  },
  description:
    'Інтерактивний тренажер для підготовки до екзамену з мікропроцесорів. STM32F103, CMSIS bare-metal: GPIO, TIM, ADC, UART, EXTI, PWM, PLL. Код генерується миттєво.',
  keywords: [
    'STM32F103',
    'CMSIS',
    'GPIO',
    'microcontroller',
    'exam',
    'embedded',
    'ARM',
    'Cortex-M3',
  ],
  authors: [{ name: 'Bielikov Maksym' }],
  openGraph: {
    title: 'STM32F103 — Підготовка до екзамену',
    description: 'Інтерактивний тренажер: GPIO, TIM, ADC, UART, EXTI, PWM, PLL. CMSIS bare-metal.',
    type: 'website',
    locale: 'uk_UA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STM32F103 — Підготовка до екзамену',
    description: 'Інтерактивний тренажер CMSIS bare-metal для STM32F103',
  },
};

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-mono',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className="dark">
      <head>
        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href={`${ICONS_PREFIX}/favicon-96x96.png`}
        />
        <link rel="icon" href={`${ICONS_PREFIX}/favicon.svg`} type="image/svg+xml" sizes="any" />
        <link rel="icon" href={`${ICONS_PREFIX}/favicon.ico`} />
        <link rel="apple-touch-icon" href={`${ICONS_PREFIX}/apple-touch-icon.png`} />
      </head>
      <body className={`${ibmPlexSans.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
