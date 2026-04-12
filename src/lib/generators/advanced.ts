import { cnfMask, getPwmMapping, modeMask, parsePinInfo, TIMERS, UART_RX_PINS } from '../pinUtils';

// ─── PWM ──────────────────────────────────────────────────────────────────────

export interface PwmConfig {
  pin: string;
  dutyCyclePct: number; // 0-100
  psc: number;
  arr: number;
  clockMhz: number;
}

export function generatePwm(cfg: PwmConfig): string {
  const m = getPwmMapping(cfg.pin);
  if (!m) return '// Пін не підтримує PWM';

  const p = parsePinInfo(cfg.pin);
  const ccr = Math.round((cfg.dutyCyclePct / 100) * (cfg.arr + 1));
  const enrReg = m.apbBus === 1 ? 'APB1ENR' : 'APB2ENR';
  const fOut = (cfg.clockMhz * 1_000_000) / ((cfg.psc + 1) * (cfg.arr + 1));

  const lines: string[] = [];
  lines.push('// RM0008: Section 15.3.9 PWM mode');
  lines.push('');
  lines.push(`// 1. Тактування GPIO${p.port} + AFIO + ${m.timer}`);
  lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  lines.push(`RCC->${enrReg} |= ${m.timerClock};`);
  lines.push('');
  lines.push(`// 2. Налаштувати ${cfg.pin} як AF push-pull (MODE=11, CNF=10)`);
  lines.push(`//    Для виводу PWM потрібен alternate function push-pull`);
  lines.push(`GPIO${p.port}->${p.regSuffix} &= ~(${modeMask(p)} | ${cnfMask(p)});`);
  lines.push(
    `GPIO${p.port}->${p.regSuffix} |= ${modeMask(p, '_0')} | ${modeMask(p, '_1')} | ${cnfMask(p, '_1')};`,
  );
  lines.push('');
  lines.push(`// 3. Таймер ${m.timer}: prescaler і auto-reload`);
  lines.push(`//    f_PWM = f_clk / ((PSC+1) * (ARR+1)) ≈ ${fOut.toFixed(1)} Гц`);
  lines.push(`${m.timer}->PSC = ${cfg.psc};`);
  lines.push(`${m.timer}->ARR = ${cfg.arr};`);
  lines.push('');
  lines.push(`// 4. PWM Mode 1 на каналі CH${m.channel} → регістр ${m.ccmrReg}`);
  lines.push(`//    OCxM=110 (PWM mode 1): канал активний, поки CNT < CCR`);
  lines.push(`${m.timer}->${m.ccmrReg} &= ~TIM_${m.ccmrReg}_${m.ocmField};`);
  lines.push(
    `${m.timer}->${m.ccmrReg} |= TIM_${m.ccmrReg}_${m.ocmField}_1 | TIM_${m.ccmrReg}_${m.ocmField}_2; // 110`,
  );
  lines.push(`${m.timer}->${m.ccmrReg} |= TIM_${m.ccmrReg}_${m.ocpeField};   // preload enable`);
  lines.push('');
  lines.push(
    `// 5. Duty cycle: CCR${m.channel} / (ARR+1) = ${ccr} / ${cfg.arr + 1} ≈ ${cfg.dutyCyclePct}%`,
  );
  lines.push(`${m.timer}->${m.ccrReg} = ${ccr};`);
  lines.push('');
  lines.push(`// 6. Увімкнути вихід каналу CH${m.channel}`);
  lines.push(`${m.timer}->CCER |= TIM_CCER_${m.ccerBit};`);

  if (m.needsBDTR) {
    lines.push('');
    lines.push(`// 7. BDTR: потрібен ТІЛЬКИ для TIM1 (advanced timer)`);
    lines.push(`//    MOE — Main Output Enable`);
    lines.push(`${m.timer}->BDTR |= TIM_BDTR_MOE;`);
  }

  lines.push('');
  lines.push(`// ${m.needsBDTR ? 8 : 7}. Update Generation + запуск лічильника`);
  lines.push(`${m.timer}->EGR = TIM_EGR_UG;    // примусове оновлення (завантажити PSC/ARR/CCR)`);
  lines.push(`${m.timer}->CR1 |= TIM_CR1_CEN;  // запуск`);

  return lines.join('\n');
}

// ─── UART RX ──────────────────────────────────────────────────────────────────

export interface UartRxConfig {
  pin: string;
  withInterrupt: boolean;
  baudrate: number;
  clockMhz: number;
}

