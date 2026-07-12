/* Minimal bilingual i18n (zh-TW / en). window.t(key) reads current language. */
(function () {
  var STRINGS = {
    en: {
      title: "Will my luggage fit?",
      subtitle: "Check if your suitcases fit in a rental car — with a 3D packing view.",
      carLabel: "Rental car",
      seatsDown: "Fold rear seats down",
      yourBags: "Your bags",
      addPreset: "Add a bag",
      custom: "Custom size",
      qty: "Qty",
      remove: "Remove",
      check: "Check fit",
      clear: "Clear",
      width: "Width", depth: "Depth", height: "Height", cm: "cm",
      addCustom: "Add custom bag",
      resultFits: "Fits! 🎉",
      resultTight: "Tight — should fit ⚠️",
      resultNo: "Won't fit ❌",
      fitsDesc: "All bags fit with room to spare.",
      tightDesc: "All bags placed, but it's snug. Real boots are curved, so leave margin.",
      noDesc: "These bags didn't fit:",
      fill: "Space used",
      placed: "Placed",
      leftover: "Left over",
      noBags: "Add at least one bag first.",
      legend: "Legend",
      boot: "Boot outline",
      drag: "Drag / pinch to rotate & zoom",
      confidence: "Data confidence",
      conf_high: "high", conf_medium: "medium", conf_low: "low",
      disclaimer: "Estimate only. The boot is modelled as boxes; real shapes are irregular. Always sanity-check in person.",
      capacity: "Boot capacity",
      bagsPlaced: "bags",
      twoD: "2D view",
      threeD: "3D view",
      saveImage: "Save / share image",
      shareTitle: "Luggage fit result",
      customCar: "✏️ Enter my own trunk size…",
      customCarName: "My trunk",
      bootInside: "Boot inside size (W × D × H)",
      openingSize: "Boot opening (W × H)",
      openW: "Opening W", openH: "Opening H",
      trunkLabel: "TRUNK", seatLabel: "REAR SEAT", seatFolded: "SEATS FOLDED",
      empty: "Pick a car and add a bag — it checks automatically.",
      modeCar: "Pick a car",
      modeLuggage: "Find cars for my luggage",
      matchesTitle: "Cars that fit your bags",
      matchesEmpty: "Add at least one bag — I'll list every rental car it fits in.",
      withSeatsFolded: "with seats folded",
      matchSummary: "{fits} fit · {tight} tight · {no} won't fit"
    },
    "zh-TW": {
      title: "我的行李放得下嗎？",
      subtitle: "確認你的行李箱能不能塞進租來的車 — 附 3D 擺放示意。",
      carLabel: "租用車款",
      seatsDown: "後座椅背放倒",
      yourBags: "你的行李",
      addPreset: "新增行李",
      custom: "自訂尺寸",
      qty: "數量",
      remove: "移除",
      check: "開始計算",
      clear: "清除",
      width: "寬", depth: "深", height: "高", cm: "公分",
      addCustom: "新增自訂行李",
      resultFits: "放得下！🎉",
      resultTight: "有點擠，應該可以 ⚠️",
      resultNo: "放不下 ❌",
      fitsDesc: "全部行李都放得下，還有空間。",
      tightDesc: "全部放進去了，但很滿。實際後車廂是曲面，請保留餘裕。",
      noDesc: "以下行李放不進去：",
      fill: "空間使用率",
      placed: "已擺放",
      leftover: "放不下",
      noBags: "請先新增至少一件行李。",
      legend: "圖例",
      boot: "後車廂輪廓",
      drag: "拖曳旋轉 · 雙指縮放",
      confidence: "資料可信度",
      conf_high: "高", conf_medium: "中", conf_low: "低",
      disclaimer: "僅供估算。後車廂以方塊近似，實際形狀為不規則曲面，請務必現場確認。",
      capacity: "後車廂容量",
      bagsPlaced: "件",
      twoD: "2D 視圖",
      threeD: "3D 視圖",
      saveImage: "儲存／分享圖片",
      shareTitle: "行李擺放結果",
      customCar: "✏️ 自行輸入後車廂尺寸…",
      customCarName: "自訂後車廂",
      bootInside: "後車廂內部尺寸（寬 × 深 × 高）",
      openingSize: "開口尺寸（寬 × 高）",
      openW: "開口寬", openH: "開口高",
      trunkLabel: "後車廂", seatLabel: "後座", seatFolded: "後座放倒",
      empty: "選擇車款並加入行李，會即時自動計算。",
      modeCar: "選車",
      modeLuggage: "用行李找車",
      matchesTitle: "可放下你行李的車款",
      matchesEmpty: "先新增至少一件行李，會列出每一台能放下的租車。",
      withSeatsFolded: "後座放倒",
      matchSummary: "{fits} 放得下 · {tight} 較擠 · {no} 放不下"
    }
  };

  window.LANG = localStorage.getItem("lang") || (navigator.language && navigator.language.indexOf("zh") === 0 ? "zh-TW" : "en");
  window.t = function (key) {
    var table = STRINGS[window.LANG] || STRINGS.en;
    return (key in table) ? table[key] : (STRINGS.en[key] || key);
  };
  window.setLang = function (lang) {
    window.LANG = lang;
    localStorage.setItem("lang", lang);
  };
  window.localized = function (obj) {
    if (!obj) return "";
    return obj[window.LANG] || obj.en || Object.values(obj)[0];
  };
})();
