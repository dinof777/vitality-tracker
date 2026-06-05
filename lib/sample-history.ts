// Placeholder progressive-overload history (max weight per session) keyed by
// the sample exercise ids. Used until the Supabase log_entries table has real
// data — OverloadSparkline falls back to this when /api/overload returns 503.
export const SAMPLE_HISTORY: Record<string, number[]> = {
  'ex-bench': [155, 160, 160, 165, 170, 175, 180, 185],
  'ex-incline-db': [50, 50, 55, 55, 60, 60, 65, 65],
  'ex-pulldown': [120, 120, 130, 130, 140, 145, 145, 150],
  'ex-row': [135, 135, 145, 150, 150, 155, 160, 165],
  'ex-squat': [205, 215, 225, 225, 235, 245, 250, 255],
  'ex-rdl': [185, 195, 205, 205, 215, 225, 230, 235],
  'ex-ohp': [85, 90, 90, 95, 95, 100, 100, 105],
  'ex-lateral': [20, 20, 25, 25, 25, 30, 30, 30],
};
