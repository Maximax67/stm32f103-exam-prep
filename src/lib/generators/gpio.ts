import type { PinInfo } from '../pinUtils';
import { cnfMask, getJtagInfo, modeMask, parsePinInfo } from '../pinUtils';

export type InputMode = 'floating' | 'pullup' | 'pulldown' | 'analog';
export type OutputSpeed = '10mhz' | '2mhz' | '50mhz';
export type OutputType = 'pushpull' | 'opendrain';
export type AFType = 'afpp' | 'afod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function clearLine(p: PinInfo): string {
  return `GPIO${p.port}->${p.regSuffix} &= ~(${modeMask(p)} | ${cnfMask(p)});`;
}

function speedBits(p: PinInfo, speed: OutputSpeed): string {
  switch (speed) {
    case '10mhz':
      return modeMask(p, '_0'); // MODE=01
    case '2mhz':
      return modeMask(p, '_1'); // MODE=10
    case '50mhz':
      return `${modeMask(p, '_0')} | ${modeMask(p, '_1')}`; // MODE=11
  }
}

function speedLabel(speed: OutputSpeed): string {
  return { '10mhz': '10 МГц', '2mhz': '2 МГц', '50mhz': '50 МГц' }[speed];
}

/**
 * Emits JTAG-disable lines when the chosen pin is a JTAG/SWD debug pin.
 * Returns the lines to inject and the step number after them.
 */