export function generateUartRx(cfg: UartRxConfig): string {
  const entry = UART_RX_PINS.find((e) => e.pin === cfg.pin);
  if (!entry) return '// Невідомий UART RX пін';

  const { usart, apb, clockBit, remap, irqName, usartNum } = entry;
  const p = parsePinInfo(cfg.pin);
  const clkHz = cfg.clockMhz * 1_000_000;
  const brr = Math.round(clkHz / cfg.baudrate);
  const enrReg = apb === 1 ? 'APB1ENR' : 'APB2ENR';

  const lines: string[] = [];
  lines.push('// RM0008: Section 27.6.4 USART_CR1');
  lines.push('');
  lines.push(`// 1. Тактування GPIO${p.port}, AFIO та ${usart}`);
  lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  lines.push(`RCC->${enrReg} |= ${clockBit};`);

  if (remap) {
    lines.push('');
    lines.push(`// 2. Remap ${usart}`);
    if (usartNum === 1) {
      lines.push(`AFIO->MAPR |= AFIO_MAPR_USART1_REMAP;   // RX→PB7`);
    } else if (usartNum === 3) {
      lines.push(`AFIO->MAPR |= AFIO_MAPR_USART3_REMAP_PARTIALREMAP;  // RX→PC11`);
    }
  }

  lines.push('');
  lines.push(`// ${remap ? 3 : 2}. Налаштувати ${cfg.pin} як input pull-up`);
  lines.push(`//    UART RX: floating або pull-up. Pull-up рекомендовано — без нього`);
  lines.push(`//    лінія може "плавати" і давати хибні байти при відключеному TX.`);
  lines.push(`GPIO${p.port}->${p.regSuffix} &= ~(${modeMask(p)} | ${cnfMask(p)});`);
  lines.push(
    `GPIO${p.port}->${p.regSuffix} |= ${cnfMask(p, '_1')};            // CNF=10 input pull`,
  );
  lines.push(`GPIO${p.port}->BSRR = GPIO_BSRR_BS${p.num};              // pull-UP (ODR=1)`);
  lines.push('');
  lines.push(`// ${remap ? 4 : 3}. Baudrate`);
  lines.push(`//    ${cfg.clockMhz} МГц / ${cfg.baudrate} bps = ${brr}`);
  lines.push(`${usart}->BRR = ${clkHz} / ${cfg.baudrate};`);
  lines.push('');
  lines.push(`// ${remap ? 5 : 4}. Увімкнути RX`);
  lines.push(`${usart}->CR1 |= USART_CR1_RE;   // Receiver Enable`);

  if (cfg.withInterrupt) {
    lines.push(`${usart}->CR1 |= USART_CR1_RXNEIE;  // RX Not Empty Interrupt Enable`);
    lines.push(`NVIC_EnableIRQ(${irqName});`);
  }

  lines.push(`${usart}->CR1 |= USART_CR1_UE;   // USART Enable`);

  if (cfg.withInterrupt) {
    lines.push('');
    lines.push(`// ISR:`);
    lines.push(`extern "C" void ${irqName.replace('_IRQn', 'Handler')}() {`);
    lines.push(`    if (${usart}->SR & USART_SR_RXNE) {`);
    lines.push(`        char c = ${usart}->DR & 0xFF;  // читання скидає прапорець RXNE`);
    lines.push(`    }`);
    lines.push(`}`);
  }

  return lines.join('\n');
}

// ─── Timer interrupt ──────────────────────────────────────────────────────────

export interface TimerIrqConfig {
  timer: string;
  psc: number;
  arr: number;
  clockMhz: number;
}

export function generateTimerIrq(cfg: TimerIrqConfig): string {
  const info = TIMERS.find((t) => t.name === cfg.timer);
  if (!info) return '// Невідомий таймер';

  const { apb, clockBit, irqName } = info;
  const enrReg = apb === 1 ? 'APB1ENR' : 'APB2ENR';
  const num = cfg.timer.slice(3);
  const fOut = (cfg.clockMhz * 1_000_000) / ((cfg.psc + 1) * (cfg.arr + 1));

  const lines: string[] = [];
  lines.push('// RM0008: Section 15.4.4 TIMx_DIER (DMA/Interrupt Enable Register)');
  lines.push('');
  lines.push(`// 1. Тактування ${cfg.timer}`);
  lines.push(`RCC->${enrReg} |= ${clockBit};`);
  lines.push('');
  lines.push(`// 2. Налаштувати таймер (prescaler і ARR)`);
  lines.push(`//    f_overflow ≈ ${fOut.toFixed(2)} Гц`);
  lines.push(`${cfg.timer}->PSC = ${cfg.psc};`);
  lines.push(`${cfg.timer}->ARR = ${cfg.arr};`);
  lines.push('');
  lines.push(`// 3. Увімкнути переривання при Update Event (UIE)`);
  lines.push(`//    Update Event генерується при переповненні лічильника (CNT → ARR → 0)`);
  lines.push(`${cfg.timer}->DIER |= TIM_DIER_UIE;`);
  lines.push('');
  lines.push(`// 4. Увімкнути переривання в NVIC`);
  lines.push(`NVIC_EnableIRQ(${irqName});`);
  lines.push('');
  lines.push(`// 5. Запустити лічильник`);
  lines.push(`${cfg.timer}->CR1 |= TIM_CR1_CEN;`);
  lines.push('');
  lines.push(`// ISR — обробник переривання:`);
  lines.push(`extern "C" void TIM${num}_IRQHandler() {`);
  lines.push(`    if (${cfg.timer}->SR & TIM_SR_UIF) {`);
  lines.push(`        ${cfg.timer}->SR &= ~TIM_SR_UIF;   // скинути прапорець Update`);
  lines.push(`        // ваш код тут`);
  lines.push(`    }`);
  lines.push(`}`);

  return lines.join('\n');
}

