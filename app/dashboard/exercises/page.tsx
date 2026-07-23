'use client';

import { useEffect, useState } from 'react';
import { tagsInCategory, TAG_BY_ID } from '@/lib/tags';
import { TAG_CATEGORIES, TAG_CATEGORY_LABEL } from '@/lib/vocabulary';
import Link from 'next/link';
import { EQUIPMENT_CHOICES } from '@/lib/profile';
import { SAMPLE_EXERCISES, EQUIPMENT_LABEL } from '@/lib/exercises';
import { termSlug } from '@/lib/taxonomy';
import TermPicker, { type Term } from '@/components/dashboard/TermPicker';
import type { Equipment } from '@/lib/database.types';
import { buildExerciseImagePrompt } from '@/lib/exercise-image-prompt';
import CopyField from '@/components/CopyField';

interface CustomExercise {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  custom_equip_name?: string | null;
  default_cue: string | null;
  tags?: string[];
  archived_at?: string | null;
  /** What points at this move — decides whether delete removes or archives it. */
  routines?: number;
  log_entries?: number;
  aliases?: number;
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
  /** The gym's own tags, on top of the built-in registry. */
  const [gymTags, setGymTags] = useState<Term[]>([]);
  /** A library move this one looks like — offer the rename before forking it. */
  const [similar, setSimilar] = useState<{ id: string; name: string; message: string } | null>(null);
  /** Non-null when the form is editing an existing move rather than adding one. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Whether the AI image creator prompt panel is expanded on the form. */
  const [showImagePrompt, setShowImagePrompt] = useState(false);

