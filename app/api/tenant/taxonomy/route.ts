import { NextResponse } from 'next/server';
import { currentTenant } from '@/lib/current-tenant';
import { addTerm, tenantTerms, unlinkTerm } from '@/lib/taxonomy-db';
import { duplicateMessage, type TermKind } from '@/lib/taxonomy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The governed vocabulary one gym may use — muscle groups and tags.
// Adding runs the dedup engine first: an exact/synonym match folds into the
// existing term, a fuzzy match comes back 409 for the trainer to confirm, and a
// genuinely-new term is created as a global proposal that's live for this gym
// immediately. See lib/taxonomy for the rules.

const KINDS: TermKind[] = ['muscle_group', 'tag'];

function parseKind(value: string | null): TermKind | null {
  return KINDS.includes(value as TermKind) ? (value as TermKind) : null;
}

export async function GET(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const kind = parseKind(new URL(req.url).searchParams.get('kind'));
  if (!kind) return NextResponse.json({ error: 'Unknown kind.' }, { status: 400 });
  return NextResponse.json({ terms: await tenantTerms(tenant.id, kind) });
}

export async function POST(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  let body: { kind?: string; name?: string; category?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const kind = parseKind(body.kind ?? null);
  if (!kind) return NextResponse.json({ error: 'Unknown kind.' }, { status: 400 });

  const result = await addTerm(tenant.id, kind, body.name ?? '', {
    category: body.category ?? null,
    force: !!body.force,
  });

  if (result.ok) {
    return NextResponse.json({ term: result.term, folded: result.folded }, { status: result.folded ? 200 : 201 });
  }
  if (result.kind === 'duplicate') {
    return NextResponse.json(
      { duplicate: result.match, reason: result.reason, message: duplicateMessage(result.reason, result.match.name) },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: result.message }, { status: result.kind === 'limit' ? 429 : 400 });
}

// Stop offering a term to this gym. Never deletes it globally — other gyms may
// be using it, and merged/approved terms are shared.
export async function DELETE(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await unlinkTerm(tenant.id, id);
  return NextResponse.json({ ok: true });
}
