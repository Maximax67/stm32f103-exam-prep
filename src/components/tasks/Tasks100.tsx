'use client';

import { useMemo, useState } from 'react';

import type { Apb1Divider, PllMultiplier, PllSource } from '@/lib/generators/advanced';
import {
  generatePwm,
  generateRccPll,
  generateTimerIrq,
  generateUartRx,
} from '@/lib/generators/advanced';
import {
  COMMON_BAUDRATES,
  COMMON_CLOCKS_MHZ,
  getPwmMapping,
  PWM_CAPABLE_PINS,
  TIMERS,
  UART_RX_PINS,
} from '@/lib/pinUtils';

import CodeDisplay from '../CodeDisplay';
import { Checkbox, FormGrid, InfoBadge, NumberInput, Select } from '../ui/FormInputs';

// ─── PWM ──────────────────────────────────────────────────────────────────────

export function Task100PWM() {
  const [pin, setPin] = useState('PA8');
  const [duty, setDuty] = useState(50);
  const [psc, setPsc] = useState(7999);
  const [arr, setArr] = useState(999);
  const [clockMhz, setClockMhz] = useState(8);

  const mapping = getPwmMapping(pin);
  const ccr = Math.round((duty / 100) * (arr + 1));
  const fPwm = useMemo(() => {
    const f = (clockMhz * 1_000_000) / ((psc + 1) * (arr + 1));
    return f >= 1 ? `${f.toFixed(2)} Гц` : `${(f * 1000).toFixed(2)} мГц`;
  }, [clockMhz, psc, arr]);

  const code = generatePwm({ pin, dutyCyclePct: duty, psc, arr, clockMhz });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="PWM пін"
          value={pin}
          onChange={setPin}
          options={PWM_CAPABLE_PINS.map((p) => {
            const m = getPwmMapping(p);
            return { value: p, label: `${p} → ${m?.timer} CH${m?.channel}` };
          })}
        />
        <Select
          label="Тактова частота (МГц)"
          value={String(clockMhz)}
          onChange={(v) => setClockMhz(Number(v))}
          options={COMMON_CLOCKS_MHZ.map((c) => ({ value: String(c), label: `${c} МГц` }))}
        />
        <NumberInput
          label="PSC"
          value={psc}
          onChange={setPsc}
          min={0}
          max={65535}
          hint={`÷${psc + 1}`}
        />
        <NumberInput
          label="ARR"
          value={arr}
          onChange={setArr}
          min={0}
          max={65535}
          hint={`÷${arr + 1}`}
        />
        <NumberInput label="Duty Cycle (%)" value={duty} onChange={setDuty} min={0} max={100} />
      </FormGrid>

      <InfoBadge>
        f_PWM ≈ <strong>{fPwm}</strong> · CCR = {ccr} / {arr + 1} = {duty}% · {mapping?.timer} CH
        {mapping?.channel} {mapping?.needsBDTR ? '(TIM1 — потрібен BDTR!)' : ''}
      </InfoBadge>

      <CodeDisplay code={code} title={`PWM ${pin}`} />
    </div>
  );
}

// ─── UART RX ──────────────────────────────────────────────────────────────────

export function Task100UARTRx() {
  const [pin, setPin] = useState('PA10');
  const [withIrq, setWithIrq] = useState(false);
  const [baudrate, setBaudrate] = useState(9600);
  const [clockMhz, setClockMhz] = useState(8);

  const entry = UART_RX_PINS.find((e) => e.pin === pin);
  const code = generateUartRx({ pin, withInterrupt: withIrq, baudrate, clockMhz });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="RX пін"
          value={pin}
          onChange={setPin}
          options={UART_RX_PINS.map((e) => ({
            value: e.pin,
            label: `${e.pin} → ${e.usart}${e.remap ? ' (remap)' : ''}`,
          }))}
        />
        <Select
          label="Частота шини (МГц)"
          value={String(clockMhz)}
          onChange={(v) => setClockMhz(Number(v))}
          options={COMMON_CLOCKS_MHZ.map((c) => ({ value: String(c), label: `${c} МГц` }))}
        />
        <Select
          label="Baudrate"
          value={String(baudrate)}
          onChange={(v) => setBaudrate(Number(v))}
          options={COMMON_BAUDRATES.map((b) => ({
            value: String(b),
            label: `${b.toLocaleString()} bps`,
          }))}
        />
        <div className="flex flex-col justify-end gap-2">
          <Checkbox
            label="З перериванням (RXNEIE)"
            checked={withIrq}
            onChange={setWithIrq}
            hint="Додає NVIC_EnableIRQ та ISR"
          />
        </div>
      </FormGrid>

      <InfoBadge>
        RX налаштовується як <strong>input pull-up</strong> (не floating!) — без підтяжки незадіяна
        лінія може генерувати хибні байти на реальних контроллерах за межами симуляторів, про це
        було в лекціях. BSRR BS встановлює ODR=1 → pull-up.
      </InfoBadge>

      <CodeDisplay code={code} title={`${entry?.usart} RX ← ${pin}${withIrq ? ' + IRQ' : ''}`} />
    </div>
  );
}

