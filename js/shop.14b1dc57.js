/**
 * shop.js  –  MotoSynteza Shop (v3)
 *
 * Changes from v2:
 *   • PRINT_SIZES config – 5 sizes (A6–A1) each with own EUR price
 *   • Currency changed to EUR
 *   • Size selector UI (button group) generated from PRINT_SIZES config
 *   • Cart items carry sizeId / sizeLabel / price from selected size
 *   • Merge logic keyed on code + sizeId (same photo, different size → separate line)
 *   • Cart table and order summary display size
 *   • Confirmation screen displays size per item
 *   • Intro section shows pricing table generated from config
 *   • All v2 features preserved (ISO countries, full address form,
 *     PayPal debounce/invalidation, sessionStorage confirmation, etc.)
 */

/* ============================================================
   CONFIGURATION
   ============================================================ */
var SHOP_CONFIG = {
  currency:     'EUR',
  storeCountry: 'PL',   // ISO 3166-1 alpha-2 – local shipping tier

  // Fallback unit price for legacy cart items without a size
  printPrice: 20.00,

  shipping: {
    local:         { base: 5.00,  freeAbove: 80.00  },
    international: { base: 18.00, freeAbove: 200.00 }
  },

  paypalClientId:          'ARxRd7iNprUdgAfIialpz8CTQu9H8kMP5RN8rlHlnxtUQEeiURoj4nZrkNX1NqgJDn34wGA0zUMxTvxM',
  emailjsServiceId:        'service_a5a988a',
  emailjsTemplateCustomer: 'template_lnqp67u',
  emailjsTemplateSeller:   'template_wmram69',
  emailjsPublicKey:        '4TVmDiBgB9ej8IlZ2',

  shopIndexUrl: 'shop/index.json'
};

/* ============================================================
   PRINT SIZES  –  edit here to change sizes or prices
   UI is generated entirely from this array; nothing is hardcoded in HTML.
   ============================================================ */
var PRINT_SIZES = [
  { id: 'A6', label: 'A6', dims: '10.5 \u00d7 14.8 cm', price: 2.50  },
  { id: 'A4', label: 'A4', dims: '21 \u00d7 29.7 cm',   price: 10.00 },
  { id: 'A3', label: 'A3', dims: '29.7 \u00d7 42 cm',   price: 20.00 },
  { id: 'A2', label: 'A2', dims: '42 \u00d7 59.4 cm',   price: 40.00 },
  { id: 'A1', label: 'A1', dims: '59.4 \u00d7 84.1 cm', price: 70.00 }
];

var DEFAULT_SIZE_IDX = 2; // A3 pre-selected

/* ============================================================
   COUNTRY DATA  –  ISO 3166-1 (~195 countries)
   ============================================================ */
var COUNTRY_LIST = [
  { code: 'AF', name: 'Afghanistan' },       { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },           { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },            { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },         { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },         { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },        { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },           { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },          { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },           { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },             { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },           { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },          { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },            { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },      { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },        { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },          { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },             { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },          { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },             { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },        { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'HR', name: 'Croatia' },           { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },            { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },           { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },          { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },           { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },       { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },           { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },          { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },              { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },            { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },            { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },           { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },            { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },         { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },     { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },             { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },           { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },             { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },              { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },           { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },             { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },             { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },        { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },          { code: 'KP', name: 'Korea (North)' },
  { code: 'KR', name: 'Korea (South)' },     { code: 'XK', name: 'Kosovo' },
  { code: 'KW', name: 'Kuwait' },            { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },              { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },           { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },           { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },     { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },        { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },            { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },          { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },             { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },        { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },            { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },           { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },          { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },           { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },           { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },             { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },       { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },         { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },           { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },            { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },          { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },            { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },          { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },       { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },          { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },           { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },            { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },       { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },             { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },           { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },        { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },         { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },          { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },           { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },       { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },         { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },          { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },       { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },            { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },          { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },       { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },             { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },           { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },      { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },            { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },     { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },        { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },         { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },             { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
];

// Build lookup: lowercase name → country object, lowercase ISO code → country object
var COUNTRY_MAP = (function () {
  var map = {};
  COUNTRY_LIST.forEach(function (c) {
    map[c.name.toLowerCase()] = c;
    map[c.code.toLowerCase()] = c;
  });
  return map;
}());

/** Returns country object or null. Accepts full name or ISO-2 code. */
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
      console.warn('[shop] localStorage unavailable \u2013 using in-memory cart.');
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
    var raw = Storage.get(CART_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    // Guard: must be an array of objects with a code property
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (i) {
      return i && typeof i.code === 'string';
    });
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try { Storage.set(CART_KEY, JSON.stringify(cart)); }
  catch (e) { console.warn('[shop] Could not persist cart:', e); }
}

