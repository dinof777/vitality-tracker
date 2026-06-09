import { randomBytes } from 'crypto';
import { getSql } from './db';

// A tokenized, public share of a specific workout. The trainer creates one from
// the builder; the client opens /s/<token> (no login), runs it, and sends it to
// SyncroFit — whose feedback correlates back via circuit.id = token.

export interface ShareExercise {
  name: string;
  equipment: string | null;
  image_url: string | null;
  notes?: string;
}
export interface ShareParams {
  sets: number;
  reps: number;
  repSec: number;
  holdSec: number;
  restSec: number;
  tempo: string;
  setupSec: number;
}
export interface SharePayload {
  name: string;
  exercises: ShareExercise[];
  params: ShareParams;
}
export interface ShareLink {
  token: string;
  tenant_id: string;
  name: string;
  payload: SharePayload;
  created_at: string;
}

export function newShareToken(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export async function createShare(
  tenantId: string,
  name: string,
  payload: SharePayload,
  clientId?: string | null,
): Promise<string> {
  const sql = getSql();
  if (!sql) throw new Error('No database');
  const token = newShareToken();
  await sql`
    insert into share_links (token, tenant_id, name, payload, client_id)
    values (${token}, ${tenantId}, ${name}, ${JSON.stringify(payload)}::jsonb, ${clientId ?? null})
  `;
  return token;
}

export async function fetchShareByToken(token: string): Promise<ShareLink | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    select token, tenant_id, name, payload, created_at
    from share_links
    where token = ${token} and (expires_at is null or expires_at > now())
    limit 1
  `;
  return (rows[0] as ShareLink) ?? null;
}

// Fire-and-forget open counter.
export async function bumpShareOpens(token: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`update share_links set opens = opens + 1 where token = ${token}`;
  } catch {
    /* non-critical */
  }
}
