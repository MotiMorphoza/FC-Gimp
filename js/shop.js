/* shop.js  –  MotoSynteza Shop (v4) */

/* ============================================================
   CONFIGURATION
   ============================================================ */
var SHOP_CONFIG = {
  currency:     'EUR',
  storeCountry: 'PL',

  printPrice: 20.00,   // fallback for legacy items without explicit price

  shipping: {
    local:         { base: 7.00,  freeAbove: 77.00  },
    international: { base: 27.00, freeAbove: 222.00 }
  },

  paypalClientId:          'ARxRd7iNprUdgAfIialpz8CTQu9H8kMP5RN8rlHlnxtUQEeiURoj4nZrkNX1NqgJDn34wGA0zUMxTvxM',
  emailjsServiceId:        'service_a5a988a',
  emailjsTemplateCustomer: 'template_lnqp67u',
  emailjsTemplateSeller:   'template_wmram69',
  emailjsPublicKey:        '4TVmDiBgB9ej8IlZ2',

  shopIndexUrl: 'shop/index.json'
};

/* ============================================================
   PRINT SIZES
   ============================================================ */
var PRINT_SIZES = [
  { id: 'A6', label: 'A6', dims: '10.5 \u00d7 14.8 cm', price:  2.50 },
  { id: 'A4', label: 'A4', dims: '21 \u00d7 29.7 cm',   price: 10.00 },
  { id: 'A3', label: 'A3', dims: '29.7 \u00d7 42 cm',   price: 20.00 },
  { id: 'A2', label: 'A2', dims: '42 \u00d7 59.4 cm',   price: 40.00 },
  { id: 'A1', label: 'A1', dims: '59.4 \u00d7 84.1 cm', price: 70.00 }
];

var DEFAULT_SIZE_IDX = 2; // A3

/* ============================================================
   COUNTRY DATA  –  ISO 3166-1 (195 entries)
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
      console.warn('[shop] localStorage unavailable – using in-memory cart.');
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
}

/* ============================================================
   CONFIRMATION STORAGE  (sessionStorage – survives refresh)
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

/**
 * Fully tear down any existing PayPal render.
 * Safe to call multiple times.
 */
function destroyPayPal() {
  _paypalInstance  = null;
  _orderInFlight   = false;
  _paymentApproved = false;
  var container = document.getElementById('paypal-button-container');
  if (container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }
}

/**
 * Render PayPal buttons.
 *
 * @param {Array}    cart
 * @param {object}   addressData  { name, email, street, city, postal, country, phone }
 * @param {Function} onSuccess    – called after capture
 * @param {Function} onCancelled  – called after user cancel / error; shop can re-render
 */
