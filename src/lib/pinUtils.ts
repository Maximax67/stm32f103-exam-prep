// ─── Pin parsing ─────────────────────────────────────────────────────────────

export interface PinInfo {
  port: string; // 'A', 'B', 'C', ...
  num: number; // 0-15
  isHigh: boolean; // pin >= 8 → CRH
  regSuffix: string; // 'CRL' or 'CRH'
  gpio: string; // 'GPIOA', 'GPIOB', ...
  clockBit: string; // 'RCC_APB2ENR_IOPAEN'
}

export function parsePinInfo(pin: string): PinInfo {
  const port = pin[1].toUpperCase();
  const num = parseInt(pin.slice(2), 10);
  const isHigh = num >= 8;
  return {
    port,
    num,
    isHigh,
    regSuffix: isHigh ? 'CRH' : 'CRL',
    gpio: `GPIO${port}`,
    clockBit: `RCC_APB2ENR_IOP${port}EN`,
  };
}

// MODE constant name, e.g. GPIO_CRL_MODE3 or GPIO_CRH_MODE9
export function modeMask(p: PinInfo, suffix = ''): string {
  return `GPIO_${p.regSuffix}_MODE${p.num}${suffix}`;
}

// CNF constant name
export function cnfMask(p: PinInfo, suffix = ''): string {
  return `GPIO_${p.regSuffix}_CNF${p.num}${suffix}`;
}

// ─── GPIO pin lists ──────────────────────────────────────────────────────────

export const ALL_GPIO_PINS: string[] = [
  ...Array.from({ length: 16 }, (_, i) => `PA${i}`),
  ...Array.from({ length: 16 }, (_, i) => `PB${i}`),
  ...Array.from({ length: 16 }, (_, i) => `PC${i}`),
  ...Array.from({ length: 16 }, (_, i) => `PD${i}`),
];

// ─── ADC channel mapping ─────────────────────────────────────────────────────
// STM32F103: channels 0–9 in SMPR2, channels 10–17 in SMPR1

export const ADC_CHANNEL_MAP: Record<string, number> = {
  PA0: 0,
  PA1: 1,
  PA2: 2,
  PA3: 3,
  PA4: 4,
  PA5: 5,
  PA6: 6,
  PA7: 7,
  PB0: 8,
  PB1: 9,
  PC0: 10,
  PC1: 11,
  PC2: 12,
  PC3: 13,
  PC4: 14,
  PC5: 15,
};

export const ADC_CAPABLE_PINS = Object.keys(ADC_CHANNEL_MAP);

/** Returns which SMPR register to use (1 = SMPR1 for CH10+, 2 = SMPR2 for CH0-9) */
export function adcSmprNum(ch: number): 1 | 2 {
  return ch >= 10 ? 1 : 2;
}

// ─── PWM pin → timer/channel mapping ─────────────────────────────────────────
// STM32F103 default alternate function mapping (no remap unless noted)

export interface PwmMapping {
  timer: string; // 'TIM1', 'TIM2', ...
  channel: number; // 1-4
  needsBDTR: boolean; // only TIM1 (advanced timer)
  apbBus: 1 | 2;
  ccmrReg: string; // 'CCMR1' (CH1,CH2) or 'CCMR2' (CH3,CH4)
  ocmField: string; // e.g. 'OC1M', 'OC2M'
  ocpeField: string; // e.g. 'OC1PE'
  ccerBit: string; // e.g. 'CC1E'
  ccrReg: string; // e.g. 'CCR1'
  timerClock: string;
}

const PWM_MAP: Record<string, { timer: string; ch: number }> = {
  PA0: { timer: 'TIM2', ch: 1 },
  PA1: { timer: 'TIM2', ch: 2 },
  PA2: { timer: 'TIM2', ch: 3 },
  PA3: { timer: 'TIM2', ch: 4 },
  PA6: { timer: 'TIM3', ch: 1 },
  PA7: { timer: 'TIM3', ch: 2 },
  PA8: { timer: 'TIM1', ch: 1 },
  PA9: { timer: 'TIM1', ch: 2 },
  PA10: { timer: 'TIM1', ch: 3 },
  PA11: { timer: 'TIM1', ch: 4 },
  PB0: { timer: 'TIM3', ch: 3 },
  PB1: { timer: 'TIM3', ch: 4 },
  PB6: { timer: 'TIM4', ch: 1 },
  PB7: { timer: 'TIM4', ch: 2 },
  PB8: { timer: 'TIM4', ch: 3 },
  PB9: { timer: 'TIM4', ch: 4 },
};

export const PWM_CAPABLE_PINS = Object.keys(PWM_MAP);

