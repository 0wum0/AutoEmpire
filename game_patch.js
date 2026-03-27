// ══════════════════════════════════════════════════════
//  AUTO EMPIRE — BOOTSTRAP PATCH (v2 — Theme-aware)
//  Muss NACH game.js geladen werden.
//  Behebt alle kritischen Rendering-Bugs.
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

    document.querySelectorAll('.nsb').forEach(function(b) {
      b.classList.remove('on');
    });
    if (btn) {
      btn.classList.add('on');
    } else {
      var sel = document.getElementById('nsb-' + viewId);
      if (sel) sel.classList.add('on');
    }

    try {
      if (typeof _barCache !== 'undefined') _barCache = {};
      if (typeof _lastVid !== 'undefined') _lastVid = '';
      if (typeof doTabRender === 'function') doTabRender(viewId);
    } catch(e) { console.warn('doTabRender error:', e); }

    var content = document.getElementById('content');
    if (content) content.scrollTop = 0;
  };

  // ── PATCH 2: setNavCat() — robuste Version ──
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

  // ── PATCH 3: Company Select Handler ──
  function setupCompanySelect() {
    var hasSave = false;
    try { hasSave = !!localStorage.getItem('ae_v8_save'); } catch(e) {}
    var screen = document.getElementById('company-select');
    if (!screen) return;

    if (hasSave) {
      screen.style.display = 'none';
    } else {
      screen.style.display = 'flex';
      try {
        if (typeof buildCompanySelection === 'function') buildCompanySelection();
      } catch(e) {}
    }
  }

  // ── PATCH 4: Initial Navigation + Render ──
  function initializeUI() {
    setupCompanySelect();

    var firstCatBtn = document.querySelector('.nc.on') || document.querySelector('.nc');
    if (firstCatBtn) {
      window.setNavCat('zentrale', firstCatBtn);
    }

    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('on'); });
    var dash = document.getElementById('v-dash');
    if (dash) dash.classList.add('on');

    try {
      if (typeof renderAll === 'function') renderAll();
    } catch(e) { console.warn('renderAll error:', e); }

    try { if (typeof _barCache !== 'undefined') _barCache = {}; } catch(e) {}
    try { if (typeof _lastVid !== 'undefined') _lastVid = ''; } catch(e) {}

    // ── PATCH 5: Theme Button sicherstellen ──
    ensureThemeButton();

    console.log('✅ AUTO EMPIRE Patches v2 — UI + Theme ready');
  }

  // ── PATCH 5: Theme Toggle sicherstellen ──
  function ensureThemeButton() {
    var btn = document.getElementById('theme-toggle-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'theme-toggle-btn';
      btn.onclick = function() { if(typeof toggleTheme==='function') toggleTheme(); };
      document.body.appendChild(btn);
    }
    // Sync button label mit aktuellem Theme
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    btn.innerHTML = cur === 'dark' ? '☀️ Light' : '🌙 Dark';
  }

  // Patches nach 100ms anwenden
  setTimeout(initializeUI, 100);

  // Theme-Button nach jedem renderAll sicherstellen
  var _origRA = window.renderAll;
  if (typeof _origRA === 'function') {
    window.renderAll = function() {
      _origRA.apply(this, arguments);
      setTimeout(ensureThemeButton, 50);
    };
  }

})();
