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
import { Checkbox, FormGrid, InfoBadge, NoteBadge, Select, WarningBadge } from '../ui/FormInputs';

// STM32F103T6 (VFQFPN36) has only GPIOA (PA0–PA15) and GPIOB (PB0–PB15) fully,
// GPIOC only PC13–PC15 (OSC32, TAMPER, LED), GPIOD only PD0–PD1 (OSC), no GPIOE.
const STM32T6_LIMITED_PORTS: Record<string, string> = {
  C: 'STM32F103T6 (36-пін): GPIOC має лише PC13–PC15 (TAMPER, RTC, OSC32). PC0–PC12 — відсутні.',
  D: 'STM32F103T6 (36-пін): GPIOD має лише PD0–PD1 (OSC IN/OUT). PD2–PD15 — відсутні.',
  E: 'GPIOE відсутній на STM32F103T6 (36-пін, VFQFPN36). Використовуйте GPIOA або GPIOB.',
};

const PIN_OPTS = ALL_GPIO_PINS.slice(0, 48).map((p) => ({ value: p, label: p }));

function getPortWarning(pin: string): string | null {
  const port = pin[1];
  if (STM32T6_LIMITED_PORTS[port]) return STM32T6_LIMITED_PORTS[port];
  const num = parseInt(pin.slice(2));
  if (port === 'C' && num < 13) return STM32T6_LIMITED_PORTS['C'];
  if (port === 'D' && num > 1) return STM32T6_LIMITED_PORTS['D'];
  return null;
}

// ─── GPIO Input ───────────────────────────────────────────────────────────────

