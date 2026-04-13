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

// ─── JTAG / SWD pin detection ─────────────────────────────────────────────────
export type JtagPinKind = 'jtag_only' | 'swd';

export interface JtagPinInfo {
  kind: JtagPinKind;
  signalName: string;
}

const JTAG_PIN_MAP: Record<string, JtagPinInfo> = {
  PA13: { kind: 'swd', signalName: 'JTMS / SWDIO' },
  PA14: { kind: 'swd', signalName: 'JTCK / SWCLK' },
  PA15: { kind: 'jtag_only', signalName: 'JTDI' },
  PB3: { kind: 'jtag_only', signalName: 'JTDO / SWO' },
  PB4: { kind: 'jtag_only', signalName: 'NJTRST' },
};

export function getJtagInfo(pin: string): JtagPinInfo | null {
  return JTAG_PIN_MAP[pin] ?? null;
}

// ─── GPIO pin lists ──────────────────────────────────────────────────────────

export const ALL_GPIO_PINS: string[] = [
  ...Array.from({ length: 16 }, (_, i) => `PA${i}`),
  ...Array.from({ length: 16 }, (_, i) => `PB${i}`),
  ...Array.from({ length: 16 }, (_, i) => `PC${i}`),
  ...Array.from({ length: 16 }, (_, i) => `PD${i}`),
];

// ─── ADC channel mapping ─────────────────────────────────────────────────────

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

export function adcSmprNum(ch: number): 1 | 2 {
  return ch >= 10 ? 1 : 2;
}

// ─── PWM pin → timer/channel mapping ─────────────────────────────────────────

export interface PwmMapping {
  timer: string;
  channel: number;
  needsBDTR: boolean;
  apbBus: 1 | 2;
  ccmrReg: string;
  ocmField: string;
  ocpeField: string;
  ccerBit: string;
  ccrReg: string;
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
  const chInReg = ch <= 2 ? ch : ch - 2;
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
  usart: string;
  remap: boolean;
  remapMacro?: string; // AFIO_MAPR macro to set, e.g. 'AFIO_MAPR_USART1_REMAP'
  remapComment?: string; // human-readable comment, e.g. 'TX→PB6, RX→PB7'
  apb: 1 | 2;
  clockBit: string;
  irqName: string;
  usartNum: number;
}

export const UART_TX_PINS: UartPinEntry[] = [
  // USART1
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
    remapMacro: 'AFIO_MAPR_USART1_REMAP',
    remapComment: 'TX→PB6, RX→PB7',
    apb: 2,
    clockBit: 'RCC_APB2ENR_USART1EN',
    irqName: 'USART1_IRQn',
    usartNum: 1,
  },
  // USART2
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
    pin: 'PD5',
    usart: 'USART2',
    remap: true,
    remapMacro: 'AFIO_MAPR_USART2_REMAP',
    remapComment: 'TX→PD5, RX→PD6',
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART2EN',
    irqName: 'USART2_IRQn',
    usartNum: 2,
  },
  // USART3
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
    remapMacro: 'AFIO_MAPR_USART3_REMAP_PARTIALREMAP',
    remapComment: 'TX→PC10, RX→PC11 (partial remap)',
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
  {
    pin: 'PD8',
    usart: 'USART3',
    remap: true,
    remapMacro: 'AFIO_MAPR_USART3_REMAP_FULLREMAP',
    remapComment: 'TX→PD8, RX→PD9 (full remap)',
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
];

export const UART_RX_PINS: UartPinEntry[] = [
  // USART1
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
    remapMacro: 'AFIO_MAPR_USART1_REMAP',
    remapComment: 'TX→PB6, RX→PB7',
    apb: 2,
    clockBit: 'RCC_APB2ENR_USART1EN',
    irqName: 'USART1_IRQn',
    usartNum: 1,
  },
  // USART2
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
    pin: 'PD6',
    usart: 'USART2',
    remap: true,
    remapMacro: 'AFIO_MAPR_USART2_REMAP',
    remapComment: 'TX→PD5, RX→PD6',
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART2EN',
    irqName: 'USART2_IRQn',
    usartNum: 2,
  },
  // USART3
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
    remapMacro: 'AFIO_MAPR_USART3_REMAP_PARTIALREMAP',
    remapComment: 'TX→PC10, RX→PC11 (partial remap)',
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
  {
    pin: 'PD9',
    usart: 'USART3',
    remap: true,
    remapMacro: 'AFIO_MAPR_USART3_REMAP_FULLREMAP',
    remapComment: 'TX→PD8, RX→PD9 (full remap)',
    apb: 1,
    clockBit: 'RCC_APB1ENR_USART3EN',
    irqName: 'USART3_IRQn',
    usartNum: 3,
  },
];

// ─── Timer info ───────────────────────────────────────────────────────────────

export interface TimerInfo {
  name: string;
  apb: 1 | 2;
  clockBit: string;
  irqName: string;
  /** ISR function name — TIM1 update uses TIM1_UP_IRQHandler, others TIMx_IRQHandler */
  isrName: string;
}

export const TIMERS: TimerInfo[] = [
  {
    name: 'TIM1',
    apb: 2,
    clockBit: 'RCC_APB2ENR_TIM1EN',
    irqName: 'TIM1_UP_IRQn',
    isrName: 'TIM1_UP_IRQHandler',
  },
  {
    name: 'TIM2',
    apb: 1,
    clockBit: 'RCC_APB1ENR_TIM2EN',
    irqName: 'TIM2_IRQn',
    isrName: 'TIM2_IRQHandler',
  },
  {
    name: 'TIM3',
    apb: 1,
    clockBit: 'RCC_APB1ENR_TIM3EN',
    irqName: 'TIM3_IRQn',
    isrName: 'TIM3_IRQHandler',
  },
  {
    name: 'TIM4',
    apb: 1,
    clockBit: 'RCC_APB1ENR_TIM4EN',
    irqName: 'TIM4_IRQn',
    isrName: 'TIM4_IRQHandler',
  },
];

// ─── EXTI mapping ─────────────────────────────────────────────────────────────

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
