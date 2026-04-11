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
import {
  FormGrid,
  InfoBadge,
  NoteBadge,
  NumberInput,
  Select,
  WarningBadge,
} from '../ui/FormInputs';

// ─── TIM Setup ────────────────────────────────────────────────────────────────

const TIMERS_85 = ['TIM2', 'TIM3', 'TIM4', 'TIM5'];

export function Task85Timer() {
  const [timer, setTimer] = useState('TIM3');
  const [psc, setPsc] = useState(7999);
  const [arr, setArr] = useState(999);
  const [clockMhz, setClockMhz] = useState(8);

  const fOut = useMemo(() => {
    const f = (clockMhz * 1_000_000) / ((psc + 1) * (arr + 1));
    return f >= 1 ? `${f.toFixed(3)} Гц` : `${(f * 1000).toFixed(3)} мГц`;
  }, [clockMhz, psc, arr]);

  const fCnt = useMemo(() => {
    return ((clockMhz * 1_000_000) / (psc + 1) / 1000).toFixed(2);
  }, [clockMhz, psc]);

  const code = generateTimerSetup({ timer, psc, arr, clockMhz });

  return (
    <div className="space-y-4">
      <FormGrid>
        <Select
          label="Таймер"
          value={timer}
          onChange={setTimer}
          options={TIMERS_85.map((t) => ({ value: t, label: t }))}
          hint="TIM2–TIM5 на шині APB1"
        />
        <Select
          label="Тактова частота APB (МГц)"
          value={String(clockMhz)}
          onChange={(v) => setClockMhz(Number(v))}
          options={COMMON_CLOCKS_MHZ.map((c) => ({ value: String(c), label: `${c} МГц` }))}
          hint="Якщо APB1 divider ≠ 1 → таймер ×2"
        />
        <NumberInput
          label="PSC (Prescaler)"
          value={psc}
          onChange={setPsc}
          min={0}
          max={65535}
          hint={`÷${psc + 1} → f_cnt = ${fCnt} кГц`}
        />
        <NumberInput
          label="ARR (Auto-Reload)"
          value={arr}
          onChange={setArr}
          min={0}
          max={65535}
          hint={`÷${arr + 1} → f_out ≈ ${fOut}`}
        />
      </FormGrid>

      <InfoBadge>
        <strong>f_out = f_clk ÷ (PSC+1) ÷ (ARR+1) ≈ {fOut}</strong> · Лічильник рахує 0 → ARR, потім
        скидається (Update Event). PSC і ARR — 16-бітні (0–65535).
      </InfoBadge>

      <NoteBadge>
        <strong>TIM2–TIM5</strong> — general-purpose таймери на шині <strong>APB1</strong>. Якщо
        APB1 prescaler ≠ 1 (наприклад, при 72 МГц SYSCLK та APB1÷2=36 МГц), таймери отримують
        подвоєну частоту APB1 = 72 МГц. У цьому тренажері вкажіть реальну частоту таймера, а не
        APB1.
      </NoteBadge>

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
  { value: '239_5', label: '239.5 циклів (111)' },
];

export function Task85ADC() {
  const [pin, setPin] = useState('PA1');
  const [sampleTime, setSampleTime] = useState<AdcSampleTime>('239_5');

  const ch =
    pin === 'PA0'
      ? 0
      : pin === 'PA1'
        ? 1
        : pin === 'PA2'
          ? 2
          : pin === 'PA3'
            ? 3
            : pin === 'PA4'
              ? 4
              : pin === 'PA5'
                ? 5
                : pin === 'PA6'
                  ? 6
                  : pin === 'PA7'
                    ? 7
                    : pin === 'PB0'
                      ? 8
                      : pin === 'PB1'
                        ? 9
                        : pin === 'PC0'
                          ? 10
                          : pin === 'PC1'
                            ? 11
                            : pin === 'PC2'
                              ? 12
                              : pin === 'PC3'
                                ? 13
                                : pin === 'PC4'
                                  ? 14
                                  : 15;

  const smprReg = ch >= 10 ? 'SMPR1' : 'SMPR2';
  const code = generateAdcSetup({ pin, sampleTime });

  // PC pins warning for T6
  const pcWarning =
    pin.startsWith('PC') && parseInt(pin.slice(2)) < 13
      ? `ADC CH${ch} (${pin}): GPIOC PC0–PC12 відсутні на STM32F103T6. Для ADC краще використовувати PA0–PA7 або PB0–PB1.`
      : null;

  return (
    <div className="space-y-4">
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

      {pcWarning && <WarningBadge>{pcWarning}</WarningBadge>}

      <InfoBadge>
        <strong>Розподіл регістрів SMP:</strong> CH0–CH9 → <strong>SMPR2</strong> (бітові поля
        SMPx[2:0]) · CH10–CH17 → <strong>SMPR1</strong>. Поточний канал CH{ch} →{' '}
        <strong>{smprReg}</strong>. SQR3 задає перший канал у послідовності перетворень (regular
        sequence rank 1).
      </InfoBadge>

      <NoteBadge>
        <strong>ADC clock (ADCCLK)</strong> на STM32F103 = APB2 / ADC prescaler (макс. 14 МГц!). При
        72 МГц APB2 необхідно ділити мінімум на 6 (→12 МГц) через RCC_CFGR ADCPRE. Час перетворення
        = час вибірки + 12.5 циклів ADCCLK.
      </NoteBadge>

      <CodeDisplay code={code} title={`ADC1 CH${ch} ← ${pin}`} />
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
  const brr = Math.round((clockMhz * 1_000_000) / actualBaud);
  const code = generateUartTx({ pin, baudrate: actualBaud, clockMhz });

  const brrError = brr < 1 || brr > 65535;

  return (
    <div className="space-y-4">
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

      {brrError && (
        <WarningBadge>
          BRR = {brr} виходить за межі 1–65535! Перевірте комбінацію частоти та baudrate.
        </WarningBadge>
      )}

      {entry?.remap && (
        <WarningBadge>
          Пін {pin} потребує <strong>remap</strong> через AFIO_MAPR — {entry.usart} не на
          стандартних пінах. Код включає увімкнення remap та AFIO clock.
        </WarningBadge>
      )}

      {entry && (
        <InfoBadge>
          <strong>
            BRR = {clockMhz} МГц × 10⁶ ÷ {actualBaud} = {brr}
          </strong>{' '}
          · {entry.usart} на APB{entry.apb} · TX пін → AF push-pull (MODE=11, CNF=10) · Без
          увімкнення TE та UE — USART не передаватиме даних.
        </InfoBadge>
      )}

      <NoteBadge>
        USART1 тактується від <strong>APB2</strong> (разом з GPIO), USART2 та USART3 — від{' '}
        <strong>APB1</strong> (макс. 36 МГц на 72 МГц SYSCLK). Переконайтеся, що clockMhz відповідає
        реальній частоті тієї шини, до якої підключений обраний USART.
      </NoteBadge>

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
  const pinNum = parseInt(pin.slice(2));

  const irqGroup =
    pinNum <= 4
      ? `EXTI${pinNum}_IRQn (окремий)`
      : pinNum <= 9
        ? 'EXTI9_5_IRQn (спільний для EXTI5–9)'
        : 'EXTI15_10_IRQn (спільний для EXTI10–15)';

  const edgeLabels: Record<ExtiEdge, string> = {
    rising: 'Rising edge (0→1, наростаючий)',
    falling: 'Falling edge (1→0, спадаючий)',
    both: 'Обидва фронти (both edges)',
  };

  return (
    <div className="space-y-4">
      <FormGrid>
        <Select
          label="Пін переривання"
          value={pin}
          onChange={setPin}
          options={EXTI_PINS.map((p) => ({ value: p, label: p }))}
          hint="Кожна EXTI-лінія 0–15 = лише один порт"
        />
        <Select
          label="Фронт тригера"
          value={edge}
          onChange={(v) => setEdge(v as ExtiEdge)}
          options={Object.entries(edgeLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
      </FormGrid>

      <InfoBadge>
        <strong>
          IRQ для EXTI{pinNum}: {irqGroup}
        </strong>{' '}
        · Прапорець PR скидається записом <strong>1</strong> (write-1-to-clear) — на відміну від
        більшості регістрів, де 0 скидає! Незабутий скидання → нескінченні повторні переривання.
      </InfoBadge>

      <NoteBadge>
        EXTI лінія X може бути підключена лише до <strong>одного порту</strong> (PA, PB, PC...)
        через AFIO_EXTICR. Наприклад, EXTI0 може бути або PA0, або PB0, або PC0 — але не одночасно.
        Маршрутизація виконується через AFIO, тому AFIO clock обов&apos;язковий.
      </NoteBadge>

      <CodeDisplay code={code} title={`EXTI ${pin}`} />
    </div>
  );
}
