// Lightweight, on-device account/profile info. NOT an auth account — no
// password, no sign-in, nothing leaves the device (stored in localStorage).
// Lets a user record who they are and whether they train others.

export type Role = 'trainee' | 'trainer';

export interface Account {
  name: string;
  email: string;
  phone: string;
  role: Role;
}

const KEY = 'vitality_account';

export const EMPTY_ACCOUNT: Account = { name: '', email: '', phone: '', role: 'trainee' };

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
