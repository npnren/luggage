/*
 * 3D + 2D car visualisation, driven by each car's REAL exterior dimensions.
 * 3D uses Three.js (window.THREE / window.OrbitControls). 2D uses a <canvas>.
 * Scene units: metres (cm / 100). Axes: x=width, y=up, z=length (rear→front).
 * The boot/cargo (bags) sits at the rear, z in [0, bootD]; the car body is built
 * around it using the car's real length / width / height / wheelbase + body type.
 */
(function () {
  var V = {};
  var renderer, scene, camera, controls, mount;
  var ready = false;
  function draw() { if (renderer) renderer.render(scene, camera); }

  function archOf(klass) {
    if (klass === "compact-hatch") return "hatch";
    if (klass === "liftback") return "liftback";
    if (klass === "sedan") return "sedan";
    if (klass === "compact-suv" || klass === "suv") return "suv";
    return "onebox"; // kei-tall, tall-wagon, *minivan, van
  }
  function roofEndFrac(klass) {
    if (klass === "van") return 0.90;
    if (klass === "large-minivan") return 0.86;
    if (klass === "minivan") return 0.85;
    return 0.80; // kei-tall, tall-wagon, compact-minivan
  }

  function carSpec(car, cargoBoxes) {
    var bootW = 0, bootH = 0, bootD = 0;
    cargoBoxes.forEach(function (b) { bootW = Math.max(bootW, b.ox + b.w); bootH = Math.max(bootH, b.oy + b.h); bootD = Math.max(bootD, b.oz + b.d); });
    var ext = car.ext || { len: bootD + 180, width: bootW + 26, height: bootH + 46, wb: (bootD + 180) * 0.58 };
    var L = ext.len, W = ext.width, H = ext.height, wb = ext.wb;
    var arch = archOf(car.klass);
    var rearZ = -12, ro = (L - wb) / 2;
    var rearAxleZ = rearZ + ro, frontAxleZ = rearAxleZ + wb, frontZ = rearZ + L;
    var m = Math.max(3, (W - bootW) / 2);
    var R = Math.max(20, Math.min(42, H * 0.19));
    // cabin (greenhouse) z-range fractions per archetype
    var cf;
    if (arch === "onebox") cf = [0.05, roofEndFrac(car.klass) + 0.04];
    else if (arch === "suv") cf = [0.10, 0.84];
    else if (arch === "hatch") cf = [0.18, 0.74];
    else if (arch === "liftback") cf = [0.22, 0.80];
    else cf = [0.30, 0.77];
    var Lz = frontZ - rearZ;
    // width-shaping per body type: boxy vans barely taper; cars are sleek
    var BOXY = { "kei-tall": 1, "tall-wagon": 1, "compact-minivan": 1, "minivan": 1, "large-minivan": 1, "van": 1 };
    var taper;
    if (BOXY[car.klass]) taper = { nose: 0.14, tail: 0.05, roof: 0.14, sill: 0.10 };
    else if (arch === "suv") taper = { nose: 0.26, tail: 0.06, roof: 0.20, sill: 0.12 };
    else taper = { nose: 0.36, tail: 0.07, roof: 0.30, sill: 0.12 };
    return {
      car: car, klass: car.klass, arch: arch, taper: taper,
      bootW: bootW, bootH: bootH, bootD: bootD,
      L: L, W: W, H: H, wb: wb,
      rearZ: rearZ, frontZ: frontZ, rearAxleZ: rearAxleZ, frontAxleZ: frontAxleZ, Lz: Lz,
      m: m, R: R, rows: car.rows || 2, slide: !!car.slidingDoors,
      cabinRearZ: rearZ + cf[0] * Lz, cabinFrontZ: rearZ + cf[1] * Lz,
      minX: -m, maxX: bootW + m, minY: -R, maxY: H, minZ: rearZ, maxZ: frontZ
    };
  }

  // side silhouette polygon [z,y] (cm) per archetype, scaled by real L and H
  function sideProfile(s) {
    var zr = s.rearZ, H = s.H, fz = s.frontZ, Lz = s.Lz;
    function Z(f) { return zr + f * Lz; }
    // Per body-type side silhouettes, hand-shaped to each car's real profile.
    switch (s.klass) {
      case "kei-tall": // N-BOX / Spacia — upright box, tiny hood, near-vertical front
        return [[zr, 0], [zr, H * 0.96], [Z(0.06), H], [Z(0.82), H],
        [Z(0.90), H * 0.62], [Z(0.97), H * 0.30], [fz, H * 0.22], [fz, 0]];
      case "tall-wagon": // Roomy — tall, short, big windshield, short hood
        return [[zr, 0], [zr, H * 0.95], [Z(0.08), H], [Z(0.66), H],
        [Z(0.80), H * 0.86], [Z(0.90), H * 0.50], [Z(0.97), H * 0.34], [fz, H * 0.28], [fz, 0]];
      case "compact-minivan": // Sienta — short bonnet one-box
        return [[zr, 0], [zr, H * 0.95], [Z(0.07), H], [Z(0.70), H],
        [Z(0.82), H * 0.80], [Z(0.92), H * 0.46], [fz, H * 0.32], [fz, 0]];
      case "minivan": // Noah/Voxy, Serena — tall boxy one-box
        return [[zr, 0], [zr, H * 0.96], [Z(0.06), H], [Z(0.74), H],
        [Z(0.84), H * 0.82], [Z(0.93), H * 0.44], [fz, H * 0.30], [fz, 0]];
      case "large-minivan": // Alphard — big, long flat roof, bold front
        return [[zr, 0], [zr, H * 0.97], [Z(0.05), H], [Z(0.78), H],
        [Z(0.88), H * 0.80], [Z(0.95), H * 0.40], [fz, H * 0.30], [fz, 0]];
      case "van": // Hiace — cab-over, minimal hood, full flat roof
        return [[zr, 0], [zr, H * 0.98], [Z(0.04), H], [Z(0.86), H],
        [Z(0.93), H * 0.55], [fz, H * 0.30], [fz, 0]];
      case "compact-hatch": // Yaris/Aqua/Note/Fit/Leaf
        return [[zr, 0], [zr, H * 0.46], [Z(0.10), H * 0.80], [Z(0.28), H * 0.96],
        [Z(0.52), H * 0.98], [Z(0.70), H * 0.62], [Z(0.88), H * 0.50], [fz, H * 0.42], [fz, 0]];
      case "liftback": // Prius — sleek fastback
        return [[zr, 0], [zr, H * 0.52], [Z(0.14), H * 0.80], [Z(0.36), H * 0.97],
        [Z(0.46), H * 0.99], [Z(0.84), H * 0.46], [fz, H * 0.40], [fz, 0]];
      case "compact-suv": // Raize / Yaris Cross — upright small SUV
        return [[zr, 0], [zr, H * 0.90], [Z(0.08), H * 0.97], [Z(0.50), H * 0.97],
        [Z(0.68), H * 0.90], [Z(0.82), H * 0.58], [Z(0.93), H * 0.48], [fz, H * 0.44], [fz, 0]];
      case "sedan":
        return [[zr, 0], [zr, H * 0.60], [Z(0.24), H * 0.64], [Z(0.42), H * 0.98],
        [Z(0.60), H * 0.98], [Z(0.78), H * 0.60], [fz, H * 0.48], [fz, 0]];
      default: // suv — Corolla Cross / X-Trail / Harrier
        return [[zr, 0], [zr, H * 0.88], [Z(0.07), H * 0.97], [Z(0.48), H * 0.98],
        [Z(0.66), H * 0.90], [Z(0.82), H * 0.56], [Z(0.93), H * 0.46], [fz, H * 0.42], [fz, 0]];
    }
  }

  V.init = function (el) {
    mount = el;
    if (!window.THREE) return false;
    var THREE = window.THREE;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    camera = new THREE.PerspectiveCamera(43, el.clientWidth / el.clientHeight, 0.01, 300);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    el.appendChild(renderer.domElement);
    addLights();
    if (window.OrbitControls) {
      controls = new window.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.addEventListener("change", draw);
    }
    window.addEventListener("resize", V.resize);
    ready = true; draw();
    return true;
  };
  V.resize = function () {
    if (!ready || !mount) return;
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight); draw();
  };
  function addLights() {
    var THREE = window.THREE;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb5c4d6, 0.95));
    var d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(3, 5, 4); scene.add(d1);
    var d2 = new THREE.DirectionalLight(0xeaf2ff, 0.35); d2.position.set(-3, 2, -3); scene.add(d2);
  }
  function relight() { addLights(); }
  function clearScene() {
    for (var i = scene.children.length - 1; i >= 0; i--) {
      var c = scene.children[i];
      if (c.isMesh || c.isLineSegments || c.isLine || c.isGroup) scene.remove(c);
    }
    relight();
  }
  function addBox(group, x, y, z, sx, sy, sz, color, opacity, wire) {
    var THREE = window.THREE;
    var geo = new THREE.BoxGeometry(sx / 100, sy / 100, sz / 100);
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: color, transparent: opacity < 1, opacity: opacity, roughness: 0.6, metalness: 0.05 }));
    mesh.position.set((x + sx / 2) / 100, (y + sy / 2) / 100, (z + sz / 2) / 100);
    group.add(mesh);
    if (wire !== false) {
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: wire || 0x334155 }));
      edges.position.copy(mesh.position); group.add(edges);
    }
    return mesh;
  }
  function addWheel(group, x, y, z, R, width) {
    var THREE = window.THREE;
    var tire = new THREE.Mesh(new THREE.CylinderGeometry(R / 100, R / 100, width / 100, 28),
      new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.85, metalness: 0.05 }));
    tire.rotation.z = Math.PI / 2; tire.position.set(x / 100, y / 100, z / 100); group.add(tire);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.45 / 100, R * 0.45 / 100, (width + 2) / 100, 18),
      new THREE.MeshStandardMaterial({ color: 0xaab4c0, roughness: 0.4, metalness: 0.5 }));
    hub.rotation.z = Math.PI / 2; hub.position.set(x / 100, y / 100, z / 100); group.add(hub);
  }

  function buildCarBody(group, s) {
    var THREE = window.THREE;
    var pts = sideProfile(s);
    var sh = new THREE.Shape();          // crisp polygonal silhouette (rounded via bevel)
    sh.moveTo(pts[0][0] / 100, pts[0][1] / 100);
    for (var i = 1; i < pts.length; i++) sh.lineTo(pts[i][0] / 100, pts[i][1] / 100);
    sh.closePath();
    var carWm = (s.bootW + 2 * s.m) / 100, bev = 0.03;
    var geo = new THREE.ExtrudeGeometry(sh, { depth: carWm - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 6 });
    // Sculpt the flat extrusion into a real body: taper the nose, pull in the roof
    // (tumblehome) and round the sills by scaling each vertex's WIDTH (local z) toward
    // the centreline, as a function of its length-position and height.
    geo.computeBoundingBox();
    var bb = geo.boundingBox, zc = (bb.min.z + bb.max.z) / 2;
    var lenMin = bb.min.x, lenSpan = (bb.max.x - bb.min.x) || 1, Hm = s.H / 100;
    var pos = geo.attributes.position;
    for (var vi = 0; vi < pos.count; vi++) {
      var t = (pos.getX(vi) - lenMin) / lenSpan;           // 0 rear → 1 front
      var h = Math.max(0, Math.min(1, pos.getY(vi) / Hm)); // 0 floor → 1 roof
      var fz = 1, fy = 1, tp = s.taper;
      if (t > 0.74) fz = 1 - (t - 0.74) / 0.26 * tp.nose;     // nose narrows
      else if (t < 0.10) fz = 1 - (0.10 - t) / 0.10 * tp.tail; // tail slight pinch
      if (h > 0.58) fy = 1 - (h - 0.58) / 0.42 * tp.roof;     // roof tumblehome
      else if (h < 0.16) fy = 1 - (0.16 - h) / 0.16 * tp.sill; // sill round-in
      pos.setZ(vi, zc + (pos.getZ(vi) - zc) * fz * fy);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
    geo.rotateY(-Math.PI / 2);
    geo.translate((s.bootW + s.m) / 100 - bev, 0, 0);
    group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xb4cce8, transparent: true, opacity: 0.3, roughness: 0.32, metalness: 0.18, side: THREE.DoubleSide, depthWrite: false })));
    // tinted side windows (greenhouse) — trapezoid following the roof profile
    var beltY = s.H * (s.arch === "onebox" ? 0.47 : 0.52);
    var top = [];
    for (var k = 0; k < pts.length; k++) {
      var p = pts[k];
      if (p[0] > s.cabinRearZ + 4 && p[0] < s.cabinFrontZ - 4 && p[1] > beltY + 12) top.push([p[0], p[1] - 11]);
    }
    if (top.length) {
      var poly = [[s.cabinRearZ, beltY]].concat(top).concat([[s.cabinFrontZ, beltY]]);
      var gsh = new THREE.Shape();
      gsh.moveTo(poly[0][0] / 100, poly[0][1] / 100);
      for (var j = 1; j < poly.length; j++) gsh.lineTo(poly[j][0] / 100, poly[j][1] / 100);
      gsh.closePath();
      var ggeo = new THREE.ExtrudeGeometry(gsh, { depth: 0.02, bevelEnabled: false });
      ggeo.rotateY(-Math.PI / 2);
      var gmat = new THREE.MeshStandardMaterial({ color: 0x23303f, transparent: true, opacity: 0.62, roughness: 0.08, metalness: 0.4, side: THREE.DoubleSide });
      var cxc = s.bootW / 2, hwc = s.bootW / 2 + s.m, gf = (1 - s.taper.roof) * 0.98; // greenhouse flank (matches roof tumblehome)
      [cxc - hwc * gf, cxc + hwc * gf].forEach(function (xw) { var g = new THREE.Mesh(ggeo.clone(), gmat); g.position.x = xw / 100; group.add(g); });
    }
  }

  // seat rows (gray). seatsDown → front row(s) up + folded platform.
  function addSeats(group, s, seatsDown) {
    var SEAT = 0x8b97a8, SEDGE = 0x55606e;
    var baseH = s.H * 0.17, backTop = s.H * 0.48, cushion = 46, backThick = 11;
    var pitch = Math.min(95, Math.max(72, (s.cabinFrontZ - s.bootD) / Math.max(s.rows, 1)));
    var sw = s.bootW, sx = 0;
    var upright = seatsDown ? 1 : s.rows;
    // draw rearmost->front; when folding, keep the FRONT rows upright
    for (var r = 0; r < s.rows; r++) {
      var z = s.bootD + r * pitch;
      if (z + cushion > s.frontZ - 20) break;
      var isUp = r >= (s.rows - upright);
      if (isUp) {
        addBox(group, sx, baseH, z, sw, backTop - baseH, backThick, SEAT, 0.66, SEDGE);     // backrest
        addBox(group, sx, 0, z + backThick, sw, baseH, cushion, SEAT, 0.66, SEDGE);          // cushion
      }
    }
  }

  V.render3D = function (car, cargoBoxes, result, seatsDown) {
    if (!ready) return;
    var THREE = window.THREE;
    clearScene();
    var s = carSpec(car, cargoBoxes);
    var group = new THREE.Group();
    buildCarBody(group, s);
    addSeats(group, s, seatsDown);
    var R = s.R, ww = Math.max(14, Math.min(22, R * 0.55));
    var lx = -s.m * 0.85, rx = s.bootW + s.m * 0.85;
    addWheel(group, lx, 0, s.rearAxleZ, R, ww); addWheel(group, rx, 0, s.rearAxleZ, R, ww);
    addWheel(group, lx, 0, s.frontAxleZ, R, ww); addWheel(group, rx, 0, s.frontAxleZ, R, ww);
    // boot region (faint) + bags
    cargoBoxes.forEach(function (b) {
      var geo = new THREE.BoxGeometry(b.w / 100, b.h / 100, b.d / 100);
      var edg = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.5 }));
      edg.position.set((b.ox + b.w / 2) / 100, (b.oy + b.h / 2) / 100, (b.oz + b.d / 2) / 100);
      group.add(edg);
    });
    result.placements.forEach(function (p) { addBox(group, p.x, p.y, p.z, p.sx, p.sy, p.sz, new THREE.Color(p.bag.color), 0.95); });
    scene.add(group);

    var cx = (s.minX + s.maxX) / 2 / 100, cz = (s.minZ + s.maxZ) / 2 / 100;
    group.position.set(-cx, -s.minY / 100, -cz);
    // frame from the bounding sphere so the whole car fits at any size
    var r = 0.5 * Math.sqrt(s.L * s.L + s.W * s.W + s.H * s.H) / 100;
    var dist = r / Math.sin((43 * Math.PI / 180) / 2) * 1.06;
    var dir = [0.52, 0.40, 0.76], dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
    var ty = (s.maxY - s.minY) / 2 / 100;
    camera.position.set(dir[0] / dl * dist, ty * 0.85 + dir[1] / dl * dist, dir[2] / dl * dist);
    if (controls) { controls.target.set(0, ty * 0.85, 0); controls.update(); } else camera.lookAt(0, ty * 0.85, 0);
    draw();
  };

  // ---------------- 2D top + side ----------------
  V.render2D = function (canvas, car, cargoBoxes, result, seatsDown) {
    var ctx = canvas.getContext("2d");
    var Wc = canvas.width, Hc = canvas.height;
    ctx.clearRect(0, 0, Wc, Hc);
    var s = carSpec(car, cargoBoxes);
    var pad = 22, gap = 26;
    var carLen = s.frontZ - s.rearZ, carW = s.bootW + 2 * s.m;
    var scale = (Wc - pad * 2) / carLen;
    var topH = carW * scale, sideH = s.H * scale;
    if (topH + sideH + gap + 60 > Hc) { scale *= (Hc - 60 - gap) / (topH + sideH); topH = carW * scale; sideH = s.H * scale; }

    var CARFILL = "#e0e9f3", CAREDGE = "#7e96b4", BOOT = "#2563eb", WHEEL = "#2a2f37", SEAT = "#8b97a8", GLASS = "rgba(70,96,128,0.35)";
    function lbl(t, x, y) { ctx.fillStyle = "#64748b"; ctx.font = "12px sans-serif"; ctx.fillText(t, x, y); }
    function tag(t, x, y, c) { ctx.save(); ctx.font = "700 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = c || "#334155"; ctx.fillText(t, x, y); ctx.restore(); }
    var TRUNK = window.t ? window.t("trunkLabel") : "TRUNK";
    var SEATTXT = window.t ? window.t(seatsDown ? "seatFolded" : "seatLabel") : "SEAT";

    var tx0 = pad, ty0 = pad + 14;
    var Z = function (z) { return tx0 + (z - s.rearZ) * scale; };
    var Xt = function (x) { return ty0 + (x + s.m) * scale; };
    var Ys; // set later for side

    // ---- TOP VIEW ----
    lbl((window.t ? window.t("twoD") : "2D") + " · top", tx0, pad + 6);
    var nose = (s.frontZ - s.cabinFrontZ) * 0.7;
    ctx.fillStyle = CARFILL; ctx.strokeStyle = CAREDGE; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Z(s.rearZ), Xt(-s.m + carW * 0.06));
    ctx.lineTo(Z(s.rearZ), Xt(s.bootW + s.m - carW * 0.06));
    ctx.lineTo(Z(s.frontZ - nose), Xt(s.bootW + s.m));
    ctx.lineTo(Z(s.frontZ), Xt(s.bootW + s.m - carW * 0.16));
    ctx.lineTo(Z(s.frontZ), Xt(-s.m + carW * 0.16));
    ctx.lineTo(Z(s.frontZ - nose), Xt(-s.m));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // cabin glasshouse hint
    ctx.fillStyle = GLASS;
    ctx.fillRect(Z(s.cabinRearZ), Xt(-s.m + carW * 0.10), (s.cabinFrontZ - s.cabinRearZ) * scale, carW * 0.80 * scale);
    // seat rows (top)
    var pitch = Math.min(95, Math.max(72, (s.cabinFrontZ - s.bootD) / Math.max(s.rows, 1)));
    var uprightTop = seatsDown ? 1 : s.rows;
    ctx.fillStyle = SEAT;
    for (var r = 0; r < s.rows; r++) {
      var rz = s.bootD + r * pitch; if (rz + 46 > s.frontZ - 20) break;
      if (r >= s.rows - uprightTop) { ctx.globalAlpha = 0.6; ctx.fillRect(Z(rz), Xt(2), 50 * scale, (s.bootW - 4) * scale); ctx.globalAlpha = 1; }
    }
    // wheels (top)
    ctx.fillStyle = WHEEL; var ww = s.m * 1.3 * scale, wl = s.R * scale;
    [s.rearAxleZ, s.frontAxleZ].forEach(function (z) {
      ctx.fillRect(Z(z) - wl / 2, Xt(-s.m) - ww * 0.3, wl, ww * 0.6);
      ctx.fillRect(Z(z) - wl / 2, Xt(s.bootW + s.m) - ww * 0.3, wl, ww * 0.6);
    });
    // boot + bags (top)
    ctx.strokeStyle = BOOT; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(Z(0), Xt(0), s.bootD * scale, s.bootW * scale); ctx.setLineDash([]);
    result.placements.forEach(function (p) {
      ctx.fillStyle = p.bag.color; ctx.globalAlpha = 0.9; ctx.fillRect(Z(p.z), Xt(p.x), p.sz * scale, p.sx * scale);
      ctx.globalAlpha = 1; ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.strokeRect(Z(p.z), Xt(p.x), p.sz * scale, p.sx * scale);
    });

    // ---- SIDE VIEW ----
    var sy0 = ty0 + topH + gap + 14;
    Ys = function (y) { return sy0 + (s.H - y) * scale; };
    lbl("side", tx0, sy0 - 6);
    var prof = sideProfile(s);
    ctx.fillStyle = CARFILL; ctx.strokeStyle = CAREDGE; ctx.lineWidth = 1.5;
    ctx.beginPath();
    prof.forEach(function (pt, i) { var X = Z(pt[0]), Y = Ys(pt[1]); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // side windows
    var gy0 = s.H * (s.arch === "onebox" ? 0.50 : 0.55), gy1 = s.H * 0.88;
    ctx.fillStyle = GLASS; ctx.fillRect(Z(s.cabinRearZ), Ys(gy1), (s.cabinFrontZ - s.cabinRearZ) * scale, (gy1 - gy0) * scale);
    // wheels (side)
    ctx.fillStyle = WHEEL;
    [s.rearAxleZ, s.frontAxleZ].forEach(function (z) {
      ctx.beginPath(); ctx.arc(Z(z), Ys(0), s.R * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#9aa3ad"; ctx.beginPath(); ctx.arc(Z(z), Ys(0), s.R * scale * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = WHEEL;
    });
    // seat rows (side)
    var baseH = s.H * 0.17, backTop = s.H * 0.48;
    ctx.fillStyle = SEAT; ctx.globalAlpha = 0.72;
    for (var r2 = 0; r2 < s.rows; r2++) {
      var rz2 = s.bootD + r2 * pitch; if (rz2 + 46 > s.frontZ - 20) break;
      if (r2 >= s.rows - uprightTop) {
        ctx.fillRect(Z(rz2), Ys(backTop), 11 * scale, (backTop) * scale);            // backrest
        ctx.fillRect(Z(rz2 + 11), Ys(baseH), 46 * scale, baseH * scale);             // cushion
      }
    }
    ctx.globalAlpha = 1;
    // boot + bags (side)
    ctx.strokeStyle = BOOT; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(Z(0), Ys(s.bootH), s.bootD * scale, s.bootH * scale); ctx.setLineDash([]);
    result.placements.forEach(function (p) {
      ctx.fillStyle = p.bag.color; ctx.globalAlpha = 0.9; ctx.fillRect(Z(p.z), Ys(p.y + p.sy), p.sz * scale, p.sy * scale);
      ctx.globalAlpha = 1; ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.strokeRect(Z(p.z), Ys(p.y + p.sy), p.sz * scale, p.sy * scale);
    });
    // labels (push seat label forward into the cabin so it never collides with TRUNK)
    tag(TRUNK, Z(s.bootD / 2), Ys(s.bootH) - 9, "#1d4ed8");
    tag(SEATTXT, Z(s.bootD + pitch + 12), Ys(seatsDown ? s.H * 0.32 : backTop) - 8, "#475569");
  };

  V.canvas3d = function () { draw(); return renderer ? renderer.domElement : null; };
  window.Viewer = V;
})();
