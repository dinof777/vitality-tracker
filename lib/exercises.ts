import type { Equipment, Exercise } from './database.types';

// Exercise library — seeded into the Neon `exercises` table (same UUIDs).
// Equipment-constrained to dumbbells / resistance bands / isometric / stretch
// per Brian's training (no barbells/machines). Edit here + re-seed to change.
// image_url points at AI-generated illustrations in /public/exercises.
export const SAMPLE_EXERCISES: Exercise[] = [
  // Dumbbell
  { id: '11111111-1111-4111-8111-111111111111', name: 'DB Goblet Squat', muscle_group: 'Legs', equipment: 'dumbbell', default_cue: 'Elbows inside knees · drive through the heels', image_url: '/exercises/goblet-squat.jpg', created_at: '' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'DB Romanian Deadlift', muscle_group: 'Hamstrings', equipment: 'dumbbell', default_cue: 'Hinge at the hips · soft knees · feel the stretch', image_url: '/exercises/rdl.jpg', created_at: '' },
  { id: '99999999-9999-4999-8999-999999999999', name: 'DB Bench Press', muscle_group: 'Chest', equipment: 'dumbbell', default_cue: 'Control the negative · drive the dumbbells together', image_url: '/exercises/db-bench.jpg', created_at: '' },
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'DB Row', muscle_group: 'Back', equipment: 'dumbbell', default_cue: 'Flat back · drive the elbow past the ribs', image_url: '/exercises/db-row.jpg', created_at: '' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'DB Shoulder Press', muscle_group: 'Shoulders', equipment: 'dumbbell', default_cue: 'Brace the core · press to full lockout', image_url: '/exercises/db-shoulder-press.jpg', created_at: '' },
  { id: '66666666-6666-4666-8666-666666666666', name: 'DB Lateral Raise', muscle_group: 'Shoulders', equipment: 'dumbbell', default_cue: 'Lead with the elbows · no swing', image_url: '/exercises/db-lateral-raise.jpg', created_at: '' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'DB Bicep Curl', muscle_group: 'Arms', equipment: 'dumbbell', default_cue: 'No swing · full stretch at the bottom', image_url: '/exercises/db-bicep-curl.jpg', created_at: '' },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'DB Bulgarian Split Squat', muscle_group: 'Legs', equipment: 'dumbbell', default_cue: 'Rear foot elevated · stay tall · drive the front heel', image_url: '/exercises/bulgarian-split-squat.jpg', created_at: '' },
  // Band
  { id: '33333333-3333-4333-8333-333333333333', name: 'Band Chest Press', muscle_group: 'Chest', equipment: 'band', default_cue: 'Control the negative · full lockout', image_url: '/exercises/band-chest-press.jpg', created_at: '' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Band Row', muscle_group: 'Back', equipment: 'band', default_cue: 'Drive elbows back · squeeze the shoulder blades', image_url: '/exercises/band-row.jpg', created_at: '' },
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Band Pull-Apart', muscle_group: 'Rear Delts', equipment: 'band', default_cue: 'Arms straight · squeeze · control the return', image_url: '/exercises/band-pull-apart.jpg', created_at: '' },
  { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Band Pallof Press', muscle_group: 'Core', equipment: 'band', default_cue: 'Resist the rotation · press straight out', image_url: '/exercises/band-pallof-press.jpg', created_at: '' },
  { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', name: 'Band Lateral Walk', muscle_group: 'Glutes', equipment: 'band', default_cue: 'Tension on the band · small steps · stay low', image_url: '/exercises/band-lateral-walk.jpg', created_at: '' },
  // Isometric
  { id: '77777777-7777-4777-8777-777777777777', name: 'Wall Sit', muscle_group: 'Legs', equipment: 'isometric', default_cue: '90° knees · brace · log seconds held', image_url: '/exercises/wall-sit.jpg', created_at: '' },
  { id: 'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1', name: 'Plank', muscle_group: 'Core', equipment: 'isometric', default_cue: 'Ribs down · glutes tight · log seconds held', image_url: '/exercises/plank.jpg', created_at: '' },
  { id: 'a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2', name: 'Glute Bridge Hold', muscle_group: 'Glutes', equipment: 'isometric', default_cue: 'Posterior tilt · squeeze at the top · log seconds', image_url: '/exercises/glute-bridge-hold.jpg', created_at: '' },
  // Stretch
  { id: '88888888-8888-4888-8888-888888888888', name: 'Couch Stretch', muscle_group: 'Hip Flexors', equipment: 'stretch', default_cue: 'Tall posture · tuck the pelvis · hold 60s/side', image_url: '/exercises/couch-stretch.jpg', created_at: '' },
  { id: 'a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3', name: '90/90 Hip Stretch', muscle_group: 'Hips', equipment: 'stretch', default_cue: 'Both knees 90° · sit tall · breathe into the stretch', image_url: '/exercises/90-90-hip-stretch.jpg', created_at: '' },
  { id: 'a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', name: 'Thoracic Opener', muscle_group: 'T-Spine', equipment: 'stretch', default_cue: 'Open the top arm · follow with the eyes · slow', image_url: '/exercises/thoracic-opener.jpg', created_at: '' },
];

// Display order + labels for grouping the picker.
export const EQUIPMENT_ORDER: Equipment[] = ['dumbbell', 'band', 'isometric', 'stretch'];
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: 'Dumbbell',
  band: 'Resistance Band',
  isometric: 'Isometric Hold',
  stretch: 'Stretch',
};
