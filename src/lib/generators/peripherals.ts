import {
  ADC_CHANNEL_MAP,
  adcSmprNum,
  cnfMask,
  extiCrIndex,
  extiCrMacro,
  extiIrqName,
  extiPortMacro,
  modeMask,
  parsePinInfo,
  UART_TX_PINS,
} from '../pinUtils';

// ─── TIM: prescaler / ARR / enable ───────────────────────────────────────────

export interface TimerSetupConfig {
  timer: string; // 'TIM2', 'TIM3', ...
  psc: number;
  arr: number;
  clockMhz: number; // APB timer clock in MHz (typically 8 or 72)
}

export function generateTimerSetup(cfg: TimerSetupConfig): string {
  const num = cfg.timer.slice(3);
  const apb = cfg.timer === 'TIM1' ? 2 : 1;
  const clockBit = apb === 1 ? `RCC_APB1ENR_TIM${num}EN` : `RCC_APB2ENR_TIM1EN`;
  const enrReg = apb === 1 ? 'APB1ENR' : 'APB2ENR';

  const fTimer = cfg.clockMhz * 1_000_000;
  const fOut = fTimer / ((cfg.psc + 1) * (cfg.arr + 1));
  const fOutStr = fOut >= 1 ? `${fOut.toFixed(2)} Гц` : `${(fOut * 1000).toFixed(2)} мГц`;

  const lines: string[] = [];
  lines.push('// RM: Section 15.4 TIM registers');
  lines.push('');
  lines.push(`// 1. Тактування ${cfg.timer} на шині APB${apb}`);
  lines.push(`RCC->${enrReg} |= ${clockBit};`);
  lines.push('');
  lines.push(`// 2. Prescaler: ділить clock перед лічильником`);
  lines.push(
    `//    f_cnt = f_clk / (PSC+1) = ${cfg.clockMhz} МГц / ${cfg.psc + 1} = ${(fTimer / (cfg.psc + 1) / 1000).toFixed(1)} кГц`,
  );
  lines.push(`${cfg.timer}->PSC = ${cfg.psc};`);
  lines.push('');
  lines.push(`// 3. Auto-Reload Register: лічильник скидається при досягненні ARR`);
  lines.push(`//    f_out = f_cnt / (ARR+1) = ≈ ${fOutStr}`);
  lines.push(`${cfg.timer}->ARR = ${cfg.arr};`);
  lines.push('');
  lines.push(`// 4. Увімкнути лічильник (Counter ENable)`);
  lines.push(`${cfg.timer}->CR1 |= TIM_CR1_CEN;`);
  return lines.join('\n');
}

// ─── ADC: channel, sample time, start ────────────────────────────────────────

export type AdcSampleTime = '1_5' | '7_5' | '13_5' | '28_5' | '41_5' | '55_5' | '71_5' | '239_5';

const ADC_SMP_BITS: Record<AdcSampleTime, string> = {
  '1_5': '000',
  '7_5': '001',
  '13_5': '010',
  '28_5': '011',
  '41_5': '100',
  '55_5': '101',
  '71_5': '110',
  '239_5': '111',
};

const ADC_SMP_LABELS: Record<AdcSampleTime, string> = {
  '1_5': '1.5 циклів',
  '7_5': '7.5 циклів',
  '13_5': '13.5 циклів',
  '28_5': '28.5 циклів',
  '41_5': '41.5 циклів',
  '55_5': '55.5 циклів',
  '71_5': '71.5 циклів',
  '239_5': '239.5 циклів (максимум)',
};

function adcSmpMacros(ch: number, smp: AdcSampleTime): string {
  const smprNum = adcSmprNum(ch);
  const bits = ADC_SMP_BITS[smp];
  const prefix = `ADC_SMPR${smprNum}_SMP${ch}`;

  // Build OR expression from bits
  const parts: string[] = [];
  if (bits[0] === '1') parts.push(`${prefix}_2`);
  if (bits[1] === '1') parts.push(`${prefix}_1`);
  if (bits[2] === '1') parts.push(`${prefix}_0`);

  if (parts.length === 0) {
    return `/* SMP=000 — очищення вже достатньо */`;
  }
  return parts.join(' | ');
}

export interface AdcSetupConfig {
  pin: string;
  sampleTime: AdcSampleTime;
}

