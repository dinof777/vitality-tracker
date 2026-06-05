// Placeholder progressive-overload history (max weight per session) keyed by
// exercise id. Used until the Neon log_entries table has real data —
// OverloadSparkline falls back to this when /api/overload returns no history.
// Pure stretches are omitted (they show "No history yet").
export const SAMPLE_HISTORY: Record<string, number[]> = {
  // Dumbbell
  '11111111-1111-4111-8111-111111111111': [40, 45, 45, 50, 50, 55, 60, 60], // Goblet Squat
  '22222222-2222-4222-8222-222222222222': [50, 55, 60, 60, 65, 70, 70, 75], // RDL
  '99999999-9999-4999-8999-999999999999': [40, 45, 45, 50, 50, 55, 55, 60], // DB Bench
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': [45, 50, 50, 55, 55, 60, 65, 65], // DB Row
  '44444444-4444-4444-8444-444444444444': [30, 30, 35, 35, 40, 40, 45, 45], // DB Shoulder Press
  '66666666-6666-4666-8666-666666666666': [15, 15, 20, 20, 20, 25, 25, 25], // Lateral Raise
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': [20, 25, 25, 30, 30, 30, 35, 35], // Bicep Curl
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc': [25, 30, 30, 35, 35, 40, 40, 45], // Bulgarian Split Squat
  // Band (resistance level)
  '33333333-3333-4333-8333-333333333333': [25, 25, 30, 30, 35, 35, 40, 40], // Band Chest Press
  '55555555-5555-4555-8555-555555555555': [25, 30, 30, 35, 35, 40, 40, 45], // Band Row
  // Isometric (seconds held)
  '77777777-7777-4777-8777-777777777777': [30, 35, 40, 45, 45, 50, 55, 60], // Wall Sit
  'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1': [30, 40, 45, 50, 55, 60, 70, 75], // Plank
};
