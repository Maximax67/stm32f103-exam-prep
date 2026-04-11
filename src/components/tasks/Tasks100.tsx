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
import {
  Checkbox,
  FormGrid,
  InfoBadge,
  NoteBadge,
  NumberInput,
  Select,
  WarningBadge,
} from '../ui/FormInputs';

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
  const isAdvancedTimer = mapping?.timer === 'TIM1';

  return (
    <div className="space-y-4">
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

      {isAdvancedTimer && (
        <WarningBadge>
          <strong>TIM1 — Advanced-Control Timer!</strong> На відміну від TIM2–TIM5, TIM1 вимагає
          додаткового кроку: <strong>BDTR |= MOE</strong> (Main Output Enable). Без нього вихід PWM
          не з&apos;явиться на пін, навіть якщо таймер запущений.
        </WarningBadge>
      )}

      <InfoBadge>
        f_PWM ≈ <strong>{fPwm}</strong> · CCR = {ccr} / {arr + 1} = {duty}% · {mapping?.timer} CH
        {mapping?.channel}{' '}
        {mapping?.needsBDTR ? '(TIM1: потрібен BDTR→MOE!)' : '(general-purpose, без BDTR)'}
      </InfoBadge>

      <NoteBadge>
        <strong>PWM Mode 1 (OCxM=110)</strong>: вихід HIGH, поки CNT &lt; CCR; LOW після. EGR→UG
        примусово завантажує значення PSC/ARR/CCR з preload регістрів — без UG перші значення можуть
        бути некоректними. OCxPE (preload enable) дозволяє безпечне оновлення CCR під час роботи.
      </NoteBadge>

      <CodeDisplay code={code} title={`PWM ${pin} → ${mapping?.timer} CH${mapping?.channel}`} />
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
  const brr = Math.round((clockMhz * 1_000_000) / baudrate);
  const code = generateUartRx({ pin, withInterrupt: withIrq, baudrate, clockMhz });

  return (
    <div className="space-y-4">
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
            hint="Додає NVIC_EnableIRQ + ISR"
          />
        </div>
      </FormGrid>

      {entry?.remap && (
        <WarningBadge>
          Пін {pin} потребує <strong>remap</strong> через AFIO_MAPR. Код включає відповідну операцію
          з AFIO та увімкнення AFIO clock.
        </WarningBadge>
      )}

      <WarningBadge>
        <strong>RX пін — input pull-up, НЕ floating!</strong> Без підтяжки незадіяна лінія може
        &quot;плавати&quot; і генерувати хибні байти, це було на лекції. BSRR BS встановлює ODR=1 →
        pull-up ~40 кОм. Це критично на реальних контролерах — в симуляторах може здаватись що
        floating теж працює.
      </WarningBadge>

      <InfoBadge>
        BRR = {clockMhz} МГц × 10⁶ ÷ {baudrate} = <strong>{brr}</strong> · {entry?.usart} на APB
        {entry?.apb} · RE (Receiver Enable) вмикає прийом · UE (USART Enable) запускає USART · RXNE
        прапорець = є даних у DR.
      </InfoBadge>

      {withIrq && (
        <NoteBadge>
          <strong>RXNEIE переривання</strong>: спрацьовує, коли RXNE=1 (є новий байт у DR). Читання
          DR автоматично скидає RXNE. В ISR обов&apos;язково читайте DR, щоб не отримати повторне
          переривання. ORE (Overrun) — прапорець помилки, якщо DR не прочитано до наступного байту.
        </NoteBadge>
      )}

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
    <div className="space-y-4">
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
        Переривання кожні ≈ <strong>1 / {fOut}</strong> (Update Event = переповнення лічильника
        CNT→ARR→0). UIE у DIER → UIF у SR → <strong>скинути write 1 to clear</strong> (не &amp;=~!).
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

  const exceeds72 = sysclk > 72;
  const apb1Exceeds36 = apb1Mhz > 36;

  return (
    <div className="space-y-4">
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
            label: `×${m} → ${srcMhz * m} МГц${srcMhz * m > 72 ? ' ⚠' : ''}`,
          }))}
        />
        <Select
          label="Дільник APB1 (PPRE1)"
          value={String(apb1Div)}
          onChange={(v) => setApb1Div(Number(v) as Apb1Divider)}
          options={APB1_DIVS.map((d) => ({
            value: String(d),
            label:
              d === 1 ? 'Без ділення' : `÷${d} → ${sysclk / d} МГц${sysclk / d > 36 ? ' ⚠' : ''}`,
          }))}
          hint="APB1 max 36 МГц!"
        />
      </FormGrid>

      {exceeds72 && (
        <WarningBadge>
          SYSCLK = {sysclk} МГц — перевищує максимум <strong>72 МГц</strong> для STM32F103! МК буде
          нестабільним або не запуститься. Зменшіть множник PLL.
        </WarningBadge>
      )}

      {apb1Exceeds36 && !exceeds72 && (
        <WarningBadge>
          APB1 = {apb1Mhz} МГц перевищує максимум <strong>36 МГц</strong>! Периферія на APB1
          (TIM2–TIM5, USART2/3, I2C, SPI2) може працювати некоректно. Збільшіть дільник APB1.
        </WarningBadge>
      )}

      <InfoBadge>
        SYSCLK = {srcMhz} × {mult} = <strong>{sysclk} МГц</strong> · APB1 = {apb1Mhz} МГц · Flash
        wait states: <strong>{latency}WS</strong> (0WS≤24, 1WS≤48, 2WS≤72 МГц)
      </InfoBadge>

      <CodeDisplay code={code} title="RCC PLL SETUP" />
    </div>
  );
}