export function generateAdcSetup(cfg: AdcSetupConfig): string {
  const ch = ADC_CHANNEL_MAP[cfg.pin];
  if (ch === undefined) return '// Невідомий ADC пін';
  const smprNum = adcSmprNum(ch);
  const smprReg = `SMPR${smprNum}`;
  const smprMask = `ADC_${smprReg}_SMP${ch}`;

  const p = parsePinInfo(cfg.pin);

  const lines: string[] = [];
  lines.push('// RM: Section 11.12 ADC registers');
  lines.push('');
  lines.push(`// 1. Тактування GPIO${p.port} + ADC1`);
  lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_ADC1EN;`);
  lines.push('');
  lines.push(`// 2. Налаштувати ${cfg.pin} як аналоговий вхід: MODE=00, CNF=00`);
  lines.push(`GPIO${p.port}->${p.regSuffix} &= ~(${modeMask(p)} | ${cnfMask(p)});`);
  lines.push(`//    Усі біти нулі — аналоговий режим (за замовчуванням після очищення)`);
  lines.push('');
  lines.push(`// 3. Увімкнути ADC1 (ADON)`);
  lines.push(`ADC1->CR2 |= ADC_CR2_ADON;`);
  lines.push('');
  lines.push(`// 4. Вибрати канал ${ch} (пін ${cfg.pin}) у регістрі SQR3`);
  lines.push(`//    SQR3 = номер каналу для першого перетворення у послідовності`);
  lines.push(`ADC1->SQR3 = ${ch};`);
  lines.push('');
  lines.push(`// 5. Задати час вибірки: ${ADC_SMP_LABELS[cfg.sampleTime]}`);
  lines.push(`//    CH${ch}: у регістрі ${smprReg} (CH0-9 → SMPR2, CH10-17 → SMPR1)`);
  lines.push(`ADC1->${smprReg} &= ~${smprMask};   // очистити поле SMP${ch}`);
  if (ADC_SMP_BITS[cfg.sampleTime] !== '000') {
    lines.push(`ADC1->${smprReg} |= ${adcSmpMacros(ch, cfg.sampleTime)};`);
  }
  lines.push('');
  lines.push(`// 6. Запустити перетворення через software trigger`);
  lines.push(`ADC1->CR2 |= ADC_CR2_EXTSEL;    // EXTSEL=111 → SWSTART`);
  lines.push(`ADC1->CR2 |= ADC_CR2_EXTTRIG;   // дозволити зовнішній тригер`);
  lines.push(`ADC1->CR2 |= ADC_CR2_SWSTART;   // старт`);
  lines.push('');
  lines.push(`// 7. Дочекатися завершення і зчитати результат`);
  lines.push(`while (!(ADC1->SR & ADC_SR_EOC)) {}`);
  lines.push(`uint16_t result = ADC1->DR;`);

  return lines.join('\n');
}

// ─── UART TX ──────────────────────────────────────────────────────────────────

export interface UartTxConfig {
  pin: string;
  baudrate: number;
  clockMhz: number;
}

export function generateUartTx(cfg: UartTxConfig): string {
  const entry = UART_TX_PINS.find((e) => e.pin === cfg.pin);
  if (!entry) return '// Невідомий UART TX пін';

  const { usart, apb, clockBit, remap } = entry;
  const p = parsePinInfo(cfg.pin);
  const brr = Math.round((cfg.clockMhz * 1_000_000) / cfg.baudrate);
  const enrReg = apb === 1 ? 'APB1ENR' : 'APB2ENR';
  const usartNum = entry.usartNum;

  const lines: string[] = [];
  lines.push('// RM: Section 27.6 USART registers');
  lines.push('');
  lines.push(`// 1. Тактування GPIO${p.port}, AFIO та ${usart}`);
  lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  lines.push(`RCC->${enrReg} |= ${clockBit};`);

  if (remap) {
    lines.push('');
    lines.push(`// 2. Remap ${usart}: увімкнути через AFIO_MAPR`);
    if (usartNum === 1) {
      lines.push(`AFIO->MAPR |= AFIO_MAPR_USART1_REMAP;   // TX→PB6, RX→PB7`);
    } else if (usartNum === 3) {
      lines.push(`AFIO->MAPR |= AFIO_MAPR_USART3_REMAP_PARTIALREMAP;  // TX→PC10, RX→PC11`);
    }
  }

  lines.push('');
  lines.push(`// ${remap ? 3 : 2}. Налаштувати ${cfg.pin} як AF push-pull (MODE=11, CNF=10)`);
  lines.push(`//    TX — вихід, тому потрібен AF push-pull, швидкість 50 МГц`);
  lines.push(`GPIO${p.port}->${p.regSuffix} &= ~(${modeMask(p)} | ${cnfMask(p)});`);
  lines.push(
    `GPIO${p.port}->${p.regSuffix} |= ${modeMask(p, '_0')} | ${modeMask(p, '_1')} | ${cnfMask(p, '_1')};`,
  );
  lines.push('');
  lines.push(`// ${remap ? 4 : 3}. Baudrate = PCLK${apb} / BRR`);
  lines.push(`//    ${cfg.clockMhz} МГц / ${cfg.baudrate} = ${brr} (цілочисельний)`);
  lines.push(`${usart}->BRR = ${brr};`);
  lines.push('');
  lines.push(`// ${remap ? 5 : 4}. Увімкнути TX (TE) та сам USART (UE)`);
  lines.push(`${usart}->CR1 |= USART_CR1_TE;   // Transmitter Enable`);
  lines.push(`${usart}->CR1 |= USART_CR1_UE;   // USART Enable`);

  return lines.join('\n');
}

