'use client';

import { Check, Copy, FileCode2 } from 'lucide-react';
import { useState } from 'react';

interface CodeDisplayProps {
  code: string;
  title?: string;
  rmRef?: string;
}

// ─── Token types ──────────────────────────────────────────────────────────────
type TokenType =
  | 'comment'
  | 'number'
  | 'periph'
  | 'register'
  | 'macro_rcc'
  | 'macro_gpio'
  | 'macro_tim'
  | 'macro_adc'
  | 'macro_usart'
  | 'macro_exti'
  | 'macro_afio'
  | 'macro_nvic'
  | 'macro_flash'
  | 'macro_other'
  | 'keyword'
  | 'string'
  | 'operator'
  | 'plain';

interface Token {
  type: TokenType;
  text: string;
}

const TOKEN_CLASS: Record<TokenType, string> = {
  comment: 'text-slate-500 italic',
  number: 'text-cyan-300',
  periph: 'text-emerald-400 font-semibold',
  register: 'text-emerald-300',
  macro_rcc: 'text-amber-300',
  macro_gpio: 'text-lime-300',
  macro_tim: 'text-sky-300',
  macro_adc: 'text-violet-300',
  macro_usart: 'text-pink-300',
  macro_exti: 'text-orange-300',
  macro_afio: 'text-teal-300',
  macro_nvic: 'text-rose-300',
  macro_flash: 'text-yellow-300',
  macro_other: 'text-amber-200',
  keyword: 'text-violet-400',
  string: 'text-orange-300',
  operator: 'text-slate-300',
  plain: 'text-slate-200',
};

