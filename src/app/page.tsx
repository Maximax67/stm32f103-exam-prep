'use client';

import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Cpu,
  Radio,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  Waves,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import { Task60AF, Task60Clock, Task60Input, Task60Output } from '@/components/tasks/Tasks60';
import { Task85ADC, Task85EXTI, Task85Timer, Task85UARTTx } from '@/components/tasks/Tasks85';
import {
  Task100PWM,
  Task100RCC,
  Task100TimerIRQ,
  Task100UARTRx,
} from '@/components/tasks/Tasks100';
import { VisitorCounter } from '@/components/VisitorCounter';

type Tier = 60 | 85 | 100;

interface TaskDef {
  id: string;
  label: string;
  description: string;
  tag: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

const TASKS: Record<Tier, TaskDef[]> = {
  60: [
    {
      id: 'gpio-input',
      label: 'GPIO Input',
      description: 'Налаштувати пін як цифровий вхід',
      tag: 'CRL / CRH',
      icon: <ArrowLeft size={14} />,
      component: Task60Input,
    },
    {
      id: 'gpio-output',
      label: 'GPIO Output',
      description: 'Налаштувати пін як цифровий вихід',
      tag: 'CRL / CRH',
      icon: <ChevronRight size={14} />,
      component: Task60Output,
    },
    {
      id: 'gpio-af',
      label: 'Alternate Function',
      description: 'Налаштувати пін для периферії (UART, SPI, TIM)',
      tag: 'AF PP / OD',
      icon: <Activity size={14} />,
      component: Task60AF,
    },
    {
      id: 'gpio-clock',
      label: 'Тактування GPIO',
      description: 'Увімкнути тактування порту GPIO через RCC',
      tag: 'APB2ENR',
      icon: <Zap size={14} />,
      component: Task60Clock,
    },
  ],
  85: [
    {
      id: 'timer-setup',
      label: 'Таймер (PSC / ARR)',
      description: 'Налаштувати prescaler і auto-reload, увімкнути TIM',
      tag: 'TIMx',
      icon: <Timer size={14} />,
      component: Task85Timer,
    },
    {
      id: 'adc-setup',
      label: 'ADC',
      description: 'Канал, час вибірки, software trigger, старт',
      tag: 'ADC1',
      icon: <Waves size={14} />,
      component: Task85ADC,
    },
    {
      id: 'uart-tx',
      label: 'UART TX',
      description: 'Пін AF, BRR, увімкнути передачу',
      tag: 'USART',
      icon: <Radio size={14} />,
      component: Task85UARTTx,
    },
    {
      id: 'exti',
      label: 'EXTI',
      description: 'Налаштувати зовнішнє переривання на пін',
      tag: 'EXTI/NVIC',
      icon: <Shield size={14} />,
      component: Task85EXTI,
    },
  ],
  100: [
    {
      id: 'pwm',
      label: 'PWM',
      description: 'Генерація PWM: таймер, канал, duty cycle',
      tag: 'TIMx PWM',
      icon: <Waves size={14} />,
      component: Task100PWM,
    },
    {
      id: 'uart-rx',
      label: 'UART RX',
      description: 'RX з pull-up, опціонально — з перериванням',
      tag: 'USART RX',
      icon: <Radio size={14} />,
      component: Task100UARTRx,
    },
    {
      id: 'timer-irq',
      label: 'Переривання таймера',
      description: 'Update interrupt, NVIC, обробник',
      tag: 'DIER/NVIC',
      icon: <Timer size={14} />,
      component: Task100TimerIRQ,
    },
    {
      id: 'rcc-pll',
      label: 'RCC / PLL',
      description: 'Налаштувати PLL і переключити системну частоту',
      tag: 'RCC CFGR',
      icon: <Settings2 size={14} />,
      component: Task100RCC,
    },
  ],
};

const TIER_CFG = {
  60: {
    text: 'text-emerald-400',
    textMuted: 'text-emerald-500/60',
    border: 'border-emerald-500/30',
    borderActive: 'border-emerald-500/60',
    grad: 'from-emerald-500/10 to-transparent',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    btnOn: 'bg-emerald-500/8 border-emerald-500/40 text-emerald-300',
    dot: 'bg-emerald-400',
    desc: 'Input · Output · Alternate Function · Clock',
    icon: <Cpu size={20} />,
  },
  85: {
    text: 'text-amber-400',
    textMuted: 'text-amber-500/60',
    border: 'border-amber-500/30',
    borderActive: 'border-amber-500/60',
    grad: 'from-amber-500/10 to-transparent',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    btnOn: 'bg-amber-500/8 border-amber-500/40 text-amber-300',
    dot: 'bg-amber-400',
    desc: 'Таймер · АЦП · UART TX · Зовнішні переривання',
    icon: <Activity size={20} />,
  },
  100: {
    text: 'text-violet-400',
    textMuted: 'text-violet-500/60',
    border: 'border-violet-500/30',
    borderActive: 'border-violet-500/60',
    grad: 'from-violet-500/10 to-transparent',
    badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    btnOn: 'bg-violet-500/8 border-violet-500/40 text-violet-300',
    dot: 'bg-violet-400',
    desc: 'ШІМ · UART RX · Переривання · PLL',
    icon: <Sparkles size={20} />,
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
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-[#080b0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          {/* Logo */}
          <button
            onClick={() => {
              setTier(null);
              setTaskId(null);
            }}
            className="group flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/8 transition-colors group-hover:border-emerald-500/50 group-hover:bg-emerald-500/12">
              <Cpu size={15} className="text-emerald-400" />
            </div>
            <span className="block font-mono text-sm font-bold text-slate-100">STM32F103</span>
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
            <button
              onClick={() => {
                setTier(null);
                setTaskId(null);
              }}
              className="transition-colors hover:text-slate-400"
            >
              оцінка
            </button>
            {tier && (
              <>
                <ChevronRight size={12} className="text-slate-800" />
                <button
                  onClick={() => setTaskId(null)}
                  className={`${cfg?.text} transition-opacity hover:opacity-70`}
                >
                  {tier}б
                </button>
              </>
            )}
            {selTask && (
              <>
                <ChevronRight size={12} className="text-slate-800" />
                <span className="text-slate-400">{selTask.label}</span>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        {!tier && (
          <div className="animate-fade-up">
            <div className="mb-14 text-center">
              <h1 className="mb-4 text-4xl leading-tight font-black tracking-tight text-slate-100 sm:text-5xl">
                Підготовка до екзамену
              </h1>
              <p className="mx-auto max-w-lg leading-relaxed text-slate-500">
                Інтерактивний тренажер. Змінюйте параметри — код генерується миттєво з коментарями
                до кожного регістру.
              </p>
            </div>

            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {([60, 85, 100] as Tier[]).map((t, i) => {
                const c = TIER_CFG[t];
                return (
                  <button
                    key={t}
                    onClick={() => pickTier(t)}
                    className="animate-fade-up group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all duration-300 hover:border-slate-700 hover:bg-slate-800/50"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div
                      className={`absolute inset-0 bg-linear-to-br ${c.grad} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                    />

                    <div className="relative">
                      <div className="mb-4 flex items-start justify-between">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${c.border} bg-slate-900/80 ${c.text}`}
                        >
                          {c.icon}
                        </div>
                        <span
                          className={`font-mono text-3xl font-black ${c.text} transition-transform duration-200 group-hover:scale-105`}
                        >
                          {t}
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed text-slate-600">{c.desc}</div>

                      {/* Arrow */}
                      <div
                        className={`mt-4 flex items-center gap-1 font-mono text-xs ${c.textMuted} transition-all group-hover:gap-2`}
                      >
                        <span>обрати</span>
                        <ChevronRight size={11} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Tier view ────────────────────────────────────────────────────── */}
        {tier && cfg && (
          <div className="animate-fade-in">
            {/* Tier title row */}
            <div className="mb-7 flex items-center gap-4">
              <button
                onClick={() => {
                  setTier(null);
                  setTaskId(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-300"
              >
                <ArrowLeft size={15} />
              </button>
              <div>
                <span className={`font-mono text-xl font-black ${cfg.text}`}>{tier} балів</span>
                <p className="mt-0.5 font-mono text-xs text-slate-600">{cfg.desc}</p>
              </div>

              {/* Quick tier switch */}
              <div className="ml-auto flex gap-2">
                {([60, 85, 100] as Tier[])
                  .filter((t) => t !== tier)
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => pickTier(t)}
                      className={`rounded-lg border border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-500 transition-colors hover:border-slate-600 hover:${TIER_CFG[t].text}`}
                    >
                      {t}б
                    </button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
              {/* Task menu */}
              <div className="flex flex-col gap-2">
                {tasks.map((task) => {
                  const isActive = taskId === task.id;
                  return (
                    <button
                      key={task.id}
                      onClick={() => setTaskId(task.id)}
                      className={`group w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                        isActive
                          ? cfg.btnOn
                          : 'border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 shrink-0 transition-colors ${isActive ? cfg.text : 'text-slate-700 group-hover:text-slate-500'}`}
                          >
                            {task.icon}
                          </span>
                          <div>
                            <div
                              className={`font-mono text-sm font-semibold ${isActive ? cfg.text : ''}`}
                            >
                              {task.label}
                            </div>
                            <div className="mt-0.5 text-xs leading-relaxed text-slate-600">
                              {task.description}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                            isActive ? cfg.badge : 'border-slate-800 bg-slate-800/60 text-slate-700'
                          }`}
                        >
                          {task.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Config + Code panel */}
              <div>
                {!taskId ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-4 text-center">
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl border ${cfg.border} ${cfg.text}`}
                    >
                      {cfg.icon}
                    </div>
                    <span className={`font-mono text-2xl font-black ${cfg.text} mb-1`}>
                      {tier} балів
                    </span>
                    <p className="text-sm text-slate-600">Оберіть тип завдання зліва</p>
                  </div>
                ) : (
                  TaskComp && (
                    <div className="animate-fade-up rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
                      <TaskComp />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-slate-800/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-8 px-5">
          {/* Visitor Counter */}
          <div className={`flex flex-col items-center ${tier ? 'hidden' : ''}`}>
            <VisitorCounter name="stm32f103-exam-prep" darkmode />
          </div>

          {/* Labels */}
          <div className="flex flex-col items-center gap-3 font-mono text-xs text-slate-500 sm:flex-row sm:gap-4">
            <div className="flex items-center gap-2 transition-colors">
              <Cpu size={14} />
              <span>STM32F103 CMSIS bare-metal</span>
            </div>
            <span className="hidden text-slate-700 sm:block">•</span>
            <span className="transition-colors">ІП-24 Бєліков Максим</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
