





/* shop.js  â€“  MotoSynteza Shop (v4) */

/* ============================================================
   NOTE: SHOP_CONFIG, PRINT_SIZES and DEFAULT_SIZE_IDX are
   defined in js/config.js which must be loaded first.
   ============================================================ */
var SHOP_CONFIG = (typeof globalThis !== 'undefined' && globalThis.SHOP_CONFIG)
  ? globalThis.SHOP_CONFIG
  : null;
var PRINT_SIZES = (typeof globalThis !== 'undefined' && globalThis.PRINT_SIZES)
  ? globalThis.PRINT_SIZES
  : null;
var DEFAULT_SIZE_IDX = (typeof globalThis !== 'undefined' && typeof globalThis.DEFAULT_SIZE_IDX !== 'undefined')
  ? globalThis.DEFAULT_SIZE_IDX
  : 2;

/* ============================================================
   COUNTRY DATA  â€“  ISO 3166-1 (195 entries)
   ============================================================ */
var COUNTRY_LIST = [
  { code: 'AF', name: 'Afghanistan' },           { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },               { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },                { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },             { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },             { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },            { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },               { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },              { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },               { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },                 { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },               { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },              { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },                { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },          { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },            { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },              { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },                 { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },              { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },                 { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },            { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'HR', name: 'Croatia' },               { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },                { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },               { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },              { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },               { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },           { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },               { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },              { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },                  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },                { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },                { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },               { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },                { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },             { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },         { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },                 { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },               { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },                 { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },                  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },               { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },                 { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },                 { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },            { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },              { code: 'KP', name: 'Korea (North)' },
  { code: 'KR', name: 'Korea (South)' },         { code: 'XK', name: 'Kosovo' },
  { code: 'KW', name: 'Kuwait' },                { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },                  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },               { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },               { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },         { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },            { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },                { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },              { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },                 { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },            { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },                { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },               { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },              { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },               { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },               { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },                 { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },           { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },             { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },               { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },                { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },              { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },                { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },              { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },           { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },              { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },               { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },                { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },           { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },                 { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },               { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },            { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },             { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },              { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },               { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },           { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },             { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },              { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },           { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },                { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },              { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },           { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },                 { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },               { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },          { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },                { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },         { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },            { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },             { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },                 { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
];

var COUNTRY_MAP = (function () {
  var map = {};
  COUNTRY_LIST.forEach(function (c) {
    map[c.name.toLowerCase()] = c;
    map[c.code.toLowerCase()] = c;
  });
  return map;
}());

function lookupCountry(raw) {
  var key = (raw || '').trim().toLowerCase();
  return COUNTRY_MAP[key] || null;
}

function isLocalCountry(raw) {
  var c = lookupCountry(raw);
  return c ? c.code === SHOP_CONFIG.storeCountry : false;
}

/* ============================================================
   STORAGE  (localStorage with in-memory fallback)
   ============================================================ */
var _memoryStore = {};

var Storage = (function () {
  var available = (function () {
    try {
      var k = '__ms_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      console.warn('[shop] localStorage unavailable â€“ using in-memory cart.');
      return false;
    }
  }());

  return {
    get: function (key) {
      if (available) return localStorage.getItem(key);
      return Object.prototype.hasOwnProperty.call(_memoryStore, key)
        ? _memoryStore[key] : null;
    },
    set: function (key, value) {
      if (available) { localStorage.setItem(key, value); }
      else { _memoryStore[key] = value; }
    },
    remove: function (key) {
      if (available) { localStorage.removeItem(key); }
      else { delete _memoryStore[key]; }
    }
  };
}());

var CART_KEY = 'moto_cart_v2';
var SHOP_STORE_KEY = 'shopStore';

function createEmptyShopStore() {
  return { select: {}, cart: {} };
}

function sanitizeShopStore(raw) {
  var out = createEmptyShopStore();
  var src = raw && typeof raw === 'object' ? raw : {};
  var sel = src.select && typeof src.select === 'object' ? src.select : {};
  var crt = src.cart && typeof src.cart === 'object' ? src.cart : {};

  Object.keys(sel).forEach(function (code) {
    var c = String(code || '').trim().toUpperCase();
    if (!c) return;
    var row = sel[code] || {};
    var size = String(row.size || 'A3').toUpperCase();
    out.select[c] = {
      size: size,
      thumb: row.thumb ? String(row.thumb) : '',
      title: row.title ? String(row.title) : ''
    };
  });

  Object.keys(crt).forEach(function (code) {
    var c = String(code || '').trim().toUpperCase();
    if (!c) return;
    var row = crt[code] || {};
    var sizes = row.sizes && typeof row.sizes === 'object' ? row.sizes : {};
    var cleanSizes = {};
    Object.keys(sizes).forEach(function (sizeId) {
      var id = String(sizeId || '').toUpperCase();
      var qty = parseInt(sizes[sizeId], 10);
      if (!id || !qty || qty < 1) return;
      cleanSizes[id] = qty;
    });
    if (!Object.keys(cleanSizes).length) return;
    out.cart[c] = {
      thumb: row.thumb ? String(row.thumb) : '',
      title: row.title ? String(row.title) : '',
      sizes: cleanSizes
    };
  });

  return out;
}

function loadShopStore() {
  try {
    var raw = Storage.get(SHOP_STORE_KEY);
    if (!raw) return createEmptyShopStore();
    return sanitizeShopStore(JSON.parse(raw));
  } catch (e) {
    return createEmptyShopStore();
  }
}

function saveShopStore(store) {
  var clean = sanitizeShopStore(store);
  var flat = flattenCartFromStore(clean);
  try { Storage.set(SHOP_STORE_KEY, JSON.stringify(clean)); } catch (e) {}
  try { Storage.set(CART_KEY, JSON.stringify(flat)); } catch (e2) {}
  emitCartUpdated(flat);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('moto:shop-store-updated', { detail: { store: clean } }));
    } catch (e2) {}
  }
  return clean;
}

function getSizeMeta(sizeId) {
  var id = String(sizeId || '').toUpperCase();
  for (var i = 0; i < PRINT_SIZES.length; i++) {
    if (String(PRINT_SIZES[i].id).toUpperCase() === id) return PRINT_SIZES[i];
  }
  return null;
}

function flattenCartFromStore(store) {
  var s = sanitizeShopStore(store);
  var rows = [];
  var codes = Object.keys(s.cart).sort();
  codes.forEach(function (code) {
    var c = s.cart[code];
    var order = PRINT_SIZES.map(function (sz) { return sz.id; });
    order.forEach(function (sizeId) {
      var qty = c.sizes[sizeId];
      if (!qty) return;
      var meta = getSizeMeta(sizeId);
      rows.push({
        code: code,
        sizeId: sizeId,
        sizeLabel: meta ? (meta.label + ' – ' + meta.dims) : sizeId,
        qty: qty,
        price: meta ? meta.price : SHOP_CONFIG.printPrice,
        thumbnailUrl: c.thumb || ''
      });
    });
  });
  return rows;
}

function loadCart() {
  try {
    var raw    = Storage.get(CART_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (i) { return i && typeof i.code === 'string'; });
  } catch (e) { return []; }
}

function saveCart(cart) {
  try { Storage.set(CART_KEY, JSON.stringify(cart)); }
  catch (e) { console.warn('[shop] Could not persist cart:', e); }
  emitCartUpdated(cart);
}

function clearCartStorage() {
  try { Storage.remove(CART_KEY); } catch (e) {}
  emitCartUpdated([]);
}

function countCartItems(cart) {
  if (!Array.isArray(cart)) return 0;
  return cart.reduce(function (sum, item) {
    return sum + Math.max(0, parseInt(item.qty, 10) || 0);
  }, 0);
}

function emitCartUpdated(cart) {
  if (typeof window === 'undefined') return;
  try {
    var data = Array.isArray(cart) ? cart : loadCart();
    window.dispatchEvent(new CustomEvent('moto:cart-updated', {
      detail: {
        rows: Array.isArray(data) ? data.length : 0,
        count: countCartItems(data)
      }
    }));
  } catch (e) {}
}

function getDefaultA3SizeIdx() {
  if (!Array.isArray(PRINT_SIZES) || !PRINT_SIZES.length) return 0;
  for (var i = 0; i < PRINT_SIZES.length; i++) {
    var s = PRINT_SIZES[i];
    if (String(s.id || '').toUpperCase() === 'A3') return i;
    if (String(s.label || '').toUpperCase() === 'A3') return i;
  }
  var fallback = parseInt(DEFAULT_SIZE_IDX, 10);
  if (!isNaN(fallback) && fallback >= 0 && fallback < PRINT_SIZES.length) return fallback;
  return 0;
}

function getSizeSortIdx(sizeId) {
  if (!Array.isArray(PRINT_SIZES)) return 999;
  for (var i = 0; i < PRINT_SIZES.length; i++) {
    if (PRINT_SIZES[i].id === sizeId) return i;
  }
  return 999;
}

function getSizeDescription(sizeId) {
  if (sizeId === 'A6') return 'POSTCARD';
  if (sizeId === 'A5') return 'SMALL PRINT';
  if (sizeId === 'A4') return 'PRINRER PAGE';
  if (sizeId === 'A3') return 'RECOMMENDED';
  if (sizeId === 'A2') return 'POSTER';
  if (sizeId === 'A1') return 'LARGE POSTER';
  return '';
}

function addToCartByCode(rawCode, opts) {
  var code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, reason: 'missing-code' };
  if (!Array.isArray(PRINT_SIZES) || !PRINT_SIZES.length) {
    return { ok: false, reason: 'missing-sizes' };
  }

  var options = opts || {};
  var store = loadShopStore();
  var cartEntry = store.cart[code] || null;
  var usedSizes = cartEntry && cartEntry.sizes ? Object.keys(cartEntry.sizes) : [];

  var defaultSize = PRINT_SIZES[getDefaultA3SizeIdx()] || PRINT_SIZES[0];
  var selectedSize = defaultSize ? defaultSize.id : 'A3';
  if (usedSizes.indexOf(selectedSize) !== -1) {
    for (var si = 0; si < PRINT_SIZES.length; si++) {
      if (usedSizes.indexOf(PRINT_SIZES[si].id) === -1) {
        selectedSize = PRINT_SIZES[si].id;
        break;
      }
    }
  }
  if (usedSizes.indexOf(selectedSize) !== -1) {
    return { ok: false, reason: 'all-sizes-in-cart' };
  }

  var thumb = options.thumbnailUrl || '';
  var info = lookupCode(code);
  if (!thumb && info && info.thumbnailUrl) thumb = info.thumbnailUrl;
  var title = info && info.title ? info.title : '';

  if (store.select[code]) {
    if (!store.select[code].thumb && thumb) store.select[code].thumb = thumb;
    saveShopStore(store);
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('moto:shop-store-updated', { detail: { store: store, code: code } })); } catch (e2) {}
    }
    return { ok: true, exists: true, code: code };
  }

  store.select[code] = {
    size: selectedSize,
    thumb: thumb,
    title: title
  };
  saveShopStore(store);
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent('moto:shop-store-updated', { detail: { store: store, code: code } })); } catch (e3) {}
  }
  return { ok: true, code: code };
}

window.motoAddToCartByCode = addToCartByCode;

/* ============================================================
   CONFIRMATION STORAGE  (sessionStorage â€“ survives refresh)
   ============================================================ */
var CONFIRMATION_KEY = 'moto_confirmation_v1';