  const load = () =>
    fetch('/api/tenant/exercises')
      .then((r) => (r.ok ? r.json() : { custom: [] }))
      .then((d) => setList(d.custom ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  // The gym's own (non-core) equipment, to offer in the move's equipment picker.
  useEffect(() => {
    fetch('/api/tenant/equipment')
      .then((r) => (r.ok ? r.json() : { equipment: [] }))
      .then((d) => setCustomEquip((d.equipment ?? []).filter((e: CustomEquip) => !e.is_core)))
      .catch(() => {});
  }, []);

  const loadGymTags = () =>
    fetch('/api/tenant/taxonomy?kind=tag')
      .then((r) => (r.ok ? r.json() : { terms: [] }))
      .then((d) => setGymTags((d.terms ?? []).filter((t: Term) => !TAG_BY_ID[termSlug(t.normalized)])))
      .catch(() => {});

  useEffect(() => {
    loadGymTags();
  }, []);

  const equipLabel = (ex: CustomExercise) =>
    ex.custom_equip_name ?? (ex.equipment ? EQUIPMENT_LABEL[ex.equipment as Equipment] : '');

  // The form's equipment select carries either a built-in Equipment value or
  // `cat:<id>` for one of the gym's own equipment rows — resolve the latter
  // to its readable name so the AI image prompt names it correctly.
  const formEquipmentLabel = equipment.startsWith('cat:')
    ? (customEquip.find((e) => `cat:${e.id}` === equipment)?.name ?? null)
    : null;

  const imagePrompt = buildExerciseImagePrompt({
    name,
    muscleGroup: muscle,
    equipment,
    equipmentLabel: formEquipmentLabel,
    cue,
  });

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

  const resetForm = () => {
    setName('');
    setMuscle('');
    setCue('');
    setTags([]);
    setSimilar(null);
    setShowImagePrompt(false);
  };

  // confirmDistinct = the trainer has seen the near-match and says this really is
  // a different movement, so skip the check and add it.
  const add = async (confirmDistinct = false) => {
    if (!name.trim()) return setError('Name is required.');
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/tenant/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          muscle_group: muscle.trim(),
          equipment,
          default_cue: cue.trim(),
          tags,
          confirmDistinct,
        }),
      });
      const j = await r.json();
      if (r.status === 409 && j.similar) {
        setSimilar({ ...j.similar, message: j.message });
        return;
      }
      if (!r.ok) {
        setError(j.error ?? 'Could not add.');
        return;
      }
      resetForm();
      setList((prev) => [j.exercise, ...prev]);
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  // The better path when the library already has the move: rename it locally
  // instead of adding a second copy, so logged history stays on one exercise.
  const renameInstead = async () => {
    if (!similar) return;
    const local = name.trim();
    setAliases((prev) => ({ ...prev, [similar.id]: local }));
    await fetch('/api/tenant/aliases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: similar.id, name: local }),
    });
    resetForm();
  };

  // Load a move back into the form to edit it in place, instead of the old
  // delete-and-retype (which used to destroy its logged history).
  const startEdit = (ex: CustomExercise) => {
    setEditingId(ex.id);
    setName(ex.name);
    setMuscle(ex.muscle_group ?? '');
    setEquipment(ex.equipment ?? (ex.custom_equip_name ? equipment : equipment));
    setCue(ex.default_cue ?? '');
    setTags(ex.tags ?? []);
    setSimilar(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveEdit = async (confirmDistinct = false) => {
    if (!editingId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/tenant/exercises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: name.trim(),
          muscle_group: muscle.trim(),
          equipment,
          default_cue: cue.trim(),
          tags,
          confirmDistinct,
        }),
      });
      const j = await r.json();
      if (r.status === 409 && j.similar) return setSimilar({ ...j.similar, message: j.message });
      if (!r.ok) return setError(j.error ?? 'Could not save.');
      setList((prev) => prev.map((x) => (x.id === editingId ? { ...x, ...j.exercise } : x)));
      cancelEdit();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const usageOf = (ex: CustomExercise) =>
    (ex.routines ?? 0) + (ex.log_entries ?? 0) + (ex.aliases ?? 0);

  // Delete tells the truth about what it will do: unused moves are removed,
  // used ones are archived so their routines and logged sets survive.
  const remove = async (ex: CustomExercise) => {
    const parts = [
      ex.log_entries ? `${ex.log_entries} logged set${ex.log_entries === 1 ? '' : 's'}` : '',
      ex.routines ? `${ex.routines} routine${ex.routines === 1 ? '' : 's'}` : '',
      ex.aliases ? `${ex.aliases} local rename${ex.aliases === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    const msg = parts.length
      ? `“${ex.name}” is used by ${parts.join(' · ')}.\n\nIt will be archived, not deleted — it leaves the library but everything using it keeps working. You can restore it any time.`
      : `Delete “${ex.name}”? Nothing uses it, so it will be removed completely.`;
    if (!window.confirm(msg)) return;

    const r = await fetch(`/api/tenant/exercises?id=${ex.id}`, { method: 'DELETE' });
    const j = await r.json().catch(() => ({}));
    if (j.effect === 'archived') {
      setList((prev) => prev.map((x) => (x.id === ex.id ? { ...x, archived_at: new Date().toISOString() } : x)));
    } else {
      setList((prev) => prev.filter((x) => x.id !== ex.id));
    }
  };

  const restore = async (ex: CustomExercise) => {
    const r = await fetch('/api/tenant/exercises', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ex.id, restore: true }),
    });
    if (r.ok) setList((prev) => prev.map((x) => (x.id === ex.id ? { ...x, archived_at: null } : x)));
  };

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Your exercises</h1>
        <p className="mb-6 text-body text-text-muted">
          Add exercises we don’t have. They join the {SAMPLE_EXERCISES.length}-exercise library only for your gym.
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
            <TermPicker
              kind="muscle_group"
              label="Muscle group"
              value={muscle}
              onChange={setMuscle}
              placeholder="Muscle group"
              className="flex-1"
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

          {/* AI image creator prompt — we don't generate art ourselves; this
              hands the trainer a ready-made prompt for any AI image tool that
              matches the 291-exercise library's lime-on-carbon house style. */}
          <button
            type="button"
            onClick={() => setShowImagePrompt((v) => !v)}
            disabled={!name.trim()}
            aria-expanded={showImagePrompt}
            aria-controls="ai-image-prompt-panel"
            className="h-12 w-full rounded-md border border-border bg-transparent text-label text-text-primary active:scale-[0.97] active:bg-surface transition-all duration-150 ease-out disabled:opacity-40 disabled:active:scale-100"
          >
            {showImagePrompt ? 'Hide AI image creator prompt' : 'AI image creator prompt'}
          </button>
          {showImagePrompt && (
            <div id="ai-image-prompt-panel" className="rounded-lg border border-border bg-background p-3">
              <p className="mb-2 text-caption text-text-muted">
                Paste into any AI image generator (ChatGPT, Gemini…) to get art that matches the library.
              </p>
              <CopyField value={imagePrompt} multiline />
            </div>
          )}

          {/* Tags — so custom moves show up in the same filters as the library */}
          <div>
            <p className="mb-1 text-caption text-text-muted">
              Tags <span className="text-text-faint">(optional — makes it findable when building workouts)</span>
            </p>
            {TAG_CATEGORIES.map((cat) => (
              <div key={cat} className="mb-1.5">
                <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">
                  {TAG_CATEGORY_LABEL[cat].toUpperCase()}
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

            {/* The gym's own tags — proposed here, shared once enough gyms agree */}
            <div className="mb-1.5">
              <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">YOUR GYM</p>
              {gymTags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {gymTags.map((t) => {
                    const id = termSlug(t.normalized);
                    const on = tags.includes(id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTags(on ? tags.filter((x) => x !== id) : [...tags, id])}
                        className={`rounded-full border px-2.5 py-1 text-caption transition ${
                          on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-background text-text-muted'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <TermPicker
                kind="tag"
                label="Add a tag"
                value=""
                onChange={() => {}}
                // Fires for an existing tag as well as a newly created one — the
                // chips above only cover tags already on this exercise.
                onSelect={(t) => {
                  const id = termSlug(t.normalized);
                  setTags((prev) => (prev.includes(id) ? prev : [...prev, id]));
                }}
                onTermAdded={loadGymTags}
                clearOnSelect
                requireCategory
                placeholder="Add a tag…"
              />
            </div>
          </div>

          {/* Near-duplicate of a library move → offer the rename before forking it */}
          {similar && (
            <div className="rounded-lg border border-accent bg-background p-3">
              <p className="mb-2 text-caption text-text-muted">{similar.message}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={renameInstead}
                  className="h-9 flex-1 rounded-md bg-accent px-3 text-caption font-semibold text-on-accent"
                >
                  Rename it “{name.trim()}”
                </button>
                <button
                  type="button"
                  onClick={() => (editingId ? saveEdit(true) : add(true))}
                  disabled={saving}
                  className="h-9 flex-1 rounded-md border border-border px-3 text-caption text-text-primary disabled:opacity-50"
                >
                  It’s a different exercise
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => (editingId ? saveEdit() : add())}
            disabled={saving || !name.trim()}
            className="h-12 w-full rounded-md bg-accent text-label text-on-accent disabled:opacity-50"
          >
            {saving ? (editingId ? 'SAVING…' : 'ADDING…') : editingId ? 'SAVE CHANGES' : '+ ADD EXERCISE'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="h-11 w-full rounded-md border border-border text-caption text-text-muted"
            >
              Cancel
            </button>
          )}
          {error && <p className="text-center text-caption text-destructive">{error}</p>}
        </div>

        {/* List — a management row, not a browsing tile: capped narrower than
            the page's .shell so rows stay a comfortable reading width. */}
        {loading ? (
          <div className="mx-auto h-16 w-full max-w-2xl animate-pulse rounded-lg bg-surface" />
        ) : list.length === 0 ? (
          <p className="mx-auto w-full max-w-2xl rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No custom exercises yet.
          </p>
        ) : (
          <ul className="mx-auto w-full max-w-2xl space-y-2">
            {list.map((ex) => (
              <li
                key={ex.id}
                className={`flex items-center justify-between gap-2 rounded-lg border p-3 ${
                  ex.archived_at ? 'border-dashed border-border bg-background' : 'border-border bg-surface'
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-body font-semibold ${
                      ex.archived_at ? 'text-text-faint line-through' : 'text-text-primary'
                    }`}
                  >
                    {ex.name}
                  </p>
                  <p className="truncate text-caption text-text-muted">
                    {[
                      ex.archived_at ? 'Archived' : null,
                      ex.muscle_group,
                      equipLabel(ex),
                      usageOf(ex) ? `in use by ${usageOf(ex)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {ex.archived_at ? (
                    <button type="button" onClick={() => restore(ex)} className="text-caption text-accent">
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(ex)}
                        aria-label={`Edit ${ex.name}`}
                        className="text-caption text-text-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(ex)}
                        aria-label={`Delete ${ex.name}`}
                        className="text-caption text-destructive"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Rename library moves (per-tenant aliases) */}
        <div className="mt-8">
          <p className="mb-1 text-label text-accent">RENAME AN EXERCISE</p>
          <p className="mb-3 text-caption text-text-muted">
            Call a library exercise whatever your gym calls it — changes the name only for you.
          </p>
          <input
            value={aliasQuery}
            onChange={(e) => setAliasQuery(e.target.value)}
            placeholder={`Search the ${SAMPLE_EXERCISES.length}-exercise library…`}
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
                <li className="px-1 text-caption text-text-faint">No library exercises match “{aliasQuery}”.</li>
              )}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