function tokenizeLine(line: string): Token[] {
  // Full-line comment
  if (line.trim().startsWith('//')) {
    return [{ type: 'comment', text: line }];
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Inline comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', text: line.slice(i) });
      break;
    }

    // String literal
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== q) j++;
      tokens.push({ type: 'string', text: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Try to match an identifier or macro
    if (/[A-Za-z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);

      // Keywords
      if (
        /^(extern|if|while|return|void|char|uint16_t|uint32_t|uint8_t|int|for|else|const|static|inline)$/.test(
          word,
        )
      ) {
        tokens.push({ type: 'keyword', text: word });
        i = j;
        continue;
      }

      // Peripherals (bare names like RCC, GPIOA, TIM2, ADC1, USART1, EXTI, AFIO, NVIC, FLASH)
      // followed by -> register access
      const periphMatch = /^(RCC|GPIO[A-E]|AFIO|EXTI|TIM\d*|ADC\d*|USART\d*|FLASH|NVIC)$/.test(
        word,
      );
      if (periphMatch) {
        // Check for ->register
        if (line[j] === '-' && line[j + 1] === '>') {
          tokens.push({ type: 'periph', text: word });
          // Eat the ->
          tokens.push({ type: 'operator', text: '->' });
          let k = j + 2;
          while (k < line.length && /[A-Za-z0-9_]/.test(line[k])) k++;
          tokens.push({ type: 'register', text: line.slice(j + 2, k) });
          i = k;
        } else {
          tokens.push({ type: 'periph', text: word });
          i = j;
        }
        continue;
      }

      // Classify macros by prefix
      let macroType: TokenType = 'plain';
      if (/^RCC_/.test(word)) macroType = 'macro_rcc';
      else if (/^GPIO_BSRR_/.test(word)) macroType = 'macro_gpio';
      else if (/^GPIO_/.test(word)) macroType = 'macro_gpio';
      else if (/^TIM_/.test(word)) macroType = 'macro_tim';
      else if (/^ADC_/.test(word)) macroType = 'macro_adc';
      else if (/^USART_/.test(word)) macroType = 'macro_usart';
      else if (/^EXTI_/.test(word)) macroType = 'macro_exti';
      else if (/^AFIO_/.test(word)) macroType = 'macro_afio';
      else if (/^NVIC_/.test(word)) macroType = 'macro_nvic';
      else if (/^FLASH_/.test(word)) macroType = 'macro_flash';
      else if (/^(NVIC_EnableIRQ|NVIC_DisableIRQ|NVIC_SetPriority)$/.test(word))
        macroType = 'macro_nvic';
      // IRQ names
      else if (/IRQn$/.test(word)) macroType = 'macro_nvic';
      // Handler names
      else if (/IRQHandler$/.test(word)) macroType = 'macro_nvic';

      if (macroType !== 'plain') {
        tokens.push({ type: macroType, text: word });
        i = j;
        continue;
      }

      tokens.push({ type: 'plain', text: word });
      i = j;
      continue;
    }

    // Hex / decimal numbers
    if (/\d/.test(line[i]) || (line[i] === '0' && line[i + 1] === 'x')) {
      let j = i;
      // hex
      if (line[i] === '0' && line[i + 1] === 'x') {
        j += 2;
        while (j < line.length && /[0-9A-Fa-f]/.test(line[j])) j++;
      } else {
        while (j < line.length && /[0-9]/.test(line[j])) j++;
      }
      tokens.push({ type: 'number', text: line.slice(i, j) });
      i = j;
      continue;
    }

    // Operators / punctuation
    if (/[|&=!<>;{}()\[\],+\-*\/~^]/.test(line[i])) {
      // Multi-char operators
      const two = line.slice(i, i + 2);
      if (['|=', '&=', '!=', '==', '<=', '>=', '<<', '>>', '++', '--'].includes(two)) {
        tokens.push({ type: 'operator', text: two });
        i += 2;
      } else {
        tokens.push({ type: 'operator', text: line[i] });
        i++;
      }
      continue;
    }

    // Whitespace and anything else
    let j = i;
    while (j < line.length && !/[A-Za-z0-9_"'\/|&=!<>;{}()\[\],+\-*~^]/.test(line[j])) j++;
    if (j === i) j = i + 1;
    tokens.push({ type: 'plain', text: line.slice(i, j) });
    i = j;
  }

  return tokens;
}

function HighlightedLine({ line }: { line: string }) {
  if (line === '') return <>&nbsp;</>;
  const tokens = tokenizeLine(line);
  return (
    <>
      {tokens.map((tok, idx) => (
        <span key={idx} className={TOKEN_CLASS[tok.type]}>
          {tok.text}
        </span>
      ))}
    </>
  );
}

export default function CodeDisplay({ code, title, rmRef }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lines = code.split('\n');

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {title && (
            <span className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-slate-500 uppercase">
              <FileCode2 size={12} className="text-slate-600" />
              {title}
            </span>
          )}
          {rmRef && (
            <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-400">
              {rmRef}
            </span>
          )}
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded border border-slate-600 px-3 py-1 font-mono text-xs text-slate-400 transition-all hover:border-emerald-500 hover:text-emerald-400"
        >
          {copied ? (
            <>
              <Check size={11} />
              скопійовано
            </>
          ) : (
            <>
              <Copy size={11} />
              скопіювати
            </>
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#0a0f16]">
        {/* Terminal header */}
        <div className="flex items-center gap-1.5 border-b border-slate-700/40 bg-slate-800/50 px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 font-mono text-xs text-slate-500">main.cpp</span>

          {/* Token legend */}
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            {[
              { color: 'text-emerald-400', label: 'periph' },
              { color: 'text-amber-300', label: 'RCC' },
              { color: 'text-lime-300', label: 'GPIO' },
              { color: 'text-sky-300', label: 'TIM' },
              { color: 'text-violet-300', label: 'ADC' },
              { color: 'text-pink-300', label: 'USART' },
              { color: 'text-cyan-300', label: '0x' },
            ].map((l) => (
              <span key={l.label} className={`font-mono text-[10px] ${l.color}`}>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="group transition-colors hover:bg-slate-800/25">
                  <td className="w-10 border-r border-slate-800/60 py-0.75 pr-4 pl-4 text-right font-mono text-xs text-slate-700 select-none group-hover:text-slate-600">
                    {i + 1}
                  </td>
                  <td className="py-0.75 pr-6 pl-4 whitespace-pre">
                    <HighlightedLine line={line} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
