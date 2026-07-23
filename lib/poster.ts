// Pure + testable: the ?layout= param on /g/[slug]/poster. Kept out of the
// server component so the fallback rule (missing/typo/unrelated → the more
// common wall-poster case) has a unit test independent of rendering.

export type PosterLayout = 'poster' | 'handout';

export function resolvePosterLayout(raw: string | undefined): PosterLayout {
  return raw === 'handout' ? 'handout' : 'poster';
}