function renderPayPalButton(cart, addressData, onSuccess, onCancelled) {
  var container = document.getElementById('paypal-button-container');
  if (!container) return;

  // Always destroy before re-render – prevents duplicate button injection
  destroyPayPal();

  var sdkSrc = 'https://www.paypal.com/sdk/js?client-id='
    + encodeURIComponent(SHOP_CONFIG.paypalClientId)
    + '&currency=' + encodeURIComponent(SHOP_CONFIG.currency);

  loadScript(sdkSrc).then(function () {
    if (typeof window.paypal === 'undefined') {
      renderNotice(container, 'PayPal failed to load. Please refresh and try again.', 'error');
      return;
    }

    // Bail if container was removed during async load (e.g. PJAX navigation)
    if (!document.getElementById('paypal-button-container')) return;

    /* ── shared cancel / error recovery ───────────────────────── */
    function restoreAfterCancel(delayMs) {
      _orderInFlight   = false;
      _paymentApproved = false;
      var overlay = document.querySelector('.shop-paypal-overlay');
      if (overlay) overlay.classList.remove('is-visible');
      if (typeof onCancelled === 'function') {
        setTimeout(onCancelled, delayMs || 400);
      }
    }

    _paypalInstance = window.paypal.Buttons({

      createOrder: function (data, actions) {
        if (_orderInFlight) return Promise.reject(new Error('Order already in progress'));
        _orderInFlight   = true;
        _paymentApproved = false;

        return actions.order.create({
          purchase_units: [{
            amount: {
              value:         calculateTotal(cart, addressData.country).toFixed(2),
              currency_code: SHOP_CONFIG.currency,
              breakdown: {
                item_total: {
                  currency_code: SHOP_CONFIG.currency,
                  value: calculateSubtotal(cart).toFixed(2)
                },
                shipping: {
                  currency_code: SHOP_CONFIG.currency,
                  value: calculateShipping(cart, addressData.country).toFixed(2)
                }
              }
            },
            items: cart.map(function (item) {
              return {
                name:        item.code + (item.sizeId ? ' (' + item.sizeId + ')' : ''),
                unit_amount: {
                  currency_code: SHOP_CONFIG.currency,
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

      /* ── User closed PayPal popup without completing payment ── */
      onCancel: function () {
        restoreAfterCancel(400);
      },

      /* ── Fires after popup closes (both approve and cancel).
            Only act when payment was NOT approved. ── */
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
      _paypalInstance.render('#paypal-button-container');
    } else {
      renderNotice(container, 'PayPal is not available in your region.', 'error');
    }

  }).catch(function (err) {
    console.error('[shop] PayPal SDK load error:', err);
    renderNotice(container, 'Could not load payment provider. Check your connection.', 'error');
  });
}

/* ============================================================
   EMAILJS  –  full size + price breakdown per item
   ============================================================ */
function sendEmailReceipt(opts) {
  var sdkSrc = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';

  loadScript(sdkSrc).then(function () {
    if (typeof window.emailjs === 'undefined') {
      console.error('[shop] emailjs SDK not available');
      return;
    }

    window.emailjs.init(SHOP_CONFIG.emailjsPublicKey);

    var subtotal = calculateSubtotal(opts.cart);
    var shipping = calculateShipping(opts.cart, opts.country);
    var total    = subtotal + shipping;

    var now = new Date();
    var orderDate = now.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Europe/Warsaw'
    });

    /* ── Per-item text breakdown (one line per item) ── */
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

    /* ── Structured JSON for richer template rendering ── */
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
      items_breakdown:  itemsBreakdown,   // plain-text one line per item
      items_json:       itemsJson,        // structured JSON array
      item_count:       String(opts.cart.length),
      subtotal:         formatMoney(subtotal),
      shipping:         shipping === 0 ? 'Free' : formatMoney(shipping),
      total:            formatMoney(total)
    };

    window.emailjs.send(
      SHOP_CONFIG.emailjsServiceId,
      SHOP_CONFIG.emailjsTemplateCustomer,
      params
    );
    window.emailjs.send(
      SHOP_CONFIG.emailjsServiceId,
      SHOP_CONFIG.emailjsTemplateSeller,
      params
    );

  }).catch(function (err) {
    console.error('[shop] EmailJS load failed:', err);
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
  setText(restart, 'Place Another Order');
  restart.addEventListener('click', function () {
    clearConfirmation();
    buildShopUI(root, indexData);
  });
  section.appendChild(restart);

  root.appendChild(section);
}

/* ============================================================
   UI  –  buildShopUI
   ============================================================ */
function buildShopUI(root, indexData) {
  while (root.firstChild) root.removeChild(root.firstChild);

  /* Show confirmation screen if session storage has one */
  var storedConf = loadConfirmation();
  if (storedConf) { renderConfirmation(root, storedConf, indexData); return; }

  var cart     = loadCart();
  var quantity = 1;

  /* ── Intro ────────────────────────────────────────────────── */
  var introSection = el('section', { className: 'shop-intro' });
  var introHdr     = el('h2', { className: 'shop-section-title' });
  setText(introHdr, 'Fine Art Prints');
  introSection.appendChild(introHdr);

  var introP1 = el('p', { className: 'shop-intro-para' });
  setText(introP1,
    'Prints on premium art paper. Ships in protective packaging, ready to frame.'
  );
  introSection.appendChild(introP1);

  var pricingTable = el('div', { className: 'shop-intro-pricing' });
  PRINT_SIZES.forEach(function (size) {
    var row = el('div', { className: 'shop-intro-pricing-row' });
    var s   = el('span', { className: 'shop-intro-pricing-size' });  setText(s, size.label);
    var d   = el('span', { className: 'shop-intro-pricing-dims' });  setText(d, size.dims);
    var p   = el('span', { className: 'shop-intro-pricing-price' }); setText(p, formatMoney(size.price));
    row.appendChild(s); row.appendChild(d); row.appendChild(p);
    pricingTable.appendChild(row);
  });
  introSection.appendChild(pricingTable);

  var introShipping = el('p', { className: 'shop-intro-para' });
  setText(introShipping,
    'Shipping: ' + formatMoney(SHOP_CONFIG.shipping.local.base) +
    ' local (free over ' + formatMoney(SHOP_CONFIG.shipping.local.freeAbove) + ')' +
    ' \u00b7 ' + formatMoney(SHOP_CONFIG.shipping.international.base) +
    ' international (free over ' + formatMoney(SHOP_CONFIG.shipping.international.freeAbove) + ').'
  );
  introSection.appendChild(introShipping);

  var introP3 = el('p', { className: 'shop-intro-para' });
  setText(introP3,
    'To order: Browse galleries. Note the code beneath each photograph. Enter it below.'
  );
  introSection.appendChild(introP3);

  root.appendChild(introSection);

  /* ── Add-to-cart ──────────────────────────────────────────── */
  var addSection = el('section', { className: 'shop-add-section' });
  var addTitle   = el('h2', { className: 'shop-section-title' });
  setText(addTitle, 'Add Print');
  addSection.appendChild(addTitle);

  var datalistId = 'shop-codes-list';

  var codeField = el('div', { className: 'shop-field' });
  var codeLabel = el('label', { className: 'shop-label', 'for': 'shop-code-input' });
  setText(codeLabel, 'Print Code');
  var codeInput = el('input', {
    type: 'text', id: 'shop-code-input', className: 'shop-input',
    list: datalistId, autocomplete: 'off', placeholder: 'e.g. UU-025',
    'aria-describedby': 'shop-code-msg'
  });
  var datalist = el('datalist', { id: datalistId });
  getAllCodes().forEach(function (code) {
    var opt = document.createElement('option'); opt.value = code; datalist.appendChild(opt);
  });
  var codeMsg = el('span', {
    id: 'shop-code-msg', className: 'shop-validation-msg', role: 'status', 'aria-live': 'polite'
  });
  codeField.appendChild(codeLabel);
  codeField.appendChild(codeInput);
  codeField.appendChild(datalist);
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
  root.appendChild(addSection);

  /* ── Cart ─────────────────────────────────────────────────── */
  var cartSection = el('section', { className: 'shop-cart' });
  var cartTitle   = el('h2', { className: 'shop-section-title' });
  setText(cartTitle, 'Cart');
  cartSection.appendChild(cartTitle);
  var cartBody = el('div', { className: 'shop-cart-body' });
  cartSection.appendChild(cartBody);

  /* Clear-cart controls – created once; re-appended by renderCart */
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
    saveCart(cart);
    destroyPayPal();
    renderCart();
  });

  root.appendChild(cartSection);

  /* ── Checkout ─────────────────────────────────────────────── */
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

  checkoutSection.appendChild(checkoutForm);

  var orderSummaryDiv = el('div', { className: 'shop-order-summary' });
  checkoutSection.appendChild(orderSummaryDiv);

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

  /* ── State helpers ────────────────────────────────────────── */
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
      phone:   phoneInput.value.trim()
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

  /* ── Order summary ────────────────────────────────────────── */
  function renderOrderSummary() {
    while (orderSummaryDiv.firstChild) orderSummaryDiv.removeChild(orderSummaryDiv.firstChild);
    if (!cart.length) return;

    var hdr = el('div', { className: 'shop-summary-title' });
    setText(hdr, 'Order Summary');
    orderSummaryDiv.appendChild(hdr);

    var itemsList = el('div', { className: 'shop-summary-items' });
    cart.forEach(function (item) {
      var row = el('div', { className: 'shop-summary-item' });

      if (item.thumbnailUrl) {
        var thumb = el('img', {
          src: item.thumbnailUrl, alt: item.code,
          className: 'shop-summary-thumb', loading: 'lazy'
        });
        row.appendChild(thumb);
      }

      var info     = el('div', { className: 'shop-summary-info' });
      var codeSpan = el('span', { className: 'shop-summary-code' }); setText(codeSpan, item.code);
      info.appendChild(codeSpan);

      if (item.sizeLabel) {
        var sizeSpan = el('span', { className: 'shop-summary-size' }); setText(sizeSpan, item.sizeLabel);
        info.appendChild(sizeSpan);
      }

      var qtySpan = el('span', { className: 'shop-summary-qty' }); setText(qtySpan, '\u00d7' + (item.qty || 1));
      info.appendChild(qtySpan);
      row.appendChild(info);

      var priceSpan = el('span', { className: 'shop-summary-price' });
      setText(priceSpan, formatMoney((item.price || SHOP_CONFIG.printPrice) * (item.qty || 1)));
      row.appendChild(priceSpan);

      itemsList.appendChild(row);
    });
    orderSummaryDiv.appendChild(itemsList);

    var country  = getCountry();
    var subtotal = calculateSubtotal(cart);
    var shipping = calculateShipping(cart, country);
    var total    = subtotal + shipping;
    var totals   = el('div', { className: 'shop-summary-totals' });

    function summaryRow(label, valueText, extraClass) {
      var row = el('div', { className: 'shop-summary-row' + (extraClass ? ' ' + extraClass : '') });
      var l = el('span', {}); setText(l, label);
      var v = el('span', {}); setText(v, valueText);
      row.appendChild(l); row.appendChild(v);
      totals.appendChild(row);
    }

    summaryRow('Subtotal', formatMoney(subtotal));
    summaryRow('Shipping', shipping === 0 ? 'Free' : formatMoney(shipping));
    summaryRow('Total',    formatMoney(total), 'is-total');

    orderSummaryDiv.appendChild(totals);
  }

  /* ── Cart render ──────────────────────────────────────────── */
  function renderCart() {
    while (cartBody.firstChild) cartBody.removeChild(cartBody.firstChild);

    if (!cart.length) {
      var empty = el('p', { className: 'shop-cart-empty' });
      setText(empty, 'Your cart is empty.');
      cartBody.appendChild(empty);
      checkoutSection.style.display = 'none';
      destroyPayPal();
      return;
    }

    var table = el('table', { className: 'shop-cart-table' });
    var thead  = el('thead', {});
    var hRow   = el('tr', {});
    ['Code', 'Size', 'Image', 'Qty', 'Price', ''].forEach(function (h) {
      var th = el('th', {}); setText(th, h); hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    table.appendChild(thead);

    var tbody = el('tbody', {});
    cart.forEach(function (item, idx) {
      var tr = el('tr', {});

      var tdCode   = el('td', {});
      var codeSpan = el('span', { className: 'shop-cart-code' }); setText(codeSpan, item.code);
      tdCode.appendChild(codeSpan);

      var tdSize   = el('td', { className: 'shop-cart-size-cell' });
      var sizeSpan = el('span', { className: 'shop-cart-size' });
      setText(sizeSpan, item.sizeLabel || item.sizeId || '\u2014');
      tdSize.appendChild(sizeSpan);

      var tdThumb = el('td', {});
      if (item.thumbnailUrl) {
        var imgEl = el('img', {
          src: item.thumbnailUrl, alt: item.code,
          className: 'shop-cart-thumb', loading: 'lazy'
        });
        tdThumb.appendChild(imgEl);
      }

      var tdQty   = el('td', {}); setText(tdQty, String(item.qty));
      var tdPrice = el('td', {});
      setText(tdPrice, formatMoney((item.price || SHOP_CONFIG.printPrice) * item.qty));

      var tdRemove  = el('td', {});
      var removeBtn = el('button', {
        type: 'button', className: 'shop-cart-remove-btn',
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
      });
      tdRemove.appendChild(removeBtn);

      tr.appendChild(tdCode); tr.appendChild(tdSize); tr.appendChild(tdThumb);
      tr.appendChild(tdQty);  tr.appendChild(tdPrice); tr.appendChild(tdRemove);
      tbody.appendChild(tr);
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

    /* CLEAR CART – always visible when cart has items */
    clearConfirmRow.style.display = 'none';
    clearBtn.style.display        = '';
    cartBody.appendChild(clearCartActions);

    checkoutSection.style.display = '';
    renderOrderSummary();
  }

  /* ── PayPal refresh with automatic cancel recovery ─────────── */
  var paypalRenderTimer = null;

  function schedulePayPalRefresh() {
    destroyPayPal();
    clearTimeout(paypalRenderTimer);
    paypalRenderTimer = setTimeout(function () {
      if (!checkoutIsValid()) return;
      renderPayPalButton(
        cart,
        collectAddressData(),
        onPaymentSuccess,
        /* onCancelled – auto-restore PayPal buttons after cancel / error */
        function () {
          if (checkoutIsValid()) schedulePayPalRefresh();
        }
      );
    }, 800);
  }

  /* ── Country validation ───────────────────────────────────── */
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

  /* ── Input event handlers ─────────────────────────────────── */
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

    var selectedSize = PRINT_SIZES[selectedSizeIdx];
    var existing     = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].code === rawCode && cart[i].sizeId === selectedSize.id) {
        existing = cart[i]; break;
      }
    }

    if (existing) {
      existing.qty = Math.min(99, existing.qty + quantity);
    } else {
      cart.push({
        code:         rawCode,
        sizeId:       selectedSize.id,
        sizeLabel:    selectedSize.label + ' \u2013 ' + selectedSize.dims,
        qty:          quantity,
        price:        selectedSize.price,
        thumbnailUrl: imageInfo.thumbnailUrl
      });
    }

    saveCart(cart);
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
  });

  /* ── Payment success ──────────────────────────────────────── */
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
   PAGE INIT
   ============================================================ */
var _shopLoading = false;

function initShopPage() {
  var root = document.getElementById('shop-root');
  if (!root) return;
  if (_shopLoading) return;

  destroyPayPal();
  _shopLoading = true;

  while (root.firstChild) root.removeChild(root.firstChild);
  var loading = el('p', { className: 'shop-loading' });
  setText(loading, 'Loading\u2026');
  root.appendChild(loading);

  /* Reset index cache so new PJAX navigation re-fetches */
  _shopIndex = null;
  _codeMap   = null;

  loadShopIndex().then(function (indexData) {
    _shopLoading = false;
    buildShopUI(root, indexData);
  }).catch(function (err) {
    _shopLoading = false;
    console.error('[shop] Failed to initialise:', err);
    while (root.firstChild) root.removeChild(root.firstChild);
    renderNotice(root, 'Shop could not be loaded. Please refresh the page.', 'error');
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
