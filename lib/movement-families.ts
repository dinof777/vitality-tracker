// Movement families — which exercises are the same pattern done a different way.
//
// The library is flat by design (every variation keeps its own id, so routines,
// saved workouts and SyncroFit circuits never break). This map is a PRESENTATION
// layer on top: the picker collapses a family into one entry with a variation
// chooser, instead of showing six near-identical rows.
//
// Keyed by exact exercise name. A key that matches nothing is caught by a test.

export interface MovementFamily {
  family: string;
  variant: string;
}

export const MOVEMENT_FAMILIES: Record<string, MovementFamily> = {
  // ── Squat ────────────────────────────────────────────────────────────────
  'Bodyweight Squat': { family: 'Squat', variant: 'Bodyweight' },
  'DB Squat': { family: 'Squat', variant: 'Dumbbell' },
  'DB Goblet Squat': { family: 'Squat', variant: 'Goblet (dumbbell)' },
  'KB Goblet Squat': { family: 'Squat', variant: 'Goblet (kettlebell)' },
  'DB Front Squat': { family: 'Squat', variant: 'Front rack' },
  'DB Sumo Squat': { family: 'Squat', variant: 'Sumo' },
  'Tube Band Squat': { family: 'Squat', variant: 'Tube band' },
  'Loop Band Squat': { family: 'Squat', variant: 'Loop band' },
  'Jump Squat': { family: 'Squat', variant: 'Jump' },
  'Banded Squat Jump': { family: 'Squat', variant: 'Banded jump' },
  'Isometric Squat Hold': { family: 'Squat', variant: 'Isometric hold' },
  'Wall Sit': { family: 'Squat', variant: 'Wall sit — hold' },
  'Single-Leg Wall Sit': { family: 'Squat', variant: 'Single-leg wall sit — hold' },
  'Wall Slide Mini Squat': { family: 'Squat', variant: 'Wall slide, shallow' },

  // ── Lunge / split stance ─────────────────────────────────────────────────
  'Bodyweight Lunge': { family: 'Lunge', variant: 'Bodyweight forward' },
  'Bodyweight Reverse Lunge': { family: 'Lunge', variant: 'Bodyweight reverse' },
  'DB Reverse Lunge': { family: 'Lunge', variant: 'Dumbbell reverse' },
  'Banded Reverse Lunge': { family: 'Lunge', variant: 'Banded reverse' },
  'DB Walking Lunge': { family: 'Lunge', variant: 'Walking' },
  'DB Curtsy Lunge': { family: 'Lunge', variant: 'Curtsy' },
  'DB Lateral Lunge': { family: 'Lunge', variant: 'Lateral' },
  'KB Front Rack Reverse Lunge': { family: 'Lunge', variant: 'Kettlebell front rack' },
  'Med Ball Lunge with Twist': { family: 'Lunge', variant: 'With twist' },
  'Split Squat Hold': { family: 'Lunge', variant: 'Split squat — hold' },

  // ── Glute bridge ─────────────────────────────────────────────────────────
  'Glute Bridge': { family: 'Glute Bridge', variant: 'Bodyweight' },
  'DB Glute Bridge': { family: 'Glute Bridge', variant: 'Dumbbell' },
  'Glute Bridge Hold': { family: 'Glute Bridge', variant: 'Isometric hold' },
  'Single-Leg Glute Bridge': { family: 'Glute Bridge', variant: 'Single leg' },
  'Single-Leg Glute Bridge Hold': { family: 'Glute Bridge', variant: 'Single leg — hold' },
  'Banded Glute Bridge Abduction': { family: 'Glute Bridge', variant: 'Banded abduction' },

  // ── Calf raise ───────────────────────────────────────────────────────────
  'Calf Raise': { family: 'Calf Raise', variant: 'Bodyweight' },
  'DB Calf Raise': { family: 'Calf Raise', variant: 'Dumbbell' },

  // ── Curl ─────────────────────────────────────────────────────────────────
  'DB Bicep Curl': { family: 'Bicep Curl', variant: 'Dumbbell' },
  'Band Bicep Curl': { family: 'Bicep Curl', variant: 'Band' },
  'DB Hammer Curl': { family: 'Bicep Curl', variant: 'Hammer (dumbbell)' },
  'Band Hammer Curl': { family: 'Bicep Curl', variant: 'Hammer (band)' },
  'DB Concentration Curl': { family: 'Bicep Curl', variant: 'Concentration' },
  'DB Zottman Curl': { family: 'Bicep Curl', variant: 'Zottman' },

  // ── Row ──────────────────────────────────────────────────────────────────
  'DB Bent-Over Row': { family: 'Row', variant: 'Dumbbell bent-over' },
  'Band Row': { family: 'Row', variant: 'Band' },
  'DB Gorilla Row': { family: 'Row', variant: 'Gorilla' },
  'DB Renegade Row': { family: 'Row', variant: 'Renegade' },
  'KB Single-Arm Row': { family: 'Row', variant: 'Single-arm (kettlebell)' },
  'Band Single-Arm Row': { family: 'Row', variant: 'Single-arm (band)' },

  // ── Overhead press ───────────────────────────────────────────────────────
  'DB Shoulder Press': { family: 'Overhead Press', variant: 'Dumbbell' },
  'Band Overhead Press': { family: 'Overhead Press', variant: 'Band' },
  'KB Overhead Press': { family: 'Overhead Press', variant: 'Kettlebell' },
  'DB Arnold Press': { family: 'Overhead Press', variant: 'Arnold' },
  'DB Push Press': { family: 'Overhead Press', variant: 'Push press' },

  // ── Hinge ────────────────────────────────────────────────────────────────
  'DB Romanian Deadlift': { family: 'Romanian Deadlift', variant: 'Dumbbell' },
  'KB Romanian Deadlift': { family: 'Romanian Deadlift', variant: 'Kettlebell' },
  'DB Single-Leg RDL': { family: 'Romanian Deadlift', variant: 'Single leg' },
  'DB Good Morning': { family: 'Good Morning', variant: 'Dumbbell' },
  'Band Good Morning': { family: 'Good Morning', variant: 'Band' },

  // ── Shoulder raises / triceps ────────────────────────────────────────────
  'DB Lateral Raise': { family: 'Lateral Raise', variant: 'Dumbbell' },
  'Band Lateral Raise': { family: 'Lateral Raise', variant: 'Band' },
  'DB Front Raise': { family: 'Front Raise', variant: 'Dumbbell' },
  'Band Front Raise': { family: 'Front Raise', variant: 'Band' },
  'DB Triceps Kickback': { family: 'Triceps Kickback', variant: 'Dumbbell' },
  'Band Triceps Kickback': { family: 'Triceps Kickback', variant: 'Band' },

  // ── Core / hips ──────────────────────────────────────────────────────────
  'DB Russian Twist': { family: 'Russian Twist', variant: 'Dumbbell' },
  'Med Ball Russian Twist': { family: 'Russian Twist', variant: 'Medicine ball' },
  'Push-Up': { family: 'Push-Up', variant: 'Standard' },
  'Med Ball Push-Up': { family: 'Push-Up', variant: 'Medicine ball' },
  'Banded Standing Hip Abduction': { family: 'Hip Abduction', variant: 'Standing' },
  'Banded Seated Hip Abduction': { family: 'Hip Abduction', variant: 'Seated' },
  'Banded Clamshell': { family: 'Hip Abduction', variant: 'Clamshell' },

  // ── Knee rehab: extension + flexion progressions ─────────────────────────
  'Quad Set': { family: 'Knee Extension', variant: 'Quad set — isometric' },
  'Short Arc Quad': { family: 'Knee Extension', variant: 'Short arc' },
  'Long Arc Quad': { family: 'Knee Extension', variant: 'Long arc (seated)' },
  'Terminal Knee Extension': { family: 'Knee Extension', variant: 'Banded, standing' },
  'Heel Slide': { family: 'Knee Flexion', variant: 'Supine heel slide' },
  'Seated Heel Drag': { family: 'Knee Flexion', variant: 'Seated heel drag' },
  'Standing Hamstring Curl': { family: 'Knee Flexion', variant: 'Standing curl' },
  'Seated Knee Flexion Stretch': { family: 'Knee Flexion', variant: 'Sustained stretch' },
};

/** The family/variant for an exercise name, if it belongs to one. */
export function familyOf(name: string): MovementFamily | undefined {
  return MOVEMENT_FAMILIES[name];
}
