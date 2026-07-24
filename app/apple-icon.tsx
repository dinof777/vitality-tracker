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
        }}
      >
        {/* Brand mark: upward chevron "V" — Vitality / Live Elevated. Matches favicon.ico + icon.svg. */}
        <svg width="180" height="180" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M152 148 L256 372 L360 148"
            fill="none"
            stroke="#A3E635"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
