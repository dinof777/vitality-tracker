import { ImageResponse } from 'next/og';

// Favicon / browser-tab icon.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
        <svg width="32" height="32" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
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
