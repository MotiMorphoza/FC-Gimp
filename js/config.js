/* config.js – MotoSynteza Central Configuration
 *
 * Single source of truth for all site-wide constants.
 * Loaded before shop.js, layout.js, or any script that needs these values.
 * ─────────────────────────────────────────────────────────────────────────── */

/* ============================================================
   SHOP CONFIGURATION
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
  emailjsAllowedDomains:   ['motimorphoza.github.io', 'localhost', '127.0.0.1'],

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

if (typeof window !== 'undefined') {
  window.SHOP_CONFIG = SHOP_CONFIG;
  window.PRINT_SIZES = PRINT_SIZES;
  window.DEFAULT_SIZE_IDX = DEFAULT_SIZE_IDX;
}
