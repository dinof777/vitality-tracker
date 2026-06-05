import type { RoutineWithExercises } from './routines';

// Hand a Vitality routine to the SyncroFit interval-timer app using SyncroFit's
// documented third-party integration contract (IntegrationCodec):
//   syncrofit://run?circuit=<url-encoded PartnerJSONCircuit JSON>
// SyncroFit opens, decodes the circuit, and shows its Import sheet.

interface PartnerExercise {
  name: string;
  notes?: string;
  sets: number;
  reps: number;
  actionTime: number; // seconds of work per rep
  restTime: number; // seconds rest between reps
  betweenSetRest?: number; // extra rest after each set
}

interface PartnerCircuit {
  name: string;
  description?: string;
  from?: { name?: string; organization?: string };
  restBetweenExercises?: number;
  exercises: PartnerExercise[];
}

// Pull all integers out of a prescription string like "8-12", "10/leg", "30-45s".
function nums(s: string | null): number[] {
  if (!s) return [];
  return (s.match(/\d+/g) ?? []).map(Number);
}

// Midpoint of a rep range (e.g. "8-12" -> 10), else the first number.
function repsMid(s: string | null): number | null {
  const n = nums(s);
  if (n.length === 0) return null;
  if (n.length >= 2) return Math.round((n[0] + n[1]) / 2);
  return n[0];
}

// Upper end of a seconds range for a hold (e.g. "30-45s" -> 45).
function holdSeconds(s: string | null, fallback: number): number {
  const n = nums(s);
  return n.length ? Math.max(...n) : fallback;
}

// Sum the tempo digits as seconds-per-rep (e.g. "3-1-1" -> 5). null if none.
function tempoSeconds(s: string | null): number | null {
  const n = nums(s);
  if (n.length === 0) return null;
  return Math.max(2, n.reduce((a, b) => a + b, 0));
}

// Map one routine exercise to a SyncroFit timer preset. Strength moves time the
// tempo (reps x tempo-seconds); holds/stretches become a single timed phase.
function toPartnerExercise(re: RoutineWithExercises['exercises'][number]): PartnerExercise {
  const sets = re.default_sets && re.default_sets > 0 ? re.default_sets : 3;
  const prescription = [re.default_reps, re.default_tempo].filter(Boolean).join(' @ ');
  const notes = [re.default_cue, prescription].filter(Boolean).join(' · ');

  if (re.equipment === 'isometric') {
    return { name: re.name, notes, sets, reps: 1, actionTime: holdSeconds(re.default_reps, 40), restTime: 0, betweenSetRest: 20 };
  }
  if (re.equipment === 'stretch') {
    return { name: re.name, notes, sets, reps: 1, actionTime: holdSeconds(re.default_reps, 45), restTime: 0, betweenSetRest: 10 };
  }
  // Dumbbell / band: time the tempo across the rep target.
  return {
    name: re.name,
    notes,
    sets,
    reps: repsMid(re.default_reps) ?? 10,
    actionTime: tempoSeconds(re.default_tempo) ?? 4,
    restTime: 0,
    betweenSetRest: 60,
  };
}

export function buildSyncrofitCircuit(routine: RoutineWithExercises): PartnerCircuit {
  return {
    name: routine.name,
    description: 'Sent from Vitality Tracker',
    from: { name: 'Vitality Tracker' },
    restBetweenExercises: 30,
    exercises: routine.exercises.map(toPartnerExercise),
  };
}

// syncrofit://run?circuit=<url-encoded JSON> — registered scheme, handled by
// SyncroFit's IntegrationCodec via onOpenURL.
export function syncrofitRunUrl(routine: RoutineWithExercises): string {
  const circuit = buildSyncrofitCircuit(routine);
  return `syncrofit://run?circuit=${encodeURIComponent(JSON.stringify(circuit))}`;
}
