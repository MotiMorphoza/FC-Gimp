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
    paypal: { sdkPromise: null, rendering: false, rendered: false, actions: null, processing: false, timer: null }
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

  // PRICE_MAP — built once on first use. sizes() reads window.PRINT_SIZES which
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

  function parseJSON(raw, fallback) { try { return JSON.parse(raw); } catch (_e) { return fallback; } }

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
      var size = String(item.size || "A3").toUpperCase();
      if (SIZE_ORDER.indexOf(size) === -1) size = "A3";
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
  var raw = parseJSON(localStorage.getItem(UI_KEY) || "", {});
  return {
    country: String(raw.country || ""),
    email: String(raw.email || ""),
    name: String(raw.name || ""),
    street: String(raw.street || ""),
    city: String(raw.city || ""),
    postal: String(raw.postal || ""),
    notes: String(raw.notes || "")
  };
}

  function saveUi(ui) { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (_e) {} }

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
          app.codeMap.set(String(img.code || "").toUpperCase(), { thumb: String(img.thumbnailUrl || "") });
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
      store.select[c] = { size: "A3", thumb: thumb };
    } else {
      store.select[c].thumb = thumb || store.select[c].thumb;
    }
    saveStore(store, c);
    return { ok: true };
  }

  function openPreview(src, alt) {
    var lb = document.getElementById("lightbox");
    if (lb) {
      var img = lb.querySelector("img");
      if (img) { img.src = src; img.alt = alt || ""; }
      lb.classList.add("active");
    }
  }

  function availableSizes(store, code) {
    var inCart = Object.keys(((store.cart[code] || {}).sizes) || {});
    return SIZE_ORDER.filter(function (sid) { return inCart.indexOf(sid) === -1; });
  }

  function uiState() {
  return {
    country: String(app.refs.countryInput.value || ""),
    email: String(app.refs.emailInput.value || ""),
    name: String(app.refs.nameInput.value || ""),
    street: String(app.refs.streetInput.value || ""),
    city: String(app.refs.cityInput.value || ""),
    postal: String(app.refs.postalInput.value || ""),
    notes: String(app.refs.notesInput.value || "")
  };
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

  root.appendChild(h("h2", { className: "shop-section-title", text: "SHIPPING" }));
  root.appendChild(h("p", { className: "shop-intro-para", text: "LOCAL SHIPPING: 7.00 EUR (free over EUR 77.00)." }));
  root.appendChild(h("p", { className: "shop-intro-para", text: "INTERNATIONAL SHIPPING: EUR 27.00 (free over EUR 222.00)." }));

  var countryWrap = h("div", { className: "shop-field shop-country-field" });
  countryWrap.appendChild(h("label", { className: "shop-label shipping-country-label", for: "shop-country-v2", text: "ADD SHIPPING COUNTRY" }));
  var countryInput = h("input", { id: "shop-country-v2", className: "shop-input", list: "shop-country-list-v2", autocomplete: "country-name", placeholder: "Start typing country name" });
  var dl = h("datalist", { id: "shop-country-list-v2" });
  COUNTRIES.forEach(function (c) { dl.appendChild(h("option", { value: c.name })); });
  countryWrap.appendChild(countryInput); countryWrap.appendChild(dl);
  root.appendChild(countryWrap);

  var selectSec = h("section", {});
  selectSec.appendChild(h("h2", { className: "shop-section-title", text: "SELECT PRINT SIZE" }));
  var selectBody = h("div", { className: "shop-select-body" });
  selectSec.appendChild(selectBody);
  root.appendChild(selectSec);

  var cartSec = h("section", {});
  cartSec.appendChild(h("h2", { className: "shop-section-title", text: "CART" }));
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

  var paypalWrap = h("div", { className: "shop-paypal-wrapper" });
  var paypalContainer = h("div", { id: "paypal-button-container" });
  var paypalOverlay = h("div", { className: "shop-paypal-overlay", "aria-hidden": "true", text: "Complete checkout details to enable PayPal." });
  paypalWrap.appendChild(paypalContainer); 
  paypalWrap.appendChild(paypalOverlay); 
  checkout.appendChild(paypalWrap);

  var paypalMsg = h("p", { className: "shop-intro-para shop-paypal-message", text: "" }); 
  checkout.appendChild(paypalMsg);

  root.appendChild(checkout);

  return {
    root: root,
    countryInput: countryInput,
    selectBody: selectBody,
    cartBody: cartBody,
    totals: totals,
    clearBtn: clearBtn,
    emailInput: emailInput,
    emailMsg: emailMsg,
    nameInput: nameInput,
    streetInput: streetInput,
    cityInput: cityInput,
    postalInput: postalInput,
    notesInput: notesInput,
    paypalWrap: paypalWrap,
    paypalContainer: paypalContainer,
    paypalOverlay: paypalOverlay,
    paypalMsg: paypalMsg
    };
    }  
    

    function renderSelect(store) {
    clear(app.refs.selectBody);
    var codes = Object.keys(store.select).sort();
    if (!codes.length) { app.refs.selectBody.appendChild(h("p", { className: "shop-cart-empty", text: "No selected prints yet. Add from project galleries." })); return; }
    var table = h("table", { className: "shop-cart-table" });
    var th = h("tr", {}); ["THUMB", "CODE", "SIZE", "ADD", "X"].forEach(function (x) { th.appendChild(h("th", { text: x })); });
    var thead = h("thead", {}); thead.appendChild(th); table.appendChild(thead); var tbody = h("tbody", {});

    codes.forEach(function (code) {
      var item = store.select[code] || {};
      var thumb = item.thumb || (app.codeMap.get(code) && app.codeMap.get(code).thumb) || placeholder();
      var avail = availableSizes(store, code);
      var tr = h("tr", { "data-select-code": code });
      var img = h("img", { className: "shop-cart-thumb", src: thumb, alt: code, loading: "lazy", decoding: "async" });
      img.addEventListener("error", function () { img.src = placeholder(); });
      img.addEventListener("click", function () { openPreview(img.src, code); });
      var prev = h("button", { type: "button", className: "shop-thumb-preview-link cart-preview", text: "Preview" });
      prev.addEventListener("click", function () { openPreview(img.src, code); });
      var tdThumb = h("td", { "data-label": "THUMB" }); tdThumb.appendChild(img); tdThumb.appendChild(prev);

      var tdCode = h("td", { "data-label": "CODE" }); tdCode.appendChild(h("span", { className: "shop-cart-code", text: code }));
      var tdSize = h("td", { "data-label": "SIZE" }); var sel = h("select", { className: "shop-select-size" });
      avail.forEach(function (sid) { sel.appendChild(h("option", { value: sid, text: sid + " - " + (SIZE_DESC[sid] || "") })); });
      if (!avail.length) sel.disabled = true;
      else sel.value = avail.indexOf(item.size) !== -1 ? item.size : avail[0];
      tdSize.appendChild(sel);

      var tdAdd = h("td", { "data-label": "ADD" });
      var addBtn = h("button", { type: "button", className: "shop-add-btn", text: avail.length ? "ADD" : "All sizes already in cart" });
      if (!avail.length) addBtn.disabled = true;
      tdAdd.appendChild(addBtn);
      var tdX = h("td", { "data-label": "X" });
      var rm = h("button", { type: "button", className: "shop-cart-remove-btn cart-remove", text: "x" }); tdX.appendChild(rm);

      addBtn.addEventListener("click", function () {
        var now = loadStore(); var sizeId = String(sel.value || "").toUpperCase(); if (!sizeId) return;
        if (!now.cart[code]) now.cart[code] = { thumb: thumb, sizes: {} };
        now.cart[code].thumb = now.cart[code].thumb || thumb;
        now.cart[code].sizes[sizeId] = (now.cart[code].sizes[sizeId] || 0) + 1;
        saveStore(now); addBtn.textContent = "✓"; setTimeout(render, 650);
      });
      rm.addEventListener("click", function () { var now = loadStore(); delete now.select[code]; saveStore(now); render(); });
      sel.addEventListener("change", function () { var now = loadStore(); if (!now.select[code]) return; now.select[code].size = String(sel.value || "A3").toUpperCase(); saveStore(now); });

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
      var block = h("div", { className: "shop-cart-group" });
      var head = h("div", { className: "shop-cart-group-head" });
      var img = h("img", { className: "shop-cart-thumb", src: group.thumb || placeholder(), alt: code, loading: "lazy", decoding: "async" });
      img.addEventListener("error", function () { img.src = placeholder(); });
      img.addEventListener("click", function () { openPreview(img.src, code); });
      head.appendChild(img); head.appendChild(h("span", { className: "shop-cart-code", text: code })); block.appendChild(head);
      SIZE_ORDER.forEach(function (sid) {
        var qty = parseInt((group.sizes || {})[sid], 10); if (!isFinite(qty) || qty < 1) return;
        var row = h("div", { className: "shop-cart-size-row" });
        row.appendChild(h("span", { className: "shop-cart-size", text: sid }));
        var q = h("div", { className: "shop-qty-controls" });
        var minus = h("button", { type: "button", className: "shop-qty-btn", text: "-" });
        var qv = h("span", { className: "shop-qty-display", text: String(qty) });
        var plus = h("button", { type: "button", className: "shop-qty-btn", text: "+" });
        q.appendChild(minus); q.appendChild(qv); q.appendChild(plus);
        row.appendChild(q);
        row.appendChild(h("span", { className: "shop-line-price", text: money(qty * priceFor(sid)) }));
        var rm = h("button", { type: "button", className: "shop-cart-remove-btn cart-remove", text: "x" });
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

  function setOverlay(text, visible) {
    app.refs.paypalOverlay.textContent = text || "";
    app.refs.paypalOverlay.classList.toggle("is-visible", !!visible);
    app.refs.paypalOverlay.setAttribute("aria-hidden", visible ? "false" : "true");
  }

 function canCheckout(store, ui) {
  return (
    rowsFromCart(store).length > 0 &&
    isValidEmail(ui.email) &&
    findCountryByName(ui.country) !== null &&
    isAddressValid(ui)
  );
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

  function sendEmailReceipt(payload) {
    if (!cfg().emailjsServiceId || !cfg().emailjsTemplateCustomer || !cfg().emailjsTemplateSeller || !cfg().emailjsPublicKey) return;
    if (!emailJsAllowedDomain()) return;

    loadScriptOnce("https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js").then(function () {
      if (!window.emailjs) return;
      try { window.emailjs.init(cfg().emailjsPublicKey); } catch (_e) { return; }

      var breakdown = payload.rows.map(function (r) {
        return r.code + " [" + r.size + "] x" + r.qty + " = " + money(r.qty * r.price);
      }).join("\n");

      var params = {
        order_id: payload.orderId,
        order_date: new Date().toLocaleString(),
        transaction_id: payload.transactionId,
        customer_name: payload.name || "",
        customer_email: payload.email || "",
        customer_address: payload.address || "",
        order_notes: payload.notes ? payload.notes : "—",
        items_breakdown: breakdown,
        item_count: String(payload.rows.length),
        subtotal: money(payload.subtotal),
        shipping: payload.shipping === 0 ? "Free" : money(payload.shipping),
        total: money(payload.total)
      };

      Promise.all([
        window.emailjs.send(cfg().emailjsServiceId, cfg().emailjsTemplateCustomer, params),
        window.emailjs.send(cfg().emailjsServiceId, cfg().emailjsTemplateSeller, params)
      ]).catch(function () {});
    }).catch(function () {});
  }

  function syncPayPalState(store, ui) {
    if (!rowsFromCart(store).length) { app.refs.paypalWrap.style.display = "none"; return; }
    app.refs.paypalWrap.style.display = "";
    if (app.paypal.processing) { setOverlay("Processing...", true); return; }

    if (app.paypal.actions) {
    try {
    if (canCheckout(store, ui)) {
      app.paypal.actions.enable();
    } else {
      app.paypal.actions.disable();
      return;   // מונע ניסיון PayPal כשהטופס לא תקין
    }
    } catch (_e) {}
    }

    if (canCheckout(store, ui)) setOverlay("", false); else setOverlay("Complete checkout details to enable PayPal.", true);
  }

  function resetPayPal() {
    if (app.paypal.timer) { clearTimeout(app.paypal.timer); app.paypal.timer = null; }
    app.paypal.rendering = false; app.paypal.rendered = false; app.paypal.actions = null; app.paypal.processing = false;
    if (app.refs) clear(app.refs.paypalContainer);
  }

  function ensurePayPal(store, ui) {
    if (!rowsFromCart(store).length) {
      // Cart empty — hide the wrapper but do NOT destroy the rendered buttons.
      // Destroying and re-rendering the container causes SDK instability.
      app.refs.paypalWrap.style.display = "none";
      return;
    }
    app.refs.paypalWrap.style.display = "";
    if (app.paypal.rendered || app.paypal.rendering) { syncPayPalState(store, ui); return; }
    app.paypal.rendering = true;
    if (!app.paypal.sdkPromise) {
      var src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(cfg().paypalClientId || "") + "&currency=" + encodeURIComponent(String((cfg().currency || "EUR")).toUpperCase());
      app.paypal.sdkPromise = loadScriptOnce(src);
    }
    app.paypal.sdkPromise.then(function () {
      if (!window.paypal || typeof window.paypal.Buttons !== "function") { app.paypal.rendering = false; app.refs.paypalMsg.textContent = "PayPal SDK failed to load."; return; }
      clear(app.refs.paypalContainer);
      var buttons = window.paypal.Buttons({
        onInit: function (_d, actions) { app.paypal.actions = actions; syncPayPalState(loadStore(), loadUi()); },
        onClick: function (_d, actions) { if (!canCheckout(loadStore(), loadUi())) return actions.reject(); return actions.resolve(); },
        createOrder: function (_d, actions) {
          var s = loadStore(); var u = loadUi(); var rows = rowsFromCart(s);
          var subtotal = rows.reduce(function (sum, r) { return sum + (r.qty * r.price); }, 0);
          var shipping = shippingFor(subtotal, u.country); var total = subtotal + shipping;
          var cc = String((cfg().currency || "EUR")).toUpperCase();
          return actions.order.create({ purchase_units: [{ amount: { currency_code: cc, value: total.toFixed(2), breakdown: { item_total: { currency_code: cc, value: subtotal.toFixed(2) }, shipping: { currency_code: cc, value: shipping.toFixed(2) } } }, items: rows.map(function (r) { return { name: r.code + " (" + r.size + ")", quantity: String(r.qty), unit_amount: { currency_code: cc, value: Number(r.price).toFixed(2) } }; }) }] });
        },
        onApprove: function (_d, actions) {
          app.paypal.processing = true; setOverlay("Processing...", true);
          return actions.order.capture().then(function (details) {
            var s = loadStore();
            var u = loadUi();
            var rows = rowsFromCart(s);
            var subtotal = rows.reduce(function (sum, r) { return sum + (r.qty * r.price); }, 0);
            var shipping = shippingFor(subtotal, u.country);
            var total = subtotal + shipping;
            sendEmailReceipt({
              orderId: "MS-" + Date.now(),
              transactionId: details && details.id ? details.id : "",
              email: u.email,
              name: u.name,
              address: [u.street, u.city, u.postal, u.country].filter(Boolean).join(", "),
              notes: u.notes,
              rows: rows,
              subtotal: subtotal,
              shipping: shipping,
              total: total
            });

            var now = loadStore(); now.cart = {}; now.select = {}; saveStore(now);
            showThankYou({rows: rows, total: total });
            resetPayPal(); render();
          }).catch(function () {
            app.paypal.processing = false; app.refs.paypalMsg.textContent = "Payment failed. Please try again.";
            app.paypal.timer = setTimeout(function () { resetPayPal(); render(); }, 300);
          });
        },
        onError: function () { app.refs.paypalMsg.textContent = "PayPal error. Please try again."; app.paypal.timer = setTimeout(function () { resetPayPal(); render(); }, 300); },
        onCancel: function () { app.paypal.processing = false; syncPayPalState(loadStore(), loadUi()); }
      });
      if (!buttons.isEligible || !buttons.isEligible()) { app.paypal.rendering = false; app.refs.paypalMsg.textContent = "PayPal is unavailable."; return; }
      buttons.render("#paypal-button-container").then(function () { app.paypal.rendering = false; app.paypal.rendered = true; syncPayPalState(loadStore(), loadUi()); }).catch(function () { app.paypal.rendering = false; app.paypal.rendered = false; app.refs.paypalMsg.textContent = "Could not render PayPal."; });
    }).catch(function () { app.paypal.rendering = false; app.refs.paypalMsg.textContent = "Could not load PayPal."; });
  }



function showThankYou(order) {
  var orderId = "MS-" + Date.now();

  var overlay = document.createElement("div");
  overlay.className = "shop-thankyou-overlay";

  var modal = document.createElement("div");
  modal.className = "shop-thankyou-modal";

  var title = document.createElement("h2");
  title.textContent = "Thank You";

  var msg = document.createElement("p");
  msg.textContent = "Payment completed successfully.";

  var orderIdEl = document.createElement("p");
  orderIdEl.style.fontSize = "13px";
  orderIdEl.style.opacity = "0.65";
  orderIdEl.textContent = "Order: " + orderId;

  var detailsTitle = document.createElement("h3");
  detailsTitle.textContent = "Order details";

  var list = document.createElement("div");
  list.className = "shop-thankyou-items";

  order.rows.forEach(function(r) {
    var line = document.createElement("div");
    line.textContent = r.code + " \u2014 " + r.size + " \u00d7 " + r.qty + " = " + money(r.qty * r.price);
    list.appendChild(line);
  });

  var totalsEl = document.createElement("div");
  totalsEl.className = "shop-thankyou-total";
  totalsEl.textContent = "Total: " + money(order.total);

  var emailMsg = document.createElement("p");
  emailMsg.textContent = "A confirmation email has been sent. Please check your inbox.";

  var btn = document.createElement("button");
  btn.className = "shop-thankyou-close";
  btn.textContent = "Back to Projects";

  function closeModal() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) { if (e.key === "Escape") closeModal(); }

  btn.addEventListener("click", function() {
    closeModal();
    if (typeof window.loadPage === "function") {
      window.loadPage("projects.html");
    } else {
      window.location.href = "projects.html";
    }
  });

  overlay.addEventListener("click", function(e) { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", onKey);

  modal.appendChild(title);
  modal.appendChild(msg);
  modal.appendChild(orderIdEl);
  modal.appendChild(detailsTitle);
  modal.appendChild(list);
  modal.appendChild(totalsEl);
  modal.appendChild(emailMsg);
  modal.appendChild(btn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}


  function render() {
    if (!app.refs) return;
    var store = loadStore();
    var ui = uiState();
    saveUi(ui);
    renderSelect(store);
    renderCart(store);
    renderTotals(store, ui);
    app.refs.emailInput.setAttribute("aria-invalid", (app.touched.email && !isValidEmail(ui.email)) ? "true" : "false");
    app.refs.emailMsg.textContent = (app.touched.email && !isValidEmail(ui.email) && ui.email) ? "Please enter a valid email address" : "";
    app.refs.nameInput.setAttribute("aria-invalid", (app.touched.name && ui.name.trim().length <= 1) ? "true" : "false");
    app.refs.streetInput.setAttribute("aria-invalid", (app.touched.street && ui.street.trim().length <= 3) ? "true" : "false");
    app.refs.cityInput.setAttribute("aria-invalid", (app.touched.city && ui.city.trim().length <= 1) ? "true" : "false");
    app.refs.postalInput.setAttribute("aria-invalid", (app.touched.postal && ui.postal.trim().length <= 1) ? "true" : "false");
    ensurePayPal(store, ui);
    syncPayPalState(store, ui);
  }

  function bindEvents() {
    app.refs.countryInput.addEventListener("input", render);
    app.refs.countryInput.addEventListener("change", render);
    app.refs.emailInput.addEventListener("input", render);
    app.refs.emailInput.addEventListener("blur", render);
    app.refs.notesInput.addEventListener("input", render);
    app.refs.clearBtn.addEventListener("click", function () { if (!window.confirm("Are you sure you want to clear the cart?")) return; var now = loadStore(); now.cart = {}; saveStore(now); resetPayPal(); render(); });
    if (window.__SHOP_STORE_LISTENER_V2__) window.removeEventListener("moto:shop-store-updated", window.__SHOP_STORE_LISTENER_V2__);
    window.__SHOP_STORE_LISTENER_V2__ = function (e) { if (e && e.detail && e.detail.code) app.highlightCode = String(e.detail.code || "").toUpperCase(); render(); };
    window.addEventListener("moto:shop-store-updated", window.__SHOP_STORE_LISTENER_V2__);
  }

  function initShopPage() {
    var root = document.getElementById("shop-root");
    if (!root) return;
    if (root.getAttribute("data-shop-mounted") === "1") return;
    if (root.getAttribute("data-shop-mounting") === "1") return;
    root.setAttribute("data-shop-mounting", "1");
    loadShopIndex().then(function () {
      app.refs = buildShop(root);
      var ui = loadUi();
      app.refs.countryInput.value = ui.country; app.refs.emailInput.value = ui.email; app.refs.notesInput.value = ui.notes;

      bindEvents();
      app.refs.nameInput.value = ui.name;
      app.refs.streetInput.value = ui.street;
      app.refs.cityInput.value = ui.city;
      app.refs.postalInput.value = ui.postal;
      app.refs.nameInput.addEventListener("input", render);
      app.refs.streetInput.addEventListener("input", render);
      app.refs.cityInput.addEventListener("input", render);
      app.refs.postalInput.addEventListener("input", render);
      // Mark fields as touched on first blur so validation shows only after interaction
      ["email", "name", "street", "city", "postal"].forEach(function(field) {
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

  loadShopIndex();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { if (document.querySelector('[data-page="shop"]')) initShopPage(); });
  } else if (document.querySelector('[data-page="shop"]')) {
    initShopPage();
  }
})();