/* ============================================================
   CONFIRMATION STORAGE  (sessionStorage)
   ============================================================ */
var CONFIRMATION_KEY = 'moto_confirmation_v1';

function saveConfirmation(data) {
  try { sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(data)); }
  catch (e) {}
}

function loadConfirmation() {
  try {
    var raw = sessionStorage.getItem(CONFIRMATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearConfirmation() {
  try { sessionStorage.removeItem(CONFIRMATION_KEY); }
  catch (e) {}
}

/* ============================================================
   SHOP INDEX
   ============================================================ */
var _shopIndex = null;
var _codeMap   = null;

function getShopIndexUrl() {
  var version = (typeof window.__BUILD_VERSION__ !== 'undefined')
    ? window.__BUILD_VERSION__
    : Date.now();
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
          var data = JSON.parse(xhr.responseText);
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

    xhr.onerror = function () {
      reject(new Error('Network error loading shop/index.json'));
    };

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

function getAllCodes() {
  if (!_codeMap) return [];
  return Object.keys(_codeMap).sort();
}

function lookupCode(code) {
  if (!_codeMap) return null;
  return _codeMap[code] || null;
}

/* ============================================================
   ORDER ID     ORD-YYMMDD-HHMMSS-RAND4
   ============================================================ */
var _sessionOrderIds = {};

function secureRand4() {
  if (window.crypto && window.crypto.getRandomValues) {
    var arr = new Uint16Array(1);
    window.crypto.getRandomValues(arr);
    return 1000 + (arr[0] % 9000);
  }
  return Math.floor(1000 + Math.random() * 9000);
}

function generateOrderId() {
  var now  = new Date();
  var yy   = String(now.getFullYear()).slice(-2);
  var mm   = pad2(now.getMonth() + 1);
  var dd   = pad2(now.getDate());
  var hh   = pad2(now.getHours());
  var mi   = pad2(now.getMinutes());
  var ss   = pad2(now.getSeconds());
  var rand = String(secureRand4());
  var id   = 'ORD-' + yy + mm + dd + '-' + hh + mi + ss + '-' + rand;

  var attempts = 0;
  while (_sessionOrderIds[id] && attempts < 20) {
    rand = String(secureRand4());
    id   = 'ORD-' + yy + mm + dd + '-' + hh + mi + ss + '-' + rand;
    attempts++;
  }
  _sessionOrderIds[id] = true;
  return id;
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }

/* ============================================================
   SHIPPING LOGIC
   ============================================================ */
function calculateShipping(cart, country) {
  if (!cart || cart.length === 0) return 0;
  var tier     = isLocalCountry(country)
    ? SHOP_CONFIG.shipping.local
    : SHOP_CONFIG.shipping.international;
  var subtotal = calculateSubtotal(cart);
  if (subtotal >= tier.freeAbove) return 0;
  return tier.base;
}

function calculateSubtotal(cart) {
  return cart.reduce(function (sum, item) {
    return sum + (item.price || SHOP_CONFIG.printPrice) * (item.qty || 1);
  }, 0);
}

function calculateTotal(cart, country) {
  return calculateSubtotal(cart) + calculateShipping(cart, country);
}

function formatMoney(amount) {
  return SHOP_CONFIG.currency + '\u00a0' + Number(amount).toFixed(2);
}

/* ============================================================
   INPUT SANITISATION
   ============================================================ */
function escapeText(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setText(el, text) {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(document.createTextNode(String(text)));
}

/* ============================================================
   DOM HELPERS
   ============================================================ */
function el(tag, attrs, children) {
  var node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      if (k === 'className') {
        node.className = attrs[k];
      } else if (k === 'for') {
        node.setAttribute('for', attrs[k]);
      } else {
        node.setAttribute(k, attrs[k]);
      }
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      if (typeof c === 'string') { node.appendChild(document.createTextNode(c)); }
      else { node.appendChild(c); }
    });
  }
  return node;
}

/* ============================================================
   DYNAMIC SCRIPT LOADER
   ============================================================ */
function loadScript(src, nonce) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) {
      resolve(); return;
    }
    var s = document.createElement('script');
    s.src = src;
    if (nonce) s.nonce = nonce;
    s.onload  = resolve;
    s.onerror = function () { reject(new Error('Script load failed: ' + src)); };
    document.head.appendChild(s);
  });
}

