import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentTrainer } from '@/lib/current-tenant';
import { listWorkouts, createWorkout, renameWorkout, deleteWorkout } from '@/lib/tenant-workouts';
import { PATCH } from './route';

// PATCH /api/tenant/workouts — the "Rename" affordance Kevin added in
// 77c8312. renameWorkout's own tenant/owner scoping is proven at the adapter
// layer in lib/tenant-workouts.test.ts (fake-sql, asserts the WHERE guard);
// this file isolates the route's own guard order + input validation, mirroring
// app/api/log/[entryId]/route.test.ts's thin-HTTP-layer pattern. GET/POST/
// DELETE on this route are pre-existing and out of scope for this pass.

vi.mock('@/lib/current-tenant', () => ({ currentTrainer: vi.fn() }));
vi.mock('@/lib/tenant-workouts', () => ({
  listWorkouts: vi.fn(),
  createWorkout: vi.fn(),
  renameWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
}));

const trainer = { tenant: { id: 't-1' }, userId: 'u-1', isOwner: false } as Awaited<ReturnType<typeof currentTrainer>>;

function req(body: unknown) {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.mocked(currentTrainer).mockReset();
  vi.mocked(renameWorkout).mockReset();
  vi.mocked(listWorkouts).mockReset();
  vi.mocked(createWorkout).mockReset();
  vi.mocked(deleteWorkout).mockReset();
});

describe('PATCH /api/tenant/workouts — guards', () => {
  it('403s when there is no gym for this account, and never touches renameWorkout', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);
    const res = await PATCH(req({ id: 'w-1', name: 'New Name' }));
    expect(res.status).toBe(403);
    expect(renameWorkout).not.toHaveBeenCalled();
  });

  it('400s on invalid JSON', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: '{not json' }));
    expect(res.status).toBe(400);
    expect(renameWorkout).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/tenant/workouts — validation', () => {
  beforeEach(() => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
  });

  it('400s when id is missing', async () => {
    const res = await PATCH(req({ name: 'New Name' }));
    expect(res.status).toBe(400);
    expect(renameWorkout).not.toHaveBeenCalled();
  });

  it('400s when name is missing', async () => {
    const res = await PATCH(req({ id: 'w-1' }));
    expect(res.status).toBe(400);
    expect(renameWorkout).not.toHaveBeenCalled();
  });

  it('400s when name is empty', async () => {
    const res = await PATCH(req({ id: 'w-1', name: '' }));
    expect(res.status).toBe(400);
    expect(renameWorkout).not.toHaveBeenCalled();
  });

  it('400s when name is whitespace-only', async () => {
    const res = await PATCH(req({ id: 'w-1', name: '    ' }));
    expect(res.status).toBe(400);
    expect(renameWorkout).not.toHaveBeenCalled();
  });

  it('an over-length name is truncated to 80 chars and STILL passed to renameWorkout (not rejected) — matches the sibling POST handler\'s convention', async () => {
    // Documenting actual behavior here, not the behavior the brief assumed:
    // this route truncates (slice(0, 80)) rather than 400ing on an
    // over-length name, exactly like POST's `name` handling a few lines
    // above it in the same file. Not a bug — it's consistent with the
    // existing convention in this route — but worth a test locking it in
    // since a future reader could reasonably expect a 400 instead.
    vi.mocked(renameWorkout).mockResolvedValue({
      id: 'w-1',
      tenant_id: 't-1',
      owner_user_id: 'u-1',
      name: 'a'.repeat(80),
      payload: { name: 'a'.repeat(80), exercises: [], params: {} } as never,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const longName = 'a'.repeat(120);
    const res = await PATCH(req({ id: 'w-1', name: longName }));

    expect(res.status).toBe(200);
    expect(renameWorkout).toHaveBeenCalledWith('w-1', 't-1', 'u-1', false, 'a'.repeat(80));
  });
});

describe('PATCH /api/tenant/workouts — happy path + not-found', () => {
  beforeEach(() => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
  });

  it('calls renameWorkout with (id, tenantId, userId, isOwner, name) and returns the updated workout', async () => {
    const updated = {
      id: 'w-1',
      tenant_id: 't-1',
      owner_user_id: 'u-1',
      name: 'Leg Day v2',
      payload: { name: 'Leg Day v2', exercises: [], params: {} } as never,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(renameWorkout).mockResolvedValue(updated);

    const res = await PATCH(req({ id: 'w-1', name: '  Leg Day v2  ' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(renameWorkout).toHaveBeenCalledWith('w-1', 't-1', 'u-1', false, 'Leg Day v2'); // trimmed
    expect(json).toEqual({ workout: updated });
  });

  it('404s when renameWorkout returns null — the response a cross-tenant/cross-owner rename attempt gets (the adapter guard blocked the UPDATE)', async () => {
    vi.mocked(renameWorkout).mockResolvedValue(null);

    const res = await PATCH(req({ id: 'not-mine', name: 'Sneaky Rename' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: 'Workout not found.' });
  });
});
