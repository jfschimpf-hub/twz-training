// The training program. Everything here is fixed and specific to one climber:
// 200 lb, 12b redpoint, flashes crimpy 11d, ~30s bodyweight hang on 20mm,
// mild (2/10) half-crimp tweaks on one finger per hand, climbs Tue/Thu/weekend,
// trail runs Mon/Wed. Goal: onsight Time Wave Zero (fly in Jan 16, 2027),
// pistol squat both legs, routinely flash crimpy 12c in the gym.

export const BODYWEIGHT = 200;
export const PLAN_START = '2026-10-26'; // Monday of week 1
export const FLY_DATE = '2027-01-16';
export const DEFAULT_RETURN = '2027-01-30';

export const PHASES = {
  intro:    { name: 'Intro & baseline', color: 'var(--ph-intro)' },
  base:     { name: 'Base', color: 'var(--ph-base)' },
  strength: { name: 'Strength', color: 'var(--ph-strength)' },
  specific: { name: 'TWZ specific', color: 'var(--ph-specific)' },
  peak:     { name: 'Peak', color: 'var(--ph-peak)' },
  taper:    { name: 'Taper', color: 'var(--ph-taper)' },
  trip:     { name: 'Trip — Potrero', color: 'var(--ph-trip)' },
  post:     { name: '12c flash block', color: 'var(--ph-post)' },
};

export const PHASE_INFO = {
  intro: 'Find your starting numbers so every later target is yours, not a guess.',
  base: 'Let the finger tweaks settle while tendons adapt to sub-max hangboarding. Build crimp volume, start the daily hip routine and pistol progressions.',
  strength: 'Max hangs and limit crimp bouldering. This is where your finger strength jumps — most climbers who have never hangboarded gain a lot here.',
  specific: 'Turn strength into TWZ fitness: onsight reading, repeaters, and full-length multi-pitch simulations in the gym.',
  peak: 'Keep intensity, cut volume. Re-test.',
  taper: 'Arrive fresh. Short, sharp, easy. Nothing new.',
  trip: 'Go climb it. Warm up properly, fuel, keep up the hips.',
  post: 'Four-week cycles aimed at routinely flashing crimpy 12c: max hangs, limit crimping, and lots of one-shot flash attempts.',
};

export const PISTOL_LEVELS = [
  { level: 1, name: 'Box pistol — knee height', detail: 'Sit back onto a knee-height box/chair on one leg, stand up on one leg. Free leg out in front.' },
  { level: 2, name: 'Box pistol — mid-shin', detail: 'Same, box about 30 cm (stack of plates, low step).' },
  { level: 3, name: 'Box pistol — low', detail: 'Box about 20 cm. Control the descent — no plopping.' },
  { level: 4, name: 'Counterweight pistol', detail: 'Full depth holding a 10–20 lb plate/DB straight out in front for balance.' },
  { level: 5, name: 'Assisted pistol', detail: 'Full depth, light fingertip help from a rail, rope or TRX. Use as little as possible.' },
  { level: 6, name: 'Eccentric pistol', detail: 'Lower for 5 s to full depth with no help; use hands to stand back up.' },
  { level: 7, name: 'Full pistol', detail: 'Bodyweight, no help, both directions. Goal reached!' },
];
export const PISTOL_RULE = 'Move up a level when you can do 3 × 5 clean reps on that leg. Legs can be on different levels — train the weaker one first.';

// ---------- Timer presets ----------
const T = {
  tendon: (reps) => ({ kind: 'intervals', work: 10, rest: 50, reps, sets: 1, label: 'Hang' }),
  maxHang: (reps) => ({ kind: 'intervals', work: 10, rest: 180, reps, sets: 1, label: 'Hang' }),
  repeaters: (sets) => ({ kind: 'intervals', work: 7, rest: 3, reps: 6, sets, setRest: 180, label: 'Hang' }),
  fourByFour: { kind: 'manual', sets: 4, rest: 240, label: 'Climb 4 problems' },
  laps: (sets, rest) => ({ kind: 'manual', sets, rest, label: 'Climb' }),
  rest: (secs) => ({ kind: 'rest', rest: secs }),
};

