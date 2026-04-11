'use client';

import { useState } from 'react';

import { Task60AF, Task60Clock, Task60Input, Task60Output } from '@/components/tasks/Tasks60';
import { Task85ADC, Task85EXTI, Task85Timer, Task85UARTTx } from '@/components/tasks/Tasks85';
import {
  Task100PWM,
  Task100RCC,
  Task100TimerIRQ,
  Task100UARTRx,
} from '@/components/tasks/Tasks100';

type Tier = 60 | 85 | 100;

interface TaskDef {
  id: string;
  label: string;
  description: string;
  tag: string;
  component: React.ComponentType;
}

const TASKS: Record<Tier, TaskDef[]> = {
  60: [
    {
      id: 'gpio-input',
      label: 'GPIO Input',
      description: 'Налаштувати пін як цифровий вхід',
      tag: 'CRL / CRH',
      component: Task60Input,
    },
    {
      id: 'gpio-output',
      label: 'GPIO Output',
      description: 'Налаштувати пін як цифровий вихід',
      tag: 'CRL / CRH',
      component: Task60Output,
    },
    {
      id: 'gpio-af',
      label: 'Alternate Function',
      description: 'Налаштувати пін для периферії (UART, SPI, TIM)',
      tag: 'AF PP / OD',
      component: Task60AF,
    },
    {
      id: 'gpio-clock',
      label: 'Тактування GPIO',
      description: 'Увімкнути тактування порту GPIO через RCC',
      tag: 'APB2ENR',
      component: Task60Clock,
    },
  ],
  85: [
    {
      id: 'timer-setup',
      label: 'Таймер (PSC / ARR)',
      description: 'Налаштувати prescaler і auto-reload, увімкнути TIM',
      tag: 'TIMx',
      component: Task85Timer,
    },
    {
      id: 'adc-setup',
      label: 'ADC',
      description: 'Канал, час вибірки, software trigger, старт',
      tag: 'ADC1',
      component: Task85ADC,
    },
    {
      id: 'uart-tx',
      label: 'UART TX',
      description: 'Пін AF, BRR, увімкнути передачу',
      tag: 'USART',
      component: Task85UARTTx,
    },
    {
      id: 'exti',
      label: 'EXTI',
      description: 'Налаштувати зовнішнє переривання на пін',
      tag: 'EXTI/NVIC',
      component: Task85EXTI,
    },
  ],
  100: [
    {
      id: 'pwm',
      label: 'PWM',
      description: 'Генерація PWM: таймер, канал, duty cycle',
      tag: 'TIMx PWM',
      component: Task100PWM,
    },
    {
      id: 'uart-rx',
      label: 'UART RX',
      description: 'RX з pull-up, опціонально — з перериванням',
      tag: 'USART RX',
      component: Task100UARTRx,
    },
    {
      id: 'timer-irq',
      label: 'Переривання таймера',
      description: 'Update interrupt, NVIC, обробник',
      tag: 'DIER/NVIC',
      component: Task100TimerIRQ,
    },
    {
      id: 'rcc-pll',
      label: 'RCC / PLL',
      description: 'Налаштувати PLL і переключити системну частоту',
      tag: 'RCC CFGR',
      component: Task100RCC,
    },
  ],
};

const TIER_CFG = {
  60: {
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    grad: 'from-emerald-500/15 to-emerald-600/5',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    btnOn: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300',
    sub: 'GPIO',
  },
  85: {
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    grad: 'from-amber-500/15 to-amber-600/5',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    btnOn: 'bg-amber-500/10 border-amber-500/50 text-amber-300',
    sub: 'TIM · ADC · UART · EXTI',
  },
  100: {
    text: 'text-violet-400',
    border: 'border-violet-500/40',
    grad: 'from-violet-500/15 to-violet-600/5',
    badge: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    btnOn: 'bg-violet-500/10 border-violet-500/50 text-violet-300',
    sub: 'PWM · UART RX · IRQ · PLL',
  },
} as const;

