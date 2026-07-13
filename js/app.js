/* UI wiring. Plain DOM, no framework. */
(function () {
  var state = {
    mode: "car",     // "car" = current single-car flow, "luggage" = reverse-lookup of all cars
    brand: window.CARS[0].brandKey,
    carId: window.CARS[0].id,
    seatsDown: false,
    bags: [],        // {key, label, color, w, d, h, rigid, allowLieFlat, qty}
    view: "2d",
    lastResult: null
  };
  var CUSTOM = "__custom__";

  var $ = function (id) { return document.getElementById(id); };
  function customCar() {
    var w = Math.max(1, parseFloat($("cbW").value) || 0);
    var d = Math.max(1, parseFloat($("cbD").value) || 0);
    var h = Math.max(1, parseFloat($("cbH").value) || 0);
    var ow = Math.max(1, parseFloat($("coW").value) || w);
    var oh = Math.max(1, parseFloat($("coH").value) || h);
    return {
      id: "__custom__",
      name: { en: window.t("customCarName"), "zh-TW": window.t("customCarName") },
      klass: "suv", trunkLiters: Math.round(w * d * h / 1000),
      ext: { len: d + 190, width: w + 28, height: h + 48, wb: (d + 190) * 0.58 },
      seats: 5, rows: 2, slidingDoors: false,
      opening: { w: ow, h: oh },
      cargoBoxes: [{ w: w, d: d, h: h, ox: 0, oy: 0, oz: 0 }],
      confidence: "custom"
    };
  }
  function car() {
    if (state.carId === "__custom__") return customCar();
    return window.CARS.filter(function (c) { return c.id === state.carId; })[0];
  }
  function cargoBoxes() {
    var c = car();
    return (state.seatsDown && c.seatsDownBoxes) ? c.seatsDownBoxes : c.cargoBoxes;
  }

  // ---------- render static labels ----------
  function applyI18n() {
    document.documentElement.lang = window.LANG;
    $("title").textContent = window.t("title");
    $("subtitle").textContent = window.t("subtitle");
    $("carLabel").textContent = window.t("carLabel");
    $("seatsDownLabel").textContent = window.t("seatsDown");
    $("addPresetLabel").textContent = window.t("addPreset");
    $("clearBtn").textContent = window.t("clear");
    $("customLabel").textContent = window.t("addCustom");
    $("dragHint").textContent = window.t("drag");
    $("disclaimer").textContent = window.t("disclaimer");
    $("wLabel").textContent = window.t("width");
    $("dLabel").textContent = window.t("depth");
    $("hLabel").textContent = window.t("height");
    $("btn2d").textContent = window.t("twoD");
    $("btn3d").textContent = window.t("threeD");
    $("saveImgBtn").title = window.t("saveImage");
    $("bootInsideLabel").textContent = window.t("bootInside");
    $("openingLabel").textContent = window.t("openingSize");
    $("cbWLabel").textContent = window.t("width");
    $("cbDLabel").textContent = window.t("depth");
    $("cbHLabel").textContent = window.t("height");
    $("coWLabel").textContent = window.t("openW");
    $("coHLabel").textContent = window.t("openH");
    $("modeCarBtn").textContent = window.t("modeCar");
    $("modeLuggageBtn").textContent = window.t("modeLuggage");
    $("matchesTitleLabel").textContent = window.t("matchesTitle");
    renderCarSelect();
    renderPresets();
    renderResult();
    renderView(); // re-label the 2D/3D canvas in the new language (guards on lastResult)
    if (state.mode === "luggage") renderCarMatches();
  }

  function brandKeys() {
    var seen = {}, out = [];
    window.CARS.forEach(function (c) { if (!seen[c.brandKey]) { seen[c.brandKey] = 1; out.push(c.brandKey); } });
    return out;
  }
  function brandName(key) {
    var c = window.CARS.filter(function (x) { return x.brandKey === key; })[0];
    return c ? window.localized(c.brandName) : key;
  }

  function renderCarSelect() {
    var isCustom = state.brand === CUSTOM;
    // --- brand selector: each maker + a Custom option ---
    var bsel = $("brandSelect");
    bsel.innerHTML = "";
    brandKeys().forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = brandName(k);
      if (k === state.brand) o.selected = true;
      bsel.appendChild(o);
    });
    var cu = document.createElement("option");
    cu.value = CUSTOM; cu.textContent = window.t("customCar");
    if (isCustom) cu.selected = true;
    bsel.appendChild(cu);

    // --- model selector: models of the chosen brand (hidden for Custom) ---
    var msel = $("carSelect");
    msel.style.display = isCustom ? "none" : "";
    msel.innerHTML = "";
    if (!isCustom) {
      window.CARS.filter(function (c) { return c.brandKey === state.brand; }).forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.id; o.textContent = window.localized(c.model);
        if (c.id === state.carId) o.selected = true;
        msel.appendChild(o);
      });
    }

    $("customCarWrap").style.display = isCustom ? "block" : "none";
    var c = car();
    if (isCustom) {
      $("carMeta").textContent = window.t("capacity") + ": ~" + c.trunkLiters + " L";
    } else {
      var conf = window.t("conf_" + c.confidence);
      $("carMeta").textContent = window.t("capacity") + ": ~" + c.trunkLiters + " L · " +
        window.t("confidence") + ": " + conf;
    }
    var hasSeats = !isCustom && !!c.seatsDownBoxes;
    $("seatsDownWrap").style.display = hasSeats ? "flex" : "none";
    if (!hasSeats) state.seatsDown = false;
    $("seatsDown").checked = state.seatsDown;
  }

  function renderPresets() {
    var wrap = $("presets");
    wrap.innerHTML = "";

    var presetIds = {};
    window.LUGGAGE_PRESETS.forEach(function (p) { presetIds[p.id] = true; });

    function makeTile(p, labelText) {
      var b = document.createElement("button");
      b.className = "preset";
      b.style.borderColor = p.color;
      b.dataset.key = p.id;
      b.innerHTML = '<span class="swatch" style="background:' + p.color + '"></span>' +
        labelText +
        '<small>' + p.w + "×" + p.d + "×" + p.h + "</small>";
      b.onclick = function (e) {
        if (e.target.closest('.qtybadge')) return; // badge has its own handler
        addBag(p);
      };
      return b;
    }

    window.LUGGAGE_PRESETS.forEach(function (p) {
      wrap.appendChild(makeTile(p, window.localized(p.label)));
    });

    // Dynamic tiles for any custom bags the user added.
    state.bags.forEach(function (bag) {
      if (presetIds[bag.key]) return;
      wrap.appendChild(makeTile(
        { id: bag.key, w: bag.w, d: bag.d, h: bag.h, color: bag.color,
          rigid: bag.rigid, allowLieFlat: bag.allowLieFlat,
          label: { en: bag.label, "zh-TW": bag.label } },
        bag.label
      ));
    });

    updatePresetBadges();
  }

  function updatePresetBadges(flashKey) {
    var wrap = $("presets");
    var buttons = wrap.querySelectorAll('.preset');
    buttons.forEach(function (b) {
      var key = b.dataset.key;
      var bag = state.bags.filter(function (x) { return x.key === key; })[0];
      var existing = b.querySelector('.qtybadge');
      if (existing) existing.remove();
      if (bag && bag.qty > 0) {
        b.classList.add('has-qty');
        var badge = document.createElement('span');
        badge.className = 'qtybadge' + (key === flashKey ? ' pop' : '');
        badge.textContent = '×' + bag.qty;
        badge.title = window.LANG === "zh-TW" ? "點一下減一" : "Click to remove one";
        badge.onclick = function (e) {
          e.stopPropagation();
          bag.qty--;
          if (bag.qty <= 0) {
            state.bags = state.bags.filter(function (x) { return x.key !== key; });
            renderPresets(); // rebuild in case a custom tile disappears
          } else {
            updatePresetBadges();
          }
          check();
        };
        b.appendChild(badge);
      } else {
        b.classList.remove('has-qty');
      }
    });
  }

  function addBag(preset) {
    var key = preset.id;
    var existing = state.bags.filter(function (x) { return x.key === key; })[0];
    var isNew = !existing;
    if (existing) { existing.qty++; }
    else {
      state.bags.push({
        key: key, label: window.localized(preset.label), color: preset.color,
        w: preset.w, d: preset.d, h: preset.h,
        rigid: preset.rigid, allowLieFlat: preset.allowLieFlat, qty: 1
      });
    }
    if (isNew) renderPresets(); // new custom bag → add its tile
    var btn = $("presets").querySelector('[data-key="' + CSS.escape(key) + '"]');
    if (btn) {
      btn.classList.remove('flash');
      void btn.offsetWidth; // restart animation
      btn.classList.add('flash');
      setTimeout(function () { btn.classList.remove('flash'); }, 400);
    }
    updatePresetBadges(key);
    check();
  }

  function expandedBags() {
    var out = [];
    state.bags.forEach(function (bag) {
      for (var i = 0; i < bag.qty; i++) {
        out.push({
          key: bag.key, label: bag.label, color: bag.color,
          w: bag.w, d: bag.d, h: bag.h, rigid: bag.rigid, allowLieFlat: bag.allowLieFlat
        });
      }
    });
    return out;
  }

  // ---------- live recompute (runs automatically on any change) ----------
  function check() {
    if (state.mode === "luggage") { renderCarMatches(); return; }
    var bags = expandedBags();
    var c = car();
    state.lastResult = bags.length
      ? window.packLuggage(cargoBoxes(), c.opening, bags)
      : { placements: [], leftover: [], fillRatio: 0, capacityL: 0 }; // empty → show the car only
    renderResult();
    renderView();
  }

  // ---------- reverse-lookup: "find every rental car my bags fit in" ----------
  function verdictOf(result) {
    if (!result || result.leftover.length > 0) return "no";
    if (result.fillRatio > 0.62) return "tight";
    return "fits";
  }

  function renderCarMatches() {
    var bags = expandedBags();
    var summary = $("matchSummary");
    var list = $("matchList");
    if (!bags.length) {
      summary.textContent = "";
      list.innerHTML = '<div class="muted small">' + window.t("matchesEmpty") + '</div>';
      return;
    }

    var results = window.CARS.map(function (c) {
      var up = window.packLuggage(c.cargoBoxes, c.opening, bags);
      var upV = verdictOf(up);
      var foldV = null;
      if (upV !== "fits" && c.seatsDownBoxes) {
        foldV = verdictOf(window.packLuggage(c.seatsDownBoxes, c.opening, bags));
      }
      return { car: c, up: upV, fold: foldV };
    });

    // Sort: best verdict first, then smallest exterior length (cheapest rental tier first).
    function tier(r) {
      if (r.up === "fits") return 0;
      if (r.fold === "fits") return 1;
      if (r.up === "tight") return 2;
      if (r.fold === "tight") return 3;
      return 4;
    }
    results.sort(function (a, b) {
      var t = tier(a) - tier(b);
      return t !== 0 ? t : a.car.ext.len - b.car.ext.len;
    });

    var counts = { fits: 0, tight: 0, no: 0 };
    results.forEach(function (r) {
      var t = tier(r);
      if (t <= 1) counts.fits++;
      else if (t <= 3) counts.tight++;
      else counts.no++;
    });
    summary.textContent = window.t("matchSummary")
      .replace("{fits}", counts.fits)
      .replace("{tight}", counts.tight)
      .replace("{no}", counts.no);

    list.innerHTML = "";
    results.forEach(function (r) {
      var card = document.createElement("div");
      card.className = "matchcard";
      var badgeCls, badgeText, needsFold = false;
      if (r.up === "fits") { badgeCls = "fits"; badgeText = window.t("resultFits"); }
      else if (r.fold === "fits") { badgeCls = "fits"; badgeText = window.t("resultFits"); needsFold = true; }
      else if (r.up === "tight") { badgeCls = "tight"; badgeText = window.t("resultTight"); }
      else if (r.fold === "tight") { badgeCls = "tight"; badgeText = window.t("resultTight"); needsFold = true; }
      else { badgeCls = "no"; badgeText = window.t("resultNo"); }

      var name = document.createElement("div");
      name.className = "matchname";
      var brand = window.localized(r.car.brandName);
      var model = window.localized(r.car.model);
      name.innerHTML = '<b>' + brand + ' ' + model + '</b>' +
        '<small>' + r.car.ext.len + 'x' + r.car.ext.width + ' cm · ' + r.car.trunkLiters + ' L</small>';
      if (needsFold) {
        name.innerHTML += '<em class="foldnote">' + window.t("withSeatsFolded") + '</em>';
      }
      var badge = document.createElement("span");
      badge.className = "matchbadge " + badgeCls;
      badge.textContent = badgeText;

      card.appendChild(name);
      card.appendChild(badge);

      // Tap a card → jump to car-mode with this car selected (and seats folded if needed).
      card.onclick = function () {
        state.mode = "car";
        state.brand = r.car.brandKey;
        state.carId = r.car.id;
        state.seatsDown = needsFold;
        updateModeUI();
        renderCarSelect();
        check();
      };
      list.appendChild(card);
    });
  }

  function updateModeUI() {
    var isLug = state.mode === "luggage";
    $("modeCarBtn").classList.toggle("active", !isLug);
    $("modeLuggageBtn").classList.toggle("active", isLug);
    $("carPanel").style.display = isLug ? "none" : "block";
    $("resultPanel").style.display = isLug ? "none" : "block";
    $("viewerPanel").style.display = isLug ? "none" : "block";
    $("matchesPanel").style.display = isLug ? "block" : "none";
    if (isLug) renderCarMatches();
  }

  function flash(msg) {
    var el = $("resultBanner");
    el.className = "banner warn";
    el.innerHTML = msg;
    $("resultDetail").innerHTML = "";
  }

  function renderResult() {
    var r = state.lastResult;
    var banner = $("resultBanner");
    var detail = $("resultDetail");
    if (!r || (r.placements.length === 0 && r.leftover.length === 0)) {
      banner.className = "banner idle"; banner.textContent = window.t("empty"); detail.innerHTML = ""; return;
    }

    var nLeft = r.leftover.length;
    var fillPct = Math.round(r.fillRatio * 100);
    var status, cls, desc;
    if (nLeft > 0) { status = window.t("resultNo"); cls = "no"; desc = window.t("noDesc"); }
    else if (r.fillRatio > 0.62) { status = window.t("resultTight"); cls = "tight"; desc = window.t("tightDesc"); }
    else { status = window.t("resultFits"); cls = "fits"; desc = window.t("fitsDesc"); }

    banner.className = "banner " + cls;
    banner.textContent = status;

    var html = '<p class="desc">' + desc + '</p>';
    if (nLeft > 0) {
      var names = {};
      r.leftover.forEach(function (b) { names[b.label] = (names[b.label] || 0) + 1; });
      html += '<ul class="leftover">';
      Object.keys(names).forEach(function (k) { html += '<li>' + k + ' ×' + names[k] + '</li>'; });
      html += '</ul>';
    }
    html += '<div class="stats">' +
      '<div><b>' + r.placements.length + '</b> ' + window.t("placed") + '</div>' +
      '<div><b>' + nLeft + '</b> ' + window.t("leftover") + '</div>' +
      '<div><b>' + fillPct + '%</b> ' + window.t("fill") + '</div>' +
      '</div>';
    detail.innerHTML = html;
  }

  function renderView() {
    if (!state.lastResult) return;
    var boxes = cargoBoxes();
    var c = car();
    if (state.view === "3d" && window.Viewer && window.THREE) {
      $("view3d").style.display = "block";
      $("canvas2d").style.display = "none";
      window.Viewer.render3D(c, boxes, state.lastResult, state.seatsDown);
      window.Viewer.resize();
    } else {
      $("view3d").style.display = "none";
      $("canvas2d").style.display = "block";
      var cv = $("canvas2d");
      cv.width = cv.clientWidth; cv.height = cv.clientHeight;
      window.Viewer.render2D(cv, c, boxes, state.lastResult, state.seatsDown);
    }
  }

  // ---------- events ----------
  function wire() {
    $("modeCarBtn").onclick = function () { state.mode = "car"; updateModeUI(); check(); };
    $("modeLuggageBtn").onclick = function () { state.mode = "luggage"; updateModeUI(); };
    $("brandSelect").onchange = function (e) {
      state.brand = e.target.value;
      if (state.brand === CUSTOM) { state.carId = CUSTOM; }
      else {
        var first = window.CARS.filter(function (c) { return c.brandKey === state.brand; })[0];
        if (first) state.carId = first.id;
      }
      renderCarSelect();
      check();
    };
    $("carSelect").onchange = function (e) { state.carId = e.target.value; renderCarSelect(); check(); };
    $("seatsDown").onchange = function (e) { state.seatsDown = e.target.checked; check(); };
    ["cbW", "cbD", "cbH", "coW", "coH"].forEach(function (id) {
      $(id).oninput = function () { renderCarSelect(); check(); };
    });
    $("clearBtn").onclick = function () { state.bags = []; renderPresets(); check(); };
    $("addCustomBtn").onclick = function () {
      var w = parseFloat($("cw").value), d = parseFloat($("cd").value), h = parseFloat($("ch").value);
      if (!(w > 0 && d > 0 && h > 0)) return;
      addBag({ id: "custom-" + w + "-" + d + "-" + h, label: { en: "Custom", "zh-TW": "自訂" }, w: w, d: d, h: h, rigid: true, allowLieFlat: true, color: "#868e96" });
    };
    $("btn2d").onclick = function () { state.view = "2d"; setViewBtns(); renderView(); };
    $("btn3d").onclick = function () { state.view = "3d"; setViewBtns(); renderView(); };
    $("saveImgBtn").onclick = saveImage;
    $("langToggle").onclick = function () {
      window.setLang(window.LANG === "en" ? "zh-TW" : "en");
      $("langToggle").textContent = window.LANG === "en" ? "中文" : "EN";
      applyI18n();
    };
    // redraw the 2D canvas on viewport / orientation change (3D self-handles)
    var rt;
    window.addEventListener("resize", function () {
      if (!state.lastResult || state.view !== "2d") return;
      clearTimeout(rt); rt = setTimeout(renderView, 150);
    });
    window.addEventListener("orientationchange", function () {
      if (state.lastResult) setTimeout(renderView, 250);
    });
  }
  // Compose a shareable PNG: title + verdict header above the current view.
  function buildShareImage(cb) {
    var r = state.lastResult;
    if (!r) return;
    var src = (state.view === "3d" && window.THREE)
      ? window.Viewer.canvas3d()
      : $("canvas2d");
    if (!src) return;
    var W = 900;
    var scale = W / src.width;
    var imgH = Math.round(src.height * scale);
    var headH = 96;
    var out = document.createElement("canvas");
    out.width = W; out.height = headH + imgH;
    var ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, out.width, out.height);

    var nLeft = r.leftover.length;
    var verdict = nLeft > 0 ? window.t("resultNo")
      : (r.fillRatio > 0.62 ? window.t("resultTight") : window.t("resultFits"));
    var color = nLeft > 0 ? "#dc2626" : (r.fillRatio > 0.62 ? "#d97706" : "#16a34a");

    ctx.fillStyle = "#1f2933";
    ctx.font = "600 26px 'Noto Sans TC', sans-serif";
    ctx.fillText(window.localized(car().name), 24, 38);
    ctx.fillStyle = color;
    ctx.font = "700 30px 'Noto Sans TC', sans-serif";
    ctx.fillText(verdict, 24, 78);
    ctx.fillStyle = "#64748b";
    ctx.font = "16px 'Noto Sans TC', sans-serif";
    var stat = r.placements.length + " " + window.t("placed") + " · " +
      nLeft + " " + window.t("leftover") + " · " +
      Math.round(r.fillRatio * 100) + "% " + window.t("fill");
    ctx.textAlign = "right";
    ctx.fillText(stat, W - 24, 78);
    ctx.textAlign = "left";

    ctx.drawImage(src, 0, headH, W, imgH);
    out.toBlob(function (blob) { cb(blob, verdict); }, "image/png");
  }

  function saveImage() {
    if (!state.lastResult) { flash(window.t("noBags")); return; }
    buildShareImage(function (blob) {
      var file = new File([blob], "luggage-fit.png", { type: "image/png" });
      // Native share on mobile if available
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: window.t("shareTitle") }).catch(function () {});
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "luggage-fit.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  function setViewBtns() {
    $("btn3d").classList.toggle("active", state.view === "3d");
    $("btn2d").classList.toggle("active", state.view === "2d");
  }

  function boot() {
    wire();
    $("langToggle").textContent = window.LANG === "en" ? "中文" : "EN";
    setViewBtns();
    applyI18n();
    function tryInit() {
      if (window.THREE) { window.Viewer.init($("view3d")); }
      else { state.view = "2d"; setViewBtns(); }
    }
    if (window.THREE) tryInit();
    else window.addEventListener("three-ready", tryInit, { once: true });
    // safety: if three never loads (offline), fall back to 2D after 4s
    setTimeout(function () { if (!window.THREE && state.view !== "2d") { state.view = "2d"; setViewBtns(); renderView(); } }, 4000);
    check(); // initial render — shows the selected car straight away (live mode)
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