// ---------- Shared blocks ----------
const HIP_ROUTINE = {
  id: 'hips',
  name: 'Daily hips, abs & pistol routine',
  rx: '~18 min · hips + abs',
  detail: 'Every single day. Consistency matters far more than intensity — never stretch into sharp pain. The ab moves need a bar; on days you\'re not at the gym, use the floor versions.',
  items: [
    { name: '90/90 hip switches', rx: '2 × 8 slow', how: 'Sit with both knees bent 90°, rotate both knees to the other side without hands. Builds internal/external rotation for drop knees and turning in.' },
    { name: 'Cossack squats', rx: '2 × 6 / side', how: 'Wide stance, shift into one deep side squat, other leg straight with toes up. Strength at the end of range — great for stemming.' },
    { name: 'Frog stretch', rx: '2 × 60 s', how: 'On knees and forearms, knees wide, ankles in line with knees. Gently rock hips back. This is the "hips into the wall" position.' },
    { name: 'Couch stretch', rx: '60 s / side', how: 'Back knee against a wall/couch, front foot forward, squeeze glute. Opens hip flexors that running tightens — key for high steps.' },
    { name: 'Pigeon', rx: '60 s / side', how: 'Front shin across, back leg long, fold forward.' },
    { name: 'Deep squat hold', rx: '60 s', how: 'Heels down, elbows push knees out. Hold something if needed.' },
    { name: 'Seated straight-leg lifts', rx: '2 × 8 / side', how: 'Sit tall, legs straight. Lift one heel off the floor with no lean back, hold 2 s. Active flexibility for high steps and holding the free leg in a pistol.' },
    { name: 'Pistol practice', rx: '3 × 3–5 / leg', how: 'At your current pistol level using a chair, couch or stair. Skip on gym leg days.' },
    { name: 'Single-leg balance on toes', rx: '30 s / leg', how: 'Rise onto the ball of the foot, eyes on one spot.' },
    { name: 'Hanging leg raises', rx: '3 × 8–12', how: 'From a bar, legs as straight as you can, raise to at least hip height without swinging. Lower slowly. No bar: lying leg raises, lower back pressed into the floor. Use ab straps if your fingers are sore.' },
    { name: 'Hanging knee twists', rx: '3 × 8–12', how: 'From a bar, pull your knees up and across toward one elbow, alternating sides — obliques for keeping your hips in on steep moves. No bar: lie on your back, knees bent at 90°, and lower them side to side (windshield wipers).' },
  ],
  timer: { kind: 'holds', holds: [
    ['Frog stretch', 60], ['Frog stretch', 60],
    ['Couch stretch — left', 60], ['Couch stretch — right', 60],
    ['Pigeon — left', 60], ['Pigeon — right', 60],
    ['Deep squat hold', 60],
    ['Balance — left', 30], ['Balance — right', 30],
  ], transition: 10 },
};

const WARMUP = {
  id: 'warmup', name: 'Warm-up', rx: '15 min',
  detail: '5 min easy movement (rower/bike/jog + arm circles). 4–6 easy climbs building to ~V2 / 10c. Open-hand first, half crimp last. Note how the tweaked fingers feel.',
};

const HANG_WARMUP = {
  id: 'hangwarm', name: 'Hangboard warm-up', rx: '6 × 10 s, building',
  detail: '20 mm edge, feet on the floor or a heavy pulley assist. Start very light and build to roughly the first working load. Open hand, then half crimp.',
  timer: T.tendon(6),
};

const PAIN_RULE = 'Pain rule: ≤2/10 during and no worse the next morning → carry on. 3–4/10 → open-hand only and drop 20 lb. 5+/10 → stop fingers for the day.';

