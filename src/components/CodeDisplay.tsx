'use client';
import React, { useState } from 'react';

interface CodeDisplayProps {
  code: string;
  title?: string;
  rmRef?: string;
}

function highlight(line: string): React.ReactNode[] {
  if (line.trim().startsWith('//')) {
    return [
      <span key="c" className="text-slate-400 italic">
        {line}
      </span>,
    ];
  }

  // Tokenize
  const tokens: React.ReactNode[] = [];
  // Regex that matches different token types
  const re =
    /(\/\/.*$)|(0x[0-9A-Fa-f]+|\d+)|(RCC|GPIO[A-E]|AFIO|EXTI|TIM\d*|ADC\d*|USART\d*|FLASH|NVIC|GPIOA|GPIOB|GPIOC|GPIOD|GPIOE)(->[A-Za-z_\d]+)?|(RCC_[A-Z0-9_]+|GPIO_[A-Z0-9_]+|TIM_[A-Z0-9_]+|ADC_[A-Z0-9_]+|USART_[A-Z0-9_]+|EXTI_[A-Z0-9_]+|AFIO_[A-Z0-9_]+|NVIC_[A-Za-z_]+|FLASH_[A-Z0-9_]+|GPIO_BSRR_[A-Z0-9_]+)|(extern|if|while|return|void|char|uint16_t|uint32_t|int)|("|')([^"']*)("|')|(\|=|&=|=|\||&|~|\+|-|\*|\/|!|<|>|;|\{|\}|\(|\)|,)/g;

  let lastIndex = 0;
  let match;

  while ((match = re.exec(line)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      tokens.push(<span key={lastIndex}>{line.slice(lastIndex, match.index)}</span>);
    }

    const [full, comment, num, periph, regAccess, macro, kw, q1, str, q2, op] = match;

    if (comment) {
      tokens.push(
        <span key={match.index} className="text-slate-400 italic">
          {full}
        </span>,
      );
    } else if (num) {
      tokens.push(
        <span key={match.index} className="text-cyan-300">
          {full}
        </span>,
      );
    } else if (periph) {
      tokens.push(
        <span key={match.index}>
          <span className="font-semibold text-emerald-400">{periph}</span>
          {regAccess && <span className="text-emerald-300">{regAccess}</span>}
        </span>,
      );
    } else if (macro) {
      tokens.push(
        <span key={match.index} className="text-amber-300">
          {full}
        </span>,
      );
    } else if (kw) {
      tokens.push(
        <span key={match.index} className="text-violet-400">
          {full}
        </span>,
      );
    } else if (str !== undefined) {
      tokens.push(
        <span key={match.index} className="text-orange-300">
          {q1}
          {str}
          {q2}
        </span>,
      );
    } else if (op) {
      tokens.push(
        <span key={match.index} className="text-slate-300">
          {full}
        </span>,
      );
    } else {
      tokens.push(<span key={match.index}>{full}</span>);
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push(<span key={lastIndex}>{line.slice(lastIndex)}</span>);
  }

  return tokens;
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
            <span className="font-mono text-xs tracking-widest text-slate-500 uppercase">
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
          className="rounded border border-slate-600 px-3 py-1 font-mono text-xs text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-400"
        >
          {copied ? '✓ скопійовано' : 'скопіювати'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/80">
        {/* Terminal header dots */}
        <div className="flex items-center gap-1.5 border-b border-slate-700/40 bg-slate-800/60 px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 font-mono text-xs text-slate-500">main.cpp</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-800/30">
                  <td className="w-10 border-r border-slate-800 py-0.5 pr-4 pl-4 text-right text-xs text-slate-600 select-none">
                    {i + 1}
                  </td>
                  <td className="py-0.5 pr-6 pl-4 whitespace-pre text-slate-200">
                    {line === '' ? <>&nbsp;</> : highlight(line)}
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
