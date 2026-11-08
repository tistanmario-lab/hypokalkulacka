/*
  consent.js — súhlas s meraním návštevnosti na mariotistan.sk

  - Google Analytics 4 sa nenačíta (žiadny gtag.js, žiadne cookies _ga), kým návštevník nedá súhlas.
  - Voľba sa ukladá do localStorage pod kľúčom mt_cookie_consent (voľba, verzia, čas).
  - Voľbu možno kedykoľvek zmeniť cez prvok s atribútom data-cookie-settings
    (odkaz „Nastavenia cookies“ v pätičke) alebo cez window.openCookieSettings().
  - Odvolanie súhlasu zmaže cookies _ga* a vypne ďalšie meranie.
*/
(function () {
  'use strict';

  var GA_ID = 'G-YF1E1SN7J8';
  var KEY = 'mt_cookie_consent';
  var VERSION = 1;
  var POLICY_URL = '/ochrana-udajov.html#cookies';

  var gaLoaded = false;
  var box = null;
  var lastFocus = null;
  var openedByUser = false;

  // Zástupca gtag, aby prípadné volania na stránke nespadli. Bez súhlasu sa nič neodosiela,
  // lebo samotný gtag.js sa vôbec nenačíta.
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  function readChoice() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      return v && v.v === VERSION && typeof v.analytics === 'boolean' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function saveChoice(analytics) {
    var v = { v: VERSION, analytics: !!analytics, ts: new Date().toISOString() };
    try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    return v;
  }

  function loadGA() {
    window['ga-disable-' + GA_ID] = false;
    if (gaLoaded) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    gaLoaded = true;
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function deleteGACookies() {
    var names = document.cookie.split(';')
      .map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid' || n === '_gat'; });
    if (!names.length) return;
    var parts = location.hostname.split('.');
    var domains = ['', location.hostname];
    for (var i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    names.forEach(function (n) {
      domains.forEach(function (d) {
        document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function disableGA() {
    window['ga-disable-' + GA_ID] = true;
    if (gaLoaded) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    deleteGACookies();
  }

  function apply(choice) {
    if (choice && choice.analytics) loadGA();
    else disableGA();
  }

  var CSS =
    '.mtc{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:760px;margin:0 auto;' +
      'background:#003049;color:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.25);' +
      'font-family:inherit;font-size:14px;line-height:1.55;text-align:left}' +
    '.mtc[hidden]{display:none}' +
    '.mtc-inner{padding:20px 22px}' +
    '.mtc-title{margin:0 0 6px;font-size:15px;font-weight:600;color:#fff}' +
    '.mtc-text{margin:0;color:rgba(255,255,255,.85)}' +
    '.mtc-text a{color:#fff;text-decoration:underline;text-underline-offset:2px}' +
    '.mtc-state{margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.85)}' +
    '.mtc-btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}' +
    '.mtc-btn{flex:1 1 160px;min-height:44px;padding:10px 18px;border:2px solid #fff;border-radius:12px;' +
      'background:#fff;color:#003049;font:inherit;font-size:14px;font-weight:600;cursor:pointer;' +
      'transition:background-color .15s ease,border-color .15s ease}' +
    '.mtc-btn:hover{background:#ECEDED;border-color:#ECEDED}' +
    '.mtc-btn:focus-visible,.mtc-text a:focus-visible{outline:3px solid #D98393;outline-offset:2px}' +
    '@media (max-width:480px){.mtc{left:8px;right:8px;bottom:8px}.mtc-inner{padding:16px}}' +
    '@media print{.mtc{display:none!important}}';

  function ensureStyle() {
    if (document.getElementById('mt-consent-style')) return;
    var st = document.createElement('style');
    st.id = 'mt-consent-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function build() {
    ensureStyle();
    box = document.createElement('div');
    box.id = 'mt-consent';
    box.className = 'mtc';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'mtc-title');
    box.setAttribute('aria-describedby', 'mtc-text');
    box.innerHTML =
      '<div class="mtc-inner">' +
        '<p class="mtc-title" id="mtc-title">Cookies a meranie návštevnosti</p>' +
        '<p class="mtc-text" id="mtc-text">Návštevnosť webu meriame cez Google Analytics, ale len s vaším súhlasom. ' +
          'Bez neho sa analytika nespustí a web funguje rovnako. Voľbu môžete kedykoľvek zmeniť cez odkaz ' +
          '„Nastavenia cookies“ v pätičke. <a href="' + POLICY_URL + '">Viac informácií</a></p>' +
        '<p class="mtc-state" id="mtc-state" hidden></p>' +
        '<div class="mtc-btns">' +
          '<button type="button" class="mtc-btn" data-mtc="accept">Prijať analytiku</button>' +
          '<button type="button" class="mtc-btn" data-mtc="reject">Odmietnuť</button>' +
        '</div>' +
      '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-mtc]') : null;
      if (b) choose(b.getAttribute('data-mtc') === 'accept');
    });
    box.addEventListener('keydown', function (e) {
      if (!openedByUser) return;
      if (e.key === 'Escape' && readChoice()) { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') trapFocus(e);
    });
    // Na začiatok stránky, aby sa naň pri prechode klávesom Tab dalo dostať ako prvé.
    document.body.insertBefore(box, document.body.firstChild);
  }

  function trapFocus(e) {
    var items = box.querySelectorAll('a[href], button');
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(byUser) {
    if (!box) build();
    openedByUser = !!byUser;
    var c = readChoice();
    var state = box.querySelector('#mtc-state');
    if (c) {
      state.textContent = 'Aktuálne: meranie návštevnosti je ' + (c.analytics ? 'povolené.' : 'odmietnuté.');
      state.hidden = false;
    } else {
      state.hidden = true;
    }
    box.setAttribute('aria-modal', openedByUser ? 'true' : 'false');
    box.hidden = false;
    if (openedByUser) {
      lastFocus = document.activeElement;
      var btn = box.querySelector('[data-mtc="accept"]');
      if (btn) btn.focus();
    }
  }

  function close() {
    if (!box) return;
    box.hidden = true;
    if (openedByUser && lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus(); } catch (e) {}
    }
    openedByUser = false;
  }

  function choose(analytics) {
    apply(saveChoice(analytics));
    close();
  }

  window.openCookieSettings = function () { open(true); return false; };

  function init() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('[data-cookie-settings]') : null;
      if (!link) return;
      e.preventDefault();
      open(true);
    });
    var choice = readChoice();
    if (choice) {
      apply(choice);
    } else {
      // Bez voľby: analytika sa nespustí a staré cookies _ga (z čias pred súhlasom) sa zmažú.
      deleteGACookies();
      open(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
