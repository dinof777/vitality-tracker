// Lightweight, on-device account/profile info. NOT an auth account — no
// password, no sign-in, nothing leaves the device (stored in localStorage).
// Lets a user record who they are and whether they train others.

export type Role = 'trainee' | 'trainer';

export interface Account {
  name: string;
  email: string;
  phone: string;
  role: Role;
  /** Profile picture as a small (256px) JPEG data URL, kept on-device. */
  avatar?: string;
}

const KEY = 'vitality_account';

export const EMPTY_ACCOUNT: Account = { name: '', email: '', phone: '', role: 'trainee' };

// Read an image File, cover-crop to a square, downscale to `size`px, and return
// a JPEG data URL small enough for localStorage. Runs entirely on-device.
export function resizeToAvatar(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('no canvas context'));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        reject(e as Error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

export function loadAccount(): Account {
  if (typeof window === 'undefined') return EMPTY_ACCOUNT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY_ACCOUNT, ...(JSON.parse(raw) as Partial<Account>) } : EMPTY_ACCOUNT;
  } catch {
    return EMPTY_ACCOUNT;
  }
}

export function saveAccount(a: Account): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
