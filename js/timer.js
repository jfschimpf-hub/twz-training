// Full-screen interval timer: hangboard repeaters, max hangs, 4x4 rests, mobility holds.
// Timing is computed from wall-clock timestamps so it stays accurate if the phone throttles.

let audio;
function beep(freq = 880, ms = 120, vol = 0.25) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* no audio */ }
}
function buzz(p) { try { navigator.vibrate?.(p); } catch { /* ignore */ } }

// Build a flat list of phases from a timer config.
export function buildPhases(cfg) {
  const ph = [];
  if (cfg.kind === 'intervals') {
    ph.push({ label: 'Get ready', secs: 10, type: 'prep' });
    for (let s = 1; s <= (cfg.sets || 1); s++) {
      for (let r = 1; r <= cfg.reps; r++) {
        const tag = `${cfg.sets > 1 ? `Set ${s}/${cfg.sets} · ` : ''}Rep ${r}/${cfg.reps}`;
        ph.push({ label: cfg.label || 'Work', secs: cfg.work, type: 'work', tag });
        const last = r === cfg.reps;
        if (!last) ph.push({ label: 'Rest', secs: cfg.rest, type: 'rest', tag });
        else if (s < cfg.sets) ph.push({ label: 'Set rest', secs: cfg.setRest, type: 'rest', tag: `Next: set ${s + 1}` });
      }
    }
  } else if (cfg.kind === 'manual') {
    for (let s = 1; s <= cfg.sets; s++) {
      ph.push({ label: cfg.label || 'Climb', secs: null, type: 'work', tag: `${s}/${cfg.sets}` });
      if (s < cfg.sets) ph.push({ label: 'Rest', secs: cfg.rest, type: 'rest', tag: `Next: ${s + 1}/${cfg.sets}` });
    }
  } else if (cfg.kind === 'holds') {
    ph.push({ label: 'Get ready', secs: 5, type: 'prep' });
    cfg.holds.forEach(([name, secs], i) => {
      ph.push({ label: name, secs, type: 'work', tag: `${i + 1}/${cfg.holds.length}` });
      if (i < cfg.holds.length - 1) ph.push({ label: 'Switch', secs: cfg.transition, type: 'rest', tag: `Next: ${cfg.holds[i + 1][0]}` });
    });
  } else if (cfg.kind === 'rest') {
    ph.push({ label: 'Rest', secs: cfg.rest, type: 'rest' });
  } else if (cfg.kind === 'stopwatch') {
    ph.push({ label: 'Get ready', secs: 5, type: 'prep' });
    ph.push({ label: 'Hang!', secs: null, type: 'work', stopwatch: true, tag: 'Tap "Done" when you let go' });
  }
  return ph;
}

export function openTimer(cfg, title, onFinish) {
  const phases = buildPhases(cfg);
  let i = 0, phaseStart = 0, pausedAt = null, raf = 0, lastBeep = -1, wakeLock = null, stopwatchResult = null;

  const el = document.createElement('div');
  el.className = 'timer';
  el.innerHTML = `
    <div class="timer-top"><span class="timer-title"></span><button class="icon-btn t-close" aria-label="Close timer">✕</button></div>
    <div class="timer-body">
      <div class="t-label"></div>
      <div class="t-time"></div>
      <div class="t-tag"></div>
      <div class="t-next"></div>
    </div>
    <div class="t-progress"><div></div></div>
    <div class="timer-controls">
      <button class="btn t-pause">Pause</button>
      <button class="btn primary t-skip">Skip</button>
    </div>`;
  el.querySelector('.timer-title').textContent = title;
  document.body.appendChild(el);

  const $ = (s) => el.querySelector(s);
  (async () => { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* ignore */ } })();

  function enter(idx) {
    i = idx; phaseStart = performance.now(); lastBeep = -1;
    if (i >= phases.length) return finish(true);
    const p = phases[i];
    el.dataset.type = p.type;
    $('.t-label').textContent = p.label;
    $('.t-tag').textContent = p.tag || '';
    const nxt = phases[i + 1];
    $('.t-next').textContent = nxt ? `Then: ${nxt.label}${nxt.secs ? ` · ${nxt.secs < 60 ? `${nxt.secs} s` : fmt(nxt.secs)}` : ''}` : 'Last one';
    $('.t-skip').textContent = p.secs == null ? 'Done ✓' : 'Skip';
    if (p.type === 'work') { beep(1200, 250); buzz(300); } else { beep(600, 200); buzz([100, 80, 100]); }
  }

  function tick() {
    const p = phases[i];
    if (!p) return;
    if (pausedAt == null) {
      const el_ = (performance.now() - phaseStart) / 1000;
      if (p.secs == null) {
        $('.t-time').textContent = fmt(Math.floor(el_));
        $('.t-progress > div').style.width = '0%';
      } else {
        const left = Math.max(0, p.secs - el_);
        const shown = Math.ceil(left);
        $('.t-time').textContent = fmt(shown);
        $('.t-progress > div').style.width = `${(el_ / p.secs) * 100}%`;
        if (shown <= 3 && shown > 0 && shown !== lastBeep) { lastBeep = shown; beep(880, 90, 0.18); }
        if (left <= 0) enter(i + 1);
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function finish(completed) {
    cancelAnimationFrame(raf);
    try { wakeLock?.release(); } catch { /* ignore */ }
    el.remove();
    if (completed) { beep(1320, 400); buzz([200, 100, 200, 100, 400]); }
    onFinish?.({ completed, stopwatch: stopwatchResult });
  }

  $('.t-close').onclick = () => finish(false);
  $('.t-pause').onclick = () => {
    if (pausedAt == null) { pausedAt = performance.now(); $('.t-pause').textContent = 'Resume'; el.classList.add('paused'); }
    else { phaseStart += performance.now() - pausedAt; pausedAt = null; $('.t-pause').textContent = 'Pause'; el.classList.remove('paused'); }
  };
  $('.t-skip').onclick = () => {
    const p = phases[i];
    if (p?.stopwatch) stopwatchResult = Math.round((performance.now() - phaseStart) / 1000);
    if (pausedAt != null) $('.t-pause').click();
    enter(i + 1);
  };

  // Unlock audio on the opening tap.
  beep(1, 1, 0);
  enter(0);
  raf = requestAnimationFrame(tick);
}

function fmt(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return m ? `${m}:${String(r).padStart(2, '0')}` : String(r);
}

export function describeTimer(cfg) {
  if (cfg.kind === 'intervals') return `${cfg.work}s on / ${cfg.rest}s off × ${cfg.reps}${cfg.sets > 1 ? ` × ${cfg.sets} sets` : ''}`;
  if (cfg.kind === 'manual') return `${cfg.sets} rounds, ${Math.round(cfg.rest / 60)} min rest`;
  if (cfg.kind === 'holds') return `${cfg.holds.length} timed holds`;
  if (cfg.kind === 'stopwatch') return 'Stopwatch';
  return 'Rest timer';
}
