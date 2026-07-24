'use client';

import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import { exerciseMode, isTimed, modeWorkLabel } from '@/lib/exercise-mode';
import { workoutStyleLabel, type WorkoutParams } from '@/lib/profile';
import type { ShareExercise, ShareParams } from '@/lib/share';
import { syncrofitRunUrl, syncrofitUrlFromWorkout } from '@/lib/syncrofit';
import { formatMinutes, totalSeconds } from '@/lib/workout-timing';
import ExerciseThumb from './ExerciseThumb';

const V2_KEY = 'vitality_sf_v2';

interface StartSheetProps {
  exercises: Exercise[];
  params: WorkoutParams;
  name: string;
  onLogInApp: () => void;
  onClose: () => void;
}

// One row inside the Save workout window: an icon + label button, and a
// caption that explains the option (the "mouseover tooltip" — kept
// permanently visible rather than hover-only, since a caption line is the
// touch-reachable form of the same explanation per DESIGN.md's mobile-first
// stance — a phone has no hover to reveal it from). Every option here fires
// its action in one tap; a status block for anything async renders as a
// separate nested element right below, not inside this component.
function SaveOption({
  icon,
  label,
  caption,
  onClick,
  disabled,
  buttonRef,
}: {
  icon: string;
  label: string;
  caption: string;
  onClick: () => void;
  disabled?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[3.5rem] w-full items-center gap-3 rounded-md border border-border bg-surface p-3 text-left transition-colors active:bg-surface-raised disabled:opacity-60 sm:hover:border-accent/40 sm:hover:bg-surface-raised"
    >
      <span className="text-h3 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-text-primary">{label}</span>
        <span className="block text-caption text-text-muted">{caption}</span>
      </span>
    </button>
  );
}

// The nested, toned-down status panel every option's async result renders
// into — same pl-1/pt-1 indent + bg-surface-raised/50 second-tier chrome
// (DESIGN.md §6) used for the Send-to-SyncroFit modifier below.
function OptionStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="pl-1 pt-1">
      <div className="space-y-1.5 rounded-lg border border-border bg-surface-raised/50 p-2.5">{children}</div>
    </div>
  );
}

type SaveCircuitState = 'idle' | 'saving' | 'saved' | 'error';
type CopyLinkState = 'idle' | 'loading' | 'copied' | 'manual' | 'error';

