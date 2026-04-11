import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: '#080b0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: '1px solid rgba(0,229,128,0.3)',
      }}
    >
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 14,
          fontWeight: 700,
          color: '#00e580',
          letterSpacing: '-0.5px',
        }}
      >
        STM
      </div>
    </div>,
    { ...size },
  );
}
