'use client';

import { useMemo, useState } from 'react';

import type { AdcSampleTime, ExtiEdge } from '@/lib/generators/peripherals';
import {
  generateAdcSetup,
  generateExti,
  generateTimerSetup,
  generateUartTx,
} from '@/lib/generators/peripherals';
import {
  ADC_CAPABLE_PINS,
  COMMON_BAUDRATES,
  COMMON_CLOCKS_MHZ,
  UART_TX_PINS,
} from '@/lib/pinUtils';

import CodeDisplay from '../CodeDisplay';
import { FormGrid, InfoBadge, NumberInput, Select } from '../ui/FormInputs';

// ─── TIM Setup ────────────────────────────────────────────────────────────────

export function Task85Timer() {
  const [timer, setTimer] = useState('TIM3');
  const [psc, setPsc] = useState(7999);
  const [arr, setArr] = useState(999);
  const [clockMhz, setClockMhz] = useState(8);

  const fOut = useMemo(() => {
    const f = (clockMhz * 1_000_000) / ((psc + 1) * (arr + 1));
    return f >= 1 ? `${f.toFixed(3)} Гц` : `${(f * 1000).toFixed(3)} мГц`;
  }, [clockMhz, psc, arr]);

  const code = generateTimerSetup({ timer, psc, arr, clockMhz });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="Таймер"
          value={timer}
          onChange={setTimer}
          options={['TIM2', 'TIM3', 'TIM4', 'TIM5'].map((t) => ({ value: t, label: t }))}
          hint="TIM2–TIM5 на шині APB1"
        />
        <Select
          label="Тактова частота APB (МГц)"
          value={String(clockMhz)}
          onChange={(v) => setClockMhz(Number(v))}
          options={COMMON_CLOCKS_MHZ.map((c) => ({ value: String(c), label: `${c} МГц` }))}
        />
        <NumberInput
          label="PSC (Prescaler)"
          value={psc}
          onChange={setPsc}
          min={0}
          max={65535}
          hint={`÷ ${psc + 1}`}
        />
        <NumberInput
          label="ARR (Auto-Reload)"
          value={arr}
          onChange={setArr}
          min={0}
          max={65535}
          hint={`÷ ${arr + 1}`}
        />
      </FormGrid>

      <InfoBadge>
        f_out = f_clk / ((PSC+1) × (ARR+1)) ≈ <strong>{fOut}</strong>
      </InfoBadge>

      <CodeDisplay code={code} title={`${timer} SETUP`} />
    </div>
  );
}

// ─── ADC Setup ────────────────────────────────────────────────────────────────

const SAMPLE_TIMES: { value: AdcSampleTime; label: string }[] = [
  { value: '1_5', label: '1.5 циклів (000)' },
  { value: '7_5', label: '7.5 циклів (001)' },
  { value: '13_5', label: '13.5 циклів (010)' },
  { value: '28_5', label: '28.5 циклів (011)' },
  { value: '41_5', label: '41.5 циклів (100)' },
  { value: '55_5', label: '55.5 циклів (101)' },
  { value: '71_5', label: '71.5 циклів (110)' },
  { value: '239_5', label: '239.5 циклів (111) — макс.' },
];

export function Task85ADC() {
  const [pin, setPin] = useState('PA1');
  const [sampleTime, setSampleTime] = useState<AdcSampleTime>('239_5');

  const code = generateAdcSetup({ pin, sampleTime });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="Пін (ADC-канал)"
          value={pin}
          onChange={setPin}
          options={ADC_CAPABLE_PINS.map((p) => ({ value: p, label: p }))}
          hint="PA0–PA7=CH0–7, PB0=CH8, PB1=CH9, PC0–PC5=CH10–15"
        />
        <Select
          label="Час вибірки (SMP)"
          value={sampleTime}
          onChange={(v) => setSampleTime(v as AdcSampleTime)}
          options={SAMPLE_TIMES}
          hint="Більше = точніше, але повільніше"
        />
      </FormGrid>

      <InfoBadge>
        CH0–CH9 → регістр SMPR2 · CH10–CH17 → регістр SMPR1. SQR3 задає перший канал у послідовності
        перетворень.
      </InfoBadge>

      <CodeDisplay code={code} title={`ADC1 CH${pin}`} />
    </div>
  );
}

