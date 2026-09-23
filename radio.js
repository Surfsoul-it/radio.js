/*!

- Радіо для Lampa — українські та світові станції
- Версія 1.0 · оптимізовано для iPhone (touch) · працює і на ТВ (пульт)
- 
- Можливості:
- - Українські + зарубіжні топ-станції
- - Фільтр за жанрами і за країною
- - Пошук за назвою
- - Обране (зберігається в пам’яті Lampa)
- - Міні-плеєр знизу: пауза / далі / попередня / наступна
- - Медіа-сесія iOS (керування з екрана блокування)
- - Автоматичне оновлення списку з Radio Browser (з кешем на 12 год)
- - Запасний вбудований список, якщо інтернет-API недоступний
    */
    (function () {
    ‘use strict’;

if (window.**radio_ua_plugin**) return;
window.**radio_ua_plugin** = true;

var PLUGIN_ID = ‘radio_ua’;
var CACHE_KEY = ‘radio_ua_cache_v1’;
var FAV_KEY = ‘radio_ua_fav_v1’;
var CACHE_TTL = 12 * 60 * 60 * 1000; // 12 годин

/* —————————————————————— */
/* 1. ДАНІ                                                            */
/* —————————————————————— */

// Запасний список. Якщо API недоступне — плагін все одно працює.
var FALLBACK = [
{ name: ‘Радіо Промінь’, genre: ‘Поп’, country: ‘UA’, url: ‘https://radio.ukr.radio/radio-promin’ },
{ name: ‘Українське радіо’, genre: ‘Новини’, country: ‘UA’, url: ‘https://radio.ukr.radio/ur1’ },
{ name: ‘Радіо Культура’, genre: ‘Класика’, country: ‘UA’, url: ‘https://radio.ukr.radio/kultura’ },
{ name: ‘Kiss FM Ukraine’, genre: ‘Поп’, country: ‘UA’, url: ‘https://online.kissfm.ua/KissFM’ },
{ name: ‘Radio ROKS’, genre: ‘Рок’, country: ‘UA’, url: ‘https://online.radioroks.ua/RadioROKS’ },
{ name: ‘Хіт FM’, genre: ‘Поп’, country: ‘UA’, url: ‘https://online.hitfm.ua/HitFM’ },
{ name: ‘BBC Radio 1’, genre: ‘Поп’, country: ‘GB’, url: ‘https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one’ },
{ name: ‘BBC Radio 4’, genre: ‘Новини’, country: ‘GB’, url: ‘https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm’ },
{ name: ‘NTS Radio 1’, genre: ‘Електроніка’, country: ‘GB’, url: ‘https://stream-relay-geo.ntslive.net/stream’ },
{ name: ‘Jazz24’, genre: ‘Джаз’, country: ‘US’, url: ‘https://live.wostreaming.net/direct/ppm-jazz24aac-ibc1’ },
{ name: ‘SomaFM Groove Salad’, genre: ‘Електроніка’, country: ‘US’, url: ‘https://ice1.somafm.com/groovesalad-128-mp3’ },
{ name: ‘SomaFM Indie Pop Rocks’, genre: ‘Рок’, country: ‘US’, url: ‘https://ice1.somafm.com/indiepop-128-mp3’ }
];

// Жанри: ключ = тег у Radio Browser, значення = назва в інтерфейсі
var GENRES = [
{ tag: ‘pop’, label: ‘Поп’ },
{ tag: ‘rock’, label: ‘Рок’ },
{ tag: ‘dance’, label: ‘Денс’ },
{ tag: ‘electronic’, label: ‘Електроніка’ },
{ tag: ‘jazz’, label: ‘Джаз’ },
{ tag: ‘classical’, label: ‘Класика’ },
{ tag: ‘hip hop’, label: ‘Хіп-хоп’ },
{ tag: ‘news’, label: ‘Новини’ },
{ tag: ‘chill’, label: ‘Чілаут’ },
{ tag: ‘oldies’, label: ‘Ретро’ }
];

var COUNTRIES = [
{ code: ‘ALL’, label: ‘Всі’ },
{ code: ‘UA’, label: ‘🇺🇦 Україна’ },
{ code: ‘WORLD’, label: ‘🌍 Світ’ }
];

// Країни, з яких беремо «світові» топи
var WORLD_CODES = [‘GB’, ‘US’, ‘DE’, ‘FR’, ‘PL’, ‘IT’];

/* —————————————————————— */
/* 2. СХОВИЩЕ                                                         */
/* —————————————————————— */

function store(key, val) {
try {
if (typeof val === ‘undefined’) {
var raw = Lampa.Storage.get(key, ‘’);
if (!raw) return null;
return typeof raw === ‘string’ ? JSON.parse(raw) : raw;
}
Lampa.Storage.set(key, JSON.stringify(val));
} catch (e) {
return null;
}
}

function getFav() { return store(FAV_KEY) || []; }
function isFav(url) { return getFav().indexOf(url) >= 0; }
function toggleFav(url) {
var f = getFav();
var i = f.indexOf(url);
if (i >= 0) f.splice(i, 1); else f.push(url);
store(FAV_KEY, f);
return i < 0;
}

/* —————————————————————— */
/* 3. RADIO BROWSER API                                               */
/* —————————————————————— */

var API_HOSTS = [
‘https://de1.api.radio-browser.info’,
‘https://at1.api.radio-browser.info’,
‘https://nl1.api.radio-browser.info’
];

function apiGet(path, cb, hostIdx) {
hostIdx = hostIdx || 0;
if (hostIdx >= API_HOSTS.length) return cb(null);
var xhr = new XMLHttpRequest();
xhr.open(‘GET’, API_HOSTS[hostIdx] + path, true);
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
var t = (tags || ‘’).toLowerCase();
for (var i = 0; i < GENRES.length; i++) {
if (t.indexOf(GENRES[i].tag) >= 0) return GENRES[i].label;
}
if (t.indexOf(‘talk’) >= 0) return ‘Новини’;
if (t.indexOf(‘electro’) >= 0 || t.indexOf(‘house’) >= 0 || t.indexOf(‘techno’) >= 0) return ‘Електроніка’;
return ‘Різне’;
}

function normalize(list, forcedCountry) {
var seen = {};
var out = [];
(list || []).forEach(function (s) {
var url = s.url_resolved || s.url;
if (!url || !s.name) return;
// iPhone/Safari: потрібен https, інакше змішаний контент блокується
if (url.indexOf(‘https://’) !== 0) return;
// ігноруємо HLS-плейлисти без підтримки та явно погані формати
var key = url.toLowerCase();
if (seen[key]) return;
seen[key] = 1;
out.push({
name: String(s.name).replace(/\s+/g, ’ ’).trim(),
genre: tagToLabel(s.tags),
country: forcedCountry || s.countrycode || ‘’,
url: url,
logo: s.favicon && s.favicon.indexOf(‘https://’) === 0 ? s.favicon : ‘’
});
});
return out;
}

function fetchStations(cb) {
var cached = store(CACHE_KEY);
if (cached && cached.time && (Date.now() - cached.time) < CACHE_TTL && cached.list && cached.list.length) {
return cb(cached.list);
}

```
var result = [];
var pending = 1 + WORLD_CODES.length;

function done() {
  pending--;
  if (pending > 0) return;
  // Українські — першими
  result.sort(function (a, b) {
    if (a.country === 'UA' && b.country !== 'UA') return -1;
    if (b.country === 'UA' && a.country !== 'UA') return 1;
    return 0;
  });
  if (result.length < 5) return cb(FALLBACK);
  store(CACHE_KEY, { time: Date.now(), list: result });
  cb(result);
}

var q = '&order=clickcount&reverse=true&hidebroken=true&limit=';
apiGet('/json/stations/search?countrycode=UA' + q + '80', function (data) {
  result = result.concat(normalize(data, 'UA'));
  done();
});
WORLD_CODES.forEach(function (code) {
  apiGet('/json/stations/search?countrycode=' + code + q + '25', function (data) {
    result = result.concat(normalize(data, code));
    done();
  });
});
```

}

/* —————————————————————— */
/* 4. ПЛЕЄР (окремий <audio>, щоб працювало як фонове радіо на iOS)   */
/* —————————————————————— */

var Player = (function () {
var audio = new Audio();
audio.preload = ‘none’;
audio.setAttribute(‘playsinline’, ‘’);
var queue = [];
var index = -1;
var listeners = [];

```
function emit() {
  listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
}

function setMediaSession(st) {
  if (!('mediaSession' in navigator) || !st) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: st.name,
      artist: st.genre + ' · Радіо',
      artwork: st.logo ? [{ src: st.logo, sizes: '96x96', type: 'image/png' }] : []
    });
    navigator.mediaSession.setActionHandler('play', function () { Player.toggle(); });
    navigator.mediaSession.setActionHandler('pause', function () { Player.toggle(); });
    navigator.mediaSession.setActionHandler('previoustrack', function () { Player.prev(); });
    navigator.mediaSession.setActionHandler('nexttrack', function () { Player.next(); });
  } catch (e) {}
}

audio.addEventListener('playing', emit);
audio.addEventListener('pause', emit);
audio.addEventListener('waiting', emit);
audio.addEventListener('error', function () {
  Lampa.Noty.show('Станція недоступна, пробую наступну…');
  setTimeout(function () { Player.next(); }, 800);
});

var api = {
  onChange: function (fn) { listeners.push(fn); },
  current: function () { return queue[index] || null; },
  isPlaying: function () { return !audio.paused && !audio.ended; },
  setQueue: function (list) { queue = list.slice(); },
  play: function (st) {
    var i = -1;
    for (var k = 0; k < queue.length; k++) if (queue[k].url === st.url) { i = k; break; }
    if (i < 0) { queue.push(st); i = queue.length - 1; }
    index = i;
    audio.src = st.url;
    var p = audio.play();
    if (p && p.catch) p.catch(function () { Lampa.Noty.show('Натисніть ▶ ще раз для запуску'); });
    setMediaSession(st);
    emit();
  },
  toggle: function () {
    if (!queue[index]) return;
    if (audio.paused) {
      // для live-потоку краще перепідключитися, ніж відновлювати буфер
      audio.src = queue[index].url;
      audio.play();
    } else audio.pause();
  },
  next: function () {
    if (!queue.length) return;
    index = (index + 1) % queue.length;
    api.play(queue[index]);
  },
  prev: function () {
    if (!queue.length) return;
    index = (index - 1 + queue.length) % queue.length;
    api.play(queue[index]);
  },
  stop: function () { audio.pause(); audio.removeAttribute('src'); audio.load(); index = -1; emit(); }
};
return api;
```

})();

/* —————————————————————— */
/* 5. СТИЛІ                                                           */
/* —————————————————————— */

var CSS = ‘’ +
‘.rua{padding:1em 1em 7em;-webkit-tap-highlight-color:transparent}’ +
‘.rua__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9em}’ +
‘.rua__title{font-size:1.9em;font-weight:700;letter-spacing:-.02em}’ +
‘.rua__count{opacity:.5;font-size:1em}’ +
‘.rua__search{width:100%;box-sizing:border-box;padding:.85em 1.1em;border:0;border-radius:1em;background:rgba(255,255,255,.09);color:#fff;font-size:1.05em;outline:none;margin-bottom:.9em}’ +
‘.rua__search::placeholder{color:rgba(255,255,255,.4)}’ +
‘.rua__row{display:flex;gap:.55em;overflow-x:auto;padding:.1em 0 .8em;-webkit-overflow-scrolling:touch;scrollbar-width:none}’ +
‘.rua__row::-webkit-scrollbar{display:none}’ +
‘.rua__chip{flex:0 0 auto;padding:.55em 1.15em;border-radius:2em;background:rgba(255,255,255,.09);font-size:1em;white-space:nowrap;cursor:pointer;transition:background .15s,transform .1s}’ +
‘.rua__chip:active{transform:scale(.95)}’ +
‘.rua__chip.active{background:#fff;color:#000;font-weight:600}’ +
‘.rua__chip.focus{box-shadow:0 0 0 .18em #fff}’ +
‘.rua__chip–country.active{background:linear-gradient(135deg,#0057b7,#ffd700);color:#fff}’ +
‘.rua__list{display:grid;grid-template-columns:repeat(auto-fill,minmax(19em,1fr));gap:.8em;margin-top:.4em}’ +
‘.rua__card{display:flex;align-items:center;gap:.9em;padding:.8em;border-radius:1.1em;background:rgba(255,255,255,.06);cursor:pointer;transition:background .15s,transform .12s}’ +
‘.rua__card:active{transform:scale(.98)}’ +
‘.rua__card.focus{background:rgba(255,255,255,.18);transform:scale(1.03)}’ +
‘.rua__card.playing{background:rgba(0,120,255,.28)}’ +
‘.rua__logo{flex:0 0 3.4em;width:3.4em;height:3.4em;border-radius:.9em;background:linear-gradient(135deg,#0057b7,#ffd700);display:flex;align-items:center;justify-content:center;font-size:1.4em;font-weight:700;overflow:hidden}’ +
‘.rua__logo img{width:100%;height:100%;object-fit:cover;background:#222}’ +
‘.rua__info{flex:1;min-width:0}’ +
‘.rua__name{font-size:1.15em;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}’ +
‘.rua__meta{opacity:.55;font-size:.9em;margin-top:.25em}’ +
‘.rua__fav{flex:0 0 auto;font-size:1.5em;padding:.2em .35em;opacity:.35;cursor:pointer}’ +
‘.rua__fav.on{opacity:1;color:#ffd700}’ +
‘.rua__empty{opacity:.55;text-align:center;padding:3em 1em;font-size:1.1em}’ +
‘.rua__loader{text-align:center;padding:3em;opacity:.6}’ +
‘.rua-mini{position:fixed;left:.7em;right:.7em;bottom:calc(.7em + env(safe-area-inset-bottom));z-index:9999;display:none;align-items:center;gap:.8em;padding:.75em .9em;border-radius:1.2em;background:rgba(30,30,34,.94);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 .5em 2em rgba(0,0,0,.6)}’ +
‘.rua-mini.show{display:flex}’ +
‘.rua-mini__eq{flex:0 0 1.5em;display:flex;align-items:flex-end;gap:2px;height:1.3em}’ +
‘.rua-mini__eq i{display:block;width:.28em;background:#4da3ff;border-radius:1px;height:30%}’ +
‘.rua-mini.on .rua-mini__eq i{animation:rua-eq .9s ease-in-out infinite}’ +
‘.rua-mini.on .rua-mini__eq i:nth-child(2){animation-delay:.2s}’ +
‘.rua-mini.on .rua-mini__eq i:nth-child(3){animation-delay:.4s}’ +
‘@keyframes rua-eq{0%,100%{height:25%}50%{height:100%}}’ +
‘.rua-mini__txt{flex:1;min-width:0}’ +
‘.rua-mini__name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}’ +
‘.rua-mini__sub{opacity:.55;font-size:.85em}’ +
‘.rua-mini__btn{flex:0 0 auto;width:2.6em;height:2.6em;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2em;background:rgba(255,255,255,.1);cursor:pointer}’ +
‘.rua-mini__btn:active{transform:scale(.9)}’ +
‘.rua-mini__btn–main{background:#fff;color:#000}’ +
‘.rua-mini__btn.focus{box-shadow:0 0 0 .18em #fff}’;

function injectCSS() {
if (document.getElementById(‘rua-css’)) return;
var st = document.createElement(‘style’);
st.id = ‘rua-css’;
st.textContent = CSS;
document.head.appendChild(st);
}

/* —————————————————————— */
/* 6. МІНІ-ПЛЕЄР                                                      */
/* —————————————————————— */

var mini;
function buildMini() {
if (mini) return;
mini = $(
‘<div class="rua-mini">’ +
‘<div class="rua-mini__eq"><i></i><i></i><i></i></div>’ +
‘<div class="rua-mini__txt"><div class="rua-mini__name"></div><div class="rua-mini__sub"></div></div>’ +
‘<div class="rua-mini__btn selector" data-a="prev">⏮</div>’ +
‘<div class="rua-mini__btn rua-mini__btn--main selector" data-a="toggle">⏸</div>’ +
‘<div class="rua-mini__btn selector" data-a="next">⏭</div>’ +
‘<div class="rua-mini__btn selector" data-a="stop">✕</div>’ +
‘</div>’
);
mini.find(’[data-a]’).each(function () {
var el = $(this);
var act = el.data(‘a’);
var fire = function () { Player[act](); };
el.on(‘click hover:enter’, function (e) { e.preventDefault(); fire(); });
});
$(‘body’).append(mini);

```
Player.onChange(function () {
  var st = Player.current();
  if (!st) { mini.removeClass('show on'); return; }
  mini.addClass('show').toggleClass('on', Player.isPlaying());
  mini.find('.rua-mini__name').text(st.name);
  mini.find('.rua-mini__sub').text(st.genre + ' · ' + (Player.isPlaying() ? 'в ефірі' : 'пауза'));
  mini.find('[data-a=toggle]').text(Player.isPlaying() ? '⏸' : '▶');
  $('.rua__card').each(function () {
    $(this).toggleClass('playing', $(this).data('url') === st.url);
  });
});
```

}

/* —————————————————————— */
/* 7. КОМПОНЕНТ                                                       */
/* —————————————————————— */

function RadioComponent() {
var scroll = new Lampa.Scroll({ mask: true, over: true });
var html = $(’<div class="rua"></div>’);
var head = $(’<div class="rua__head"><div class="rua__title">Радіо</div><div class="rua__count"></div></div>’);
var search = $(’<input class="rua__search" type="search" placeholder="Пошук станції…" autocomplete="off">’);
var countryRow = $(’<div class="rua__row"></div>’);
var genreRow = $(’<div class="rua__row"></div>’);
var list = $(’<div class="rua__list"></div>’);

```
var stations = [];
var f_country = 'ALL';
var f_genre = 'Всі';
var f_query = '';
var last;
var self = this;

/* ---- фільтрація ---- */
function filtered() {
  var favs = getFav();
  var q = f_query.toLowerCase();
  return stations.filter(function (s) {
    if (f_country === 'UA' && s.country !== 'UA') return false;
    if (f_country === 'WORLD' && s.country === 'UA') return false;
    if (f_genre === '⭐ Обране') { if (favs.indexOf(s.url) < 0) return false; }
    else if (f_genre !== 'Всі' && s.genre !== f_genre) return false;
    if (q && s.name.toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

function genreLabels() {
  var set = {};
  stations.forEach(function (s) { set[s.genre] = 1; });
  var ordered = [];
  GENRES.forEach(function (g) { if (set[g.label]) ordered.push(g.label); });
  if (set['Різне']) ordered.push('Різне');
  return ['Всі', '⭐ Обране'].concat(ordered);
}

/* ---- рендер ---- */
function renderCountries() {
  countryRow.empty();
  COUNTRIES.forEach(function (c) {
    var chip = $('<div class="rua__chip rua__chip--country selector">' + c.label + '</div>');
    if (c.code === f_country) chip.addClass('active');
    chip.on('click hover:enter', function () { f_country = c.code; renderCountries(); renderGenres(); renderList(); });
    chip.on('hover:focus', function (e) { last = e.target; scroll.update($(e.target), true); });
    countryRow.append(chip);
  });
}

function renderGenres() {
  genreRow.empty();
  genreLabels().forEach(function (g) {
    var chip = $('<div class="rua__chip selector">' + g + '</div>');
    if (g === f_genre) chip.addClass('active');
    chip.on('click hover:enter', function () { f_genre = g; renderGenres(); renderList(); });
    chip.on('hover:focus', function (e) { last = e.target; scroll.update($(e.target), true); });
    genreRow.append(chip);
  });
}

function renderList() {
  list.empty();
  var items = filtered();
  head.find('.rua__count').text(items.length + ' станцій');
  Player.setQueue(items);

  if (!items.length) {
    list.append('<div class="rua__empty">' +
      (f_genre === '⭐ Обране' ? 'Ще немає обраних станцій.<br>Натисніть ☆ біля станції.' : 'Нічого не знайдено') +
      '</div>');
    return;
  }

  var cur = Player.current();
  items.forEach(function (s) {
    var logo = s.logo
      ? '<img src="' + s.logo + '" loading="lazy" onerror="this.parentNode.textContent=\'' + s.name.charAt(0).replace(/'/g, '') + '\'">'
      : s.name.charAt(0).toUpperCase();
    var flag = s.country === 'UA' ? '🇺🇦 ' : '';
    var card = $(
      '<div class="rua__card selector">' +
        '<div class="rua__logo">' + logo + '</div>' +
        '<div class="rua__info">' +
          '<div class="rua__name"></div>' +
          '<div class="rua__meta">' + flag + s.genre + (s.country && s.country !== 'UA' ? ' · ' + s.country : '') + '</div>' +
        '</div>' +
        '<div class="rua__fav ' + (isFav(s.url) ? 'on' : '') + '">' + (isFav(s.url) ? '★' : '☆') + '</div>' +
      '</div>'
    );
    card.find('.rua__name').text(s.name); // безпечна вставка тексту
    card.data('url', s.url);
    if (cur && cur.url === s.url) card.addClass('playing');

    card.on('click hover:enter', function (e) {
      if ($(e.target).hasClass('rua__fav')) return;
      Player.setQueue(filtered());
      Player.play(s);
    });
    card.find('.rua__fav').on('click', function (e) {
      e.stopPropagation();
      var on = toggleFav(s.url);
      $(this).toggleClass('on', on).text(on ? '★' : '☆');
      if (f_genre === '⭐ Обране') renderList();
    });
    // довге утримання на пульті = обране
    card.on('hover:long', function () {
      var on = toggleFav(s.url);
      card.find('.rua__fav').toggleClass('on', on).text(on ? '★' : '☆');
      Lampa.Noty.show(on ? 'Додано в обране' : 'Прибрано з обраного');
    });
    card.on('hover:focus', function (e) { last = e.target; scroll.update($(e.target), true); });
    list.append(card);
  });
}

/* ---- життєвий цикл компонента ---- */
this.create = function () {
  injectCSS();
  buildMini();

  html.append(head);
  html.append(search);
  html.append(countryRow);
  html.append(genreRow);
  html.append('<div class="rua__loader">Завантаження станцій…</div>');
  scroll.append(html);

  var timer;
  search.on('input', function () {
    clearTimeout(timer);
    var v = this.value;
    timer = setTimeout(function () { f_query = v.trim(); renderList(); }, 200);
  });

  fetchStations(function (data) {
    stations = data;
    html.find('.rua__loader').remove();
    html.append(list);
    renderCountries();
    renderGenres();
    renderList();
    if (Lampa.Activity.active() && Lampa.Activity.active().activity === self.activity) self.start();
  });

  return this.render();
};

this.render = function () { return scroll.render(); };

this.start = function () {
  Lampa.Controller.add('content', {
    toggle: function () {
      Lampa.Controller.collectionSet(scroll.render());
      Lampa.Controller.collectionFocus(last || false, scroll.render());
    },
    left: function () {
      if (Navigator.canmove('left')) Navigator.move('left');
      else Lampa.Controller.toggle('menu');
    },
    right: function () { Navigator.move('right'); },
    up: function () {
      if (Navigator.canmove('up')) Navigator.move('up');
      else Lampa.Controller.toggle('head');
    },
    down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
    back: function () { Lampa.Activity.backward(); }
  });
  Lampa.Controller.toggle('content');
};

this.pause = function () {};
this.stop = function () {};
this.destroy = function () {
  scroll.destroy();
  html.remove();
  list.remove();
};
```

}

/* —————————————————————— */
/* 8. РЕЄСТРАЦІЯ І ПУНКТ МЕНЮ                                         */
/* —————————————————————— */

function addMenuButton() {
if ($(’.menu .menu__item[data-action=”’ + PLUGIN_ID + ‘”]’).length) return;

```
var btn = $(
  '<li class="menu__item selector" data-action="' + PLUGIN_ID + '">' +
    '<div class="menu__ico">' +
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
        '<path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z"/>' +
      '</svg>' +
    '</div>' +
    '<div class="menu__text">Радіо</div>' +
  '</li>'
);

btn.on('hover:enter click', function () {
  Lampa.Activity.push({ url: '', title: 'Радіо', component: PLUGIN_ID, page: 1 });
});

$('.menu .menu__list').eq(0).append(btn);
```

}

function init() {
Lampa.Component.add(PLUGIN_ID, RadioComponent);
addMenuButton();
}

if (window.appready) init();
else {
Lampa.Listener.follow(‘app’, function (e) {
if (e.type === ‘ready’) init();
});
}
})();