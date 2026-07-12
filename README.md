# 行李放得下嗎？ / Will my luggage fit?

A single-page web app: pick a rental car, add your suitcases, and see whether they
fit — with a 3D packing diagram. Taiwan rental-fleet focused, bilingual (繁中 / English).

## How to run

**Option A — just open it.** Double-click `index.html`. Everything works offline except
the 3D view (Three.js loads from a CDN). If you have no internet, it falls back to the 2D view.

**Option B — local server (recommended, avoids any browser file:// quirks):**

```bash
cd "3.荷物2"
python3 -m http.server 8777
# then open http://localhost:8777
```

## Project structure

```
index.html        layout + loads Three.js (CDN) and the app scripts
css/styles.css     styling
data/cars.js       real Okinawa rental fleet — official exterior specs + derived cargo boxes
js/i18n.js         bilingual strings (zh-TW / en)
js/packing.js      3D bin-packing engine (extreme-point + first-fit-decreasing)
js/viewer.js       3D (Three.js) + 2D canvas rendering
js/app.js          UI wiring
```

## How the fit check works

- A boot is modelled as a rectangular **usable box** (cm). Suitcases are boxes too.
- The packer places bags largest-first, trying upright / laid-flat / rotated orientations,
  respects the **boot aperture** (a too-tall bag won't go through the opening), and never
  overlaps bags.
- Verdict: **Fits** / **Tight ⚠️** (placed but >62% full — real boots are curved, leave margin)
  / **Won't fit ❌**.

## Car data — real Okinawa rental fleet

`data/cars.js` holds **20 real models** rented in Okinawa (Toyota / Nissan-weighted, plus
common kei / EV), based on the OTS Okinawa fleet class list. For each car the **exterior
dimensions (length × width × height), wheelbase, seats and rows are OFFICIAL maker figures**
(toyota.jp / nissan.co.jp / honda.co.jp / suzuki.co.jp), stored in centimetres.

- The 3D/2D **car shape is drawn from these real exterior dimensions + body type**, so a Yaris
  looks like a small hatch, a Roomy like a tall wagon, an Alphard like a big MPV, a Hiace like a van.
- The **interior cargo box** used for packing is *derived* from the real exterior + body type
  (makers publish VDA litres, not a usable rectangle), so it stays a sensible estimate — the
  `confidence` flag stays `medium`. Custom-trunk override remains for any car not in the list.

Body types: kei-tall · compact-hatch · tall-wagon · liftback · compact-suv · suv ·
compact-minivan · minivan · large-minivan · van.

## Roadmap (from the agreed plan)

- [x] Phase 0–2: packing engine, core app, 3D + 2D views, bilingual
- [x] Phase 3: expanded car dataset (24 models — sedans, SUVs, EVs, minivans, van)
- [x] Phase 4: PWA (offline + installable via `manifest.json` + `sw.js`), save/share-image button
- [x] Custom-trunk override: pick "✏️ Enter my own trunk size…" to type any boot W×D×H +
      opening — works for any car not in the list, sidesteps the dataset entirely
- [x] Car silhouette views: class-based body shape (sedan = low body + raised cabin + trunk;
      SUV = tall box; van = long box), with wheels, the rear seat, and TRUNK / REAR SEAT /
      SEATS FOLDED labels so the boot vs cabin layout is obvious. Default view is the labelled
      2D top + side; toggle to 3D for a rotatable packing diagram.
- [x] 3D body rebuilt from REAL exterior dimensions + body type: beveled shell that is then
      SCULPTED in 3D (nose taper, roof tumblehome, rounded sills) so it reads as a real car, not
      a slab; tinted greenhouse windows flush with the tumblehome, multiple seat rows,
      wheelbase-accurate wheels with hubcaps at the body corners, soft lighting. 11 body types.
- [x] Dataset switched to the real Okinawa rental fleet with official exterior specs (this task).
- [ ] Phase 3+ : replace the *derived* interior cargo boxes with *measured* boot dimensions
- [ ] Phase 5 (needs a backend): user-submitted trunk measurements shared back to everyone

## Live mode (no Check button)

The result updates **automatically** on any change — add/remove a bag, change quantity, switch
brand/model, toggle fold-seats, or edit custom trunk dims. There is no "Check" button. On load
the selected car renders straight away (empty boot); add a bag and it packs instantly. The 2D/3D
canvas also re-labels when you switch language. Only a "Clear" button remains (empties the bags).

## Car picker

Two cascading selectors: **Brand** (Toyota / Nissan / Honda / Suzuki, + "✏️ Custom size")
→ **Model** (only that brand's cars). Both localise (繁中 / English) and stack vertically on
phones. Choosing "Custom size" hides the model list and shows the manual trunk W×D×H inputs.

## Mobile

Mobile is the priority device. The layout is single-column on phones with large touch
targets, 16px inputs (no iOS focus-zoom), a viewport-height 3D/2D viewer, and the labelled
2D view as the default (so swiping never gets trapped by the 3D rotate gesture). Breakpoints:
1-column ≤860px, phone tuning ≤600px. The 2D canvas redraws on rotate/resize.

## PWA notes

- Installable: open over http(s) and use the browser's "Add to Home Screen / Install".
- Offline: a service worker (`sw.js`) caches the app shell **and** the Three.js CDN files
  after first online load, so the 3D view keeps working offline afterwards.
- Save/share: the ⤓ button exports the current verdict + packing view as a PNG
  (uses the native share sheet on mobile, falls back to a file download on desktop).