function legs(phase) {
  const heavy = phase === 'strength' || phase === 'post';
  return {
    id: 'legs', name: 'Legs: pistol strength', rx: heavy ? '~20 min · heavy' : '~20 min',
    log: 'pistol',
    items: [
      { name: 'Pistol progression', rx: heavy ? '4 × 4 / leg' : '3 × 5 / leg', how: 'At your current level (see Progress → Pistol levels). Weaker leg first. ' + PISTOL_RULE },
      { name: 'Bulgarian split squat', rx: heavy ? '4 × 6 / leg, heavy DBs' : '3 × 8 / leg, moderate DBs', how: 'Rear foot on a bench. Deep, controlled. The main strength builder for a 200 lb pistol.' },
      { name: 'Single-leg RDL', rx: '3 × 8 / leg', how: 'Light-moderate DB. Hip hinge + balance.' },
    ],
  };
}

// ---------- Day sessions by phase ----------
// Each returns { title, focus, type, blocks[] }. `w` = week within phase (1-based).

function tueBase(w, bw) {
  const remOpen = [60, 50, 40][w - 1];
  const remHalf = [80, 70, 60][w - 1];
  return {
    title: 'Fingers + crimp volume + legs', type: 'climb',
    blocks: [WARMUP, HANG_WARMUP,
      { id: 'tendon-open', name: 'Tendon hangs — open hand (3-finger drag)', rx: `6 × 10 s on / 50 s off · bodyweight −${remOpen} lb (${bw - remOpen} lb on fingers)`,
        detail: `Sub-max on purpose: it should feel like a 6/10 effort. Use a pulley/weight-assist, or keep toes on a box to take weight off. Builds tendon tolerance while the tweaks settle. ${PAIN_RULE}`,
        timer: T.tendon(6), log: 'hang', hang: { grip: 'open', edge: 20, seconds: 10, added: -remOpen }, finger: 'hang' },
      { id: 'tendon-half', name: 'Tendon hangs — half crimp', rx: `4 × 10 s on / 50 s off · bodyweight −${remHalf} lb (${bw - remHalf} lb on fingers)`,
        detail: `Light. This is the grip that tweaks — you're teaching the tissue to tolerate it. ${PAIN_RULE}`,
        timer: T.tendon(4), log: 'hang', hang: { grip: 'half', edge: 20, seconds: 10, added: -remHalf }, finger: 'hang' },
      { id: 'board', name: 'Board: crimp volume (Kilter/Tension)', rx: '40 min · 10–15 problems, 2–3 grades below your max',
        detail: 'Crimpy problems you can do in 1–2 goes. 2–3 min rest. Quality movement, precise feet, hips close to the wall. No max-effort pulling on small crimps yet.',
        finger: 'board', log: 'sends' },
      legs('base'),
    ],
  };
}

function thuOnsight(phase, w) {
  const range = { base: '11a–11d', strength: '11c–12a', specific: '11c–12b', peak: '11c–12a', post: '12a–12c' }[phase];
  const n = phase === 'peak' ? 4 : phase === 'specific' ? 6 : 5;
  const blocks = [WARMUP,
    { id: 'onsight', name: 'Onsight practice (lead)', rx: `${n} routes you haven't climbed · ${range} · one go each`,
      detail: 'Before each: 2-minute ground read — find the clips, the rests, the crux, and where you\'ll shake. Then climb it once, onsight style (no beta, no hangs). Crimpy routes first. Log every attempt — this builds your flash-grade chart.',
      log: 'sends', finger: 'lead' },
  ];
  if (phase === 'strength' || phase === 'specific' || phase === 'post') {
    blocks.push({ id: 'flashgo', name: 'Flash attempt at the edge', rx: phase === 'post' ? '1–2 fresh crimpy 12c/12d' : '1 fresh crimpy 12a/12b',
      detail: 'Your stretch flash attempt for the 12c goal. Rest 10 min first. Read it like it\'s your only go — because it is.', log: 'sends', finger: 'lead' });
  }
  blocks.push({ id: 'volume', name: 'Mileage', rx: phase === 'base' ? '4 routes 10c–11a' : '3 routes 10c–11a',
    detail: 'Smooth, efficient, practice shaking out on every decent hold. Keep hips in and feet precise — rehearse what you\'ll do on 20+ pitches.', finger: 'lead' });
  return { title: phase === 'post' ? 'Flash practice day' : 'Lead: onsight practice', type: 'climb', blocks };
}

