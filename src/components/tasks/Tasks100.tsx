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
import { ExplanationPanel, ExplanationSection, RmRef } from '../ui/ExplanationPanel';
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
  const [pwmMode, setPwmMode] = useState<1 | 2>(1);

  const mapping = getPwmMapping(pin);
  const ccr = Math.round((duty / 100) * (arr + 1));
  const fPwm = useMemo(() => {
    const f = (clockMhz * 1_000_000) / ((psc + 1) * (arr + 1));
    return f >= 1 ? `${f.toFixed(2)} Гц` : `${(f * 1000).toFixed(2)} мГц`;
  }, [clockMhz, psc, arr]);

  const code = generatePwm({ pin, dutyCyclePct: duty, psc, arr, clockMhz, pwmMode });
  const isAdvancedTimer = mapping?.timer === 'TIM1';

  const modeDesc =
    pwmMode === 1
      ? 'HIGH поки CNT < CCR, LOW коли CNT ≥ CCR'
      : 'LOW поки CNT < CCR, HIGH коли CNT ≥ CCR';

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
        <Select
          label="Режим PWM (OCxM)"
          value={String(pwmMode)}
          onChange={(v) => setPwmMode(Number(v) as 1 | 2)}
          options={[
            { value: '1', label: 'Mode 1 (OCxM=110) — HIGH поки CNT < CCR' },
            { value: '2', label: 'Mode 2 (OCxM=111) — HIGH поки CNT ≥ CCR' },
          ]}
          hint="Mode 1 найпоширеніший"
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
          <strong>TIM1 — Advanced-Control Timer!</strong> На відміну від TIM2–TIM4, TIM1 вимагає
          додаткового кроку: <strong>BDTR |= MOE</strong> (Main Output Enable). Без нього вихід PWM
          не з&apos;явиться на пін, навіть якщо таймер запущений.
        </WarningBadge>
      )}

      <InfoBadge>
        f_PWM ~= <strong>{fPwm}</strong> · CCR = {ccr} / {arr + 1} = {duty}% · {mapping?.timer} CH
        {mapping?.channel} · <strong>Mode {pwmMode}:</strong> {modeDesc}
        {mapping?.needsBDTR ? ' · TIM1: потрібен BDTR→MOE!' : ''}
      </InfoBadge>

      <NoteBadge>
        <strong>PWM Mode 1 (OCxM=110)</strong>: вихід HIGH, поки CNT &lt; CCR; LOW після. EGR→UG
        примусово завантажує значення PSC/ARR/CCR з preload регістрів — без UG перші значення можуть
        бути некоректними. OCxPE (preload enable) дозволяє безпечне оновлення CCR під час роботи.
      </NoteBadge>

      <NoteBadge>
        <strong>PWM Mode 1</strong> (OCxM=110): HIGH поки CNT &lt; CCR. <strong>Mode 2</strong>{' '}
        (OCxM=111): HIGH коли CNT ≥ CCR — інверсія. Обидва дають однаковий duty cycle, але
        полярність виходу протилежна. EGR→UG примусово завантажує PSC/ARR/CCR з preload регістрів
        перед стартом.
      </NoteBadge>

      <CodeDisplay code={code} title={`PWM ${pin} → ${mapping?.timer} CH${mapping?.channel}`} />

      <ExplanationPanel>
        <ExplanationSection title="Що таке ШІМ (PWM) і навіщо він потрібен">
          <p>
            PWM (Pulse Width Modulation, або ШІМ — Широтно-Імпульсна Модуляція) — це спосіб передати
            аналогову інформацію через цифровий сигнал. Сигнал постійно перемикається між HIGH і
            LOW, але змінюється <em>тривалість</em> HIGH відносно одного циклу.
          </p>
          <p>
            Якщо HIGH займає 50% часу (duty cycle = 50%) — навантаження отримує &quot;ніби&quot;
            половину напруги живлення. 10% duty — ніби 10% напруги. Так керують яскравістю LED,
            швидкістю моторів, нагрівом тощо. Людське вухо/око не помічає швидких перемикань і
            сприймає &quot;середнє&quot; значення.{' '}
            <RmRef section="15.3.9" page={372} label="RM0008 §15.3.9 PWM mode" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="PWM Mode 1 vs Mode 2 — у чому різниця">
          <p>
            Обидва режими генерують PWM, але з різною полярністю. Поле <strong>OCxM</strong> у
            регістрі CCMR вибирає режим:
          </p>
          <p className="rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-300">
            OCxM = 110 → Mode 1: HIGH поки CNT &lt; CCR, LOW після
            <br />
            OCxM = 111 → Mode 2: LOW поки CNT &lt; CCR, HIGH після
          </p>
          <p>
            Практично: якщо duty=30% у Mode 1 → вихід HIGH 30% часу. У Mode 2 із тим самим CCR →
            HIGH 70% часу. Вибір залежить від того, який рівень сигналу вважається
            &quot;активним&quot; для вашого навантаження. Для LED і моторів зазвичай Mode 1 і duty
            вказує скільки &quot;ON&quot;.{' '}
            <RmRef section="15.3.9" page={372} label="RM0008 §15.3.9 PWM mode" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="CCR — як задається duty cycle">
          <p>
            Лічильник таймера рахує від 0 до ARR. Регістр <strong>CCR</strong> (Capture/Compare
            Register) — це &quot;точка перемикання&quot;. У PWM Mode 1:
          </p>
          <p className="rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-300">
            CNT &lt; CCR → вихід HIGH
            <br />
            CNT ≥ CCR → вихід LOW
          </p>
          <p>
            Duty cycle = CCR / (ARR + 1). Якщо ARR=999 і CCR=500 → duty = 50%. Якщо CCR=100 → duty =
            10%. Ось чому CCR = (duty / 100) * (ARR + 1).{' '}
            <RmRef section="15.4.13" page={398} label="RM0008 §15.4.13 CCR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="CCMR — режим роботи каналу (OCxM=110)">
          <p>
            Кожен канал таймера (CH1–CH4) має свій регістр <strong>CCMR</strong> (Capture/Compare
            Mode Register). Канали 1 і 2 — у CCMR1, канали 3 і 4 — у CCMR2.
          </p>
          <p>
            Поле <strong>OCxM</strong> вибирає режим: 000 = frozen, 001 = active, 110 = PWM Mode 1,
            111 = PWM Mode 2 і т.д. Нам потрібен <strong>110 (PWM Mode 1)</strong>: HIGH поки CNT
            {' < '}CCR, LOW після. Також встановлюємо <strong>OCxPE</strong> (Preload Enable) — це
            дозволяє змінювати CCR &quot;на льоту&quot; без артефактів.{' '}
            <RmRef section="15.4.7" page={391} label="RM0008 §15.4.7 CCMR1" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="CCER — увімкнення виходу каналу (CCxE)">
          <p>
            Навіть якщо CCMR налаштовано, вихід каналу ще заблокований. Регістр{' '}
            <strong>CCER</strong> (Capture/Compare Enable Register) містить біт{' '}
            <strong>CCxE</strong> для кожного каналу. Встановлення цього біта &quot;відкриває&quot;
            вихід і підключає PWM-сигнал до фізичного піна.{' '}
            <RmRef section="15.4.9" page={394} label="RM0008 §15.4.9 CCER" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="TIM1 і BDTR MOE — чому advanced timer складніший">
          <p>
            TIM1 — це &quot;advanced-control timer&quot;. На відміну від TIM2–TIM4, він додатково
            підтримує комплементарні виходи (для керування H-bridge), dead-time генерацію і захист
            від аварійних ситуацій. Через це є додатковий регістр безпеки:{' '}
            <strong>BDTR (Break and Dead-Time Register)</strong>. Він вимагає явного встановлення
            біта <strong>MOE (Main Output Enable)</strong> — інакше всі виходи TIM1 заблоковані
            апаратно, навіть якщо все інше налаштовано правильно. TIM2–TIM4 цього не потребують.{' '}
            <RmRef section="15.4.18" page={404} label="RM0008 §15.4.18 BDTR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="EGR UG — навіщо примусово оновлювати preload">
          <p>
            PSC і ARR — preloaded registers: зміни набувають чинності лише після наступного Update
            Event. Але якщо ми щойно увімкнули таймер і ще не було жодного UE — лічильник може
            почати рахувати зі старими (невизначеними) значеннями. Запис{' '}
            <strong>EGR = TIM_EGR_UG</strong> (Update Generation) примусово генерує Update Event
            прямо зараз, завантажуючи PSC/ARR/CCR з preload регістрів у робочі. Завжди робіть це
            перед запуском таймера через PWM.{' '}
            <RmRef section="15.4.6" page={391} label="RM0008 §15.4.6 EGR" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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

      <ExplanationPanel>
        <ExplanationSection title="RX пін — чому input pull-up, а не floating">
          <p>
            UART RX — це <em>вхід</em>. Коли ніхто нічого не передає, лінія повинна бути у
            визначеному стані. Стандарт UART говорить: лінія у стані IDLE — це логічна 1 (HIGH).
            Пакет даних починається з стартового біта (LOW).
          </p>
          <p>
            Якщо RX пін floating (не підтягнутий), при відключеному передавачі він
            &quot;плаває&quot; між 0 і 1 через наводки. USART буде бачити хибні стартові біти і
            генерувати &quot;сміттєві&quot; байти у буфері. Pull-up (~40 кОм до VCC) тримає лінію на
            HIGH в стані IDLE і запобігає цьому.{' '}
            <RmRef section="27.3.2" page={794} label="RM0008 §27.3.2 USART" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="RE — Receiver Enable і відмінність від TX">
          <p>
            Для прийому (RX) налаштовуємо біт <strong>RE (Receiver Enable)</strong> замість TE. Коли
            RE=1, USART починає &quot;слухати&quot; лінію: він чекає стартовий біт (LOW), потім
            зчитує 8 (або 9) бітів даних, перевіряє стопові біти і кладе отриманий байт у регістр DR
            (Data Register).
          </p>
          <p>
            При цьому RX пін налаштовується як <em>input</em> (MODE=00, CNF=10), а не AF output.
            Периферія читає значення з піна, нічого не виводить.
          </p>
        </ExplanationSection>

        <ExplanationSection title='RXNE — прапорець "є новий байт"'>
          <p>
            Коли USART прийняв байт і поклав його у DR, встановлюється прапорець{' '}
            <strong>RXNE (RX Not Empty)</strong> у регістрі SR (Status Register). Це сигнал:
            &quot;можна читати!&quot;. Після читання DR прапорець автоматично скидається.
          </p>
          <p>
            Якщо ви не встигнете прочитати DR до приходу наступного байту — прапорець{' '}
            <strong>ORE (Overrun Error)</strong> встановиться і старий байт буде втрачено.{' '}
            <RmRef section="27.6.1" page={821} label="RM0008 §27.6.1 USART SR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="RXNEIE + NVIC — прийом через переривання">
          <p>
            Замість постійної перевірки &quot;чи є новий байт?&quot; у циклі (polling), можна
            увімкнути переривання. Біт <strong>RXNEIE</strong> у CR1 дозволяє USART генерувати
            переривання щоразу, коли RXNE=1. Але самого RXNEIE недостатньо — потрібно ще увімкнути
            переривання у <strong>NVIC (Nested Vectored Interrupt Controller)</strong> через{' '}
            <code className="rounded bg-slate-800 px-1 text-rose-300">NVIC_EnableIRQ()</code>.
          </p>
          <p>
            В ISR (обробнику переривання) обов&apos;язково читайте DR — це автоматично скине RXNE і
            запобіжить повторному виклику ISR. Не читати DR в ISR = нескінченний цикл переривань.{' '}
            <RmRef section="27.6.4" page={825} label="RM0008 §27.6.4 CR1 RXNEIE" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
    </div>
  );
}