function saveConfirmation(data) {
  try { sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadConfirmation() {
  try {
    var raw = sessionStorage.getItem(CONFIRMATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearConfirmation() {
  try { sessionStorage.removeItem(CONFIRMATION_KEY); } catch (e) {}
}

/* ============================================================
   SHOP INDEX  (version-busted JSON)
   ============================================================ */
var _shopIndex = null;
var _codeMap   = null;

function getShopIndexUrl() {
  var version = (typeof window.__BUILD_VERSION__ !== 'undefined')
    ? window.__BUILD_VERSION__ : Date.now();
  return SHOP_CONFIG.shopIndexUrl + '?v=' + encodeURIComponent(version);
}

function loadShopIndex() {
  return new Promise(function (resolve, reject) {
    if (_shopIndex) { resolve(_shopIndex); return; }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', getShopIndexUrl(), true);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data  = JSON.parse(xhr.responseText);
          _shopIndex = data;
          _codeMap   = buildCodeMap(data);
          resolve(data);
        } catch (e) {
          reject(new Error('Failed to parse shop/index.json: ' + e.message));
        }
      } else {
        reject(new Error('Failed to load shop/index.json (HTTP ' + xhr.status + ')'));
      }
    };

    xhr.onerror = function () { reject(new Error('Network error loading shop/index.json')); };
    xhr.send();
  });
}

function buildCodeMap(indexData) {
  var map = {};
  (indexData.projects || []).forEach(function (project) {
    (project.images || []).forEach(function (img) {
      map[img.code] = {
        code:         img.code,
        thumbnailUrl: img.thumbnailUrl,
        title:        project.title,
        projectCode:  project.projectCode
      };
    });
  });
  return map;
}

function getAllCodes()   { return _codeMap ? Object.keys(_codeMap).sort() : []; }
function lookupCode(c)  { return _codeMap ? (_codeMap[c] || null) : null; }

/* ============================================================
   ORDER ID
   ============================================================ */
var _sessionOrderIds = {};

function secureRand4() {
  if (window.crypto && window.crypto.getRandomValues) {
    var a = new Uint16Array(1);
    window.crypto.getRandomValues(a);
    return 1000 + (a[0] % 9000);
  }
  return Math.floor(1000 + Math.random() * 9000);
}

function generateOrderId() {
  var now  = new Date();
  var base = 'ORD-'
    + String(now.getFullYear()).slice(-2) + pad2(now.getMonth() + 1) + pad2(now.getDate())
    + '-' + pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds())
    + '-';
  var id, attempts = 0;
  do { id = base + String(secureRand4()); } while (_sessionOrderIds[id] && ++attempts < 20);
  _sessionOrderIds[id] = true;
  return id;
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }

/* ============================================================
   SHIPPING / TOTALS
   ============================================================ */
function calculateShipping(cart, country) {
  if (!cart || !cart.length) return 0;
  var tier     = isLocalCountry(country)
    ? SHOP_CONFIG.shipping.local
    : SHOP_CONFIG.shipping.international;
  var subtotal = calculateSubtotal(cart);
  return subtotal >= tier.freeAbove ? 0 : tier.base;
}

function calculateSubtotal(cart) {
  return cart.reduce(function (s, i) {
    return s + (i.price || SHOP_CONFIG.printPrice) * (i.qty || 1);
  }, 0);
}

function calculateTotal(cart, country) {
  return calculateSubtotal(cart) + calculateShipping(cart, country);
}

function formatMoney(amount) {
  return SHOP_CONFIG.currency + '\u00a0' + Number(amount).toFixed(2);
}

/* ============================================================
   HELPERS
   ============================================================ */
function setText(node, text) {
  while (node.firstChild) node.removeChild(node.firstChild);
  node.appendChild(document.createTextNode(String(text)));
}

function el(tag, attrs) {
  var node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      if (k === 'className') { node.className = attrs[k]; }
      else if (k === 'for')  { node.setAttribute('for', attrs[k]); }
      else                   { node.setAttribute(k, attrs[k]); }
    });
  }
  return node;
}

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    var s     = document.createElement('script');
    s.src     = src;
    s.onload  = resolve;
    s.onerror = function () { reject(new Error('Script load failed: ' + src)); };
    document.head.appendChild(s);
  });
}

/* ============================================================
   PAYPAL
   ============================================================ */
var _paypalInstance  = null;
var _orderInFlight   = false;
var _paymentApproved = false;
var _paypalLastRenderKey = '';
var _paypalRenderCycle = 0;

/**
 * Fully tear down any existing PayPal render.
 * Safe to call multiple times.
 */
function destroyPayPal(resetRenderKey) {
  _paypalInstance  = null;
  _orderInFlight   = false;
  _paymentApproved = false;
  if (resetRenderKey !== false) _paypalLastRenderKey = '';
  var container = document.getElementById('paypal-button-container');
  if (container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }
}

function buildPayPalRenderKey(cart, addressData) {
  var normalizedItems = (cart || []).map(function (item) {
    return {
      code: item.code || '',
      sizeId: item.sizeId || '',
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0
    };
  });
  return JSON.stringify({
    currency: String(SHOP_CONFIG.currency || 'EUR').toUpperCase(),
    country: (addressData && addressData.country) ? String(addressData.country) : '',
    items: normalizedItems
  });
}

/**
 * Render PayPal buttons.
 *
 * @param {Array}    cart
 * @param {object}   addressData  { name, email, street, city, postal, country, phone }
 * @param {Function} onSuccess    â€“ called after capture
 * @param {Function} onCancelled  â€“ called after user cancel / error; shop can re-render
 */
function renderPayPalButton(cart, getAddressData, isCheckoutValid, onSuccess, onCancelled, renderKey, renderCycle) {
  var container = document.getElementById('paypal-button-container');
  if (!container) return;
  if (!Array.isArray(cart) || cart.length === 0) {
    destroyPayPal();
    return;
  }
  if (_paypalInstance && _paypalLastRenderKey && _paypalLastRenderKey === renderKey) {
    return;
  }

  var sdkSrc = 'https://www.paypal.com/sdk/js?client-id='
    + encodeURIComponent(SHOP_CONFIG.paypalClientId)
    + '&currency=' + encodeURIComponent(SHOP_CONFIG.currency);

  loadScript(sdkSrc).then(function () {
    if (renderCycle !== _paypalRenderCycle) return;
    if (typeof window.paypal === 'undefined') {
      renderNotice(container, 'PayPal failed to load. Please refresh and try again.', 'error');
      return;
    }

    // Bail if container was removed during async load (e.g. PJAX navigation)
    if (!document.getElementById('paypal-button-container')) return;
    // Keep stable if another render completed while SDK was loading.
    if (_paypalInstance && _paypalLastRenderKey && _paypalLastRenderKey === renderKey) return;

    // Destroy only right before creating a fresh button instance.
    destroyPayPal(false);

    /* â”€â”€ shared cancel / error recovery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    function restoreAfterCancel(delayMs) {
      _orderInFlight   = false;
      _paymentApproved = false;
      var overlay = document.querySelector('.shop-paypal-overlay');
      if (overlay) overlay.classList.remove('is-visible');
    }

    _paypalInstance = window.paypal.Buttons({
      onClick: function (data, actions) {
        if (typeof isCheckoutValid === 'function' && !isCheckoutValid()) {
          renderNotice(container, 'Please complete all required checkout fields before payment.', 'error');
          return actions.reject();
        }
        return actions.resolve();
      },

      createOrder: function (data, actions) {
        if (_orderInFlight) return Promise.reject(new Error('Order already in progress'));
        _orderInFlight   = true;
        _paymentApproved = false;
        var addressData = (typeof getAddressData === 'function') ? getAddressData() : {};
        var currencyCode = String(SHOP_CONFIG.currency || 'EUR').toUpperCase();
        var subtotalValue = calculateSubtotal(cart);
        var shippingValue = calculateShipping(cart, addressData.country);
        var totalValue = subtotalValue + shippingValue;
        if (!isFinite(totalValue) || totalValue <= 0) {
          return Promise.reject(new Error('Invalid cart total'));
        }

        return actions.order.create({
          purchase_units: [{
            amount: {
              value:         totalValue.toFixed(2),
              currency_code: currencyCode,
              breakdown: {
                item_total: {
                  currency_code: currencyCode,
                  value: subtotalValue.toFixed(2)
                },
                shipping: {
                  currency_code: currencyCode,
                  value: shippingValue.toFixed(2)
                }
              }
            },
            items: cart.map(function (item) {
              return {
                name:        item.code + (item.sizeId ? ' (' + item.sizeId + ')' : ''),
                unit_amount: {
                  currency_code: currencyCode,
                  value: (item.price || SHOP_CONFIG.printPrice).toFixed(2)
                },
                quantity: String(item.qty || 1)
              };
            })
          }]
        });
      },

      onApprove: function (data, actions) {
        _paymentApproved = true;
        var overlay = document.querySelector('.shop-paypal-overlay');
        if (overlay) overlay.classList.add('is-visible');

        return actions.order.capture().then(function (details) {
          if (overlay) overlay.classList.remove('is-visible');
          _orderInFlight = false;
          var addressData = (typeof getAddressData === 'function') ? getAddressData() : {};

          var orderId       = generateOrderId();
          var transactionId = details.id;

          saveCart([]);

          onSuccess({
            orderId:       orderId,
            transactionId: transactionId,
            details:       details,
            address:       addressData
          });

          sendEmailReceipt({
            orderId:       orderId,
            transactionId: transactionId,
            email:         addressData.email,
            name:          addressData.name,
            address:       addressData.street,
            city:          addressData.city,
            postal:        addressData.postal,
            country:       addressData.country,
            phone:         addressData.phone || '',
            cart:          cart
          });

        }).catch(function (err) {
          console.error('[shop] Capture failed:', err);
          restoreAfterCancel(2000);
        });
      },

      /* â”€â”€ User closed PayPal popup without completing payment â”€â”€ */
      onCancel: function () {
        restoreAfterCancel(400);
      },

      /* â”€â”€ Fires after popup closes (both approve and cancel).
            Only act when payment was NOT approved. â”€â”€ */
      onClose: function () {
        if (!_paymentApproved) {
          restoreAfterCancel(400);
        }
      },

      onError: function (err) {
        console.error('[shop] PayPal error:', err);
        var c2 = document.getElementById('paypal-button-container');
        if (c2) renderNotice(c2, 'Payment failed. Please try again.', 'error');
        restoreAfterCancel(2500);
      }
    });

    if (_paypalInstance.isEligible()) {
      _paypalLastRenderKey = renderKey || '';
      _paypalInstance.render('#paypal-button-container');
    } else {
      _paypalLastRenderKey = '';
      renderNotice(container, 'PayPal is not available in your region.', 'error');
    }

  }).catch(function (err) {
    console.error('[shop] PayPal SDK load error:', err);
    renderNotice(container, 'Could not load payment provider. Check your connection.', 'error');
  });
}

/* ============================================================
   EMAILJS  -  full size + price breakdown per item
   ============================================================ */
function isEmailJsDomainAllowed() {
  var allowList = SHOP_CONFIG.emailjsAllowedDomains;
  if (!Array.isArray(allowList) || !allowList.length) return true;

  var host = (window.location.hostname || '').toLowerCase();
  if (!host) return false;

  return allowList.some(function (entry) {
    var domain = String(entry || '').trim().toLowerCase();
    if (!domain) return false;
    if (domain === host) return true;
    if (domain.indexOf('*.') === 0) {
      var suffix = domain.slice(2);
      return host === suffix || host.endsWith('.' + suffix);
    }
    return false;
  });
}

function showEmailStatus(message, type) {
  var root = document.getElementById('shop-root');
  var confirmation = root ? root.querySelector('#shop-confirmation') : null;
  if (!confirmation) return;

  var existing = confirmation.querySelector('.shop-email-status');
  if (existing) existing.remove();

  var notice = el('p', {
    className: 'shop-notice shop-notice--' + (type || 'info') + ' shop-email-status'
  });
  setText(notice, message);
  confirmation.appendChild(notice);
}

