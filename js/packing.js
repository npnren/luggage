/*
 * 3D bin-packing engine (extreme-point heuristic + First-Fit-Decreasing).
 * All units cm. Coordinate axes: x=width(right), y=height(up), z=depth(into boot).
 *
 * window.packLuggage(cargoBoxes, opening, bags) -> {
 *   placements: [{ bag, x, y, z, sx, sy, sz }],   // sx/sy/sz = placed size after rotation
 *   leftover:   [bag],
 *   fillRatio:  0..1,
 *   capacityL:  number   // total container volume in litres
 * }
 *
 * Simplifications (intentional, conservative):
 *  - A bag must fit entirely within ONE cargo sub-box (it can't span two).
 *  - Boot modelled as boxes; "Tight" band in the UI absorbs real-world curvature.
 */
(function () {
  var EPS = 0.01;

  // Candidate orientations for a bag. Vertical axis is either h (upright) or,
  // if allowLieFlat, d (laid on its back). Horizontal footprint may rotate 90°.
  function orientations(bag) {
    var ors = [];
    function add(sx, sy, sz, tag) { ors.push({ sx: sx, sy: sy, sz: sz, tag: tag }); }
    // upright: height = h, footprint w×d
    add(bag.w, bag.h, bag.d, "upright");
    add(bag.d, bag.h, bag.w, "upright-rot");
    if (bag.allowLieFlat) {
      // flat: height = d (lying on its back), footprint w×h
      add(bag.w, bag.d, bag.h, "flat");
      add(bag.h, bag.d, bag.w, "flat-rot");
    }
    // de-dup identical footprints
    var seen = {}, out = [];
    for (var i = 0; i < ors.length; i++) {
      var k = ors[i].sx.toFixed(1) + "x" + ors[i].sy.toFixed(1) + "x" + ors[i].sz.toFixed(1);
      if (!seen[k]) { seen[k] = 1; out.push(ors[i]); }
    }
    return out;
  }

  // Can the bag pass through the boot aperture in some orientation?
  function passesOpening(bag, opening) {
    var dims = [bag.w, bag.d, bag.h].sort(function (a, b) { return a - b; }); // ascending
    var o = [opening.w, opening.h].sort(function (a, b) { return a - b; });
    // the two smallest bag dims form the cross-section pushed through
    return dims[0] <= o[1] + EPS && dims[1] <= o[1] + EPS && dims[0] <= o[0] + EPS;
  }

  function within(box, x, y, z, sx, sy, sz) {
    return x + EPS >= box.ox && y + EPS >= box.oy && z + EPS >= box.oz &&
      x + sx <= box.ox + box.w + EPS &&
      y + sy <= box.oy + box.h + EPS &&
      z + sz <= box.oz + box.d + EPS;
  }

  function overlaps(p, x, y, z, sx, sy, sz) {
    return x < p.x + p.sx - EPS && x + sx > p.x + EPS &&
      y < p.y + p.sy - EPS && y + sy > p.y + EPS &&
      z < p.z + p.sz - EPS && z + sz > p.z + EPS;
  }

  function fitsAt(cargoBoxes, placed, x, y, z, sx, sy, sz) {
    var inside = false;
    for (var b = 0; b < cargoBoxes.length; b++) {
      if (within(cargoBoxes[b], x, y, z, sx, sy, sz)) { inside = true; break; }
    }
    if (!inside) return false;
    for (var i = 0; i < placed.length; i++) {
      if (overlaps(placed[i], x, y, z, sx, sy, sz)) return false;
    }
    return true;
  }

  window.packLuggage = function (cargoBoxes, opening, bags) {
    // capacity
    var capacityCm3 = 0;
    for (var c = 0; c < cargoBoxes.length; c++) {
      capacityCm3 += cargoBoxes[c].w * cargoBoxes[c].d * cargoBoxes[c].h;
    }

    // expand qty + sort by volume desc (FFD)
    var queue = bags.slice().sort(function (a, b) {
      return (b.w * b.d * b.h) - (a.w * a.d * a.h);
    });

    var placed = [];
    var leftover = [];
    // seed anchors at each cargo box origin
    var anchors = cargoBoxes.map(function (box) { return { x: box.ox, y: box.oy, z: box.oz }; });

    function anchorKey(a) { return a.x.toFixed(1) + "," + a.y.toFixed(1) + "," + a.z.toFixed(1); }

    for (var q = 0; q < queue.length; q++) {
      var bag = queue[q];
      var done = false;

      if (!passesOpening(bag, opening)) { leftover.push(bag); continue; }

      // prefer low (y), then deep/back (z), then left (x) — stable floor-up packing
      anchors.sort(function (a, b) {
        return (a.y - b.y) || (a.z - b.z) || (a.x - b.x);
      });

      var ors = orientations(bag);
      for (var a = 0; a < anchors.length && !done; a++) {
        var an = anchors[a];
        for (var o = 0; o < ors.length && !done; o++) {
          var or = ors[o];
          if (fitsAt(cargoBoxes, placed, an.x, an.y, an.z, or.sx, or.sy, or.sz)) {
            var pl = { bag: bag, x: an.x, y: an.y, z: an.z, sx: or.sx, sy: or.sy, sz: or.sz };
            placed.push(pl);
            // remove consumed anchor, add 3 new extreme points
            anchors.splice(a, 1);
            var newAnchors = [
              { x: an.x + or.sx, y: an.y, z: an.z },
              { x: an.x, y: an.y + or.sy, z: an.z },
              { x: an.x, y: an.y, z: an.z + or.sz }
            ];
            var existing = {};
            for (var e = 0; e < anchors.length; e++) existing[anchorKey(anchors[e])] = 1;
            for (var n = 0; n < newAnchors.length; n++) {
              if (!existing[anchorKey(newAnchors[n])]) anchors.push(newAnchors[n]);
            }
            done = true;
          }
        }
      }
      if (!done) leftover.push(bag);
    }

    var usedCm3 = 0;
    for (var p = 0; p < placed.length; p++) {
      usedCm3 += placed[p].sx * placed[p].sy * placed[p].sz;
    }

    return {
      placements: placed,
      leftover: leftover,
      fillRatio: capacityCm3 > 0 ? usedCm3 / capacityCm3 : 0,
      capacityL: Math.round(capacityCm3 / 1000)
    };
  };
})();
