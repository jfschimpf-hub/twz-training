// Tiny dependency-free SVG line charts with a crosshair tooltip.
import { toUTC } from './plan.js';

const W = 340, H = 180, PAD = { l: 40, r: 12, t: 12, b: 26 };

export function lineChart({ series, yFormat = (v) => v, yTicks, emptyText = 'No data yet', step = false, goal }) {
  const wrap = document.createElement('div');
  wrap.className = 'chart';
  const all = series.flatMap((s) => s.points);
  if (!all.length) { wrap.innerHTML = `<p class="muted chart-empty">${emptyText}</p>`; return wrap; }

  const xs = all.map((p) => toUTC(p.x));
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const ys = all.map((p) => p.y);
  let y0 = yTicks ? Math.min(...yTicks) : Math.min(...ys), y1 = yTicks ? Math.max(...yTicks) : Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const ticks = yTicks ?? niceTicks(y0, y1);
  y0 = Math.min(y0, ...ticks); y1 = Math.max(y1, ...ticks);

  const X = (ms) => PAD.l + ((ms - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (v) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for (const t of ticks) {
    svg += `<line class="grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(t)}" y2="${Y(t)}"/>`;
    svg += `<text class="axis" x="${PAD.l - 6}" y="${Y(t) + 4}" text-anchor="end">${yFormat(t)}</text>`;
  }
  const fmtD = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  svg += `<text class="axis" x="${PAD.l}" y="${H - 6}">${fmtD(x0)}</text>`;
  svg += `<text class="axis" x="${W - PAD.r}" y="${H - 6}" text-anchor="end">${fmtD(x1)}</text>`;

  if (goal) {
    svg += `<line class="goal" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(goal.y)}" y2="${Y(goal.y)}"/>`;
    svg += `<text class="goal-label" x="${W - PAD.r}" y="${Y(goal.y) - 4}" text-anchor="end">${goal.label}</text>`;
  }
  series.forEach((s, si) => {
    const pts = s.points.map((p) => [X(toUTC(p.x)), Y(p.y)]);
    if (pts.length > 1 && !s.dotsOnly) {
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let k = 1; k < pts.length; k++) d += step ? `H${pts[k][0]}V${pts[k][1]}` : `L${pts[k][0]},${pts[k][1]}`;
      svg += `<path class="line" style="stroke:var(--series-${si + 1})" d="${d}"/>`;
    }
    if (!s.lineOnly) for (const [x, y] of pts) svg += `<circle class="dot" style="fill:var(--series-${si + 1})" cx="${x}" cy="${y}" r="4"/>`;
  });
  svg += `<line class="cross" y1="${PAD.t}" y2="${H - PAD.b}" x1="-10" x2="-10"/>`;
  svg += `<rect class="hit" x="${PAD.l}" y="0" width="${W - PAD.l - PAD.r}" height="${H}" fill="transparent"/></svg>`;

  wrap.innerHTML = svg + '<div class="tip" hidden></div>';
  if (series.length > 1) {
    const leg = document.createElement('div');
    leg.className = 'legend';
    leg.innerHTML = series.map((s, si) => `<span><i style="background:var(--series-${si + 1})"></i>${s.name}</span>`).join('');
    wrap.prepend(leg);
  }

  // Crosshair tooltip: snap to the nearest date that has data.
  const svgEl = wrap.querySelector('svg'), tip = wrap.querySelector('.tip'), cross = wrap.querySelector('.cross');
  const dates = [...new Set(all.map((p) => p.x))].sort();
  function show(ev) {
    const r = svgEl.getBoundingClientRect();
    const mx = ((ev.clientX - r.left) / r.width) * W;
    let best = dates[0], bd = Infinity;
    for (const d of dates) { const dx = Math.abs(X(toUTC(d)) - mx); if (dx < bd) { bd = dx; best = d; } }
    const cx = X(toUTC(best));
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
    const rows = series.map((s, si) => {
      const p = [...s.points].reverse().find((q) => q.x === best);
      return p ? `<div>${series.length > 1 ? `<i style="background:var(--series-${si + 1})"></i>${s.name}: ` : ''}<b>${p.label ?? yFormat(p.y)}</b></div>` : '';
    }).join('');
    tip.innerHTML = `<div class="muted">${fmtD(toUTC(best))}</div>${rows}`;
    tip.hidden = false;
    const left = (cx / W) * r.width;
    tip.style.left = `${Math.min(Math.max(left - 60, 0), r.width - 130)}px`;
  }
  svgEl.addEventListener('pointermove', show);
  svgEl.addEventListener('pointerdown', show);
  svgEl.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('x1', -10); cross.setAttribute('x2', -10); });
  return wrap;
}

function niceTicks(a, b) {
  const span = b - a, raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= 5);
  const out = [];
  for (let v = Math.floor(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(6));
  if (out[out.length - 1] < b) out.push(out[out.length - 1] + step);
  return out;
}