function satBase(w) {
  return {
    title: 'Endurance laps + strength', type: 'climb',
    blocks: [WARMUP,
      { id: 'laps', name: 'Route laps', rx: `${2 + w} sets × 2 laps back-to-back · 10d–11b · 5 min rest`,
        detail: 'Keep the pump at 5/10 or less — this maintains your already-good endurance. Crimpy routes, practise clipping and shaking efficiently.',
        timer: T.laps(2 + w, 300), finger: 'lead' },
      { id: 'weights', name: 'Pull + antagonist', rx: '~25 min',
        items: [
          { name: 'Weighted pull-ups', rx: '4 × 5', how: 'Moderate load, full range.' },
          { name: 'DB bench or push-ups', rx: '3 × 10', how: 'Shoulder health / antagonist.' },
          { name: 'Reverse wrist curls + finger extensors', rx: '2 × 15', how: 'Rubber band or light DB. Elbow insurance.' },
          { name: 'Side plank', rx: '2 × 30 s / side', how: '' },
        ] },
    ],
  };
}

function sunOptional(phase) {
  if (phase === 'specific') {
    return { title: 'Optional: 4×4 power endurance', type: 'optional', blocks: [WARMUP,
      { id: '4x4', name: '4×4 on set boulders', rx: '4 sets of 4 problems back-to-back · 4 min rest',
        detail: 'Crimpy problems ~3–4 grades below your limit. Pumped by set 3 is right. Skip this if you feel beat up — rest is better than junk.',
        timer: T.fourByFour, finger: 'board' }] };
  }
  return { title: 'Optional: easy flash boulders or rest', type: 'optional', blocks: [WARMUP,
    { id: 'flashboulders', name: 'Flash boulders', rx: '45 min · new crimpy set problems, one look each',
      detail: 'Read before you pull on, then one go. Good practice for onsight decision-making with no fear factor. Totally fine to skip and rest.', log: 'sends', finger: 'board' }] };
}

function tueStrength(w, globalWeek) {
  if (globalWeek === 6) return testDay('Benchmark tests (week 6)');
  const startAdd = { 1: 0, 2: 5, 4: 10 }[w] ?? 0;
  return {
    title: 'Max hangs + limit crimping + legs', type: 'climb',
    blocks: [WARMUP, HANG_WARMUP,
      { id: 'max-half', name: 'Max hangs — half crimp', rx: `5 × 10 s · 3 min rest · ${fmtAdded(startAdd)}`,
        detail: `Aim to finish each hang with ~3 s left in the tank. If the first rep feels harder than that, take 10 lb off. If all 5 felt solid and pain stayed ≤2, add 5 lb next time. ${PAIN_RULE}`,
        timer: T.maxHang(5), log: 'hang', hang: { grip: 'half', edge: 20, seconds: 10, added: startAdd }, finger: 'hang' },
      { id: 'max-open', name: 'Max hangs — open hand', rx: `3 × 10 s · 3 min rest · ${fmtAdded(startAdd + 10)}`,
        detail: 'Open hand (3-finger drag) usually tolerates more load. Same 3-s-in-reserve rule.',
        timer: T.maxHang(3), log: 'hang', hang: { grip: 'open', edge: 20, seconds: 10, added: startAdd + 10 }, finger: 'hang' },
      { id: 'limit', name: 'Limit crimp bouldering (Kilter/Tension 40°)', rx: '45 min · 4–6 hard problems · 3–4 min rest',
        detail: 'Crimpy problems that take 1–5 tries. Full effort, full rest. Stop when you stop pulling at 100% — usually 45 min.',
        finger: 'board', log: 'sends' },
      legs('strength'),
    ],
  };
}

