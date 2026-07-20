import { describe, it, expect } from 'vitest';
import { syncrofitRunUrl, SF_EQUIPMENT } from './syncrofit';
import { EQUIPMENT_ORDER } from './exercises';
import type { Exercise } from './database.types';
import type { WorkoutParams } from './profile';
import contract from '../contracts/syncrofit.json';

// Conformance: our SyncroFit integration must honor contracts/syncrofit.json (the
// vendored copy of SyncroFit's canonical integration-contract.json). This is the
// regression net that would have caught the missing-`webhook` bug — and fails the
// build the moment we drift from the published contract.

// Pin the contract version we built against. When `npm run sync:syncrofit` pulls a
// newer SyncroFit contract, THIS fails — forcing a deliberate review of what changed
// before bumping the pin.
const EXPECTED_CONTRACT_VERSION = 1;

type DecodedExercise = Record<string, unknown> & { requiredEquipment?: string[] };

interface DecodedCircuit {
  webhook?: string;
  id?: string;
  exercises: DecodedExercise[];
  [key: string]: unknown;
}

function decodeCircuit(url: string): DecodedCircuit {
  expect(url.startsWith('syncrofit://run?circuit=')).toBe(true);
  return JSON.parse(decodeURIComponent(url.replace('syncrofit://run?circuit=', ''))) as DecodedCircuit;
}

const ex = (name: string, equipment: string | null): Exercise => ({
  id: name,
  name,
  muscle_group: null,
  default_cue: null,
  equipment: equipment as Exercise['equipment'],
  image_url: null,
  created_at: '',
});

const params = {
  sets: 3,
  reps: 10,
  repSec: 4,
  holdSec: 40,
  restSec: 60,
  tempo: '3-1-1',
  setupSec: 25,
} as unknown as WorkoutParams;

describe('SyncroFit contract conformance', () => {
  it('builds against the pinned contract version', () => {
    expect(contract.version).toBe(EXPECTED_CONTRACT_VERSION);
  });

  it('every outbound circuit carries the webhook + id (the feedback loop)', () => {
    const c = decodeCircuit(syncrofitRunUrl('Test', [ex('Goblet Squat', 'dumbbell')], params, '', 'tok123'));
    expect(c.webhook).toMatch(/^https:\/\/.+\/api\/syncrofit\/events$/);
    expect(c.id).toBe('tok123');
  });

  it('only sends circuit fields the contract defines', () => {
    const allowed = new Set(Object.keys(contract.outbound.circuit.fields));
    const c = decodeCircuit(syncrofitRunUrl('Test', [ex('Push-Up', 'calisthenics')], params, '', 'x'));
    for (const key of Object.keys(c)) {
      expect(allowed, `circuit field "${key}" is not in the contract`).toContain(key);
    }
    for (const req of contract.outbound.circuit.required) {
      expect(c[req], `missing required circuit field "${req}"`).toBeDefined();
    }
  });

  it('only sends exercise fields the contract defines, incl. required ones', () => {
    const allowed = new Set(Object.keys(contract.outbound.circuit.exercise.fields));
    const c = decodeCircuit(syncrofitRunUrl('Test', [ex('Goblet Squat', 'dumbbell')], params, '', 'x'));
    const e0 = c.exercises[0];
    for (const key of Object.keys(e0)) {
      expect(allowed, `exercise field "${key}" is not in the contract`).toContain(key);
    }
    for (const req of contract.outbound.circuit.exercise.required) {
      expect(e0[req], `missing required exercise field "${req}"`).toBeDefined();
    }
  });

  it('maps every equipment type, to a value in the contract taxonomy or to none', () => {
    const taxonomy = new Set(contract.equipmentTaxonomy);
    for (const eq of EQUIPMENT_ORDER) {
      expect(SF_EQUIPMENT, `equipment "${eq}" has no SyncroFit mapping`).toHaveProperty(eq);
      const mapped = SF_EQUIPMENT[eq];
      if (mapped !== null) {
        expect(taxonomy, `"${mapped}" is not in the contract equipmentTaxonomy`).toContain(mapped);
      }
    }
  });

  it('sends requiredEquipment values only from the contract taxonomy', () => {
    const taxonomy = new Set(contract.equipmentTaxonomy);
    const c = decodeCircuit(
      syncrofitRunUrl('Test', EQUIPMENT_ORDER.map((eq) => ex(`${eq} move`, eq)), params, '', 'x'),
    );
    for (const e of c.exercises) {
      for (const req of e.requiredEquipment ?? []) {
        expect(taxonomy, `requiredEquipment "${req}" not in taxonomy`).toContain(req);
      }
    }
  });
});