// ─── EXTI ─────────────────────────────────────────────────────────────────────

export type ExtiEdge = 'rising' | 'falling' | 'both';

export interface ExtiConfig {
  pin: string;
  edge: ExtiEdge;
}

export function generateExti(cfg: ExtiConfig): string {
  const p = parsePinInfo(cfg.pin);
  const crIdx = extiCrIndex(p.num);
  const crMacro = extiCrMacro(p.num);
  const portMacro = extiPortMacro(p.num, p.port);
  const irq = extiIrqName(p.num);

  const lines: string[] = [];
  lines.push('// RM: Section 10.3 EXTI + Section 9.4.3 AFIO_EXTICR');
  lines.push('');
  lines.push(`// 1. Тактування GPIO${p.port} та AFIO (для маршрутизації EXTI)`);
  lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  lines.push('');
  lines.push(`// 2. Налаштувати ${cfg.pin} як floating input`);
  lines.push(`GPIO${p.port}->${p.regSuffix} &= ~(${modeMask(p)} | ${cnfMask(p)});`);
  lines.push(`GPIO${p.port}->${p.regSuffix} |= ${cnfMask(p, '_0')};   // CNF=01 floating`);
  lines.push('');
  lines.push(`// 3. Вибрати порт ${p.port} для EXTI${p.num}`);
  lines.push(
    `//    EXTICR[${crIdx}] = AFIO_EXTICR${crIdx + 1} відповідає EXTI${crIdx * 4}–${crIdx * 4 + 3}`,
  );
  lines.push(`AFIO->EXTICR[${crIdx}] &= ~${crMacro};`);
  lines.push(`AFIO->EXTICR[${crIdx}] |= ${portMacro};`);
  lines.push('');

  if (cfg.edge === 'rising' || cfg.edge === 'both') {
    lines.push(`// 4a. Rising edge trigger`);
    lines.push(`EXTI->RTSR |= EXTI_RTSR_TR${p.num};`);
  }
  if (cfg.edge === 'falling' || cfg.edge === 'both') {
    lines.push(`// 4${cfg.edge === 'both' ? 'b' : ''}. Falling edge trigger`);
    lines.push(`EXTI->FTSR |= EXTI_FTSR_TR${p.num};`);
  }
  lines.push('');
  lines.push(`// 5. Розмаскувати лінію переривання EXTI${p.num}`);
  lines.push(`EXTI->IMR |= EXTI_IMR_MR${p.num};`);
  lines.push('');
  lines.push(`// 6. Увімкнути переривання у NVIC`);
  lines.push(`//    EXTI0–4: окремі IRQ; EXTI5–9: EXTI9_5_IRQn; EXTI10–15: EXTI15_10_IRQn`);
  lines.push(`NVIC_EnableIRQ(${irq});`);
  lines.push('');
  lines.push(`// ISR — обробник переривання:`);
  lines.push(`extern "C" void ${irq.replace('_IRQn', 'Handler')}() {`);
  lines.push(`    if (EXTI->PR & EXTI_PR_PR${p.num}) {`);
  lines.push(`        EXTI->PR = EXTI_PR_PR${p.num};   // скинути прапорець (write 1 to clear)`);
  lines.push(`    }`);
  lines.push(`}`);

  return lines.join('\n');
}