// Bottom sheet shown on "Start Workout": build my workout summary + a single
// "Save workout" action that opens a window of export/hand-off options — run
// it here, hand it to SyncroFit, print/save a PDF, or (gym accounts only)
// one-tap save it to the library / one-tap copy a share link.
export default function StartSheet({ exercises, params, name, onLogInApp, onClose }: StartSheetProps) {
  const [sent, setSent] = useState(false);
  // Images-on is the default — every other SyncroFit hand-off surface (gym
  // build, share, routines, dashboard) already sends the image format
  // unconditionally, so this sheet matches them. Only a trainer who has
  // explicitly turned it OFF keeps the classic no-image format.
  const [useV2, setUseV2] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // Gym-context probe: null while in flight (don't render the gym-only
  // options until we know), true/false once resolved. Reuses the same
  // tenant-gated GET ShareWorkoutButton/SaveCircuitBox's other host
  // (CustomWorkoutBuilder) relies on, and no-ops on a 403 for a public/
  // consumer visitor.
  const [gymUser, setGymUser] = useState<boolean | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  // One-tap Save circuit — POSTs immediately using the workout's existing
  // `name`, no text entry required first. Rename is an affordance offered
  // AFTER the save, not a gate in front of it.
  const [saveState, setSaveState] = useState<SaveCircuitState>('idle');
  const [savedWorkout, setSavedWorkout] = useState<{ id: string; name: string } | null>(null);
  const [saveError, setSaveError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState('');

  // One-tap Copy link — mints the share link and writes it to the clipboard
  // in the same click.
  const [linkState, setLinkState] = useState<CopyLinkState>('idle');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');

  const est = totalSeconds(exercises, params);
  // Handoff-honesty: mode/minutes default 'intervals' when undefined (an
  // older stored WorkoutParams predating this field). See DESIGN.md §6.
  const mode = params.mode ?? 'intervals';
  const styleMinutes = mode === 'emom' ? params.emomMinutes : params.amrapMinutes;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(V2_KEY);
      if (stored !== null) setUseV2(stored === '1'); // honor an explicit prior choice; default on otherwise
    } catch {
      /* localStorage unavailable — keep the on-by-default */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tenant/clients')
      .then((r) => {
        if (!cancelled) setGymUser(r.ok);
      })
      .catch(() => {
        if (!cancelled) setGymUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the window on Escape without also closing the whole sheet.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Move focus into the window (onto the first option) when it opens, back to
  // the trigger when it closes.
  useEffect(() => {
    if (menuOpen) firstOptionRef.current?.focus();
    else menuTriggerRef.current?.focus();
  }, [menuOpen]);

  const toggleV2 = () => {
    setUseV2((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(V2_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sendToTimer = () => {
    const url = useV2
      ? syncrofitRunUrl(name, exercises, params, window.location.origin)
      : syncrofitUrlFromWorkout(name, exercises, params);
    try {
      void navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard may be unavailable; the deep link still opens */
    }
    setSent(true);
    window.location.href = url;
  };

  // Same shape /api/tenant/workouts and /api/share need (ShareExercise /
  // ShareParams, lib/share.ts) — mirrors how CustomWorkoutBuilder builds
  // shareExercises + passes its resolved params.
  const prescriptionFor = (ex: Exercise) =>
    isTimed(ex)
      ? `${params.sets} × ${params.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
      : `${params.sets} × ${params.reps} @ ${params.tempo}`;
  const shareExercises: ShareExercise[] = exercises.map((ex) => ({
    name: ex.name,
    equipment: ex.equipment,
    image_url: ex.image_url,
    notes: prescriptionFor(ex),
  }));
  const shareParams: ShareParams = { ...params, mode };

  // One tap: save under `name` immediately, no form first.
  const saveCircuit = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const r = await fetch('/api/tenant/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exercises: shareExercises, params: shareParams }),
      });
      const j = await r.json();
      if (!r.ok) {
        setSaveError(j.error ?? 'Could not save.');
        setSaveState('error');
        return;
      }
      setSavedWorkout({ id: j.workout.id, name: j.workout.name });
      setRenameValue(j.workout.name);
      setSaveState('saved');
    } catch {
      setSaveError('Network error.');
      setSaveState('error');
    }
  };

  const submitRename = async () => {
    if (!savedWorkout) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === savedWorkout.name) {
      setRenaming(false);
      return;
    }
    setRenameBusy(true);
    setRenameError('');
    try {
      const r = await fetch('/api/tenant/workouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedWorkout.id, name: trimmed }),
      });
      const j = await r.json();
      if (!r.ok) {
        setRenameError(j.error ?? 'Could not rename.');
        return;
      }
      setSavedWorkout({ id: j.workout.id, name: j.workout.name });
      setRenaming(false);
    } catch {
      setRenameError('Network error.');
    } finally {
      setRenameBusy(false);
    }
  };

  // One tap: mint the /s/<token> link AND write it to the clipboard in the
  // same click. The clipboard write MUST be registered synchronously inside
  // this handler — a user gesture is only "active" for the duration of the
  // click, and awaiting the /api/share fetch first (then calling
  // navigator.clipboard.writeText) loses that gesture, which Safari in
  // particular then rejects. So the fetch and the clipboard write both start
  // here, but the clipboard write is handed a Promise<Blob> via
  // ClipboardItem — the permission/gesture check happens now, the bytes land
  // whenever the fetch resolves.
  const copyLink = () => {
    setLinkState('loading');
    setLinkError('');
    setLinkUrl('');

    const fetchUrl = (async () => {
      const r = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exercises: shareExercises, params: shareParams }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Could not create the link.');
      const url = window.location.origin + j.url;
      setLinkUrl(url);
      return url;
    })();

    const canWriteClipboardItem = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
    if (canWriteClipboardItem) {
      const item = new ClipboardItem({
        'text/plain': fetchUrl.then((url) => new Blob([url], { type: 'text/plain' })),
      });
      navigator.clipboard
        .write([item])
        .then(() => setLinkState('copied'))
        .catch(() => {
          // The write itself (or the fetch inside it) failed — fall back to
          // manual copy if we at least have a URL, else it's a real error.
          fetchUrl
            .then(() => setLinkState('manual'))
            .catch((e: Error) => {
              setLinkError(e.message);
              setLinkState('error');
            });
        });
    } else {
      // No async Clipboard API on this browser — go straight to the manual,
      // tap-to-select fallback rather than a native title/writeText call
      // that would silently no-op outside a synchronous gesture.
      fetchUrl
        .then(() => setLinkState('manual'))
        .catch((e: Error) => {
          setLinkError(e.message);
          setLinkState('error');
        });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
        <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
        <div className="relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border" />
          <p className="text-h3 text-text-primary">Build my workout</p>
          <p className="mb-3 text-caption text-text-muted nums">
            {exercises.length} exercises · ~{formatMinutes(est)} · {params.sets} × {params.reps}
          </p>

          {/* The exercises this session will run */}
          <ul className="-mx-1 mb-4 max-h-[40dvh] space-y-1.5 overflow-y-auto px-1">
            {exercises.map((ex, i) => (
              <li key={ex.id} className="flex items-center gap-3 rounded-md bg-surface-raised p-2">
                <span className="w-5 shrink-0 text-center text-caption text-text-faint nums">{i + 1}</span>
                <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-text-primary">{ex.name}</span>
                  <span className="block text-caption text-text-muted">{ex.muscle_group}</span>
                </span>
              </li>
            ))}
          </ul>

          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="save-workout-panel"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press"
          >
            SAVE WORKOUT
            <span aria-hidden="true">{menuOpen ? '▴' : '▾'}</span>
          </button>

          {menuOpen && (
            <div
              id="save-workout-panel"
              role="group"
              aria-label="Save workout options"
              className="mt-2 space-y-2 rounded-lg border border-border bg-surface-raised/50 p-2.5"
            >
              <SaveOption
                buttonRef={firstOptionRef}
                icon="▶"
                label="Log in the app"
                caption="Do the workout now and track your sets right here in the app."
                onClick={onLogInApp}
              />

              <div>
                <SaveOption
                  icon="⏱"
                  label="Send to SyncroFit"
                  caption="Open it in SyncroFit — the timer calls out every set and rest so you never touch your phone."
                  onClick={sendToTimer}
                />

                {/* Modifier + status for the Send-to-SyncroFit path — preserved
                    from the previous two-button layout, nested under its option. */}
                <OptionStatus>
                  <button type="button" onClick={toggleV2} className="flex w-full items-center justify-between text-left">
                    <span className="pr-3">
                      <span className="block text-caption font-semibold text-text-primary">Send exercise images</span>
                      <span className="block text-caption text-text-muted">
                        On by default. Turn off only for an older SyncroFit build.
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                        useV2 ? 'bg-accent' : 'bg-surface-raised'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full bg-white transition-transform ${useV2 ? 'translate-x-5' : ''}`} />
                    </span>
                  </button>

                  {sent ? (
                    <p className="text-caption text-text-muted">
                      Opening SyncroFit… if nothing happens, the link is copied — open SyncroFit ▸ Import to paste it.
                    </p>
                  ) : mode !== 'intervals' ? (
                    <p className="text-caption text-text-muted">
                      <span className="font-semibold text-text-primary">{workoutStyleLabel(mode)}</span>
                      {(mode === 'amrap' || mode === 'emom') && styleMinutes ? ` · ${styleMinutes} min` : ''} runs on a
                      live clock — Send to SyncroFit has it called out for you. Logging in the app still tracks your
                      sets, but won&apos;t time the round.
                    </p>
                  ) : (
                    <p className="text-caption text-text-muted">
                      {useV2
                        ? 'New format: sends sets, reps, rest + exercise images (where available).'
                        : 'Classic format: sends sets, reps, hold & rest (no images on the old build).'}
                    </p>
                  )}
                </OptionStatus>
              </div>

              <SaveOption
                icon="🖨"
                label="Create PDF"
                caption="Save or print a clean one-page PDF of this workout."
                onClick={() => window.print()}
              />

              {gymUser && (
                <>
                  <div>
                    <SaveOption
                      icon="💾"
                      label="Save circuit"
                      caption={`One tap — saves as "${name}" to your gym's library. Rename it after if you'd like.`}
                      onClick={saveCircuit}
                      disabled={saveState === 'saving'}
                    />
                    {saveState !== 'idle' && (
                      <OptionStatus>
                        {saveState === 'saving' && <p className="text-caption text-text-muted">Saving…</p>}
                        {saveState === 'error' && <p className="text-caption text-destructive">{saveError}</p>}
                        {saveState === 'saved' && savedWorkout && (
                          <>
                            <p className="text-caption text-text-muted">
                              Saved ✓ as{' '}
                              <span className="font-semibold text-text-primary">{savedWorkout.name}</span> ·{' '}
                              <a href={`/dashboard/workouts/${savedWorkout.id}`} className="text-accent">
                                Open it ›
                              </a>
                            </p>
                            {!renaming ? (
                              <button
                                type="button"
                                onClick={() => setRenaming(true)}
                                className="text-caption font-semibold text-accent underline decoration-dotted underline-offset-2"
                              >
                                Rename
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  autoFocus
                                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-caption text-text-primary"
                                />
                                <button
                                  type="button"
                                  onClick={submitRename}
                                  disabled={renameBusy || !renameValue.trim()}
                                  className="h-9 shrink-0 rounded-md bg-accent px-3 text-caption font-semibold text-on-accent disabled:opacity-50"
                                >
                                  {renameBusy ? '…' : 'Save'}
                                </button>
                              </div>
                            )}
                            {renameError && <p className="text-caption text-destructive">{renameError}</p>}
                          </>
                        )}
                      </OptionStatus>
                    )}
                  </div>

                  <div>
                    <SaveOption
                      icon="🔗"
                      label="Copy link"
                      caption="One tap — copies a client-ready share link straight to your clipboard."
                      onClick={copyLink}
                      disabled={linkState === 'loading'}
                    />
                    {linkState !== 'idle' && (
                      <OptionStatus>
                        {linkState === 'loading' && <p className="text-caption text-text-muted">Creating link…</p>}
                        {linkState === 'error' && <p className="text-caption text-destructive">{linkError}</p>}
                        {(linkState === 'copied' || linkState === 'manual') && (
                          <>
                            <p className="text-caption text-text-muted">
                              {linkState === 'copied' ? 'Link copied ✓' : 'Link ready — tap to select & copy:'}
                            </p>
                            <input
                              readOnly
                              value={linkUrl}
                              onFocus={(e) => e.currentTarget.select()}
                              className="h-9 w-full rounded-md border border-border bg-surface px-2 text-caption text-text-primary"
                            />
                          </>
                        )}
                      </OptionStatus>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print-only export for "Create PDF" — its own light "paper" surface per
          DESIGN.md §9, never the dark app tokens (those would print invisible
          light-on-dark). Isolated from the rest of the app at print time via
          the .print-only-workout rule in globals.css, so it doesn't matter
          that this sits alongside a fixed, scroll-clipped sheet. */}
      <div className="print-only-workout hidden bg-white p-8 text-left print:block print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
        <p className="text-2xl font-extrabold" style={{ color: '#0b0b0c' }}>
          {name}
        </p>
        <p className="mt-1 text-sm" style={{ color: '#52525b' }}>
          {exercises.length} exercises · ~{formatMinutes(est)} · {params.sets} × {params.reps}
          {mode !== 'intervals' ? ` · ${workoutStyleLabel(mode)}` : ''}
        </p>
        <ol className="mt-6 space-y-3">
          {exercises.map((ex, i) => (
            <li key={ex.id} className="border-b pb-2" style={{ borderColor: '#e5e5e5' }}>
              <span className="text-base font-semibold" style={{ color: '#0b0b0c' }}>
                {i + 1}. {ex.name}
              </span>
              <span className="block text-sm" style={{ color: '#52525b' }}>
                {prescriptionFor(ex)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs" style={{ color: '#8b8b93' }}>
          Live Elevated · liveelevated.fit
        </p>
      </div>
    </>
  );
}
