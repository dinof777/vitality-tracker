'use client';

import { useEffect, useState } from 'react';
import { tagsInCategory, type TagCategory } from '@/lib/tags';
import Link from 'next/link';
import { EQUIPMENT_CHOICES } from '@/lib/profile';
import { SAMPLE_EXERCISES, EQUIPMENT_LABEL } from '@/lib/exercises';
import type { Equipment } from '@/lib/database.types';

interface CustomExercise {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  custom_equip_name?: string | null;
  default_cue: string | null;
}
interface CustomEquip {
  id: string;
  name: string;
  is_core: boolean;
}

export default function CustomExercises() {
  const [list, setList] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState<string>(EQUIPMENT_CHOICES[0]?.value ?? 'dumbbell');
  const [cue, setCue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [aliasQuery, setAliasQuery] = useState('');
  const [customEquip, setCustomEquip] = useState<CustomEquip[]>([]);

  const load = () =>
    fetch('/api/tenant/exercises')
      .then((r) => (r.ok ? r.json() : { custom: [] }))
      .then((d) => setList(d.custom ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  // The gym's own (non-core) equipment, to offer in the exercise's equipment picker.
  useEffect(() => {
    fetch('/api/tenant/equipment')
      .then((r) => (r.ok ? r.json() : { equipment: [] }))
      .then((d) => setCustomEquip((d.equipment ?? []).filter((e: CustomEquip) => !e.is_core)))
      .catch(() => {});
  }, []);

  const equipLabel = (ex: CustomExercise) =>
    ex.custom_equip_name ?? (ex.equipment ? EQUIPMENT_LABEL[ex.equipment as Equipment] : '');

  useEffect(() => {
    load();
    fetch('/api/tenant/aliases')
      .then((r) => (r.ok ? r.json() : { aliases: {} }))
      .then((d) => setAliases(d.aliases ?? {}))
      .catch(() => {});
  }, []);

  const draftFor = (id: string) => drafts[id] ?? aliases[id] ?? '';

  const saveAlias = async (exId: string) => {
    const name = (drafts[exId] ?? aliases[exId] ?? '').trim();
    setAliases((prev) => {
      const next = { ...prev };
      if (name) next[exId] = name;
      else delete next[exId];
      return next;
    });
    await fetch('/api/tenant/aliases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: exId, name }),
    });
  };

  const aliasMatches = aliasQuery.trim()
    ? SAMPLE_EXERCISES.filter((ex) => ex.name.toLowerCase().includes(aliasQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  const add = async () => {
    if (!name.trim()) return setError('Name is required.');
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/tenant/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), muscle_group: muscle.trim(), equipment, default_cue: cue.trim(), tags }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? 'Could not add.');
        return;
      }
      setName('');
      setMuscle('');
      setCue('');
      setTags([]);
      setList((prev) => [j.exercise, ...prev]);
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ex: CustomExercise) => {
    if (!window.confirm(`Delete “${ex.name}”?`)) return;
    setList((prev) => prev.filter((x) => x.id !== ex.id));
    await fetch(`/api/tenant/exercises?id=${ex.id}`, { method: 'DELETE' });
  };

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Your exercises</h1>
        <p className="mb-6 text-body text-text-muted">
          Add moves we don’t have. They join the 168-move library only for your gym.
        </p>

        {/* Add form */}
        <div className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
          />
          <div className="flex gap-2">
            <input
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              placeholder="Muscle group"
              className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
            />
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="h-11 flex-1 rounded-md border border-border bg-background px-2 text-body text-text-primary"
            >
              {EQUIPMENT_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
              {customEquip.length > 0 && (
                <optgroup label="Your equipment">
                  {customEquip.map((e) => (
                    <option key={e.id} value={`cat:${e.id}`}>
                      {e.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <input
            value={cue}
            onChange={(e) => setCue(e.target.value)}
            placeholder="Form cue (optional)"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
          />

          {/* Tags — so custom moves show up in the same filters as the library */}
          <div>
            <p className="mb-1 text-caption text-text-muted">
              Tags <span className="text-text-faint">(optional — makes it findable when building workouts)</span>
            </p>
            {(['goal', 'stage', 'pattern'] as TagCategory[]).map((cat) => (
              <div key={cat} className="mb-1.5">
                <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">
                  {cat === 'pattern' ? 'MOVEMENT' : cat.toUpperCase()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tagsInCategory(cat).map((t) => {
                    const on = tags.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        title={t.description}
                        onClick={() => setTags(on ? tags.filter((x) => x !== t.id) : [...tags, t.id])}
                        className={`rounded-full border px-2.5 py-1 text-caption transition ${
                          on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-background text-text-muted'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={add}
            disabled={saving || !name.trim()}
            className="h-12 w-full rounded-md bg-accent text-label text-on-accent disabled:opacity-50"
          >
            {saving ? 'ADDING…' : '+ ADD EXERCISE'}
          </button>
          {error && <p className="text-center text-caption text-destructive">{error}</p>}
        </div>

        {/* List */}
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No custom exercises yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-text-primary">{ex.name}</p>
                  <p className="truncate text-caption text-text-muted">
                    {[ex.muscle_group, equipLabel(ex)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(ex)}
                  aria-label={`Delete ${ex.name}`}
                  className="shrink-0 text-caption text-destructive"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Rename library moves (per-tenant aliases) */}
        <div className="mt-8">
          <p className="mb-1 text-label text-accent">RENAME A MOVE</p>
          <p className="mb-3 text-caption text-text-muted">
            Call a library move whatever your gym calls it — changes the name only for you.
          </p>
          <input
            value={aliasQuery}
            onChange={(e) => setAliasQuery(e.target.value)}
            placeholder="Search the 168-move library…"
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
          />
          {aliasQuery.trim() && (
            <ul className="mt-2 space-y-2">
              {aliasMatches.map((ex) => (
                <li key={ex.id} className="rounded-md border border-border bg-surface p-3">
                  <p className="text-caption text-text-muted">{ex.name}</p>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={draftFor(ex.id)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [ex.id]: e.target.value }))}
                      placeholder={`Keep “${ex.name}”`}
                      className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
                    />
                    <button
                      type="button"
                      onClick={() => saveAlias(ex.id)}
                      className="h-10 shrink-0 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent"
                    >
                      Save
                    </button>
                  </div>
                  {aliases[ex.id] && (
                    <p className="mt-1 text-caption text-accent">Shows as “{aliases[ex.id]}” for your gym</p>
                  )}
                </li>
              ))}
              {aliasMatches.length === 0 && (
                <li className="px-1 text-caption text-text-faint">No library moves match “{aliasQuery}”.</li>
              )}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
