import type { Exercise } from './database.types';
import { exerciseMode, isTimed, modeWorkLabel } from './exercise-mode';
import type { WorkoutParams } from './profile';
import type { RoutineWithExercises } from './routines';

// Hand a Vitality routine to the SyncroFit interval-timer app as a timed
// circuit, using SyncroFit's app-to-app share format (GroupShareCodec):
//   intervaltimer://import-circuit?data=<url-safe-base64 ShareableCircuit JSON>
// The JSON shape mirrors SyncroFit's ShareableCircuit { version, group,
// presets }. SyncroFit decodes it from the opened URL (onOpenURL) OR from the
// clipboard via its in-app Import — so we copy AND open.

interface SfPreset {
  id: string;
  name: string;
  notes: string;
  sets: number;
  reps: number;
  actionTime: number;
  restTime: number;
  volume: number;
  speakUpDown: boolean;
  betweenSetRest: number;
  groupIDs: string[];
}

function nums(s: string | null): number[] {
  if (!s) return [];
  return (s.match(/\d+/g) ?? []).map(Number);
}
function repsMid(s: string | null): number | null {
  const n = nums(s);
  if (n.length === 0) return null;
  return n.length >= 2 ? Math.round((n[0] + n[1]) / 2) : n[0];
}
function holdSeconds(s: string | null, fallback: number): number {
  const n = nums(s);
  return n.length ? Math.max(...n) : fallback;
}
function tempoSeconds(s: string | null): number | null {
  const n = nums(s);
  return n.length ? Math.max(2, n.reduce((a, b) => a + b, 0)) : null;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

// UTF-8 → URL-safe base64 (matches SyncroFit's urlSafeBase64: +→-, /→_, strip =).
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function toPreset(re: RoutineWithExercises['exercises'][number], groupId: string): SfPreset {
  const sets = re.default_sets && re.default_sets > 0 ? re.default_sets : 3;
  const prescription = [re.default_reps, re.default_tempo].filter(Boolean).join(' @ ');
  const notes = [re.default_cue, prescription].filter(Boolean).join(' · ');
  const base = { id: newId(), name: re.name, notes, sets, volume: 0.8, speakUpDown: true, groupIDs: [groupId] };

  if (isTimed(re)) {
    const fallback = re.equipment === 'stretch' ? 45 : 40;
    return { ...base, reps: 1, actionTime: holdSeconds(re.default_reps, fallback), restTime: 0, betweenSetRest: 20 };
  }
  // Rep-based: time the tempo across the rep target.
  return {
    ...base,
    reps: repsMid(re.default_reps) ?? 10,
    actionTime: tempoSeconds(re.default_tempo) ?? 4,
    restTime: 0,
    betweenSetRest: 60,
  };
}

// Map a generated-workout exercise (uniform WorkoutParams) to a SyncroFit preset,
// so the circuit timing matches Vitality's time model exactly: each set's action
// time = reps × seconds-per-rep (lifts) or the hold seconds (timed moves), with
// the chosen rest between sets.
function presetFromExercise(ex: Exercise, p: WorkoutParams, groupId: string): SfPreset {
  const timed = isTimed(ex);
  const prescription = timed
    ? `${p.sets} × ${p.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
    : `${p.sets} × ${p.reps} @ ${p.tempo}`;
  const notes = [ex.default_cue, prescription].filter(Boolean).join(' · ');
  const base = { id: newId(), name: ex.name, notes, sets: p.sets, volume: 0.8, speakUpDown: true, groupIDs: [groupId] };
  if (timed) return { ...base, reps: 1, actionTime: p.holdSec, restTime: 0, betweenSetRest: p.restSec };
  return { ...base, reps: p.reps, actionTime: p.repSec, restTime: 0, betweenSetRest: p.restSec };
}

// Build the intervaltimer://import-circuit link for an on-the-fly generated workout.
export function syncrofitUrlFromWorkout(name: string, exercises: Exercise[], p: WorkoutParams): string {
  const groupId = newId();
  const presets = exercises.map((ex) => presetFromExercise(ex, p, groupId));
  const payload = {
    version: 2,
    group: {
      id: groupId,
      name,
      workoutDescription: 'Sent from Vitality Tracker',
      presetOrder: presets.map((p) => p.id),
      circuitBetweenSetRest: 30,
      announceNextExercise: true,
    },
    presets,
  };
  return `intervaltimer://import-circuit?data=${toBase64Url(JSON.stringify(payload))}`;
}

const VITALITY_ORIGIN = 'https://vitality-tracker-mauve.vercel.app';

// SyncroFit POSTs import/completion feedback to the `webhook` URL embedded in the
// circuit we send (per-circuit, not a global partner URL) — so it MUST be present
// for the feedback loop + analytics to work.
const SYNCROFIT_WEBHOOK = `${VITALITY_ORIGIN}/api/syncrofit/events`;

// Map our equipment enum → SyncroFit's canonical taxonomy (IntervalPreset.allEquipment)
// so a sent workout filters correctly in SyncroFit's /workouts browser. null =
// bodyweight (no required gear → no filter gate).
export const SF_EQUIPMENT: Record<string, string | null> = {
  dumbbell: 'Dumbbells',
  kettlebell: 'Kettlebell',
  calisthenics: null,
  tube_band: 'Resistance bands',
  loop_band: 'Resistance bands',
  pullup_bar: 'Pull-up bar',
  medicine_ball: 'Medicine ball',
  jump_rope: 'Jump rope',
  stretch: null,
  stationary_bike: 'Stationary bike',
  treadmill: 'Treadmill',
  stair_climber: null, // no SyncroFit taxonomy equivalent
  rowing_machine: 'Rowing machine',
  elliptical: null, // no SyncroFit taxonomy equivalent
  barbell: 'Barbell',
  cable_machine: null, // no SyncroFit taxonomy equivalent
  leg_press_machine: null, // no SyncroFit taxonomy equivalent
  lat_pulldown_machine: null, // no SyncroFit taxonomy equivalent
};
function requiredEquipment(equipment: string | null): string[] | undefined {
  if (!equipment) return undefined;
  const sf = SF_EQUIPMENT[equipment];
  return sf ? [sf] : undefined;
}

// Turn a (possibly relative) image_url into an absolute HTTPS URL SyncroFit can
// fetch. Returns undefined when there's no image, or when we can't form an
// https URL (e.g. localhost) — the codec just shows the default background then.
function absImageUrl(imageUrl: string | null, origin: string): string | undefined {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl.startsWith('https') ? imageUrl : undefined;
  const base = origin.startsWith('https') ? origin : VITALITY_ORIGIN;
  return `${base}${imageUrl}`;
}

// NEW image-capable format (SyncroFit IntegrationCodec, Format 2 inline JSON):
//   syncrofit://run?circuit=<url-encoded PartnerJSONCircuit JSON>
// Each exercise can carry actionImageURL (HTTPS) which SyncroFit downloads on
// import and shows as the work-phase background. Requires the updated SyncroFit
// build that registers the `syncrofit://run` handler.
export function syncrofitRunUrl(
  name: string,
  exercises: Exercise[],
  p: WorkoutParams,
  origin = '',
  circuitId?: string,
): string {
  const exs = exercises.map((ex) => {
    const timed = isTimed(ex);
    const prescription = timed
      ? `${p.sets} × ${p.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
      : `${p.sets} × ${p.reps} @ ${p.tempo}`;
    const notes = [ex.default_cue, prescription].filter(Boolean).join(' · ');
    const img = absImageUrl(ex.image_url, origin);
    const reqEquip = requiredEquipment(ex.equipment);
    return {
      name: ex.name,
      notes,
      sets: p.sets,
      reps: timed ? 1 : p.reps,
      actionTime: timed ? p.holdSec : p.repSec,
      restTime: 0,
      betweenSetRest: p.restSec,
      ...(img ? { actionImageURL: img } : {}),
      ...(reqEquip ? { requiredEquipment: reqEquip } : {}),
    };
  });
  const payload = {
    id: circuitId ?? newId(),
    name,
    description: 'Sent from Vitality Tracker',
    from: { name: 'Vitality', organization: 'Live Elevated' },
    restBetweenExercises: 30,
    webhook: SYNCROFIT_WEBHOOK,
    exercises: exs,
  };
  return `syncrofit://run?circuit=${encodeURIComponent(JSON.stringify(payload))}`;
}

// NEW-format routine hand-off (syncrofit://run) — carries the webhook + the
// routine id, so SyncroFit's import/completion feedback flows back and lands on
// the routine's SyncroFit Activity card. Preferred over the legacy import URL.
export function syncrofitRunUrlFromRoutine(routine: RoutineWithExercises): string {
  const exs = routine.exercises.map((re) => {
    const timed = isTimed(re);
    const sets = re.default_sets && re.default_sets > 0 ? re.default_sets : 3;
    const prescription = [re.default_reps, re.default_tempo].filter(Boolean).join(' @ ');
    const notes = [re.default_cue, prescription].filter(Boolean).join(' · ');
    const img = absImageUrl(re.image_url, '');
    const reqEquip = requiredEquipment(re.equipment);
    const base = {
      name: re.name,
      notes,
      sets,
      restTime: 0,
      ...(img ? { actionImageURL: img } : {}),
      ...(reqEquip ? { requiredEquipment: reqEquip } : {}),
    };
    if (timed) {
      const fallback = re.equipment === 'stretch' ? 45 : 40;
      return { ...base, reps: 1, actionTime: holdSeconds(re.default_reps, fallback), betweenSetRest: 20 };
    }
    return { ...base, reps: repsMid(re.default_reps) ?? 10, actionTime: tempoSeconds(re.default_tempo) ?? 4, betweenSetRest: 60 };
  });
  const payload = {
    id: routine.id,
    name: routine.name,
    description: 'Sent from Vitality Tracker',
    from: { name: 'Vitality', organization: 'Live Elevated' },
    restBetweenExercises: 30,
    webhook: SYNCROFIT_WEBHOOK,
    exercises: exs,
  };
  return `syncrofit://run?circuit=${encodeURIComponent(JSON.stringify(payload))}`;
}

// Build the intervaltimer://import-circuit link for a routine. The circuit id IS
// the routine's id, so SyncroFit's import/completion feedback (circuit.id)
// correlates straight back to this routine. See app/api/syncrofit/events.
export function syncrofitImportUrl(routine: RoutineWithExercises): string {
  const groupId = routine.id;
  const presets = routine.exercises.map((re) => toPreset(re, groupId));
  const payload = {
    version: 2,
    group: {
      id: groupId,
      name: routine.name,
      workoutDescription: 'Sent from Vitality Tracker',
      presetOrder: presets.map((p) => p.id),
      circuitBetweenSetRest: 30,
      announceNextExercise: true,
    },
    presets,
  };
  return `intervaltimer://import-circuit?data=${toBase64Url(JSON.stringify(payload))}`;
}
