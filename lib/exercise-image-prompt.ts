import { EQUIPMENT_LABEL } from './exercises';
import type { Equipment } from './database.types';

// The library's 291 illustrations were all generated from this one template —
// pulled out here as the single source of truth so both this feature (custom
// exercises) and any future library-art generation prompt off the same style.
// Kept VERBATIM; changing the wording here changes the house style everywhere
// it's referenced, so treat edits to this string as a design decision.
export const EXERCISE_IMAGE_STYLE =
  'Minimalist flat-vector exercise illustration, single figure, square. Solid lime-green (#A3E635) figure fill with a clean white outer outline and subtle darker-green interior contour lines suggesting muscle and athletic clothing (tank top, shorts, sneakers). Pure carbon-black (#121316) background filling the entire square edge to edge (NOT white). Centered, full body visible, no shadow, no gradient shading, no text, no logo. Bold clean linework, consistent icon-set style.';

// Equipment that names a training method rather than a prop — there's nothing
// to draw in the athlete's hands, so it's left out of the pose sentence.
const BODYWEIGHT_EQUIPMENT = new Set<string>(['calisthenics', 'stretch']);

function resolveEquipmentLabel(
  equipment?: Equipment | string | null,
  equipmentLabel?: string | null,
): string | null {
  // A caller-supplied label wins outright — this is how a gym's own named
  // equipment (not one of our Equipment enum values) gets into the prompt.
  const override = equipmentLabel?.trim();
  if (override) return override;

  const value = equipment?.trim();
  if (!value || BODYWEIGHT_EQUIPMENT.has(value)) return null;
  if (value in EQUIPMENT_LABEL) return EQUIPMENT_LABEL[value as Equipment];
  // Unrecognized string (not one of our enum keys) — assume it's already a
  // readable label and pass it through rather than dropping it silently.
  return value;
}

export interface ExerciseImagePromptInput {
  name: string;
  /** Accepted for signature symmetry with the create form; not currently
   *  woven into the pose sentence — see buildExerciseImagePrompt. */
  muscleGroup?: string | null;
  equipment?: Equipment | string | null;
  /** Pre-resolved override for equipment not in the Equipment enum (a gym's
   *  own custom equipment name). Wins over `equipment` when both are set. */
  equipmentLabel?: string | null;
  cue?: string | null;
}

// Builds a single copy-paste prompt for ANY general-purpose AI image
// generator (ChatGPT, Gemini, etc.) that reproduces the library's house
// style around the specific move a trainer just typed in. We never call an
// image-generation API ourselves — this only composes text. Pure and
// side-effect-free so it's trivially unit-testable.
export function buildExerciseImagePrompt({
  name,
  equipment,
  equipmentLabel,
  cue,
}: ExerciseImagePromptInput): string {
  const trimmedName = name.trim();
  const label = resolveEquipmentLabel(equipment, equipmentLabel);
  const trimmedCue = cue?.trim();

  const pose =
    `A muscular athlete performing a ${trimmedName}` +
    (label ? ` using ${label}` : '') +
    (trimmedCue ? `. Form: ${trimmedCue}.` : '.');

  return `${pose} ${EXERCISE_IMAGE_STYLE}`;
}
