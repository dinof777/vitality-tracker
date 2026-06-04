import type { Exercise } from './database.types';

// Placeholder exercise library so the logger is usable before the Supabase
// `exercises` table is seeded. Once the seed task runs, swap this for a
// fetch from Supabase (ids will become real UUIDs from gen_random_uuid()).
export const SAMPLE_EXERCISES: Exercise[] = [
  { id: 'ex-bench', name: 'Barbell Bench Press', muscle_group: 'Chest', default_cue: '3s negative · pause on chest · drive up', created_at: '' },
  { id: 'ex-incline-db', name: 'Incline DB Press', muscle_group: 'Chest', default_cue: 'Deep stretch at bottom · squeeze at top', created_at: '' },
  { id: 'ex-pulldown', name: 'Lat Pulldown', muscle_group: 'Back', default_cue: 'Pull to collarbone · control the negative', created_at: '' },
  { id: 'ex-row', name: 'Barbell Row', muscle_group: 'Back', default_cue: 'Flat back · drive elbows past the ribs', created_at: '' },
  { id: 'ex-squat', name: 'Back Squat', muscle_group: 'Legs', default_cue: 'Break parallel · knees track the toes', created_at: '' },
  { id: 'ex-rdl', name: 'Romanian Deadlift', muscle_group: 'Hamstrings', default_cue: 'Hinge at the hips · soft knees · feel the stretch', created_at: '' },
  { id: 'ex-ohp', name: 'Overhead Press', muscle_group: 'Shoulders', default_cue: 'Brace the core · press to full lockout', created_at: '' },
  { id: 'ex-lateral', name: 'DB Lateral Raise', muscle_group: 'Shoulders', default_cue: 'Lead with the elbows · no swing', created_at: '' },
];
