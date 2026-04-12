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
import { ExplanationPanel, ExplanationSection, RmRef } from '../ui/ExplanationPanel';
import {
  FormGrid,
  InfoBadge,
  NoteBadge,
  NumberInput,
  Select,
  WarningBadge,
} from '../ui/FormInputs';

// ─── TIM Setup ────────────────────────────────────────────────────────────────

const TIMERS_85 = ['TIM2', 'TIM3', 'TIM4'];

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
          hint="TIM2–TIM4 на шині APB1"
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
        <strong>TIM2–TIM4</strong> — general-purpose таймери на шині <strong>APB1</strong>. Якщо
        APB1 prescaler ≠ 1 (наприклад, при 72 МГц SYSCLK та APB1÷2=36 МГц), таймери отримують
        подвоєну частоту APB1 = 72 МГц. У цьому тренажері вкажіть реальну частоту таймера, а не
        APB1.
      </NoteBadge>

      <CodeDisplay code={code} title={`${timer} SETUP`} />

      <ExplanationPanel>
        <ExplanationSection title="Що таке таймер у мікроконтролері">
          <p>
            Таймер — це, по суті, лічильник усередині МК, що рахує тактові імпульси. Уявіть одометр
            у машині, тільки замість кілометрів він рахує наносекунди. Коли він досягає заданого
            значення — він скидається і генерує подію (Update Event). Цю подію можна використати
            для: генерації переривань з точним інтервалом, запуску ШІМ, захоплення часу зовнішніх
            подій, і багато іншого.
          </p>
          <p>
            STM32F103 має кілька типів таймерів. TIM2–TIM4 — це <strong>general-purpose</strong>{' '}
            таймери: прості, гнучкі, 16-бітні лічильники. TIM1 — advanced (більше функцій, але
            складніший). <RmRef section="15.1" page={347} label="RM0008 §15 Timers" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 1 — RCC APB1ENR: тактування таймера">
          <p>
            TIM2–TIM4 підключені до шини <strong>APB1</strong> (не APB2, як GPIO!). Тому їх
            тактування вмикається через <strong>RCC→APB1ENR</strong>. Відповідний біт —{' '}
            <code className="rounded bg-slate-800 px-1 text-sky-300">RCC_APB1ENR_TIM3EN</code> для
            TIM3 і т.д. Без цього лічильник не рахує — він просто &quot;заморожений&quot;.{' '}
            <RmRef section="7.3.8" page={114} label="RM0008 §7.3.8 APB1ENR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 2 — PSC: prescaler (попередній дільник)">
          <p>
            Припустімо, що тактова частота МК — 8 МГц. Це означає 8 000 000 імпульсів на секунду.
            Лічильник таймера 16-бітний (рахує від 0 до 65535). Якщо він рахуватиме кожен імпульс,
            він переповниться за 65535 / 8 000 000 ≈ 8 мс — дуже швидко.
          </p>
          <p>
            Регістр <strong>PSC (Prescaler)</strong> ділить вхідну частоту перед тим, як вона
            потрапляє до лічильника. Формула проста:{' '}
            <code className="rounded bg-slate-800 px-1 text-sky-300">
              f_cnt = f_clk / (PSC + 1)
            </code>
            . Плюс один — тому що PSC=0 означає &quot;ділити на 1&quot;, а не &quot;зупинити&quot;.
          </p>
          <p>
            PSC=7999 при f_clk=8 МГц → f_cnt = 8 000 000 / 8000 = <strong>1000 Гц</strong> (1 кГц).
            Тепер лічильник тікає з частотою 1 кГц = 1 мс на крок.{' '}
            <RmRef section="15.4.7" page={393} label="RM0008 §15.4.7 TIMx_PSC" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 3 — ARR: auto-reload (до якого рахуємо)">
          <p>
            Регістр <strong>ARR (Auto-Reload Register)</strong> задає верхню межу лічильника.
            Лічильник рахує: 0, 1, 2 ... ARR, потім скидається до 0 — і знову. Момент скидання
            називається <strong>Update Event</strong>. Частота цих подій:{' '}
            <code className="rounded bg-slate-800 px-1 text-sky-300">
              f_out = f_cnt / (ARR + 1)
            </code>
            .
          </p>
          <p>
            Якщо f_cnt = 1 кГц і ARR = 999, то f_out = 1000 / 1000 = <strong>1 Гц</strong> — Update
            Event відбувається раз на секунду. Ось як налаштовується точний інтервал!{' '}
            <RmRef section="15.4.8" page={393} label="RM0008 §15.4.8 TIMx_ARR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 4 — CR1 CEN: запуск лічильника">
          <p>
            Після налаштування PSC і ARR таймер ще не рахує. Потрібно встановити біт{' '}
            <strong>CEN (Counter ENable)</strong> у регістрі <strong>CR1</strong> (Control Register
            1). Це буквально &quot;натиснути кнопку старт&quot;. Лічильник починає відраховувати
            тактові імпульси. <RmRef section="15.4.1" page={388} label="RM0008 §15.4.1 TIMx_CR1" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="Що таке АЦП і як він працює">
          <p>
            АЦП (Аналого-Цифровий Перетворювач) — це пристрій, що вимірює аналогову напругу на пін і
            перетворює її в числове значення. STM32F103 має 12-бітний АЦП — це означає, що результат
            від 0 до 4095 (2¹² − 1). При живленні 3.3В: 0 = 0В, 4095 = 3.3В, 2048 ≈ 1.65В. Тобто
            роздільна здатність: 3.3В / 4096 ≈ 0.8 мВ на крок.{' '}
            <RmRef section="11" page={215} label="RM0008 §11 ADC" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 1 — GPIO аналоговий режим (MODE=00, CNF=00)">
          <p>
            Для АЦП пін повинен бути у <strong>аналоговому режимі</strong>: MODE=00 і CNF=00 — всі
            біти нулі. В цьому режимі цифровий вхідний буфер відключається повністю — це зменшує
            шуми. Якщо залишити пін у digital floating, АЦП буде бачити перешкоди від самої цифрової
            логіки. Аналоговий режим — це &quot;ізоляція&quot; від цифрового світу.{' '}
            <RmRef section="9.2.1" page={172} />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 3 — CR2 ADON: увімкнення АЦП">
          <p>
            Біт <strong>ADON (ADC ON)</strong> у регістрі CR2 — це вмикач АЦП. Перший запис ADON=1
            переводить АЦП зі стану &quot;вимкнено&quot; у стан &quot;готовий.&quot;АЦП потребує
            часу на стабілізацію (~1 мкс), тому в реальному коді перед першим перетворенням бажано
            зробити невелику затримку або виконати перший &quot;dummy&quot; запуск.{' '}
            <RmRef section="11.12.3" page={247} label="RM0008 §11.12.3 CR2" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 4 — SQR3: який канал вимірювати">
          <p>
            STM32 ADC підтримує <strong>regular sequence</strong> — послідовність з до 16 каналів,
            що перетворюються один за одним. Регістр <strong>SQR3</strong> (Sequence Register 3)
            задає, який канал буде <em>першим</em> у послідовності. Просто пишемо номер каналу: SQR3
            = 1 означає &quot;почати з каналу 1 (PA1)&quot;. Якщо потрібно лише один вимір — більше
            нічого не налаштовуємо.{' '}
            <RmRef section="11.12.11" page={255} label="RM0008 §11.12.11 SQR3" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 5 — SMPR: час вибірки (sampling time)">
          <p>
            Перед тим як &quot;сфотографувати&quot; напругу, АЦП тримає конденсатор на вході
            підключеним до піна певний час — це <strong>час вибірки</strong>. Чим довше він стоїть —
            тим точніше заряджається конденсатор, особливо при високоімпедансних (слабких) джерелах
            сигналу.
          </p>
          <p>
            Для джерел з низьким вихідним імпедансом (до ~1 кОм) достатньо 1.5 циклів. Для датчиків
            з більшим опором — потрібно 28.5–239.5 циклів. На екзамені без конкретних умов —
            безпечно вибирати <strong>239.5 циклів</strong>. Загальний час перетворення = час
            вибірки + 12.5 циклів.{' '}
            <RmRef section="11.12.4" page={249} label="RM0008 §11.12.4 SMPR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 6 — Software trigger і запуск">
          <p>
            АЦП не запускається &quot;просто так&quot; — йому потрібен тригер. STM32 підтримує
            зовнішні тригери від таймерів, але найпростіший варіант — software trigger.{' '}
            <strong>EXTSEL=111</strong> вибирає SWSTART як тригер. <strong>EXTTRIG</strong> дозволяє
            зовнішній тригер (навіть якщо він програмний). <strong>SWSTART</strong> — безпосередній
            старт. Після запуску чекаємо прапорець <strong>EOC (End Of Conversion)</strong> у
            регістрі SR, потім читаємо результат з DR. <RmRef section="11.12.3" page={247} />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="Що таке UART і для чого він потрібен">
          <p>
            UART (Universal Asynchronous Receiver-Transmitter) — це один з найстаріших і
            найпростіших протоколів послідовної передачі даних. &quot;Послідовний&quot; означає, що
            біти передаються один за одним по одному дроту. &quot;Асинхронний&quot; — немає окремого
            дроту для тактового сигналу; обидві сторони мають заздалегідь домовитися про швидкість
            (baudrate).
          </p>
          <p>
            UART ідеально підходить для налагодження (вивести текст через термінал), для
            зв&apos;язку з GPS-модулями, Bluetooth-модулями, і взагалі будь-де де не потрібна висока
            швидкість. <RmRef section="27" page={788} label="RM0008 §27 USART" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="TX пін — чому AF push-pull і 50 МГц">
          <p>
            Пін TX є <em>виходом</em> периферії USART. Тому його налаштовуємо як{' '}
            <strong>Alternate Function Push-pull (CNF=10, MODE=11)</strong>. Push-pull — щоб активно
            видавати і HIGH і LOW. 50 МГц швидкість — щоб фронти сигналу були чіткими навіть на
            високих baudrate.
          </p>
          <p>
            Якби ми налаштували пін як звичайний GPIO output, USART все одно не зможе ним керувати —
            USART &quot;підключається&quot; до піна тільки в режимі AF. Звідси і потрібен AFIO
            clock.
          </p>
        </ExplanationSection>

        <ExplanationSection title="BRR — як обчислюється швидкість передачі">
          <p>
            Baudrate (швидкість у бітах/с) визначається регістром <strong>BRR</strong> (Baud Rate
            Register). Формула дуже проста:{' '}
            <code className="rounded bg-slate-800 px-1 text-pink-300">BRR = f_PCLK / baudrate</code>
            . Наприклад, USART1 на APB2 з частотою 8 МГц і baudrate 9600:
          </p>
          <p className="rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-slate-300">
            BRR = 8&nbsp;000&nbsp;000 / 9600 = 833
          </p>
          <p>
            В коді ми пишемо саме вираз <code>8000000 / 9600</code> а не &quot;магічне число&quot;
            833 — так одразу зрозуміло звідки це число взялося, і при зміні частоти компілятор
            автоматично перерахує. Увага: USART1 — на APB2, USART2/3 — на APB1! Якщо переплутати
            частоту шини — baudrate буде неправильним.{' '}
            <RmRef section="27.6.3" page={823} label="RM0008 §27.6.3 BRR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="TE і UE — два кроки вмикання USART">
          <p>
            <strong>TE (Transmitter Enable)</strong> — вмикає блок передавача. Без нього USART
            нічого не передає, навіть якщо все інше налаштоване вірно.
          </p>
          <p>
            <strong>UE (USART Enable)</strong> — глобальне вмикання всього USART-блоку. Без нього
            будь-який запис у TDR (Transmit Data Register) просто ігнорується. Порядок важливий:
            спочатку TE, потім UE — хоча на практиці часто роблять навпаки або одночасно, і це теж
            працює. <RmRef section="27.6.4" page={825} label="RM0008 §27.6.4 CR1" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="Що таке EXTI — зовнішні переривання">
          <p>
            EXTI (External Interrupt/Event) — це механізм, що дозволяє МК реагувати на зміну сигналу
            на пін <em>автоматично</em>, не тратячи час процесора на постійну перевірку. Уявіть: є
            кнопка. Замість того щоб у циклі кожну мілісекунду питати &quot;чи натиснута
            кнопка?&quot;, ми кажемо МК: &quot;коли побачиш зміну на цьому пін — перервися і виклич
            мою функцію&quot;. Це і є переривання.{' '}
            <RmRef section="10" page={197} label="RM0008 §10 EXTI" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 3 — AFIO EXTICR: маршрутизація порту до лінії EXTI">
          <p>
            STM32 має 16 ліній EXTI (0–15), але портів GPIO є кілька (A, B, C...). Лінія EXTI0 може
            бути підключена до PA0, PB0, PC0 — але лише до одного одночасно. Вибір виконується через
            регістри <strong>AFIO→EXTICR[0..3]</strong>. EXTICR[0] керує EXTI0–3, EXTICR[1] —
            EXTI4–7, і т.д. Для кожної лінії є 4-бітне поле: 0000=PortA, 0001=PortB, 0010=PortC...{' '}
            <RmRef section="9.4.3" page={184} label="RM0008 §9.4.3 EXTICR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 4 — RTSR / FTSR: фронт тригера">
          <p>
            EXTI може спрацьовувати за <strong>наростаючим фронтом</strong> (0→1, RTSR — Rising
            Trigger Selection Register), за <strong>спадаючим фронтом</strong> (1→0, FTSR — Falling
            Trigger Selection Register), або за обома. Наприклад, кнопка з підтяжкою до VCC дає LOW
            при натисканні — треба FTSR. LED-кнопка без підтяжки — RTSR.{' '}
            <RmRef section="10.3.2" page={211} label="RM0008 §10.3.2 RTSR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 5 — IMR: розмаскування переривання">
          <p>
            <strong>IMR (Interrupt Mask Register)</strong> — це &quot;воротар&quot;. Навіть якщо
            налаштовані RTSR/FTSR і AFIO, сигнал не пройде до NVIC, поки відповідний біт у IMR не
            встановлений. Встановити біт IMR означає &quot;дозволити цій лінії EXTI генерувати
            переривання&quot;. Аналогічно є EMR (Event Mask Register) — для event mode без
            переривань. <RmRef section="10.3.4" page={213} label="RM0008 §10.3.4 IMR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="PR — прапорець скидається записом 1, а не 0!">
          <p>
            Це класична пастка. Регістр <strong>PR (Pending Register)</strong> показує, яка лінія
            EXTI спрацювала. В обробнику переривання ми повинні скинути цей прапорець — інакше МК
            одразу ж зайде в ISR знову і знову.
          </p>
          <p>
            Але на відміну від звичайних регістрів (де для скидання пишемо 0), тут все навпаки:{' '}
            <strong>щоб скинути PR, треба записати 1 у відповідний біт</strong>. Це
            &quot;write-1-to-clear&quot; механізм. Тому в коді:{' '}
            <code className="rounded bg-slate-800 px-1 text-orange-300">
              EXTI-&gt;PR = EXTI_PR_PR13;
            </code>{' '}
            (не |=, не &=~, а просте присвоєння). Якщо написати &= ~, це не скине прапорець — бо ми
            запишемо 0, а потрібна 1.{' '}
            <RmRef section="10.3.6" page={214} label="RM0008 §10.3.6 PR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="EXTI0–4 vs EXTI9_5 vs EXTI15_10 — спільні IRQ">
          <p>
            Через обмежену кількість векторів переривань у NVIC, лінії EXTI5–9 спільно
            використовують один вектор <strong>EXTI9_5_IRQn</strong>, а EXTI10–15 —{' '}
            <strong>EXTI15_10_IRQn</strong>. Це означає: якщо у вас кілька кнопок на EXTI5 і EXTI7 —
            вони обидві викличуть один і той самий ISR. Усередині ISR треба перевіряти, який саме
            прапорець PR встановлений, і обробляти відповідно.
          </p>
        </ExplanationSection>
      </ExplanationPanel>
    </div>
  );
}