export function Task60Input() {
  const [pin, setPin] = useState('PA0');
  const [mode, setMode] = useState<InputMode>('floating');

  const code = generateGpioInput({ pin, mode });
  const portWarning = getPortWarning(pin);

  const modeLabels: Record<InputMode, string> = {
    floating: 'Floating (плаваючий вхід)',
    pullup: 'Pull-up (підтяжка до VCC)',
    pulldown: 'Pull-down (підтяжка до GND)',
    analog: 'Analog (аналоговий, для ADC)',
  };

  return (
    <div className="space-y-4">
      <FormGrid>
        <Select label="Пін" value={pin} onChange={setPin} options={PIN_OPTS} />
        <Select
          label="Режим входу"
          value={mode}
          onChange={(v) => setMode(v as InputMode)}
          options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
        />
      </FormGrid>

      {portWarning && <WarningBadge>{portWarning}</WarningBadge>}

      {mode === 'analog' && (
        <InfoBadge>
          <strong>Аналоговий режим (CNF=00, MODE=00)</strong> — пін повністю відключений від
          цифрової логіки. Використовується виключно для ADC. При цьому MODE=00 + CNF=00 — всі біти
          нулі, тому після очищення нічого додатково не виставляється.
        </InfoBadge>
      )}
      {mode === 'floating' && (
        <InfoBadge>
          <strong>Floating input (CNF=01)</strong> — пін не підтягнутий ні до VCC, ні до GND. Стан
          виходу непередбачуваний без зовнішнього сигналу. Використовується, коли зовнішній пристрій
          завжди активно керує сигналом.
        </InfoBadge>
      )}
      {mode === 'pullup' && (
        <InfoBadge>
          <strong>Pull-up (CNF=10)</strong>: BSRR BS (Bit Set) → ODR=1 → внутрішній резистор ~40 кОм
          до VCC. Лінія залишається HIGH без зовнішнього сигналу — захист від &quot;плавання&quot;.
        </InfoBadge>
      )}
      {mode === 'pulldown' && (
        <InfoBadge>
          <strong>Pull-down (CNF=10)</strong>: BSRR BR (Bit Reset) → ODR=0 → внутрішній резистор до
          GND. Лінія залишається LOW без зовнішнього сигналу. Той самий CNF=10, що й pull-up, але
          ODR визначає напрямок.
        </InfoBadge>
      )}

      <NoteBadge>
        Регістр CRL керує пінами 0–7, CRH — пінами 8–15. Пін {pin} → регістр{' '}
        <strong>{parseInt(pin.slice(2)) >= 8 ? 'CRH' : 'CRL'}</strong>.
      </NoteBadge>

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
  const portWarning = getPortWarning(pin);

  return (
    <div className="space-y-4">
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
          hint="Open-drain потребує зовнішнього pull-up"
        />
      </FormGrid>

      {portWarning && <WarningBadge>{portWarning}</WarningBadge>}

      {speed === '50mhz' && (
        <InfoBadge>
          <strong>50 МГц (MODE=11)</strong> — максимальна швидкість, потрібна для SPI, USART на
          великих частотах. Підвищує рівень EMI та споживання. Для звичайних GPIO (LED, кнопки) —
          зайве; 10 МГц достатньо.
        </InfoBadge>
      )}
      {type === 'opendrain' && (
        <InfoBadge>
          <strong>Open-drain (CNF=01)</strong>: пін може тягнути до GND (активний LOW) або бути у
          Hi-Z. Зовнішній pull-up резистор <strong>обов&apos;язковий</strong> для отримання HIGH.
          Типово використовується для I2C, wired-OR шин.
        </InfoBadge>
      )}

      <NoteBadge>
        При OUTPUT: MODE≠00 вмикає вихід. CNF=00 — push-pull, CNF=01 — open-drain. Після очищення
        (всі нулі) — аналоговий input, тому MODE завжди треба виставити явно.
      </NoteBadge>

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
  const portWarning = getPortWarning(pin);

  return (
    <div className="space-y-4">
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
          hint="Для USART/SPI/TIM зазвичай 50 МГц"
        />
        <Select
          label="Тип AF виходу (CNF)"
          value={type}
          onChange={(v) => setType(v as AFType)}
          options={[
            { value: 'afpp', label: 'AF Push-pull (CNF=10)' },
            { value: 'afod', label: 'AF Open-drain (CNF=11)' },
          ]}
          hint="AF PP для USART TX / SPI; AF OD для I2C"
        />
      </FormGrid>

      {portWarning && <WarningBadge>{portWarning}</WarningBadge>}

      <InfoBadge>
        <strong>Alternate Function</strong>: пін керується периферією (USART, SPI, TIM...), а не
        регістром ODR. AFIO clock <strong>обов&apos;язковий</strong> — без нього AF не працює.
        CNF=10 (AF PP) vs CNF=11 (AF OD). MODE≠00 — вихід активний.
      </InfoBadge>

      <NoteBadge>
        Для AF <strong>вхідних</strong> пінів (наприклад UART RX, TIM CH1 capture) — CNF=01
        (floating input) або CNF=10 (input pull). Тут генерується код для AF <strong>виходу</strong>{' '}
        (TX, PWM, SPI MOSI тощо).
      </NoteBadge>

      <CodeDisplay code={code} title={`${pin} → ALTERNATE FUNCTION`} />
    </div>
  );
}

// ─── Enable GPIO Clock ────────────────────────────────────────────────────────

export function Task60Clock() {
  const [port, setPort] = useState('A');
  const [afio, setAfio] = useState(false);

  const code = generateGpioClock({ port, afio });

  const portNote: Record<string, string> = {
    E: 'GPIOE відсутній на STM32F103T6 (36-пін). Не використовуйте на нашому МК.',
    D: 'GPIOD на STM32F103T6: лише PD0–PD1 (OSC). Для загального GPIO обирайте PA або PB.',
    C: 'GPIOC на STM32F103T6: лише PC13–PC15. PC0–PC12 відсутні.',
  };

  return (
    <div className="space-y-4">
      <FormGrid>
        <Select
          label="Порт GPIO"
          value={port}
          onChange={setPort}
          options={['A', 'B', 'C', 'D', 'E'].map((p) => ({ value: p, label: `GPIO${p}` }))}
          hint="Усі GPIO на шині APB2"
        />
        <div className="flex flex-col justify-center gap-3">
          <Checkbox
            label="Також увімкнути AFIO"
            checked={afio}
            onChange={setAfio}
            hint="Потрібен для remap та EXTI"
          />
        </div>
      </FormGrid>

      {portNote[port] && <WarningBadge>{portNote[port]}</WarningBadge>}

      <InfoBadge>
        GPIO тактується через <strong>APB2ENR</strong> (не APB1!). Без увімкнення тактування —
        звернення до регістрів порту не матиме ефекту: шина «заморожена» і записи ігноруються.
        Завжди перша операція у коді налаштування.
      </InfoBadge>

      {afio && (
        <NoteBadge>
          <strong>AFIO</strong> (Alternate Function IO) потрібен для: перепризначення пінів (remap),
          налаштування EXTI (AFIO_EXTICR), та деяких special remaps. Без нього AF-функції можуть не
          працювати.
        </NoteBadge>
      )}

      <CodeDisplay code={code} title={`CLOCK → GPIO${port}`} />
    </div>
  );
}
