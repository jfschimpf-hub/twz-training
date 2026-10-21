# TWZ Training

Personal training app (installable web app / PWA) for:

1. Onsighting **Time Wave Zero** (El Potrero Chico) — fly in Jan 16, 2027
2. A **pistol squat** on both legs
3. Routinely **flashing crimpy 12c** in the gym

No build step, no dependencies — plain HTML/CSS/JS. All data is stored on the phone (export backups from ⚙︎ Settings).

## Files

- `js/plan.js` — the whole training program (phases, sessions, finger-pain rules, pistol levels)
- `js/app.js` — screens: Today, Plan, Log, Progress, TWZ, Settings
- `js/timer.js` — full-screen interval timer (hangs, repeaters, 4x4 rests, mobility holds)
- `js/charts.js` — progress charts
- `js/store.js` — on-device storage, backup export/import
- `sw.js` — offline cache (bump `VERSION` after changing files)

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Put it on your phone (GitHub Pages)

1. Create a new **public** repo on GitHub, e.g. `twz-training`.
2. Push this folder to it.
3. Repo → Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. After a minute it's live at `https://<your-username>.github.io/twz-training/`.
5. Open that link in **Chrome on Android** → ⋮ menu → **Add to Home screen / Install app**.

It then works offline. When the app is updated, open it once while online to pick up the new version.
