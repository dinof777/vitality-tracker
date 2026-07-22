import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SAMPLE_EXERCISES, EQUIPMENT_LABEL } from '@/lib/exercises';
import { TAG_BY_ID, groupByTag, hasTag, tagsInCategory, REHAB_DISCLAIMER } from '@/lib/tags';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import { MOVE, plural } from '@/lib/vocabulary';

// A tagged collection rendered as a staged program. Generic over any `goal` or
// `area` tag — /collections/physical-therapy (all rehab) or /collections/knee
// (one body area), plus any future program for free.
export function generateStaticParams() {
  return [...tagsInCategory('goal'), ...tagsInCategory('area')].map((t) => ({ goal: t.id }));
}

export default function Collection({ params }: { params: { goal: string } }) {
  const goal = TAG_BY_ID[params.goal];
  if (!goal || (goal.category !== 'goal' && goal.category !== 'area')) notFound();

  const items = SAMPLE_EXERCISES.filter((e) => hasTag(e, goal.id));
  if (items.length === 0) notFound();

  const stages = groupByTag(items, 'stage');
  const untagged = items.filter((e) => !stages.some((g) => g.items.includes(e)));

  return (
    <main className="shell min-h-dvh px-4 pb-28 pt-8">
      <Link href="/exercises" className="text-caption text-text-muted">
        ← Moves
      </Link>
      <header className="mb-5 mt-2">
        <p className="text-label text-accent">COLLECTION</p>
        <h1 className="text-h1 text-text-primary">{goal.label}</h1>
        <p className="mt-1 text-body text-text-muted">{goal.description}</p>
        <p className="mt-1 text-caption text-text-faint nums">{plural(items.length, MOVE.one, MOVE.many)}</p>
      </header>

      {goal.clinical && (
        <p className="mb-6 rounded-lg border border-border bg-surface p-3 text-caption text-text-muted">
          {REHAB_DISCLAIMER}
        </p>
      )}

      {stages.map(({ tag, items: group }) => (
        <section key={tag.id} className="mb-7">
          <h2 className="text-h3 font-semibold text-text-primary">{tag.label}</h2>
          <p className="mb-3 text-caption text-text-muted">{tag.description}</p>
          <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
            {group.map((ex) => (
              <li key={ex.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-text-primary">{ex.name}</span>
                  <span className="block truncate text-caption text-text-muted">{ex.default_cue}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {ex.equipment && (
                      <span className="rounded bg-background px-1.5 py-0.5 text-[0.65rem] text-text-faint">
                        {EQUIPMENT_LABEL[ex.equipment]}
                      </span>
                    )}
                    {(ex.tags ?? [])
                      .filter((t) => TAG_BY_ID[t]?.category === 'pattern')
                      .map((t) => (
                        <span key={t} className="rounded bg-accent/10 px-1.5 py-0.5 text-[0.65rem] text-accent">
                          {TAG_BY_ID[t].label}
                        </span>
                      ))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {untagged.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-3 text-h3 font-semibold text-text-primary">Also useful</h2>
          <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
            {untagged.map((ex) => (
              <li key={ex.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-text-primary">{ex.name}</span>
                  <span className="block truncate text-caption text-text-muted">{ex.default_cue}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
