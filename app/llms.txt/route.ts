import { SAMPLE_EXERCISES, EQUIPMENT_ORDER } from '@/lib/exercises';

export const dynamic = 'force-dynamic';

// /llms.txt — the "sitemap for the AI era". Computed from the same library
// module that drives the app, so the move/equipment counts never drift.
const ORIGIN = 'https://vitality-tracker-mauve.vercel.app';

export async function GET(): Promise<Response> {
  const moves = SAMPLE_EXERCISES.length;
  const equip = EQUIPMENT_ORDER.length;
  const u = (p: string) => `${ORIGIN}${p}`;

  const lines: string[] = [
    '# Vitality',
    '',
    `> Vitality is a mobile-first workout app — a ${moves}-move illustrated exercise library across ${equip} equipment types, with time-budgeted workout generation, routines, weekly planning, and a daily mobility habit. It's also "Vitality Pro," a white-label platform that lets gyms and personal trainers run a branded copy of the app for their clients and push workouts to the SyncroFit interval timer.`,
    '',
    'Two products share one codebase: the single-user training app, and Vitality Pro — a multi-tenant, white-label version where each gym gets its own branded space at /g/<slug>.',
    '',
    '## The training app',
    `- [Home](${u('/')}): Build today's workout — pick length, focus, intensity, and equipment; or run a scheduled plan day.`,
    `- [Exercise library](${u('/exercises')}): All ${moves} movements with illustrations, muscle group, difficulty tier, and coaching cues; searchable, grouped by equipment.`,
    `- [Routines](${u('/routines')}): Reusable workout blueprints you can build, favorite, and send to the SyncroFit timer.`,
    `- [Weekly plan](${u('/plan')}): A 4-pillar (strength, cardio, balance, flexibility) week built from your level, goal, and equipment.`,
    `- [Daily 5](${u('/daily5')}): A short daily mobility checklist with a streak.`,
    `- [Profile](${u('/settings')}): Trainer/trainee details, saved routines, and workout history.`,
    '',
    '## Vitality Pro — white-label for gyms & trainers',
    `- [Sign up](${u('/sign-up')}): Create a trainer account.`,
    `- [Create your gym](${u('/onboarding')}): Name your gym and claim a URL — your branded app at /g/<your-gym>.`,
    `- [Trainer dashboard](${u('/dashboard')}): Manage your gym — branding, custom exercises, and equipment.`,
    `- [Branded gym app (example)](${u('/g/vitality')}): A gym's public, themed home screen.`,
    `- [A gym's exercise library](${u('/g/vitality/exercises')}): The global library plus the gym's own custom moves and local renames.`,
    `- [Build a workout for a gym](${u('/g/vitality/build')}): Generate a workout from the gym's library, print it with a QR code, and send it to SyncroFit.`,
    '',
    '## How it works for gyms',
    "- Brand autopilot: paste your website and we pull your logo, colors, and name.",
    '- Custom exercises and per-gym renames (call a move whatever your gym calls it).',
    '- Custom equipment with duplicate detection, plus a shared, moderated global catalog.',
    '- Printable workouts with a QR code clients scan to load the workout and run it in SyncroFit.',
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
