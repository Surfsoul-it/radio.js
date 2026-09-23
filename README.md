#radio.js
(function () {
    'use strict';

    // База даних радіостанцій (українські та топові світові) згруповані за жанрами
    const stations = [
        // --- Українські ---
        { name: "Kiss FM Ukraine", genre: "ua", genreName: "Українські", logo: "https://bigracer.radio/uploads/station/logo/1/big_kissfm.png", stream: "https://stream.kissfm.ua/KissFM" },
        { name: "Radio Relax", genre: "ua", genreName: "Українські", logo: "https://radiorelax.ua/favicon.ico", stream: "https://stream.radiorelax.ua/RadioRelax" },
        { name: "Hit FM", genre: "ua", genreName: "Українські", logo: "https://www.hitfm.ua/favicon.ico", stream: "https://stream.hitfm.ua/HitFM" },
        { name: "Radio ROKS", genre: "ua", genreName: "Українські", logo: "https://radioroks.ua/favicon.ico", stream: "https://stream.radioroks.ua/RadioRoks" },
        { name: "Melody FM", genre: "ua", genreName: "Українські", logo: "https://melodyfm.ua/favicon.ico", stream: "https://stream.melodyfm.ua/MelodyFM" },
        { name: "Kraina FM", genre: "ua", genreName: "Українські", logo: "https://krainafm.com.ua/favicon.ico", stream: "https://online.krainafm.com.ua/krainafm-128" },
        { name: "Hromadske Radio", genre: "ua", genreName: "Українські", logo: "https://hromadske.radio/images/logo.png", stream: "https://radio.hromadske.radio/stream" },
        
        // --- Поп та Зарубіжні ---
        { name: "BBC Radio 1", genre: "pop", genreName: "Поп / Зарубіжні", logo: "https://sounds.pp.bbci.co.uk/images/bbc_radio_one.png", stream: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one" },
        { name: "BBC Radio 2", genre: "pop", genreName: "Поп / Зарубіжні", logo: "https://sounds.pp.bbci.co.uk/images/bbc_radio_two.png", stream: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_two" },
        { name: "NRJ France", genre: "pop", genreName: "Поп / Зарубіжні", logo: "https://cdn.nrjaudio.fm/audio1/fr/30401/aac_64.mp3", stream: "https://stream.nrj.fr/fr/30401/aac_64.mp3" },
        { name: "Los 40 Spain", genre: "pop", genreName: "Поп / Зарубіжні", logo: "https://los40.com/favicon.ico", stream: "https://21263.live.streamtheworld.com/LOS40_SC" },

        // --- Електроніка / Клубна ---
        { name: "Radio Record", genre: "electronic", genreName: "Електроніка", logo: "https://www.radiorecord.ru/favicon.ico", stream: "https://radiorecord.hostingradio.ru/rr_main96.aac" },
        { name: "Trance Euphoria", genre: "electronic", genreName: "Електроніка", logo: "https://radio.soma.fm/logos/180/u600.png", stream: "https://peridot.streamguys1.com:7150/live" },
        { name: "Defected Radio", genre: "electronic", genreName: "Електроніка", logo: "https://defected.com/favicon.ico", stream: "https://radio.defected.com/stream" },

        // --- Релакс / Джаз / Класика ---
        { name: "SomaFM: Groove Salad", genre: "relax", genreName: "Релакс / Джаз", logo: "https://somafm.com/img/gs180.png", stream: "https://ice1.somafm.com/groovesalad-128-mp3" },
        { name: "Jazz Radio France", genre: "relax", genreName: "Релакс / Джаз", logo: "https://www.jazzradio.fr/favicon.ico", stream: "https://jazzradio.ice.infomaniak.ch/jazzradio-high.mp3" },
        { name: "Classic FM UK", genre: "relax", genreName: "Релакс / Джаз", logo: "https://global.as.origin.globalplayer.com/images/1500x1500/classicfm.png", stream: "https://media-ice.musicradio.com/ClassicFMMP3" }
    ];

    let currentAudio = null;
    let activeStationName = null;

    function RadioPlugin(object) {
        let component = this;
        let html = $(`
            <div class="radio-plugin-screen">
                <div class="radio-header">
                    <div class="radio-title">Інтернет Радіо</div>
                    <div class="radio-genres"></div>
                </div>
                <div class="radio-grid selector"></div>
                <div class="radio-player-bar" style="display:none;">
                    <div class="radio-now-playing">Завантаження...</div>
                </div>
            </div>
        `);

        let currentGenre = 'all';

        this.create = function () {
            renderGenres();
            renderStations('all');
            return html;
        };

        function renderGenres() {
            let genresContainer = html.find('.radio-genres');
            genresContainer.empty();

            let categories = [
                { id: 'all', name: 'Всі станції' },
                { id: 'ua', name: 'Українські' },
                { id: 'pop', name: 'Поп / Зарубіжні' },
                { id: 'electronic', name: 'Електроніка' },
                { id: 'relax', name: 'Релакс / Джаз' }
            ];

            categories.forEach(cat => {
                let btn = $(`<div class="radio-genre-btn selector ${cat.id === currentGenre ? 'active' : ''}">${cat.name}</div>`);
                btn.on('hover:enter', () => {
                    currentGenre = cat.id;
                    genresContainer.find('.radio-genre-btn').removeClass('active');
                    btn.addClass('active');
                    renderStations(cat.id);
                });
                genresContainer.append(btn);
            });
        }

        function renderStations(genre) {
            let grid = html.find('.radio-grid');
            grid.empty();

            let filtered = genre === 'all' ? stations : stations.filter(s => s.genre === genre);

            filtered.forEach(station => {
                let isPlaying = activeStationName === station.name && currentAudio && !currentAudio.paused;
                let card = $(`
                    <div class="radio-card selector ${isPlaying ? 'playing' : ''}">
                        <div class="radio-card-logo">
                            <img src="${station.logo}" onerror="this.src='https://via.placeholder.com/150?text=RADIO'">
                        </div>
                        <div class="radio-card-title">${station.name}</div>
                        <div class="radio-card-status">${isPlaying ? '▶ Грає' : station.genreName}</div>
                    </div>
                `);

                card.on('hover:enter', () => {
                    playStation(station, card);
                });

                grid.append(card);
            });

            // Оновлюємо контроллер фокусів Lampa
            Lampa.Controller.collectionSet(html);
        }

        function playStation(station, cardElement) {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }

            if (activeStationName === station.name) {
                activeStationName = null;
                renderStations(currentGenre);
                html.find('.radio-player-bar').hide();
                return;
            }

            activeStationName = station.name;
            currentAudio = new Audio(station.stream);
            
            html.find('.radio-player-bar').show().find('.radio-now-playing').text('Зараз грає: ' + station.name);
            
            currentAudio.play().then(() => {
                Lampa.Noty.show('Відтворення: ' + station.name);
                renderStations(currentGenre);
            }).catch(e => {
                Lampa.Noty.show('Помилка потоку радіостанції');
                activeStationName = null;
                renderStations(currentGenre);
            });
        }

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collectionSet(html.find('.selector'));
                },
                left: () => {
                    Lampa.Controller.toggle('menu');
                },
                right: () => {},
                up: () => {
                    let prev = Lampa.Controller.collectionFocusPrev();
                },
                down: () => {
                    let next = Lampa.Controller.collectionFocusNext();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.destroy = function () {
            // Зупиняємо аудіо лише якщо користувач закрив сам плагін повністю, 
            // але можна залишити фоновим, якщо забажаєте.
        };
    }

    // Реєстрація компонента в Lampa
    Lampa.Component.add('radio_plugin', RadioPlugin);

    // Додавання стилів інтерфейсу
    $('<style>').text(`
        .radio-plugin-screen { padding: 30px; width: 100%; height: 100%; box-sizing: border-box; overflow-y: auto; }
        .radio-header { margin-bottom: 25px; }
        .radio-title { font-size: 2.2em; font-weight: bold; color: #fff; margin-bottom: 15px; }
        .radio-genres { display: flex; gap: 10px; flex-wrap: wrap; }
        .radio-genre-btn { background: rgba(255,255,255,0.1); padding: 8px 18px; border-radius: 8px; color: #aaa; font-size: 1.1em; cursor: pointer; transition: 0.2s; }
        .radio-genre-btn.focus { background: rgba(255,255,255,0.3); color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.2); }
        .radio-genre-btn.active { background: #f39c12; color: #fff; font-weight: bold; }
        
        .radio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding-bottom: 50px; }
        .radio-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: 0.2s; border: 2px solid transparent; }
        .radio-card.focus { border-color: #f39c12; background: rgba(243, 156, 18, 0.15); transform: scale(1.05); }
        .radio-card.playing { border-color: #2ecc71; background: rgba(46, 204, 113, 0.15); }
        
        .radio-card-logo { width: 90px; height: 90px; margin: 0 auto 15px auto; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .radio-card-logo img { width: 70%; height: 70%; object-fit: contain; }
        .radio-card-title { font-size: 1.2em; color: #fff; font-weight: bold; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .radio-card-status { font-size: 0.9em; color: #888; }
        .radio-card.playing .radio-card-status { color: #2ecc71; font-weight: bold; }

        .radio-player-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #111; padding: 15px 30px; border-top: 1px solid #333; z-index: 999; display: flex; justify-content: space-between; align-items: center; }
        .radio-now-playing { color: #2ecc71; font-size: 1.2em; font-weight: bold; }
    `).appendTo('head');

    // Додавання пункту в головне меню Lampa
    Lampa.Listener.follow('full', (e) => {
        if (e.type == 'complite') {
            let button = $(`
                <li>
                    <div class="full-start__button selector">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4M12 12h.01M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/></svg>
                        <span>Радіо</span>
                    </div>
                </li>
            `);

            button.on('hover:enter', () => {
                Lampa.Activity.push({
                    url: '',
                    title: 'Інтернет Радіо',
                    component: 'radio_plugin',
                    page: 1
                });
            });

            $('.full-start__buttons').append(button);
        }
    });

    console.log('Radio Plugin initialized successfully.');
})();
