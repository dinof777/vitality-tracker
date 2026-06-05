import { Suspense } from 'react';
import WorkoutSession from '@/components/workout/WorkoutSession';

// Dynamic: the session reads the ?routine= search param client-side.
export const dynamic = 'force-dynamic';

// Active workout screen. The [workoutId] param is passed to the client
// session: a real UUID resumes that workout, 'active' starts a fresh one.
export default function WorkoutPage({
  params,
}: {
  params: { workoutId: string };
}) {
  return (
    <Suspense>
      <WorkoutSession initialWorkoutId={params.workoutId} />
    </Suspense>
  );
}