function jtagLines(pin: string, nextStep: number): { lines: string[]; nextStep: number } {
  const jtag = getJtagInfo(pin);
  if (!jtag) return { lines: [], nextStep };

  const out: string[] = [];
  if (jtag.kind === 'jtag_only') {
    out.push(
      `// ${nextStep}. JTAG disable — ${pin} (${jtag.signalName}) зайнятий відладчиком за замовчуванням`,
    );
    out.push(`//    Вимикаємо JTAG, але залишаємо SWD (ST-Link продовжить працювати)`);
    out.push(`//    RM0008 §9.3.1, Table 5`);
    out.push(`AFIO->MAPR &= ~AFIO_MAPR_SWJ_CFG;              // очистити поле SWJ_CFG[2:0]`);
    out.push(`AFIO->MAPR |=  AFIO_MAPR_SWJ_CFG_JTAGDISABLE; // 010 → JTAG вимк, SWD активне`);
    out.push('');
    nextStep++;
  } else {
    // swd pin — extremely dangerous, add as comment block only
    out.push(`// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    out.push(`// УВАГА: ${pin} (${jtag.signalName}) — це SWD пін!`);
    out.push(`// Якщо вимкнути SWD, ви НАЗАВЖДИ втратите можливість відлагоджувати МК`);
    out.push(`// через ST-Link до наступного power-on reset з іншою прошивкою.`);
    out.push(`// На екзамені НЕ використовуйте PA13 / PA14 як GPIO без крайньої потреби.`);
    out.push(`// Якщо справді потрібно — розкоментуйте рядок нижче:`);
    out.push(`// AFIO->MAPR &= ~AFIO_MAPR_SWJ_CFG;`);
    out.push(`// AFIO->MAPR |=  AFIO_MAPR_SWJ_CFG_DISABLE; // 100 → вимкнути і JTAG, і SWD`);
    out.push('');
  }

  return { lines: out, nextStep };
}

// ─── GPIO as INPUT ────────────────────────────────────────────────────────────

export interface GpioInputConfig {
  pin: string;
  mode: InputMode;
}

export function generateGpioInput(cfg: GpioInputConfig): string {
  const p = parsePinInfo(cfg.pin);
  const jtag = getJtagInfo(cfg.pin);
  const lines: string[] = [];

  lines.push(`// RM0008: Section 9.2.${p.isHigh ? 2 : 1} GPIO_${p.regSuffix}`);
  lines.push('');

  let step = 1;

  // Step 1: clock(s)
  if (jtag) {
    lines.push(`// ${step}. Тактування GPIO${p.port} + AFIO (потрібен для керування JTAG/SWD)`);
    lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  } else {
    lines.push(`// ${step}. Увімкнути тактування порту GPIO${p.port}`);
    lines.push(`RCC->APB2ENR |= ${p.clockBit};`);
  }
  step++;
  lines.push('');

  // JTAG step (if needed)
  const { lines: jl, nextStep } = jtagLines(cfg.pin, step);
  if (jl.length) {
    lines.push(...jl);
    step = nextStep;
  }

  // Clear pin bits
  lines.push(`// ${step}. Очистити поля MODE та CNF для піна ${cfg.pin}`);
  lines.push(clearLine(p));
  step++;
  lines.push('');

  // Set mode
  lines.push(`// ${step}. Налаштувати режим:`);

  if (cfg.mode === 'analog') {
    lines.push(`//    MODE=00 (input), CNF=00 → аналоговий вхід (для ADC)`);
    lines.push(`//    Біти вже очищені вище — нічого більше не потрібно.`);
  } else if (cfg.mode === 'floating') {
    lines.push(`//    MODE=00 (input), CNF=01 → floating input (відключений від шини)`);
    lines.push(`GPIO${p.port}->${p.regSuffix} |= ${cnfMask(p, '_0')};`);
  } else if (cfg.mode === 'pullup') {
    lines.push(`//    MODE=00 (input), CNF=10 → input with pull resistor`);
    lines.push(`GPIO${p.port}->${p.regSuffix} |= ${cnfMask(p, '_1')};`);
    step++;
    lines.push('');
    lines.push(`// ${step}. Підтягнути до VCC через BSRR (pull-UP): BSx встановлює ODR=1`);
    lines.push(`GPIO${p.port}->BSRR = GPIO_BSRR_BS${p.num};`);
  } else {
    lines.push(`//    MODE=00 (input), CNF=10 → input with pull resistor`);
    lines.push(`GPIO${p.port}->${p.regSuffix} |= ${cnfMask(p, '_1')};`);
    step++;
    lines.push('');
    lines.push(`// ${step}. Підтягнути до GND через BSRR (pull-DOWN): BRx скидає ODR=0`);
    lines.push(`GPIO${p.port}->BSRR = GPIO_BSRR_BR${p.num};`);
  }

  return lines.join('\n');
}

// ─── GPIO as OUTPUT ───────────────────────────────────────────────────────────

export interface GpioOutputConfig {
  pin: string;
  speed: OutputSpeed;
  type: OutputType;
}

export function generateGpioOutput(cfg: GpioOutputConfig): string {
  const p = parsePinInfo(cfg.pin);
  const jtag = getJtagInfo(cfg.pin);
  const lines: string[] = [];

  lines.push(`// RM0008: Section 9.2.${p.isHigh ? 2 : 1} GPIO_${p.regSuffix}`);
  lines.push('');

  let step = 1;

  if (jtag) {
    lines.push(`// ${step}. Тактування GPIO${p.port} + AFIO`);
    lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  } else {
    lines.push(`// ${step}. Тактування GPIO${p.port}`);
    lines.push(`RCC->APB2ENR |= ${p.clockBit};`);
  }
  step++;
  lines.push('');

  const { lines: jl, nextStep } = jtagLines(cfg.pin, step);
  if (jl.length) {
    lines.push(...jl);
    step = nextStep;
  }

  lines.push(`// ${step}. Очистити MODE та CNF`);
  lines.push(clearLine(p));
  step++;
  lines.push('');

  if (cfg.type === 'pushpull') {
    lines.push(`// ${step}. Push-pull output ${speedLabel(cfg.speed)}: MODE≠00, CNF=00`);
    lines.push(`//    CNF=00 — push-pull: не потрібно виставляти бітів CNF`);
    lines.push(`GPIO${p.port}->${p.regSuffix} |= ${speedBits(p, cfg.speed)};`);
  } else {
    lines.push(`// ${step}. Open-drain output ${speedLabel(cfg.speed)}: MODE≠00, CNF=01`);
    lines.push(
      `GPIO${p.port}->${p.regSuffix} |= ${speedBits(p, cfg.speed)} | ${cnfMask(p, '_0')};`,
    );
  }

  return lines.join('\n');
}

// ─── GPIO as ALTERNATE FUNCTION ───────────────────────────────────────────────

export interface GpioAFConfig {
  pin: string;
  speed: OutputSpeed;
  type: AFType;
}

export function generateGpioAF(cfg: GpioAFConfig): string {
  const p = parsePinInfo(cfg.pin);
  const lines: string[] = [];

  lines.push(`// RM0008: Section 9.2.${p.isHigh ? 2 : 1} GPIO_${p.regSuffix}`);
  lines.push('');

  let step = 1;

  lines.push(`// ${step}. Тактування GPIO${p.port} + AFIO (потрібен для alternate function)`);
  lines.push(`RCC->APB2ENR |= ${p.clockBit} | RCC_APB2ENR_AFIOEN;`);
  step++;
  lines.push('');

  // For AF mode, JTAG disable is still relevant if pin is a JTAG pin
  const { lines: jl, nextStep } = jtagLines(cfg.pin, step);
  if (jl.length) {
    lines.push(...jl);
    step = nextStep;
  }

  lines.push(`// ${step}. Очистити MODE та CNF`);
  lines.push(clearLine(p));
  step++;
  lines.push('');

  if (cfg.type === 'afpp') {
    lines.push(`// ${step}. AF Push-pull ${speedLabel(cfg.speed)}: MODE≠00, CNF=10`);
    lines.push(`//    CNF=10: CNFx_1=1, CNFx_0=0`);
    lines.push(
      `GPIO${p.port}->${p.regSuffix} |= ${speedBits(p, cfg.speed)} | ${cnfMask(p, '_1')};`,
    );
  } else {
    lines.push(`// ${step}. AF Open-drain ${speedLabel(cfg.speed)}: MODE≠00, CNF=11`);
    lines.push(`//    CNF=11: CNFx_1=1, CNFx_0=1`);
    lines.push(
      `GPIO${p.port}->${p.regSuffix} |= ${speedBits(p, cfg.speed)} | ${cnfMask(p, '_0')} | ${cnfMask(p, '_1')};`,
    );
  }

  return lines.join('\n');
}

// ─── Enable GPIO clock ────────────────────────────────────────────────────────

export interface GpioClockConfig {
  port: string; // 'A', 'B', 'C', 'D', 'E'
  afio: boolean;
}

export function generateGpioClock(cfg: GpioClockConfig): string {
  const lines: string[] = [];
  lines.push('// RM0008: Section 7.3.7 RCC_APB2ENR');
  lines.push('');
  lines.push(`// Увімкнути тактування GPIO${cfg.port} на шині APB2`);
  lines.push(`RCC->APB2ENR |= RCC_APB2ENR_IOP${cfg.port}EN;`);
  if (cfg.afio) {
    lines.push('');
    lines.push('// Також увімкнути AFIO (потрібен для remap, EXTI, alternate function)');
    lines.push('RCC->APB2ENR |= RCC_APB2ENR_AFIOEN;');
  }
  return lines.join('\n');
}
