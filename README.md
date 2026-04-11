# STM32F103 — Підготовка до екзамену

Інтерактивний тренажер для студентів курсу мікропроцесорів (STM32F103, CMSIS).

## Можливості

- **60 балів** — GPIO: input / output / alternate function / тактування
- **85 балів** — TIM (PSC/ARR), ADC (канал + sample time), UART TX, EXTI
- **100 балів** — PWM, UART RX (з pull-up!), Timer interrupt, RCC PLL

## Деплой на GitHub Pages

1. Push до репозиторію (main гілка)
2. Settings → Pages → Source: **GitHub Actions**
3. Workflow у `.github/workflows/deploy.yml` запускається автоматично

## Локальний запуск

```bash
pnpm install
pnpm dev
```

## Структура

```
src/lib/pinUtils.ts          # Маппінги піни→таймер/UART/ADC, CRL/CRH логіка
src/lib/generators/gpio.ts   # Input / Output / AF / Clock
src/lib/generators/peripherals.ts  # TIM, ADC, UART TX, EXTI
src/lib/generators/advanced.ts     # PWM, UART RX, TIM IRQ, RCC PLL
src/components/tasks/        # Task60 / Task85 / Task100 компоненти
src/app/page.tsx             # Головна сторінка
```