/* ============================================================
   PAYPAL
   ============================================================ */
var _paypalInstance = null;
var _orderInFlight  = false;

function destroyPayPal() {
  _paypalInstance = null;
  _orderInFlight  = false;
  var container = document.getElementById('paypal-button-container');
  if (container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }
}

/**
 * @param {Array}    cart
 * @param {object}   addressData  { name, email, street, city, postal, country, phone }
 * @param {Function} onSuccess
 */
function renderPayPalButton(cart, addressData, onSuccess) {
  var container = document.getElementById('paypal-button-container');
  if (!container) return;

  destroyPayPal();

  var sdkSrc = 'https://www.paypal.com/sdk/js?client-id='
    + encodeURIComponent(SHOP_CONFIG.paypalClientId)
    + '&currency=' + encodeURIComponent(SHOP_CONFIG.currency);

  loadScript(sdkSrc).then(function () {
    if (typeof window.paypal === 'undefined') {
      renderNotice(container, 'PayPal failed to load. Please refresh and try again.', 'error');
      return;
    }

    _paypalInstance = window.paypal.Buttons({

      createOrder: function (data, actions) {
        if (_orderInFlight) {
          return Promise.reject(new Error('Order already in progress'));
        }
        _orderInFlight = true;

        var total = calculateTotal(cart, addressData.country);

        return actions.order.create({
          purchase_units: [{
            amount: {
              value:         total.toFixed(2),
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
                name: item.code + (item.sizeId ? ' (' + item.sizeId + ')' : ''),
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
            cart:          cart
          });
        });
      },

      onError: function (err) {
        _orderInFlight = false;
        var overlay = document.querySelector('.shop-paypal-overlay');
        if (overlay) overlay.classList.remove('is-visible');
        console.error('[shop] PayPal error:', err);
        var c2 = document.getElementById('paypal-button-container');
        if (c2) renderNotice(c2, 'Payment failed. Please try again.', 'error');
      },

      onCancel: function () {
        _orderInFlight = false;
        var overlay = document.querySelector('.shop-paypal-overlay');
        if (overlay) overlay.classList.remove('is-visible');
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
   EMAILJS
   ============================================================ */
function sendEmailReceipt(opts) {
  var src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';

  loadScript(src).then(function () {
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
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Warsaw'
    });

    var itemsBreakdown = opts.cart.map(function (item) {
      var lineTotal = (item.price || SHOP_CONFIG.printPrice) * item.qty;
      var sizeStr   = item.sizeLabel ? ' [' + item.sizeLabel + ']' : '';
      return item.code + sizeStr + ' \u00d7' + item.qty + ' \u2014 ' + formatMoney(lineTotal);
    }).join('\n');

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
      customer_address: fullAddress,
      items_breakdown:  itemsBreakdown,
      subtotal: formatMoney(subtotal),
      shipping: shipping === 0 ? 'Free' : formatMoney(shipping),
      total:    formatMoney(total)
    };

    // Send to customer
    window.emailjs.send(
      SHOP_CONFIG.emailjsServiceId,
      SHOP_CONFIG.emailjsTemplateCustomer,
      params
    );

    // Send to seller
    window.emailjs.send(
      SHOP_CONFIG.emailjsServiceId,
      SHOP_CONFIG.emailjsTemplateSeller,
      params
    );

  }).catch(function (err) {
    console.error('[shop] EmailJS load failed', err);
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
   CONFIRMATION RENDERER  (standalone, used by buildShopUI)
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

  // ── Detail rows ──────────────────────────────────────────────
  var detailsDiv = el('div', { className: 'shop-confirmation-details' });

  function detailRow(label, value) {
    var row = el('div', { className: 'shop-confirmation-detail-row' });
    var lbl = el('span', { className: 'shop-confirmation-detail-label' });
    setText(lbl, label);
    var val = el('span', { className: 'shop-confirmation-detail-value' });
    setText(val, value);
    row.appendChild(lbl);
    row.appendChild(val);
    detailsDiv.appendChild(row);
  }

  detailRow('Order ID', confData.orderId);
  detailRow('Transaction ID', confData.transactionId);
  if (confData.country) detailRow('Ships to', confData.country);
  section.appendChild(detailsDiv);

  // ── Items ─────────────────────────────────────────────────────
  if (confData.items && confData.items.length) {
    var itemsWrap = el('div', { className: 'shop-confirmation-items' });
    var itemsHdr  = el('div', { className: 'shop-confirmation-items-title' });
    setText(itemsHdr, 'Items Ordered');
    itemsWrap.appendChild(itemsHdr);

    confData.items.forEach(function (item) {
      var row = el('div', { className: 'shop-confirmation-item-row' });

      var codeEl = el('span', { className: 'shop-confirmation-item-code' });
      // Show code + size label in a single cell
      var codeText = item.code + (item.sizeLabel ? '\u00a0\u00b7\u00a0' + item.sizeLabel : '');
      setText(codeEl, codeText);

      var qty = el('span', { className: 'shop-confirmation-item-qty' });
      setText(qty, '\u00d7' + (item.qty || 1));

      var price = el('span', { className: 'shop-confirmation-item-price' });
      setText(price, formatMoney((item.price || SHOP_CONFIG.printPrice) * (item.qty || 1)));

      row.appendChild(codeEl);
      row.appendChild(qty);
      row.appendChild(price);
      itemsWrap.appendChild(row);
    });

    section.appendChild(itemsWrap);
  }

  // ── Total ─────────────────────────────────────────────────────
  if (confData.total) {
    var totalP = el('p', { className: 'shop-confirmation-total' });
    setText(totalP, 'Total charged: ' + confData.total);
    section.appendChild(totalP);
  }

  // ── Message ───────────────────────────────────────────────────
  var msg = el('p', { className: 'shop-notice shop-notice--success' });
  setText(msg,
    'Your order has been received. A receipt has been sent to your email address. ' +
    'Prints are typically processed and dispatched within 3\u20135 business days.'
  );
  section.appendChild(msg);

  // ── Restart ───────────────────────────────────────────────────
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
   UI RENDERING
   ============================================================ */
function buildShopUI(root, indexData) {
  while (root.firstChild) root.removeChild(root.firstChild);

  // Restore confirmation from sessionStorage after PJAX re-entry or page refresh
  var storedConf = loadConfirmation();
  if (storedConf) {
    renderConfirmation(root, storedConf, indexData);
    return;
  }

  var cart     = loadCart();
  var quantity = 1;

  // ── Intro section ─────────────────────────────────────────────
  var introSection = el('section', { className: 'shop-intro' });

  var introHdr = el('h2', { className: 'shop-section-title' });
  setText(introHdr, 'Fine Art Prints');
  introSection.appendChild(introHdr);

  var introP1 = el('p', { className: 'shop-intro-para' });
  setText(introP1,
    'Archival pigment prints on premium fine art paper. ' +
    'Each print ships flat in protective packaging, ready to frame.'
  );
  introSection.appendChild(introP1);

  // Pricing table – generated from PRINT_SIZES config
  var pricingTable = el('div', { className: 'shop-intro-pricing' });
  PRINT_SIZES.forEach(function (size) {
    var row      = el('div', { className: 'shop-intro-pricing-row' });
    var szLabel  = el('span', { className: 'shop-intro-pricing-size' });
    setText(szLabel, size.label);
    var szDims   = el('span', { className: 'shop-intro-pricing-dims' });
    setText(szDims, size.dims);
    var szPrice  = el('span', { className: 'shop-intro-pricing-price' });
    setText(szPrice, formatMoney(size.price));
    row.appendChild(szLabel);
    row.appendChild(szDims);
    row.appendChild(szPrice);
    pricingTable.appendChild(row);
  });
  introSection.appendChild(pricingTable);

  var introShipping = el('p', { className: 'shop-intro-para' });
  setText(introShipping,
    'Shipping: ' +
    formatMoney(SHOP_CONFIG.shipping.local.base) + ' local' +
    ' (free over ' + formatMoney(SHOP_CONFIG.shipping.local.freeAbove) + ')' +
    ' \u00b7 ' +
    formatMoney(SHOP_CONFIG.shipping.international.base) + ' international' +
    ' (free over ' + formatMoney(SHOP_CONFIG.shipping.international.freeAbove) + ').'
  );
  introSection.appendChild(introShipping);

  var introP3 = el('p', { className: 'shop-intro-para' });
  setText(introP3,
    'To order: browse the gallery, note the code shown beneath each photograph, then enter it below.'
  );
  introSection.appendChild(introP3);

  root.appendChild(introSection);

  // ── Add-to-cart section ───────────────────────────────────────
  var addSection = el('section', { className: 'shop-add-section' });

  var addTitle = el('h2', { className: 'shop-section-title' });
  setText(addTitle, 'Add Print');
  addSection.appendChild(addTitle);

  var datalistId = 'shop-codes-list';

  // Code field
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
    var opt = document.createElement('option');
    opt.value = code;
    datalist.appendChild(opt);
  });

  var codeMsg = el('span', {
    id: 'shop-code-msg', className: 'shop-validation-msg',
    role: 'status', 'aria-live': 'polite'
  });

  codeField.appendChild(codeLabel);
  codeField.appendChild(codeInput);
  codeField.appendChild(datalist);
  codeField.appendChild(codeMsg);

  // ── Size selector ─────────────────────────────────────────────
  var selectedSizeIdx = DEFAULT_SIZE_IDX;

  var sizeField = el('div', { className: 'shop-field' });
  var sizeLabelEl = el('label', { className: 'shop-label', id: 'size-label' });
  setText(sizeLabelEl, 'Print Size');
  sizeField.appendChild(sizeLabelEl);

  var sizeSelector = el('div', {
    className: 'shop-size-selector',
    role: 'radiogroup',
    'aria-labelledby': 'size-label'
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

    var btnLabel = el('span', { className: 'shop-size-btn-label' });
    setText(btnLabel, size.label);
    var btnDims  = el('span', { className: 'shop-size-btn-dims' });
    setText(btnDims, size.dims);
    var btnPrice = el('span', { className: 'shop-size-btn-price' });
    setText(btnPrice, formatMoney(size.price));

    btn.appendChild(btnLabel);
    btn.appendChild(btnDims);
    btn.appendChild(btnPrice);

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

  // Quantity
  var qtyField   = el('div', { className: 'shop-field' });
  var qtyLabel   = el('label', { className: 'shop-label', id: 'qty-label' });
  setText(qtyLabel, 'Quantity');

  var qtyRow     = el('div', { className: 'shop-qty-row', role: 'group', 'aria-labelledby': 'qty-label' });
  var qtyMinus   = el('button', { type: 'button', className: 'shop-qty-btn', 'aria-label': 'Decrease quantity' });
  setText(qtyMinus, '\u2212');
  var qtyDisplay = el('div', { className: 'shop-qty-display', 'aria-live': 'polite', 'aria-atomic': 'true' });
  setText(qtyDisplay, '1');
  var qtyPlus    = el('button', { type: 'button', className: 'shop-qty-btn', 'aria-label': 'Increase quantity' });
  setText(qtyPlus, '+');

  qtyRow.appendChild(qtyMinus);
  qtyRow.appendChild(qtyDisplay);
  qtyRow.appendChild(qtyPlus);
  qtyField.appendChild(qtyLabel);
  qtyField.appendChild(qtyRow);

  var addBtn = el('button', { type: 'button', className: 'shop-add-btn', id: 'shop-add-btn' });
  setText(addBtn, 'Add to Cart');

  var addForm = el('div', { className: 'shop-add-form', role: 'form', 'aria-label': 'Add print to cart' });
  addForm.appendChild(codeField);
  addForm.appendChild(sizeField);   // size selector between code and quantity
  addForm.appendChild(qtyField);
  addForm.appendChild(addBtn);
  addSection.appendChild(addForm);
  root.appendChild(addSection);

  // ── Cart section ──────────────────────────────────────────────
  var cartSection = el('section', { className: 'shop-cart' });
  var cartTitle   = el('h2', { className: 'shop-section-title' });
  setText(cartTitle, 'Cart');
  cartSection.appendChild(cartTitle);

  var cartBody = el('div', { className: 'shop-cart-body' });
  cartSection.appendChild(cartBody);

  // Clear cart controls (created once, re-appended each renderCart)
  var clearCartActions  = el('div', { className: 'shop-clear-cart-actions' });
  var clearBtn          = el('button', { type: 'button', className: 'shop-clear-cart-btn' });
  setText(clearBtn, 'Clear cart');
  var clearConfirmRow   = el('div', { className: 'shop-clear-confirm' });
  clearConfirmRow.style.display = 'none';
  var clearConfirmText  = el('span', { className: 'shop-clear-confirm-text' });
  setText(clearConfirmText, 'Remove all items?');
  var clearYesBtn       = el('button', { type: 'button', className: 'shop-clear-yes-btn' });
  setText(clearYesBtn, 'Yes, clear');
  var clearNoBtn        = el('button', { type: 'button', className: 'shop-clear-no-btn' });
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

  // ── Checkout section ──────────────────────────────────────────
  var checkoutSection = el('section', { className: 'shop-checkout', id: 'shop-checkout' });
  var checkoutTitle   = el('h2', { className: 'shop-section-title' });
  setText(checkoutTitle, 'Checkout');
  checkoutSection.appendChild(checkoutTitle);
  checkoutSection.style.display = 'none';

  var checkoutForm = el('div', { className: 'shop-checkout-form' });

  // Helper: build a labelled input field
  function makeField(id, labelText, type, placeholder, describedBy, autocomplete) {
    var wrap  = el('div', { className: 'shop-field' });
    var lbl   = el('label', { className: 'shop-label', 'for': id });
    setText(lbl, labelText);
    var attrs = {
      type: type, id: id, className: 'shop-input',
      placeholder: placeholder,
      'aria-describedby': describedBy
    };
    if (autocomplete) attrs.autocomplete = autocomplete;
    var inp   = el('input', attrs);
    var msg   = el('span', { id: describedBy, className: 'shop-validation-msg', role: 'status', 'aria-live': 'polite' });
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    wrap.appendChild(msg);
    return { wrap: wrap, inp: inp, msg: msg };
  }

  // Contact
  var emailF   = makeField('shop-email',  'Email Address',    'email', 'your@email.com',        'shop-email-msg',   'email');
  checkoutForm.appendChild(emailF.wrap);
  var emailInput = emailF.inp;
  var emailMsg   = emailF.msg;

  // Shipping address heading
  var addrHeading = el('div', { className: 'shop-address-heading' });
  setText(addrHeading, 'Shipping Address');
  checkoutForm.appendChild(addrHeading);

  var nameF    = makeField('shop-name',   'Full Name',        'text', 'Full name',              'shop-name-msg',    'name');
  checkoutForm.appendChild(nameF.wrap);
  var nameInput = nameF.inp;
  var nameMsg   = nameF.msg;

  var streetF  = makeField('shop-street', 'Street Address',   'text', 'Street and number',      'shop-street-msg',  'address-line1');
  checkoutForm.appendChild(streetF.wrap);
  var streetInput = streetF.inp;
  var streetMsg   = streetF.msg;

  var cityF    = makeField('shop-city',   'City',             'text', 'City',                   'shop-city-msg',    'address-level2');
  checkoutForm.appendChild(cityF.wrap);
  var cityInput = cityF.inp;
  var cityMsg   = cityF.msg;

  var postalF  = makeField('shop-postal', 'Postal Code',      'text', 'Postal / ZIP code',      'shop-postal-msg',  'postal-code');
  checkoutForm.appendChild(postalF.wrap);
  var postalInput = postalF.inp;
  var postalMsg   = postalF.msg;

  // Country with full datalist
  var countryField      = el('div', { className: 'shop-field' });
  var countryLabel      = el('label', { className: 'shop-label', 'for': 'shop-country' });
  setText(countryLabel, 'Country');
  var countriesListId   = 'shop-countries-list';
  var countryInput      = el('input', {
    type: 'text', id: 'shop-country', className: 'shop-input',
    list: countriesListId, autocomplete: 'country-name', placeholder: 'e.g. Poland',
    'aria-describedby': 'shop-country-msg'
  });
  var countriesDatalist = el('datalist', { id: countriesListId });
  COUNTRY_LIST.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.name;
    countriesDatalist.appendChild(opt);
  });
  var countryMsg = el('span', { id: 'shop-country-msg', className: 'shop-validation-msg', role: 'status', 'aria-live': 'polite' });
  countryField.appendChild(countryLabel);
  countryField.appendChild(countryInput);
  countryField.appendChild(countriesDatalist);
  countryField.appendChild(countryMsg);
  checkoutForm.appendChild(countryField);

  // Phone (optional)
  var phoneF   = makeField('shop-phone',  'Phone (optional)', 'tel',   '+1 555 000 0000',       'shop-phone-msg',   'tel');
  checkoutForm.appendChild(phoneF.wrap);
  var phoneInput = phoneF.inp;

  checkoutSection.appendChild(checkoutForm);

  // ── Order summary block ───────────────────────────────────────
  var orderSummaryDiv = el('div', { className: 'shop-order-summary' });
  checkoutSection.appendChild(orderSummaryDiv);

  // ── PayPal separator + wrapper ────────────────────────────────
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

  // ── Confirmation section (hidden until payment) ───────────────
  var confirmSection = el('section', { className: 'shop-confirmation', id: 'shop-confirmation' });
  confirmSection.style.display = 'none';
  root.appendChild(confirmSection);

  // ── STATE HELPERS ─────────────────────────────────────────────

  function getEmail()   { return emailInput.value.trim(); }
  function getCountry() { return countryInput.value.trim(); }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

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
    if (cart.length === 0)              return false;
    if (!isValidEmail(getEmail()))      return false;
    if (!nameInput.value.trim())        return false;
    if (!streetInput.value.trim())      return false;
    if (!cityInput.value.trim())        return false;
    if (!postalInput.value.trim())      return false;
    var country = getCountry();
    if (!country)                       return false;
    if (!lookupCountry(country))        return false;
    return true;
  }

  // ── ORDER SUMMARY ─────────────────────────────────────────────

  function renderOrderSummary() {
    while (orderSummaryDiv.firstChild) orderSummaryDiv.removeChild(orderSummaryDiv.firstChild);
    if (cart.length === 0) return;

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

      var info = el('div', { className: 'shop-summary-info' });

      var codeSpan = el('span', { className: 'shop-summary-code' });
      setText(codeSpan, item.code);
      info.appendChild(codeSpan);

      if (item.sizeLabel) {
        var sizeSpan = el('span', { className: 'shop-summary-size' });
        setText(sizeSpan, item.sizeLabel);
        info.appendChild(sizeSpan);
      }

      var qtySpan = el('span', { className: 'shop-summary-qty' });
      setText(qtySpan, '\u00d7' + (item.qty || 1));
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

    var totals = el('div', { className: 'shop-summary-totals' });

    function summaryRow(label, valueText, extraClass) {
      var row = el('div', { className: 'shop-summary-row' + (extraClass ? ' ' + extraClass : '') });
      var l   = el('span', {}); setText(l, label);
      var v   = el('span', {}); setText(v, valueText);
      row.appendChild(l); row.appendChild(v);
      totals.appendChild(row);
    }

    summaryRow('Subtotal', formatMoney(subtotal));
    summaryRow('Shipping', shipping === 0 ? 'Free' : formatMoney(shipping));
    summaryRow('Total',    formatMoney(total), 'is-total');

    orderSummaryDiv.appendChild(totals);
  }

  // ── CART RENDERING ────────────────────────────────────────────

  function renderCart() {
    while (cartBody.firstChild) cartBody.removeChild(cartBody.firstChild);

    if (cart.length === 0) {
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

      var tdCode = el('td', {});
      var codeSpan = el('span', { className: 'shop-cart-code' });
      setText(codeSpan, item.code);
      tdCode.appendChild(codeSpan);

      var tdSize = el('td', { className: 'shop-cart-size-cell' });
      var sizeSpan = el('span', { className: 'shop-cart-size' });
      setText(sizeSpan, item.sizeLabel || item.sizeId || '\u2014');
      tdSize.appendChild(sizeSpan);

      var tdThumb = el('td', {});
      if (item.thumbnailUrl) {
        var img = el('img', {
          src: item.thumbnailUrl, alt: item.code,
          className: 'shop-cart-thumb', loading: 'lazy'
        });
        tdThumb.appendChild(img);
      }

      var tdQty = el('td', {});
      setText(tdQty, String(item.qty));

      var tdPrice = el('td', {});
      setText(tdPrice, formatMoney((item.price || SHOP_CONFIG.printPrice) * item.qty));

      var tdRemove   = el('td', {});
      var removeBtn  = el('button', {
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

      tr.appendChild(tdCode);
      tr.appendChild(tdSize);
      tr.appendChild(tdThumb);
      tr.appendChild(tdQty);
      tr.appendChild(tdPrice);
      tr.appendChild(tdRemove);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    cartBody.appendChild(table);

    // Totals
    var totalsDiv = el('div', { className: 'shop-cart-totals' });
    var country   = getCountry();
    var subtotal  = calculateSubtotal(cart);
    var shipping  = calculateShipping(cart, country);
    var total     = subtotal + shipping;

    function cartTotalRow(label, valueText, extraClass) {
      var row = el('div', { className: 'shop-totals-row' + (extraClass ? ' ' + extraClass : '') });
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

    // Clear cart controls
    clearConfirmRow.style.display = 'none';
    clearBtn.style.display = '';
    cartBody.appendChild(clearCartActions);

    // Show checkout
    checkoutSection.style.display = '';

    // Update order summary (reflects any cart or country change)
    renderOrderSummary();
  }

  // ── PAYPAL REFRESH ────────────────────────────────────────────

  var paypalRenderTimer = null;

  function schedulePayPalRefresh() {
    destroyPayPal();               // immediately invalidate stale button
    clearTimeout(paypalRenderTimer);
    paypalRenderTimer = setTimeout(function () {
      if (!checkoutIsValid()) return;
      renderPayPalButton(cart, collectAddressData(), onPaymentSuccess);
    }, 800);
  }

  // ── COUNTRY VALIDATION HELPER ─────────────────────────────────

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
      var tier  = found.code === SHOP_CONFIG.storeCountry
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

  // ── EVENT HANDLERS ────────────────────────────────────────────

  qtyMinus.addEventListener('click', function () {
    if (quantity > 1) quantity--;
    setText(qtyDisplay, String(quantity));
  });

  qtyPlus.addEventListener('click', function () {
    if (quantity < 99) quantity++;
    setText(qtyDisplay, String(quantity));
  });

  codeInput.addEventListener('input', function () {
    var val   = codeInput.value.trim().toUpperCase();
    if (!val) {
      setText(codeMsg, '');
      codeInput.removeAttribute('aria-invalid');
      return;
    }
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

    // Merge key: same photo + same size = same cart line
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].code === rawCode && cart[i].sizeId === selectedSize.id) {
        existing = cart[i];
        break;
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
        price:        selectedSize.price,      // price driven by config, not hardcoded
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

  // Email – validate on blur, trigger PayPal refresh on input
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

  // Required text fields – blur validation + PayPal refresh on input
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

  // Country – full validation on both input and blur
  countryInput.addEventListener('input', function () {
    applyCountryValidation(false);
    renderCart();       // re-renders totals + order summary with updated shipping tier
    schedulePayPalRefresh();
  });

  countryInput.addEventListener('blur', function () {
    applyCountryValidation(true);
    renderCart();
  });

  // ── ON PAYMENT SUCCESS ────────────────────────────────────────

  function onPaymentSuccess(result) {
    var confData = {
      orderId:       result.orderId,
      transactionId: result.transactionId,
      name:          result.address.name,
      country:       result.address.country,
      total:         formatMoney(calculateTotal(cart, result.address.country)),
      items:         cart.map(function (i) {
        return {
          code:       i.code,
          sizeId:     i.sizeId    || '',
          sizeLabel:  i.sizeLabel || '',
          qty:        i.qty,
          price:      i.price || SHOP_CONFIG.printPrice
        };
      })
    };

    saveConfirmation(confData);
    renderConfirmation(root, confData, indexData);
  }

  // ── Initial render ────────────────────────────────────────────
  renderCart();
}

/* ============================================================
   PAGE INIT  –  PJAX SAFE / IDEMPOTENT
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

  // Force fresh index fetch on PJAX re-entry
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