function sendEmailReceipt(opts) {
  if (
    !SHOP_CONFIG.emailjsServiceId ||
    !SHOP_CONFIG.emailjsTemplateCustomer ||
    !SHOP_CONFIG.emailjsTemplateSeller ||
    !SHOP_CONFIG.emailjsPublicKey
  ) {
    console.warn('[shop] EmailJS configuration is incomplete; skipping receipt email.');
    showEmailStatus('Payment succeeded. Receipt email is temporarily unavailable.', 'info');
    return;
  }

  if (!isEmailJsDomainAllowed()) {
    console.warn('[shop] EmailJS disabled on this host:', window.location.hostname);
    showEmailStatus('Payment succeeded. Receipt email is unavailable on this domain.', 'info');
    return;
  }

  var sdkSrc = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';

  loadScript(sdkSrc).then(function () {
    if (typeof window.emailjs === 'undefined') {
      console.error('[shop] emailjs SDK not available');
      showEmailStatus('Payment succeeded. Could not initialize receipt email service.', 'info');
      return;
    }

    try {
      window.emailjs.init(SHOP_CONFIG.emailjsPublicKey);
    } catch (initErr) {
      console.error('[shop] EmailJS init failed:', initErr);
      showEmailStatus('Payment succeeded. Receipt email service failed to initialize.', 'info');
      return;
    }

    var subtotal = calculateSubtotal(opts.cart);
    var shipping = calculateShipping(opts.cart, opts.country);
    var total    = subtotal + shipping;

    var now = new Date();
    var orderDate = now.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Europe/Warsaw'
    });

    var itemsBreakdown = opts.cart.map(function (item) {
      var unit      = item.price || SHOP_CONFIG.printPrice;
      var lineTotal = unit * (item.qty || 1);
      return [
        item.code,
        item.sizeId    ? '[' + item.sizeId    + ']' : '',
        item.sizeLabel ? '(' + item.sizeLabel + ')' : '',
        '\u00d7' + (item.qty || 1),
        '@ ' + formatMoney(unit),
        '= ' + formatMoney(lineTotal)
      ].filter(Boolean).join(' ');
    }).join('\n');

    var itemsJson = JSON.stringify(
      opts.cart.map(function (item) {
        var unit      = item.price || SHOP_CONFIG.printPrice;
        var lineTotal = unit * (item.qty || 1);
        return {
          code:      item.code,
          sizeId:    item.sizeId    || '',
          sizeLabel: item.sizeLabel || '',
          qty:       item.qty       || 1,
          unitPrice: formatMoney(unit),
          lineTotal: formatMoney(lineTotal)
        };
      }),
      null, 2
    );

    var fullAddress = [
      opts.address || '',
      opts.city    || '',
      opts.postal  || '',
      opts.country || ''
    ].filter(Boolean).join(', ');

    var params = {
      order_id:         opts.orderId,
      order_date:       orderDate,
      transaction_id:   opts.transactionId,
      customer_name:    opts.name    || '',
      customer_email:   opts.email   || '',
      customer_phone:   opts.phone   || '',
      customer_address: fullAddress,
      items_breakdown:  itemsBreakdown,
      items_json:       itemsJson,
      item_count:       String(opts.cart.length),
      subtotal:         formatMoney(subtotal),
      shipping:         shipping === 0 ? 'Free' : formatMoney(shipping),
      total:            formatMoney(total)
    };

    var customerSend = window.emailjs.send(
      SHOP_CONFIG.emailjsServiceId,
      SHOP_CONFIG.emailjsTemplateCustomer,
      params
    );

    var sellerSend = window.emailjs.send(
      SHOP_CONFIG.emailjsServiceId,
      SHOP_CONFIG.emailjsTemplateSeller,
      params
    );

    Promise.all([customerSend, sellerSend]).catch(function (sendErr) {
      console.error('[shop] EmailJS send failed:', sendErr);
      showEmailStatus('Payment succeeded. Receipt email could not be delivered automatically.', 'info');
    });

  }).catch(function (err) {
    console.error('[shop] EmailJS load failed:', err);
    showEmailStatus('Payment succeeded. Could not load receipt email service.', 'info');
  });
}

/* ============================================================
   NOTICE HELPER
   ============================================================ */
function renderNotice(container, message, type) {
  while (container.firstChild) container.removeChild(container.firstChild);
  var n = el('div', { className: 'shop-notice shop-notice--' + (type || 'info'), role: 'alert' });
  setText(n, message);
  container.appendChild(n);
}

/* ============================================================
   CONFIRMATION RENDERER
   ============================================================ */
function renderConfirmation(root, confData, indexData) {
  while (root.firstChild) root.removeChild(root.firstChild);

  var section = el('section', { className: 'shop-confirmation', id: 'shop-confirmation' });

  var icon = el('div', { className: 'shop-confirmation-icon', 'aria-hidden': 'true' });
  setText(icon, '\u2713');
  section.appendChild(icon);

  var title = el('h2', { className: 'shop-confirmation-title' });
  setText(title, 'Order Confirmed');
  section.appendChild(title);

  if (confData.name) {
    var greeting = el('p', { className: 'shop-confirmation-greeting' });
    setText(greeting, 'Thank you, ' + confData.name + '!');
    section.appendChild(greeting);
  }

  var detailsDiv = el('div', { className: 'shop-confirmation-details' });

  function detailRow(label, value) {
    var row = el('div', { className: 'shop-confirmation-detail-row' });
    var lbl = el('span', { className: 'shop-confirmation-detail-label' }); setText(lbl, label);
    var val = el('span', { className: 'shop-confirmation-detail-value' }); setText(val, value);
    row.appendChild(lbl); row.appendChild(val);
    detailsDiv.appendChild(row);
  }

  detailRow('Order ID',       confData.orderId);
  detailRow('Transaction ID', confData.transactionId);
  if (confData.country) detailRow('Ships to', confData.country);
  section.appendChild(detailsDiv);

  if (confData.items && confData.items.length) {
    var itemsWrap = el('div', { className: 'shop-confirmation-items' });
    var itemsHdr  = el('div', { className: 'shop-confirmation-items-title' });
    setText(itemsHdr, 'Items Ordered');
    itemsWrap.appendChild(itemsHdr);

    confData.items.forEach(function (item) {
      var row     = el('div', { className: 'shop-confirmation-item-row' });
      var codeEl  = el('span', { className: 'shop-confirmation-item-code' });
      setText(codeEl, item.code + (item.sizeLabel ? '\u00a0\u00b7\u00a0' + item.sizeLabel : ''));
      var qty    = el('span', { className: 'shop-confirmation-item-qty' });
      setText(qty, '\u00d7' + (item.qty || 1));
      var price  = el('span', { className: 'shop-confirmation-item-price' });
      setText(price, formatMoney((item.price || SHOP_CONFIG.printPrice) * (item.qty || 1)));
      row.appendChild(codeEl); row.appendChild(qty); row.appendChild(price);
      itemsWrap.appendChild(row);
    });

    section.appendChild(itemsWrap);
  }

  if (confData.total) {
    var totalP = el('p', { className: 'shop-confirmation-total' });
    setText(totalP, 'Total charged: ' + confData.total);
    section.appendChild(totalP);
  }

  var msg = el('p', { className: 'shop-notice shop-notice--success' });
  setText(msg,
    'Your order has been received. A receipt has been sent to your email. ' +
    'Prints are typically dispatched within 3\u20135 business days.'
  );
  section.appendChild(msg);

  var restart = el('button', { type: 'button', className: 'shop-confirmation-restart' });
  setText(restart, 'FINISH');
  restart.addEventListener('click', function () {
    clearConfirmation();
    saveCart([]);
    clearCartStorage();
    destroyPayPal();
    buildShopUI(root, indexData);
  });
  section.appendChild(restart);

  root.appendChild(section);
}

/* ============================================================
   UI  â€“  buildShopUI
   ============================================================ */