function satStrength() {
  return {
    title: 'Power endurance + strength', type: 'climb',
    blocks: [WARMUP,
      { id: '4x4', name: '4×4 on set boulders', rx: '4 sets of 4 problems back-to-back · 4 min rest',
        detail: 'Crimpy problems ~3–4 grades below your limit, no rest between problems within a set. Pumped and slightly sloppy by set 4 is right.',
        timer: T.fourByFour, finger: 'board' },
      { id: 'weights', name: 'Pull + antagonist', rx: '~25 min',
        items: [
          { name: 'Weighted pull-ups', rx: '5 × 3 heavy', how: 'Hard but clean.' },
          { name: 'DB bench or push-ups', rx: '3 × 8', how: '' },
          { name: 'Reverse wrist curls + finger extensors', rx: '2 × 15', how: '' },
        ] },
    ],
  };
}

function tueSpecific() {
  return {
    title: 'Repeaters + board + legs', type: 'climb',
    blocks: [WARMUP, HANG_WARMUP,
      { id: 'max-half', name: 'Max hangs — half crimp (maintain)', rx: '3 × 10 s · 3 min rest · your recent max hang load',
        detail: 'Just enough to hold onto the strength you built. ' + PAIN_RULE,
        timer: T.maxHang(3), log: 'hang', hang: { grip: 'half', edge: 20, seconds: 10, added: 10, useLast: true }, finger: 'hang' },
      { id: 'repeaters', name: 'Repeaters — half crimp', rx: '5 sets × 6 reps of 7 s on / 3 s off · 3 min between sets · bodyweight −25 lb',
        detail: 'This is the TWZ grip: sustained crimping. The last 1–2 sets should be hard. If you fail early, take 10 more lb off. If set 5 feels easy, take less off next time.',
        timer: T.repeaters(5), log: 'hang', hang: { grip: 'half', edge: 20, seconds: 7, added: -25 }, finger: 'hang' },
      { id: 'board', name: 'Board: crimp circuits', rx: '30 min · 6 problems 2 grades below max',
        detail: 'Climb each twice with 2 min rest. Crisp, accurate, no thrutching.', finger: 'board', log: 'sends' },
      { ...legs('specific'), rx: '~15 min · maintain' },
    ],
  };
}

function satSim(globalWeek) {
  const pitches = { 8: 15, 9: 20, 10: 23 }[globalWeek] ?? 12;
  return {
    title: `TWZ simulation: ${pitches} pitches`, type: 'climb',
    blocks: [WARMUP,
      { id: 'sim', name: `Multi-pitch simulation — ${pitches} "pitches"`, rx: `${pitches} routes · mostly 10b–11b · 3–4 routes 11c–12a in the second half`,
        detail: 'Treat each route as a pitch: 3–5 min "belay change" between them, no long breaks. Put your hardest routes late so you practice cruxes tired — like the real thing. Eat and drink exactly what you plan to bring on the wall. Pick routes you haven\'t done recently. Log the hard ones.',
        timer: T.laps(pitches, 240), log: 'sends', finger: 'lead' },
      { id: 'notes', name: 'Note what gave out first', rx: 'fingers? calves? feet? head?',
        detail: 'Write it in the session notes when you finish — it tells us what to tweak in the last weeks.' },
    ],
  };
}