// ─── Timer IRQ ────────────────────────────────────────────────────────────────

export function Task100TimerIRQ() {
  const [timer, setTimer] = useState('TIM3');
  const [psc, setPsc] = useState(7999);
  const [arr, setArr] = useState(999);
  const [clockMhz, setClockMhz] = useState(8);

  const selectedTimer = TIMERS.find((t) => t.name === timer)!;
  const isAdvanced = selectedTimer.apb === 2;

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
          options={TIMERS.map((t) => ({
            value: t.name,
            label: `${t.name}${t.apb === 2 ? ' (APB2 — advanced)' : ' (APB1)'}`,
          }))}
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

      {isAdvanced && (
        <WarningBadge>
          <strong>TIM1 — Advanced-Control Timer!</strong> Update interrupt використовує вектор{' '}
          <strong>TIM1_UP_IRQn</strong> і ISR <strong>TIM1_UP_IRQHandler</strong> — не{' '}
          <code className="rounded bg-slate-700 px-1">TIM1_IRQHandler</code>! TIM1 має чотири окремі
          вектори: TIM1_BRK, TIM1_UP, TIM1_TRG_COM, TIM1_CC. Тактується від <strong>APB2</strong>.
        </WarningBadge>
      )}

      <InfoBadge>
        Переривання кожні ≈ <strong>1 / {fOut}</strong> (Update Event = переповнення лічильника
        CNT→ARR→0). UIE у DIER → UIF у SR → <strong>скинути write 1 to clear</strong> (не &amp;=~!).
      </InfoBadge>

      <CodeDisplay code={code} title={`${timer} INTERRUPT`} />

      <ExplanationPanel>
        <ExplanationSection title="Переривання від таймера — навіщо і як">
          <p>
            Уявіть, що вам потрібно блимати LED кожну секунду. Найпростіший варіант — HAL_Delay, але
            за цей час МК нічого більше не робить. З перериванням таймера можна: МК виконує основний
            код, таймер рахує у фоні, кожну секунду автоматично викликається ISR і перемикає LED.
            Основний код не переривається надовго — лише на кілька наносекунд ISR.
          </p>
        </ExplanationSection>

        <ExplanationSection title="DIER UIE — дозвіл переривання від таймера">
          <p>
            Регістр <strong>DIER</strong> (DMA/Interrupt Enable Register) керує тим, які події
            таймера можуть генерувати переривання або DMA-запити. Біт{' '}
            <strong>UIE (Update Interrupt Enable)</strong> дозволяє переривання від{' '}
            <strong>Update Event</strong> — тобто від переповнення лічильника (CNT досягає ARR і
            скидається до 0). <RmRef section="15.4.4" page={389} label="RM0008 §15.4.4 DIER" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="NVIC — контролер переривань">
          <p>
            NVIC (Nested Vectored Interrupt Controller) — це апаратний &quot;диспетчер&quot;
            переривань у ядрі ARM Cortex-M3. Він приймає сигнали від усіх периферій (USART, таймери,
            GPIO...) і вирішує, яке переривання обробляти зараз, якщо їх кілька.
          </p>
          <p>
            <code className="rounded bg-slate-800 px-1 text-rose-300">
              NVIC_EnableIRQ(TIM3_IRQn)
            </code>{' '}
            каже NVIC: &quot;слухай переривання від TIM3&quot;. Без цього навіть якщо UIE=1,
            процесор не отримає переривання — NVIC його заблокує. Це два незалежних рівні дозволу.
          </p>
        </ExplanationSection>

        <ExplanationSection title="ISR — обробник переривання і скидання UIF">
          <p>
            Коли таймер переповнюється, він встановлює прапорець{' '}
            <strong>UIF (Update Interrupt Flag)</strong> у регістрі SR. Якщо UIE=1 і NVIC дозволено
            — викликається ISR (Interrupt Service Routine). Ім&apos;я функції строго визначене:
            TIM3_IRQHandler, TIM2_IRQHandler і т.д.
          </p>
          <p>
            <strong>Критично важливо</strong> на початку ISR скинути прапорець UIF — інакше після
            повернення з ISR він залишиться встановленим і NVIC одразу знову викличе ISR. Це
            нескінченний цикл переривань, в якому основний код взагалі не виконується.
          </p>
          <p>
            Як скинути? Записати 0 у відповідний біт SR:{' '}
            <code className="rounded bg-slate-800 px-1 text-sky-300">
              TIM3-&gt;SR &amp;= ~TIM_SR_UIF
            </code>
            . Зверніть увагу: тут &= ~ (записуємо 0), на відміну від EXTI PR де записуємо 1.{' '}
            <RmRef section="15.4.5" page={390} label="RM0008 §15.4.5 SR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="extern C — чому потрібен C linkage">
          <p>
            C++ &quot;прикрашає&quot; (mangling) імена функцій: void TIM3_IRQHandler() в C++
            насправді зберігається у бінарнику під іншим іменем типу _ZN12TIM3_IRQHandlerEv. Але
            таблиця векторів переривань (яку знає Cortex-M3) містить C-ім&apos;я TIM3_IRQHandler без
            декорування. Тому ми пишемо{' '}
            <code className="rounded bg-slate-800 px-1 text-sky-300">extern &quot;C&quot;</code> —
            щоб компілятор не декорував ім&apos;я і лінкер зміг знайти обробник за правильною
            адресою.
          </p>
        </ExplanationSection>
      </ExplanationPanel>
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
          (TIM2–TIM4, USART2/3, I2C, SPI2) може працювати некоректно. Збільшіть дільник APB1.
        </WarningBadge>
      )}

      <InfoBadge>
        SYSCLK = {srcMhz} × {mult} = <strong>{sysclk} МГц</strong> · APB1 = {apb1Mhz} МГц · Flash
        wait states: <strong>{latency}WS</strong> (0WS≤24, 1WS≤48, 2WS≤72 МГц)
      </InfoBadge>

      <CodeDisplay code={code} title="RCC PLL SETUP" />

      <ExplanationPanel>
        <ExplanationSection title="Дерево тактування STM32 — загальна картина">
          <p>
            За замовчуванням після скидання STM32F103 запускається від{' '}
            <strong>HSI (High Speed Internal)</strong> — внутрішнього RC-генератора з частотою 8
            МГц. Це дозволяє МК стартувати навіть без зовнішнього кварцу, але точність HSI ±1–2%.
            Щоб досягти максимальної швидкодії (72 МГц) і точної частоти — потрібен PLL.{' '}
            <RmRef section="7.2" page={98} label="RM0008 §7.2 Clock tree" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 1 — HSE: зовнішній кварц і HSERDY">
          <p>
            <strong>HSE (High Speed External)</strong> — вхід для зовнішнього кварцового резонатора
            або тактового сигналу. Наш кварц — 8 МГц. Після встановлення HSEON МК чекає, поки кварц
            стабілізується — прапорець <strong>HSERDY</strong> встановлюється апаратно. Типовий час
            стабілізації кварцу: 1–20 мс. Тому{' '}
            <code className="rounded bg-slate-800 px-1 text-amber-300">
              while (!(RCC-&gt;CR & RCC_CR_HSERDY)) {}
            </code>{' '}
            — це не нескінченний цикл, а чекання на реальну готовність генератора.{' '}
            <RmRef section="7.3.1" page={99} label="RM0008 §7.3.1 RCC_CR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 2 — Flash wait states: найнесподіваніший крок">
          <p>
            Це той крок, який забувають найчастіше, і МК потім поводиться дивно. Flash-пам&apos;ять
            (де зберігається ваша програма) не може читатися нескінченно швидко. При підвищенні
            системної частоти треба додати &quot;паузи&quot; (wait states), щоб процесор встигав
            отримати дані з Flash:
          </p>
          <p className="rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-300">
            SYSCLK ≤ 24 МГц → 0 wait states (читання з першого разу)
            <br />
            24 МГц {'<'} SYSCLK ≤ 48 МГц → 1 wait state (один такт очікування)
            <br />
            48 МГц {'<'} SYSCLK ≤ 72 МГц → 2 wait states (два такти очікування)
          </p>
          <p>
            Якщо не виставити wait states і одразу перемкнути на 72 МГц — процесор буде читати Flash
            занадто швидко, отримувати невірні інструкції і, скоріш за все, зависне або впаде у
            HardFault. <RmRef section="3.3.3" page={60} label="RM0008 §3.3.3 FLASH_ACR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Крок 3 — PLL: множник частоти">
          <p>
            PLL (Phase-Locked Loop, схема фазового автопідстроювання) — це аналоговий блок, що
            &quot;множить&quot; вхідну частоту. Джерело (HSE або HSI/2) подається на PLL, який
            множить частоту на заданий коефіцієнт PLLMULL. Для 72 МГц з HSE=8 МГц: PLLMULL=9 →
            8×9=72 МГц.
          </p>
          <p>
            Чому HSI/2? Якщо джерело — HSI (internal RC), то PLL отримує HSI/2 = 4 МГц (ділення на 2
            апаратно зафіксоване). Тому з HSI отримати 72 МГц неможливо (4×16=64 — максимум при
            mult=16). З HSE 8 МГц — можливо (8×9=72).{' '}
            <RmRef section="7.3.2" page={100} label="RM0008 §7.3.2 RCC_CFGR" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="APB1 divider — чому не можна залишити без ділення">
          <p>
            Після PLL ми маємо SYSCLK = 72 МГц. Від нього через AHB prescaler (зазвичай 1) отримуємо
            HCLK = 72 МГц. Далі — шини APB1 і APB2. APB2 може тактуватися на повній частоті HCLK (72
            МГц). Але <strong>APB1 обмежена 36 МГц</strong> за специфікацією.
          </p>
          <p>
            Якщо залишити APB1 без ділення при SYSCLK=72 МГц — периферія на APB1 (TIM2-4, USART2/3,
            I2C1/2, SPI2) буде тактуватися на 72 МГц, перевищуючи максимум. Наслідки: нестабільна
            робота, перегрів. Тому ставимо PPRE1=÷2 → APB1=36 МГц. До речі: таймери TIM2-4 при
            APB1≠1 отримують подвоєну частоту APB1 = 72 МГц — це спеціальна схема в дереві
            тактування. <RmRef section="7.2" page={98} label="RM0008 §7.2 Clock diagram" />
          </p>
        </ExplanationSection>

        <ExplanationSection title="Кроки 5–6 — PLLON, PLLRDY і перемикання SW">
          <p>
            Тепер вмикаємо PLL (PLLON=1) і чекаємо стабілізацію (PLLRDY=1). PLL теж потребує часу —
            зазвичай кілька мілісекунд.
          </p>
          <p>
            Нарешті перемикаємо системну частоту: поле <strong>SW (System clock Switch)</strong> у
            RCC_CFGR. SW=10 означає &quot;джерело SYSCLK = PLL&quot;. Після запису чекаємо
            підтвердження через <strong>SWS (System clock Switch Status)</strong> — апаратний
            прапорець, що підтверджує успішне перемикання. Лише після цього частота реально
            переключилася і код виконується на 72 МГц.{' '}
            <RmRef section="7.3.2" page={100} label="RM0008 §7.3.2 SW/SWS" />
          </p>
        </ExplanationSection>
      </ExplanationPanel>
    </div>
  );
}
