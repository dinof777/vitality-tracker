import type { Exercise } from './database.types';
import type { Intensity } from './profile';

// Difficulty / effort tier of a movement — the "type" dimension of intensity,
// separate from rep/set volume. 1 = easy/gentle, 2 = moderate, 3 = hard/explosive.
export type Tier = 1 | 2 | 3;

export const TIER_LABEL: Record<Tier, string> = { 1: 'Easy', 2: 'Moderate', 3: 'Hard' };

// Explosive / high-skill movements, regardless of equipment.
const HIGH =
  /(snatch|clean|thruster|swing|jump|double-under|slam|throw|pull-up|chin-up|toes-to-bar|commando|get-up|push press|high knee|burpee|mummy)/;
// Gentle / mobility / activation movements.
const LOW =
  /(stretch|pose|cat-cow|clamshell|clam|fire hydrant|donkey|bird dog|dead bug|pull-apart|march|hang|shrug|calf raise|lateral walk|forward fold|halo|child|cobra|butterfly|downward|spinal twist)/;

// Heuristic tier from the exercise name + equipment modality. Kettlebell /
// pull-up bar skew hard; stretch / loop-band skew easy; dumbbell / tube band
// sit in the middle — with name keywords overriding either way.
export function exerciseTier(ex: Exercise): Tier {
  const n = ex.name.toLowerCase();
  if (HIGH.test(n)) return 3;
  if (LOW.test(n)) return 1;
  switch (ex.equipment) {
    case 'stretch':
    case 'loop_band':
      return 1;
    case 'kettlebell':
    case 'pullup_bar':
      return 3;
    case 'medicine_ball':
    case 'jump_rope':
    default:
      return 2;
  }
}

// Tier an intensity level leans toward when choosing exercises.
export function intensityPreferredTier(i: Intensity): Tier {
  return i === 'light' ? 1 : i === 'intense' ? 3 : 2;
}
