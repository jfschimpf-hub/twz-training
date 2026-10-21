// All data lives in localStorage on the phone. Export/import JSON for backups.
import { DEFAULT_RETURN, BODYWEIGHT } from './plan.js';

const KEY = 'twz-training.v1';

const EMPTY = () => ({
  settings: { bodyweight: BODYWEIGHT, returnDate: DEFAULT_RETURN, sessionTime: '17:30', weekendTime: '09:00' },
  fingers: {},   // date -> { L, R }
  checks: {},    // date -> { blockId: true }
  sessions: [],  // { id, date, title, rpe, notes, done: [blockId] }
  hangs: [],     // { id, date, grip, edge, seconds, added, test }
  sends: [],     // { id, date, kind: 'route'|'boulder', grade, style, crimpy, notes }
  pistols: [],   // { id, date, leg, level, reps }
  mobility: [],  // { id, date, footL, footR, straddle }
  weights: [],   // { id, date, lb }
  pitches: Array.from({ length: 23 }, (_, i) => ({ n: i + 1, grade: '', notes: '' })),
});

let data;
try { data = { ...EMPTY(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
catch { data = EMPTY(); }

export function db() { return data; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); }
}

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function add(list, item) {
  data[list].push({ id: uid(), ...item });
  data[list].sort((a, b) => a.date.localeCompare(b.date));
  save();
}

export function remove(list, id) {
  data[list] = data[list].filter((x) => x.id !== id);
  save();
}

export function exportJSON() {
  return JSON.stringify({ app: 'twz-training', version: 1, exported: new Date().toISOString(), data }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed.data ?? parsed;
  if (!incoming || !Array.isArray(incoming.sessions)) throw new Error('Not a TWZ training backup');
  data = { ...EMPTY(), ...incoming };
  save();
}

// Ask the browser not to evict our storage.
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
