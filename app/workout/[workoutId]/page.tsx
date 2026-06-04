import WorkoutSession from '@/components/workout/WorkoutSession';

// Active workout screen. The [workoutId] param is passed to the client
// session: a real UUID resumes that workout, 'active' starts a fresh one.
export default function WorkoutPage({
  params,
}: {
  params: { workoutId: string };
}) {
  return <WorkoutSession initialWorkoutId={params.workoutId} />;
}
