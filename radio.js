/*
 * Радіо для Lampa — українські та світові станції
 * Версія 1.0 · оптимізовано для iPhone (touch) · працює і на ТВ (пульт)
 *
 * Можливості:
 * - Українські + зарубіжні топ-станції
 * - Фільтр за жанрами і за країною
 * - Пошук за назвою
 * - Обране (зберігається в пам'яті Lampa)
 * - Міні-плеєр знизу: пауза / далі / попередня / наступна
 * - Медіа-сесія iOS (керування з екрана блокування)
 * - Автоматичне оновлення списку з Radio Browser (з кешем на 12 год)
 * - Запасний вбудований список, якщо інтернет-API недоступний
 */
(function () {
  'use strict';

  if (window.__radio_ua_plugin__) return;
  window.__radio_ua_plugin__ = true;

  var PLUGIN_ID = 'radio_ua';
  var CACHE_KEY = 'radio_ua_cache_v1';
  var FAV_KEY = 'radio_ua_fav_v1';
  var CACHE_TTL = 12 * 60 * 60 * 1000; // 12 годин

  /* ---------------------------------------------------------------- */
  /* 1. ДАНІ                                                          */
  /* ---------------------------------------------------------------- */

  var FALLBACK = [
    { name: 'Радіо Промінь',          genre: 'Поп',         country: 'UA', url: 'https://radio.ukr.radio/radio-promin' },
    { name: 'Українське радіо',       genre: 'Новини',      country: 'UA', url: 'https://radio.ukr.radio/ur1' },
    { name: 'Радіо Культура',         genre: 'Класика',     country: 'UA', url: 'https://radio.ukr.radio/kultura' },
    { name: 'Kiss FM Ukraine',        genre: 'Поп',         country: 'UA', url: 'https://online.kissfm.ua/KissFM' },
    { name: 'Radio ROKS',             genre: 'Рок',         country: 'UA', url: 'https://online.radioroks.ua/RadioROKS' },
    { name: 'Хіт FM',                 genre: 'Поп',         country: 'UA', url: 'https://online.hitfm.ua/HitFM' },
    { name: 'BBC Radio 1',            genre: 'Поп',         country: 'GB', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one' },
    { name: 'BBC Radio 4',            genre: 'Новини',      country: 'GB', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm' },
    { name: 'NTS Radio 1',            genre: 'Електроніка', country: 'GB', url: 'https://stream-relay-geo.ntslive.net/stream' },
    { name: 'Jazz24',                 genre: 'Джаз',        country: 'US', url: 'https://live.wostreaming.net/direct/ppm-jazz24aac-ibc1' },
    { name: 'SomaFM Groove Salad',    genre: 'Електроніка', country: 'US', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { name: 'SomaFM Indie Pop Rocks', genre: 'Рок',         country: 'US', url: 'https://ice1.somafm.com/indiepop-128-mp3' }
  ];

  var GENRES = [
    { tag: 'pop',        label: 'Поп' },
    { tag: 'rock',       label: 'Рок' },
    { tag: 'dance',      label: 'Денс' },
    { tag: 'electronic', label: 'Електроніка' },
    { tag: 'jazz',       label: 'Джаз' },
    { tag: 'classical',  label: 'Класика' },
    { tag: 'hip hop',    label: 'Хіп-хоп' },
    { tag: 'news',       label: 'Новини' },
    { tag: 'chill',      label: 'Чілаут' },
    { tag: 'oldies',     label: 'Ретро' }
  ];

  var COUNTRIES = [
    { code: 'ALL',   label: 'Всі' },
    { code: 'UA',    label: '🇺🇦 Україна' },
    { code: 'WORLD', label: '🌍 Світ' }
  ];

  var WORLD_CODES = ['GB', 'US', 'DE', 'FR', 'PL', 'IT'];

  /* ---------------------------------------------------------------- */
  /* 2. СХОВИЩЕ                                                       */
  /* ---------------------------------------------------------------- */

  function storeGet(key) {
    try {
      var raw = Lampa.Storage.get(key, '');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return null;
    }
  }

  function storeSet(key, val) {
    try {
      Lampa.Storage.set(key, JSON.stringify(val));
    } catch (e) {}
  }

  function getFav() {
    var f = storeGet(FAV_KEY);
    return Array.isArray(f) ? f : [];
  }
  function isFav(url) { return getFav().indexOf(url) >= 0; }
  function toggleFav(url) {
    var f = getFav();
    var i = f.indexOf(url);
    if (i >= 0) f.splice(i, 1); else f.push(url);
    storeSet(FAV_KEY, f);
    return i < 0;
  }

  /* ---------------------------------------------------------------- */
  /* 3. RADIO BROWSER API                                             */
  /* ---------------------------------------------------------------- */

  var API_HOSTS = [
    'https://de1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info'
  ];

  function apiGet(path, cb, hostIdx) {
    hostIdx = hostIdx || 0;
    if (hostIdx >= API_HOSTS.length) return cb(null);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_HOSTS[hostIdx] + path, true);
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { cb(JSON.parse(xhr.responseText)); }
        catch (e) { apiGet(path, cb, hostIdx + 1); }
      } else apiGet(path, cb, hostIdx + 1);
    };
    xhr.onerror = xhr.ontimeout = function () { apiGet(path, cb, hostIdx + 1); };
    xhr.send();
  }

  function tagToLabel(tags) {
    var t = (tags || '').toLowerCase();
    for (var i = 0; i < GENRES.length; i++) {
      if (t.indexOf(GENRES[i].tag) >= 0) return GENRES[i].label;
    }
    if (t.indexOf('talk') >= 0) return 'Новини';
    if (t.indexOf('electro') >= 0 || t.indexOf('house') >= 0 || t.indexOf('techno') >= 0) return 'Електроніка';
    return 'Різне';
  }

  function normalize(list, forcedCountry) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (s) {
      var url = s.url_resolved || s.url;
      if (!url || !s.name) return;
      // iPhone/Safari: потрібен https, інакше змішаний контент блокується
      if (url.indexOf('https://') !== 0) return;
      var key = url.toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      out.push({
        name: String(s.name).replace(/\s+/g, ' ').trim(),
        genre: tagToLabel(s.tags),
        country: forcedCountry || s.countrycode || '',
        url: url,
        logo: s.favicon && s.favicon.indexOf('https://') === 0 ? s.favicon : ''
      });
    });
    return out;
  }

  function fetchStations(cb) {
    var cached = storeGet(CACHE_KEY);
    if (cached && cached.time && (Date.now() - cached.time) < CACHE_TTL && cached.list && cached.list.length) {
      return cb(cached.list);
    }

    var result = [];
    var pending = 1 + WORLD_CODES.length;

    function done() {
      pending--;
      if (pending > 0) return;
      result.sort(function (a, b) {
        if (a.country === 'UA' && b.country !== 'UA') return -1;
        if (b.country === 'UA' && a.country !== 'UA') return 1;
        return 0;
      });
      if (result.length < 5) return cb(FALLBACK);
      storeSet(CACHE_KEY, { time: Date.now(), list: result });
      cb(result);
    }

    var q = '&order=clickcount&reverse=true&hidebroken=true&limit=';
    apiGet('/json/stations/search?countrycode=UA' + q + '80', function (data) {
      result = result.concat(normalize(data, 'UA'));
      done();
    });
    WORLD_CODES.forEach(function (code) {
      apiGet('/json/stations/search?countrycode=' + code + q + '25',​​​​​​​​​​​​​​​​