// ─── RCC PLL ──────────────────────────────────────────────────────────────────

export type PllSource = 'HSE' | 'HSI_div2';
export type PllMultiplier = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
export type Apb1Divider = 1 | 2 | 4 | 8 | 16;

export interface RccPllConfig {
  source: PllSource;
  multiplier: PllMultiplier;
  apb1Div: Apb1Divider;
}

export function generateRccPll(cfg: RccPllConfig): string {
  const srcFreqMhz = cfg.source === 'HSE' ? 8 : 4; // HSI/2 = 4 MHz
  const sysclkMhz = srcFreqMhz * cfg.multiplier;
  const apb1Mhz = sysclkMhz / cfg.apb1Div;

  const pllmullMacro =
    cfg.multiplier === 16 ? 'RCC_CFGR_PLLMULL16' : `RCC_CFGR_PLLMULL${cfg.multiplier}`;

  const apb1Macro: Record<number, string> = {
    1: '/* APB1 = HCLK, без ділення */',
    2: 'RCC_CFGR_PPRE1_DIV2',
    4: 'RCC_CFGR_PPRE1_DIV4',
    8: 'RCC_CFGR_PPRE1_DIV8',
    16: 'RCC_CFGR_PPRE1_DIV16',
  };

  // Flash latency: 0WS ≤24 MHz, 1WS ≤48 MHz, 2WS ≤72 MHz
  const latency = sysclkMhz <= 24 ? 0 : sysclkMhz <= 48 ? 1 : 2;
  const latMacro = `FLASH_ACR_LATENCY_${latency}`;

  const lines: string[] = [];
  lines.push('// RM0008: Section 7.2 Clock tree + Section 7.3.2 RCC_CFGR');
  lines.push('');

  if (cfg.source === 'HSE') {
    lines.push('// 1. Увімкнути HSE (зовнішній кварц 8 МГц) і дочекатися стабілізації');
    lines.push('RCC->CR |= RCC_CR_HSEON;');
    lines.push('while (!(RCC->CR & RCC_CR_HSERDY)) {}');
  } else {
    lines.push('// 1. HSI вже активний після reset; HSI/2 = 4 МГц');
  }

  lines.push('');
  lines.push(`// 2. Flash: додати wait states для ${sysclkMhz} МГц`);
  lines.push(`//    ≤24 МГц → 0WS, ≤48 МГц → 1WS, ≤72 МГц → 2WS`);
  if (latency > 0) {
    lines.push(`FLASH->ACR |= ${latMacro};`);
  } else {
    lines.push(`FLASH->ACR &= ~FLASH_ACR_LATENCY; // 0 wait states (${sysclkMhz} МГц ≤ 24 МГц)`);
  }

  lines.push('');
  lines.push(`// 3. Налаштувати PLL: джерело = ${cfg.source}, множник = ×${cfg.multiplier}`);
  lines.push(`//    SYSCLK = ${srcFreqMhz} МГц × ${cfg.multiplier} = ${sysclkMhz} МГц`);
  if (cfg.source === 'HSE') {
    lines.push(`RCC->CFGR |= RCC_CFGR_PLLSRC;          // HSE як джерело PLL`);
  } else {
    lines.push(`// PLLSRC=0 (за замовчуванням) → HSI/2 як джерело PLL`);
  }
  lines.push(`RCC->CFGR |= ${pllmullMacro};`);

  if (cfg.apb1Div > 1) {
    lines.push('');
    lines.push(
      `// 4. APB1 divider: APB1 max 36 МГц → ${sysclkMhz} / ${cfg.apb1Div} = ${apb1Mhz} МГц`,
    );
    lines.push(`RCC->CFGR |= ${apb1Macro[cfg.apb1Div]};`);
  }

  lines.push('');
  lines.push(`// ${cfg.apb1Div > 1 ? 5 : 4}. Увімкнути PLL і дочекатися стабілізації`);
  lines.push(`RCC->CR |= RCC_CR_PLLON;`);
  lines.push(`while (!(RCC->CR & RCC_CR_PLLRDY)) {}`);
  lines.push('');
  lines.push(`// ${cfg.apb1Div > 1 ? 6 : 5}. Переключити системну частоту на PLL`);
  lines.push(`RCC->CFGR &= ~RCC_CFGR_SW;              // очистити SW`);
  lines.push(`RCC->CFGR |= RCC_CFGR_SW_PLL;           // SW=10 → PLL`);
  lines.push(`while ((RCC->CFGR & RCC_CFGR_SWS) != RCC_CFGR_SWS_PLL) {} // чекати підтвердження`);
  lines.push('');
  lines.push(`// Результат: SYSCLK = ${sysclkMhz} МГц, APB1 = ${apb1Mhz} МГц`);

  return lines.join('\n');
}