function testDay(title) {
  return {
    title, type: 'test',
    blocks: [WARMUP, HANG_WARMUP,
      { id: 'test-hang', name: 'Max hang test — 20 mm half crimp', rx: '10 s, find your heaviest load',
        detail: 'Start at bodyweight. Rest 3 min, add 5–10 lb, repeat until you can\'t hold 10 s or pain goes above 2/10. Log the heaviest clean 10 s. No more than 6 attempts.',
        timer: T.maxHang(6), log: 'hang', hang: { grip: 'half', edge: 20, seconds: 10, added: 0, test: true }, finger: 'hang' },
      { id: 'test-pistol', name: 'Pistol test', rx: 'Highest level with 3 × 5 clean, each leg', detail: 'Log both legs.', log: 'pistol' },
      { id: 'test-mob', name: 'Hip mobility test', rx: 'High-foot height + straddle width',
        detail: 'High foot: stand facing a wall, toes touching it. Lift one foot and place it on the wall as high as you can with your hips staying close to the wall (no leaning back). Measure toe height from the floor in cm. Both legs.\nStraddle: sit with legs as wide as you can, knees straight, back upright. Measure heel-to-heel distance in cm.',
        log: 'mobility' },
      { id: 'test-board', name: 'Easy board to finish', rx: '20 min', detail: 'Moderate crimp problems. No limit attempts after testing.', finger: 'board' },
    ],
  };
}

function introDay(dateStr) {
  switch (dateStr) {
    case '2026-10-21': return { title: 'Start: learn the hip routine', type: 'mobility', blocks: [
      { id: 'intro', name: 'Learn the routine', rx: 'Today: just the hips routine', detail: 'Read through every move. Find your pistol starting level: sit to a chair on one leg and stand back up. If you can, try a lower box. Log where you land for each leg.', log: 'pistol' }] };
    case '2026-10-22': {
      const t = testDay('Baseline tests');
      t.blocks[2] = { id: 'test-hang', name: 'Baseline hang — 20 mm half crimp at bodyweight', rx: 'One max-duration hang',
        detail: 'After the warm-up: hang at bodyweight on 20 mm half crimp for as long as you can (stop if pain > 2/10). Log the seconds. You estimated ~30 s.',
        timer: { kind: 'stopwatch' }, log: 'hang', hang: { grip: 'half', edge: 20, seconds: 30, added: 0, test: true }, finger: 'hang' };
      return t;
    }
    case '2026-10-24': return { title: 'Baseline flash test', type: 'test', blocks: [WARMUP,
      { id: 'flash-test', name: 'Flash pyramid (lead)', rx: 'New crimpy routes: 11b → 11c → 11d → 12a → 12b',
        detail: 'One go each on routes you haven\'t tried, 10 min rest between. Stop after two failures in a row. Log every attempt — this sets your starting flash grade.', log: 'sends', finger: 'lead' }] };
    default: return null;
  }
}

function taperDay(dow) {
  if (dow === 2) return { title: 'Taper: short and sharp', type: 'climb', blocks: [WARMUP, HANG_WARMUP,
    { id: 'max-half', name: 'Max hangs — half crimp', rx: '3 × 10 s at ~80% of your max · 3 min rest', detail: 'Stay sharp, don\'t dig a hole.', timer: T.maxHang(3), log: 'hang', hang: { grip: 'half', edge: 20, seconds: 10, added: 0, useLast: true }, finger: 'hang' },
    { id: 'board', name: 'A few fun boulders', rx: '20 min', detail: 'Nothing at your limit.', finger: 'board' }] };
  if (dow === 4) return { title: 'Taper: last gym session', type: 'climb', blocks: [WARMUP,
    { id: 'volume', name: 'Easy-moderate routes', rx: '6–8 routes 10b–11b + 1–2 onsight 11c', detail: 'Feel smooth. Rehearse your reading routine. Then go home and pack.', log: 'sends', finger: 'lead' }] };
  return null;
}