function buildShopUI(root, indexData) {
  while (root.firstChild) root.removeChild(root.firstChild);

  /* Show confirmation screen if session storage has one */
  var storedConf = loadConfirmation();
  if (storedConf) { renderConfirmation(root, storedConf, indexData); return; }

  var cart     = loadCart();
  var quantity = 1;

  /* â”€â”€ Intro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  var introSection = el('section', { className: 'shop-intro' });
  var introHdr     = el('h2', { className: 'shop-section-title shop-title' });
  setText(introHdr, 'Fine Art Prints');
  introSection.appendChild(introHdr);

  var introPOrder = el('p', { className: 'shop-intro-para' });
  setText(introPOrder,
    'To order: Browse project galleries and click the image code to add prints to your cart.'
  );
  introSection.appendChild(introPOrder);

  var introP1 = el('p', { className: 'shop-intro-para' });
  setText(introP1,
    'Prints on premium art paper. Ships in protective packaging, ready to frame.'
  );
  introSection.appendChild(introP1);

  var pricingTable = el('div', { className: 'shop-intro-pricing' });
  var pricingHead = el('div', { className: 'shop-intro-pricing-row shop-intro-pricing-row--head' });
  ['Size', 'Physical Size', 'Description', 'Price'].forEach(function (h) {
    var col = el('span', { className: 'shop-intro-pricing-head' });
    setText(col, h);
    pricingHead.appendChild(col);
  });
  pricingTable.appendChild(pricingHead);
  PRINT_SIZES.forEach(function (size) {
    var row = el('div', { className: 'shop-intro-pricing-row' });
    var s   = el('span', { className: 'shop-intro-pricing-size' });  setText(s, size.label);
    var d   = el('span', { className: 'shop-intro-pricing-dims' });  setText(d, size.dims);
    var x   = el('span', { className: 'shop-intro-pricing-desc' });  setText(x, getSizeDescription(size.id));
    var p   = el('span', { className: 'shop-intro-pricing-price' }); setText(p, formatMoney(size.price));
    row.appendChild(s); row.appendChild(d); row.appendChild(x); row.appendChild(p);
    pricingTable.appendChild(row);
  });
  introSection.appendChild(pricingTable);

  var shippingLocalLine = el('p', { className: 'shop-intro-para shipping-line' });
  function formatAmountThenCurrency(value) {
    return Number(value || 0).toFixed(2) + ' ' + String(SHOP_CONFIG.currency || 'EUR').toUpperCase();
  }
  setText(
    shippingLocalLine,
    'Local shipping: ' + formatAmountThenCurrency(SHOP_CONFIG.shipping.local.base) +
      ' (free over EUR ' + Number(SHOP_CONFIG.shipping.local.freeAbove || 0).toFixed(2) + ').'
  );
  introSection.appendChild(shippingLocalLine);

  var shippingIntlLine = el('p', { className: 'shop-intro-para shipping-line' });
  setText(
    shippingIntlLine,
    'International shipping: EUR ' + Number(SHOP_CONFIG.shipping.international.base || 0).toFixed(2) +
      ' (free over EUR ' + Number(SHOP_CONFIG.shipping.international.freeAbove || 0).toFixed(2) + ').'
  );
  introSection.appendChild(shippingIntlLine);

  root.appendChild(introSection);

  /* â”€â”€ Add-to-cart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  var addSection = el('section', { className: 'shop-add-section' });
  var addTitle   = el('h2', { className: 'shop-section-title' });
  setText(addTitle, 'Add Print');
  addSection.appendChild(addTitle);

  var codeField = el('div', { className: 'shop-field shop-code-field' });
  var codeLabel = el('label', { className: 'shop-label', 'for': 'shop-code-input' });
  setText(codeLabel, 'Print Code');
  var codeInput = el('input', {
    type: 'text', id: 'shop-code-input', className: 'shop-input',
    autocomplete: 'off', placeholder: 'e.g. UU-025',
    'aria-describedby': 'shop-code-msg',
    'aria-autocomplete': 'list',
    'aria-controls': 'shop-code-suggestions',
    'aria-haspopup': 'listbox'
  });
  var codeMsg = el('span', {
    id: 'shop-code-msg', className: 'shop-validation-msg', role: 'status', 'aria-live': 'polite'
  });

  /* â”€â”€ Custom autocomplete dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  var suggestEl = el('ul', {
    id: 'shop-code-suggestions',
    className: 'shop-code-suggestions',
    role: 'listbox',
    'aria-label': 'Image code suggestions'
  });
  suggestEl.style.display = 'none';

  var _activeSugIdx = -1;

  function _getSugItems() {
    return suggestEl.querySelectorAll('.shop-code-suggestion-item');
  }

  function _closeSuggestions() {
    suggestEl.style.display = 'none';
    _activeSugIdx = -1;
    codeInput.removeAttribute('aria-activedescendant');
  }

  function _setActiveSuggestion(idx) {
    var items = _getSugItems();
    items.forEach(function (item, i) {
      if (i === idx) {
        item.classList.add('is-active');
        item.setAttribute('aria-selected', 'true');
        item.id = 'shop-sug-active';
        codeInput.setAttribute('aria-activedescendant', 'shop-sug-active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('is-active');
        item.setAttribute('aria-selected', 'false');
        item.removeAttribute('id');
      }
    });
    _activeSugIdx = idx;
  }

  function _selectSuggestion(code) {
    codeInput.value = code;
    _closeSuggestions();
    /* Trigger validation feedback */
    var found = lookupCode(code);
    if (found) {
      setText(codeMsg, '\u2713 ' + found.title);
      codeMsg.className = 'shop-validation-msg is-valid';
      codeInput.setAttribute('aria-invalid', 'false');
    }
    codeInput.focus();
  }

  function _renderSuggestions(query) {
    while (suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild);
    _activeSugIdx = -1;
    codeInput.removeAttribute('aria-activedescendant');

    var q = (query || '').trim().toUpperCase();
    if (!q) { suggestEl.style.display = 'none'; return; }

    var allCodes = getAllCodes();
    /* Prefix matches first, then contains matches */
    var prefixMatches   = allCodes.filter(function (c) { return c.startsWith(q); });
    var containsMatches = allCodes.filter(function (c) { return !c.startsWith(q) && c.indexOf(q) !== -1; });
    var matches = prefixMatches.concat(containsMatches).slice(0, 12);

    if (!matches.length) { suggestEl.style.display = 'none'; return; }

    matches.forEach(function (code) {
      var li = document.createElement('li');
      li.className = 'shop-code-suggestion-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.textContent = code;

      /* Highlight matching portion */
      var idx = code.indexOf(q);
      if (idx !== -1) {
        li.innerHTML =
          escapeHtml(code.slice(0, idx)) +
          '<mark>' + escapeHtml(code.slice(idx, idx + q.length)) + '</mark>' +
          escapeHtml(code.slice(idx + q.length));
      }

      /* mousedown prevents blur on input; click selects */
      li.addEventListener('mousedown', function (e) { e.preventDefault(); });
      li.addEventListener('click',     function ()  { _selectSuggestion(code); });

      /* Touch: same as click */
      li.addEventListener('touchend', function (e) {
        e.preventDefault();
        _selectSuggestion(code);
      });

      suggestEl.appendChild(li);
    });

    suggestEl.style.display = '';
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  codeInput.addEventListener('input', function () {
    _renderSuggestions(codeInput.value);
  });

  codeInput.addEventListener('keydown', function (e) {
    var items = _getSugItems();
    var isOpen = suggestEl.style.display !== 'none' && items.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { _renderSuggestions(codeInput.value); return; }
      _setActiveSuggestion(Math.min(_activeSugIdx + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      var next = _activeSugIdx - 1;
      if (next < 0) {
        _setActiveSuggestion(-1);
        codeInput.focus();
      } else {
        _setActiveSuggestion(next);
      }
    } else if (e.key === 'Enter' && _activeSugIdx >= 0 && isOpen) {
      e.preventDefault();
      var active = items[_activeSugIdx];
      if (active) _selectSuggestion(active.textContent.replace(/<[^>]+>/g, ''));
    } else if (e.key === 'Escape') {
      _closeSuggestions();
    }
  });

  codeInput.addEventListener('blur', function () {
    /* Delay allows click/touchend on suggestion items to fire first */
    setTimeout(_closeSuggestions, 160);
  });

  codeInput.addEventListener('focus', function () {
    if (codeInput.value.trim()) _renderSuggestions(codeInput.value);
  });

  codeField.appendChild(codeLabel);
  codeField.appendChild(codeInput);
  codeField.appendChild(suggestEl);
  codeField.appendChild(codeMsg);

  /* Size selector */
  var selectedSizeIdx = DEFAULT_SIZE_IDX;

  var sizeField    = el('div', { className: 'shop-field' });
  var sizeLabelEl  = el('label', { className: 'shop-label', id: 'size-label' });
  setText(sizeLabelEl, 'Print Size');
  sizeField.appendChild(sizeLabelEl);

  var sizeSelector     = el('div', {
    className: 'shop-size-selector', role: 'radiogroup', 'aria-labelledby': 'size-label'
  });
  var sizePriceDisplay = el('span', { className: 'shop-size-price-display' });
  setText(sizePriceDisplay, formatMoney(PRINT_SIZES[selectedSizeIdx].price));

  var sizeBtns = PRINT_SIZES.map(function (size, idx) {
    var btn = el('button', {
      type: 'button',
      className: 'shop-size-btn' + (idx === selectedSizeIdx ? ' is-selected' : ''),
      'aria-pressed': String(idx === selectedSizeIdx),
      'data-size-idx': String(idx)
    });
    var bl = el('span', { className: 'shop-size-btn-label' }); setText(bl, size.label);
    var bd = el('span', { className: 'shop-size-btn-dims' });  setText(bd, size.dims);
    var bp = el('span', { className: 'shop-size-btn-price' }); setText(bp, formatMoney(size.price));
    btn.appendChild(bl); btn.appendChild(bd); btn.appendChild(bp);

    btn.addEventListener('click', function () {
      selectedSizeIdx = idx;
      sizeBtns.forEach(function (b, i) {
        b.className = 'shop-size-btn' + (i === idx ? ' is-selected' : '');
        b.setAttribute('aria-pressed', String(i === idx));
      });
      setText(sizePriceDisplay, formatMoney(PRINT_SIZES[selectedSizeIdx].price));
    });

    sizeSelector.appendChild(btn);
    return btn;
  });

  var sizeRow = el('div', { className: 'shop-size-row' });
  sizeRow.appendChild(sizeSelector);
  sizeRow.appendChild(sizePriceDisplay);
  sizeField.appendChild(sizeRow);

  /* Quantity */
  var qtyField   = el('div', { className: 'shop-field' });
  var qtyLabel   = el('label', { className: 'shop-label', id: 'qty-label' });
  setText(qtyLabel, 'Quantity');
  var qtyRow     = el('div', { className: 'shop-qty-row', role: 'group', 'aria-labelledby': 'qty-label' });
  var qtyMinus   = el('button', { type: 'button', className: 'shop-qty-btn', 'aria-label': 'Decrease quantity' });
  setText(qtyMinus, '\u2212');
  var qtyDisplay = el('div', {
    className: 'shop-qty-display', 'aria-live': 'polite', 'aria-atomic': 'true'
  });
  setText(qtyDisplay, '1');
  var qtyPlus = el('button', { type: 'button', className: 'shop-qty-btn', 'aria-label': 'Increase quantity' });
  setText(qtyPlus, '+');
  qtyRow.appendChild(qtyMinus); qtyRow.appendChild(qtyDisplay); qtyRow.appendChild(qtyPlus);
  qtyField.appendChild(qtyLabel); qtyField.appendChild(qtyRow);

  var addBtn = el('button', { type: 'button', className: 'shop-add-btn', id: 'shop-add-btn' });
  setText(addBtn, 'Add to Cart');

  var addForm = el('div', { className: 'shop-add-form', role: 'form', 'aria-label': 'Add print to cart' });
  addForm.appendChild(codeField);
  addForm.appendChild(sizeField);
  addForm.appendChild(qtyField);
  addForm.appendChild(addBtn);
  addSection.appendChild(addForm);

  /* â”€â”€ Cart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  var cartSection = el('section', { className: 'shop-cart' });
  var cartTitle   = el('h2', { className: 'shop-section-title' });
  setText(cartTitle, 'Cart');
  cartSection.appendChild(cartTitle);
  var cartBody = el('div', { className: 'shop-cart-body' });
  cartSection.appendChild(cartBody);

  /* Clear-cart controls â€“ created once; re-appended by renderCart */
  var clearCartActions = el('div', { className: 'shop-clear-cart-actions' });
  var clearBtn         = el('button', { type: 'button', className: 'shop-clear-cart-btn' });
  setText(clearBtn, 'Clear cart');
  var clearConfirmRow  = el('div', { className: 'shop-clear-confirm' });
  clearConfirmRow.style.display = 'none';
  var clearConfirmText = el('span', { className: 'shop-clear-confirm-text' });
  setText(clearConfirmText, 'Remove all items?');
  var clearYesBtn = el('button', { type: 'button', className: 'shop-clear-yes-btn' });
  setText(clearYesBtn, 'Yes, clear');
  var clearNoBtn  = el('button', { type: 'button', className: 'shop-clear-no-btn' });
  setText(clearNoBtn, 'Cancel');
  clearConfirmRow.appendChild(clearConfirmText);
  clearConfirmRow.appendChild(clearYesBtn);
  clearConfirmRow.appendChild(clearNoBtn);
  clearCartActions.appendChild(clearBtn);
  clearCartActions.appendChild(clearConfirmRow);

  clearBtn.addEventListener('click', function () {
    clearConfirmRow.style.display = '';
    clearBtn.style.display = 'none';
  });
  clearNoBtn.addEventListener('click', function () {
    clearConfirmRow.style.display = 'none';
    clearBtn.style.display = '';
  });
  clearYesBtn.addEventListener('click', function () {
    cart.length = 0;
    clearCartStorage();
    saveCart(cart);
    destroyPayPal();
    renderCart();
  });

  root.appendChild(cartSection);

  /* â”€â”€ Checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  var checkoutSection = el('section', { className: 'shop-checkout', id: 'shop-checkout' });
  var checkoutTitle   = el('h2', { className: 'shop-section-title' });
  setText(checkoutTitle, 'Checkout');
  checkoutSection.appendChild(checkoutTitle);
  checkoutSection.style.display = 'none';

  var checkoutForm = el('div', { className: 'shop-checkout-form' });

  function makeField(id, labelText, type, placeholder, describedBy, autocomplete) {
    var wrap = el('div', { className: 'shop-field' });
    var lbl  = el('label', { className: 'shop-label', 'for': id });
    setText(lbl, labelText);
    var attrs = {
      type: type, id: id, className: 'shop-input',
      placeholder: placeholder, 'aria-describedby': describedBy
    };
    if (autocomplete) attrs.autocomplete = autocomplete;
    var inp = el('input', attrs);
    var msg = el('span', {
      id: describedBy, className: 'shop-validation-msg', role: 'status', 'aria-live': 'polite'
    });
    wrap.appendChild(lbl); wrap.appendChild(inp); wrap.appendChild(msg);
    return { wrap: wrap, inp: inp, msg: msg };
  }

  var emailF = makeField('shop-email', 'Email Address', 'email', 'your@email.com', 'shop-email-msg', 'email');
  checkoutForm.appendChild(emailF.wrap);
  var emailInput = emailF.inp, emailMsg = emailF.msg;

  var addrHeading = el('div', { className: 'shop-address-heading' });
  setText(addrHeading, 'Shipping Address');
  checkoutForm.appendChild(addrHeading);

  var nameF   = makeField('shop-name',   'Full Name',      'text', 'Full name',         'shop-name-msg',   'name');
  checkoutForm.appendChild(nameF.wrap);
  var nameInput = nameF.inp, nameMsg = nameF.msg;

  var streetF = makeField('shop-street', 'Street Address', 'text', 'Street and number', 'shop-street-msg', 'address-line1');
  checkoutForm.appendChild(streetF.wrap);
  var streetInput = streetF.inp, streetMsg = streetF.msg;

  var cityF   = makeField('shop-city',   'City',           'text', 'City',              'shop-city-msg',   'address-level2');
  checkoutForm.appendChild(cityF.wrap);
  var cityInput = cityF.inp, cityMsg = cityF.msg;

  var postalF = makeField('shop-postal', 'Postal Code',    'text', 'Postal / ZIP code', 'shop-postal-msg', 'postal-code');
  checkoutForm.appendChild(postalF.wrap);
  var postalInput = postalF.inp, postalMsg = postalF.msg;

  /* Country */
  var countryField      = el('div', { className: 'shop-field' });
  var countryLabel      = el('label', { className: 'shop-label', 'for': 'shop-country' });
  setText(countryLabel, 'Country');
  var countriesListId   = 'shop-countries-list';
  var countryInput      = el('input', {
    type: 'text', id: 'shop-country', className: 'shop-input',
    list: countriesListId, autocomplete: 'country-name',
    placeholder: 'e.g. Poland', 'aria-describedby': 'shop-country-msg'
  });
  var countriesDatalist = el('datalist', { id: countriesListId });
  COUNTRY_LIST.forEach(function (c) {
    var opt = document.createElement('option'); opt.value = c.name;
    countriesDatalist.appendChild(opt);
  });
  var countryMsg = el('span', {
    id: 'shop-country-msg', className: 'shop-validation-msg', role: 'status', 'aria-live': 'polite'
  });
  countryField.appendChild(countryLabel);
  countryField.appendChild(countryInput);
  countryField.appendChild(countriesDatalist);
  countryField.appendChild(countryMsg);
  checkoutForm.appendChild(countryField);

  var phoneF = makeField('shop-phone', 'Phone (optional)', 'tel', '+1 555 000 0000', 'shop-phone-msg', 'tel');
  checkoutForm.appendChild(phoneF.wrap);
  var phoneInput = phoneF.inp;

  var notesField = el('div', { className: 'shop-field' });
  var notesLabel = el('label', { className: 'shop-label', 'for': 'shop-notes' });
  setText(notesLabel, 'Order Notes (optional)');
  var notesInput = el('textarea', {
    id: 'shop-notes',
    className: 'shop-input shop-notes-input',
    rows: '3',
    placeholder: 'Special requests, delivery notes, print instructions'
  });
  notesField.appendChild(notesLabel);
  notesField.appendChild(notesInput);
  checkoutForm.appendChild(notesField);

  checkoutSection.appendChild(checkoutForm);

  var paypalSep       = el('div', { className: 'shop-paypal-separator', 'aria-hidden': 'true' });
  var paypalWrapper   = el('div', { className: 'shop-paypal-wrapper' });
  var paypalContainer = el('div', { id: 'paypal-button-container' });
  var paypalOverlay   = el('div', { className: 'shop-paypal-overlay', 'aria-hidden': 'true' });
  setText(paypalOverlay, 'Processing\u2026');
  paypalWrapper.appendChild(paypalContainer);
  paypalWrapper.appendChild(paypalOverlay);
  checkoutSection.appendChild(paypalSep);
  checkoutSection.appendChild(paypalWrapper);

  root.appendChild(checkoutSection);

  var previewLightbox = el('div', { id: 'shop-preview-lightbox', className: 'lightbox shop-preview-lightbox' });
  var previewClose = el('button', { type: 'button', className: 'lightbox-close' });
  setText(previewClose, 'BACK');
  var previewImg = el('img', { src: '', alt: '' });
  previewClose.addEventListener('click', function (e) {
    e.stopPropagation();
    previewLightbox.classList.remove('active');
  });
  previewLightbox.addEventListener('click', function (e) {
    if (e.target === previewLightbox) previewLightbox.classList.remove('active');
  });
  previewLightbox.appendChild(previewClose);
  previewLightbox.appendChild(previewImg);
  root.appendChild(previewLightbox);

  /* â”€â”€ State helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function getEmail()   { return emailInput.value.trim(); }
  function getCountry() { return countryInput.value.trim(); }

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function collectAddressData() {
    return {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      street:  streetInput.value.trim(),
      city:    cityInput.value.trim(),
      postal:  postalInput.value.trim(),
      country: countryInput.value.trim(),
      phone:   phoneInput.value.trim(),
      notes:   notesInput.value.trim()
    };
  }

  function checkoutIsValid() {
    if (!cart.length)              return false;
    if (!isValidEmail(getEmail())) return false;
    if (!nameInput.value.trim())   return false;
    if (!streetInput.value.trim()) return false;
    if (!cityInput.value.trim())   return false;
    if (!postalInput.value.trim()) return false;
    var country = getCountry();
    return !!(country && lookupCountry(country));
  }

  /* â”€â”€ Order summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function renderOrderSummary() {
    return;
  }

  /* â”€â”€ Cart render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function renderCart() {
    cart = loadCart();
    var cartWasNormalized = false;
    var defaultSize = PRINT_SIZES[getDefaultA3SizeIdx()];
    if (defaultSize) {
      cart.forEach(function (item) {
        if (!item.sizeId) {
          item.sizeId = defaultSize.id;
          item.sizeLabel = defaultSize.label + ' \u2013 ' + defaultSize.dims;
          item.price = defaultSize.price;
          cartWasNormalized = true;
        }
      });
      if (cartWasNormalized) saveCart(cart);
    }
    var sortBefore = JSON.stringify(cart.map(function (item) {
      return [item.code, item.sizeId];
    }));
    cart.sort(function (a, b) {
      var codeCmp = String(a.code || '').localeCompare(String(b.code || ''));
      if (codeCmp !== 0) return codeCmp;
      return getSizeSortIdx(a.sizeId) - getSizeSortIdx(b.sizeId);
    });
    var sortAfter = JSON.stringify(cart.map(function (item) {
      return [item.code, item.sizeId];
    }));
    if (sortBefore !== sortAfter) saveCart(cart);

    while (cartBody.firstChild) cartBody.removeChild(cartBody.firstChild);

    if (!cart.length) {
      var empty = el('p', { className: 'shop-cart-empty' });
      setText(empty, 'Your cart is empty.');
      cartBody.appendChild(empty);
      checkoutSection.style.display = 'none';
      clearTimeout(paypalRenderTimer);
      destroyPayPal();
      return;
    }

    var table = el('table', { className: 'shop-cart-table' });
    var thead  = el('thead', {});
    var hRow   = el('tr', {});
    ['Image', 'Code', 'Size', 'Qty', 'Price', 'Remove'].forEach(function (h) {
      var th = el('th', {}); setText(th, h); hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    table.appendChild(thead);

    var tbody = el('tbody', {});
    var groups = {};
    cart.forEach(function (item, idx) {
      if (!groups[item.code]) groups[item.code] = [];
      groups[item.code].push({ item: item, idx: idx });
    });
    Object.keys(groups).forEach(function (code) {
      var entries = groups[code];
      var usedSizeIds = entries.map(function (entry) { return entry.item.sizeId; });

      entries.forEach(function (entry, localIdx) {
        var item = entry.item;
        var idx = entry.idx;
        var tr = el('tr', {});
        var tdCode = null;
        var tdThumb = null;

        if (localIdx === 0) {
          tdCode = el('td', {});
          tdCode.setAttribute('data-label', 'Code');
          tdCode.setAttribute('rowspan', String(entries.length));
          var codeSpan = el('span', { className: 'shop-cart-code' }); setText(codeSpan, code);
          tdCode.appendChild(codeSpan);
        }

        var tdSize     = el('td', { className: 'shop-cart-size-cell' });
        tdSize.setAttribute('data-label', 'Size');
        var sizeSelect = el('select', {
          className: 'shop-cart-size-selector',
          'aria-label': 'Select size for ' + item.code,
          'data-idx': String(idx)
        });
        PRINT_SIZES.forEach(function (size) {
          var opt = document.createElement('option');
          opt.value = size.id;
          opt.textContent = size.label + ' — ' + getSizeDescription(size.id);
          if (size.id === item.sizeId) opt.selected = true;
          if (usedSizeIds.indexOf(size.id) !== -1 && size.id !== item.sizeId) {
            opt.disabled = true;
          }
          sizeSelect.appendChild(opt);
        });
        sizeSelect.addEventListener('change', function () {
          var rowIdx = parseInt(this.getAttribute('data-idx'), 10);
          if (isNaN(rowIdx) || !cart[rowIdx]) return;
          var nextSizeId = this.value;
          var nextSize = PRINT_SIZES.find(function (s) { return s.id === nextSizeId; });
          if (!nextSize) return;

          var current = cart[rowIdx];
          if (current.sizeId === nextSize.id) return;

          var mergeIdx = -1;
          for (var mi = 0; mi < cart.length; mi++) {
            if (mi === rowIdx) continue;
            if (cart[mi].code === current.code && cart[mi].sizeId === nextSize.id) {
              mergeIdx = mi;
              break;
            }
          }

          if (mergeIdx !== -1) {
            cart[mergeIdx].qty = Math.min(99, (cart[mergeIdx].qty || 1) + (current.qty || 1));
            if (!cart[mergeIdx].thumbnailUrl && current.thumbnailUrl) {
              cart[mergeIdx].thumbnailUrl = current.thumbnailUrl;
            }
            cart.splice(rowIdx, 1);
          } else {
            current.sizeId = nextSize.id;
            current.sizeLabel = nextSize.label + ' \u2013 ' + nextSize.dims;
            current.price = nextSize.price;
          }

          saveCart(cart);
          destroyPayPal();
          renderCart();
          schedulePayPalRefresh();
        });
        tdSize.appendChild(sizeSelect);

        if (localIdx === 0) {
          tdThumb = el('td', {});
          tdThumb.setAttribute('data-label', 'Image');
          tdThumb.setAttribute('rowspan', String(entries.length));
          if (item.thumbnailUrl) {
            var imgEl = el('img', {
              src: item.thumbnailUrl, alt: item.code,
              className: 'shop-cart-thumb', loading: 'lazy'
            });
            imgEl.style.cursor = 'pointer';
            imgEl.addEventListener('click', function () {
              var lb = document.getElementById('shop-preview-lightbox');
              var lbImg = lb ? lb.querySelector('img') : null;
              if (!lb || !lbImg) return;
              lbImg.src = item.thumbnailUrl;
              lbImg.alt = item.code;
              lb.classList.add('active');
            });
            tdThumb.appendChild(imgEl);

            var thumbPreview = el('button', {
              type: 'button',
              className: 'shop-thumb-preview-link cart-preview',
              'aria-label': 'Preview ' + item.code
            });
            setText(thumbPreview, 'Preview');
            thumbPreview.addEventListener('click', function () {
              var lb = document.getElementById('shop-preview-lightbox');
              var lbImg = lb ? lb.querySelector('img') : null;
              if (!lb || !lbImg) return;
              lbImg.src = item.thumbnailUrl;
              lbImg.alt = item.code;
              lb.classList.add('active');
            });
            tdThumb.appendChild(thumbPreview);
          }
          tr.appendChild(tdThumb);
          if (tdCode) tr.appendChild(tdCode);
        }
        tr.appendChild(tdSize);

        var tdQty = el('td', {});
        tdQty.setAttribute('data-label', 'Qty');
        var qtySelect = el('select', {
          className: 'shop-cart-qty-selector cart-qty',
          'aria-label': 'Select quantity for ' + item.code,
          'data-idx': String(idx)
        });
        [1, 2, 3, 4, 5].forEach(function (q) {
          var optQ = document.createElement('option');
          optQ.value = String(q);
          optQ.textContent = String(q);
          if (Number(item.qty) === q) optQ.selected = true;
          qtySelect.appendChild(optQ);
        });
        qtySelect.addEventListener('change', function () {
          var rowIdx = parseInt(this.getAttribute('data-idx'), 10);
          if (isNaN(rowIdx) || !cart[rowIdx]) return;
          var nextQty = parseInt(this.value, 10);
          if (!nextQty || nextQty < 1) nextQty = 1;
          if (nextQty > 5) nextQty = 5;
          cart[rowIdx].qty = nextQty;
          saveCart(cart);
          destroyPayPal();
          renderCart();
          schedulePayPalRefresh();
        });
        tdQty.appendChild(qtySelect);
        tr.appendChild(tdQty);

        var tdPrice = el('td', {});
        tdPrice.setAttribute('data-label', 'Price');
        setText(tdPrice, formatMoney((item.price || SHOP_CONFIG.printPrice) * item.qty));
        tr.appendChild(tdPrice);

        var tdRemove  = el('td', {});
        tdRemove.setAttribute('data-label', 'Remove');
        var removeBtn = el('button', {
          type: 'button', className: 'shop-cart-remove-btn cart-remove',
          'aria-label': 'Remove ' + item.code + ' from cart',
          'data-idx': String(idx)
        });
        setText(removeBtn, '\u00d7');
        removeBtn.addEventListener('click', function () {
          var i = parseInt(this.getAttribute('data-idx'), 10);
          cart.splice(i, 1);
          saveCart(cart);
          destroyPayPal();
          renderCart();
          schedulePayPalRefresh();
        });
        tdRemove.appendChild(removeBtn);
        tr.appendChild(tdRemove);

        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    cartBody.appendChild(table);

    /* Totals */
    var totalsDiv = el('div', { className: 'shop-cart-totals' });
    var country   = getCountry();
    var subtotal  = calculateSubtotal(cart);
    var shipping  = calculateShipping(cart, country);
    var total     = subtotal + shipping;

    function cartTotalRow(label, valueText, extraClass) {
      var row = el('div', { className: 'shop-totals-row' + (extraClass ? extraClass : '') });
      var l   = el('span', { className: 'shop-totals-label' }); setText(l, label);
      var v   = el('span', { className: 'shop-totals-value' + (valueText === 'Free' ? ' shop-shipping-free' : '') });
      setText(v, valueText);
      row.appendChild(l); row.appendChild(v);
      totalsDiv.appendChild(row);
    }

    cartTotalRow('Subtotal', formatMoney(subtotal));
    cartTotalRow('Shipping', shipping === 0 ? 'Free' : formatMoney(shipping));
    cartTotalRow('Total',    formatMoney(total), ' is-total');
    cartBody.appendChild(totalsDiv);

    /* CLEAR CART â€“ always visible when cart has items */
    clearConfirmRow.style.display = 'none';
    clearBtn.style.display        = '';
    cartBody.appendChild(clearCartActions);

    checkoutSection.style.display = '';
    schedulePayPalRefresh();
  }

  /* â”€â”€ PayPal refresh with automatic cancel recovery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  var paypalRenderTimer = null;

  function schedulePayPalRefresh() {
    clearTimeout(paypalRenderTimer);
    paypalRenderTimer = setTimeout(function () {
      cart = loadCart();
      if (!Array.isArray(cart) || !cart.length) return;
      var addressData = collectAddressData();
      var renderKey = buildPayPalRenderKey(cart, addressData);
      _paypalRenderCycle += 1;
      var renderCycle = _paypalRenderCycle;
      renderPayPalButton(
        cart,
        collectAddressData,
        checkoutIsValid,
        onPaymentSuccess,
        null,
        renderKey,
        renderCycle
      );
    }, 800);
  }

  /* â”€â”€ Country validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function applyCountryValidation(showErrorIfEmpty) {
    var v     = countryInput.value.trim();
    var found = v ? lookupCountry(v) : null;

    if (!v) {
      if (showErrorIfEmpty) {
        setText(countryMsg, 'Country is required');
        countryMsg.className = 'shop-validation-msg';
        countryInput.setAttribute('aria-invalid', 'true');
      } else {
        setText(countryMsg, '');
        countryMsg.className = 'shop-validation-msg';
        countryInput.removeAttribute('aria-invalid');
      }
    } else if (found) {
      var tier = found.code === SHOP_CONFIG.storeCountry
        ? 'Local shipping: ' + formatMoney(SHOP_CONFIG.shipping.local.base)
        : 'International shipping: ' + formatMoney(SHOP_CONFIG.shipping.international.base);
      setText(countryMsg, '\u2713 ' + tier);
      countryMsg.className = 'shop-validation-msg is-valid';
      countryInput.setAttribute('aria-invalid', 'false');
    } else {
      if (showErrorIfEmpty) {
        setText(countryMsg, 'Country not recognised \u2013 please select from the list');
        countryMsg.className = 'shop-validation-msg';
        countryInput.setAttribute('aria-invalid', 'true');
      } else {
        setText(countryMsg, '');
        countryMsg.className = 'shop-validation-msg';
        countryInput.removeAttribute('aria-invalid');
      }
    }
  }

  /* â”€â”€ Input event handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  qtyMinus.addEventListener('click', function () {
    if (quantity > 1) quantity--;
    setText(qtyDisplay, String(quantity));
  });

  qtyPlus.addEventListener('click', function () {
    if (quantity < 99) quantity++;
    setText(qtyDisplay, String(quantity));
  });

  codeInput.addEventListener('input', function () {
    var val = codeInput.value.trim().toUpperCase();
    if (!val) { setText(codeMsg, ''); codeInput.removeAttribute('aria-invalid'); return; }
    var found = lookupCode(val);
    if (found) {
      setText(codeMsg, '\u2713 ' + found.title);
      codeMsg.className = 'shop-validation-msg is-valid';
      codeInput.setAttribute('aria-invalid', 'false');
    } else {
      setText(codeMsg, 'Code not recognised');
      codeMsg.className = 'shop-validation-msg';
      codeInput.setAttribute('aria-invalid', 'true');
    }
  });

  addBtn.addEventListener('click', function () {
    var rawCode = codeInput.value.trim().toUpperCase();

    if (!rawCode) {
      setText(codeMsg, 'Please enter a print code');
      codeMsg.className = 'shop-validation-msg';
      codeInput.setAttribute('aria-invalid', 'true');
      codeInput.focus();
      return;
    }

    var imageInfo = lookupCode(rawCode);
    if (!imageInfo) {
      setText(codeMsg, 'Code not found in catalogue \u2013 please check and try again');
      codeMsg.className = 'shop-validation-msg';
      codeInput.setAttribute('aria-invalid', 'true');
      codeInput.focus();
      return;
    }

    var addResult = addToCartByCode(rawCode, {
      qty: quantity,
      sizeIdx: selectedSizeIdx,
      thumbnailUrl: imageInfo.thumbnailUrl
    });
    if (!addResult.ok) return;
    cart = addResult.cart;
    destroyPayPal();
    renderCart();

    codeInput.value = '';
    quantity = 1;
    setText(qtyDisplay, '1');
    setText(codeMsg, '');
    codeInput.removeAttribute('aria-invalid');
    codeMsg.className = 'shop-validation-msg';
    codeInput.focus();
  });

  emailInput.addEventListener('blur', function () {
    var v = getEmail();
    if (v && !isValidEmail(v)) {
      setText(emailMsg, 'Please enter a valid email address');
      emailMsg.className = 'shop-validation-msg';
      emailInput.setAttribute('aria-invalid', 'true');
    } else {
      setText(emailMsg, '');
      emailMsg.className = 'shop-validation-msg';
      emailInput.removeAttribute('aria-invalid');
    }
    schedulePayPalRefresh();
  });

  emailInput.addEventListener('input', function () { schedulePayPalRefresh(); });

  [
    { inp: nameInput,   msg: nameMsg,   label: 'Full name is required' },
    { inp: streetInput, msg: streetMsg, label: 'Street address is required' },
    { inp: cityInput,   msg: cityMsg,   label: 'City is required' },
    { inp: postalInput, msg: postalMsg, label: 'Postal code is required' }
  ].forEach(function (f) {
    f.inp.addEventListener('blur', function () {
      if (!f.inp.value.trim()) {
        setText(f.msg, f.label);
        f.msg.className = 'shop-validation-msg';
        f.inp.setAttribute('aria-invalid', 'true');
      } else {
        setText(f.msg, '');
        f.msg.className = 'shop-validation-msg';
        f.inp.removeAttribute('aria-invalid');
      }
      schedulePayPalRefresh();
    });
    f.inp.addEventListener('input', function () { schedulePayPalRefresh(); });
  });

  countryInput.addEventListener('input', function () {
    applyCountryValidation(false);
    renderCart();
    schedulePayPalRefresh();
  });

  countryInput.addEventListener('blur', function () {
    applyCountryValidation(true);
    renderCart();
    schedulePayPalRefresh();
  });

  /* â”€â”€ Payment success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function onPaymentSuccess(result) {
    var confData = {
      orderId:       result.orderId,
      transactionId: result.transactionId,
      name:          result.address.name,
      country:       result.address.country,
      total:         formatMoney(calculateTotal(cart, result.address.country)),
      items:         cart.map(function (i) {
        return {
          code:      i.code,
          sizeId:    i.sizeId    || '',
          sizeLabel: i.sizeLabel || '',
          qty:       i.qty,
          price:     i.price || SHOP_CONFIG.printPrice
        };
      })
    };
    saveConfirmation(confData);
    renderConfirmation(root, confData, indexData);
  }

  renderCart();
}

/* ============================================================
   UI V5  -  Select -> Cart -> Checkout
   ============================================================ */
function buildShopUIV5(root, indexData) {
  while (root.firstChild) root.removeChild(root.firstChild);

  var storedConf = loadConfirmation();
  if (storedConf) { renderConfirmation(root, storedConf, indexData); return; }

  var state = {
    store: loadShopStore(),
    highlightCode: '',
    paypalReady: false,
    paypalLoading: false,
    paypalInstance: null,
    paypalActions: null,
    isProcessingPayPal: false
  };

  function getPlaceholderThumb() {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">' +
      '<rect width="140" height="140" fill="#111"/>' +
      '<text x="50%" y="50%" fill="#777" font-size="12" text-anchor="middle" dominant-baseline="middle">NO PREVIEW</text>' +
      '</svg>'
    );
  }

  function collectCartRows() {
    return flattenCartFromStore(state.store);
  }

  function ensureSelectRowForCode(code, preferredSize) {
    var c = String(code || '').toUpperCase();
    if (!c) return;
    if (state.store.select[c]) return;

    var cartEntry = state.store.cart[c] || {};
    var used = cartEntry.sizes ? Object.keys(cartEntry.sizes) : [];
    var nextSize = preferredSize || 'A3';
    if (used.indexOf(nextSize) !== -1) {
      for (var i = 0; i < PRINT_SIZES.length; i++) {
        if (used.indexOf(PRINT_SIZES[i].id) === -1) {
          nextSize = PRINT_SIZES[i].id;
          break;
        }
      }
    }
    if (used.indexOf(nextSize) !== -1) return;

    var meta = lookupCode(c) || {};
    state.store.select[c] = {
      size: nextSize,
      thumb: cartEntry.thumb || meta.thumbnailUrl || '',
      title: cartEntry.title || meta.title || ''
    };
  }

  function getAvailableSizesForCode(code) {
    var used = [];
    if (state.store.cart[code] && state.store.cart[code].sizes) {
      used = Object.keys(state.store.cart[code].sizes);
    }
    return PRINT_SIZES.filter(function (size) {
      return used.indexOf(size.id) === -1;
    });
  }

  var intro = el('section', { className: 'shop-intro' });
  var introTitle = el('h2', { className: 'shop-section-title shop-title' });
  setText(introTitle, 'Fine Art Prints');
  intro.appendChild(introTitle);
  var introOrder = el('p', { className: 'shop-intro-para' });
  setText(introOrder, 'To order: Browse project galleries and click the image code to add prints to your cart.');
  intro.appendChild(introOrder);
  var introText = el('p', { className: 'shop-intro-para' });
  setText(introText, 'Prints on premium art paper. Ships in protective packaging, ready to frame.');
  intro.appendChild(introText);
  var shippingLocal = el('p', { className: 'shop-intro-para shipping-line' });
  setText(shippingLocal, 'Local shipping: 7.00 EUR (free over EUR 77.00).');
  var shippingIntl = el('p', { className: 'shop-intro-para shipping-line' });
  setText(shippingIntl, 'International shipping: EUR 27.00 (free over EUR 222.00).');
  intro.appendChild(shippingLocal);
  intro.appendChild(shippingIntl);
  root.appendChild(intro);

  var selectSection = el('section', { className: 'shop-cart' });
  var selectTitle = el('h2', { className: 'shop-section-title' });
  setText(selectTitle, 'SELECT PRINT');
  selectSection.appendChild(selectTitle);
  var selectSub = el('p', { className: 'shop-intro-para' });
  setText(selectSub, '(add sizes here)');
  selectSection.appendChild(selectSub);
  var selectBody = el('div', { className: 'shop-cart-body' });
  selectSection.appendChild(selectBody);

  var countrySelectField = el('div', { className: 'shop-field' });
  var countrySelectLabel = el('label', { className: 'shop-label shipping-country-label', 'for': 'shop-country-v5' });
  setText(countrySelectLabel, 'Shipping country');
  var countryInput = el('input', {
    id: 'shop-country-v5',
    type: 'text',
    className: 'shop-input',
    list: 'shop-country-v5-list',
    autocomplete: 'country-name',
    placeholder: 'e.g. Poland'
  });
  var countryList = el('datalist', { id: 'shop-country-v5-list' });
  COUNTRY_LIST.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.name;
    countryList.appendChild(opt);
  });
  countrySelectField.appendChild(countrySelectLabel);
  countrySelectField.appendChild(countryInput);
  countrySelectField.appendChild(countryList);
  selectSection.appendChild(countrySelectField);
  root.appendChild(selectSection);

  var cartSection = el('section', { className: 'shop-cart' });
  var cartTitle = el('h2', { className: 'shop-section-title' });
  setText(cartTitle, 'YOUR CART');
  cartSection.appendChild(cartTitle);
  var cartSub = el('p', { className: 'shop-intro-para' });
  setText(cartSub, '(items ready for checkout)');
  cartSection.appendChild(cartSub);
  var cartBody = el('div', { className: 'shop-cart-body' });
  cartSection.appendChild(cartBody);
  root.appendChild(cartSection);

  var totalsDiv = el('div', { className: 'shop-cart-totals' });
  root.appendChild(totalsDiv);

  var clearWrap = el('div', { className: 'shop-clear-cart-actions' });
  var clearBtn = el('button', { type: 'button', className: 'shop-clear-cart-btn' });
  setText(clearBtn, 'Clear Cart');
  clearWrap.appendChild(clearBtn);
  root.appendChild(clearWrap);

  var checkoutSection = el('section', { className: 'shop-checkout', id: 'shop-checkout' });
  var checkoutTitle = el('h2', { className: 'shop-section-title' });
  setText(checkoutTitle, 'Checkout');
  checkoutSection.appendChild(checkoutTitle);

  var checkoutForm = el('div', { className: 'shop-checkout-form' });
  function field(id, label, type, placeholder) {
    var wrap = el('div', { className: 'shop-field' });
    var lbl = el('label', { className: 'shop-label', 'for': id }); setText(lbl, label);
    var inp = el('input', { id: id, type: type, className: 'shop-input', placeholder: placeholder || '' });
    wrap.appendChild(lbl); wrap.appendChild(inp);
    checkoutForm.appendChild(wrap);
    return inp;
  }
  var emailInput = field('shop-email-v5', 'Email Address', 'email', 'your@email.com');
  var emailMsg = el('span', { className: 'shop-validation-msg', id: 'shop-email-v5-msg' });
  checkoutForm.appendChild(emailMsg);
  var nameInput = field('shop-name-v5', 'Full Name', 'text', 'Full name');
  var streetInput = field('shop-street-v5', 'Street Address', 'text', 'Street and number');
  var cityInput = field('shop-city-v5', 'City', 'text', 'City');
  var postalInput = field('shop-postal-v5', 'Postal Code', 'text', 'Postal / ZIP code');
  var phoneInput = field('shop-phone-v5', 'Phone (optional)', 'tel', '+1 555 000 0000');
  var notesWrap = el('div', { className: 'shop-field' });
  var notesLbl = el('label', { className: 'shop-label', 'for': 'shop-notes-v5' });
  setText(notesLbl, 'Order Notes (optional)');
  var notesInput = el('textarea', { id: 'shop-notes-v5', className: 'shop-input shop-notes-input', rows: '3' });
  notesWrap.appendChild(notesLbl);
  notesWrap.appendChild(notesInput);
  checkoutForm.appendChild(notesWrap);
  checkoutSection.appendChild(checkoutForm);

  var paypalWrapper = el('div', { className: 'shop-paypal-wrapper' });
  var paypalContainer = el('div', { id: 'paypal-button-container' });
  var paypalOverlay = el('div', { className: 'shop-paypal-overlay', 'aria-hidden': 'true' });
  setText(paypalOverlay, 'Processing…');
  paypalWrapper.appendChild(paypalContainer);
  paypalWrapper.appendChild(paypalOverlay);
  checkoutSection.appendChild(paypalWrapper);
  root.appendChild(checkoutSection);

  var previewLightbox = el('div', { id: 'shop-preview-lightbox', className: 'lightbox shop-preview-lightbox' });
  var previewClose = el('button', { type: 'button', className: 'lightbox-close' }); setText(previewClose, 'BACK');
  var previewImg = el('img', { src: '', alt: '' });
  previewClose.addEventListener('click', function (e) { e.stopPropagation(); previewLightbox.classList.remove('active'); });
  previewLightbox.addEventListener('click', function (e) { if (e.target === previewLightbox) previewLightbox.classList.remove('active'); });
  previewLightbox.appendChild(previewClose); previewLightbox.appendChild(previewImg);
  root.appendChild(previewLightbox);

  function openPreview(src, alt) {
    previewImg.src = src || getPlaceholderThumb();
    previewImg.alt = alt || '';
    previewLightbox.classList.add('active');
  }

  function getAddressData() {
    return {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      street: streetInput.value.trim(),
      city: cityInput.value.trim(),
      postal: postalInput.value.trim(),
      country: countryInput.value.trim(),
      phone: phoneInput.value.trim(),
      notes: notesInput.value.trim()
    };
  }

  function checkoutIsValid() {
    var a = getAddressData();
    if (!collectCartRows().length) return false;
    if (!isValidEmail(a.email)) return false;
    return !!(a.name && a.street && a.city && a.postal && a.country);
  }

  function isValidEmail(v) {
    var s = String(v || '').trim();
    if (s.length < 6) return false;
    if (s.indexOf('@') === -1) return false;
    if (s.indexOf('.') === -1) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function validateEmailField(showMessage) {
    var ok = isValidEmail(emailInput.value);
    if (!ok) {
      emailInput.setAttribute('aria-invalid', 'true');
      if (showMessage || emailInput.value.trim()) {
        setText(emailMsg, 'Please enter a valid email address');
      }
    } else {
      emailInput.removeAttribute('aria-invalid');
      setText(emailMsg, '');
    }
    return ok;
  }

  function getShippingTierByCountry() {
    var country = lookupCountry(countryInput.value.trim());
    var isLocal = country && country.code === SHOP_CONFIG.storeCountry;
    return isLocal ? SHOP_CONFIG.shipping.local : SHOP_CONFIG.shipping.international;
  }

  function renderTotals() {
    while (totalsDiv.firstChild) totalsDiv.removeChild(totalsDiv.firstChild);
    var rows = collectCartRows();
    var subtotal = calculateSubtotal(rows);
    var shippingTier = getShippingTierByCountry();
    var shipping = subtotal >= shippingTier.freeAbove ? 0 : shippingTier.base;
    var total = subtotal + shipping;

    function row(lbl, val, cls) {
      var r = el('div', { className: 'shop-totals-row' + (cls ? cls : '') });
      var l = el('span', { className: 'shop-totals-label' }); setText(l, lbl);
      var v = el('span', { className: 'shop-totals-value' }); setText(v, val);
      r.appendChild(l); r.appendChild(v); totalsDiv.appendChild(r);
    }
    row('Subtotal', formatMoney(subtotal));
    row('Shipping', shipping === 0 ? 'Free' : formatMoney(shipping));
    row('Total', formatMoney(total), ' is-total');
    checkoutSection.style.display = rows.length ? '' : 'none';
    paypalWrapper.style.display = rows.length ? '' : 'none';
    syncPayPalInteractivity();
  }

  function syncPayPalInteractivity() {
    var hasItems = collectCartRows().length > 0;
    var valid = checkoutIsValid();
    var shouldDisable = hasItems && !valid;

    if (state.paypalActions) {
      try {
        if (shouldDisable) state.paypalActions.disable();
        else state.paypalActions.enable();
      } catch (e) {}
    }

    if (state.isProcessingPayPal) return;

    if (shouldDisable) {
      setText(paypalOverlay, 'Complete checkout details to enable PayPal.');
      paypalOverlay.classList.add('is-visible');
      paypalOverlay.setAttribute('aria-hidden', 'false');
    } else {
      paypalOverlay.classList.remove('is-visible');
      paypalOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  function renderSelect() {
    while (selectBody.firstChild) selectBody.removeChild(selectBody.firstChild);
    var codes = Object.keys(state.store.select).sort();
    if (!codes.length) {
      var empty = el('p', { className: 'shop-cart-empty' });
      setText(empty, 'No selected prints yet. Add from project pages.');
      selectBody.appendChild(empty);
      return;
    }

    var table = el('table', { className: 'shop-cart-table' });
    var thead = el('thead', {});
    var hr = el('tr', {});
    ['Thumb', 'Code', 'Size', 'Add', 'X'].forEach(function (h) {
      var th = el('th', {}); setText(th, h); hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);
    var tbody = el('tbody', {});

    codes.forEach(function (code) {
      var sel = state.store.select[code];
      var tr = el('tr', {});
      tr.setAttribute('data-select-code', code);

      var tdThumb = el('td', { 'data-label': 'Thumb' });
      var src = sel.thumb || (lookupCode(code) && lookupCode(code).thumbnailUrl) || getPlaceholderThumb();
      var img = el('img', { src: src, alt: code, className: 'shop-cart-thumb', loading: 'lazy' });
      img.addEventListener('click', function () { openPreview(src, code); });
      img.addEventListener('error', function () { img.src = getPlaceholderThumb(); });
      var prev = el('button', { type: 'button', className: 'shop-thumb-preview-link cart-preview' });
      setText(prev, 'Preview');
      prev.addEventListener('click', function () { openPreview(src, code); });
      tdThumb.appendChild(img); tdThumb.appendChild(prev);
      tr.appendChild(tdThumb);

      var tdCode = el('td', { 'data-label': 'Code' });
      var cSpan = el('span', { className: 'shop-cart-code' }); setText(cSpan, code);
      tdCode.appendChild(cSpan); tr.appendChild(tdCode);

      var tdSize = el('td', { 'data-label': 'Size' });
      var options = getAvailableSizesForCode(code);
      var isAllSizesInCart = !options.length;
      if (!options.length) {
        var no = el('span', { className: 'shop-cart-size' }); setText(no, 'All sizes already in cart');
        tdSize.appendChild(no);
      } else {
        var isCurrentAllowed = false;
        for (var oi = 0; oi < options.length; oi++) {
          if (options[oi].id === sel.size) { isCurrentAllowed = true; break; }
        }
        if (!isCurrentAllowed) sel.size = options[0].id;
        var sSel = el('select', { className: 'shop-cart-size-selector' });
        options.forEach(function (sz) {
          var o = document.createElement('option');
          o.value = sz.id;
          o.textContent = sz.id;
          if (sz.id === sel.size) o.selected = true;
          sSel.appendChild(o);
        });
        sSel.addEventListener('change', function () {
          state.store.select[code].size = this.value;
          state.store = saveShopStore(state.store);
          render();
        });
        tdSize.appendChild(sSel);
      }
      tr.appendChild(tdSize);

      var tdAdd = el('td', { 'data-label': 'Add' });
      var addBtn = el('button', { type: 'button', className: 'shop-add-btn' });
      setText(addBtn, isAllSizesInCart ? 'All sizes already in cart' : 'ADD');
      if (isAllSizesInCart) addBtn.setAttribute('disabled', 'disabled');
      addBtn.addEventListener('click', function () {
        var entry = state.store.select[code];
        if (!entry) return;
        var available = getAvailableSizesForCode(code);
        if (!available.length) return;
        var sizeId = entry.size || available[0].id;
        var stillAvailable = false;
        for (var ai = 0; ai < available.length; ai++) {
          if (available[ai].id === sizeId) { stillAvailable = true; break; }
        }
        if (!stillAvailable) sizeId = available[0].id;

        if (!state.store.cart[code]) state.store.cart[code] = { thumb: entry.thumb || '', title: entry.title || '', sizes: {} };
        state.store.cart[code].thumb = state.store.cart[code].thumb || entry.thumb || '';
        state.store.cart[code].title = state.store.cart[code].title || entry.title || '';
        state.store.cart[code].sizes[sizeId] = (state.store.cart[code].sizes[sizeId] || 0) + 1;
        var nextOptions = getAvailableSizesForCode(code).filter(function (s) { return s.id !== sizeId; });
        if (nextOptions.length) {
          state.store.select[code].size = nextOptions[0].id;
        } else {
          state.store.select[code].size = sizeId;
        }
        state.store = saveShopStore(state.store);
        render();
      });
      tdAdd.appendChild(addBtn); tr.appendChild(tdAdd);

      var tdRemove = el('td', { 'data-label': 'X' });
      var rm = el('button', { type: 'button', className: 'shop-cart-remove-btn cart-remove' });
      setText(rm, '×');
      rm.addEventListener('click', function () {
        delete state.store.select[code];
        state.store = saveShopStore(state.store);
        render();
      });
      tdRemove.appendChild(rm); tr.appendChild(tdRemove);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    selectBody.appendChild(table);
  }

  function renderCart() {
    while (cartBody.firstChild) cartBody.removeChild(cartBody.firstChild);
    var rows = collectCartRows();
    if (!rows.length) {
      var empty = el('p', { className: 'shop-cart-empty' });
      setText(empty, 'Your cart is empty.');
      cartBody.appendChild(empty);
      return;
    }

    var codes = Object.keys(state.store.cart).sort();
    codes.forEach(function (code) {
      var group = el('div', { className: 'shop-cart-group' });
      var head = el('div', { className: 'shop-cart-group-head' });
      var thumbSrc = (state.store.cart[code] && state.store.cart[code].thumb) || (lookupCode(code) && lookupCode(code).thumbnailUrl) || getPlaceholderThumb();
      var thumb = el('img', { src: thumbSrc, alt: code, className: 'shop-cart-thumb', loading: 'lazy' });
      thumb.addEventListener('click', function () { openPreview(thumbSrc, code); });
      head.appendChild(thumb);
      var title = el('div', { className: 'shop-cart-group-cell' });
      setText(title, code);
      head.appendChild(title);
      group.appendChild(head);

      PRINT_SIZES.forEach(function (sz) {
        var qty = state.store.cart[code] && state.store.cart[code].sizes
          ? state.store.cart[code].sizes[sz.id] : 0;
        if (!qty) return;
        var row = el('div', { className: 'shop-totals-row' });
        var size = el('span', { className: 'shop-totals-label' }); setText(size, sz.id);
        var qtyWrap = el('span', { className: 'shop-qty-row' });
        var minus = el('button', { type: 'button', className: 'shop-qty-btn' }); setText(minus, '-');
        var q = el('span', { className: 'shop-qty-display' }); setText(q, String(qty));
        var plus = el('button', { type: 'button', className: 'shop-qty-btn' }); setText(plus, '+');
        qtyWrap.appendChild(minus); qtyWrap.appendChild(q); qtyWrap.appendChild(plus);
        var price = el('span', { className: 'shop-totals-value' }); setText(price, formatMoney(sz.price * qty));
        var rm = el('button', { type: 'button', className: 'shop-cart-remove-btn cart-remove' }); setText(rm, '×');

        minus.addEventListener('click', function () {
          var next = (state.store.cart[code].sizes[sz.id] || 1) - 1;
          if (next < 1) {
            delete state.store.cart[code].sizes[sz.id];
            ensureSelectRowForCode(code, sz.id);
          } else {
            state.store.cart[code].sizes[sz.id] = next;
          }
          if (!Object.keys(state.store.cart[code].sizes).length) delete state.store.cart[code];
          state.store = saveShopStore(state.store);
          render();
        });
        plus.addEventListener('click', function () {
          state.store.cart[code].sizes[sz.id] = (state.store.cart[code].sizes[sz.id] || 0) + 1;
          state.store = saveShopStore(state.store);
          render();
        });
        rm.addEventListener('click', function () {
          delete state.store.cart[code].sizes[sz.id];
          ensureSelectRowForCode(code, sz.id);
          if (!Object.keys(state.store.cart[code].sizes).length) delete state.store.cart[code];
          state.store = saveShopStore(state.store);
          render();
        });

        row.appendChild(size);
        row.appendChild(qtyWrap);
        row.appendChild(price);
        row.appendChild(rm);
        group.appendChild(row);
      });
      cartBody.appendChild(group);
    });
  }

  function ensurePayPalButtons() {
    if (state.paypalReady && !paypalContainer.hasChildNodes()) {
      state.paypalReady = false;
      state.paypalInstance = null;
      state.paypalActions = null;
    }
    if (state.paypalReady || state.paypalLoading) return;
    if (!collectCartRows().length) return;

    state.paypalLoading = true;
    var sdkSrc = 'https://www.paypal.com/sdk/js?client-id='
      + encodeURIComponent(SHOP_CONFIG.paypalClientId)
      + '&currency=' + encodeURIComponent(SHOP_CONFIG.currency);

    loadScript(sdkSrc).then(function () {
      state.paypalLoading = false;
      if (state.paypalReady) return;
      if (typeof window.paypal === 'undefined') {
        renderNotice(paypalContainer, 'PayPal failed to load. Please refresh and try again.', 'error');
        return;
      }

      state.paypalInstance = window.paypal.Buttons({
        onInit: function (data, actions) {
          state.paypalActions = actions;
          syncPayPalInteractivity();
        },
        onClick: function (data, actions) {
          if (!collectCartRows().length) {
            renderNotice(paypalContainer, 'Cart is empty.', 'error');
            return actions.reject();
          }
          if (!checkoutIsValid()) {
            renderNotice(paypalContainer, 'Please complete all required checkout fields before payment.', 'error');
            return actions.reject();
          }
          return actions.resolve();
        },
        createOrder: function (data, actions) {
          var rows = collectCartRows();
          var shippingCountry = countryInput.value.trim();
          var subtotal = calculateSubtotal(rows);
          var shipping = calculateShipping(rows, shippingCountry);
          var total = subtotal + shipping;
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: total.toFixed(2),
                currency_code: String(SHOP_CONFIG.currency || 'EUR').toUpperCase(),
                breakdown: {
                  item_total: { currency_code: String(SHOP_CONFIG.currency || 'EUR').toUpperCase(), value: subtotal.toFixed(2) },
                  shipping:   { currency_code: String(SHOP_CONFIG.currency || 'EUR').toUpperCase(), value: shipping.toFixed(2) }
                }
              },
              items: rows.map(function (item) {
                return {
                  name: item.code + ' (' + item.sizeId + ')',
                  unit_amount: { currency_code: String(SHOP_CONFIG.currency || 'EUR').toUpperCase(), value: Number(item.price).toFixed(2) },
                  quantity: String(item.qty || 1)
                };
              })
            }]
          });
        },
        onApprove: function (data, actions) {
          state.isProcessingPayPal = true;
          setText(paypalOverlay, 'Processing...');
          paypalOverlay.classList.add('is-visible');
          var rowsSnapshot = collectCartRows();
          var addrSnapshot = getAddressData();
          return actions.order.capture().then(function (details) {
            state.isProcessingPayPal = false;
            paypalOverlay.classList.remove('is-visible');
            var pu = details && details.purchase_units && details.purchase_units[0] ? details.purchase_units[0] : null;
            var ship = pu && pu.shipping ? pu.shipping : null;
            var shipAddr = ship && ship.address ? ship.address : null;
            var payer = details && details.payer ? details.payer : null;
            var paypalAddress = {
              name: (ship && ship.name && ship.name.full_name) ? ship.name.full_name : addrSnapshot.name,
              email: (payer && payer.email_address) ? payer.email_address : addrSnapshot.email,
              street: shipAddr ? [shipAddr.address_line_1, shipAddr.address_line_2].filter(Boolean).join(', ') : addrSnapshot.street,
              city: shipAddr && shipAddr.admin_area_2 ? shipAddr.admin_area_2 : addrSnapshot.city,
              postal: shipAddr && shipAddr.postal_code ? shipAddr.postal_code : addrSnapshot.postal,
              country: shipAddr && shipAddr.country_code ? shipAddr.country_code : addrSnapshot.country,
              phone: addrSnapshot.phone,
              notes: addrSnapshot.notes
            };
            var orderId = generateOrderId();
            var confData = {
              orderId: orderId,
              transactionId: details.id,
              name: paypalAddress.name,
              country: paypalAddress.country,
              total: formatMoney(calculateTotal(rowsSnapshot, paypalAddress.country)),
              items: rowsSnapshot.map(function (i) {
                return { code: i.code, sizeId: i.sizeId || '', sizeLabel: i.sizeLabel || '', qty: i.qty, price: i.price || SHOP_CONFIG.printPrice };
              })
            };
            state.store.select = {};
            state.store.cart = {};
            state.store = saveShopStore(state.store);
            state.paypalReady = false;
            state.paypalInstance = null;
            state.paypalActions = null;
            while (paypalContainer.firstChild) paypalContainer.removeChild(paypalContainer.firstChild);
            saveConfirmation(confData);
            renderConfirmation(root, confData, indexData);
            sendEmailReceipt({
              orderId: orderId,
              transactionId: details.id,
              email: paypalAddress.email,
              name: paypalAddress.name,
              address: paypalAddress.street,
              city: paypalAddress.city,
              postal: paypalAddress.postal,
              country: paypalAddress.country,
              phone: paypalAddress.phone || '',
              cart: rowsSnapshot
            });
          }).catch(function (err) {
            state.isProcessingPayPal = false;
            paypalOverlay.classList.remove('is-visible');
            console.error('[shop] Capture failed:', err);
            state.paypalReady = false;
            state.paypalInstance = null;
            state.paypalActions = null;
            while (paypalContainer.firstChild) paypalContainer.removeChild(paypalContainer.firstChild);
            setTimeout(ensurePayPalButtons, 300);
          });
        },
        onError: function (err) {
          state.isProcessingPayPal = false;
          console.error('[shop] PayPal error:', err);
          renderNotice(paypalContainer, 'Payment failed. Please try again.', 'error');
          state.paypalReady = false;
          state.paypalInstance = null;
          state.paypalActions = null;
          setTimeout(function () {
            while (paypalContainer.firstChild) paypalContainer.removeChild(paypalContainer.firstChild);
            ensurePayPalButtons();
          }, 350);
        }
      });

      if (state.paypalInstance.isEligible()) {
        state.paypalReady = true;
        state.paypalInstance.render('#paypal-button-container').then(function () {
          syncPayPalInteractivity();
        });
      } else {
        renderNotice(paypalContainer, 'PayPal is not available in your region.', 'error');
      }
    }).catch(function (err) {
      state.paypalLoading = false;
      console.error('[shop] PayPal SDK load error:', err);
      renderNotice(paypalContainer, 'Could not load payment provider. Check your connection.', 'error');
    });
  }

  function render() {
    state.store = loadShopStore();
    renderSelect();
    renderCart();
    renderTotals();
    validateEmailField(false);
    if (!collectCartRows().length) {
      while (paypalContainer.firstChild) paypalContainer.removeChild(paypalContainer.firstChild);
      state.paypalReady = false;
      state.paypalInstance = null;
      state.paypalActions = null;
      state.isProcessingPayPal = false;
      return;
    }
    ensurePayPalButtons();
    syncPayPalInteractivity();
  }

  clearBtn.addEventListener('click', function () {
    if (!window.confirm('Are you sure you want to clear the cart?')) return;
    state.store.cart = {};
    state.store = saveShopStore(state.store);
    render();
  });

  [emailInput, nameInput, streetInput, cityInput, postalInput, countryInput].forEach(function (inp) {
    inp.addEventListener('input', renderTotals);
    inp.addEventListener('change', renderTotals);
  });
  emailInput.addEventListener('input', function () { validateEmailField(false); });
  emailInput.addEventListener('blur', function () { validateEmailField(true); });

  if (window.__SHOP_STORE_LISTENER__) {
    window.removeEventListener('moto:shop-store-updated', window.__SHOP_STORE_LISTENER__);
  }
  window.__SHOP_STORE_LISTENER__ = function (e) {
    state.store = sanitizeShopStore((e && e.detail && e.detail.store) || loadShopStore());
    if (e && e.detail && e.detail.code) state.highlightCode = e.detail.code;
    render();
    if (state.highlightCode) {
      var row = root.querySelector('[data-select-code="' + state.highlightCode + '"]');
      if (row) {
        row.classList.add('added');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { row.classList.remove('added'); }, 800);
      }
      state.highlightCode = '';
    }
  };
  window.addEventListener('moto:shop-store-updated', window.__SHOP_STORE_LISTENER__);

  // One-time migration from legacy cart storage.
  if (!Object.keys(state.store.select).length && !Object.keys(state.store.cart).length) {
    var legacy = loadCart();
    if (legacy.length) {
      legacy.forEach(function (item) {
        var code = String(item.code || '').toUpperCase();
        if (!code) return;
        if (!state.store.cart[code]) state.store.cart[code] = { thumb: item.thumbnailUrl || '', sizes: {} };
        var sid = String(item.sizeId || 'A3').toUpperCase();
        state.store.cart[code].sizes[sid] = (state.store.cart[code].sizes[sid] || 0) + (parseInt(item.qty, 10) || 1);
      });
      state.store = saveShopStore(state.store);
    }
  }

  render();
}

