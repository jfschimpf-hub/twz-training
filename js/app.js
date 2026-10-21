import {
  dayPlan, weekDays, phaseOf, todayStr, addDays, daysBetween, toUTC, fingerStatus, fmtAdded,
  FINGER_MODS, PHASES, PHASE_INFO, PISTOL_LEVELS, PISTOL_RULE, ROUTE_GRADES, BOULDER_GRADES,
  FLY_DATE,
} from './plan.js';
import { db, save, add, remove, exportJSON, importJSON } from './store.js';
import { openTimer, describeTimer } from './timer.js';
import { lineChart } from './charts.js';

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const fmtDate = (d, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(toUTC(d)).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
const ret = () => db().settings.returnDate;
// Latest logged bodyweight drives the hangboard targets; falls back to the plan's 200 lb.
const bw = () => db().weights.at(-1)?.lb ?? db().settings.bodyweight;
const TYPE_ICON = { climb: '🧗', test: '📏', optional: '➕', run: '🏃', rest: '😴', mobility: '🧘', trip: '🇲🇽' };

function toast(msg) {
  const t = h(`<div class="toast">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ---------------- Router ----------------
function route() {
  const hash = location.hash.slice(2) || 'today';
  const [name, arg] = hash.split('/');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (name === 'day' ? 'plan' : name)));
  view.innerHTML = '';
  window.scrollTo(0, 0);
  ({ today: () => renderDay(todayStr(), true), day: () => renderDay(arg), plan: () => renderPlan(arg), log: renderLog, progress: renderProgress, weight: renderWeight, twz: renderTWZ, settings: renderSettings }[name] || (() => renderDay(todayStr(), true)))();
  renderCountdown();
}
window.addEventListener('hashchange', route);

function renderCountdown() {
  const n = daysBetween(todayStr(), FLY_DATE);
  $('#countdown').textContent = n > 0 ? `${n} days to Potrero` : n === 0 ? 'Fly day!' : 'Post-trip';
}

// ---------------- Day view ----------------
function renderDay(d, isToday = false) {
  const p = dayPlan(d, ret(), bw());
  const data = db();
  const checks = data.checks[d] ||= {};
  const finger = data.fingers[d];
  const pain = finger ? Math.max(finger.L ?? 0, finger.R ?? 0) : null;
  const status = fingerStatus(pain);
  const hasFingerWork = p.blocks.some((b) => b.finger);
  const session = data.sessions.find((s) => s.date === d);

  const head = h(`<section class="day-head">
    <div class="row between">
      <button class="icon-btn" data-nav="-1" aria-label="Previous day">‹</button>
      <div class="center">
        <div class="eyebrow">${isToday ? 'Today · ' : ''}${fmtDate(d)}</div>
        <div class="chips"><span class="chip" style="--c:${PHASES[p.phase].color}">${esc(p.phaseName)}</span>${p.week ? `<span class="chip ghost">Week ${p.week}${p.cycle ? ` · cycle ${p.cycle}` : ''}</span>` : ''}</div>
      </div>
      <button class="icon-btn" data-nav="1" aria-label="Next day">›</button>
    </div>
    <h1>${TYPE_ICON[p.type] || ''} ${esc(p.title)}</h1>
    <details class="phase-info"><summary>Why this phase?</summary><p>${esc(PHASE_INFO[p.phase])}</p></details>
  </section>`);
  head.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { location.hash = `#/day/${addDays(d, +b.dataset.nav)}`; });
  view.appendChild(head);

  if (hasFingerWork) {
    const card = h(`<section class="card finger-check ${status || ''}">
      <h2>Finger check</h2>
      <p class="muted small">Pull gently on a half crimp. Worst finger, 0–10.</p>
      ${['L', 'R'].map((side) => `<div class="pain-row"><span>${side === 'L' ? 'Left' : 'Right'}</span>
        <div class="pain-scale" data-side="${side}">${Array.from({ length: 11 }, (_, i) => `<button class="${finger?.[side] === i ? 'on' : ''} ${i <= 2 ? 'g' : i <= 4 ? 'y' : 'r'}" data-v="${i}">${i}</button>`).join('')}</div></div>`).join('')}
      ${status ? `<p class="banner ${status}">${status === 'green' ? '✅ Good to go — session as written.' : (status === 'yellow' ? '⚠️ ' : '⛔ ') + esc(FINGER_MODS[status].banner)}</p>` : ''}
    </section>`);
    card.querySelectorAll('.pain-scale').forEach((sc) => sc.querySelectorAll('button').forEach((b) => b.onclick = () => {
      data.fingers[d] = { ...(data.fingers[d] || {}), [sc.dataset.side]: +b.dataset.v };
      save(); route();
    }));
    view.appendChild(card);
  }

  for (const b of p.blocks) view.appendChild(blockCard(b, d, checks, status));

  if (p.type !== 'rest' || p.blocks.length) {
    const done = p.blocks.filter((b) => checks[b.id]).length;
    const fin = h(`<section class="card finish">
      <h2>${session ? 'Session saved ✓' : 'Finish session'}</h2>
      <p class="muted small">${done}/${p.blocks.length} blocks checked off</p>
      <label>How hard was it overall? (RPE 1–10)
        <div class="rpe">${Array.from({ length: 10 }, (_, i) => `<button data-v="${i + 1}" class="${session?.rpe === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div></label>
      <label>Notes<textarea rows="3" placeholder="What felt good, what gave out first, finger notes…">${esc(session?.notes)}</textarea></label>
      <button class="btn primary wide save-session">${session ? 'Update' : 'Save session'}</button>
    </section>`);
    let rpe = session?.rpe;
    fin.querySelectorAll('.rpe button').forEach((b) => b.onclick = () => { rpe = +b.dataset.v; fin.querySelectorAll('.rpe button').forEach((x) => x.classList.toggle('on', x === b)); });
    fin.querySelector('.save-session').onclick = () => {
      const rec = { date: d, title: p.title, rpe, notes: fin.querySelector('textarea').value.trim(), done: Object.keys(checks).filter((k) => checks[k]), pain };
      if (session) Object.assign(session, rec), save(); else add('sessions', rec);
      toast('Session saved'); route();
    };
    view.appendChild(fin);
  }
}

function blockCard(b, d, checks, status) {
  const mod = status && status !== 'green' && b.finger ? FINGER_MODS[status][b.finger] : null;
  const skip = mod && /^SKIP/.test(mod);
  const last = b.log === 'hang' && b.hang ? lastHang(b.hang.grip, b.hang.seconds) : null;
  const card = h(`<section class="card block ${checks[b.id] ? 'done' : ''} ${skip ? 'skipped' : ''}">
    <div class="row top">
      <button class="check" aria-label="Mark done">${checks[b.id] ? '✓' : ''}</button>
      <div class="grow">
        <h3>${esc(b.name)}</h3>
        <div class="rx">${esc(b.rx)}</div>
        ${mod ? `<div class="mod ${status}">${esc(mod)}</div>` : ''}
        ${last ? `<div class="small muted">Last logged: ${fmtAdded(last.added)} on ${fmtDate(last.date, { month: 'short', day: 'numeric' })}</div>` : ''}
      </div>
    </div>
    ${b.detail ? `<details><summary>How</summary><p>${esc(b.detail).replace(/\n/g, '<br>')}</p></details>` : ''}
    ${b.items ? `<ul class="items">${b.items.map((it) => `<li><details><summary><b>${esc(it.name)}</b> <span class="rx">${esc(it.rx)}</span></summary>${it.how ? `<p>${esc(it.how)}</p>` : ''}</details></li>`).join('')}</ul>` : ''}
    <div class="row actions"></div>
  </section>`);
  card.querySelector('.check').onclick = () => { checks[b.id] = !checks[b.id]; save(); card.classList.toggle('done', checks[b.id]); card.querySelector('.check').textContent = checks[b.id] ? '✓' : ''; };
  const actions = card.querySelector('.actions');
  if (b.timer && !skip) {
    const t = h(`<button class="btn"><span>⏱</span> Timer <span class="muted small">${esc(describeTimer(b.timer))}</span></button>`);
    t.onclick = () => openTimer(b.timer, b.name, (res) => {
      if (res.completed && !checks[b.id]) card.querySelector('.check').click();
      if (b.log === 'hang' && (res.completed || res.stopwatch)) openLogSheet('hang', d, { ...b.hang, ...(last && b.hang.useLast ? { added: last.added } : {}), ...(res.stopwatch ? { seconds: res.stopwatch } : {}) });
    });
    actions.appendChild(t);
  }
  if (b.log && !skip) {
    const label = { hang: '＋ Log hangs', sends: '＋ Log climbs', pistol: '＋ Log pistol level', mobility: '＋ Log mobility test' }[b.log];
    const l = h(`<button class="btn">${label}</button>`);
    l.onclick = () => openLogSheet(b.log, d, b.hang ? { ...b.hang, ...(last && b.hang.useLast ? { added: last.added } : {}) } : undefined);
    actions.appendChild(l);
  }
  if (!actions.children.length) actions.remove();
  return card;
}

function lastHang(grip, seconds) {
  return [...db().hangs].reverse().find((x) => x.grip === grip && x.seconds === seconds);
}

// ---------------- Log sheets ----------------
function sheet(title, body, onSave, { again = false } = {}) {
  const el = h(`<div class="sheet-wrap"><div class="sheet" role="dialog" aria-label="${esc(title)}">
    <div class="row between"><h2>${esc(title)}</h2><button class="icon-btn close" aria-label="Close">✕</button></div>
    <form></form>
    <div class="row gap">${again ? '<button class="btn again">Save + another</button>' : ''}<button class="btn primary grow ok">Save</button></div>
  </div></div>`);
  const form = el.querySelector('form');
  form.innerHTML = body;
  form.onsubmit = (e) => e.preventDefault();
  const close = () => el.remove();
  el.querySelector('.close').onclick = close;
  // Only a tap that both starts and ends on the backdrop closes the sheet (avoids the opening tap closing it).
  let downOnBackdrop = false;
  el.onpointerdown = (e) => { downOnBackdrop = e.target === el; };
  el.onclick = (e) => { if (e.target === el && downOnBackdrop) close(); };
  el.querySelector('.ok').onclick = () => { if (onSave(new FormData(form), form) !== false) { close(); route(); } };
  el.querySelector('.again')?.addEventListener('click', () => { if (onSave(new FormData(form), form) !== false) { toast('Saved'); form.querySelector('[name=notes]') && (form.querySelector('[name=notes]').value = ''); } });
  document.body.appendChild(el);
  return el;
}

const dateField = (d) => `<label>Date<input type="date" name="date" value="${d}" required></label>`;
const opts = (list, sel) => list.map((g) => `<option ${g === sel ? 'selected' : ''}>${g}</option>`).join('');

function openLogSheet(kind, d = todayStr(), pre = {}) {
  if (kind === 'hang') {
    sheet('Log hangboard', `${dateField(d)}
      <div class="grid2">
        <label>Grip<select name="grip">${['half', 'open', 'full'].map((g) => `<option value="${g}" ${g === (pre.grip || 'half') ? 'selected' : ''}>${{ half: 'Half crimp', open: 'Open hand', full: 'Full crimp' }[g]}</option>`).join('')}</select></label>
        <label>Edge (mm)<input type="number" name="edge" value="${pre.edge ?? 20}" inputmode="numeric"></label>
        <label>Hang time (s)<input type="number" name="seconds" value="${pre.seconds ?? 10}" inputmode="numeric"></label>
        <label>Load vs bodyweight (lb)<input type="number" name="added" value="${pre.added ?? 0}" inputmode="numeric" step="any"></label>
      </div>
      <p class="small muted">Load: <b>+15</b> = 15 lb added, <b>−40</b> = 40 lb taken off with a pulley/feet. Log your best clean set.</p>
      <label class="inline"><input type="checkbox" name="test" ${pre.test ? 'checked' : ''}> This was a test / max effort</label>`,
    (f) => add('hangs', { date: f.get('date'), grip: f.get('grip'), edge: +f.get('edge'), seconds: +f.get('seconds'), added: +f.get('added'), test: !!f.get('test') }));
  } else if (kind === 'sends') {
    sheet('Log a climb', `${dateField(d)}
      <div class="seg" data-name="kind"><button type="button" class="on" data-v="route">Route</button><button type="button" data-v="boulder">Boulder</button></div>
      <div class="grid2">
        <label>Grade<select name="grade">${opts(ROUTE_GRADES, '11c')}</select></label>
        <label>Result<select name="style"><option value="onsight">Onsight ✓</option><option value="flash">Flash ✓</option><option value="redpoint">Redpoint ✓</option><option value="fail">Fell / didn't send</option></select></label>
      </div>
      <label class="inline"><input type="checkbox" name="crimpy" checked> Crimpy</label>
      <label>Notes<input name="notes" placeholder="optional"></label>`,
    (f, form) => add('sends', { date: f.get('date'), kind: form.querySelector('.seg .on').dataset.v, grade: f.get('grade'), style: f.get('style'), crimpy: !!f.get('crimpy'), notes: f.get('notes') }), { again: true });
    const seg = $('.sheet .seg');
    seg.querySelectorAll('button').forEach((b) => b.onclick = () => {
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      $('.sheet [name=grade]').innerHTML = b.dataset.v === 'route' ? opts(ROUTE_GRADES, '11c') : opts(BOULDER_GRADES, 'V4');
    });
  } else if (kind === 'pistol') {
    const cur = currentPistol();
    const lv = (sel) => PISTOL_LEVELS.map((l) => `<option value="${l.level}" ${l.level === sel ? 'selected' : ''}>${l.level}. ${l.name}</option>`).join('');
    sheet('Log pistol level', `${dateField(d)}
      <label>Left leg — highest level with clean reps<select name="L">${lv(cur.L || 1)}</select></label>
      <label>Right leg<select name="R">${lv(cur.R || 1)}</select></label>
      <label>Reps per set at that level<input type="number" name="reps" value="5" inputmode="numeric"></label>
      <p class="small muted">${esc(PISTOL_RULE)}</p>`,
    (f) => { add('pistols', { date: f.get('date'), leg: 'L', level: +f.get('L'), reps: +f.get('reps') }); add('pistols', { date: f.get('date'), leg: 'R', level: +f.get('R'), reps: +f.get('reps') }); });
  } else if (kind === 'mobility') {
    sheet('Log hip mobility test', `${dateField(d)}
      <p class="small muted">High foot: face the wall, toes touching. Place one foot on the wall as high as possible, hips staying close (no leaning back). Toe height in cm.<br>Straddle: seated, legs wide and straight, heel-to-heel in cm.</p>
      <div class="grid2">
        <label>High foot — left (cm)<input type="number" name="footL" inputmode="numeric"></label>
        <label>High foot — right (cm)<input type="number" name="footR" inputmode="numeric"></label>
        <label>Straddle width (cm)<input type="number" name="straddle" inputmode="numeric"></label>
      </div>`,
    (f) => add('mobility', { date: f.get('date'), footL: +f.get('footL') || null, footR: +f.get('footR') || null, straddle: +f.get('straddle') || null }));
  }
}

function currentPistol() {
  const out = {};
  for (const p of db().pistols) out[p.leg] = p.level;
  return out;
}

// ---------------- Plan view ----------------
function renderPlan(arg) {
  const today = todayStr();
  const anchor = arg || today;
  const days = weekDays(anchor, ret(), bw());
  const data = db();

  // Phase timeline from plan start to return date.
  const start = '2026-10-21', end = ret();
  const span = daysBetween(start, end);
  const segs = [];
  for (let i = 0, cur = null; i <= span; i++) {
    const ph = phaseOf(addDays(start, i), end).phase;
    if (!cur || cur.ph !== ph) { cur = { ph, n: 0, from: addDays(start, i) }; segs.push(cur); }
    cur.n++;
  }
  const pos = Math.min(100, Math.max(0, (daysBetween(start, today) / span) * 100));
  view.appendChild(h(`<section class="card">
    <h2>The road to Time Wave Zero</h2>
    <div class="timeline">${segs.map((s) => `<div style="flex:${s.n};background:${PHASES[s.ph].color}" title="${PHASES[s.ph].name}"></div>`).join('')}<span class="now" style="left:${pos}%"></span></div>
    <ul class="phase-list">${segs.map((s) => `<li><i style="background:${PHASES[s.ph].color}"></i><b>${PHASES[s.ph].name}</b> <span class="muted small">${fmtDate(s.from, { month: 'short', day: 'numeric' })} – ${fmtDate(addDays(s.from, s.n - 1), { month: 'short', day: 'numeric' })}</span></li>`).join('')}
      <li><i style="background:${PHASES.post.color}"></i><b>${PHASES.post.name}</b> <span class="muted small">after you're home, ongoing</span></li></ul>
  </section>`));

  const wk = h(`<section class="card">
    <div class="row between">
      <button class="icon-btn" data-w="-7" aria-label="Previous week">‹</button>
      <h2>${days[0].week ? `Week ${days[0].week}` : 'Intro week'} <span class="muted small">${fmtDate(days[0].date, { month: 'short', day: 'numeric' })}–${fmtDate(days[6].date, { month: 'short', day: 'numeric' })}</span></h2>
      <button class="icon-btn" data-w="7" aria-label="Next week">›</button>
    </div>
    <ul class="week">${days.map((p) => {
      const done = data.sessions.some((s) => s.date === p.date);
      return `<li class="${p.date === today ? 'today' : ''} ${p.date < today ? 'past' : ''}"><a href="#/day/${p.date}">
        <span class="dow">${fmtDate(p.date, { weekday: 'short' })}<br><small>${fmtDate(p.date, { day: 'numeric' })}</small></span>
        <span class="grow"><b>${TYPE_ICON[p.type] || ''} ${esc(p.title)}</b><br><small class="muted">${esc(p.phaseName)}</small></span>
        ${done ? '<span class="ok">✓</span>' : ''}</a></li>`;
    }).join('')}</ul>
  </section>`);
  wk.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { location.hash = `#/plan/${addDays(days[0].date, +b.dataset.w)}`; });
  view.appendChild(wk);
}

// ---------------- Log view ----------------
function renderLog() {
  const data = db();
  const q = h(`<section class="card"><h2>Quick log</h2><div class="quick">
    <button class="btn" data-k="sends">🧗 Climb</button><button class="btn" data-k="hang">🤏 Hangs</button>
    <button class="btn" data-k="pistol">🦵 Pistol</button><button class="btn" data-k="mobility">🧘 Mobility</button></div></section>`);
  q.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => openLogSheet(b.dataset.k));
  view.appendChild(q);

  const items = [
    ...data.sessions.map((x) => ({ list: 'sessions', x, text: `📋 <b>${esc(x.title)}</b>${x.rpe ? ` · RPE ${x.rpe}` : ''}${x.pain != null ? ` · fingers ${x.pain}/10` : ''}${x.notes ? `<br><span class="muted">${esc(x.notes)}</span>` : ''}` })),
    ...data.sends.map((x) => ({ list: 'sends', x, text: `🧗 <b>${esc(x.grade)}</b> ${x.kind === 'boulder' ? 'boulder' : 'route'} · ${({ onsight: 'onsight ✓', flash: 'flash ✓', redpoint: 'redpoint ✓', fail: 'fell' })[x.style]}${x.crimpy ? ' · crimpy' : ''}${x.notes ? ` · <span class="muted">${esc(x.notes)}</span>` : ''}` })),
    ...data.hangs.map((x) => ({ list: 'hangs', x, text: `🤏 ${x.grip === 'half' ? 'Half crimp' : x.grip === 'open' ? 'Open hand' : 'Full crimp'} ${x.edge}mm · ${x.seconds}s @ ${fmtAdded(x.added)}${x.test ? ' · <b>test</b>' : ''}` })),
    ...data.pistols.map((x) => ({ list: 'pistols', x, text: `🦵 ${x.leg === 'L' ? 'Left' : 'Right'} pistol: level ${x.level} (${esc(PISTOL_LEVELS[x.level - 1]?.name)})` })),
    ...data.mobility.map((x) => ({ list: 'mobility', x, text: `🧘 High foot L ${x.footL ?? '–'} / R ${x.footR ?? '–'} cm · straddle ${x.straddle ?? '–'} cm` })),
  ].sort((a, b) => b.x.date.localeCompare(a.x.date));

  const sec = h(`<section class="card"><h2>History</h2>${items.length ? '' : '<p class="muted">Nothing logged yet. Log from a session or with the buttons above.</p>'}<ul class="feed"></ul></section>`);
  const ul = sec.querySelector('.feed');
  let lastDate = '';
  for (const it of items) {
    if (it.x.date !== lastDate) { ul.appendChild(h(`<li class="date">${fmtDate(it.x.date)}</li>`)); lastDate = it.x.date; }
    const li = h(`<li><span class="grow">${it.text}</span><button class="icon-btn del" aria-label="Delete">🗑</button></li>`);
    li.querySelector('.del').onclick = () => { if (confirm('Delete this entry?')) { remove(it.list, it.x.id); route(); } };
    ul.appendChild(li);
  }
  view.appendChild(sec);
}

// ---------------- Progress view ----------------
const gIdx = (g) => ROUTE_GRADES.indexOf(g);

function weekKey(d) { return addDays(d, -((new Date(toUTC(d)).getUTCDay() + 6) % 7)); }

function renderProgress() {
  const data = db();
  const today = todayStr();
  const flashes = data.sends.filter((s) => s.kind === 'route' && s.crimpy && (s.style === 'flash' || s.style === 'onsight'));
  const recent = flashes.filter((s) => daysBetween(s.date, today) <= 30);
  const bestRecent = recent.reduce((m, s) => Math.max(m, gIdx(s.grade)), -1);
  const halfMax = data.hangs.filter((x) => x.grip === 'half' && x.seconds === 10 && x.edge === 20);
  const bestHang = halfMax.reduce((m, x) => Math.max(m, x.added), -Infinity);
  const pistol = currentPistol();
  const mob = data.mobility[data.mobility.length - 1];

  view.appendChild(h(`<section class="tiles">
    <div class="tile"><span class="label">Crimpy flash (30 d)</span><span class="big">${bestRecent >= 0 ? ROUTE_GRADES[bestRecent] : '—'}</span><span class="small muted">goal: 12c routinely</span></div>
    <div class="tile"><span class="label">Max hang 20 mm ½</span><span class="big">${isFinite(bestHang) ? (bestHang >= 0 ? '+' : '−') + Math.abs(bestHang) : '—'}<small> lb</small></span><span class="small muted">10 s, best ever</span></div>
    <div class="tile"><span class="label">Pistol level</span><span class="big">L${pistol.L ?? '–'} · R${pistol.R ?? '–'}</span><span class="small muted">goal: 7 / 7</span></div>
    <div class="tile"><span class="label">High foot</span><span class="big">${mob ? `${mob.footL ?? '–'}/${mob.footR ?? '–'}` : '—'}<small> cm</small></span><span class="small muted">L / R, latest test</span></div>
  </section>`));

  // Weekly best crimpy flash
  const byWeek = {};
  for (const s of flashes) { const k = weekKey(s.date); byWeek[k] = Math.max(byWeek[k] ?? -1, gIdx(s.grade)); }
  const flashPts = Object.entries(byWeek).sort().map(([x, y]) => ({ x, y, label: ROUTE_GRADES[y] }));
  const lo = flashPts.length ? Math.min(gIdx('11a'), ...flashPts.map((p) => p.y)) : 0;
  const gradeTicks = [];
  for (let i = lo; i <= gIdx('12d'); i++) gradeTicks.push(i);
  chartCard('Best crimpy flash/onsight per week', 'Routes only. The 12c line is the goal.', lineChart({ series: [{ name: 'Flash', points: flashPts }], yTicks: gradeTicks, yFormat: (v) => ROUTE_GRADES[v] ?? '', goal: { y: gIdx('12c'), label: 'goal 12c' }, emptyText: 'Log flashes/onsights (tagged crimpy) to see this.' }));

  const hangPts = halfMax.map((x) => ({ x: x.date, y: x.added, label: fmtAdded(x.added) + (x.test ? ' (test)' : '') }));
  chartCard('Half-crimp 10 s hang load', `lb relative to bodyweight (${bw()} lb). Negative = assisted.`, lineChart({ series: [{ name: 'Load', points: hangPts }], yFormat: (v) => (v > 0 ? '+' : '') + v, emptyText: 'Log 10 s half-crimp hangs on 20 mm to see this.' }));

  const pp = (leg) => data.pistols.filter((p) => p.leg === leg).map((p) => ({ x: p.date, y: p.level, label: `L${p.level}` }));
  chartCard('Pistol progression', 'Level 7 = full pistol.', lineChart({ series: [{ name: 'Left', points: pp('L') }, { name: 'Right', points: pp('R') }], yTicks: [1, 2, 3, 4, 5, 6, 7], step: true, emptyText: 'Log your pistol level to see this.' }));

  const mp = (k) => data.mobility.filter((m) => m[k]).map((m) => ({ x: m.date, y: m[k], label: `${m[k]} cm` }));
  chartCard('High-foot height', 'cm, higher is better.', lineChart({ series: [{ name: 'Left', points: mp('footL') }, { name: 'Right', points: mp('footR') }], emptyText: 'Do the hip mobility test (week 1, 6, 11).' }));
  chartCard('Straddle width', 'cm, wider is better.', lineChart({ series: [{ name: 'Straddle', points: mp('straddle') }], emptyText: 'Do the hip mobility test.' }));

  const painPts = Object.entries(data.fingers).sort().map(([x, v]) => ({ x, y: Math.max(v.L ?? 0, v.R ?? 0), label: `L ${v.L ?? '–'} / R ${v.R ?? '–'}` }));
  chartCard('Finger pain (worst finger)', '0–2 fine · 3–4 modify · 5+ stop.', lineChart({ series: [{ name: 'Pain', points: painPts }], yTicks: [0, 2, 4, 6, 8, 10], emptyText: 'Fill in the finger check before sessions.' }));

  view.appendChild(h(`<section class="card"><h2>Pistol levels</h2><ol class="levels">${PISTOL_LEVELS.map((l) => `<li><b>${esc(l.name)}</b><br><span class="small muted">${esc(l.detail)}</span></li>`).join('')}</ol><p class="small muted">${esc(PISTOL_RULE)}</p></section>`));
}

// ---------------- Weight view ----------------
function avg7(list, d) {
  const win = list.filter((w) => w.date <= d && daysBetween(w.date, d) < 7);
  return win.reduce((t, w) => t + w.lb, 0) / win.length;
}

function renderWeight() {
  const list = db().weights;
  const today = todayStr();
  const latest = list.at(-1);
  const first = list[0];
  const r1 = (n) => Math.round(n * 10) / 10;
  const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(r1(n))}`;

  const entry = h(`<section class="card">
    <h2>Log bodyweight</h2>
    <div class="row gap weight-entry">
      <input type="date" name="date" value="${today}" aria-label="Date">
      <input type="number" name="lb" inputmode="decimal" step="0.1" placeholder="lb" aria-label="Weight in pounds" value="${latest ? latest.lb : ''}">
      <button class="btn primary">Save</button>
    </div>
    <p class="small muted">Weigh in at the same time of day (e.g. mornings) for the most comparable numbers. Your latest weight updates the "lb on fingers" hangboard targets.</p>
  </section>`);
  entry.querySelector('button').onclick = () => {
    const date = entry.querySelector('[name=date]').value;
    const lb = parseFloat(entry.querySelector('[name=lb]').value);
    if (!date || !(lb > 50 && lb < 500)) { toast('Enter a weight in lb'); return; }
    const existing = list.find((w) => w.date === date);
    if (existing) { existing.lb = lb; save(); } else add('weights', { date, lb });
    toast('Saved'); route();
  };
  view.appendChild(entry);

  if (latest) {
    const recentAvg = avg7(list, latest.date);
    view.appendChild(h(`<section class="tiles">
      <div class="tile"><span class="label">Latest</span><span class="big">${r1(latest.lb)}<small> lb</small></span><span class="small muted">${fmtDate(latest.date, { month: 'short', day: 'numeric' })}</span></div>
      <div class="tile"><span class="label">7-day average</span><span class="big">${r1(recentAvg)}<small> lb</small></span><span class="small muted">smooths daily swings</span></div>
      <div class="tile"><span class="label">Since first entry</span><span class="big">${signed(latest.lb - first.lb)}<small> lb</small></span><span class="small muted">from ${fmtDate(first.date, { month: 'short', day: 'numeric' })}</span></div>
      <div class="tile"><span class="label">Weigh-ins</span><span class="big">${list.length}</span><span class="small muted">total</span></div>
    </section>`));
  }

  const daily = list.map((w) => ({ x: w.date, y: w.lb, label: `${r1(w.lb)} lb` }));
  const rolling = list.map((w) => ({ x: w.date, y: r1(avg7(list, w.date)), label: `${r1(avg7(list, w.date))} lb` }));
  chartCard('Bodyweight', 'Dots are weigh-ins; the line is the 7-day average.', lineChart({
    series: [{ name: 'Weigh-in', points: daily, dotsOnly: true }, { name: '7-day avg', points: rolling, lineOnly: true }],
    yFormat: (v) => v, emptyText: 'Log your first weigh-in above.',
  }));

  const hist = h(`<section class="card"><h2>History</h2>${list.length ? '' : '<p class="muted">No weigh-ins yet.</p>'}<ul class="feed"></ul></section>`);
  for (const w of [...list].reverse()) {
    const li = h(`<li><span class="grow">${fmtDate(w.date)}</span><b>${r1(w.lb)} lb</b><button class="icon-btn del" aria-label="Delete">🗑</button></li>`);
    li.querySelector('.del').onclick = () => { if (confirm('Delete this weigh-in?')) { remove('weights', w.id); route(); } };
    hist.querySelector('.feed').appendChild(li);
  }
  view.appendChild(hist);
}

function chartCard(title, sub, chart) {
  const c = h(`<section class="card"><h2>${esc(title)}</h2><p class="small muted">${esc(sub)}</p></section>`);
  c.appendChild(chart);
  view.appendChild(c);
}

// ---------------- TWZ view ----------------
function renderTWZ() {
  const data = db();
  const n = daysBetween(todayStr(), FLY_DATE);
  view.appendChild(h(`<section class="card hero">
    <div class="eyebrow">El Potrero Chico · Nuevo León</div>
    <h1>Time Wave Zero</h1>
    <p>Long, bolted limestone multi-pitch. Mostly 5.10–5.11 with crimpy 5.12a cruxes.</p>
    <div class="big-count">${n > 0 ? n : 0}<small> days until you fly</small></div>
    <a class="small" href="https://www.mountainproject.com/route/106087605/time-wave-zero" target="_blank" rel="noopener">Mountain Project page ↗</a>
  </section>`));

  view.appendChild(h(`<section class="card"><h2>Onsight game plan</h2><ul class="tips">
    <li><b>Read every pitch from the belay</b> — same 2-minute routine you practise on Thursdays: clips, rests, crux, shake spots.</li>
    <li><b>Climb the 5.10s like warm-ups.</b> Open hand where you can; save half crimps for when you need them.</li>
    <li><b>Shake early, shake often.</b> Every decent hold on a long route is a chance to get pump back.</li>
    <li><b>Eat every 2–3 pitches, drink at every belay.</b> Use what you tested on simulation days.</li>
    <li><b>Hips in on the stems.</b> That's what the frog and 90/90 work was for.</li>
    <li><b>Fall forward, not off.</b> If you blow the onsight on a pitch, rest on the bolt, then send it clean to the anchor — the day still counts.</li>
  </ul></section>`));

  const pitches = h(`<section class="card"><h2>Your pitch notes</h2><p class="small muted">Fill in from the topo and your own beta research. Saved on your phone automatically.</p><ol class="pitches"></ol>
    <div class="row gap"><button class="btn add-p">＋ Pitch</button><button class="btn rm-p">− Pitch</button></div></section>`);
  const ol = pitches.querySelector('.pitches');
  for (const p of data.pitches) {
    const li = h(`<li><div class="row gap"><b>P${p.n}</b><input class="pg" placeholder="grade" value="${esc(p.grade)}"></div><textarea rows="1" placeholder="notes, crux, rests…">${esc(p.notes)}</textarea></li>`);
    li.querySelector('.pg').onchange = (e) => { p.grade = e.target.value; save(); };
    li.querySelector('textarea').onchange = (e) => { p.notes = e.target.value; save(); };
    ol.appendChild(li);
  }
  pitches.querySelector('.add-p').onclick = () => { data.pitches.push({ n: data.pitches.length + 1, grade: '', notes: '' }); save(); route(); };
  pitches.querySelector('.rm-p').onclick = () => { if (data.pitches.length && confirm('Remove the last pitch?')) { data.pitches.pop(); save(); route(); } };
  view.appendChild(pitches);
}

// ---------------- Settings ----------------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });

function renderSettings() {
  const s = db().settings;
  const el = h(`<div>
    <section class="card"><h2>Settings</h2>
      <label>Trip return date<input type="date" name="returnDate" value="${s.returnDate}"></label>
      <p class="small muted">The 12c flash block starts 3 days after you get home.</p>
      <div class="grid2"><label>Weekday session time<input type="time" name="sessionTime" value="${s.sessionTime}"></label>
      <label>Weekend session time<input type="time" name="weekendTime" value="${s.weekendTime || '09:00'}"></label></div>
      <p class="small muted">Used for the calendar reminders.</p>
      <button class="btn primary save">Save settings</button>
    </section>
    <section class="card"><h2>Reminders</h2>
      <p class="small">Add every session to your calendar, with a 30-minute alert. Calendar alerts work even when this app is closed.</p>
      <button class="btn ics">📅 Download calendar file (.ics)</button>
      <p class="small muted">On Android: open the file and pick Google Calendar. If that doesn't work, go to calendar.google.com on a computer → Settings → Import.</p>
    </section>
    <section class="card"><h2>Backup</h2>
      <p class="small">Your data is only on this phone. Export a backup now and then (e.g. to Google Drive).</p>
      <div class="row gap"><button class="btn exp">⬇️ Export backup</button><label class="btn">⬆️ Import<input type="file" accept="application/json,.json" hidden class="imp"></label></div>
    </section>
    <section class="card"><h2>Install</h2>
      <p class="small">Chrome menu ⋮ → <b>Add to Home screen</b> / <b>Install app</b>. It then works offline like a normal app.</p>
      ${installPrompt ? '<button class="btn primary inst">Install now</button>' : ''}
    </section>
  </div>`);
  el.querySelector('.save').onclick = () => {
    s.returnDate = el.querySelector('[name=returnDate]').value || s.returnDate;
    s.sessionTime = el.querySelector('[name=sessionTime]').value || s.sessionTime;
    s.weekendTime = el.querySelector('[name=weekendTime]').value || s.weekendTime;
    save(); toast('Saved');
  };
  el.querySelector('.exp').onclick = () => download(`twz-training-backup-${todayStr()}.json`, exportJSON(), 'application/json');
  el.querySelector('.imp').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { if (confirm('Replace all data on this phone with this backup?')) { importJSON(await f.text()); toast('Backup restored'); route(); } }
    catch (err) { alert('Could not import: ' + err.message); }
  };
  el.querySelector('.ics').onclick = () => download('twz-training.ics', buildICS(), 'text/calendar');
  el.querySelector('.inst')?.addEventListener('click', async () => { installPrompt.prompt(); installPrompt = null; });
  view.appendChild(el);
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h(`<a href="${url}" download="${name}"></a>`);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildICS() {
  const s = db().settings;
  const icsEsc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fold = (line) => { const cp = Array.from(line), out = []; for (let i = 0; i < cp.length; i += 60) out.push(cp.slice(i, i + 60).join('')); return out.join('\r\n '); };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TWZ Training//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:TWZ Training'];
  let d = todayStr();
  const end = addDays(s.returnDate, 3 + 12 * 7);
  for (; d <= end; d = addDays(d, 1)) {
    const p = dayPlan(d, s.returnDate, bw());
    if (!['climb', 'test', 'optional'].includes(p.type)) continue;
    const ymd = d.replace(/-/g, '');
    const wkend = [0, 6].includes(new Date(toUTC(d)).getUTCDay());
    const [hh, mm] = (wkend ? s.weekendTime || '09:00' : s.sessionTime).split(':').map(Number);
    const t0 = `${ymd}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
    const endMin = hh * 60 + mm + 105;
    const t1 = `${ymd}T${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`;
    const desc = p.blocks.map((b) => `• ${b.name} — ${b.rx}`).join('\n');
    lines.push('BEGIN:VEVENT', `UID:twz-${ymd}@twz-training`, `DTSTAMP:${stamp}`, `DTSTART:${t0}`, `DTEND:${t1}`,
      fold(`SUMMARY:${icsEsc(`${TYPE_ICON[p.type]} ${p.title}`)}`), fold(`DESCRIPTION:${icsEsc(desc)}`),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Training session', 'TRIGGER:-PT30M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------------- Boot ----------------
$('#settings-btn').onclick = () => { location.hash = '#/settings'; };
route();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