function postDay(dow, cycleWeek) {
  const deload = cycleWeek === 4;
  if (dow === 2) {
    if (deload) return testDay('Deload + benchmark tests');
    const t = tueStrength(cycleWeek === 1 ? 1 : cycleWeek === 2 ? 2 : 4, 0);
    t.blocks[2] = { ...t.blocks[2], rx: '5 × 10 s · 3 min rest · last max-hang load +5 lb if last session went well', hang: { ...t.blocks[2].hang, useLast: true } };
    t.blocks[3] = { ...t.blocks[3], rx: '3 × 10 s · 3 min rest · ~10 lb more than half crimp', hang: { ...t.blocks[3].hang, useLast: true } };
    return t;
  }
  if (dow === 4) {
    const t = thuOnsight('post', cycleWeek);
    if (deload) { t.title = 'Deload: flash practice (light)'; t.blocks = t.blocks.slice(0, 2); t.blocks[1] = { ...t.blocks[1], rx: '3 new routes 11d–12b · one go each' }; }
    return t;
  }
  if (dow === 6) {
    if (deload) return { title: 'Deload: easy mileage', type: 'climb', blocks: [WARMUP, { id: 'volume', name: 'Easy routes', rx: '6–8 routes 10b–11b', detail: 'Recover.', finger: 'lead' }] };
    return satStrength();
  }
  if (dow === 0) return sunOptional('post');
  return null;
}

function fmtAdded(n) { return n === 0 ? 'bodyweight' : n > 0 ? `bodyweight +${n} lb` : `bodyweight −${-n} lb`; }
export { fmtAdded };

// ---------- Date helpers ----------
export function toUTC(d) { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); }
export function fromUTC(ms) { const d = new Date(ms); return d.toISOString().slice(0, 10); }
export function addDays(d, n) { return fromUTC(toUTC(d) + n * 86400000); }
export function daysBetween(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }
export function dow(d) { return new Date(toUTC(d)).getUTCDay(); } // 0=Sun
export function todayStr() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; }

export function weekOf(d) { return Math.floor(daysBetween(PLAN_START, d) / 7) + 1; }

export function phaseOf(d, returnDate = DEFAULT_RETURN) {
  if (d < PLAN_START) return { phase: 'intro', week: 0, wip: 0 };
  if (d >= FLY_DATE && d <= returnDate) return { phase: 'trip', week: weekOf(d), wip: 0 };
  if (d > returnDate) {
    const postStart = addDays(returnDate, 3);
    const n = Math.max(0, daysBetween(postStart, d));
    const wk = Math.floor(n / 7);
    return { phase: d < postStart ? 'trip' : 'post', week: wk + 1, wip: (wk % 4) + 1, cycle: Math.floor(wk / 4) + 1 };
  }
  const w = weekOf(d);
  if (w <= 3) return { phase: 'base', week: w, wip: w };
  if (w <= 7) return { phase: 'strength', week: w, wip: w - 3 };
  if (w <= 10) return { phase: 'specific', week: w, wip: w - 7 };
  if (w === 11) return { phase: 'peak', week: w, wip: 1 };
  return { phase: 'taper', week: w, wip: 1 };
}

