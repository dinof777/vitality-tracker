import type { Equipment, Exercise } from './database.types';

// Move library (270) — seeded into the Neon `exercises` table (same UUIDs).
// EQUIPMENT CONSTRAINT (home-gym tier): dumbbells, a kettlebell, a tube band
// (long/handled), a loop band (mini/booty band), a pull-up bar, a medicine
// ball, a jump rope, or bodyweight (floor/wall) — no benches, boxes, racks, or
// bars, the one exception being the knee-rehab section, where a sturdy chair
// or a low step is core to the movement (documented there). The gym-equipment
// section below is a second tier, deliberately outside that constraint — it's
// the machine/free-weight kit ("Gym equipment" trainer spec) a commercial gym
// actually has, including barbells with rack access bundled into `barbell`.
// image_url null = equipment-icon fallback until an illustration is generated.
const E = (
  id: string,
  name: string,
  muscle_group: string,
  equipment: Equipment,
  default_cue: string,
  image_url: string | null = null,
  tags: string[] = [],
): Exercise => ({ id, name, muscle_group, equipment, default_cue, image_url, created_at: '', tags });

export const SAMPLE_EXERCISES: Exercise[] = [
  // ===== Dumbbell (38) =====
  E('11111111-1111-4111-8111-111111111111', 'DB Goblet Squat', 'Legs', 'dumbbell', 'Elbows inside knees · drive through the heels', '/exercises/goblet-squat.jpg'),
  E('22222222-2222-4222-8222-222222222222', 'DB Romanian Deadlift', 'Hamstrings', 'dumbbell', 'Hinge at the hips · soft knees · feel the stretch', '/exercises/rdl.jpg'),
  E('99999999-9999-4999-8999-999999999999', 'DB Floor Press', 'Chest', 'dumbbell', 'Elbows to the floor · press up · squeeze the dumbbells together', '/exercises/floor-press.jpg'),
  E('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'DB Bent-Over Row', 'Back', 'dumbbell', 'Hinge to 45° · flat back · drive elbows past the ribs', '/exercises/bent-over-row.jpg'),
  E('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'DB Reverse Lunge', 'Legs', 'dumbbell', 'Step back · drop the back knee · drive through the front heel', '/exercises/reverse-lunge.jpg'),
  E('44444444-4444-4444-8444-444444444444', 'DB Shoulder Press', 'Shoulders', 'dumbbell', 'Brace the core · press to full lockout', '/exercises/db-shoulder-press.jpg'),
  E('66666666-6666-4666-8666-666666666666', 'DB Lateral Raise', 'Shoulders', 'dumbbell', 'Lead with the elbows · no swing', '/exercises/db-lateral-raise.jpg'),
  E('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'DB Bicep Curl', 'Biceps', 'dumbbell', 'No swing · full stretch at the bottom', '/exercises/db-bicep-curl.jpg'),
  E('d0000001-0000-4000-8000-000000000000', 'DB Hammer Curl', 'Biceps', 'dumbbell', 'Neutral grip · elbows pinned · slow lower', '/exercises/hammer-curl.jpg'),
  E('d0000002-0000-4000-8000-000000000000', 'DB Overhead Triceps Extension', 'Triceps', 'dumbbell', 'Elbows tight · lower behind the head · full lockout', '/exercises/triceps-extension.jpg'),
  E('d0000003-0000-4000-8000-000000000000', 'DB Triceps Kickback', 'Triceps', 'dumbbell', 'Hinge over · upper arm still · extend to straight', '/exercises/triceps-kickback.jpg'),
  E('d0000004-0000-4000-8000-000000000000', 'DB Front Raise', 'Shoulders', 'dumbbell', 'Raise to eye level · no swing · control down', '/exercises/front-raise.jpg'),
  E('d0000005-0000-4000-8000-000000000000', 'DB Rear-Delt Fly', 'Rear Delts', 'dumbbell', 'Hinge over · soft elbows · squeeze the back', '/exercises/rear-delt-fly.jpg', ['physical-therapy', 'upper-back', 'stage-3']),
  E('d0000006-0000-4000-8000-000000000000', 'DB Arnold Press', 'Shoulders', 'dumbbell', 'Rotate palms as you press to lockout', '/exercises/arnold-press.jpg'),
  E('d0000007-0000-4000-8000-000000000000', 'DB Sumo Squat', 'Legs', 'dumbbell', 'Wide stance · toes out · drive the knees open', '/exercises/sumo-squat.jpg'),
  E('d0000008-0000-4000-8000-000000000000', 'DB Walking Lunge', 'Legs', 'dumbbell', 'Long step · tall torso · drive through the front heel', '/exercises/walking-lunge.jpg'),
  E('d0000009-0000-4000-8000-000000000000', 'DB Single-Leg RDL', 'Hamstrings', 'dumbbell', 'Hinge over one leg · flat back · stay balanced', '/exercises/single-leg-rdl.jpg'),
  E('d0000010-0000-4000-8000-000000000000', 'DB Calf Raise', 'Calves', 'dumbbell', 'Full stretch down · drive tall · pause at the top', '/exercises/calf-raise.jpg'),
  E('d0000011-0000-4000-8000-000000000000', 'DB Floor Fly', 'Chest', 'dumbbell', 'Soft elbows · wide arc · stretch the chest', '/exercises/floor-fly.jpg'),
  E('d0000012-0000-4000-8000-000000000000', 'DB Floor Pullover', 'Back', 'dumbbell', 'Lying on the floor · reach overhead · pull to the chest', '/exercises/floor-pullover.jpg'),
  E('d0000013-0000-4000-8000-000000000000', 'DB Russian Twist', 'Obliques', 'dumbbell', 'Seated · lean back · rotate side to side under control', '/exercises/russian-twist.jpg'),
  E('d0000014-0000-4000-8000-000000000000', 'DB Shrug', 'Traps', 'dumbbell', 'Shrug straight up · pause · no rolling', '/exercises/db-shrug.jpg', ['physical-therapy', 'upper-back', 'stage-3']),
  E('d0000032-0000-4000-8000-000000000000', 'DB Squat', 'Legs', 'dumbbell', 'Dumbbells at the sides · sit back · drive up tall', '/exercises/db-squat.jpg'),
  E('d0000033-0000-4000-8000-000000000000', 'DB Front Squat', 'Legs', 'dumbbell', 'Dumbbells at the shoulders · elbows up · stay tall', '/exercises/db-front-squat.jpg'),
  E('d0000034-0000-4000-8000-000000000000', 'DB Curtsy Lunge', 'Glutes', 'dumbbell', 'Step behind and across · drop the back knee', '/exercises/curtsy-lunge.jpg'),
  E('d0000035-0000-4000-8000-000000000000', 'DB Lateral Lunge', 'Legs', 'dumbbell', 'Step wide · push the hips back · drive out of it', '/exercises/lateral-lunge.jpg'),
  E('d0000036-0000-4000-8000-000000000000', 'DB Good Morning', 'Hamstrings', 'dumbbell', 'Dumbbells on the shoulders · hinge with a flat back', '/exercises/db-good-morning.jpg'),
  E('d0000037-0000-4000-8000-000000000000', 'DB Glute Bridge', 'Glutes', 'dumbbell', 'Dumbbell on the hips · drive through the heels · squeeze', '/exercises/db-glute-bridge.jpg'),
  E('d0000038-0000-4000-8000-000000000000', 'DB Push Press', 'Shoulders', 'dumbbell', 'Dip the knees · drive the dumbbells overhead', '/exercises/push-press.jpg'),
  E('d0000039-0000-4000-8000-000000000000', 'DB Upright Row', 'Shoulders', 'dumbbell', 'Pull to the chest · elbows lead · no shrug', '/exercises/upright-row.jpg'),
  E('d0000040-0000-4000-8000-000000000000', 'DB Concentration Curl', 'Biceps', 'dumbbell', 'Elbow on the thigh · curl slow · full squeeze', '/exercises/concentration-curl.jpg'),
  E('d0000041-0000-4000-8000-000000000000', 'DB Zottman Curl', 'Grip', 'dumbbell', 'Curl up palms-up · rotate · lower palms-down', '/exercises/zottman-curl.jpg'),
  E('d0000042-0000-4000-8000-000000000000', 'DB Skull Crusher', 'Triceps', 'dumbbell', 'Lying on the floor · lower to the forehead · extend', '/exercises/skull-crusher.jpg'),
  E('d0000043-0000-4000-8000-000000000000', 'DB Close-Grip Floor Press', 'Chest', 'dumbbell', 'Elbows tucked · press the dumbbells together', '/exercises/close-grip-floor-press.jpg'),
  E('d0000044-0000-4000-8000-000000000000', 'DB Renegade Row', 'Back', 'dumbbell', 'High plank on the dumbbells · row one side · stay square', '/exercises/renegade-row.jpg'),
  E('d0000045-0000-4000-8000-000000000000', 'DB Gorilla Row', 'Back', 'dumbbell', 'Hinge over · row the dumbbells alternating · flat back', '/exercises/gorilla-row.jpg'),
  E('d0000046-0000-4000-8000-000000000000', 'DB Farmer Carry', 'Full Body', 'dumbbell', 'Heavy dumbbells · tall posture · walk with control', '/exercises/farmer-carry.jpg'),
  E('d0000047-0000-4000-8000-000000000000', 'DB Woodchopper', 'Obliques', 'dumbbell', 'One dumbbell · chop diagonally across the body', '/exercises/woodchopper.jpg'),

  // ===== Tube Band — long / handled (20) =====
  E('33333333-3333-4333-8333-333333333333', 'Band Chest Press', 'Chest', 'tube_band', 'Control the negative · full lockout', '/exercises/band-chest-press.jpg'),
  E('55555555-5555-4555-8555-555555555555', 'Band Row', 'Back', 'tube_band', 'Drive elbows back · squeeze the shoulder blades', '/exercises/band-row.jpg', ['physical-therapy', 'upper-back', 'stage-3']),
  E('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Band Pull-Apart', 'Rear Delts', 'tube_band', 'Arms straight · squeeze · control the return', '/exercises/band-pull-apart.jpg', ['physical-therapy', 'upper-back', 'stage-1', 'weight-bearing']),
  E('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Band Pallof Press', 'Obliques', 'tube_band', 'Resist the rotation · press straight out', '/exercises/band-pallof-press.jpg', ['physical-therapy', 'low-back', 'stage-3', 'weight-bearing']),
  E('d0000015-0000-4000-8000-000000000000', 'Band Bicep Curl', 'Biceps', 'tube_band', 'Stand on the band · elbows pinned · curl to the top', '/exercises/band-bicep-curl.jpg'),
  E('d0000016-0000-4000-8000-000000000000', 'Band Overhead Press', 'Shoulders', 'tube_band', 'Stand on the band · press overhead to lockout', '/exercises/band-overhead-press.jpg'),
  E('d0000017-0000-4000-8000-000000000000', 'Band Front Raise', 'Shoulders', 'tube_band', 'Stand on the band · raise to eye level · control down', '/exercises/band-front-raise.jpg'),
  E('d0000018-0000-4000-8000-000000000000', 'Tube Band Squat', 'Legs', 'tube_band', 'Stand on the band, loop over shoulders · sit back · drive up', '/exercises/band-squat.jpg'),
  E('d0000019-0000-4000-8000-000000000000', 'Band Deadlift', 'Hamstrings', 'tube_band', 'Stand on the band · hinge · drive the hips through', '/exercises/band-deadlift.jpg'),
  E('d0000021-0000-4000-8000-000000000000', 'Band Good Morning', 'Hamstrings', 'tube_band', 'Band over the shoulders · hinge with a flat back', '/exercises/band-good-morning.jpg', ['physical-therapy', 'low-back', 'stage-3', 'weight-bearing']),
  E('d0000022-0000-4000-8000-000000000000', 'Band Triceps Kickback', 'Triceps', 'tube_band', 'Hinge over · upper arm still · extend the band to straight', '/exercises/band-triceps-kickback.jpg'),
  E('d0000023-0000-4000-8000-000000000000', 'Band Lateral Raise', 'Shoulders', 'tube_band', 'Stand on the band · raise out to shoulder height', '/exercises/band-lateral-raise.jpg'),
  E('d0000048-0000-4000-8000-000000000000', 'Band Thruster', 'Full Body', 'tube_band', 'Squat · drive up and press the band overhead', '/exercises/band-thruster.jpg'),
  E('d0000049-0000-4000-8000-000000000000', 'Band Lat Pulldown', 'Back', 'tube_band', 'Anchor high · pull the band down to the chest', '/exercises/band-lat-pulldown.jpg'),
  E('d0000050-0000-4000-8000-000000000000', 'Band Face Pull', 'Rear Delts', 'tube_band', 'Anchor high · pull to the face · elbows high', '/exercises/band-face-pull.jpg', ['physical-therapy', 'upper-back', 'stage-2', 'weight-bearing']),
  E('d0000051-0000-4000-8000-000000000000', 'Band Hammer Curl', 'Biceps', 'tube_band', 'Stand on the band · neutral grip · curl', '/exercises/band-hammer-curl.jpg'),
  E('d0000052-0000-4000-8000-000000000000', 'Band Single-Arm Row', 'Back', 'tube_band', 'Anchor ahead · drive one elbow back', '/exercises/band-single-arm-row.jpg'),
  E('d0000053-0000-4000-8000-000000000000', 'Band Chest Fly', 'Chest', 'tube_band', 'Anchor behind · arc the arms together', '/exercises/band-chest-fly.jpg'),
  E('d0000054-0000-4000-8000-000000000000', 'Band Reverse Fly', 'Rear Delts', 'tube_band', 'Arms out wide · squeeze the shoulder blades', '/exercises/band-reverse-fly.jpg', ['physical-therapy', 'upper-back', 'stage-2', 'weight-bearing']),
  E('d0000055-0000-4000-8000-000000000000', 'Band Triceps Pushdown', 'Triceps', 'tube_band', 'Anchor high · elbows pinned · press down', '/exercises/band-triceps-pushdown.jpg'),

  // ===== Loop Band — mini / booty band (14) =====
  E('ffffffff-ffff-4fff-8fff-ffffffffffff', 'Band Lateral Walk', 'Glutes', 'loop_band', 'Tension on the band · small steps · stay low', '/exercises/band-lateral-walk.jpg', ['hip', 'stage-3']),
  E('d0000020-0000-4000-8000-000000000000', 'Band Glute Kickback', 'Glutes', 'loop_band', 'Band around the ankles · drive the heel back · squeeze', '/exercises/band-glute-kickback.jpg'),
  E('d0000056-0000-4000-8000-000000000000', 'Banded Clamshell', 'Glutes', 'loop_band', 'Side-lying · band above the knees · open the top knee', '/exercises/clamshell.jpg', ['hip', 'stage-1']),
  E('d0000057-0000-4000-8000-000000000000', 'Banded Glute Bridge Abduction', 'Glutes', 'loop_band', 'Bridge up · push the knees out against the band', '/exercises/glute-bridge-abduction.jpg', ['physical-therapy', 'hip', 'stage-1', 'seated-lying']),
  E('d0000058-0000-4000-8000-000000000000', 'Banded Monster Walk', 'Glutes', 'loop_band', 'Band above the knees · step forward and out', '/exercises/monster-walk.jpg', ['hip', 'stage-3']),
  E('d0000059-0000-4000-8000-000000000000', 'Loop Band Squat', 'Legs', 'loop_band', 'Band above the knees · push the knees out as you squat', '/exercises/banded-squat.jpg'),
  E('d0000060-0000-4000-8000-000000000000', 'Banded Fire Hydrant', 'Glutes', 'loop_band', 'On all fours · lift the knee out to the side', '/exercises/fire-hydrant.jpg', ['physical-therapy', 'hip', 'stage-2']),
  E('d0000061-0000-4000-8000-000000000000', 'Banded Standing Hip Abduction', 'Glutes', 'loop_band', 'Band at the ankles · lift the leg out · control back', '/exercises/standing-hip-abduction.jpg', ['hip', 'stage-2']),
  E('d0000062-0000-4000-8000-000000000000', 'Banded Donkey Kick', 'Glutes', 'loop_band', 'On all fours · drive the heel up and back', '/exercises/donkey-kick.jpg', ['physical-therapy', 'hip', 'stage-2']),
  E('d0000063-0000-4000-8000-000000000000', 'Banded Seated Hip Abduction', 'Glutes', 'loop_band', 'Seated · band above the knees · press the knees apart', '/exercises/seated-hip-abduction.jpg', ['hip', 'stage-1']),
  E('d0000064-0000-4000-8000-000000000000', 'Banded Reverse Lunge', 'Legs', 'loop_band', 'Band underfoot · step back into a lunge', '/exercises/banded-reverse-lunge.jpg'),
  E('d0000065-0000-4000-8000-000000000000', 'Banded Crab Walk', 'Glutes', 'loop_band', 'Band at the ankles · stay low · step sideways', '/exercises/crab-walk.jpg', ['physical-therapy', 'hip', 'stage-3', 'weight-bearing']),
  E('d0000066-0000-4000-8000-000000000000', 'Banded Glute March', 'Glutes', 'loop_band', 'Bridge up · march the knees against the band', '/exercises/glute-march.jpg', ['physical-therapy', 'hip', 'stage-2', 'seated-lying']),
  E('d0000067-0000-4000-8000-000000000000', 'Banded Squat Jump', 'Legs', 'loop_band', 'Band above the knees · squat and explode up', '/exercises/squat-jump.jpg'),

  // ===== Isometric (15) =====
  E('77777777-7777-4777-8777-777777777777', 'Wall Sit', 'Legs', 'calisthenics', '90° knees · brace · log seconds held', '/exercises/wall-sit.jpg'),
  E('a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1', 'Plank', 'Core', 'calisthenics', 'Ribs down · glutes tight · log seconds held', '/exercises/plank.jpg', ['physical-therapy', 'low-back', 'stage-2']),
  E('a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2', 'Glute Bridge Hold', 'Glutes', 'calisthenics', 'Posterior tilt · squeeze at the top · log seconds', '/exercises/glute-bridge-hold.jpg', ['hip', 'stage-1']),
  E('d0000024-0000-4000-8000-000000000000', 'Side Plank', 'Obliques', 'calisthenics', 'Stack the hips · straight line · log seconds/side', '/exercises/side-plank.jpg'),
  E('d0000025-0000-4000-8000-000000000000', 'Hollow Body Hold', 'Core', 'calisthenics', 'Low back pressed down · arms & legs extended · log seconds', '/exercises/hollow-body-hold.jpg'),
  E('d0000026-0000-4000-8000-000000000000', 'Isometric Squat Hold', 'Legs', 'calisthenics', 'Thighs parallel · chest tall · log seconds held', '/exercises/iso-squat-hold.jpg'),
  E('d0000027-0000-4000-8000-000000000000', 'Superman Hold', 'Back', 'calisthenics', 'Face down · lift arms & legs · squeeze · log seconds', '/exercises/superman-hold.jpg', ['physical-therapy', 'low-back', 'stage-2', 'isometric']),
  E('d0000068-0000-4000-8000-000000000000', 'High Plank Hold', 'Shoulders', 'calisthenics', 'Hands under shoulders · body in a line · brace', '/exercises/high-plank-hold.jpg'),
  E('d0000069-0000-4000-8000-000000000000', 'Reverse Plank Hold', 'Glutes', 'calisthenics', 'Hips up · squeeze the glutes · long line', '/exercises/reverse-plank-hold.jpg'),
  E('d0000070-0000-4000-8000-000000000000', 'V-Sit Hold', 'Core', 'calisthenics', 'Balance on the sit bones · legs and chest up', '/exercises/v-sit-hold.jpg'),
  E('d0000071-0000-4000-8000-000000000000', 'Single-Leg Wall Sit', 'Legs', 'calisthenics', '90° on one leg · brace · log seconds/side', '/exercises/single-leg-wall-sit.jpg'),
  E('d0000072-0000-4000-8000-000000000000', 'Split Squat Hold', 'Legs', 'calisthenics', 'Hold the bottom of a split squat · stay tall', '/exercises/split-squat-hold.jpg'),
  E('d0000073-0000-4000-8000-000000000000', 'Single-Leg Glute Bridge Hold', 'Glutes', 'calisthenics', 'One leg extended · hips level · squeeze', '/exercises/single-leg-glute-bridge-hold.jpg'),
  E('d0000074-0000-4000-8000-000000000000', 'Boat Pose Hold', 'Core', 'calisthenics', 'Lift the chest and legs · long spine · hold', '/exercises/boat-pose-hold.jpg'),
  E('d0000075-0000-4000-8000-000000000000', 'Bird Dog Hold', 'Back', 'calisthenics', 'Opposite arm and leg extended · hips square', '/exercises/bird-dog-hold.jpg', ['physical-therapy', 'low-back', 'stage-2']),

  // ===== Stretch (13) =====
  E('88888888-8888-4888-8888-888888888888', 'Kneeling Hip Flexor Stretch', 'Hip Flexors', 'stretch', 'Tall posture · tuck the pelvis · hold 60s/side', '/exercises/hip-flexor-stretch.jpg', ['physical-therapy', 'hip', 'stage-2', 'stretch', 'mobility']),
  E('a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3', '90/90 Hip Stretch', 'Hips', 'stretch', 'Both knees 90° · sit tall · breathe into the stretch', '/exercises/90-90-hip-stretch.jpg', ['physical-therapy', 'hip', 'stage-1', 'stretch', 'mobility', 'seated-lying']),
  E('a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', 'Thoracic Opener', 'T-Spine', 'stretch', 'Open the top arm · follow with the eyes · slow', '/exercises/thoracic-opener.jpg', ['physical-therapy', 'upper-back', 'stage-1', 'stretch', 'mobility', 'seated-lying']),
  E('d0000028-0000-4000-8000-000000000000', "World's Greatest Stretch", 'Full Body', 'stretch', 'Lunge · drop the elbow inside · rotate open', '/exercises/worlds-greatest-stretch.jpg'),
  E('d0000029-0000-4000-8000-000000000000', 'Standing Forward Fold', 'Hamstrings', 'stretch', 'Soft knees · hinge over · let the head hang', '/exercises/forward-fold.jpg'),
  E('d0000030-0000-4000-8000-000000000000', 'Pigeon Pose', 'Glutes', 'stretch', 'Front shin forward · square the hips · sink down', '/exercises/pigeon-pose.jpg', ['physical-therapy', 'hip', 'stage-1', 'stretch', 'mobility', 'seated-lying']),
  E('d0000031-0000-4000-8000-000000000000', "Child's Pose", 'Back', 'stretch', 'Hips to heels · reach long · breathe into the back', '/exercises/childs-pose.jpg', ['physical-therapy', 'low-back', 'stage-1', 'stretch', 'mobility', 'seated-lying']),
  E('d0000076-0000-4000-8000-000000000000', 'Downward Dog', 'Full Body', 'stretch', 'Hips high · long spine · press the heels down', '/exercises/downward-dog.jpg'),
  E('d0000077-0000-4000-8000-000000000000', 'Cobra Stretch', 'Back', 'stretch', 'Press the chest up · relax the hips · open the front', '/exercises/cobra-stretch.jpg'),
  E('d0000078-0000-4000-8000-000000000000', 'Seated Hamstring Stretch', 'Hamstrings', 'stretch', 'Reach for the toes · long spine · breathe', '/exercises/seated-hamstring-stretch.jpg'),
  E('d0000079-0000-4000-8000-000000000000', 'Butterfly Stretch', 'Hips', 'stretch', 'Soles together · let the knees fall open', '/exercises/butterfly-stretch.jpg', ['physical-therapy', 'hip', 'stage-1', 'seated-lying']),
  E('d0000080-0000-4000-8000-000000000000', 'Standing Quad Stretch', 'Quads', 'stretch', 'Heel to glute · knees together · stand tall', '/exercises/quad-stretch.jpg'),
  E('d0000081-0000-4000-8000-000000000000', 'Lying Spinal Twist', 'Spine', 'stretch', 'Drop the knees across · shoulders down · breathe', '/exercises/spinal-twist.jpg', ['physical-therapy', 'low-back', 'stage-1', 'stretch', 'mobility', 'seated-lying']),

  // ===== Kettlebell (12) =====
  E('d0000082-0000-4000-8000-000000000000', 'KB Swing', 'Hamstrings', 'kettlebell', 'Hike the bell back · snap the hips · float to chest height', '/exercises/kb-swing.jpg'),
  E('d0000083-0000-4000-8000-000000000000', 'KB Goblet Squat', 'Legs', 'kettlebell', 'Bell at the chest · elbows inside knees · drive up', '/exercises/kb-goblet-squat.jpg'),
  E('d0000084-0000-4000-8000-000000000000', 'KB Clean', 'Full Body', 'kettlebell', 'Hike · pull the elbow in · catch soft in the rack', '/exercises/kb-clean.jpg'),
  E('d0000085-0000-4000-8000-000000000000', 'KB Clean & Press', 'Full Body', 'kettlebell', 'Clean to the rack · then press overhead to lockout · master it light first', '/exercises/kb-clean-press.jpg'),
  E('d0000086-0000-4000-8000-000000000000', 'KB Snatch', 'Full Body', 'kettlebell', 'One pull from the floor to overhead · punch through · master it light first', '/exercises/kb-snatch.jpg'),
  E('d0000087-0000-4000-8000-000000000000', 'KB Turkish Get-Up', 'Full Body', 'kettlebell', 'Bell locked overhead · stand up step by step · reverse · master it light first', '/exercises/kb-turkish-get-up.jpg'),
  E('d0000088-0000-4000-8000-000000000000', 'KB Halo', 'Shoulders', 'kettlebell', 'Circle the bell around the head · tight core · slow', '/exercises/kb-halo.jpg'),
  E('d0000089-0000-4000-8000-000000000000', 'KB Single-Arm Row', 'Back', 'kettlebell', 'Hinge over · row the bell to the hip · flat back', '/exercises/kb-single-arm-row.jpg'),
  E('d0000090-0000-4000-8000-000000000000', 'KB Front Rack Reverse Lunge', 'Legs', 'kettlebell', 'Bell in the rack · step back · drop the knee', '/exercises/kb-front-rack-lunge.jpg'),
  E('d0000091-0000-4000-8000-000000000000', 'KB Romanian Deadlift', 'Hamstrings', 'kettlebell', 'Hinge at the hips · soft knees · feel the stretch', '/exercises/kb-rdl.jpg'),
  E('d0000092-0000-4000-8000-000000000000', 'KB Overhead Press', 'Shoulders', 'kettlebell', 'Bell in the rack · brace · press to full lockout', '/exercises/kb-overhead-press.jpg'),
  E('d0000093-0000-4000-8000-000000000000', 'KB Windmill', 'Obliques', 'kettlebell', 'Bell locked overhead · hinge to the side · eyes on the bell', '/exercises/kb-windmill.jpg'),

  // ===== Pull-up Bar (12) =====
  E('d0000094-0000-4000-8000-000000000000', 'Pull-Up', 'Back', 'pullup_bar', 'Overhand grip · pull the chest to the bar · control down', '/exercises/pull-up.jpg'),
  E('d0000095-0000-4000-8000-000000000000', 'Chin-Up', 'Back', 'pullup_bar', 'Underhand grip · drive the elbows down · squeeze', '/exercises/chin-up.jpg'),
  E('d0000096-0000-4000-8000-000000000000', 'Neutral-Grip Pull-Up', 'Back', 'pullup_bar', 'Palms facing · pull to the bar · full hang at the bottom', '/exercises/neutral-grip-pull-up.jpg'),
  E('d0000097-0000-4000-8000-000000000000', 'Wide-Grip Pull-Up', 'Back', 'pullup_bar', 'Wide overhand grip · lead with the chest', '/exercises/wide-grip-pull-up.jpg'),
  E('d0000098-0000-4000-8000-000000000000', 'Hanging Knee Raise', 'Core', 'pullup_bar', 'Dead hang · curl the knees to the chest · no swing', '/exercises/hanging-knee-raise.jpg'),
  E('d0000099-0000-4000-8000-000000000000', 'Hanging Leg Raise', 'Core', 'pullup_bar', 'Dead hang · raise straight legs to parallel · control', '/exercises/hanging-leg-raise.jpg'),
  E('d0000100-0000-4000-8000-000000000000', 'Toes-to-Bar', 'Core', 'pullup_bar', 'Hang · drive the toes up to touch the bar', '/exercises/toes-to-bar.jpg'),
  E('d0000101-0000-4000-8000-000000000000', 'Scapular Pull-Up', 'Back', 'pullup_bar', 'Straight arms · pull the shoulders down · small range', '/exercises/scapular-pull-up.jpg', ['physical-therapy', 'upper-back', 'stage-3']),
  E('d0000102-0000-4000-8000-000000000000', 'Negative Pull-Up', 'Back', 'pullup_bar', 'Start at the top · lower slowly under control', '/exercises/negative-pull-up.jpg'),
  E('d0000103-0000-4000-8000-000000000000', 'Commando Pull-Up', 'Back', 'pullup_bar', 'Grip in line · pull to one side then the other', '/exercises/commando-pull-up.jpg'),
  E('d0000104-0000-4000-8000-000000000000', 'Dead Hang', 'Grip', 'pullup_bar', 'Relax the shoulders · hang · log seconds held', '/exercises/dead-hang.jpg'),
  E('d0000105-0000-4000-8000-000000000000', 'Active Hang', 'Shoulders', 'pullup_bar', 'Shoulders pulled down and back · hold · log seconds', '/exercises/active-hang.jpg'),

  // ===== Medicine Ball (12) =====
  E('d0000106-0000-4000-8000-000000000000', 'Med Ball Slam', 'Full Body', 'medicine_ball', 'Reach tall · slam the ball down hard · catch the bounce · skip if low-back pain', '/exercises/med-ball-slam.jpg'),
  E('d0000107-0000-4000-8000-000000000000', 'Med Ball Chest Pass', 'Chest', 'medicine_ball', 'Explode the ball off the chest · catch and reset', '/exercises/med-ball-chest-pass.jpg'),
  E('d0000108-0000-4000-8000-000000000000', 'Med Ball Russian Twist', 'Obliques', 'medicine_ball', 'Lean back · rotate the ball side to side', '/exercises/med-ball-russian-twist.jpg'),
  E('d0000109-0000-4000-8000-000000000000', 'Med Ball V-Up', 'Core', 'medicine_ball', 'Ball overhead · lift legs and arms to meet · slow down', '/exercises/med-ball-v-up.jpg'),
  E('d0000110-0000-4000-8000-000000000000', 'Med Ball Squat to Press', 'Full Body', 'medicine_ball', 'Squat · drive up and press the ball overhead', '/exercises/med-ball-squat-press.jpg'),
  E('d0000111-0000-4000-8000-000000000000', 'Med Ball Overhead Slam', 'Full Body', 'medicine_ball', 'Ball overhead · slam straight down · brace the core · skip if low-back pain', '/exercises/med-ball-overhead-slam.jpg'),
  E('d0000112-0000-4000-8000-000000000000', 'Med Ball Sit-Up Throw', 'Core', 'medicine_ball', 'Sit up and throw · catch on the way down', '/exercises/med-ball-situp-throw.jpg'),
  E('d0000113-0000-4000-8000-000000000000', 'Med Ball Lunge with Twist', 'Legs', 'medicine_ball', 'Lunge · rotate the ball over the front leg', '/exercises/med-ball-lunge-twist.jpg'),
  E('d0000114-0000-4000-8000-000000000000', 'Med Ball Wood Chop', 'Obliques', 'medicine_ball', 'Chop the ball diagonally across the body', '/exercises/med-ball-wood-chop.jpg'),
  E('d0000115-0000-4000-8000-000000000000', 'Med Ball Push-Up', 'Chest', 'medicine_ball', 'One hand on the ball · lower under control · press up', '/exercises/med-ball-pushup.jpg'),
  E('d0000116-0000-4000-8000-000000000000', 'Med Ball Rotational Throw', 'Obliques', 'medicine_ball', 'Rotate and throw to the side · explosive', '/exercises/med-ball-rotational-throw.jpg'),
  E('d0000117-0000-4000-8000-000000000000', 'Med Ball Dead Bug', 'Core', 'medicine_ball', 'Press the ball up · lower opposite arm and leg', '/exercises/med-ball-dead-bug.jpg'),

  // ===== Jump Rope (12) =====
  E('d0000118-0000-4000-8000-000000000000', 'Basic Bounce', 'Conditioning', 'jump_rope', 'Light bounce on the balls of the feet · wrists turn the rope', '/exercises/basic-bounce.jpg'),
  E('d0000119-0000-4000-8000-000000000000', 'Alternate-Foot Step', 'Conditioning', 'jump_rope', 'Jog in place over the rope · stay light', '/exercises/alternate-foot-step.jpg'),
  E('d0000120-0000-4000-8000-000000000000', 'High Knees Skip', 'Conditioning', 'jump_rope', 'Drive the knees up with each turn · fast feet', '/exercises/high-knees-skip.jpg'),
  E('d0000121-0000-4000-8000-000000000000', 'Boxer Skip', 'Conditioning', 'jump_rope', 'Shift weight side to side · easy rhythm', '/exercises/boxer-skip.jpg'),
  E('d0000122-0000-4000-8000-000000000000', 'Double-Unders', 'Conditioning', 'jump_rope', 'Two rope passes per jump · snap the wrists', '/exercises/double-unders.jpg'),
  E('d0000123-0000-4000-8000-000000000000', 'Single-Leg Hops', 'Conditioning', 'jump_rope', 'Hop on one foot · switch sides · stay controlled', '/exercises/single-leg-hops.jpg'),
  E('d0000124-0000-4000-8000-000000000000', 'Criss-Cross', 'Conditioning', 'jump_rope', 'Cross the arms on the down-swing · open and repeat', '/exercises/criss-cross.jpg'),
  E('d0000125-0000-4000-8000-000000000000', 'Side-to-Side', 'Conditioning', 'jump_rope', 'Small hops side to side over the rope', '/exercises/side-to-side.jpg'),
  E('d0000126-0000-4000-8000-000000000000', 'Heel Taps', 'Conditioning', 'jump_rope', 'Tap alternating heels forward with each jump', '/exercises/heel-taps.jpg'),
  E('d0000127-0000-4000-8000-000000000000', 'Speed Intervals', 'Conditioning', 'jump_rope', 'Fast as possible for the work window · then rest', '/exercises/speed-intervals.jpg'),
  E('d0000128-0000-4000-8000-000000000000', 'Backwards Jump', 'Conditioning', 'jump_rope', 'Turn the rope backward · stay relaxed', '/exercises/backwards-jump.jpg'),
  E('d0000129-0000-4000-8000-000000000000', 'Mummy Kicks', 'Conditioning', 'jump_rope', 'Alternate straight-leg kicks out front · light bounce', '/exercises/mummy-kicks.jpg'),

  // ===== Calisthenics — bodyweight (20) =====
  E('d0000130-0000-4000-8000-000000000000', 'Push-Up', 'Chest', 'calisthenics', 'Hands under the shoulders · lower the chest · press up', '/exercises/push-up.jpg'),
  E('d0000131-0000-4000-8000-000000000000', 'Wide Push-Up', 'Chest', 'calisthenics', 'Hands wider than the shoulders · elbows out · press up', '/exercises/wide-push-up.jpg'),
  E('d0000132-0000-4000-8000-000000000000', 'Diamond Push-Up', 'Triceps', 'calisthenics', 'Hands together under the chest · elbows tight · press', '/exercises/diamond-push-up.jpg'),
  E('d0000133-0000-4000-8000-000000000000', 'Pike Push-Up', 'Shoulders', 'calisthenics', 'Hips high · lower the head toward the floor · press up', '/exercises/pike-push-up.jpg'),
  E('d0000134-0000-4000-8000-000000000000', 'Wall Push-Up', 'Chest', 'calisthenics', 'Hands on the wall · lean in · press back · easy variation', '/exercises/wall-push-up.jpg'),
  E('d0000135-0000-4000-8000-000000000000', 'Bodyweight Squat', 'Legs', 'calisthenics', 'Feet shoulder-width · sit back · drive up tall', '/exercises/bodyweight-squat.jpg'),
  E('d0000136-0000-4000-8000-000000000000', 'Jump Squat', 'Legs', 'calisthenics', 'Squat down · explode up · land soft', '/exercises/jump-squat.jpg'),
  E('d0000137-0000-4000-8000-000000000000', 'Bodyweight Lunge', 'Legs', 'calisthenics', 'Step forward · drop the back knee · drive up', '/exercises/bodyweight-lunge.jpg'),
  E('d0000138-0000-4000-8000-000000000000', 'Bodyweight Reverse Lunge', 'Legs', 'calisthenics', 'Step back · drop the back knee · drive through the front heel', '/exercises/bodyweight-reverse-lunge.jpg'),
  E('d0000139-0000-4000-8000-000000000000', 'Glute Bridge', 'Glutes', 'calisthenics', 'Drive through the heels · squeeze at the top', '/exercises/bw-glute-bridge.jpg'),
  E('d0000140-0000-4000-8000-000000000000', 'Single-Leg Glute Bridge', 'Glutes', 'calisthenics', 'One leg extended · hips level · squeeze · per side', '/exercises/single-leg-glute-bridge.jpg', ['hip', 'stage-3']),
  E('d0000141-0000-4000-8000-000000000000', 'Calf Raise', 'Calves', 'calisthenics', 'Rise onto the toes · pause · lower slow', '/exercises/bw-calf-raise.jpg'),
  E('d0000142-0000-4000-8000-000000000000', 'Mountain Climbers', 'Core', 'calisthenics', 'High plank · drive the knees in fast · hips low', '/exercises/mountain-climbers.jpg'),
  E('d0000143-0000-4000-8000-000000000000', 'Burpee', 'Full Body', 'calisthenics', 'Squat · kick back · push-up · jump up', '/exercises/burpee.jpg'),
  E('d0000144-0000-4000-8000-000000000000', 'Bicycle Crunch', 'Obliques', 'calisthenics', 'Opposite elbow to knee · slow rotation', '/exercises/bicycle-crunch.jpg'),
  E('d0000145-0000-4000-8000-000000000000', 'Sit-Up', 'Core', 'calisthenics', 'Hands light · curl all the way up · control down', '/exercises/sit-up.jpg'),
  E('d0000146-0000-4000-8000-000000000000', 'Lying Leg Raise', 'Core', 'calisthenics', 'Legs straight · lift to vertical · lower slow · no arch', '/exercises/lying-leg-raise.jpg'),
  E('d0000147-0000-4000-8000-000000000000', 'Flutter Kicks', 'Core', 'calisthenics', 'Legs straight · small fast alternating kicks · low back down', '/exercises/flutter-kicks.jpg'),
  E('d0000148-0000-4000-8000-000000000000', 'Bear Crawl', 'Full Body', 'calisthenics', 'On hands and toes · knees hovering · crawl forward', '/exercises/bear-crawl.jpg'),
  E('d0000149-0000-4000-8000-000000000000', 'Inchworm', 'Full Body', 'calisthenics', 'Hinge · walk the hands out to a plank · walk back', '/exercises/inchworm.jpg'),

  // ===== Knee rehab — post knee-replacement (20) =====
  // Standard movements from knee-replacement rehab, staged early → strengthening.
  // NOTE: a few need a sturdy chair or a low step — the only place the library's
  // "no benches/boxes/chairs" rule bends, because sit-to-stand and step-ups are
  // core to getting a knee working again. Classified as bodyweight.
  // Deliberately NO kneeling movements — kneeling on a replaced knee isn't
  // appropriate, certainly not early.

  // Stage 1 — off the feet: activate, protect, win back range
  E('e0000201-0000-4000-8000-000000000000', 'Ankle Pumps', 'Calves', 'calisthenics', 'Lie back · flex and point the foot slowly · keeps the blood moving', '/exercises/ankle-pumps.jpg', ['physical-therapy', 'knee', 'stage-1', 'low-impact', 'seated-lying']),
  E('e0000202-0000-4000-8000-000000000000', 'Quad Set', 'Quads', 'calisthenics', 'Leg straight · press the back of the knee down · squeeze the thigh 5s', '/exercises/quad-set.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-extension', 'isometric', 'seated-lying']),
  E('e0000203-0000-4000-8000-000000000000', 'Glute Set', 'Glutes', 'calisthenics', 'Lie back · squeeze the glutes together · hold 5s · relax', '/exercises/glute-set.jpg', ['physical-therapy', 'knee', 'hip', 'stage-1', 'isometric', 'seated-lying']),
  E('e0000204-0000-4000-8000-000000000000', 'Heel Slide', 'Quads', 'calisthenics', 'Lie back · slide the heel toward the glute · hold the bend · slide back', '/exercises/heel-slide.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-flexion', 'seated-lying', 'mobility']),
  E('e0000205-0000-4000-8000-000000000000', 'Short Arc Quad', 'Quads', 'calisthenics', 'Rolled towel under the knee · straighten the lower leg · hold 3s · lower', '/exercises/short-arc-quad.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-extension', 'seated-lying']),
  E('e0000206-0000-4000-8000-000000000000', 'Straight Leg Raise', 'Quads', 'calisthenics', 'Knee locked straight · lift to the other thigh · lower slow', '/exercises/straight-leg-raise.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-extension', 'strength', 'seated-lying']),
  E('e0000207-0000-4000-8000-000000000000', 'Seated Heel Drag', 'Hamstrings', 'calisthenics', 'Sit tall · drag the heel back under the chair · hold the bend', '/exercises/seated-heel-drag.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-flexion', 'seated-lying', 'mobility']),
  E('e0000208-0000-4000-8000-000000000000', 'Prone Knee Hang', 'Quads', 'calisthenics', 'Face down, shins off the edge · let gravity straighten the knee', '/exercises/prone-knee-hang.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-extension', 'seated-lying', 'mobility']),

  // Range work — hold and breathe
  E('e0000209-0000-4000-8000-000000000000', 'Heel Prop Stretch', 'Quads', 'stretch', 'Heel on a rolled towel · let the knee sink straight · relax 2–3 min', '/exercises/heel-prop-stretch.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-extension', 'stretch', 'mobility', 'seated-lying']),
  E('e0000210-0000-4000-8000-000000000000', 'Seated Knee Flexion Stretch', 'Hamstrings', 'stretch', 'Foot planted · slide the hips forward · hold the deepest comfortable bend', '/exercises/seated-knee-flexion-stretch.jpg', ['physical-therapy', 'knee', 'stage-1', 'knee-flexion', 'stretch', 'mobility', 'seated-lying']),
  E('e0000211-0000-4000-8000-000000000000', 'Standing Calf Stretch', 'Calves', 'stretch', 'Hands on the wall · back leg straight · heel stays down · hold', '/exercises/standing-calf-stretch.jpg', ['physical-therapy', 'knee', 'stage-2', 'stretch', 'mobility', 'weight-bearing']),

  // Stage 2 — on the feet: load it, control it
  E('e0000212-0000-4000-8000-000000000000', 'Long Arc Quad', 'Quads', 'calisthenics', 'Sit tall · straighten the knee fully · hold 3s at the top · lower slow', '/exercises/long-arc-quad.jpg', ['physical-therapy', 'knee', 'stage-2', 'knee-extension', 'strength', 'seated-lying']),
  E('e0000213-0000-4000-8000-000000000000', 'Standing Hamstring Curl', 'Hamstrings', 'calisthenics', 'Hold support · bend the knee, heel toward the glute · lower controlled', '/exercises/standing-hamstring-curl.jpg', ['physical-therapy', 'knee', 'stage-2', 'knee-flexion', 'strength', 'weight-bearing']),
  E('e0000214-0000-4000-8000-000000000000', 'Wall Slide Mini Squat', 'Quads', 'calisthenics', 'Back on the wall · slide to a shallow bend · drive up through the heels · knees track over the toes', '/exercises/wall-slide-mini-squat.jpg', ['physical-therapy', 'knee', 'stage-2', 'knee-flexion', 'strength', 'weight-bearing']),
  E('e0000215-0000-4000-8000-000000000000', 'Sit-to-Stand', 'Quads', 'calisthenics', 'Sturdy chair · nose over toes · stand without hands if you can · sit down slow', '/exercises/sit-to-stand.jpg', ['physical-therapy', 'knee', 'stage-2', 'strength', 'weight-bearing']),
  E('e0000216-0000-4000-8000-000000000000', 'Terminal Knee Extension', 'Quads', 'tube_band', 'Band behind the knee · straighten against the tension · squeeze the quad', '/exercises/terminal-knee-extension.jpg', ['physical-therapy', 'knee', 'stage-2', 'knee-extension', 'strength', 'weight-bearing']),
  E('e0000217-0000-4000-8000-000000000000', 'Standing Marching', 'Hip Flexors', 'calisthenics', 'Hold support · lift the knee to hip height · slow and tall', '/exercises/standing-marching.jpg', ['physical-therapy', 'knee', 'hip', 'stage-2', 'balance', 'stability', 'weight-bearing']),

  // Stage 3 — rebuild strength and confidence
  E('e0000218-0000-4000-8000-000000000000', 'Step-Up', 'Quads', 'calisthenics', 'Low step · drive through the whole foot · step down with control · knee tracks over the toes', '/exercises/step-up.jpg', ['physical-therapy', 'knee', 'stage-3', 'strength', 'weight-bearing']),
  E('e0000219-0000-4000-8000-000000000000', 'Single-Leg Balance', 'Full Body', 'calisthenics', 'Stand on one leg near support · eyes forward · build toward 30s', '/exercises/single-leg-balance.jpg', ['physical-therapy', 'knee', 'stage-3', 'balance', 'stability', 'weight-bearing']),
  E('e0000220-0000-4000-8000-000000000000', 'Lateral Step-Down', 'Quads', 'calisthenics', 'On a low step · lower the free heel slowly to the floor · drive back up', '/exercises/lateral-step-down.jpg', ['physical-therapy', 'knee', 'stage-3', 'strength', 'knee-flexion', 'weight-bearing']),

  // ===== Coverage additions — general library (17) =====
  // From the personal-trainer + physical-therapist audit: close the pattern and
  // muscle-group gaps for a general population — carries, grip, unilateral
  // calves, hip work, upper-back thinness, low-impact cardio, and prehab drills.
  // image_url null → equipment-icon fallback until illustrations are generated.

  // Carry — the library had exactly one loaded carry before these.
  E('d0000150-0000-4000-8000-000000000000', 'KB Suitcase Carry', 'Grip', 'kettlebell', 'One kettlebell at your side · stand tall · walk without leaning', null, ['strength']),
  E('d0000151-0000-4000-8000-000000000000', 'KB Farmer Hold', 'Grip', 'kettlebell', 'Kettlebells at your sides · shoulders packed · stand tall and hold · log seconds', null, ['strength', 'isometric']),
  E('d0000152-0000-4000-8000-000000000000', 'DB Overhead Carry', 'Full Body', 'dumbbell', 'Dumbbell locked overhead · ribs down · walk tall without leaning', null, ['strength', 'stability']),
  // Calves — unilateral was missing at both bodyweight and load. The bodyweight
  // one doubles as ankle-rehab stage 2.
  E('d0000153-0000-4000-8000-000000000000', 'Single-Leg Calf Raise', 'Calves', 'calisthenics', 'Balance on one foot near support · rise onto the toes · lower slow · switch sides', null, ['strength', 'balance', 'physical-therapy', 'ankle', 'stage-2', 'weight-bearing']),
  E('d0000154-0000-4000-8000-000000000000', 'DB Single-Leg Calf Raise', 'Calves', 'dumbbell', 'One dumbbell in hand · balance on one foot · full stretch and drive tall', null, ['strength', 'balance']),
  // Split squat had only an isometric hold — this is the loadable rep version.
  E('d0000155-0000-4000-8000-000000000000', 'DB Split Squat', 'Legs', 'dumbbell', 'Stagger your stance · drop the back knee straight down · drive up through the front heel', null, ['strength']),
  // Hip flexors + hips had no general-population strength/stability work.
  E('d0000156-0000-4000-8000-000000000000', 'Standing Banded Hip Flexion', 'Hip Flexors', 'loop_band', 'Band around the ankle · drive the knee up against the tension · lower with control', null, ['strength', 'physical-therapy', 'hip', 'stage-2', 'weight-bearing']),
  E('d0000157-0000-4000-8000-000000000000', 'Standing Hip Circles', 'Hips', 'calisthenics', 'Hold support if needed · circle the knee out, up, and around · slow and controlled', null, ['mobility', 'physical-therapy', 'hip', 'stage-2', 'weight-bearing']),
  E('d0000158-0000-4000-8000-000000000000', 'Standing Banded Hip External Rotation', 'Hips', 'loop_band', 'Band above the knees · half-squat stance · rotate the knee out and back against the band', null, ['strength', 'stability', 'physical-therapy', 'hip', 'stage-3', 'weight-bearing']),
  // Traps had one entry; give it a second, lighter equipment option.
  E('d0000159-0000-4000-8000-000000000000', 'Band Shrug', 'Traps', 'tube_band', 'Stand on the band · shrug straight up against the tension · pause · control down', null, ['strength', 'physical-therapy', 'upper-back', 'stage-2', 'weight-bearing']),
  // Spine + T-Spine had one static entry each — add the dynamic counterparts.
  E('d0000160-0000-4000-8000-000000000000', 'Cat-Cow', 'Spine', 'calisthenics', 'On all fours · round the spine up · then arch and look up · flow slow', null, ['mobility', 'physical-therapy', 'low-back', 'stage-1']),
  E('d0000161-0000-4000-8000-000000000000', 'Quadruped Thoracic Rotation', 'T-Spine', 'calisthenics', 'Hand behind the head · rotate the elbow up and open · follow with the eyes', null, ['mobility', 'physical-therapy', 'upper-back', 'stage-1']),
  E('d0000162-0000-4000-8000-000000000000', 'DB Single-Arm Rear-Delt Fly', 'Rear Delts', 'dumbbell', 'One dumbbell · hinge over · raise the arm out to the side · squeeze the back', null, ['strength', 'physical-therapy', 'upper-back', 'stage-3']),
  // Prehab / safer patterning — teach the movement before loading it.
  E('d0000163-0000-4000-8000-000000000000', 'Standing Hip Flexor Stretch', 'Hip Flexors', 'stretch', 'Split stance, back heel lifted · tuck the pelvis · lean forward gently, no kneeling', null, ['mobility', 'stretch', 'physical-therapy', 'knee', 'hip', 'stage-2', 'weight-bearing']),
  E('d0000164-0000-4000-8000-000000000000', 'Bodyweight Hip Hinge', 'Hamstrings', 'calisthenics', 'Hands on the hips · push the hips back, flat back · stop at the stretch · stand tall', null, ['mobility', 'stability', 'physical-therapy', 'low-back', 'stage-2', 'weight-bearing']),
  E('d0000165-0000-4000-8000-000000000000', 'Dead Bug', 'Core', 'calisthenics', 'On your back, arms and knees up · lower one arm and the opposite leg · press the low back down · alternate', null, ['stability', 'physical-therapy', 'low-back', 'stage-1', 'seated-lying']),
  // Low-impact conditioning — the first non-jump-rope cardio in the library.
  E('d0000166-0000-4000-8000-000000000000', 'Standing March in Place', 'Conditioning', 'calisthenics', 'Stand tall · march the knees up at an easy pace · swing the arms · stay light', null, ['low-impact']),
  E('d0000167-0000-4000-8000-000000000000', 'Step Touch', 'Conditioning', 'calisthenics', 'Step side to side, tap the trailing foot · add an arm swing · stay light on the feet', null, ['low-impact']),
  // Loaded stage-3 hamstring curl — from Heath Mann DPT's knee HEP. The existing
  // Standing Hamstring Curl is bodyweight/stage-2; this adds the resisted version.
  E('d0000168-0000-4000-8000-000000000000', 'Band Standing Hamstring Curl', 'Hamstrings', 'tube_band', 'Loop the band at one ankle, stand on the other end · hold support · curl the heel to the glute · lower slow', null, ['physical-therapy', 'knee', 'stage-3', 'knee-flexion', 'strength', 'weight-bearing']),
  // From the HEP's "Lunges – Pad". Dino signed off with Heath's context: a light
  // towel graze for depth cueing, NOT resting weight on the knee (distinct from
  // the section's excluded sustained-kneeling movements).
  E('d0000169-0000-4000-8000-000000000000', 'Reverse Lunge to Towel Tap', 'Quads', 'calisthenics', 'Fold a towel behind you · step back, lower until the back knee lightly grazes it · don’t rest weight on it · drive through the front heel', null, ['physical-therapy', 'knee', 'stage-3', 'knee-flexion', 'strength', 'weight-bearing']),

  // ===== Shoulder rehab — rotator-cuff / impingement / scapular (12) =====
  // The library had 14 shoulder moves, all presses/raises and zero cuff work.
  // Staged early → strengthening, same arc as the knee section. General movements
  // for information only — see REHAB_DISCLAIMER; not a prescription.

  // Stage 1 — pain-free, passive/isometric, little to no range
  E('f0000301-0000-4000-8000-000000000000', 'Pendulum Swing', 'Shoulders', 'calisthenics', 'Lean on a chair for support · let the arm hang loose · swing small gentle circles', null, ['physical-therapy', 'shoulder', 'stage-1', 'mobility']),
  E('f0000302-0000-4000-8000-000000000000', 'Isometric Shoulder Flexion', 'Shoulders', 'calisthenics', 'Fist against the wall at waist height · press forward gently · hold, no arm movement', null, ['physical-therapy', 'shoulder', 'stage-1', 'isometric', 'stability']),
  E('f0000303-0000-4000-8000-000000000000', 'Isometric External Rotation', 'Shoulders', 'calisthenics', 'Elbow tucked at your side, back of the hand on the wall · press outward gently · hold', null, ['physical-therapy', 'shoulder', 'stage-1', 'isometric', 'stability']),
  E('f0000304-0000-4000-8000-000000000000', 'Supine Assisted Shoulder Flexion', 'Shoulders', 'calisthenics', 'On your back · use the good arm to lift the sore arm overhead, pain-free range · lower slow', null, ['physical-therapy', 'shoulder', 'stage-1', 'mobility', 'stretch', 'seated-lying']),

  // Stage 2 — standing, active range, light band resistance
  E('f0000305-0000-4000-8000-000000000000', 'Scapular Retraction Squeeze', 'Rear Delts', 'calisthenics', 'Stand tall · pull the shoulder blades together and down · hold 5s · relax', null, ['physical-therapy', 'shoulder', 'upper-back', 'stage-2', 'isometric', 'stability']),
  E('f0000306-0000-4000-8000-000000000000', 'Band External Rotation', 'Rear Delts', 'tube_band', 'Anchor at elbow height · elbow pinned to the side · rotate the forearm out slowly', null, ['physical-therapy', 'shoulder', 'stage-2', 'strength', 'stability']),
  E('f0000307-0000-4000-8000-000000000000', 'Band Internal Rotation', 'Shoulders', 'tube_band', 'Anchor at elbow height · elbow pinned to the side · rotate the forearm in slowly', null, ['physical-therapy', 'shoulder', 'stage-2', 'strength', 'stability']),
  E('f0000308-0000-4000-8000-000000000000', 'Wall Walk', 'Shoulders', 'calisthenics', 'Fingers on the wall · walk them up as high as pain-free · walk back down', null, ['physical-therapy', 'shoulder', 'stage-2', 'mobility']),
  E('f0000309-0000-4000-8000-000000000000', 'Wall Push-Up Plus', 'Shoulders', 'calisthenics', 'Hands on the wall, arms straight · push through the blades to round the upper back · relax', null, ['physical-therapy', 'shoulder', 'upper-back', 'stage-2', 'strength', 'stability']),

  // Stage 3 — loaded, functional strengthening
  E('f0000310-0000-4000-8000-000000000000', 'Band Scaption Raise', 'Shoulders', 'tube_band', 'Stand on the band · raise the arms to a Y at 30°, thumbs up · control down', null, ['physical-therapy', 'shoulder', 'stage-3', 'strength']),
  E('f0000311-0000-4000-8000-000000000000', 'Prone I-Y-T Raise', 'Rear Delts', 'calisthenics', 'Face down · arms overhead · lift in an I, then Y, then T · squeeze the blades · lower slow', null, ['physical-therapy', 'shoulder', 'upper-back', 'stage-3', 'strength', 'stability']),
  E('f0000312-0000-4000-8000-000000000000', 'Side-Lying External Rotation', 'Shoulders', 'dumbbell', 'On your side, elbow tucked to the ribs · rotate the dumbbell up · slow control down', null, ['physical-therapy', 'shoulder', 'stage-3', 'strength']),

  // ===== Ankle rehab — post-sprain strength / balance / range (7) =====
  // Ankle sprain is one of the most common general-population injuries and the
  // library had no rehab arc for it. (Single-Leg Calf Raise above also serves
  // the ankle area, stage 2.) Staged, same as knee/shoulder. Information only.

  // Stage 1 — off the foot, range + isometric
  E('f0000401-0000-4000-8000-000000000000', 'Seated Ankle Circles', 'Calves', 'calisthenics', 'Seated, lift the foot · draw slow circles each direction · both ways', null, ['physical-therapy', 'ankle', 'stage-1', 'mobility', 'seated-lying']),
  E('f0000402-0000-4000-8000-000000000000', 'Seated Resisted Ankle Eversion', 'Calves', 'loop_band', 'Seated, band around the forefoot · roll the foot outward against the band · control back', null, ['physical-therapy', 'ankle', 'stage-1', 'strength', 'seated-lying']),
  E('f0000403-0000-4000-8000-000000000000', 'Seated Resisted Ankle Inversion', 'Calves', 'loop_band', 'Seated, band around the forefoot · roll the foot inward against the band · control back', null, ['physical-therapy', 'ankle', 'stage-1', 'strength', 'seated-lying']),

  // Stage 2 — standing, weight-bearing balance
  E('f0000404-0000-4000-8000-000000000000', 'Heel-to-Toe Walk', 'Calves', 'calisthenics', 'Walk a straight line, heel touching toe each step · arms out for balance', null, ['physical-therapy', 'ankle', 'stage-2', 'balance', 'weight-bearing']),

  // Stage 3 — loaded / dynamic, return to activity
  E('f0000405-0000-4000-8000-000000000000', 'Single-Leg Eccentric Heel Drop', 'Calves', 'calisthenics', 'Low step, heel off the edge · rise on one foot · lower the heel below the step slowly', null, ['physical-therapy', 'ankle', 'stage-3', 'strength', 'weight-bearing']),
  E('f0000406-0000-4000-8000-000000000000', 'Lateral Hop-and-Stick', 'Calves', 'calisthenics', 'Small hop sideways · land soft and hold · stick the landing before the next hop', null, ['physical-therapy', 'ankle', 'stage-3', 'balance', 'weight-bearing']),
  E('f0000407-0000-4000-8000-000000000000', 'Single-Leg Balance with Reach', 'Full Body', 'calisthenics', 'Stand on one leg · reach the free foot forward, side, and back, tapping lightly · stay balanced', null, ['physical-therapy', 'ankle', 'stage-3', 'balance', 'stability', 'weight-bearing']),

  // ===== Gym equipment (43) — stationary bike, treadmill, stair climber, rowing
  // machine, elliptical, barbell, cable machine, leg press, lat pulldown. From
  // the trainer's spec — the machine/free-weight tier the builder didn't have
  // yet. image_url null → equipment-icon fallback until illustrations exist.

  // ----- Stationary Bike (3) -----
  E('c0000501-0000-4000-8000-000000000000', 'Bike Steady-State Ride', 'Conditioning', 'stationary_bike', 'Set a moderate resistance · hold a pace you can sustain the whole time · steady breathing', null, ['low-impact']),
  E('c0000502-0000-4000-8000-000000000000', 'Bike Sprint Intervals', 'Conditioning', 'stationary_bike', 'Alternate 20-30s all-out effort with 60-90s easy spin · repeat for the set', null, ['low-impact']),
  E('c0000503-0000-4000-8000-000000000000', 'Bike Hill Climb', 'Conditioning', 'stationary_bike', 'Increase resistance every minute · stay seated or rise out of the saddle · grind through', null, ['low-impact', 'strength']),

  // ----- Treadmill (3) -----
  E('c0000504-0000-4000-8000-000000000000', 'Treadmill Brisk Walk', 'Conditioning', 'treadmill', 'Flat or slight incline · quick walking pace · arms swinging · log minutes', null, ['low-impact', 'weight-bearing']),
  E('c0000505-0000-4000-8000-000000000000', 'Treadmill Jog/Run Intervals', 'Conditioning', 'treadmill', 'Alternate a hard running pace with an easy jog/walk recovery · repeat for the set', null, ['weight-bearing']),
  E('c0000506-0000-4000-8000-000000000000', 'Treadmill Incline Walk', 'Conditioning', 'treadmill', "Raise the incline · steady brisk pace · lean into the hill, don't hold the rails", null, ['weight-bearing']),

  // ----- Stair Climber (2) -----
  E('c0000507-0000-4000-8000-000000000000', 'Stair Climber Steady Climb', 'Conditioning', 'stair_climber', "Set a sustainable step rate · stand tall, don't lean on the rails · log minutes", null, ['weight-bearing']),
  E('c0000508-0000-4000-8000-000000000000', 'Stair Climber Intervals', 'Conditioning', 'stair_climber', 'Alternate a fast climb with an easy-pace recovery · repeat for the set', null, ['weight-bearing']),

  // ----- Rowing Machine (3) -----
  E('c0000509-0000-4000-8000-000000000000', 'Row Steady-State', 'Conditioning', 'rowing_machine', 'Legs-hips-arms drive, arms-hips-legs return · smooth steady pace · log minutes/meters', null, ['low-impact']),
  E('c0000510-0000-4000-8000-000000000000', 'Row Sprint Intervals', 'Conditioning', 'rowing_machine', '500m or 60s hard pulls · rest to recover · repeat for the set', null, ['low-impact']),
  E('c0000511-0000-4000-8000-000000000000', 'Rowing Machine Pull (Strength Pace)', 'Back', 'rowing_machine', 'Slow controlled pulls · drive with the legs first · squeeze the shoulder blades at the finish', null, ['strength']),

  // ----- Elliptical (2) -----
  E('c0000512-0000-4000-8000-000000000000', 'Elliptical Steady-State', 'Conditioning', 'elliptical', 'Smooth continuous stride · even resistance · log minutes', null, ['low-impact']),
  E('c0000513-0000-4000-8000-000000000000', 'Elliptical Intervals', 'Conditioning', 'elliptical', 'Push the pace/resistance for 30-60s · ease off to recover · repeat', null, ['low-impact']),

  // ----- Barbell (11) — Smith machine folded in; rack access bundled with the
  // equipment value; all avoid a bench.
  E('c0000514-0000-4000-8000-000000000000', 'Barbell Back Squat', 'Legs', 'barbell', 'Bar on the upper back · sit back and down · drive through mid-foot', null, ['strength']),
  E('c0000515-0000-4000-8000-000000000000', 'Barbell Front Squat', 'Quads', 'barbell', 'Bar in the front rack, elbows up · sit tall · drive up', null, ['strength']),
  E('c0000516-0000-4000-8000-000000000000', 'Barbell Romanian Deadlift', 'Hamstrings', 'barbell', 'Hinge at the hips · bar close to the legs · flat back', null, ['strength']),
  E('c0000517-0000-4000-8000-000000000000', 'Barbell Deadlift', 'Back', 'barbell', 'Hips back, flat back · drive the floor away · lock out tall', null, ['strength']),
  E('c0000518-0000-4000-8000-000000000000', 'Barbell Bent-Over Row', 'Back', 'barbell', 'Hinge to 45° · flat back · drive elbows past the ribs', null, ['strength']),
  E('c0000519-0000-4000-8000-000000000000', 'Barbell Overhead Press', 'Shoulders', 'barbell', 'Brace the core · press to full lockout overhead', null, ['strength']),
  E('c0000520-0000-4000-8000-000000000000', 'Barbell Floor Press', 'Chest', 'barbell', 'Lying on the floor · elbows to the floor · press up', null, ['strength']),
  E('c0000521-0000-4000-8000-000000000000', 'Barbell Glute Bridge', 'Glutes', 'barbell', 'Bar across the hips · drive through the heels · squeeze at the top', null, ['strength']),
  E('c0000522-0000-4000-8000-000000000000', 'Barbell Reverse Lunge', 'Legs', 'barbell', 'Bar on the back · step back · drop the back knee · drive through the front heel', null, ['strength']),
  E('c0000523-0000-4000-8000-000000000000', 'Barbell Bicep Curl', 'Biceps', 'barbell', 'No swing · full stretch at the bottom · curl to the top', null, ['strength']),
  E('c0000524-0000-4000-8000-000000000000', 'Barbell Shrug', 'Traps', 'barbell', 'Shrug straight up against real load · pause · no rolling', null, ['strength']),

  // ----- Cable Machine (13) -----
  E('c0000525-0000-4000-8000-000000000000', 'Cable Standing Row', 'Back', 'cable_machine', 'Chest up · drive the elbows back · squeeze the shoulder blades', null, ['strength']),
  E('c0000526-0000-4000-8000-000000000000', 'Cable Lat Pulldown', 'Back', 'cable_machine', 'Wide overhand grip · pull the bar to the upper chest · control up', null, ['strength']),
  E('c0000527-0000-4000-8000-000000000000', 'Cable Straight-Arm Pulldown', 'Back', 'cable_machine', 'Arms straight · pull the bar down to the thighs · feel the lats', null, ['strength']),
  E('c0000528-0000-4000-8000-000000000000', 'Cable Chest Press', 'Chest', 'cable_machine', 'Split stance · press straight out · control the return', null, ['strength']),
  E('c0000529-0000-4000-8000-000000000000', 'Cable Standing Fly', 'Chest', 'cable_machine', 'Soft elbows · wide arc · squeeze at the finish', null, ['strength']),
  E('c0000530-0000-4000-8000-000000000000', 'Cable Face Pull', 'Rear Delts', 'cable_machine', 'Rope at eye height · pull to the face · elbows high', null, ['strength']),
  E('c0000531-0000-4000-8000-000000000000', 'Cable Rear-Delt Fly', 'Rear Delts', 'cable_machine', 'Cross-cable handles · pull out and back · squeeze the upper back', null, ['strength']),
  E('c0000532-0000-4000-8000-000000000000', 'Cable Upright Row', 'Traps', 'cable_machine', 'Pull straight up to chest height · elbows lead · no shrug at the top', null, ['strength']),
  E('c0000533-0000-4000-8000-000000000000', 'Cable Lateral Raise', 'Shoulders', 'cable_machine', 'Low pulley · raise out to shoulder height · no swing', null, ['strength']),
  E('c0000534-0000-4000-8000-000000000000', 'Cable Triceps Pushdown', 'Triceps', 'cable_machine', 'Elbows pinned to the sides · press down to full lockout', null, ['strength']),
  E('c0000535-0000-4000-8000-000000000000', 'Cable Bicep Curl', 'Biceps', 'cable_machine', 'Elbows still · curl to the top · slow negative', null, ['strength']),
  E('c0000536-0000-4000-8000-000000000000', 'Cable Woodchop', 'Obliques', 'cable_machine', 'High anchor · rotate and chop diagonally across the body', null, ['stability']),
  E('c0000537-0000-4000-8000-000000000000', 'Cable Pallof Press', 'Core', 'cable_machine', 'Resist the pull toward the machine · press straight out · brace', null, ['stability']),

  // ----- Leg Press (3) -----
  E('c0000538-0000-4000-8000-000000000000', 'Leg Press', 'Legs', 'leg_press_machine', 'Feet shoulder-width mid-platform · lower to 90° · drive through the heels', null, ['strength']),
  E('c0000539-0000-4000-8000-000000000000', 'Single-Leg Leg Press', 'Legs', 'leg_press_machine', 'One foot centered on the platform · press through the heel · control the negative', null, ['strength', 'balance']),
  E('c0000540-0000-4000-8000-000000000000', 'High Foot-Placement Leg Press', 'Glutes', 'leg_press_machine', 'Feet high on the platform, wider stance · drive through the heels to bias the glutes', null, ['strength']),

  // ----- Lat Pulldown (3) -----
  E('c0000541-0000-4000-8000-000000000000', 'Lat Pulldown (Wide Grip)', 'Back', 'lat_pulldown_machine', 'Wide overhand grip · pull the bar to the upper chest · control up', null, ['strength']),
  E('c0000542-0000-4000-8000-000000000000', 'Close-Grip Lat Pulldown', 'Back', 'lat_pulldown_machine', 'Close neutral or underhand grip · drive the elbows down · squeeze the lats', null, ['strength']),
  E('c0000543-0000-4000-8000-000000000000', 'Single-Arm Lat Pulldown', 'Back', 'lat_pulldown_machine', 'One handle · pull straight down to the hip · resist the twist', null, ['strength']),
];

