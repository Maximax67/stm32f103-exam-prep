'use client';

import { useState } from 'react';

import type { AFType, InputMode, OutputSpeed, OutputType } from '@/lib/generators/gpio';
import {
  generateGpioAF,
  generateGpioClock,
  generateGpioInput,
  generateGpioOutput,
} from '@/lib/generators/gpio';
import { ALL_GPIO_PINS } from '@/lib/pinUtils';

import CodeDisplay from '../CodeDisplay';
import { Checkbox, FormGrid, InfoBadge, Select } from '../ui/FormInputs';

const PIN_OPTS = ALL_GPIO_PINS.slice(0, 48).map((p) => ({ value: p, label: p }));

// ─── GPIO Input ───────────────────────────────────────────────────────────────

export function Task60Input() {
  const [pin, setPin] = useState('PA0');
  const [mode, setMode] = useState<InputMode>('floating');

  const code = generateGpioInput({ pin, mode });

  const modeLabels: Record<InputMode, string> = {
    floating: 'Floating (плаваючий вхід)',
    pullup: 'Pull-up (підтяжка до VCC)',
    pulldown: 'Pull-down (підтяжка до GND)',
    analog: 'Analog (аналоговий, для ADC)',
  };

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select label="Пін" value={pin} onChange={setPin} options={PIN_OPTS} />
        <Select
          label="Режим входу"
          value={mode}
          onChange={(v) => setMode(v as InputMode)}
          options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
        />
      </FormGrid>

      {mode === 'analog' && (
        <InfoBadge>
          Аналоговий режим використовується перед ADC. Пін повністю відключений від цифрової логіки.
        </InfoBadge>
      )}
      {mode === 'pullup' && (
        <InfoBadge>Pull-up: BSRR BS (Bit Set) → ODR=1 → внутрішній резистор до VCC.</InfoBadge>
      )}
      {mode === 'pulldown' && (
        <InfoBadge>Pull-down: BSRR BR (Bit Reset) → ODR=0 → внутрішній резистор до GND.</InfoBadge>
      )}

      <CodeDisplay code={code} title={`${pin} → INPUT`} />
    </div>
  );
}

// ─── GPIO Output ──────────────────────────────────────────────────────────────

export function Task60Output() {
  const [pin, setPin] = useState('PA5');
  const [speed, setSpeed] = useState<OutputSpeed>('10mhz');
  const [type, setType] = useState<OutputType>('pushpull');

  const code = generateGpioOutput({ pin, speed, type });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select label="Пін" value={pin} onChange={setPin} options={PIN_OPTS} />
        <Select
          label="Швидкість (MODE)"
          value={speed}
          onChange={(v) => setSpeed(v as OutputSpeed)}
          options={[
            { value: '10mhz', label: '10 МГц (MODE=01)' },
            { value: '2mhz', label: '2 МГц (MODE=10)' },
            { value: '50mhz', label: '50 МГц (MODE=11)' },
          ]}
          hint="Вища швидкість = більше EMI та споживання"
        />
        <Select
          label="Тип виходу (CNF)"
          value={type}
          onChange={(v) => setType(v as OutputType)}
          options={[
            { value: 'pushpull', label: 'Push-pull (CNF=00)' },
            { value: 'opendrain', label: 'Open-drain (CNF=01)' },
          ]}
          hint="Open-drain потребує зовнішнього pull-up резистора"
        />
      </FormGrid>

      {type === 'opendrain' && (
        <InfoBadge>
          Open-drain: пін може тягнути до GND або бути у Hi-Z. Зовнішній pull-up обов&apos;язковий.
        </InfoBadge>
      )}

      <CodeDisplay code={code} title={`${pin} → OUTPUT`} />
    </div>
  );
}

// ─── GPIO Alternate Function ──────────────────────────────────────────────────

export function Task60AF() {
  const [pin, setPin] = useState('PA9');
  const [speed, setSpeed] = useState<OutputSpeed>('50mhz');
  const [type, setType] = useState<AFType>('afpp');

  const code = generateGpioAF({ pin, speed, type });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select label="Пін" value={pin} onChange={setPin} options={PIN_OPTS} />
        <Select
          label="Швидкість (MODE)"
          value={speed}
          onChange={(v) => setSpeed(v as OutputSpeed)}
          options={[
            { value: '10mhz', label: '10 МГц (MODE=01)' },
            { value: '2mhz', label: '2 МГц (MODE=10)' },
            { value: '50mhz', label: '50 МГц (MODE=11)' },
          ]}
          hint="Для USART/SPI/I2C зазвичай 50 МГц"
        />
        <Select
          label="Тип AF виходу (CNF)"
          value={type}
          onChange={(v) => setType(v as AFType)}
          options={[
            { value: 'afpp', label: 'AF Push-pull (CNF=10)' },
            { value: 'afod', label: 'AF Open-drain (CNF=11)' },
          ]}
          hint="AF PP для USART/SPI; AF OD для I2C"
        />
      </FormGrid>

      <InfoBadge>
        Alternate Function: пін керується периферією (USART, SPI, TIM...), а не регістром ODR. AFIO
        clock обов&apos;язковий!
      </InfoBadge>

      <CodeDisplay code={code} title={`${pin} → ALTERNATE FUNCTION`} />
    </div>
  );
}

// ─── Enable GPIO Clock ────────────────────────────────────────────────────────

export function Task60Clock() {
  const [port, setPort] = useState('A');
  const [afio, setAfio] = useState(false);

  const code = generateGpioClock({ port, afio });

  return (
    <div className="space-y-5">
      <FormGrid>
        <Select
          label="Порт GPIO"
          value={port}
          onChange={setPort}
          options={['A', 'B', 'C', 'D', 'E'].map((p) => ({ value: p, label: `GPIO${p}` }))}
          hint="Усі GPIO на шині APB2"
        />
        <div className="flex flex-col justify-end gap-3">
          <Checkbox
            label="Також увімкнути AFIO"
            checked={afio}
            onChange={setAfio}
            hint="Потрібен для remap та EXTI"
          />
        </div>
      </FormGrid>

      <InfoBadge>
        GPIO тактується через APB2ENR. Без включення тактування — звернення до регістрів порту не
        матиме ефекту (шина «заморожена»).
      </InfoBadge>

      <CodeDisplay code={code} title={`CLOCK → GPIO${port}`} />
    </div>
  );
}