// ─── UART TX ──────────────────────────────────────────────────────────────────

export function Task85UARTTx() {
  const [pin, setPin] = useState('PA9');
  const [baudrate, setBaudrate] = useState(9600);
  const [clockMhz, setClockMhz] = useState(8);
  const [customBaud, setCustomBaud] = useState(false);
  const [baudInput, setBaudInput] = useState(9600);

  const actualBaud = customBaud ? baudInput : baudrate;
  const entry = UART_TX_PINS.find((e) => e.pin === pin);
  const code = generateUartTx({ pin, baudrate: actualBaud, clockMhz });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="TX пін"
          value={pin}
          onChange={setPin}
          options={UART_TX_PINS.map((e) => ({
            value: e.pin,
            label: `${e.pin} → ${e.usart}${e.remap ? ' (remap)' : ''}`,
          }))}
        />
        <Select
          label="Частота шини (МГц)"
          value={String(clockMhz)}
          onChange={(v) => setClockMhz(Number(v))}
          options={COMMON_CLOCKS_MHZ.map((c) => ({ value: String(c), label: `${c} МГц` }))}
          hint="USART1 на APB2, USART2/3 на APB1"
        />
        <Select
          label="Baudrate"
          value={customBaud ? 'custom' : String(baudrate)}
          onChange={(v) => {
            if (v === 'custom') {
              setCustomBaud(true);
            } else {
              setCustomBaud(false);
              setBaudrate(Number(v));
            }
          }}
          options={[
            ...COMMON_BAUDRATES.map((b) => ({
              value: String(b),
              label: `${b.toLocaleString()} bps`,
            })),
            { value: 'custom', label: 'Інший...' },
          ]}
        />
        {customBaud && (
          <NumberInput
            label="Baudrate (власний)"
            value={baudInput}
            onChange={setBaudInput}
            min={300}
            max={4500000}
          />
        )}
      </FormGrid>

      {entry?.remap && (
        <InfoBadge>
          Пін {pin} потребує remap через AFIO_MAPR — {entry.usart} не на стандартних пінах.
        </InfoBadge>
      )}

      {entry && (
        <InfoBadge>
          BRR = {clockMhz} МГц × 10⁶ / {actualBaud} ={' '}
          {Math.round((clockMhz * 1_000_000) / actualBaud)}
          &nbsp;· {entry.usart} на APB{entry.apb}
        </InfoBadge>
      )}

      <CodeDisplay code={code} title={`${entry?.usart} TX → ${pin}`} />
    </div>
  );
}

// ─── EXTI ─────────────────────────────────────────────────────────────────────

const EXTI_PINS = [
  'PA0',
  'PA1',
  'PA4',
  'PA5',
  'PA8',
  'PA9',
  'PB0',
  'PB1',
  'PB5',
  'PB12',
  'PC13',
  'PC14',
];

export function Task85EXTI() {
  const [pin, setPin] = useState('PC13');
  const [edge, setEdge] = useState<ExtiEdge>('falling');

  const code = generateExti({ pin, edge });

  const edgeLabels: Record<ExtiEdge, string> = {
    rising: 'Rising edge (0→1)',
    falling: 'Falling edge (1→0)',
    both: 'Обидва фронти',
  };

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="Пін переривання"
          value={pin}
          onChange={setPin}
          options={EXTI_PINS.map((p) => ({ value: p, label: p }))}
          hint="Кожна EXTI-лінія (0–15) може бути тільки одного порту"
        />
        <Select
          label="Фронт тригера"
          value={edge}
          onChange={(v) => setEdge(v as ExtiEdge)}
          options={Object.entries(edgeLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
      </FormGrid>

      <InfoBadge>
        EXTI5–9 → один спільний IRQ (EXTI9_5_IRQn) · EXTI10–15 → EXTI15_10_IRQn. Прапорець
        скидається записом 1 (write 1 to clear) у PR.
      </InfoBadge>

      <CodeDisplay code={code} title={`EXTI ${pin}`} />
    </div>
  );
}
