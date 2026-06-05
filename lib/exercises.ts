import type { Exercise } from './database.types';

// Exercise library — seeded into the Neon `exercises` table (same UUIDs).
// Equipment-constrained to dumbbells / resistance bands / isometric / stretch
// per Brian's training (no barbells/machines). Edit here + re-seed to change.
export const SAMPLE_EXERCISES: Exercise[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'DB Goblet Squat', muscle_group: 'Legs', default_cue: 'Elbows inside knees · drive through the heels', created_at: '' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'DB Romanian Deadlift', muscle_group: 'Hamstrings', default_cue: 'Hinge at the hips · soft knees · feel the stretch', created_at: '' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Band Chest Press', muscle_group: 'Chest', default_cue: 'Control the negative · full lockout', created_at: '' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'DB Shoulder Press', muscle_group: 'Shoulders', default_cue: 'Brace the core · press to full lockout', created_at: '' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Band Row', muscle_group: 'Back', default_cue: 'Drive elbows back · squeeze the shoulder blades', created_at: '' },
  { id: '66666666-6666-4666-8666-666666666666', name: 'DB Lateral Raise', muscle_group: 'Shoulders', default_cue: 'Lead with the elbows · no swing', created_at: '' },
  { id: '77777777-7777-4777-8777-777777777777', name: 'Wall Sit (Isometric)', muscle_group: 'Legs', default_cue: '90° knees · brace · log seconds held', created_at: '' },
  { id: '88888888-8888-4888-8888-888888888888', name: 'Couch Stretch', muscle_group: 'Hip Flexors', default_cue: 'Tall posture · tuck the pelvis · hold 60s/side', created_at: '' },
];
