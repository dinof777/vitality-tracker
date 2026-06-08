import type { Equipment } from './database.types';

// The four pillars of a balanced routine.
export type Pillar = 'strength' | 'cardio' | 'balance' | 'flexibility';

export const PILLAR_LABEL: Record<Pillar, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  balance: 'Balance',
  flexibility: 'Flexibility',
};

type ExerciseLike = { name: string; equipment: Equipment | null };

// Movements that spike the heart rate (ballistic / explosive), beyond jump rope.
const CARDIO_NAME = /(swing|snatch|thruster|slam|jump|burpee|mummy|high knee|clean|squat to press|criss-cross)/;
// Unilateral / stability movements that challenge balance.
const BALANCE_NAME =
  /(single-leg|one leg|bird dog|windmill|split squat|pistol|turkish get-up|side plank|reverse lunge|curtsy|lateral lunge|walking lunge|crab|hydrant|donkey|warrior|step)/;

const STRENGTH_EQUIP: Equipment[] = [
  'dumbbell',
  'kettlebell',
  'calisthenics',
  'tube_band',
  'loop_band',
  'pullup_bar',
  'medicine_ball',
];

// Which pillar(s) a single exercise contributes to. Most belong to 1–2.
export function exercisePillars(ex: ExerciseLike): Pillar[] {
  const n = ex.name.toLowerCase();
  const out = new Set<Pillar>();

  if (ex.equipment === 'stretch') out.add('flexibility');
  if (ex.equipment === 'jump_rope' || CARDIO_NAME.test(n)) out.add('cardio');
  if (BALANCE_NAME.test(n)) out.add('balance');
  if (ex.equipment && STRENGTH_EQUIP.includes(ex.equipment)) out.add('strength');

  if (out.size === 0) out.add('strength');
  return Array.from(out);
}

export function hasPillar(ex: ExerciseLike, pillar: Pillar): boolean {
  return exercisePillars(ex).includes(pillar);
}

// ---- Weekly schedule ----

export type Goal = 'general_health' | 'build_muscle' | 'weight_loss';

export const GOAL_CHOICES: { value: Goal; label: string; emoji: string; hint: string }[] = [
  { value: 'general_health', label: 'General Health', emoji: '🌱', hint: 'Even 4-pillar balance' },
  { value: 'build_muscle', label: 'Build Muscle', emoji: '💪', hint: 'More strength days' },
  { value: 'weight_loss', label: 'Weight Loss', emoji: '🔥', hint: 'More cardio days' },
];

export const DEFAULT_GOAL: Goal = 'general_health';
export const DEFAULT_DAYS_PER_WEEK = 4;

export type DayKind = 'strength' | 'cardio' | 'balance' | 'flexibility' | 'recovery' | 'rest';

export interface DayKindMeta {
  label: string;
  emoji: string;
  pillars: Pillar[]; // pillars to draw exercises from
  lengthMin: number; // target session length
  blurb: string;
}

export const DAY_KIND: Record<DayKind, DayKindMeta> = {
  strength: { label: 'Strength & Core', emoji: '💪', pillars: ['strength'], lengthMin: 30, blurb: 'Resistance for the major muscle groups + core.' },
  cardio: { label: 'Cardio & Balance', emoji: '🔥', pillars: ['cardio', 'balance'], lengthMin: 25, blurb: 'Heart-rate work with stability mixed in.' },
  balance: { label: 'Balance & Stability', emoji: '🤸', pillars: ['balance', 'strength'], lengthMin: 20, blurb: 'Single-leg and stability work to protect the joints.' },
  flexibility: { label: 'Flexibility', emoji: '🧘', pillars: ['flexibility'], lengthMin: 20, blurb: 'Stretch and mobility for range of motion.' },
  recovery: { label: 'Active Recovery', emoji: '🌿', pillars: ['flexibility'], lengthMin: 15, blurb: 'Light movement and gentle stretching.' },
  rest: { label: 'Rest', emoji: '😴', pillars: [], lengthMin: 0, blurb: 'Total rest — muscles grow on rest days.' },
};

// Ordered emphasis per goal — the first N entries fill N training days.
const GOAL_SEQUENCE: Record<Goal, DayKind[]> = {
  general_health: ['strength', 'cardio', 'flexibility', 'strength', 'balance', 'cardio'],
  build_muscle: ['strength', 'cardio', 'strength', 'flexibility', 'strength', 'balance'],
  weight_loss: ['cardio', 'strength', 'cardio', 'flexibility', 'cardio', 'balance'],
};

// Which weekday indexes (1=Mon … 7=Sun) are training days for a given count.
const TRAIN_DAYS: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

export const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Build a 7-day schedule (index 0 = Mon … 6 = Sun) of DayKinds. Training days get
// goal-weighted kinds spread across the week; Sunday rests; the last free day
// before Sunday becomes Active Recovery.
export function weekTemplate(daysPerWeek: number, goal: Goal): DayKind[] {
  const n = Math.min(6, Math.max(3, daysPerWeek));
  const trainSet = new Set(TRAIN_DAYS[n] ?? TRAIN_DAYS[4]);
  const seq = GOAL_SEQUENCE[goal].slice(0, n);
  let si = 0;
  const week: DayKind[] = [];
  for (let day = 1; day <= 7; day++) {
    if (trainSet.has(day)) {
      week.push(seq[si] ?? 'strength');
      si++;
    } else if (day === 7) {
      week.push('rest');
    } else if (day === 6) {
      week.push('recovery');
    } else {
      week.push('rest');
    }
  }
  return week;
}
