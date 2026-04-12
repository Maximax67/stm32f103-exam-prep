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
import { ExplanationPanel, ExplanationSection, RmRef } from '../ui/ExplanationPanel';
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

      <ExplanationPanel>
        <ExplanationSection title="Що таке регістр і навіщо він потрібен">
          <p>
            Уявіть мікроконтролер як дуже маленький комп&apos;ютер із набором
            &quot;перемикачів&quot;. Кожен такий перемикач — це один біт у спеціальній комірці
            пам&apos;яті, яка називається <strong>регістром</strong>. Записуючи числа в регістри, ми
            наказуємо МК що робити: який пін — вхід, який — вихід, з якою швидкістю, і т.д. На
            STM32F103 майже все налаштовується саме так — без жодних функцій &quot;налаштувати пін в
            одну одну строку&quot;, лише пряма робота з регістрами.
            <RmRef section="9" page={161} label="RM0008 §9 GPIO" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 1 — RCC->APB2ENR: чому без цього нічого не працює">
          <p>
            STM32 побудований дуже ощадливо: за замовчуванням тактування більшості периферії
            вимкнено, щоб МК споживав мінімум струму. GPIO підключений до шини <strong>APB2</strong>{' '}
            (Advanced Peripheral Bus 2). Поки ми не вмикаємо тактування для конкретного порту,
            будь-який запис у його регістри просто ігнорується — як кидати листи у вимкнений факс.
          </p>
          <p>
            Регістр <strong>RCC→APB2ENR</strong> (APB2 Enable Register) — це набір прапорців, по
            одному на кожен пристрій на шині APB2. Встановлення біта{' '}
            <code className="rounded bg-slate-800 px-1 text-emerald-300">RCC_APB2ENR_IOPAEN</code>{' '}
            (IOP A EN = IO Port A ENable) відкриває &quot;кран&quot; тактування для GPIOA.
            Аналогічно для B, C, D. <RmRef section="7.3.7" page={112} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 2 — CRL / CRH: де живуть налаштування пінів">
          <p>
            Кожен порт GPIO (GPIOA, GPIOB...) має 16 пінів. Для кожного піна потрібно 4 біти
            налаштування: 2 для <strong>MODE</strong> (напрямок і швидкість) і 2 для{' '}
            <strong>CNF</strong> (тип входу/виходу). 16 × 4 = 64 біти — це два 32-бітних регістри:
          </p>
          <p>
            <strong>CRL</strong> (Control Register Low) — для пінів 0–7. Піни 0, 1, 2 ... 7
            розміщені у бітах [3:0], [7:4], [11:8] ... [31:28] відповідно.
          </p>
          <p>
            <strong>CRH</strong> (Control Register High) — для пінів 8–15. Та сама структура.{' '}
            <RmRef section="9.2.1" page={172} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Поля MODE і CNF — таблиця режимів">
          <p>
            Для кожного піна 4 біти поділяються так: <strong>MODE[1:0]</strong> — молодші два,{' '}
            <strong>CNF[1:0]</strong> — старші два. Для режиму <strong>вхід (Input)</strong>:
          </p>
          <p className="rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-300">
            MODE = 00 → вхід (Input mode)
            <br />
            CNF = 00 → Analog input (аналоговий, для ADC)
            <br />
            CNF = 01 → Floating input (не підтягнутий)
            <br />
            CNF = 10 → Input with pull-up / pull-down (підтяжка)
            <br />
            CNF = 11 → Зарезервовано
          </p>
          <p>
            Чому спочатку &= ~(MODE | CNF)? Після reset значення невизначені або можуть бути
            ненульові. Якщо ми просто додаємо | без очищення, то старі біти залишаться і можуть дати
            невірний результат. Тому <strong>завжди спочатку очищуємо</strong>, потім виставляємо
            потрібне. <RmRef section="9.2.1" page={172} />
          </p>
        </ExplanationSection>

        {mode === 'pullup' || mode === 'pulldown' ? (
          <ExplanationSection title="Pull-up / Pull-down — навіщо і як через BSRR">
            <p>
              Коли CNF=10, пін переходить у режим &quot;вхід з підтяжкою&quot;. Але напрямок
              підтяжки (вгору чи вниз) визначається тим, яке значення зараз у регістрі{' '}
              <strong>ODR (Output Data Register)</strong>: ODR=1 → pull-up (~40 кОм до VCC), ODR=0 →
              pull-down (~40 кОм до GND).
            </p>
            <p>
              Регістр <strong>BSRR</strong> (Bit Set/Reset Register) — безпечний атомарний спосіб
              змінити один біт ODR. Він 32-бітний: старші 16 біт (BR, Bit Reset) скидають відповідні
              біти ODR у 0, молодші 16 біт (BS, Bit Set) встановлюють їх у 1. Запис в BSRR не
              потребує операції read-modify-write — це важливо для захисту від переривань.{' '}
              <RmRef section="9.2.5" page={174} />
            </p>
          </ExplanationSection>
        ) : null}

        <ExplanationSection title="PA13 / PA14 — небезпечні JTAG/SWD піни">
          <p>
            Якщо ви обрали PA13 або PA14 — будьте дуже обережні. Ці піни після скидання МК
            автоматично працюють як <strong>SWDIO</strong> і <strong>SWCLK</strong> — лінії
            інтерфейсу відладки SWD, яким ST-Link &quot;розмовляє&quot; з МК. Якщо вимкнути SWD, ви
            більше не зможете прошивати МК через USB до наступного скидання з іншою прошивкою. На
            екзамені не використовуйте ці піни як звичайні GPIO без крайньої необхідності. Для PA15,
            PB3, PB4 — безпечне вивільнення через{' '}
            <code className="rounded bg-slate-800 px-1 text-emerald-300">JTAGDISABLE</code> (SWD
            залишається). <RmRef section="9.3.1" page={176} label="RM0008 §9.3.1 SWJ" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="MODE bits — швидкість виходу">
          <p>
            Коли ми хочемо зробити пін виходом, поле MODE більше не означає &quot;вхід&quot;. Тепер
            це <strong>максимальна швидкість перемикання</strong> виходу:
          </p>
          <p className="rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-300">
            MODE = 00 → Input (не вихід!)
            <br />
            MODE = 01 → Output, max 10 МГц
            <br />
            MODE = 10 → Output, max 2 МГц
            <br />
            MODE = 11 → Output, max 50 МГц
          </p>
          <p>
            Навіщо взагалі обмежувати швидкість? Чим швидше перемикається пін, тим більше
            електромагнітних завад (EMI) він генерує і тим більше струму споживає під час
            перемикання. Для LED — більш ніж достатньо 10 МГц або навіть 2 МГц. Для SPI або USART на
            великій швидкості потрібно 50 МГц. <RmRef section="9.2.1" page={172} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="CNF bits для виходу — push-pull vs open-drain">
          <p>Для вихідного режиму (MODE≠00) поле CNF означає тип виходу:</p>
          <p>
            <strong>Push-pull (CNF=00)</strong>: всередині є два транзистори — один
            &quot;тягне&quot; лінію до VCC (+3.3В), інший до GND. Пін активно видає і HIGH і LOW.
            Найпоширеніший варіант.
          </p>
          <p>
            <strong>Open-drain (CNF=01)</strong>: є лише транзистор до GND. Коли він відкритий — LOW
            на лінії. Коли закритий — лінія &quot;висить у повітрі&quot; (Hi-Z) і потрібен зовнішній
            резистор до VCC, щоб отримати HIGH. Так влаштований I2C — це дозволяє декільком
            пристроям &quot;тягнути&quot; лінію вниз без конфлікту.{' '}
            <RmRef section="9.2.1" page={172} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="PA15 / PB3 / PB4 — JTAG піни, що потребують вивільнення">
          <p>
            Ці три піни після скидання зайняті JTAG-інтерфейсом відладки (PA15=JTDI, PB3=JTDO,
            PB4=NJTRST). Щоб використати їх як звичайні GPIO, потрібно вимкнути JTAG через регістр{' '}
            <strong>AFIO→MAPR</strong>. Поле SWJ_CFG встановлюється у 010 (JTAGDISABLE), що залишає
            активним SWD (PA13/PA14) — ви продовжуєте відлагоджувати через ST-Link. Код для цього
            вже вставлено в генератор автоматично, але важливо розуміти навіщо він там є.{' '}
            <RmRef section="9.3.1" page={176} label="RM0008 §9.3.1" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="Що таке Alternate Function (AF)">
          <p>
            Більшість пінів STM32 — багатофункціональні. Наприклад, PA9 може бути звичайним GPIO або
            ж виходом USART1 TX, або входом таймера TIM1. Щоб вибрати, яку функцію виконує пін,
            мікроконтролер використовує режим <strong>Alternate Function</strong>.
          </p>
          <p>
            В режимі AF пін вже не контролюється регістром ODR (Output Data Register). Натомість ним
            керує відповідна периферія — USART, SPI, I2C, таймер і т.д. Процесор вже нічого не
            записує туди руками, периферія робить це сама за внутрішньою шиною.{' '}
            <RmRef section="9.1.4" page={166} label="RM0008 §9.1.4 AF" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Чому AFIO clock обов'язковий">
          <p>
            AFIO (Alternate Function IO) — це окремий блок, що відповідає за маршрутизацію сигналів.
            Він дозволяє перепризначати піни (remap), налаштовувати зовнішні переривання (EXTI), а
            також взагалі задіяти alternate function. Без тактування AFIO вся ця логіка
            &quot;заморожена&quot; — AF-функції не будуть активовані. Він знаходиться також на шині
            APB2. <RmRef section="7.3.7" page={112} label="RM0008 §7.3.7 APB2ENR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="CNF=10 (AF PP) vs CNF=11 (AF OD)">
          <p>Коли пін в режимі AF-виходу, CNF визначає, яким є вихідний буфер:</p>
          <p>
            <strong>CNF=10 — AF Push-pull</strong>: стандартний вихід з двома транзисторами (HIGH і
            LOW). Використовується для USART TX, SPI MOSI/SCK, PWM.
          </p>
          <p>
            <strong>CNF=11 — AF Open-drain</strong>: тільки транзистор до GND, HIGH через зовнішній
            резистор. Потрібен для I2C (SDA, SCL), де всі учасники шини мають бути open-drain.{' '}
            <RmRef section="9.2.1" page={172} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="AF для вхідних пінів (UART RX, TIM capture)">
          <p>
            Тут генерується код для AF-<em>виходу</em>. Але якщо пін є AF-<em>входом</em>{' '}
            (наприклад, USART RX або вхід захоплення таймера), налаштування відрізняється: MODE=00
            (вхід!), CNF=01 (floating) або CNF=10 (pull-up/down). Периферія читає сигнал, нічого не
            виводить — тому вихідний буфер не потрібен. Дивіться задачу &quot;UART RX&quot; або
            &quot;GPIO Input&quot;.
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="Дерево тактування STM32 — як доходить clock до GPIO">
          <p>
            STM32F103 має складне &quot;дерево тактування&quot;. Уявіть водопровід: є джерело (HSI —
            внутрішній RC-генератор 8 МГц, або HSE — зовнішній кварц), потім магістральна труба
            (SYSCLK), від неї розгалуження на шини APB1 і APB2.
          </p>
          <p>
            Всі GPIO підключені до шини <strong>APB2</strong>. Регістр <strong>RCC→APB2ENR</strong>{' '}
            — це набір &quot;вентилів&quot; на кожну гілку цієї шини.{' '}
            <code className="rounded bg-slate-800 px-1 text-emerald-300">RCC_APB2ENR_IOPAEN</code> —
            вентиль для GPIOA,{' '}
            <code className="rounded bg-slate-800 px-1 text-emerald-300">RCC_APB2ENR_IOPBEN</code> —
            для GPIOB, і так далі. <RmRef section="7.2" page={98} label="RM0008 §7.2 clock tree" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Чому GPIO — на APB2, а не APB1?">
          <p>
            APB2 — швидша шина. Вона може тактуватися на повній системній частоті (до 72 МГц). APB1
            обмежена 36 МГц. GPIO потребують максимальної швидкодії (режим 50 МГц!), тому вони на
            APB2. Також на APB2 знаходяться USART1, ADC, AFIO і TIM1. USART2/3, TIM2-4, I2C, SPI2 —
            на APB1. Це важливо при розрахунку BRR для USART. <RmRef section="7.3.7" page={112} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="AFIO — що це і коли увімкнювати">
          <p>
            AFIO (Alternate Function Input/Output) — це спеціальний блок маршрутизації сигналів
            усередині STM32. Він відповідає за:
          </p>
          <p>
            1. <strong>Remap</strong> — перенаправлення периферії на альтернативні піни (наприклад,
            USART1 TX з PA9 на PB6). Це зручно, коли стандартний пін зайнятий іншою функцією.
          </p>
          <p>
            2. <strong>EXTI</strong> — зовнішні переривання. Через AFIO_EXTICR вибирається, який
            порт (A, B, C...) підключений до кожної лінії EXTI.
          </p>
          <p>
            3. <strong>SWJ_CFG</strong> — керування JTAG/SWD (вивільнення пінів PA13-PA15, PB3-PB4).
          </p>
          <p>
            Якщо ви не використовуєте remap, EXTI або JTAG-піни — AFIO можна не вмикати. Але помилки
            від &quot;забув увімкнути AFIO&quot; є дуже поширеними на практиці.{' '}
            <RmRef section="9.4" page={181} label="RM0008 §9.4 AFIO registers" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
    </div>
  );
}