export default function Home() {
  const [tier, setTier] = useState<Tier | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const tasks = tier ? TASKS[tier] : [];
  const cfg = tier ? TIER_CFG[tier] : null;
  const selTask = tasks.find((t) => t.id === taskId);
  const TaskComp = selTask?.component ?? null;

  function pickTier(t: Tier) {
    setTier(t);
    setTaskId(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
                <path
                  strokeLinecap="round"
                  d="M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3M9 4v3M12 4v3M15 4v3M9 17v3M12 17v3M15 17v3"
                />
              </svg>
            </div>
            <div>
              <span className="font-mono text-sm font-bold text-slate-100">STM32F103</span>
              <span className="ml-3 hidden font-mono text-xs text-slate-600 sm:inline">
                Підготовка до екзамену · CMSIS
              </span>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
            <span
              onClick={() => {
                setTier(null);
                setTaskId(null);
              }}
              className="cursor-pointer transition-colors hover:text-slate-400"
            >
              оцінка
            </span>
            {tier && (
              <>
                <span className="text-slate-800">/</span>
                <span
                  onClick={() => setTaskId(null)}
                  className={`cursor-pointer ${cfg?.text} transition-opacity hover:opacity-70`}
                >
                  {tier}б
                </span>
              </>
            )}
            {selTask && (
              <>
                <span className="text-slate-800">/</span>
                <span className="text-slate-300">{selTask.label}</span>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        {/* ─── Tier picker ─────────────────────────────────────────────────── */}
        {!tier && (
          <div className="animate-fade-up">
            <div className="mb-14 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-1.5 font-mono text-xs text-emerald-400/80">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                rm0008 · Посилання на розділи в коментарях
              </div>
              <h2 className="mb-4 text-4xl leading-tight font-black tracking-tight text-slate-100 sm:text-5xl">
                Оберіть рівень завдання
              </h2>
              <p className="mx-auto max-w-lg leading-relaxed text-slate-500">
                На екзамені — один білет із трьох варіантів. Тренуйтесь змінювати параметри: код
                генерується миттєво.
              </p>
            </div>

            <div className="mx-auto grid max-w-xl grid-cols-3 gap-4">
              {([60, 85, 100] as Tier[]).map((t, i) => {
                const c = TIER_CFG[t];
                return (
                  <button
                    key={t}
                    onClick={() => pickTier(t)}
                    className="animate-fade-up group flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-800 bg-slate-900/50 px-4 py-8 transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/60"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className={`font-mono text-5xl font-black ${c.text} transition-transform duration-200 group-hover:scale-105`}
                    >
                      {t}
                    </span>
                    <span className="font-mono text-xs text-slate-600 group-hover:text-slate-500">
                      балів
                    </span>
                    <div className="h-px w-6 bg-slate-800 transition-colors group-hover:bg-slate-600" />
                    <span className="text-center text-xs leading-relaxed text-slate-600">
                      {c.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Tier view ───────────────────────────────────────────────────── */}
        {tier && cfg && (
          <div className="animate-fade-in">
            {/* Tier title row */}
            <div className="mb-7 flex items-center gap-4">
              <button
                onClick={() => {
                  setTier(null);
                  setTaskId(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 font-mono text-sm text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-300"
              >
                ←
              </button>
              <div>
                <h2 className={`font-mono text-2xl font-black ${cfg.text}`}>{tier} балів</h2>
                <p className="font-mono text-xs text-slate-600">{cfg.sub}</p>
              </div>

              {/* Quick tier switch */}
              <div className="ml-auto flex gap-2">
                {([60, 85, 100] as Tier[])
                  .filter((t) => t !== tier)
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => pickTier(t)}
                      className={`rounded-lg border border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-500 hover:${TIER_CFG[t].text} transition-colors hover:border-slate-600`}
                    >
                      {t}б
                    </button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
              {/* Task menu */}
              <div className="flex flex-col gap-2">
                <p className="mb-1 px-1 font-mono text-xs tracking-widest text-slate-700 uppercase">
                  Тип завдання
                </p>
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setTaskId(task.id)}
                    className={`w-full rounded-xl border bg-slate-900/60 px-4 py-3 text-left transition-all duration-200 ${
                      taskId === task.id
                        ? cfg.btnOn
                        : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div
                          className={`font-mono text-sm font-semibold ${taskId === task.id ? cfg.text : ''}`}
                        >
                          {task.label}
                        </div>
                        <div className="mt-0.5 text-xs leading-relaxed text-slate-600">
                          {task.description}
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 font-mono text-xs ${taskId === task.id ? cfg.badge : 'border-slate-700 bg-slate-800/60 text-slate-700'}`}
                      >
                        {task.tag}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Config + Code panel */}
              <div>
                {!taskId ? (
                  <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 text-center">
                    <span className={`font-mono text-4xl font-black ${cfg.text} mb-2`}>{tier}</span>
                    <p className="text-sm text-slate-600">Оберіть тип завдання</p>
                  </div>
                ) : (
                  TaskComp && (
                    <div className="animate-fade-up">
                      {/* Task header band */}
                      <div
                        className={`bg-linear-to-r ${cfg.grad} border ${cfg.border} mb-5 flex items-start justify-between gap-4 rounded-2xl px-5 py-4`}
                      >
                        <div>
                          <h3 className={`font-mono text-lg font-bold ${cfg.text}`}>
                            {selTask?.label}
                          </h3>
                          <p className="mt-0.5 text-sm text-slate-400">{selTask?.description}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs ${cfg.badge}`}
                        >
                          {selTask?.tag}
                        </span>
                      </div>

                      {/* Controls + code */}
                      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
                        <TaskComp />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-slate-800/50 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 font-mono text-xs text-slate-400">
          <span>STM32F103 · CMSIS</span>
          <span>ІП-24 Бєліков Максим</span>
        </div>
      </footer>
    </div>
  );
}
