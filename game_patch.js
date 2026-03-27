// ══════════════════════════════════════════════════════
//  AUTO EMPIRE — BOOTSTRAP PATCH (v4)
//  Muss NACH game.js geladen werden.
// ══════════════════════════════════════════════════════

(function applyPatches() {
  'use strict';

  // ── PATCH 1: Stabile sv()-Funktion ──
  window.sv = function(viewId, btn) {
    document.querySelectorAll('.view').forEach(function(v) {
      v.classList.remove('on');
    });
    var tgt = document.getElementById('v-' + viewId);
    if (tgt) tgt.classList.add('on');
    document.querySelectorAll('.nsb').forEach(function(b) { b.classList.remove('on'); });
    if (btn) {
      btn.classList.add('on');
    } else {
      var sel = document.getElementById('nsb-' + viewId);
      if (sel) sel.classList.add('on');
    }
    try {
      if (typeof _barCache !== 'undefined') _barCache = {};
      if (typeof _lastVid  !== 'undefined') _lastVid  = '';
      if (typeof doTabRender === 'function') doTabRender(viewId);
    } catch(e) { console.warn('doTabRender error:', e); }
    var content = document.getElementById('content');
    if (content) content.scrollTop = 0;
  };

  // ── PATCH 2: setNavCat() ──
  var NAV = {
    zentrale:   [{id:'dash',l:'📊 Dash'},{id:'news',l:'📰 News'},{id:'ziele',l:'🎯 Ziele'},{id:'kampagne',l:'📖 Kampagne'},{id:'ranking',l:'🏆 Ranking'},{id:'speichern',l:'💾 Speichern'},{id:'story',l:'📚 Geschichte'}],
    produktion: [{id:'kompo',l:'⚙️ Bauteile'},{id:'fahr',l:'🚗 Fahrzeuge'},{id:'prod',l:'🔧 Produktion'},{id:'werke',l:'🏭 Werke'},{id:'tuning',l:'🔩 Tuning'},{id:'konzept',l:'💡 Konzepte'}],
    forschung:  [{id:'forsch',l:'🔬 Forschung'},{id:'forschlab',l:'🧪 Labor'},{id:'patente',l:'📜 Patente'},{id:'ingenieure',l:'🧑‍🔬 Ingenieure'},{id:'qualitaet',l:'⭐ Qualität'},{id:'roadmap',l:'⚡ E-Roadmap'}],
    markt:      [{id:'markt',l:'🌍 Marktanteile'},{id:'region',l:'🗺️ Regionen'},{id:'weltkarte',l:'🌐 Weltkarte'},{id:'absatz',l:'📦 Absatz'},{id:'showrooms',l:'🏪 Showrooms'},{id:'werb',l:'📺 Werbung'},{id:'fahrzeugmarkt',l:'🏷️ Preise'}],
    wirtschaft: [{id:'fin',l:'💹 Finanzen'},{id:'boerse',l:'📈 Börse'},{id:'bank',l:'🏦 Bank'},{id:'aktien2',l:'💼 Portfolio'},{id:'fusion2',l:'🔀 M&A'},{id:'weltmarkt',l:'🌐 Weltmarkt'}],
    strategie:  [{id:'rohstoff',l:'⛏️ Rohstoffe'},{id:'lieferkette',l:'⛓️ Lieferkette'},{id:'lieferant2',l:'🤝 Partner'},{id:'politik',l:'🏛️ Politik'},{id:'personal',l:'👷 Personal'},{id:'nachhaltigkeit',l:'🌱 ESG'},{id:'mitbewerber2',l:'⚡ Rivalität'}],
    spezial:    [{id:'spionage',l:'🕵️ Spionage'},{id:'blackmarket',l:'🕶️ Schwarzm.'},{id:'wetter',l:'🌩️ Krisen'},{id:'kiangriff',l:'🎯 KI-Angriff'},{id:'embargo',l:'🚫 Embargo'},{id:'saison',l:'🍂 Saison'},{id:'racing',l:'🏎️ Racing'},{id:'auto',l:'🤖 Automat.'},{id:'ankuendigungen',l:'📢 Ankündig.'}]
  };

  window.setNavCat = function(cat, el) {
    var map = NAV[cat];
    if (!map) return;
    document.querySelectorAll('.nc').forEach(function(b) { b.classList.remove('on'); });
    if (el) el.classList.add('on');
    var subNav = document.getElementById('sub-nav');
    if (!subNav) return;
    subNav.innerHTML = map.map(function(n) {
      return '<button class="nsb" id="nsb-' + n.id + '" onclick="sv(\'' + n.id + '\',this)">' + n.l + '</button>';
    }).join('');
    if (map.length > 0) {
      var firstBtn = document.getElementById('nsb-' + map[0].id);
      window.sv(map[0].id, firstBtn);
    }
  };

  // ── PATCH 3: Theme ──
  function syncThemeButton() {
    var btn = document.getElementById('theme-toggle-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'theme-toggle-btn';
      document.body.appendChild(btn);
    }
    btn.onclick = function() { if (typeof toggleTheme === 'function') toggleTheme(); };
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    btn.innerHTML = cur === 'dark' ? '☀️ Light' : '🌙 Dark';
  }

  // ── PATCH 4: showCompanySelect() — zentraler Einstiegspunkt ──
  // Diese Funktion wird von hardResetGame() und beim Erststart aufgerufen.
  // Sie baut das Grid und zeigt den Screen an.
  window.showCompanySelect = function() {
    var screen = document.getElementById('company-select');
    var grid   = document.getElementById('cs-grid');
    if (!screen) return;

    // Grid immer neu aufbauen (Reset-Scenario: Grid muss neu befüllt werden)
    if (grid) grid.innerHTML = '';

    try {
      if (typeof buildCompanySelection === 'function') {
        buildCompanySelection();
      } else {
        console.warn('buildCompanySelection not yet available');
      }
    } catch(e) { console.error('buildCompanySelection error:', e); }

    // Start-Button verstecken bis Auswahl getroffen
    var startBtn = document.getElementById('cs-start');
    if (startBtn) startBtn.classList.remove('show');

    // Info-Text leeren
    var info = document.getElementById('cs-selected-info');
    if (info) info.textContent = '';

    // Screen einblenden
    screen.style.display = 'flex';
    screen.classList.remove('hide');
    screen.style.animation = 'csFadeIn .5s ease';
  };

  // ── PATCH 5: hardResetGame() patchen ──
  // game.js ruft am Ende von hardResetGame() bereits showCompanySelect (per cs.style.display='flex')
  // aber das Grid ist dann leer weil buildCompanySelection() nicht nochmal aufgerufen wird.
  // Wir wrappen hardResetGame() um showCompanySelect() danach sicher aufzurufen.
  var _origHardReset = window.hardResetGame;
  window.hardResetGame = function() {
    if (typeof _origHardReset === 'function') {
      _origHardReset.apply(this, arguments);
    }
    // Nach Reset: Grid neu aufbauen
    setTimeout(window.showCompanySelect, 50);
  };

  // ── PATCH 6: confirmReset() patchen ──
  // confirmReset() ruft hardResetGame() auf — sicherstellen dass unsere Version greift
  var _origConfirmReset = window.confirmReset;
  window.confirmReset = function() {
    try { localStorage.removeItem('ae_v8_save'); } catch(e) {}
    var box = document.getElementById('reset-confirm');
    if (box) box.remove();
    if (typeof window.hardResetGame === 'function') window.hardResetGame();
  };

  // ── PATCH 7: Erststart ohne Save ──
  function handleFirstStart() {
    var hasSave = false;
    try { hasSave = !!localStorage.getItem('ae_v8_save'); } catch(e) {}

    if (hasSave) {
      // Save vorhanden — Company Select verstecken, game.js lädt normal
      var screen = document.getElementById('company-select');
      if (screen) screen.style.display = 'none';
    } else {
      // Kein Save — Grid aufbauen (game.js DOMContentLoaded hat es evtl. schon versucht)
      var grid = document.getElementById('cs-grid');
      if (grid && grid.children.length === 0) {
        window.showCompanySelect();
      }
    }

    // Sub-Nav aufbauen falls leer
    var subNav = document.getElementById('sub-nav');
    if (subNav && subNav.children.length === 0) {
      var firstBtn = document.querySelector('.nc.on') || document.querySelector('.nc');
      if (firstBtn) window.setNavCat('zentrale', firstBtn);
    }

    syncThemeButton();
    console.log('✅ Patch v4 — done. Save:', hasSave);
  }

  // Bei 600ms laufen — nach game.js init() (100ms) und allen internen Timeouts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(handleFirstStart, 600); });
  } else {
    setTimeout(handleFirstStart, 600);
  }

})();
