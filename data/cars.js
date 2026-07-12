/*
 * Car dataset — real Okinawa rent-a-car fleet (Toyota / Nissan + common kei/EV).
 * Exterior dimensions, wheelbase, seats and rows are OFFICIAL maker figures
 * (sourced from toyota.jp / nissan.co.jp / honda.co.jp / suzuki.co.jp and spec DBs),
 * stored here in CENTIMETRES. luggageL is the maker/standard luggage figure.
 *
 * The packing cargo box (interior usable W×D×H) and the boot opening are DERIVED
 * from the real exterior + body type below (see buildCar()), because makers publish
 * VDA litres, not a clean usable rectangle. Each car keeps `ext` (real outside size)
 * so the 3D view can draw the true proportions of that exact car.
 *
 * bodyType drives both the packing geometry and the 3D silhouette:
 *   kei-tall | compact-hatch | tall-wagon | liftback | sedan |
 *   compact-suv | suv | compact-minivan | minivan | large-minivan | van
 */
(function () {
  // RAW: official exterior specs (cm). len/width/height = overall; wb = wheelbase.
  var RAW = [
    // --- compact hatch / tall wagon ---
    { id: "toyota-yaris", en: "Toyota Yaris", zh: "豐田 Yaris", t: "compact-hatch", len: 395, width: 170, height: 150, wb: 255, seats: 5, rows: 2, lug: 270, slide: false },
    { id: "toyota-aqua", en: "Toyota Aqua", zh: "豐田 Aqua", t: "compact-hatch", len: 405, width: 170, height: 149, wb: 260, seats: 5, rows: 2, lug: 291, slide: false,
      measured: { w: 115.3, d: 65.6, h: 82.4 } },  // Okinawa Toyota /aqua/usability (最大荷室幅 1153 / 荷室長 656 / 荷室高 824 mm)
    { id: "nissan-note", en: "Nissan Note e-POWER", zh: "日產 Note e-POWER", t: "compact-hatch", len: 405, width: 170, height: 152, wb: 258, seats: 5, rows: 2, lug: 340, slide: false },
    { id: "honda-fit", en: "Honda Fit", zh: "本田 Fit", t: "compact-hatch", len: 400, width: 170, height: 152, wb: 253, seats: 5, rows: 2, lug: 298, slide: false },
    { id: "toyota-roomy", en: "Toyota Roomy", zh: "豐田 Roomy", t: "tall-wagon", len: 370, width: 167, height: 174, wb: 249, seats: 5, rows: 2, lug: 205, slide: true },
    // --- SUV ---
    { id: "toyota-raize", en: "Toyota Raize", zh: "豐田 Raize", t: "compact-suv", len: 400, width: 170, height: 162, wb: 253, seats: 5, rows: 2, lug: 369, slide: false },
    { id: "toyota-yaris-cross", en: "Toyota Yaris Cross", zh: "豐田 Yaris Cross", t: "compact-suv", len: 418, width: 177, height: 159, wb: 256, seats: 5, rows: 2, lug: 390, slide: false,
      measured: { w: 140.0, d: 82.0, h: 85.0 } },  // Okinawa Toyota /yariscross/usability (荷室幅 1400 / 荷室長 820 / 荷室高 850 mm, deck board lower)
    { id: "toyota-corolla-cross", en: "Toyota Corolla Cross", zh: "豐田 Corolla Cross", t: "suv", len: 449, width: 183, height: 162, wb: 264, seats: 5, rows: 2, lug: 487, slide: false },
    { id: "nissan-x-trail", en: "Nissan X-Trail", zh: "日產 X-Trail", t: "suv", len: 466, width: 184, height: 172, wb: 271, seats: 5, rows: 2, lug: 575, slide: false },
    { id: "toyota-harrier", en: "Toyota Harrier", zh: "豐田 Harrier", t: "suv", len: 474, width: 186, height: 166, wb: 269, seats: 5, rows: 2, lug: 409, slide: false },
    // --- minivan / van ---
    { id: "toyota-sienta", en: "Toyota Sienta (7-seat)", zh: "豐田 Sienta（7人座）", t: "compact-minivan", len: 426, width: 170, height: 170, wb: 275, seats: 7, rows: 3, lug: 177, slide: true },
    { id: "toyota-noah-voxy", en: "Toyota Noah / Voxy", zh: "豐田 Noah／Voxy", t: "minivan", len: 470, width: 173, height: 190, wb: 285, seats: 8, rows: 3, lug: 298, slide: true },
    { id: "nissan-serena", en: "Nissan Serena", zh: "日產 Serena", t: "minivan", len: 477, width: 172, height: 190, wb: 287, seats: 8, rows: 3, lug: 212, slide: true },
    { id: "toyota-alphard", en: "Toyota Alphard", zh: "豐田 Alphard", t: "large-minivan", len: 500, width: 185, height: 195, wb: 300, seats: 8, rows: 3, lug: 300, slide: true },
    { id: "toyota-hiace-grand-cabin", en: "Toyota Hiace Grand Cabin (10-seat)", zh: "豐田 Hiace Grand Cabin（10人座）", t: "van", len: 538, width: 188, height: 229, wb: 311, seats: 10, rows: 4, lug: 500, slide: true },
    // --- kei / EV / cargo van ---
    { id: "honda-nbox", en: "Honda N-BOX", zh: "本田 N-BOX", t: "kei-tall", len: 340, width: 148, height: 179, wb: 252, seats: 4, rows: 2, lug: 210, slide: true },
    { id: "suzuki-spacia", en: "Suzuki Spacia", zh: "鈴木 Spacia", t: "kei-tall", len: 340, width: 148, height: 179, wb: 246, seats: 4, rows: 2, lug: 200, slide: true },
    { id: "nissan-leaf", en: "Nissan Leaf (EV)", zh: "日產 Leaf（電動）", t: "compact-hatch", len: 448, width: 179, height: 156, wb: 270, seats: 5, rows: 2, lug: 435, slide: false },
    { id: "toyota-prius", en: "Toyota Prius", zh: "豐田 Prius", t: "liftback", len: 460, width: 178, height: 143, wb: 275, seats: 5, rows: 2, lug: 410, slide: false },
    { id: "toyota-hiace-van", en: "Toyota Hiace Van (cargo)", zh: "豐田 Hiace Van（貨車）", t: "van", len: 470, width: 170, height: 198, wb: 257, seats: 5, rows: 2, lug: 0, slide: false }
  ];

  // boot interior height (seats up), by body type (cm)
  var BOOT_H = {
    "liftback": 46, "sedan": 46, "compact-hatch": 62, "tall-wagon": 96, "kei-tall": 92,
    "compact-suv": 74, "suv": 78, "compact-minivan": 74, "minivan": 84, "large-minivan": 92, "van": 120
  };
  // boot usable width as fraction of exterior width
  function widthFrac(t) {
    if (t === "kei-tall") return 0.585;
    if (t === "minivan" || t === "large-minivan" || t === "van" || t === "compact-minivan") return 0.62;
    return 0.60;
  }
  // boot depth (seats up) as fraction of exterior length — geometric, not VDA litres
  var DEPTH_F = {
    "liftback": 0.21, "sedan": 0.20, "compact-hatch": 0.16, "tall-wagon": 0.20, "kei-tall": 0.18,
    "compact-suv": 0.20, "suv": 0.22, "compact-minivan": 0.085, "minivan": 0.10, "large-minivan": 0.105, "van": 0.20
  };
  // extra cargo depth gained when the rear seats are folded (cm)
  var FOLD_ADD = {
    "compact-hatch": 78, "liftback": 88, "tall-wagon": 72, "kei-tall": 64,
    "compact-suv": 88, "suv": 95, "compact-minivan": 115, "minivan": 130, "large-minivan": 150
  };
  var BOXY = { "kei-tall": 1, "tall-wagon": 1, "compact-minivan": 1, "minivan": 1, "large-minivan": 1, "van": 1 };

  var BRANDS = {
    toyota: { en: "Toyota", "zh-TW": "豐田" },
    nissan: { en: "Nissan", "zh-TW": "日產" },
    honda: { en: "Honda", "zh-TW": "本田" },
    suzuki: { en: "Suzuki", "zh-TW": "鈴木" }
  };

  function buildCar(r) {
    var t = r.t, W = r.width, H = r.height, L = r.len;
    var bootW = Math.round(W * widthFrac(t));
    var bootH = BOOT_H[t] || 70;
    var bootD = Math.round(L * (DEPTH_F[t] || 0.18));

    // special-case the two Hiace bodies (cargo bays are not seat-derived)
    if (r.id === "toyota-hiace-van") { bootW = 150; bootH = 132; bootD = 300; }
    if (r.id === "toyota-hiace-grand-cabin") { bootW = 132; bootH = 112; bootD = 52; }

    // Measured boot (from official maker /usability cargo diagram) overrides derived.
    if (r.measured) {
      bootW = r.measured.w;
      bootD = r.measured.d;
      bootH = r.measured.h;
    }

    // Real cargo bays are bread-loaf shaped (wheel wells, sloped tailgate, opening lip).
    // Shrink the rectangular approximation ~10% per axis so the packer doesn't overstate fit.
    var SHRINK = 0.90;
    bootW = Math.round(bootW * SHRINK);
    bootD = Math.round(bootD * SHRINK);
    bootH = Math.round(bootH * SHRINK);

    var cargoBoxes = [{ w: bootW, d: bootD, h: bootH, ox: 0, oy: 0, oz: 0 }];
    var opening = { w: Math.round(bootW * 0.95), h: Math.round(bootH * 0.9) };

    var seatsDownBoxes = null;
    var fold = FOLD_ADD[t];
    if (fold) {
      var sdH = Math.max(bootH, Math.round(H * (BOXY[t] ? 0.80 : 0.60) * SHRINK));
      var sdD = (r.measured && r.measured.dFold)
        ? Math.round(r.measured.dFold * SHRINK)
        : (bootD + Math.round(fold * SHRINK));
      seatsDownBoxes = [{ w: bootW, d: sdD, h: sdH, ox: 0, oy: 0, oz: 0 }];
    }
    if (r.id === "toyota-hiace-grand-cabin") {
      seatsDownBoxes = [{
        w: Math.round(132 * SHRINK),
        d: Math.round((52 + 130) * SHRINK),
        h: Math.round(130 * SHRINK),
        ox: 0, oy: 0, oz: 0
      }];
    }

    var bkey = r.id.split("-")[0];
    var model = {
      en: r.en.replace(/^(Toyota|Nissan|Honda|Suzuki)\s+/, ""),
      "zh-TW": r.zh.replace(/^(豐田|日產|本田|鈴木)\s*/, "")
    };
    return {
      id: r.id,
      name: { en: r.en, "zh-TW": r.zh },
      brandKey: bkey,
      brandName: BRANDS[bkey] || { en: bkey, "zh-TW": bkey },
      model: model,
      klass: t,
      ext: { len: L, width: W, height: H, wb: r.wb },   // real outside size (cm)
      seats: r.seats, rows: r.rows, slidingDoors: r.slide,
      trunkLiters: r.lug || Math.round(bootW * bootD * bootH / 1000),
      opening: opening,
      cargoBoxes: cargoBoxes,
      seatsDownBoxes: seatsDownBoxes,
      confidence: r.measured ? "high" : "medium"   // "high" = measured cargo box from maker diagram
    };
  }

  window.CARS = RAW.map(buildCar);

  /* Luggage presets — dimensions include wheels + handles (real footprint). */
  window.LUGGAGE_PRESETS = [
    { id: "cabin-20", label: { en: '20" Cabin', "zh-TW": "20吋 登機箱" }, w: 36, d: 23, h: 55, rigid: true, allowLieFlat: true, color: "#4dabf7" },
    { id: "medium-24", label: { en: '24" Medium', "zh-TW": "24吋 中型" }, w: 45, d: 28, h: 67, rigid: true, allowLieFlat: true, color: "#38d9a9" },
    { id: "large-28", label: { en: '28" Large', "zh-TW": "28吋 大型" }, w: 51, d: 33, h: 77, rigid: true, allowLieFlat: true, color: "#ffa94d" },
    { id: "xl-29", label: { en: '29" X-Large', "zh-TW": "29吋 特大" }, w: 53, d: 35, h: 79, rigid: true, allowLieFlat: true, color: "#ff6b6b" },
    { id: "duffel", label: { en: "Soft Duffel", "zh-TW": "軟式旅行袋" }, w: 60, d: 30, h: 35, rigid: false, allowLieFlat: true, color: "#b197fc" },
    { id: "backpack", label: { en: "Backpack", "zh-TW": "後背包" }, w: 32, d: 22, h: 48, rigid: false, allowLieFlat: true, color: "#f783ac" },
    { id: "golf", label: { en: "Golf Bag", "zh-TW": "高爾夫球袋" }, w: 28, d: 28, h: 122, rigid: false, allowLieFlat: true, color: "#a9e34b" }
  ];
})();