// ─── Timer IRQ ────────────────────────────────────────────────────────────────

export function Task100TimerIRQ() {
  const [timer, setTimer] = useState('TIM3');
  const [psc, setPsc] = useState(7999);
  const [arr, setArr] = useState(999);
  const [clockMhz, setClockMhz] = useState(8);

  const fOut = useMemo(() => {
    const f = (clockMhz * 1_000_000) / ((psc + 1) * (arr + 1));
    return f >= 1 ? `${f.toFixed(3)} Гц` : `${(f * 1000).toFixed(3)} мГц`;
  }, [clockMhz, psc, arr]);

  const code = generateTimerIrq({ timer, psc, arr, clockMhz });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="Таймер"
          value={timer}
          onChange={setTimer}
          options={TIMERS.map((t) => ({ value: t.name, label: t.name }))}
        />
        <Select
          label="Тактова частота (МГц)"
          value={String(clockMhz)}
          onChange={(v) => setClockMhz(Number(v))}
          options={COMMON_CLOCKS_MHZ.map((c) => ({ value: String(c), label: `${c} МГц` }))}
        />
        <NumberInput
          label="PSC"
          value={psc}
          onChange={setPsc}
          min={0}
          max={65535}
          hint={`÷${psc + 1}`}
        />
        <NumberInput
          label="ARR"
          value={arr}
          onChange={setArr}
          min={0}
          max={65535}
          hint={`÷${arr + 1}`}
        />
      </FormGrid>

      <InfoBadge>
        Переривання кожні ≈ <strong>{fOut}</strong> (Update Event = переповнення лічильника). UIE у
        DIER → UIF у SR → скинути write 1 to clear.
      </InfoBadge>

      <CodeDisplay code={code} title={`${timer} INTERRUPT`} />
    </div>
  );
}

// ─── RCC PLL ──────────────────────────────────────────────────────────────────

const MULTIPLIERS: PllMultiplier[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const APB1_DIVS: Apb1Divider[] = [1, 2, 4, 8, 16];

export function Task100RCC() {
  const [source, setSource] = useState<PllSource>('HSE');
  const [mult, setMult] = useState<PllMultiplier>(9);
  const [apb1Div, setApb1Div] = useState<Apb1Divider>(2);

  const srcMhz = source === 'HSE' ? 8 : 4;
  const sysclk = srcMhz * mult;
  const apb1Mhz = sysclk / apb1Div;
  const latency = sysclk <= 24 ? 0 : sysclk <= 48 ? 1 : 2;

  const code = generateRccPll({ source, multiplier: mult, apb1Div });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="Джерело PLL"
          value={source}
          onChange={(v) => setSource(v as PllSource)}
          options={[
            { value: 'HSE', label: 'HSE (зовнішній кварц 8 МГц)' },
            { value: 'HSI_div2', label: 'HSI/2 (внутрішній RC / 2 = 4 МГц)' },
          ]}
        />
        <Select
          label="Множник PLL (PLLMULL)"
          value={String(mult)}
          onChange={(v) => setMult(Number(v) as PllMultiplier)}
          options={MULTIPLIERS.map((m) => ({
            value: String(m),
            label: `×${m} → ${srcMhz * m} МГц`,
          }))}
        />
        <Select
          label="Дільник APB1 (PPRE1)"
          value={String(apb1Div)}
          onChange={(v) => setApb1Div(Number(v) as Apb1Divider)}
          options={APB1_DIVS.map((d) => ({
            value: String(d),
            label: d === 1 ? 'Без ділення' : `÷${d} → ${sysclk / d} МГц`,
          }))}
          hint="APB1 max 36 МГц!"
        />
      </FormGrid>

      {apb1Mhz > 36 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span>⚠️</span>
          <span>APB1 = {apb1Mhz} МГц &gt; 36 МГц — це перевищення специфікації STM32F103!</span>
        </div>
      )}

      <InfoBadge>
        SYSCLK = {srcMhz} × {mult} = <strong>{sysclk} МГц</strong> · APB1 = {apb1Mhz} МГц · Flash
        wait states: {latency}WS
      </InfoBadge>

      <CodeDisplay code={code} title="RCC PLL SETUP" />
    </div>
  );
}
