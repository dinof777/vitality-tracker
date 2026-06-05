import type { Equipment, Exercise } from './database.types';

// Exercise library — seeded into the Neon `exercises` table (same UUIDs).
// HARD CONSTRAINT: every movement requires ONLY a dumbbell, a resistance band,
// or bodyweight (floor/wall ok). No benches, boxes, chairs, racks, or bars.
// image_url points at AI-generated illustrations in /public/exercises (null =
// falls back to the equipment line-icon until an image is generated).
export const SAMPLE_EXERCISES: Exercise[] = [
  // ---- Dumbbell (22) ----
  { id: '11111111-1111-4111-8111-111111111111', name: 'DB Goblet Squat', muscle_group: 'Legs', equipment: 'dumbbell', default_cue: 'Elbows inside knees · drive through the heels', image_url: '/exercises/goblet-squat.jpg', created_at: '' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'DB Romanian Deadlift', muscle_group: 'Hamstrings', equipment: 'dumbbell', default_cue: 'Hinge at the hips · soft knees · feel the stretch', image_url: '/exercises/rdl.jpg', created_at: '' },
  { id: '99999999-9999-4999-8999-999999999999', name: 'DB Floor Press', muscle_group: 'Chest', equipment: 'dumbbell', default_cue: 'Elbows to the floor · press up · squeeze the dumbbells together', image_url: null, created_at: '' },
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'DB Bent-Over Row', muscle_group: 'Back', equipment: 'dumbbell', default_cue: 'Hinge to 45° · flat back · drive elbows past the ribs', image_url: null, created_at: '' },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'DB Reverse Lunge', muscle_group: 'Legs', equipment: 'dumbbell', default_cue: 'Step back · drop the back knee · drive through the front heel', image_url: null, created_at: '' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'DB Shoulder Press', muscle_group: 'Shoulders', equipment: 'dumbbell', default_cue: 'Brace the core · press to full lockout', image_url: '/exercises/db-shoulder-press.jpg', created_at: '' },
  { id: '66666666-6666-4666-8666-666666666666', name: 'DB Lateral Raise', muscle_group: 'Shoulders', equipment: 'dumbbell', default_cue: 'Lead with the elbows · no swing', image_url: '/exercises/db-lateral-raise.jpg', created_at: '' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'DB Bicep Curl', muscle_group: 'Arms', equipment: 'dumbbell', default_cue: 'No swing · full stretch at the bottom', image_url: '/exercises/db-bicep-curl.jpg', created_at: '' },
  { id: 'd0000001-0000-4000-8000-000000000000', name: 'DB Hammer Curl', muscle_group: 'Arms', equipment: 'dumbbell', default_cue: 'Neutral grip · elbows pinned · slow lower', image_url: null, created_at: '' },
  { id: 'd0000002-0000-4000-8000-000000000000', name: 'DB Overhead Triceps Extension', muscle_group: 'Arms', equipment: 'dumbbell', default_cue: 'Elbows tight · lower behind the head · full lockout', image_url: null, created_at: '' },
  { id: 'd0000003-0000-4000-8000-000000000000', name: 'DB Triceps Kickback', muscle_group: 'Arms', equipment: 'dumbbell', default_cue: 'Hinge over · upper arm still · extend to straight', image_url: null, created_at: '' },
  { id: 'd0000004-0000-4000-8000-000000000000', name: 'DB Front Raise', muscle_group: 'Shoulders', equipment: 'dumbbell', default_cue: 'Raise to eye level · no swing · control down', image_url: null, created_at: '' },
  { id: 'd0000005-0000-4000-8000-000000000000', name: 'DB Rear-Delt Fly', muscle_group: 'Rear Delts', equipment: 'dumbbell', default_cue: 'Hinge over · soft elbows · squeeze the back', image_url: null, created_at: '' },
  { id: 'd0000006-0000-4000-8000-000000000000', name: 'DB Arnold Press', muscle_group: 'Shoulders', equipment: 'dumbbell', default_cue: 'Rotate palms as you press to lockout', image_url: null, created_at: '' },
  { id: 'd0000007-0000-4000-8000-000000000000', name: 'DB Sumo Squat', muscle_group: 'Legs', equipment: 'dumbbell', default_cue: 'Wide stance · toes out · drive the knees open', image_url: null, created_at: '' },
  { id: 'd0000008-0000-4000-8000-000000000000', name: 'DB Walking Lunge', muscle_group: 'Legs', equipment: 'dumbbell', default_cue: 'Long step · tall torso · drive through the front heel', image_url: null, created_at: '' },
  { id: 'd0000009-0000-4000-8000-000000000000', name: 'DB Single-Leg RDL', muscle_group: 'Hamstrings', equipment: 'dumbbell', default_cue: 'Hinge over one leg · flat back · stay balanced', image_url: null, created_at: '' },
  { id: 'd0000010-0000-4000-8000-000000000000', name: 'DB Calf Raise', muscle_group: 'Calves', equipment: 'dumbbell', default_cue: 'Full stretch down · drive tall · pause at the top', image_url: null, created_at: '' },
  { id: 'd0000011-0000-4000-8000-000000000000', name: 'DB Floor Fly', muscle_group: 'Chest', equipment: 'dumbbell', default_cue: 'Soft elbows · wide arc · stretch the chest', image_url: null, created_at: '' },
  { id: 'd0000012-0000-4000-8000-000000000000', name: 'DB Floor Pullover', muscle_group: 'Back', equipment: 'dumbbell', default_cue: 'Lying on the floor · reach overhead · pull to the chest', image_url: null, created_at: '' },
  { id: 'd0000013-0000-4000-8000-000000000000', name: 'DB Russian Twist', muscle_group: 'Core', equipment: 'dumbbell', default_cue: 'Seated · lean back · rotate side to side under control', image_url: null, created_at: '' },
  { id: 'd0000014-0000-4000-8000-000000000000', name: 'DB Shrug', muscle_group: 'Traps', equipment: 'dumbbell', default_cue: 'Shrug straight up · pause · no rolling', image_url: null, created_at: '' },

  // ---- Resistance Band (14) ----
  { id: '33333333-3333-4333-8333-333333333333', name: 'Band Chest Press', muscle_group: 'Chest', equipment: 'band', default_cue: 'Control the negative · full lockout', image_url: '/exercises/band-chest-press.jpg', created_at: '' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Band Row', muscle_group: 'Back', equipment: 'band', default_cue: 'Drive elbows back · squeeze the shoulder blades', image_url: '/exercises/band-row.jpg', created_at: '' },
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Band Pull-Apart', muscle_group: 'Rear Delts', equipment: 'band', default_cue: 'Arms straight · squeeze · control the return', image_url: '/exercises/band-pull-apart.jpg', created_at: '' },
  { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Band Pallof Press', muscle_group: 'Core', equipment: 'band', default_cue: 'Resist the rotation · press straight out', image_url: '/exercises/band-pallof-press.jpg', created_at: '' },
  { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', name: 'Band Lateral Walk', muscle_group: 'Glutes', equipment: 'band', default_cue: 'Tension on the band · small steps · stay low', image_url: '/exercises/band-lateral-walk.jpg', created_at: '' },
  { id: 'd0000015-0000-4000-8000-000000000000', name: 'Band Bicep Curl', muscle_group: 'Arms', equipment: 'band', default_cue: 'Stand on the band · elbows pinned · curl to the top', image_url: null, created_at: '' },
  { id: 'd0000016-0000-4000-8000-000000000000', name: 'Band Overhead Press', muscle_group: 'Shoulders', equipment: 'band', default_cue: 'Stand on the band · press overhead to lockout', image_url: null, created_at: '' },
  { id: 'd0000017-0000-4000-8000-000000000000', name: 'Band Front Raise', muscle_group: 'Shoulders', equipment: 'band', default_cue: 'Stand on the band · raise to eye level · control down', image_url: null, created_at: '' },
  { id: 'd0000018-0000-4000-8000-000000000000', name: 'Band Squat', muscle_group: 'Legs', equipment: 'band', default_cue: 'Stand on the band, loop over shoulders · sit back · drive up', image_url: null, created_at: '' },
  { id: 'd0000019-0000-4000-8000-000000000000', name: 'Band Deadlift', muscle_group: 'Hamstrings', equipment: 'band', default_cue: 'Stand on the band · hinge · drive the hips through', image_url: null, created_at: '' },
  { id: 'd0000020-0000-4000-8000-000000000000', name: 'Band Glute Kickback', muscle_group: 'Glutes', equipment: 'band', default_cue: 'Band around the ankles · drive the heel back · squeeze', image_url: null, created_at: '' },
  { id: 'd0000021-0000-4000-8000-000000000000', name: 'Band Good Morning', muscle_group: 'Hamstrings', equipment: 'band', default_cue: 'Band over the shoulders · hinge with a flat back', image_url: null, created_at: '' },
  { id: 'd0000022-0000-4000-8000-000000000000', name: 'Band Triceps Kickback', muscle_group: 'Arms', equipment: 'band', default_cue: 'Hinge over · upper arm still · extend the band to straight', image_url: null, created_at: '' },
  { id: 'd0000023-0000-4000-8000-000000000000', name: 'Band Lateral Raise', muscle_group: 'Shoulders', equipment: 'band', default_cue: 'Stand on the band · raise out to shoulder height', image_url: null, created_at: '' },

  // ---- Isometric (7) ----
  { id: '77777777-7777-4777-8777-777777777777', name: 'Wall Sit', muscle_group: 'Legs', equipment: 'isometric', default_cue: '90° knees · brace · log seconds held', image_url: '/exercises/wall-sit.jpg', created_at: '' },
  { id: 'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1', name: 'Plank', muscle_group: 'Core', equipment: 'isometric', default_cue: 'Ribs down · glutes tight · log seconds held', image_url: '/exercises/plank.jpg', created_at: '' },
  { id: 'a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2', name: 'Glute Bridge Hold', muscle_group: 'Glutes', equipment: 'isometric', default_cue: 'Posterior tilt · squeeze at the top · log seconds', image_url: '/exercises/glute-bridge-hold.jpg', created_at: '' },
  { id: 'd0000024-0000-4000-8000-000000000000', name: 'Side Plank', muscle_group: 'Core', equipment: 'isometric', default_cue: 'Stack the hips · straight line · log seconds/side', image_url: null, created_at: '' },
  { id: 'd0000025-0000-4000-8000-000000000000', name: 'Hollow Body Hold', muscle_group: 'Core', equipment: 'isometric', default_cue: 'Low back pressed down · arms & legs extended · log seconds', image_url: null, created_at: '' },
  { id: 'd0000026-0000-4000-8000-000000000000', name: 'Isometric Squat Hold', muscle_group: 'Legs', equipment: 'isometric', default_cue: 'Thighs parallel · chest tall · log seconds held', image_url: null, created_at: '' },
  { id: 'd0000027-0000-4000-8000-000000000000', name: 'Superman Hold', muscle_group: 'Back', equipment: 'isometric', default_cue: 'Face down · lift arms & legs · squeeze · log seconds', image_url: null, created_at: '' },

  // ---- Stretch (7) ----
  { id: '88888888-8888-4888-8888-888888888888', name: 'Kneeling Hip Flexor Stretch', muscle_group: 'Hip Flexors', equipment: 'stretch', default_cue: 'Tall posture · tuck the pelvis · hold 60s/side', image_url: '/exercises/hip-flexor-stretch.jpg', created_at: '' },
  { id: 'a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3', name: '90/90 Hip Stretch', muscle_group: 'Hips', equipment: 'stretch', default_cue: 'Both knees 90° · sit tall · breathe into the stretch', image_url: '/exercises/90-90-hip-stretch.jpg', created_at: '' },
  { id: 'a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', name: 'Thoracic Opener', muscle_group: 'T-Spine', equipment: 'stretch', default_cue: 'Open the top arm · follow with the eyes · slow', image_url: '/exercises/thoracic-opener.jpg', created_at: '' },
  { id: 'd0000028-0000-4000-8000-000000000000', name: "World's Greatest Stretch", muscle_group: 'Full Body', equipment: 'stretch', default_cue: 'Lunge · drop the elbow inside · rotate open', image_url: null, created_at: '' },
  { id: 'd0000029-0000-4000-8000-000000000000', name: 'Standing Forward Fold', muscle_group: 'Hamstrings', equipment: 'stretch', default_cue: 'Soft knees · hinge over · let the head hang', image_url: null, created_at: '' },
  { id: 'd0000030-0000-4000-8000-000000000000', name: 'Pigeon Pose', muscle_group: 'Glutes', equipment: 'stretch', default_cue: 'Front shin forward · square the hips · sink down', image_url: null, created_at: '' },
  { id: 'd0000031-0000-4000-8000-000000000000', name: "Child's Pose", muscle_group: 'Back', equipment: 'stretch', default_cue: 'Hips to heels · reach long · breathe into the back', image_url: null, created_at: '' },
];

// Display order + labels for grouping the picker.
export const EQUIPMENT_ORDER: Equipment[] = ['dumbbell', 'band', 'isometric', 'stretch'];
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: 'Dumbbell',
  band: 'Resistance Band',
  isometric: 'Isometric Hold',
  stretch: 'Stretch',
};