export function getPwmMapping(pin: string): PwmMapping | null {
  const m = PWM_MAP[pin];
  if (!m) return null;
  const { timer, ch } = m;
  const isAdv = timer === 'TIM1';
  const apb: 1 | 2 = isAdv ? 2 : 1;
  const ccmr = ch <= 2 ? 'CCMR1' : 'CCMR2';
  const chInReg = ch <= 2 ? ch : ch - 2; // position within CCMR register
  return {
    timer,
    channel: ch,
    needsBDTR: isAdv,
    apbBus: apb,
    ccmrReg: ccmr,
    ocmField: `OC${chInReg}M`,
    ocpeField: `OC${chInReg}PE`,
    ccerBit: `CC${ch}E`,
    ccrReg: `CCR${ch}`,
    timerClock: apb === 2 ? `RCC_APB2ENR_TIM1EN` : `RCC_APB1ENR_TIM${timer.slice(3)}EN`,
  };
}

// ─── UART pin mappings ────────────────────────────────────────────────────────

export interface UartPinEntry {
  pin: string;
  usart: string; // 'USART1', 'USART2', 'USART3'
  remap: boolean;
  apb: 1 | 2;
  clockBit: string;
  irqName: string;
  usartNum: number;
}

export const UART_TX_PINS: UartPinEntry[] = [
  {
    pin: 'PA9',
    usart: 'USART1',
    remap: false,
    apb: 2,
    clockBit: 'RCC_APB2ENR_USART1EN',
    irqName: 'USART1_IRQn',
    usartNum: 1,
  },
  {
    pin: 'PB6',
    usart: 'USART1',
    remap: true,
    apb: 2,
    clockBit: 'RCC_APB2ENR_USART1EN',
    irqName: 'USART1_IRQn',
    usartNum: 1,
  },
  {
    pin: 'PA2',
    usart: 'USART2',
    remap: false,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART2EN',
    irqName: 'USART2_IRQn',
    usartNum: 2,
  },
  {
    pin: 'PB10',
    usart: 'USART3',
    remap: false,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
  {
    pin: 'PC10',
    usart: 'USART3',
    remap: true,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
  {
    pin: 'PB9',
    usart: 'USART3',
    remap: true,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
];

export const UART_RX_PINS: UartPinEntry[] = [
  {
    pin: 'PA10',
    usart: 'USART1',
    remap: false,
    apb: 2,
    clockBit: 'RCC_APB2ENR_USART1EN',
    irqName: 'USART1_IRQn',
    usartNum: 1,
  },
  {
    pin: 'PB7',
    usart: 'USART1',
    remap: true,
    apb: 2,
    clockBit: 'RCC_APB2ENR_USART1EN',
    irqName: 'USART1_IRQn',
    usartNum: 1,
  },
  {
    pin: 'PA3',
    usart: 'USART2',
    remap: false,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART2EN',
    irqName: 'USART2_IRQn',
    usartNum: 2,
  },
  {
    pin: 'PB11',
    usart: 'USART3',
    remap: false,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
  {
    pin: 'PC11',
    usart: 'USART3',
    remap: true,
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
];

// ─── Timer info ───────────────────────────────────────────────────────────────

export interface TimerInfo {
  name: string; // 'TIM2'
  apb: 1 | 2;
  clockBit: string;
  irqName: string;
}

export const TIMERS: TimerInfo[] = [
  { name: 'TIM2', apb: 1, clockBit: 'RCC_APB1ENR_TIM2EN', irqName: 'TIM2_IRQn' },
  { name: 'TIM3', apb: 1, clockBit: 'RCC_APB1ENR_TIM3EN', irqName: 'TIM3_IRQn' },
  { name: 'TIM4', apb: 1, clockBit: 'RCC_APB1ENR_TIM4EN', irqName: 'TIM4_IRQn' },
  { name: 'TIM5', apb: 1, clockBit: 'RCC_APB1ENR_TIM5EN', irqName: 'TIM5_IRQn' },
];

// ─── EXTI mapping ─────────────────────────────────────────────────────────────
// EXTICR[0]=EXTI0-3, [1]=EXTI4-7, [2]=EXTI8-11, [3]=EXTI12-15

export function extiCrIndex(pinNum: number): number {
  return Math.floor(pinNum / 4);
}

export function extiCrMacro(pinNum: number): string {
  return `AFIO_EXTICR${extiCrIndex(pinNum) + 1}_EXTI${pinNum}`;
}

export function extiPortMacro(pinNum: number, port: string): string {
  return `AFIO_EXTICR${extiCrIndex(pinNum) + 1}_EXTI${pinNum}_P${port}`;
}

export function extiIrqName(pinNum: number): string {
  if (pinNum <= 4) return `EXTI${pinNum}_IRQn`;
  if (pinNum <= 9) return 'EXTI9_5_IRQn';
  return 'EXTI15_10_IRQn';
}

// ─── Baud rate clock helpers ──────────────────────────────────────────────────

export const COMMON_BAUDRATES = [9600, 19200, 38400, 57600, 115200];
export const COMMON_CLOCKS_MHZ = [8, 36, 48, 72];