// Returns the full plan for a date.
export function dayPlan(d, returnDate = DEFAULT_RETURN, bw = BODYWEIGHT) {
  const p = phaseOf(d, returnDate);
  const wd = dow(d);
  let s = null;

  if (p.phase === 'intro') s = introDay(d);
  else if (p.phase === 'trip') {
    s = d === FLY_DATE
      ? { title: 'Travel day ✈️', type: 'rest', blocks: [{ id: 'travel', name: 'Fly to Monterrey', rx: 'Hips routine at the gate', detail: 'Hydrate. Walk around. Do the frog and couch stretch when you arrive.' }] }
      : { title: 'Potrero day', type: 'trip', blocks: [
          { id: 'rockwarm', name: 'Rock warm-up', rx: '2–3 easy pitches before anything hard', detail: 'Open hand first, then half crimp. Your fingers get the same warm-up as in the gym, every day.' },
          { id: 'tripnote', name: 'Rest days', rx: 'Every 2–3 climbing days', detail: 'Rest at least 1 full day before your TWZ attempt. Eat big the night before. Pre-hydrate. Start early — shade matters.' }] };
  } else if (p.phase === 'post') s = postDay(wd, p.wip);
  else if (p.phase === 'taper') s = taperDay(wd);
  else if (p.phase === 'peak') {
    if (wd === 2) s = testDay('Peak: benchmark tests');
    else if (wd === 4) s = thuOnsight('peak');
    else if (wd === 6) s = { title: 'Peak: 12-pitch day', type: 'climb', blocks: [WARMUP,
      { id: 'sim', name: 'Moderate multi-pitch simulation', rx: '12 routes 10b–11c · 3–4 min between', detail: 'Feel good, not wrecked. Practise eating and drinking on the go.', timer: T.laps(12, 210), log: 'sends', finger: 'lead' }] };
  } else {
    if (wd === 2) s = p.phase === 'base' ? tueBase(p.wip, bw) : p.phase === 'strength' ? tueStrength(p.wip, p.week) : tueSpecific();
    else if (wd === 4) s = thuOnsight(p.phase, p.wip);
    else if (wd === 6) s = p.phase === 'base' ? satBase(p.wip) : p.phase === 'strength' ? satStrength() : satSim(p.week);
    else if (wd === 0) s = sunOptional(p.phase);
  }

  if (!s) {
    if (wd === 1 || wd === 3) s = { title: 'Trail run + hips', type: 'run', blocks: [
      { id: 'run', name: 'Trail run', rx: p.phase === 'taper' || p.phase === 'trip' ? 'Short and easy' : 'Your usual — keep it mostly easy',
        detail: 'Easy aerobic running supports long days on the wall. Keep the day before a finger session easy-ish. Hip routine after the run, when you\'re warm.' }] };
    else s = { title: 'Rest + hips', type: 'rest', blocks: [] };
  }

  // Hip routine every day; on gym days the pistol item is covered by the legs block.
  if (p.phase !== 'trip' || d !== FLY_DATE) s.blocks = [...s.blocks, HIP_ROUTINE];
  return { date: d, ...p, ...s, phaseName: PHASES[p.phase].name };
}

export function weekDays(d, returnDate, bw) {
  const mondayOffset = (dow(d) + 6) % 7;
  const mon = addDays(d, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => dayPlan(addDays(mon, i), returnDate, bw));
}

// Finger-status modifications applied to blocks by their `finger` tag.
export function fingerStatus(pain) {
  if (pain == null) return null;
  if (pain <= 2) return 'green';
  if (pain <= 4) return 'yellow';
  return 'red';
}

export const FINGER_MODS = {
  yellow: {
    banner: 'Fingers are grumpy (3–4/10). Modified: open-hand only on the hangboard with 20 lb less, no small crimps on the board, pick routes with bigger holds.',
    hang: 'MODIFIED: use open hand instead of half crimp, and take 20 lb more off than written.',
    board: 'MODIFIED: open-hand / sloper problems only. No small crimps.',
    lead: 'MODIFIED: choose routes with bigger holds; back off any crimp that hurts.',
  },
  red: {
    banner: 'Fingers hurt (5+/10). No hangboard or board today — legs, hips and easy jugs only. If this lasts more than a week, see a hand therapist / PT.',
    hang: 'SKIP today.',
    board: 'SKIP today. Do the legs block and an extra round of the hips routine instead.',
    lead: 'Easy jug routes only (≤10c), or skip.',
  },
};

// ---------- Grades ----------
export const ROUTE_GRADES = ['5.9', '10a', '10b', '10c', '10d', '11a', '11b', '11c', '11d', '12a', '12b', '12c', '12d', '13a', '13b'];
export const BOULDER_GRADES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'];