// Library moves that already serve knee rehab — tagged, not duplicated. Kneeling
// movements (e.g. the Kneeling Hip Flexor Stretch) are intentionally left out.
const RETRO_TAGS: Record<string, string[]> = {
  'Glute Bridge': ['physical-therapy', 'knee', 'stage-2', 'strength'],
  'Glute Bridge Hold': ['physical-therapy', 'knee', 'stage-2', 'isometric'],
  'Single-Leg Glute Bridge': ['physical-therapy', 'knee', 'stage-3', 'strength'],
  'Wall Sit': ['physical-therapy', 'knee', 'stage-3', 'isometric', 'weight-bearing'],
  'Single-Leg Wall Sit': ['physical-therapy', 'knee', 'stage-3', 'isometric', 'weight-bearing'],
  'Calf Raise': ['physical-therapy', 'knee', 'stage-2', 'strength', 'weight-bearing'],
  'Seated Hamstring Stretch': ['physical-therapy', 'knee', 'stage-1', 'stretch', 'mobility', 'seated-lying'],
  'Standing Quad Stretch': ['physical-therapy', 'knee', 'stage-2', 'stretch', 'mobility', 'weight-bearing'],
  'Banded Clamshell': ['physical-therapy', 'knee', 'stage-2', 'stability', 'seated-lying'],
  'Banded Seated Hip Abduction': ['physical-therapy', 'knee', 'stage-2', 'stability', 'seated-lying'],
  'Banded Standing Hip Abduction': ['physical-therapy', 'knee', 'stage-2', 'stability', 'weight-bearing'],
  'Bodyweight Squat': ['physical-therapy', 'knee', 'stage-3', 'strength', 'weight-bearing'],
  'Isometric Squat Hold': ['physical-therapy', 'knee', 'stage-3', 'isometric', 'weight-bearing'],
  'Bird Dog Hold': ['stability', 'isometric'],
  'Butterfly Stretch': ['mobility', 'stretch'],
  // Cross-tagged for the ankle arc (already serve it; not duplicated).
  'Ankle Pumps': ['physical-therapy', 'ankle', 'stage-1'],
  'Single-Leg Balance': ['physical-therapy', 'ankle', 'stage-3'],
  // "Safer core" cluster — anti-flexion/anti-rotation work a low-back-sensitive
  // user can filter to, apart from the spinal-flexion crunches. Bird Dog + the
  // new Dead Bug already carry `stability`; tag the other two to match.
  'Plank': ['stability'],
  'Band Pallof Press': ['stability'],
  // From Heath Mann DPT's knee HEP — these on-kit moves already serve it.
  'Band Lateral Walk': ['physical-therapy', 'knee', 'stage-3', 'weight-bearing'],
  'Banded Monster Walk': ['physical-therapy', 'knee', 'stage-3', 'weight-bearing'],
  // The bike's low-impact warm-up intent (not a true non-weight-bearing match).
  'Standing March in Place': ['physical-therapy', 'knee', 'stage-3', 'low-impact'],
  'Step Touch': ['physical-therapy', 'knee', 'stage-3', 'low-impact'],
};

