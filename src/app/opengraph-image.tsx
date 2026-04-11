import { ImageResponse } from 'next/og';

export const alt = 'STM32F103 — Підготовка до екзамену';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: '#080b0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0,229,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,128,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,128,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          position: 'relative',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: '#f1f5f9', letterSpacing: -2 }}>
            STM32F103
          </div>
          <div style={{ fontSize: 28, color: '#475569', letterSpacing: -0.5 }}>
            Підготовка до екзамену
          </div>
        </div>

        {/* Cards row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          {[
            { score: '60', label: 'GPIO', color: '#34d399' },
            { score: '85', label: 'TIM · ADC · UART · EXTI', color: '#fbbf24' },
            { score: '100', label: 'PWM · IRQ · PLL', color: '#a78bfa' },
          ].map(({ score, label, color }) => (
            <div
              key={score}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 16,
                padding: '20px 28px',
                minWidth: 180,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 900, color }}>{score}</div>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1 }}>балів</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#334155',
          fontSize: 13,
        }}
      >
        <span>ІП-24 · Бєліков Максим</span>
      </div>
    </div>,
    { ...size },
  );
}