/* ============================================================
   PAGE INIT
   ============================================================ */
var _shopLoading = false;

function initShopPage() {
  var root = document.getElementById('shop-root');
  if (!root) return;
  if (root.getAttribute('data-shop-mounted') === '1') return;
  if (root.getAttribute('data-shop-mounting') === '1') return;
  if (_shopLoading) return;
  if (!SHOP_CONFIG || !Array.isArray(PRINT_SIZES)) {
    console.error('[shop] Missing configuration (config.js)');
    return;
  }

  destroyPayPal();
  _shopLoading = true;
  root.setAttribute('data-shop-mounting', '1');

  while (root.firstChild) root.removeChild(root.firstChild);
  var loading = el('p', { className: 'shop-loading' });
  setText(loading, 'Loading\u2026');
  root.appendChild(loading);

  /* Reset index cache so new PJAX navigation re-fetches */
  _shopIndex = null;
  _codeMap   = null;

  loadShopIndex().then(function (indexData) {
    _shopLoading = false;
    buildShopUIV5(root, indexData);
    root.setAttribute('data-shop-mounted', '1');
    root.removeAttribute('data-shop-mounting');
  }).catch(function (err) {
    _shopLoading = false;
    console.error('[shop] Failed to initialise:', err);
    while (root.firstChild) root.removeChild(root.firstChild);
    renderNotice(root, 'Shop could not be loaded. Please refresh the page.', 'error');
    root.removeAttribute('data-shop-mounted');
    root.removeAttribute('data-shop-mounting');
  });
}

/* ============================================================
   ENTRY POINT
   ============================================================ */
window.initShopPage = initShopPage;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-page="shop"]')) initShopPage();
  });
} else {
  if (document.querySelector('[data-page="shop"]')) initShopPage();
}













