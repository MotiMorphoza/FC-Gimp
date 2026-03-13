'use strict';
const SITE_HOSTNAME = 'www.motosynteza.art';
const SITE_ORIGIN = 'https://' + SITE_HOSTNAME;
const ROOT_DOMAIN = 'motosynteza.art';
module.exports = {
  SITE_HOSTNAME,
  SITE_ORIGIN,
  ROOT_DOMAIN,
  EMAILJS_ALLOWED_DOMAINS: [
    SITE_HOSTNAME,
    ROOT_DOMAIN,
    'motimorphoza.github.io',
    'localhost',
    '127.0.0.1'
  ]
};