for (const ex of SAMPLE_EXERCISES) {
  const extra = RETRO_TAGS[ex.name];
  if (extra) ex.tags = Array.from(new Set([...(ex.tags ?? []), ...extra]));
}

// Display order + labels for grouping the picker.
export const EQUIPMENT_ORDER: Equipment[] = [
  'dumbbell',
  'kettlebell',
  'calisthenics',
  'tube_band',
  'loop_band',
  'pullup_bar',
  'medicine_ball',
  'jump_rope',
  'stretch',
  'stationary_bike',
  'treadmill',
  'stair_climber',
  'rowing_machine',
  'elliptical',
  'barbell',
  'cable_machine',
  'leg_press_machine',
  'lat_pulldown_machine',
];
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  calisthenics: 'Calisthenics',
  tube_band: 'Tube Band',
  loop_band: 'Loop Band',
  pullup_bar: 'Pull-up Bar',
  medicine_ball: 'Medicine Ball',
  jump_rope: 'Jump Rope',
  stretch: 'Stretch',
  stationary_bike: 'Stationary Bike',
  treadmill: 'Treadmill',
  stair_climber: 'Stair Climber',
  rowing_machine: 'Rowing Machine',
  elliptical: 'Elliptical',
  barbell: 'Barbell',
  cable_machine: 'Cable Machine',
  leg_press_machine: 'Leg Press',
  lat_pulldown_machine: 'Lat Pulldown',
};
