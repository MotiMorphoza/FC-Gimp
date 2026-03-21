(function () {
  "use strict";

  var SHOP_STORE_KEY = "shopStore";
  var LEGACY_CART_KEY = "moto_cart_v2";
  var SIZE_ORDER = ["A6", "A5", "A4", "A3", "A2", "A1"];

  function isValidSizeId(sizeId) {
    return SIZE_ORDER.indexOf(String(sizeId || "").toUpperCase()) !== -1;
  }

  function parseJSON(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function sanitizeStore(input) {
    var out = { select: {}, cart: {} };
    var src = input && typeof input === "object" ? input : {};

    Object.keys(src.select || {}).forEach(function (code) {
      var key = String(code || "").trim().toUpperCase();
      if (!key) return;
      var item = src.select[code] || {};
      var size = String(item.size || "").toUpperCase();
      if (size && !isValidSizeId(size)) size = "";
      out.select[key] = { size: size, thumb: String(item.thumb || "") };
    });

    Object.keys(src.cart || {}).forEach(function (code) {
      var key = String(code || "").trim().toUpperCase();
      if (!key) return;
      var item = src.cart[code] || {};
      var cleanSizes = {};

      Object.keys(item.sizes || {}).forEach(function (sizeId) {
        var normalizedSize = String(sizeId || "").toUpperCase();
        var qty = parseInt(item.sizes[sizeId], 10);
        if (SIZE_ORDER.indexOf(normalizedSize) === -1 || !isFinite(qty) || qty < 1) return;
        cleanSizes[normalizedSize] = qty;
      });

      if (!Object.keys(cleanSizes).length) return;
      out.cart[key] = { thumb: String(item.thumb || ""), sizes: cleanSizes };
    });

    return out;
  }

  function rowsFromCart(store) {
    var rows = [];
    Object.keys(store.cart || {}).forEach(function (code) {
      var group = store.cart[code] || {};
      Object.keys(group.sizes || {}).forEach(function (sizeId) {
        var qty = parseInt(group.sizes[sizeId], 10);
        if (!isFinite(qty) || qty < 1) return;
        rows.push({
          code: code,
          sizeId: String(sizeId || "").toUpperCase(),
          qty: qty,
          thumb: String(group.thumb || "")
        });
      });
    });
    return rows;
  }

  function syncLegacyCart(store) {
    var legacy = rowsFromCart(store).map(function (row) {
      return {
        code: row.code,
        sizeId: row.sizeId,
        sizeLabel: row.sizeId,
        qty: row.qty,
        thumbnailUrl: row.thumb
      };
    });

    try {
      localStorage.setItem(LEGACY_CART_KEY, JSON.stringify(legacy));
    } catch (_error) {}

    try {
      window.dispatchEvent(new Event("moto:cart-updated"));
    } catch (_error2) {}
  }

  function loadStore() {
    return sanitizeStore(parseJSON(localStorage.getItem(SHOP_STORE_KEY) || "", { select: {}, cart: {} }));
  }

  function saveStore(store, code) {
    var clean = sanitizeStore(store);

    try {
      localStorage.setItem(SHOP_STORE_KEY, JSON.stringify(clean));
    } catch (_error) {}

    syncLegacyCart(clean);

    try {
      window.dispatchEvent(new CustomEvent("moto:shop-store-updated", {
        detail: { store: clean, code: code || "" }
      }));
    } catch (_error2) {}

    return clean;
  }

  function addCodeToSelect(code, options) {
    var normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return { ok: false };

    var store = loadStore();
    var thumbnailUrl = String((options && options.thumbnailUrl) || (store.select[normalizedCode] && store.select[normalizedCode].thumb) || "");

    if (!store.select[normalizedCode]) {
      store.select[normalizedCode] = { size: "", thumb: thumbnailUrl };
    } else if (thumbnailUrl) {
      store.select[normalizedCode].thumb = thumbnailUrl;
    }

    saveStore(store, normalizedCode);
    return { ok: true };
  }

  if (typeof window.DEFAULT_SIZE_IDX !== "number") {
    window.DEFAULT_SIZE_IDX = 2;
  }

  window.motoAddToCartByCode = function (code, options) {
    return addCodeToSelect(code, options || {});
  };
})();
