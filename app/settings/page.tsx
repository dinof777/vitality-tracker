'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  EMPTY_ACCOUNT,
  loadAccount,
  resizeToAvatar,
  saveAccount,
  type Account,
  type Role,
} from '@/lib/account';
import {
  EQUIPMENT_LABEL,
} from '@/lib/exercises';
import {
  DEFAULT_LENGTH,
  focusChoice,
  intensityParams,
  loadProfile,
  type Profile,
} from '@/lib/profile';
import { DAY_LABELS, fetchRoutines, type RoutineWithExercises } from '@/lib/routines';

interface WorkoutRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  routine_name: string | null;
  set_count: number;
  exercise_count: number;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtDuration(start: string, end: string | null): string | null {
  if (!end) return null;
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins <= 0) return null;
  return `${mins} min`;
}

export default function SettingsPage() {
  const [account, setAccount] = useState<Account>(EMPTY_ACCOUNT);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<WorkoutRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [favorites, setFavorites] = useState<RoutineWithExercises[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAccount(loadAccount());
    setProfile(loadProfile());
    fetch('/api/workouts')
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d.workouts) ? d.workouts : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
    fetchRoutines()
      .then((rs) => setFavorites(rs.filter((r) => r.favorite)))
      .catch(() => setFavorites([]));
  }, []);

  const update = (patch: Partial<Account>) => {
    setAccount((prev) => {
      const next = { ...prev, ...patch };
      saveAccount(next);
      return next;
    });
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      const avatar = await resizeToAvatar(file);
      update({ avatar });
    } catch {
      /* ignore unreadable images */
    }
  };

  const initials =
    account.name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '🙂';

  const fc = profile ? focusChoice(profile.focus) : null;
  const ip = profile ? intensityParams(profile.intensity) : null;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-10">
      <header className="mb-6">
        <p className="text-label text-accent">LIVE ELEVATED</p>
        <h1 className="text-h1 text-text-primary">Profile</h1>
      </header>

      {/* Avatar */}
      <div className="mb-6 flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-surface-raised active:scale-95"
          aria-label="Change profile photo"
        >
          {account.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatar} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-h1 text-text-muted">
              {initials}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[0.625rem] font-semibold text-white">
            EDIT
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickPhoto}
          className="hidden"
        />
        {account.avatar && (
          <button
            type="button"
            onClick={() => update({ avatar: undefined })}
            className="mt-2 text-caption text-text-muted underline"
          >
            Remove photo
          </button>
        )}
      </div>

      {/* You */}
      <p className="mb-2 text-caption text-text-muted">YOU</p>
      <div className="mb-3 space-y-3 rounded-lg border border-border bg-surface p-4">
        <label className="block">
          <span className="mb-1 block text-caption text-text-muted">Name</span>
          <input
            type="text"
            value={account.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Your name"
            autoComplete="name"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2.5 text-body text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-caption text-text-muted">Email</span>
          <input
            type="email"
            inputMode="email"
            value={account.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2.5 text-body text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-caption text-text-muted">Phone</span>
          <input
            type="tel"
            inputMode="tel"
            value={account.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="(555) 555-5555"
            autoComplete="tel"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2.5 text-body text-text-primary outline-none focus:border-accent"
          />
        </label>
      </div>

      {/* Role */}
      <p className="mb-2 text-caption text-text-muted">I AM A</p>
      <div className="mb-5 flex gap-2">
        {(['trainee', 'trainer'] as Role[]).map((r) => {
          const on = account.role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => update({ role: r })}
              className={`h-12 flex-1 rounded-md border text-label capitalize transition-colors ${
                on ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted'
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Training */}
      <p className="mb-2 text-caption text-text-muted">TRAINING</p>
      {profile ? (
        <Link href="/setup" className="mb-2 flex items-center justify-between rounded-lg border border-border bg-surface p-4 active:bg-surface-raised">
          <span>
            <span className="block text-body font-semibold text-text-primary">
              {fc?.emoji} {fc?.label} · {ip?.label}
            </span>
            <span className="block text-caption text-text-muted">
              {profile.equipment.length} equipment ·{' '}
              {profile.equipment.slice(0, 3).map((e) => EQUIPMENT_LABEL[e]).join(', ')}
              {profile.equipment.length > 3 ? '…' : ''} · {profile.length ?? DEFAULT_LENGTH} min
            </span>
          </span>
          <span className="text-text-faint">Edit ›</span>
        </Link>
      ) : (
        <Link href="/setup" className="mb-2 block rounded-lg border border-accent/40 bg-accent/10 p-4">
          <span className="block text-body font-semibold text-text-primary">Set up your training profile</span>
          <span className="block text-caption text-text-muted">Equipment, focus & intensity for on-the-fly workouts.</span>
        </Link>
      )}

      {/* My routines — favorited routines pinned here */}
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-caption text-text-muted">MY ROUTINES</p>
        <Link href="/routines" className="text-caption text-text-muted underline">All routines ›</Link>
      </div>
      {favorites.length === 0 ? (
        <p className="mb-3 rounded-md border border-dashed border-border p-4 text-center text-caption text-text-muted">
          Tap ☆ on a routine to pin it here.
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {favorites.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routines/${r.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-surface p-3 active:bg-surface-raised"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold text-text-primary">★ {r.name}</span>
                  <span className="block text-caption text-text-muted nums">
                    {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                    {r.day_of_week ? ` · ${DAY_LABELS[r.day_of_week]}` : ''}
                  </span>
                </span>
                <span className="text-text-faint">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/plan"
        className="mb-5 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
      >
        📅 PLAN MY WEEK
      </Link>

      {/* Vitality Pro — entry point into the white-label trainer platform */}
      <div className="mb-5 rounded-lg border border-accent/40 bg-accent/10 p-4">
        <p className="text-label text-accent">VITALITY PRO</p>
        <p className="mt-1 text-caption text-text-muted">
          Run a branded training app for your gym or clients — your logo, your URL, share by QR.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/dashboard"
            className="flex h-10 flex-1 items-center justify-center rounded-md bg-accent text-caption font-semibold text-on-accent"
          >
            Trainer dashboard
          </Link>
          <Link
            href="/pro"
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-border text-caption text-text-primary active:bg-surface"
          >
            Learn more
          </Link>
        </div>
      </div>

      {/* History */}
      <p className="mb-2 text-caption text-text-muted">WORKOUT HISTORY</p>
      {loadingHistory ? (
        <p className="rounded-md border border-border bg-surface p-4 text-caption text-text-muted">Loading…</p>
      ) : history.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-body text-text-muted">
          No workouts logged yet. Start one from Home and it’ll show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map((w) => {
            const dur = fmtDuration(w.started_at, w.finished_at);
            return (
              <li key={w.id} className="rounded-md border border-border bg-surface p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-body font-semibold text-text-primary">
                    {w.routine_name ?? 'Quick workout'}
                  </span>
                  <span className="text-caption text-text-muted">{fmtDate(w.started_at)}</span>
                </div>
                <span className="text-caption text-text-muted nums">
                  {w.exercise_count} exercises · {w.set_count} sets{dur ? ` · ${dur}` : ' · in progress'}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-center text-caption text-text-faint">
        Your name, email &amp; phone stay on this device.
      </p>
    </main>
  );
}
