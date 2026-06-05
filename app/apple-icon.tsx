import { ImageResponse } from 'next/og';

// iOS Home Screen icon (Add to Home Screen). Generated at build time.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#121316',
          color: '#A3E635',
          fontSize: 120,
          fontWeight: 800,
        }}
      >
        V
      </div>
    ),
    { ...size },
  );
}
