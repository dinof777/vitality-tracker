import { SAMPLE_EXERCISES, EQUIPMENT_ORDER } from '@/lib/exercises';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

// /llms.txt — the "sitemap for the AI era". Computed from the same library
// module that drives the app, so the exercise/equipment counts never drift.
const ORIGIN = SITE_URL;

export async function GET(): Promise<Response> {
  const exercises = SAMPLE_EXERCISES.length;
  const equip = EQUIPMENT_ORDER.length;
  const u = (p: string) => `${ORIGIN}${p}`;

  const lines: string[] = [
    '# Live Elevated',
    '',
    `> Live Elevated is a mobile-first workout app — a ${exercises}-exercise illustrated library across ${equip} equipment types, with time-budgeted workout generation, routines, weekly planning, and a daily mobility habit. It's also "Live Elevated Pro," a white-label platform that lets gyms and personal trainers run a branded copy of the app for their clients and push workouts to the SyncroFit interval timer.`,
    '',
    'Two products share one codebase: the single-user training app, and Live Elevated Pro — a multi-tenant, white-label version where each gym gets its own branded space at /g/<slug>.',
    '',
    '## The training app',
    `- [Home](${u('/')}): Build today's workout — pick length, focus, intensity, and equipment; or run a scheduled plan day. A first-time visitor sees the consumer sales pitch first (features, builder walkthrough, SyncroFit callout) before setup.`,
    `- [Welcome](${u('/welcome')}): The consumer sales pitch on its own URL — what Live Elevated does, how the exercise builder works, and how workouts hand off to SyncroFit.`,
    `- [Exercise library](${u('/exercises')}): All ${exercises} exercises with illustrations, muscle group, difficulty tier, and coaching cues; searchable, grouped by equipment.`,
    `- [Routines](${u('/routines')}): Reusable workout blueprints you can build, favorite, and send to the SyncroFit timer.`,
    `- [Weekly plan](${u('/plan')}): A 4-pillar (strength, cardio, balance, flexibility) week built from your level, goal, and equipment.`,
    `- [Daily 5](${u('/daily5')}): A short daily mobility checklist with a streak.`,
    `- [Profile](${u('/settings')}): Trainer/trainee details, saved routines, and workout history.`,
    '',
    '## Live Elevated Pro — white-label for gyms & trainers',
    `- [Live Elevated Pro (marketing)](${u('/pro')}): What the white-label platform is and who it's for — features, how it works, pricing.`,
    `- [Sign up](${u('/sign-up')}): Create a trainer account.`,
    `- [Create your gym](${u('/onboarding')}): Name your gym and claim a URL — your branded app at /g/<your-gym>.`,
    `- [Trainer dashboard](${u('/dashboard')}): Manage your gym — branding, custom exercises, and equipment.`,
    `- [Branded gym app (example)](${u('/g/vitality')}): A gym's public, themed home screen.`,
    `- [A gym's exercise library](${u('/g/vitality/exercises')}): The global library plus the gym's own custom exercises and local renames.`,
    `- [Build a workout for a gym](${u('/g/vitality/build')}): Generate a workout from the gym's library, print it with a QR code, and send it to SyncroFit.`,
    `- [Gym QR poster (example)](${u('/g/vitality/poster')}): A print-ready QR poster for the front desk or wall — wall-poster and 2-up handout layouts.`,
    '',
    '## How it works for gyms',
    "- Brand autopilot: paste your website and we pull your logo, colors, and name.",
    '- Custom exercises and per-gym renames (call an exercise whatever your gym calls it).',
    '- Custom equipment with duplicate detection, plus a shared, moderated global catalog.',
    '- Custom muscle groups and tags with the same duplicate detection: gym slang and typos fold into the existing term, and a term enough gyms add becomes part of the shared vocabulary.',
    '- Printable workouts with a QR code clients scan to load the workout and run it in SyncroFit.',
    '- A branded, print-ready QR poster (wall poster or a 2-up front-desk handout) for the gym itself.',
    '- SyncroFit reports back when a workout is imported or completed, so trainers see client engagement.',
    '',
    '## Integrations',
    '- SyncroFit interval timer: workouts are handed off as timed circuits via deep link; import/completion events flow back to a webhook for engagement analytics.',
    '',
    '## Optional',
    `- [Robots](${u('/robots.txt')})`,
    `- [Sitemap (XML)](${u('/sitemap.xml')})`,
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
