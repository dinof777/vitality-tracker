// Pure color helpers (no deps, client-safe) for deriving theme tokens from a
// single brand accent the trainer picks.

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');

// Relative luminance (sRGB) for contrast decisions.
function luminance(r: number, g: number, b: number): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

// Pick near-black or white text for best contrast on the accent.
export function onAccentFor(accent: string): string {
  const rgb = parseHex(accent);
  if (!rgb) return '#0b0b0c';
  return luminance(...rgb) > 0.45 ? '#0b0b0c' : '#ffffff';
}

// A slightly darker accent for the pressed/active state.
export function darken(accent: string, pct = 0.14): string {
  const rgb = parseHex(accent);
  if (!rgb) return accent;
  return toHex(rgb[0] * (1 - pct), rgb[1] * (1 - pct), rgb[2] * (1 - pct));
}

export function isValidHex(hex: string): boolean {
  return parseHex(hex) !== null;
}
