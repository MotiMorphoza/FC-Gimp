(function () {
  "use strict";

  var SHOP_STORE_KEY = "shopStore";
  var LEGACY_CART_KEY = "moto_cart_v2";
  var UI_KEY = "shopUiV2";
  var SHOP_INDEX_FALLBACK = "shop/index.json";

  var SIZE_ORDER = ["A6", "A5", "A4", "A3", "A2", "A1"];
  var SIZE_DESC = { A6: "POSTCARD", A5: "SMALL PRINT", A4: "STANDARD PRINT", A3: "RECOMMENDED", A2: "LARGE POSTER", A1: "POSTER" };

  var COUNTRIES = [
    { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "DE", name: "Germany" },
    { code: "FR", name: "France" }, { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
    { code: "ES", name: "Spain" }, { code: "IT", name: "Italy" }, { code: "NL", name: "Netherlands" },
    { code: "BE", name: "Belgium" }, { code: "SE", name: "Sweden" }, { code: "NO", name: "Norway" },
    { code: "DK", name: "Denmark" }, { code: "FI", name: "Finland" }, { code: "IE", name: "Ireland" },
    { code: "AT", name: "Austria" }, { code: "CH", name: "Switzerland" }, { code: "CZ", name: "Czech Republic" },
    { code: "SK", name: "Slovakia" }, { code: "HU", name: "Hungary" }, { code: "RO", name: "Romania" },
    { code: "GR", name: "Greece" }, { code: "IL", name: "Israel" }, { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" }, { code: "JP", name: "Japan" }, { code: "IN", name: "India" }
  ];

  var app = {
    codeMap: new Map(),
    indexPromise: null,
    refs: null,
    highlightCode: "",
    touched: {},
    previewReturnFocusEl: null,
    request: { submitting: false, kind: "", lines: [] }
  };

  function h(tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || typeof v === "undefined") return;
      if (k === "className") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    });
    return n;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function cfg() {
    return window.SHOP_CONFIG || {
      currency: "EUR",
      storeCountry: "PL",
      shipping: { local: { base: 7, freeAbove: 77 }, international: { base: 27, freeAbove: 222 } },
      shopIndexUrl: SHOP_INDEX_FALLBACK
    };
  }

  function sizes() {
    return Array.isArray(window.PRINT_SIZES) && window.PRINT_SIZES.length ? window.PRINT_SIZES : [
      { id: "A6", dims: "10.5 x 14.8 cm", price: 2.5 },
      { id: "A5", dims: "14.8 x 21 cm", price: 5 },
      { id: "A4", dims: "21 x 29.7 cm", price: 10 },
      { id: "A3", dims: "29.7 x 42 cm", price: 20 },
      { id: "A2", dims: "42 x 59.4 cm", price: 40 },
      { id: "A1", dims: "59.4 x 84.1 cm", price: 70 }
    ];
  }

  // PRICE_MAP - built once on first use. sizes() reads window.PRINT_SIZES which
  // is set by config.js before shop.js and does not change at runtime.
  var _priceMap = null;
  function priceFor(sizeId) {
    if (!_priceMap) {
      _priceMap = {};
      sizes().forEach(function(s) { _priceMap[String(s.id).toUpperCase()] = Number(s.price || 0); });
    }
    return _priceMap[String(sizeId || "").toUpperCase()] || 0;
  }

  function money(v) { return String((cfg().currency || "EUR").toUpperCase()) + " " + Number(v || 0).toFixed(2); }

  function isValidSizeId(sizeId) {
    return SIZE_ORDER.indexOf(String(sizeId || "").toUpperCase()) !== -1;
  }

  function parseJSON(raw, fallback) { try { return JSON.parse(raw); } catch (_e) { return fallback; } }

  function getUiStorage() {
    try { if (window.sessionStorage) return window.sessionStorage; } catch (_e) {}
    try { if (window.localStorage) return window.localStorage; } catch (_e2) {}
    return null;
  }

  function placeholder() {
    return "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#111"/><text x="50%" y="50%" fill="#666" font-size="10" text-anchor="middle" dominant-baseline="middle">NO PREVIEW</text></svg>');
  }

  function loadScriptOnce(src) {
    var ex = document.querySelector('script[src="' + src + '"]');
    if (ex && ex.dataset.loaded === "1") return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = ex || document.createElement("script");
      s.src = src;
      s.async = true;
      s.addEventListener("load", function () { s.dataset.loaded = "1"; resolve(); }, { once: true });
      s.addEventListener("error", function () { reject(new Error("Script failed")); }, { once: true });
      if (!ex) document.head.appendChild(s);
    });
  }

  function sanitizeStore(input) {
    var out = { select: {}, cart: {} };
    var src = input && typeof input === "object" ? input : {};

    Object.keys(src.select || {}).forEach(function (code) {
      var key = String(code || "").trim().toUpperCase();
      if (!key) return;
      var item = src.select[code] || {};
      var size = String(item.size || "").toUpperCase();
      if (size && SIZE_ORDER.indexOf(size) === -1) size = "";
      out.select[key] = { size: size, thumb: String(item.thumb || "") };
    });

    Object.keys(src.cart || {}).forEach(function (code) {
      var key = String(code || "").trim().toUpperCase();
      if (!key) return;
      var item = src.cart[code] || {};
      var cleanSizes = {};
      Object.keys(item.sizes || {}).forEach(function (sid) {
        var id = String(sid || "").toUpperCase();
        var qty = parseInt(item.sizes[sid], 10);
        if (SIZE_ORDER.indexOf(id) === -1 || !isFinite(qty) || qty < 1) return;
        cleanSizes[id] = qty;
      });
      if (!Object.keys(cleanSizes).length) return;
      out.cart[key] = { thumb: String(item.thumb || ""), sizes: cleanSizes };
    });

    return out;
  }

  function loadStore() { return sanitizeStore(parseJSON(localStorage.getItem(SHOP_STORE_KEY) || "", { select: {}, cart: {} })); }

  function rowsFromCart(store) {
    var rows = [];
    Object.keys(store.cart || {}).forEach(function (code) {
      var group = store.cart[code] || {};
      Object.keys(group.sizes || {}).forEach(function (sid) {
        var qty = parseInt(group.sizes[sid], 10);
        if (!isFinite(qty) || qty < 1) return;
        rows.push({ code: code, size: sid, qty: qty, price: priceFor(sid), thumb: String(group.thumb || "") });
      });
    });
    return rows;
  }

  function syncLegacyCart(store) {
    var legacy = rowsFromCart(store).map(function (r) {
      return { code: r.code, sizeId: r.size, sizeLabel: r.size, qty: r.qty, price: r.price, thumbnailUrl: r.thumb || "" };
    });
    try { localStorage.setItem(LEGACY_CART_KEY, JSON.stringify(legacy)); } catch (_e) {}
    try { window.dispatchEvent(new Event("moto:cart-updated")); } catch (_e2) {}
  }

  function saveStore(store, code) {
    var clean = sanitizeStore(store);
    try { localStorage.setItem(SHOP_STORE_KEY, JSON.stringify(clean)); } catch (_e) {}
    syncLegacyCart(clean);
    try { window.dispatchEvent(new CustomEvent("moto:shop-store-updated", { detail: { store: clean, code: code || "" } })); } catch (_e2) {}
    return clean;
  }

  function loadUi() {
  var storage = getUiStorage();
  var raw = parseJSON((storage && storage.getItem(UI_KEY)) || "", {});
  return {
    country: String(raw.country || ""),
    email: String(raw.email || ""),
    name: String(raw.name || ""),
    phone: String(raw.phone || ""),
    street: String(raw.street || ""),
    city: String(raw.city || ""),
    postal: String(raw.postal || ""),
    notes: String(raw.notes || "")
  };
}

  function saveUi(ui) {
    var storage = getUiStorage();
    if (!storage) return;
    try { storage.setItem(UI_KEY, JSON.stringify(ui)); } catch (_e) {}
  }

  function clearUi() {
    var storage = getUiStorage();
    if (!storage) return;
    try { storage.removeItem(UI_KEY); } catch (_e) {}
  }

  function findCountryByName(name) {
    var n = String(name || "").trim().toLowerCase();
    if (!n) return null;
    for (var i = 0; i < COUNTRIES.length; i += 1) if (COUNTRIES[i].name.toLowerCase() === n) return COUNTRIES[i];
    return null;
  }

  function shippingFor(subtotal, countryName) {
    var c = findCountryByName(countryName);
    var local = c && c.code === String(cfg().storeCountry || "PL").toUpperCase();
    var tier = local ? cfg().shipping.local : cfg().shipping.international;
    var base = Number(tier.base || 0);
    var free = Number(tier.freeAbove || 0);
    return subtotal >= free ? 0 : base;
  }

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim()); }

  function isPhoneValid(v) {
    return /^[+()\-\s0-9]{6,}$/.test(String(v || "").trim());
  }


function isAddressValid(ui) {
  return (
    ui.name.trim().length > 1 &&
    ui.street.trim().length > 3 &&
    ui.city.trim().length > 1 &&
    ui.postal.trim().length > 1
  );
}



  function loadShopIndex() {
    if (app.indexPromise) return app.indexPromise;
    var url = String(cfg().shopIndexUrl || SHOP_INDEX_FALLBACK) + "?v=" + encodeURIComponent(window.__BUILD_VERSION__ || Date.now());
    app.indexPromise = fetch(url, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("index failed");
      return res.json();
    }).then(function (data) {
      app.codeMap = new Map();
      (data.projects || []).forEach(function (p) {
        (p.images || []).forEach(function (img) {
          app.codeMap.set(String(img.code || "").toUpperCase(), {
            thumb: String(img.thumbnailUrl || ""),
            alt: String(img.alt || img.caption || img.code || ""),
            title: String(p.title || "")
          });
        });
      });
      return app.codeMap;
    }).catch(function () {
      app.codeMap = new Map();
      return app.codeMap;
    });
    return app.indexPromise;
  }

  function addCodeToSelect(code, options) {
    var c = String(code || "").trim().toUpperCase();
    if (!c) return { ok: false };
    var store = loadStore();
    var mapped = app.codeMap.get(c);
    var thumb = String((options && options.thumbnailUrl) || (store.select[c] && store.select[c].thumb) || (mapped && mapped.thumb) || placeholder());
    if (!store.select[c]) {
      store.select[c] = { size: "", thumb: thumb };
    } else {
      store.select[c].thumb = thumb || store.select[c].thumb;
    }
    saveStore(store, c);
    return { ok: true };
  }

  function ensurePreviewLightbox() {
    var lb = document.getElementById("lightbox");
    if (!lb) return null;
    lb.setAttribute("aria-hidden", lb.classList.contains("active") ? "false" : "true");

    function closePreviewLightbox(targetLb) {
      var activeLightbox = targetLb || lb;
      if (!activeLightbox) return;
      activeLightbox.classList.remove("active");
      activeLightbox.setAttribute("aria-hidden", "true");
      if (app.previewReturnFocusEl && app.previewReturnFocusEl.isConnected && typeof app.previewReturnFocusEl.focus === "function") {
        app.previewReturnFocusEl.focus({ preventScroll: true });
      }
      app.previewReturnFocusEl = null;
    }

    if (!lb.dataset.shopBound) {
      var closeBtn = lb.querySelector(".lightbox-close");
      lb.addEventListener("click", function (e) {
        if (e.target === lb) closePreviewLightbox();
      });
      if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          closePreviewLightbox();
        });
      }
      lb.dataset.shopBound = "true";
    }

    if (!window.__SHOP_PREVIEW_LIGHTBOX_KEYBOUND__) {
      window.__SHOP_PREVIEW_LIGHTBOX_KEYBOUND__ = true;
      document.addEventListener("keydown", function (e) {
        var active = document.getElementById("lightbox");
        if (!active || !active.classList.contains("active")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          closePreviewLightbox(active);
        }
      });
    }

    return lb;
  }

  function openPreview(src, alt, triggerEl) {
    var lb = ensurePreviewLightbox();
    if (!lb) return;
    var img = lb.querySelector("img");
    if (img) { img.src = src; img.alt = alt || ""; }
    lb.dataset.single = "true";
    lb.classList.add("active");
    lb.setAttribute("aria-hidden", "false");
    app.previewReturnFocusEl = triggerEl instanceof HTMLElement
      ? triggerEl
      : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    var closeBtn = lb.querySelector(".lightbox-close");
    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus({ preventScroll: true });
    }
  }

  function availableSizes(store, code) {
    var inCart = Object.keys(((store.cart[code] || {}).sizes) || {});
    return SIZE_ORDER.filter(function (sid) { return inCart.indexOf(sid) === -1; });
  }

  function syncCountryControls(value, source) {
    var normalized = String(value || "");
    var match = findCountryByName(normalized);
    var nextValue = match ? match.name : normalized;

    if (app.refs && app.refs.countryInput && source !== "input") {
      app.refs.countryInput.value = nextValue;
    }
    if (app.refs && app.refs.countrySelect && source !== "select") {
      app.refs.countrySelect.value = match ? match.name : "";
    }

    return nextValue;
  }

  function uiState() {
  var country = String((app.refs.countrySelect && app.refs.countrySelect.value) || (app.refs.countryInput && app.refs.countryInput.value) || "");
  return {
    country: country,
    email: String(app.refs.emailInput.value || ""),
    name: String(app.refs.nameInput.value || ""),
    phone: String(app.refs.phoneInput.value || ""),
    street: String(app.refs.streetInput.value || ""),
    city: String(app.refs.cityInput.value || ""),
    postal: String(app.refs.postalInput.value || ""),
    notes: String(app.refs.notesInput.value || "")
  };
}

  function syncRequiredPromptState(node, isPending) {
    if (!node || !node.classList) return;
    node.classList.toggle("is-placeholder", !!isPending);
  }

  function resetUiForm() {
    if (!app.refs) return;
    syncCountryControls("", "reset");
    app.refs.emailInput.value = "";
    app.refs.nameInput.value = "";
    app.refs.phoneInput.value = "";
    app.refs.streetInput.value = "";
    app.refs.cityInput.value = "";
    app.refs.postalInput.value = "";
    app.refs.notesInput.value = "";
    app.touched = {};
    clearUi();
  }

  function buildShop(root) {
  clear(root);
  root.classList.add("shop-v7");

  root.appendChild(h("h1", { className: "shop-title", text: "Fine Art Prints" }));
  root.appendChild(h("p", { className: "shop-intro-para", text: "Prints on premium art paper. Ships in protective packaging, ready to frame." }));
  root.appendChild(h("p", { className: "shop-intro-para", text: "To order: Browse project galleries and click an image code to add prints to your cart." }));

  var prices = h("table", { className: "shop-prices-table" });
  var thRow = h("tr", {});
  ["Size", "Physical size", "Description", "Price"].forEach(function (x) { thRow.appendChild(h("th", { text: x })); });
  var thead = h("thead", {}); thead.appendChild(thRow); prices.appendChild(thead);
  var tbody = h("tbody", {});
  sizes().forEach(function (s) {
    var tr = h("tr", {});
    tr.appendChild(h("td", { text: s.id }));
    tr.appendChild(h("td", { text: s.dims }));
    tr.appendChild(h("td", { text: SIZE_DESC[s.id] || "" }));
    tr.appendChild(h("td", { text: money(s.price) }));
    tbody.appendChild(tr);
  });
  prices.appendChild(tbody);
  root.appendChild(prices);

  root.appendChild(h("h2", { className: "shop-section-title shop-section-title-shop-main", text: "SHIPPING" }));
  root.appendChild(h("p", { className: "shipping-title", text: "LOCAL SHIPPING" }));
  root.appendChild(h("p", { className: "shop-intro-para", text: "7.00 EUR (free over EUR 77.00)." }));
  root.appendChild(h("p", { className: "shipping-title", text: "INTERNATIONAL SHIPPING" }));
  root.appendChild(h("p", { className: "shop-intro-para", text: "27.00 EUR (free over EUR 222.00)." }));

  var countryWrap = h("div", { className: "shop-field shop-country-field" });
  countryWrap.appendChild(h("label", { className: "shop-label shipping-country-label", for: "shop-country-v2", text: "ADD SHIPPING COUNTRY" }));
  var countryInput = h("input", { id: "shop-country-v2", className: "shop-input shop-country-input", list: "shop-country-list-v2", autocomplete: "country-name", placeholder: "SELECT COUNTRY" });
  var countrySelect = h("select", { id: "shop-country-mobile-v2", className: "shop-input shop-country-select", "aria-label": "Select shipping country" });
  countrySelect.appendChild(h("option", { value: "", text: "SELECT COUNTRY" }));
  var dl = h("datalist", { id: "shop-country-list-v2" });
  COUNTRIES.forEach(function (c) {
    dl.appendChild(h("option", { value: c.name }));
    countrySelect.appendChild(h("option", { value: c.name, text: c.name }));
  });
  countryWrap.appendChild(countryInput);
  countryWrap.appendChild(countrySelect);
  countryWrap.appendChild(dl);
  root.appendChild(countryWrap);

  var selectSec = h("section", {});
  selectSec.appendChild(h("h2", { className: "shop-section-title shop-section-title-shop-main shop-section-title-select", text: "SELECT PRINT SIZE" }));
  var selectBody = h("div", { className: "shop-select-body" });
  selectSec.appendChild(selectBody);
  root.appendChild(selectSec);

  var cartSec = h("section", {});
  var cartTitle = h("h2", { className: "shop-section-title shop-section-title-cart" });
  cartTitle.appendChild(h("span", { className: "shop-section-title-cart-icon", text: "🛒" }));
  cartTitle.appendChild(h("span", { text: "CART" }));
  cartSec.appendChild(cartTitle);
  var cartBody = h("div", { className: "shop-cart-body" });
  cartSec.appendChild(cartBody);
  root.appendChild(cartSec);

  var totals = h("div", { className: "shop-cart-totals" });
  root.appendChild(totals);

  var clearBtn = h("button", { type: "button", className: "shop-clear-cart-btn clear-cart", text: "Clear Cart" });
  var clearWrap = h("div", { className: "shop-clear-cart-actions" }); clearWrap.appendChild(clearBtn); root.appendChild(clearWrap);

  var checkout = h("section", { className: "shop-checkout" });
  checkout.appendChild(h("h2", { className: "shop-section-title", text: "Customer details form" }));

  var eWrap = h("div", { className: "shop-field" });
  eWrap.appendChild(h("label", { className: "shop-label", for: "shop-email-v2", text: "Email" }));
  var emailInput = h("input", { id: "shop-email-v2", className: "shop-input", type: "email", placeholder: "name@example.com" });
  var emailMsg = h("span", { className: "shop-validation-msg", id: "shop-email-v2-msg" });
  eWrap.appendChild(emailInput); 
  eWrap.appendChild(emailMsg); 
  checkout.appendChild(eWrap);

  var nameWrap = h("div", { className: "shop-field" });
  nameWrap.appendChild(h("label", { className: "shop-label", for: "shop-name-v2", text: "Full name" }));
  var nameInput = h("input", { id: "shop-name-v2", className: "shop-input", type: "text", placeholder: "Full name" });
  nameWrap.appendChild(nameInput);
  checkout.appendChild(nameWrap);

  var phoneWrap = h("div", { className: "shop-field" });
  phoneWrap.appendChild(h("label", { className: "shop-label", for: "shop-phone-v2", text: "Phone" }));
  var phoneInput = h("input", { id: "shop-phone-v2", className: "shop-input", type: "tel", placeholder: "Phone number" });
  var phoneMsg = h("span", { className: "shop-validation-msg", id: "shop-phone-v2-msg" });
  phoneWrap.appendChild(phoneInput);
  phoneWrap.appendChild(phoneMsg);
  checkout.appendChild(phoneWrap);

  var streetWrap = h("div", { className: "shop-field" });
  streetWrap.appendChild(h("label", { className: "shop-label", for: "shop-street-v2", text: "Street address" }));
  var streetInput = h("input", { id: "shop-street-v2", className: "shop-input", type: "text", placeholder: "Street address" });
  streetWrap.appendChild(streetInput);
  checkout.appendChild(streetWrap);

  var cityWrap = h("div", { className: "shop-field" });
  cityWrap.appendChild(h("label", { className: "shop-label", for: "shop-city-v2", text: "City" }));
  var cityInput = h("input", { id: "shop-city-v2", className: "shop-input", type: "text", placeholder: "City" });
  cityWrap.appendChild(cityInput);
  checkout.appendChild(cityWrap);

  var postalWrap = h("div", { className: "shop-field" });
  postalWrap.appendChild(h("label", { className: "shop-label", for: "shop-postal-v2", text: "Postal / ZIP code" }));
  var postalInput = h("input", { id: "shop-postal-v2", className: "shop-input", type: "text", placeholder: "Postal code" });
  postalWrap.appendChild(postalInput);
  checkout.appendChild(postalWrap);

  var nWrap = h("div", { className: "shop-field" });
  nWrap.appendChild(h("label", { className: "shop-label", for: "shop-notes-v2", text: "Order notes (optional)" }));
  var notesInput = h("textarea", { id: "shop-notes-v2", className: "shop-input shop-notes-input", rows: "3" });
  nWrap.appendChild(notesInput); 
  checkout.appendChild(nWrap);

  var requestActions = h("div", { className: "shop-request-actions" });
  var requestBtn = h("button", { type: "button", className: "shop-add-btn shop-request-btn", text: "Send Order Request" });
  var requestStatus = h("div", { className: "shop-request-status", "aria-live": "polite" });
  requestActions.appendChild(requestBtn);
  checkout.appendChild(requestActions);
  checkout.appendChild(requestStatus);

  root.appendChild(checkout);

  return {
    root: root,
    countryInput: countryInput,
    countrySelect: countrySelect,
    selectBody: selectBody,
    cartBody: cartBody,
    totals: totals,
    clearBtn: clearBtn,
    emailInput: emailInput,
    emailMsg: emailMsg,
    nameInput: nameInput,
    phoneInput: phoneInput,
    phoneMsg: phoneMsg,
    streetInput: streetInput,
    cityInput: cityInput,
    postalInput: postalInput,
    notesInput: notesInput,
    requestBtn: requestBtn,
    requestStatus: requestStatus
    };
    }  
    

    function renderSelect(store) {
    clear(app.refs.selectBody);
    var codes = Object.keys(store.select).sort();
    if (!codes.length) { app.refs.selectBody.appendChild(h("p", { className: "shop-cart-empty", text: "No selected prints yet. Add from project galleries." })); return; }
    var table = h("table", { className: "shop-cart-table" });
    var th = h("tr", {}); ["YOUR PIC", "CODE", "SIZE", "ADD", "REMOVE"].forEach(function (x) { th.appendChild(h("th", { text: x })); });
    var thead = h("thead", {}); thead.appendChild(th); table.appendChild(thead); var tbody = h("tbody", {});

    codes.forEach(function (code) {
      var item = store.select[code] || {};
      var mapped = app.codeMap.get(code) || {};
      var thumb = item.thumb || mapped.thumb || placeholder();
      var thumbAlt = String(mapped.alt || code);
      var avail = availableSizes(store, code);
      var tr = h("tr", { "data-select-code": code });
      var img = h("img", { className: "shop-cart-thumb", src: thumb, alt: thumbAlt, loading: "lazy", decoding: "async" });
      img.addEventListener("error", function () { img.src = placeholder(); });
      img.addEventListener("click", function () { openPreview(img.src, thumbAlt, img); });
      var prev = h("button", { type: "button", className: "shop-thumb-preview-link cart-preview", text: "Preview" });
      prev.addEventListener("click", function () { openPreview(img.src, thumbAlt); });
      var tdThumb = h("td", { "data-label": "THUMB" }); tdThumb.appendChild(img); tdThumb.appendChild(prev);

      var tdCode = h("td", { "data-label": "CODE" }); tdCode.appendChild(h("span", { className: "shop-cart-code", text: code }));
      var tdSize = h("td", { "data-label": "SIZE" }); var sel = h("select", { className: "shop-select-size", "aria-label": "Select print size" });
      sel.appendChild(h("option", { value: "", text: "SELECT SIZE" }));
      avail.forEach(function (sid) { sel.appendChild(h("option", { value: sid, text: sid + " - " + (SIZE_DESC[sid] || "") })); });
      if (!avail.length) sel.disabled = true;
      else sel.value = (isValidSizeId(item.size) && avail.indexOf(item.size) !== -1) ? item.size : "";
      syncRequiredPromptState(sel, !sel.disabled && !sel.value);
      tdSize.appendChild(sel);

      var tdAdd = h("td", { "data-label": "ADD" });
      var addBtn = h("button", { type: "button", className: "shop-add-btn", text: avail.length ? "ADD" : "All sizes already in cart" });
      function refreshSelectActions() {
        var hasSize = isValidSizeId(sel.value);
        syncRequiredPromptState(sel, !sel.disabled && !hasSize);
        if (!avail.length) {
          addBtn.disabled = true;
          addBtn.textContent = "All sizes already in cart";
          return;
        }
        addBtn.disabled = !hasSize;
        addBtn.textContent = hasSize ? "ADD" : "SELECT SIZE";
      }
      refreshSelectActions();
      tdAdd.appendChild(addBtn);
      var tdX = h("td", { "data-label": "REMOVE" });
      var rm = h("button", { type: "button", className: "shop-cart-remove-btn cart-remove", text: "REMOVE" }); tdX.appendChild(rm);

      addBtn.addEventListener("click", function () {
        var now = loadStore(); var sizeId = String(sel.value || "").toUpperCase(); if (!sizeId) return;
        if (!now.cart[code]) now.cart[code] = { thumb: thumb, sizes: {} };
        now.cart[code].thumb = now.cart[code].thumb || thumb;
        now.cart[code].sizes[sizeId] = (now.cart[code].sizes[sizeId] || 0) + 1;
        saveStore(now); addBtn.textContent = "OK"; setTimeout(render, 650);
      });
      rm.addEventListener("click", function () { var now = loadStore(); delete now.select[code]; saveStore(now); render(); });
      sel.addEventListener("change", function () {
        var now = loadStore();
        if (!now.select[code]) return;
        now.select[code].size = isValidSizeId(sel.value) ? String(sel.value || "").toUpperCase() : "";
        refreshSelectActions();
        saveStore(now);
      });

      tr.appendChild(tdThumb); tr.appendChild(tdCode); tr.appendChild(tdSize); tr.appendChild(tdAdd); tr.appendChild(tdX);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody); app.refs.selectBody.appendChild(table);
    if (app.highlightCode) {
      var row = app.refs.selectBody.querySelector('[data-select-code="' + app.highlightCode + '"]');
      if (row) { row.classList.add("added"); row.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { row.classList.remove("added"); }, 900); }
      app.highlightCode = "";
    }
  }

  function renderCart(store) {
    clear(app.refs.cartBody);
    var groups = Object.keys(store.cart).sort();
    if (!groups.length) { app.refs.cartBody.appendChild(h("p", { className: "shop-cart-empty", text: "Cart is empty." })); return; }
    groups.forEach(function (code) {
      var group = store.cart[code];
      var mapped = app.codeMap.get(code) || {};
      var thumbAlt = String(mapped.alt || code);
      var block = h("div", { className: "shop-cart-group" });
      var head = h("div", { className: "shop-cart-group-head" });
      var img = h("img", { className: "shop-cart-thumb", src: group.thumb || placeholder(), alt: thumbAlt, loading: "lazy", decoding: "async" });
      img.addEventListener("error", function () { img.src = placeholder(); });
      img.addEventListener("click", function () { openPreview(img.src, thumbAlt); });
      head.appendChild(img); head.appendChild(h("span", { className: "shop-cart-code", text: code })); block.appendChild(head);
      SIZE_ORDER.forEach(function (sid) {
        var qty = parseInt((group.sizes || {})[sid], 10); if (!isFinite(qty) || qty < 1) return;
        var row = h("div", { className: "shop-cart-size-row" });
        row.appendChild(h("span", { className: "shop-cart-size", text: sid }));
        var q = h("div", { className: "shop-qty-controls" });
        q.appendChild(h("span", { className: "shop-required-select-label shop-qty-select-label", text: "SELECT AMOUNT" }));
        var qRow = h("div", { className: "shop-qty-control-row" });
        var minus = h("button", { type: "button", className: "shop-qty-btn", text: "-" });
        var qv = h("span", { className: "shop-qty-display", text: String(qty) });
        var plus = h("button", { type: "button", className: "shop-qty-btn", text: "+" });
        qRow.appendChild(minus); qRow.appendChild(qv); qRow.appendChild(plus);
        q.appendChild(qRow);
        row.appendChild(q);
        row.appendChild(h("span", { className: "shop-line-price", text: money(qty * priceFor(sid)) }));
        var rm = h("button", { type: "button", className: "shop-cart-remove-btn cart-remove", text: "REMOVE" });
        row.appendChild(rm);
        minus.addEventListener("click", function () { var now = loadStore(); var cur = (((now.cart[code] || {}).sizes || {})[sid]) || 0; if (cur <= 1) { delete now.cart[code].sizes[sid]; if (!Object.keys(now.cart[code].sizes).length) delete now.cart[code]; } else now.cart[code].sizes[sid] = cur - 1; saveStore(now); render(); });
        plus.addEventListener("click", function () { var now = loadStore(); now.cart[code].sizes[sid] = ((((now.cart[code] || {}).sizes || {})[sid]) || 0) + 1; saveStore(now); render(); });
        rm.addEventListener("click", function () { var now = loadStore(); delete now.cart[code].sizes[sid]; if (!Object.keys(now.cart[code].sizes).length) delete now.cart[code]; saveStore(now); render(); });
        block.appendChild(row);
      });
      app.refs.cartBody.appendChild(block);
    });
  }

  function renderTotals(store, ui) {
    clear(app.refs.totals);
    var rows = rowsFromCart(store);
    var subtotal = rows.reduce(function (sum, r) { return sum + (r.qty * r.price); }, 0);
    var shipping = shippingFor(subtotal, ui.country);
    var total = subtotal + shipping;
    [["Items", money(subtotal), ""], ["Shipping", shipping === 0 ? "Free" : money(shipping), ""], ["TOTAL", money(total), " is-total"]].forEach(function (v) {
      var row = h("div", { className: "shop-totals-row" + v[2] });
      row.appendChild(h("span", { className: "shop-totals-label", text: v[0] }));
      row.appendChild(h("span", { className: "shop-totals-value", text: v[1] }));
      app.refs.totals.appendChild(row);
    });
  }

 function canSubmitOrderRequest(store, ui) {
  return (
    rowsFromCart(store).length > 0 &&
    isValidEmail(ui.email) &&
    isPhoneValid(ui.phone) &&
    findCountryByName(ui.country) !== null &&
    isAddressValid(ui)
  );
}

  function buildOrderRequestPayload(store, ui) {
    var rows = rowsFromCart(store).map(function (row) {
      var meta = app.codeMap.get(row.code) || {};
      return {
        code: row.code,
        title: String(meta.title || ""),
        size: row.size,
        qty: row.qty,
        price: row.price,
        lineTotal: row.qty * row.price
      };
    });
    var subtotal = rows.reduce(function (sum, row) { return sum + row.lineTotal; }, 0);
    var shipping = shippingFor(subtotal, ui.country);
    var total = subtotal + shipping;
    var requestDate = new Date();

    return {
      requestId: "MS-REQ-" + requestDate.getTime(),
      requestDateText: requestDate.toLocaleString(),
      email: ui.email,
      name: ui.name,
      phone: ui.phone,
      country: ui.country,
      street: ui.street,
      city: ui.city,
      postal: ui.postal,
      notes: ui.notes,
      rows: rows,
      subtotal: subtotal,
      shipping: shipping,
      total: total
    };
  }

  function clearRequestFeedback() {
    app.request.kind = "";
    app.request.lines = [];
  }

  function setRequestFeedback(kind, lines) {
    app.request.kind = kind || "";
    app.request.lines = Array.isArray(lines) ? lines.slice() : (lines ? [String(lines)] : []);
  }

  function renderRequestStatus() {
    clear(app.refs.requestStatus);
    if (!app.request.kind || !app.request.lines.length) return;

    var notice = h("div", { className: "shop-notice shop-notice--" + app.request.kind });
    app.request.lines.forEach(function (line) {
      notice.appendChild(h("p", { text: line }));
    });
    app.refs.requestStatus.appendChild(notice);
  }

  function emailJsAllowedDomain() {
    var allow = cfg().emailjsAllowedDomains;
    if (!Array.isArray(allow) || !allow.length) return true;
    var host = String(window.location.hostname || "").toLowerCase();
    return allow.some(function (entry) {
      var d = String(entry || "").trim().toLowerCase();
      if (!d) return false;
      if (d === host) return true;
      if (d.indexOf("*.") === 0) {
        var sfx = d.slice(2);
        return host === sfx || host.endsWith("." + sfx);
      }
      return false;
    });
  }

  function sendOrderRequestEmail(payload) {
    if (!cfg().emailjsServiceId || !cfg().emailjsTemplateCustomer || !cfg().emailjsTemplateSeller || !cfg().emailjsPublicKey) {
      return Promise.reject(new Error("EmailJS config missing"));
    }
    if (!emailJsAllowedDomain()) {
      return Promise.reject(new Error("EmailJS domain blocked"));
    }

    return loadScriptOnce("https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js").then(function () {
      if (!window.emailjs) throw new Error("EmailJS failed to load");
      window.emailjs.init(cfg().emailjsPublicKey);

      var titles = [];
      var breakdown = payload.rows.map(function (row) {
        if (row.title && titles.indexOf(row.title) === -1) titles.push(row.title);
        return [
          row.code,
          row.title ? row.title : "Untitled project",
          row.size,
          "Qty " + row.qty,
          "Unit " + money(row.price),
          "Line " + money(row.lineTotal)
        ].join(" | ");
      }).join("\n");

      var params = {
        request_type: "Order Request",
        request_id: payload.requestId,
        order_id: payload.requestId,
        request_date: payload.requestDateText,
        order_date: payload.requestDateText,
        customer_name: payload.name || "",
        customer_email: payload.email || "",
        customer_country: payload.country || "",
        customer_city: payload.city || "",
        customer_street: payload.street || "",
        customer_postal: payload.postal || "",
        customer_address: [payload.street, payload.city, payload.postal, payload.country].filter(Boolean).join(", "),
        customer_phone: payload.phone || "",
        order_notes: payload.notes ? payload.notes : "-",
        project_titles: titles.length ? titles.join(", ") : "-",
        items_breakdown: breakdown || "-",
        item_count: String(payload.rows.length),
        subtotal: money(payload.subtotal),
        shipping: payload.shipping === 0 ? "Free" : money(payload.shipping),
        total: money(payload.total),
        total_shown_to_customer: money(payload.total)
      };

      return Promise.all([
        window.emailjs.send(cfg().emailjsServiceId, cfg().emailjsTemplateCustomer, params),
        window.emailjs.send(cfg().emailjsServiceId, cfg().emailjsTemplateSeller, params)
      ]);
    });
  }

  function showOrderRequestSentModal(order) {
    var returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    var overlay = document.createElement("div");
    overlay.className = "shop-thankyou-overlay";
    overlay.setAttribute("role", "presentation");

    var modal = document.createElement("div");
    modal.className = "shop-thankyou-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "shop-thankyou-title");
    modal.tabIndex = -1;

    var title = document.createElement("h2");
    title.id = "shop-thankyou-title";
    title.textContent = "Order Request Sent";

    var msg = document.createElement("p");
    msg.textContent = "Your order request has been sent.";

    var followUp = document.createElement("p");
    followUp.textContent = "Final confirmation, shipping details, and payment method will be sent by email.";

    var orderIdEl = document.createElement("p");
    orderIdEl.className = "shop-thankyou-request-id";
    orderIdEl.textContent = "Request: " + order.requestId;

    var detailsTitle = document.createElement("h3");
    detailsTitle.textContent = "Order details";

    var list = document.createElement("div");
    list.className = "shop-thankyou-items";

    order.rows.forEach(function (row) {
      var line = document.createElement("div");
      var titleText = row.title ? " | " + row.title : "";
      line.textContent = row.code + titleText + " | " + row.size + " x " + row.qty + " | " + money(row.lineTotal);
      list.appendChild(line);
    });

    var totalsEl = document.createElement("div");
    totalsEl.className = "shop-thankyou-total";
    totalsEl.textContent = "Total shown: " + money(order.total);

    var btn = document.createElement("button");
    btn.className = "shop-thankyou-close";
    btn.type = "button";
    btn.textContent = "Back to Projects";

    function closeModal() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener("keydown", onKey);
      if (returnFocusEl && returnFocusEl.isConnected && typeof returnFocusEl.focus === "function") {
        returnFocusEl.focus({ preventScroll: true });
      }
    }

    function onKey(e) { if (e.key === "Escape") closeModal(); }

    btn.addEventListener("click", function () {
      closeModal();
      if (typeof window.loadPage === "function") {
        window.loadPage("projects.html");
      } else {
        window.location.href = "projects.html";
      }
    });

    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener("keydown", onKey);

    modal.appendChild(title);
    modal.appendChild(msg);
    modal.appendChild(followUp);
    modal.appendChild(orderIdEl);
    modal.appendChild(detailsTitle);
    modal.appendChild(list);
    modal.appendChild(totalsEl);
    modal.appendChild(btn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (typeof btn.focus === "function") {
      btn.focus({ preventScroll: true });
    }
  }

  function submitOrderRequest() {
    ["email", "name", "phone", "street", "city", "postal"].forEach(function (field) {
      app.touched[field] = true;
    });

    var store = loadStore();
    var ui = uiState();

    clearRequestFeedback();
    render();

    if (app.request.submitting || !canSubmitOrderRequest(store, ui)) return;

    app.request.submitting = true;
    render();

    var payload = buildOrderRequestPayload(store, ui);

    sendOrderRequestEmail(payload).then(function () {
      var now = loadStore();
      now.cart = {};
      now.select = {};
      saveStore(now);
      resetUiForm();
      app.request.submitting = false;
      clearRequestFeedback();
      showOrderRequestSentModal(payload);
      render();
    }).catch(function () {
      app.request.submitting = false;
      setRequestFeedback("error", "Could not send your order request. Please try again.");
      render();
    });
  }


  function render() {
    if (!app.refs) return;
    var store = loadStore();
    var ui = uiState();
    renderSelect(store);
    renderCart(store);
    renderTotals(store, ui);
    var countryInvalid = rowsFromCart(store).length > 0 && findCountryByName(ui.country) === null;
    app.refs.countryInput.setAttribute("aria-invalid", countryInvalid ? "true" : "false");
    if (app.refs.countrySelect) app.refs.countrySelect.setAttribute("aria-invalid", countryInvalid ? "true" : "false");
    syncRequiredPromptState(app.refs.countryInput, findCountryByName(ui.country) === null);
    syncRequiredPromptState(app.refs.countrySelect, findCountryByName(ui.country) === null);
    app.refs.emailInput.setAttribute("aria-invalid", (app.touched.email && !isValidEmail(ui.email)) ? "true" : "false");
    app.refs.emailMsg.textContent = (app.touched.email && !isValidEmail(ui.email) && ui.email) ? "Please enter a valid email address" : "";
    app.refs.nameInput.setAttribute("aria-invalid", (app.touched.name && ui.name.trim().length <= 1) ? "true" : "false");
    app.refs.phoneInput.setAttribute("aria-invalid", (app.touched.phone && !isPhoneValid(ui.phone)) ? "true" : "false");
    app.refs.phoneMsg.textContent = (app.touched.phone && !isPhoneValid(ui.phone) && ui.phone) ? "Please enter a valid phone number" : "";
    app.refs.streetInput.setAttribute("aria-invalid", (app.touched.street && ui.street.trim().length <= 3) ? "true" : "false");
    app.refs.cityInput.setAttribute("aria-invalid", (app.touched.city && ui.city.trim().length <= 1) ? "true" : "false");
    app.refs.postalInput.setAttribute("aria-invalid", (app.touched.postal && ui.postal.trim().length <= 1) ? "true" : "false");
    app.refs.requestBtn.disabled = app.request.submitting || !canSubmitOrderRequest(store, ui);
    app.refs.requestBtn.textContent = app.request.submitting ? "Sending..." : "Send Order Request";
    renderRequestStatus();
  }

  function bindEvents() {
    function persistUiAndRender() {
      saveUi(uiState());
      render();
    }

    app.refs.countryInput.addEventListener("input", function () {
      syncCountryControls(app.refs.countryInput.value, "input");
      clearRequestFeedback();
      persistUiAndRender();
    });
    app.refs.countryInput.addEventListener("change", function () {
      syncCountryControls(app.refs.countryInput.value, "input");
      clearRequestFeedback();
      persistUiAndRender();
    });
    if (app.refs.countrySelect) {
      app.refs.countrySelect.addEventListener("change", function () {
        syncCountryControls(app.refs.countrySelect.value, "select");
        clearRequestFeedback();
        persistUiAndRender();
      });
    }
    app.refs.emailInput.addEventListener("input", function () { clearRequestFeedback(); persistUiAndRender(); });
    app.refs.emailInput.addEventListener("blur", function () { clearRequestFeedback(); persistUiAndRender(); });
    app.refs.notesInput.addEventListener("input", function () { clearRequestFeedback(); persistUiAndRender(); });
    app.refs.clearBtn.addEventListener("click", function () { if (!window.confirm("Are you sure you want to clear the cart?")) return; var now = loadStore(); now.cart = {}; saveStore(now); clearRequestFeedback(); render(); });
    app.refs.requestBtn.addEventListener("click", submitOrderRequest);
    if (window.__SHOP_STORE_LISTENER_V2__) window.removeEventListener("moto:shop-store-updated", window.__SHOP_STORE_LISTENER_V2__);
    window.__SHOP_STORE_LISTENER_V2__ = function (e) {
      if (e && e.detail && e.detail.code) app.highlightCode = String(e.detail.code || "").toUpperCase();
      if (!app.request.submitting) clearRequestFeedback();
      render();
    };
    window.addEventListener("moto:shop-store-updated", window.__SHOP_STORE_LISTENER_V2__);
  }

  function initShopPage() {
    var root = document.getElementById("shop-root");
    if (!root) return;
    if (root.getAttribute("data-shop-mounted") === "1") return;
    if (root.getAttribute("data-shop-mounting") === "1") return;
    root.setAttribute("data-shop-mounting", "1");
    loadShopIndex().then(function () {
      app.request.submitting = false;
      clearRequestFeedback();
      app.refs = buildShop(root);
      var ui = loadUi();
      syncCountryControls(ui.country, "init"); app.refs.emailInput.value = ui.email; app.refs.notesInput.value = ui.notes;

      bindEvents();
      app.refs.nameInput.value = ui.name;
      app.refs.phoneInput.value = ui.phone;
      app.refs.streetInput.value = ui.street;
      app.refs.cityInput.value = ui.city;
      app.refs.postalInput.value = ui.postal;
      app.refs.nameInput.addEventListener("input", function () { clearRequestFeedback(); saveUi(uiState()); render(); });
      app.refs.phoneInput.addEventListener("input", function () { clearRequestFeedback(); saveUi(uiState()); render(); });
      app.refs.streetInput.addEventListener("input", function () { clearRequestFeedback(); saveUi(uiState()); render(); });
      app.refs.cityInput.addEventListener("input", function () { clearRequestFeedback(); saveUi(uiState()); render(); });
      app.refs.postalInput.addEventListener("input", function () { clearRequestFeedback(); saveUi(uiState()); render(); });
      // Mark fields as touched on first blur so validation shows only after interaction
      ["email", "name", "phone", "street", "city", "postal"].forEach(function(field) {
        var input = app.refs[field + "Input"];
        if (input) input.addEventListener("blur", function() { app.touched[field] = true; render(); }, { once: true });
      });
      render();
      root.setAttribute("data-shop-mounted", "1");
      root.removeAttribute("data-shop-mounting");
    }).catch(function () {
      clear(root);
      root.appendChild(h("p", { className: "shop-notice shop-notice--error", text: "Shop could not be loaded. Please refresh." }));
      root.removeAttribute("data-shop-mounting");
    });
  }

  window.motoAddToCartByCode = function (code, options) { return addCodeToSelect(code, options || {}); };
  window.initShopPage = initShopPage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { if (document.querySelector('[data-page="shop"]')) initShopPage(); });
  } else if (document.querySelector('[data-page="shop"]')) {
    initShopPage();
  }
})();
