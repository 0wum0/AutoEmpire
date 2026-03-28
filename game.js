// ── MOBILE VIEWPORT FIX ──
// Fix 100vh on mobile browsers where browser chrome overlaps content
(function fixMobileVH(){
  function setVH(){
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function(){ setTimeout(setVH, 200); });
})();

// ── CRITICAL GLOBALS — defined first, before anything else ──
window.setHTML = function(id, html) {
  var el = document.getElementById(id);
  if (!el) return;
  if (el._lh !== html) { el.innerHTML = html; el._lh = html; }
};
window.setTxt = function(id, val, col) {
  var el = document.getElementById(id);
  if (!el) return;
  var s = String(val);
  if (el.textContent !== s) el.textContent = s;
  if (col !== undefined && el.style.color !== col) el.style.color = col;
};

// ════════════════════════════════════════════════
//  AUTO EMPIRE v8  —  COMPLETE GAME ENGINE
//  Features: Save/Load, Kampagne, Ranking, Qualität,
//  Saisonale Nachfrage, Schwarzmarkt, Ingenieure Skill-Tree
//  Particle FX, Float Money, Milestone Bursts, Counter Flash
// ════════════════════════════════════════════════

const SAVE_KEY = 'ae_v8_save';

window.G = null; // will be set after init
const G = {
  money:500000,rev:0,cost:0,prod:0,
  rep:50,share:0,tech:1,q:1,y:1,day:0,tc:0,rdb:.1,brand:50,
  res:{
    steel:   {v:1000,max:5000,icon:'🔩',name:'Stahl'},
    aluminum:{v:500, max:3000,icon:'🪨',name:'Aluminium'},
    plastic: {v:800, max:4000,icon:'🧪',name:'Kunststoff'},
    elec:    {v:200, max:2000,icon:'💡',name:'Elektronik'},
    rubber:  {v:600, max:3000,icon:'⚫',name:'Gummi'},
    energy:  {v:5000,max:10000,icon:'⚡',name:'Energie'},
  },
  comp:{},facs:[],lines:[],rdone:{},active_rd:null,rd_prog:0,
  vehs:{},ads:new Set(),autos:{},ms:new Set(),
  // Finance
  stockPrice:100,stockOwned:0,stockHistory:[100,100,100,100,100,100,100,100],
  loans:[],loanId:0,taxTimer:720,taxPaid:0,
  divTimer:0,lastDiv:0,
  // Personnel
  workerCount:200,workerHappy:75,engineers:5,strikeTimer:0,
  currentCEO:null,
  // Commodity
  commMult:{steel:1,aluminum:1,energy:1},
  commHist:{steel:[1,1,1],aluminum:[1,1,1],energy:[1,1,1]},
  // Regions
  regions:{
    europe:{name:'Europa', flag:'🇪🇺',share:0,dealers:0,unlocked:true, cost:0,       demand:1.0},
    usa:   {name:'USA',    flag:'🇺🇸',share:0,dealers:0,unlocked:false,cost:2000000, demand:1.2},
    china: {name:'China',  flag:'🇨🇳',share:0,dealers:0,unlocked:false,cost:3000000, demand:1.4},
    latam: {name:'Latein.',flag:'🌎',share:0,dealers:0,unlocked:false,cost:1500000, demand:0.9},
    asia:  {name:'Asien',  flag:'🌏',share:0,dealers:0,unlocked:false,cost:2500000, demand:1.1},
  },
  // Politics
  lobbyPts:0,co2Index:100,esgScore:50,
  // Racing
  racingTeam:false,racingLevel:0,raceWins:0,nextRace:null,
  // Spy
  spyPts:0,activeSpy:null,spyTimer:0,secLevel:0,incidents:0,
  // Patents / Showrooms
  patents:[],showrooms:[],
  // Tuning
  tuningDept:false,tuningProjects:{},
  // Concepts
  concepts:[],conceptCD:0,
  // Events
  activeEvent:null,eventTimer:200,eventHistory:[],
  // Embargos / Weather
  embargos:[],embargoTimer:0,insurance:{},
  crisisHistory:[],weatherTimer:300,activeWeather:null,
  // Mergers / Price war
  mergerOffers:[],mergerCD:0,pricewarActive:false,pricewarTimer:0,
  // KI Attacks
  kiAttacks:[],kiAttackTimer:200,defenseLevel:0,
  // Rival factories
  rivalFacs:[],rivalFacTimer:0,
  // Yearly
  yearlyData:[],
  // v8 NEW
  season:'spring',seasonTimer:90,
  qualScore:3.0,reviews:[],reviewTimer:60,
  dna:{engineering:50,materials:50,assembly:50,safety:50,design:50},
  bmRisk:0,bmBusts:0,bmCD:0,
  engTeam:[
    {name:'Klaus Werner',  spec:'Antrieb',    lvl:1,xp:0,xpN:100,emoji:'👨‍🔬'},
    {name:'Petra Braun',   spec:'Elektronik', lvl:1,xp:0,xpN:100,emoji:'👩‍💻'},
    {name:'Tomas Fischer', spec:'Design',     lvl:1,xp:0,xpN:100,emoji:'🎨'},
  ],
  campaignStep:0,missionsDone:[],
  playerScore:0,
  lastSaveTs:null,autoSaveTimer:0,
  // ── Realism Layer (v12 additive) ──
  // Supply chain categories (0–100 health per category)
  supplyChain:{
    mechanik:  {health:80, label:'Mechanik',    icon:'⚙️'},
    elektronik:{health:75, label:'Elektronik',  icon:'💡'},
    struktur:  {health:85, label:'Struktur',    icon:'🔩'},
    energie:   {health:90, label:'Energie',     icon:'⚡'},
    komfort:   {health:70, label:'Komfort',     icon:'🪑'},
  },
  // Quality pressure (hidden model feeding into defectRate)
  qualPressure:0,       // 0-100: higher = more recall risk
  productionStress:0,   // 0-100: rush pressure from line overload
  marginPressure:0,     // 0-100: cost squeeze
  // Auto-helpers (new optional automation)
  autoHelpers:{
    supplyBalance: false,   // auto top-up low supply categories
    qualityProtect: false,  // slow production if quality pressure > 70
    marginProtect: false,   // flag if margin < 10%
    supplierStab: false,    // stabilise volatile suppliers
  },
  // Bottleneck cache (rebuilt each tick, used in render)
  _bottlenecks: [],
  _opportunities: [],
};

// ── DATA ──
const COMPS=[
  {id:'eng_base',cat:'Antrieb',   name:'4-Zyl. Benziner', icon:'🔧',cost:50000, inc:15000,max:10,req:{steel:50,aluminum:20}},
  {id:'eng_v6',  cat:'Antrieb',   name:'V6 3.0L',         icon:'🔥',cost:150000,inc:40000,max:8, req:{steel:80,aluminum:40}},
  {id:'eng_dsl', cat:'Antrieb',   name:'Diesel TDI',      icon:'⛽',cost:80000, inc:20000,max:8, req:{steel:60,aluminum:30}},
  {id:'eng_elec',cat:'Antrieb',   name:'E-Motor',         icon:'⚡',cost:300000,inc:80000,max:10,req:{elec:100,aluminum:50}},
  {id:'eng_hyb', cat:'Antrieb',   name:'Hybrid',          icon:'🌿',cost:250000,inc:60000,max:6, req:{elec:80,steel:40}},
  {id:'eng_v8',  cat:'Antrieb',   name:'V8 Sport 5.0L',  icon:'🏎️',cost:500000,inc:100000,max:5,req:{steel:120,aluminum:80}},
  {id:'trans',   cat:'Antrieb',   name:'Getriebewerk',    icon:'⚙️',cost:180000,inc:45000,max:6, req:{steel:70,aluminum:40}},
  {id:'body_st', cat:'Karosserie',name:'Stahlkarosserie', icon:'🔩',cost:40000, inc:10000,max:10,req:{steel:100}},
  {id:'body_alu',cat:'Karosserie',name:'Aluminiumrahmen', icon:'🪨',cost:120000,inc:30000,max:8, req:{aluminum:80}},
  {id:'body_cfk',cat:'Karosserie',name:'Carbon Fiber',    icon:'🖤',cost:800000,inc:150000,max:5,req:{aluminum:100,elec:20}},
  {id:'press',   cat:'Karosserie',name:'Presswerk 4000t', icon:'🏗️',cost:200000,inc:50000,max:6, req:{steel:200,energy:50}},
  {id:'chassis', cat:'Fahrwerk',  name:'Basis-Plattform', icon:'🔗',cost:60000, inc:15000,max:10,req:{steel:80,rubber:30}},
  {id:'susp_sp', cat:'Fahrwerk',  name:'Sport-Fahrwerk',  icon:'🏁',cost:180000,inc:40000,max:6, req:{steel:60,elec:30}},
  {id:'awd',     cat:'Fahrwerk',  name:'Allradantrieb',   icon:'🌀',cost:250000,inc:60000,max:5, req:{steel:100,elec:40}},
  {id:'axles',   cat:'Fahrwerk',  name:'Achswerk',        icon:'🔄',cost:100000,inc:25000,max:8, req:{steel:90,aluminum:30}},
  {id:'int_base',cat:'Innenraum', name:'Std. Interieur',  icon:'🪑',cost:30000, inc:8000, max:10,req:{plastic:80,rubber:20}},
  {id:'int_lux', cat:'Innenraum', name:'Luxus-Ausstattung',icon:'💎',cost:400000,inc:80000,max:6,req:{plastic:100,elec:50}},
  {id:'infotn',  cat:'Innenraum', name:'Infotainment',    icon:'📱',cost:150000,inc:35000,max:8, req:{elec:100}},
  {id:'adas',    cat:'Elektronik',name:'ADAS Safety',     icon:'🛡️',cost:350000,inc:70000,max:6, req:{elec:150}},
  {id:'battery', cat:'Elektronik',name:'Batteriepaket',   icon:'🔋',cost:500000,inc:100000,max:8,req:{elec:200,aluminum:50}},
  {id:'paint',   cat:'Fertigung', name:'Lackierstraße',   icon:'🎨',cost:80000, inc:20000,max:10,req:{energy:30,plastic:40}},
  {id:'quality', cat:'Fertigung', name:'Qualitätskontrolle',icon:'✅',cost:120000,inc:25000,max:8,req:{elec:60}},
  {id:'weldbot', cat:'Fertigung', name:'Schweißroboter',  icon:'🤖',cost:300000,inc:60000,max:8, req:{steel:50,energy:80}},
  {id:'assembly',cat:'Fertigung', name:'Montageband',     icon:'🏭',cost:500000,inc:100000,max:6,req:{energy:100}},
  {id:'eng_v10', cat:'Antrieb',   name:'V10 Hyper',       icon:'🔥',cost:800000,inc:150000,max:4,req:{steel:150,aluminum:100}},
  {id:'bat_gra', cat:'Elektronik',name:'Graphen-Akku',    icon:'🔋',cost:900000,inc:120000,max:5,req:{elec:300,aluminum:100}},
  {id:'cam_mir', cat:'Elektronik',name:'Kamera-Spiegel',  icon:'📷',cost:200000,inc:40000,max:8,req:{elec:80}},
  {id:'aero_kit',cat:'Karosserie',name:'Aero-Kit',        icon:'🌪️',cost:300000,inc:50000,max:6,req:{plastic:100,aluminum:50}},
  {id:'solar_rf',cat:'Innenraum', name:'Solar-Dach',      icon:'☀️',cost:250000,inc:60000,max:6,req:{elec:100,aluminum:30}},
];

const VEHS=[
  {id:'polo',   name:'Polo Neo',   e:'🚙',seg:'Kleinstwagen',price:18900, pc:9000, t:120,cap:8,req:['eng_base','body_st','chassis']},
  {id:'golf',   name:'Golf X',     e:'🚗',seg:'Kompakt',     price:28500, pc:14000,t:150,cap:6,req:['eng_base','body_st','chassis','int_base']},
  {id:'passat', name:'Passat Evo', e:'🚕',seg:'Mittelklasse',price:38000, pc:19000,t:180,cap:4,req:['eng_v6','body_alu','chassis']},
  {id:'tiguan', name:'Tiguan Pro', e:'🛻',seg:'SUV',         price:45000, pc:22000,t:200,cap:4,req:['eng_v6','body_alu','awd']},
  {id:'touareg',name:'Touareg X',  e:'🚐',seg:'Luxury SUV',  price:75000, pc:38000,t:240,cap:2,req:['eng_v6','body_alu','awd','int_lux']},
  {id:'id4',    name:'ID.4 Evo',   e:'⚡',seg:'E-SUV',       price:52000, pc:28000,t:220,cap:3,req:['eng_elec','body_alu','battery']},
  {id:'arteon', name:'Arteon R',   e:'🏁',seg:'Sport',       price:58000, pc:29000,t:240,cap:2,req:['eng_v6','body_alu','susp_sp']},
  {id:'id_buzz',name:'ID. Buzz',   e:'🚌',seg:'E-Van',       price:65000, pc:34000,t:260,cap:2,req:['eng_elec','body_alu','battery','infotn']},
  {id:'phaeton',name:'Phaeton II', e:'🚀',seg:'Ultra Luxury',price:120000,pc:58000,t:480,cap:1,req:['eng_v8','body_cfk','int_lux','adas']},
  {id:'beetle', name:'Beetle-E',   e:'🐞',seg:'E-Kult',      price:35000, pc:16000,t:160,cap:4,req:['eng_elec','body_st','infotn']},
  {id:'micro_e',name:'Micro-E',e:'🚗',seg:'Kleinstwagen',price:15000,pc:7000,t:100,cap:6,req:['eng_elec','body_st']},
  {id:'offroad',name:'Offroad 4x4',e:'🚙',seg:'SUV',price:55000,pc:28000,t:220,cap:3,req:['eng_v6','body_st','awd']},
  {id:'lux_van',name:'Luxury Van',e:'🚐',seg:'Luxury Van',price:85000,pc:42000,t:250,cap:2,req:['eng_v6','body_alu','int_lux']},
  {id:'hyper_v10',name:'Hypercar V10',e:'🏎️',seg:'Ultra Luxury',price:250000,pc:110000,t:500,cap:1,req:['eng_v10','body_cfk','susp_sp','int_lux']},
  {id:'aero_con',name:'Aero Concept',e:'🛸',seg:'Sport',price:95000,pc:45000,t:280,cap:2,req:['eng_elec','body_cfk','aero_kit']},
];

const FACS=[
  {id:'wolfsburg',name:'Wolfsburg Hauptwerk',city:'Wolfsburg, DE', cost:0,       workers:200,eff:1.0,icon:'🏭'},
  {id:'emden',    name:'Emden Werk',         city:'Emden, DE',     cost:2000000, workers:150,eff:.95,icon:'⚓'},
  {id:'brussels', name:'Brüssel Werk',       city:'Brüssel, BE',   cost:5000000, workers:180,eff:.98,icon:'🇧🇪'},
  {id:'puebla',   name:'Puebla Werk',        city:'Puebla, MX',    cost:8000000, workers:250,eff:.92,icon:'🇲🇽'},
  {id:'chatt',    name:'Chattanooga',        city:'Tennessee, USA',cost:15000000,workers:300,eff:.97,icon:'🇺🇸'},
  {id:'shanghai', name:'Shanghai Werk',      city:'Shanghai, CN',  cost:20000000,workers:400,eff:1.05,icon:'🇨🇳'},
  {id:'zwickau',  name:'Zwickau E-Werk',     city:'Zwickau, DE',   cost:12000000,workers:220,eff:1.1,icon:'⚡'},
];

const RD=[
  {cat:'🔧 Antrieb',items:[{id:'turbo',name:'Turboaufladung',icon:'💨',cost:100000,desc:'+15%'},{id:'fsi',name:'Direkteinspritz.',icon:'⛽',cost:200000,desc:'-10% Verbr.'},{id:'startstop',name:'Start-Stop',icon:'🔄',cost:150000,desc:'Stadt -8%'},{id:'mild48',name:'48V Mildhybrid',icon:'🌿',cost:400000,desc:'CO2 -20%'},{id:'solid',name:'Feststoffakku',icon:'🔋',cost:1000000,desc:'Reichw. +50%'}]},
  {cat:'🛡️ Sicherheit',items:[{id:'abs',name:'ABS & ESP',icon:'🚦',cost:80000,desc:'+NCAP'},{id:'airbag',name:'Multi-Airbag',icon:'🛡️',cost:120000,desc:'8 Airbags'},{id:'lane',name:'Lane Assist',icon:'📏',cost:200000,desc:'+Rep'},{id:'l2',name:'Level 2 Auto.',icon:'🤖',cost:600000,desc:'Teilautonom'},{id:'l4',name:'Level 4 Auto.',icon:'🚗',cost:2000000,desc:'Hochautonom'}]},
  {cat:'🏭 Produktion',items:[{id:'lean',name:'Lean Production',icon:'⚡',cost:150000,desc:'Kosten -8%'},{id:'jit',name:'Just-in-Time',icon:'📦',cost:200000,desc:'Lager -30%'},{id:'aiq',name:'KI Qualität',icon:'🔬',cost:400000,desc:'Ausschuss /2'},{id:'cobot',name:'Koll. Roboter',icon:'🤖',cost:600000,desc:'+20% Out.'},{id:'giga',name:'Gigapress',icon:'🏗️',cost:3000000,desc:'CF Guss'}]},
  {cat:'🧪 Material',items:[{id:'alubody',name:'Alu-Bauweise',icon:'🪨',cost:180000,desc:'-12% Gew.'},{id:'cfk',name:'CfK Mischbau',icon:'🖤',cost:500000,desc:'-25kg'},{id:'recycle',name:'Recycling',icon:'♻️',cost:250000,desc:'-10% Mat.'},{id:'nano',name:'Nano-Beschicht.',icon:'✨',cost:350000,desc:'20J Schutz'}]},
  {cat:'💻 Digital',items:[{id:'ota',name:'OTA Updates',icon:'📡',cost:300000,desc:'Remote SW'},{id:'twin',name:'Digit. Zwilling',icon:'👯',cost:800000,desc:'Entw. -40%'},{id:'5g',name:'5G Konnektivität',icon:'📶',cost:400000,desc:'Connected'},{id:'ar',name:'AR Design',icon:'🕶️',cost:600000,desc:'Design 2x'}]},
  {cat:'🌌 30 Bonus',items:[{id:'holo_ui',name:'Hologramm UI',icon:'🖥️',cost:500000,desc:'Rep +15'},{id:'hyper_charge',name:'Hypercharge',icon:'⚡',cost:750000,desc:'Laden +50%'},{id:'bio_plas',name:'Bio-Kunststoff',icon:'🌱',cost:400000,desc:'ESG +20'},{id:'ai_chassis',name:'KI Chassis',icon:'🧠',cost:900000,desc:'Gewicht -15%'},{id:'solid_recyc',name:'Feststoff-Recycling',icon:'♻️',cost:600000,desc:'Mat -15%'}]},
  {cat:'🌌 Bonus',items:[{id:'holo_ui',name:'Hologramm UI',icon:'🖥️',cost:500000,desc:'Rep +15'},{id:'hyper_charge',name:'Hypercharge',icon:'⚡',cost:750000,desc:'Laden +50%'},{id:'bio_plas',name:'Bio-Kunststoff',icon:'🌱',cost:400000,desc:'ESG +20'},{id:'ai_chassis',name:'KI Chassis',icon:'🧠',cost:900000,desc:'Gewicht -15%'},{id:'solid_recyc',name:'Feststoff-Recycling',icon:'♻️',cost:600000,desc:'Mat -15%'}]},
];

const ADS=[
  {id:'tv',  name:'TV Werbespots',   icon:'📺',cost:5000, eff:'+3% Nachfrage',ev:.03},
  {id:'soc', name:'Social Media',    icon:'📱',cost:3000, eff:'+5% Junge Käufer',ev:.05},
  {id:'f1',  name:'Motorsport',      icon:'🏎️',cost:25000,eff:'+8% Reputation',ev:.08},
  {id:'infl',name:'Influencer',      icon:'⭐',cost:8000, eff:'+6% Awareness',ev:.06},
  {id:'iaa', name:'Automesse IAA',   icon:'🏛️',cost:15000,eff:'+10% Händler',ev:.10},
  {id:'eco', name:'Grüne PR',        icon:'🌿',cost:6000, eff:'+7% ESG',ev:.07},
  {id:'mag', name:'Luxus-Magazin',   icon:'💎',cost:12000,eff:'+5% Premium',ev:.05},
  {id:'esports',name:'eSports Sponsoring',icon:'🎮',cost:10000, eff:'+6% Junge',ev:.06},
  {id:'mega_ad',name:'Mega-Event Spot',   icon:'🏟️',cost:35000, eff:'+12% Reach',ev:.12},
  {id:'viral',  name:'Viral-Kampagne',    icon:'🦠',cost:4000,  eff:'+5% Reichw.',ev:.05},
  {id:'podcast',name:'Tech-Podcast',      icon:'🎧',cost:7000,  eff:'+4% Premium',ev:.04},
  {id:'popup',  name:'Pop-Up-Store',      icon:'🏪',cost:20000, eff:'+8% Händler',ev:.08},
];

const AUTOS=[
  {id:'a_steel', name:'Auto-Stahl',        desc:'Stahl auto-bestellen',    cost:200000},
  {id:'a_alu',   name:'Auto-Aluminium',    desc:'Alu auto-bestellen',      cost:250000},
  {id:'a_price', name:'Dyn. Preise',       desc:'KI optimiert Preise',     cost:400000},
  {id:'a_prod',  name:'Prod. KI',         desc:'Optimiert Produktionsmix',cost:600000},
  {id:'shift3',  name:'3-Schicht 24/7',   desc:'+50% Output',             cost:1000000},
  {id:'pred',    name:'Pred. Maintenance',desc:'Ausfall -80%',            cost:700000},
  {id:'supply',  name:'KI Lieferkette',   desc:'Materialkosten -15%',     cost:900000},
];

const RIVALS=[
  {id:'bmw',    n:'BMW GROUP',    ic:'🔵',co:'🇩🇪',cl:'#1C69D4',sh:18,ca:50e6,ag:.7},
  {id:'merc',   n:'MERCEDES',     ic:'⭐',co:'🇩🇪',cl:'#aaa',   sh:16,ca:60e6,ag:.5},
  {id:'toyota', n:'TOYOTA',       ic:'🔴',co:'🇯🇵',cl:'#E62333',sh:14,ca:80e6,ag:.6},
  {id:'ford',   n:'FORD',         ic:'🔷',co:'🇺🇸',cl:'#003499',sh:11,ca:40e6,ag:.8},
  {id:'stell',  n:'STELLANTIS',   ic:'🌐',co:'🇪🇺',cl:'#FF8C00',sh:9, ca:30e6,ag:.7},
  {id:'hyundai',n:'HYUNDAI-KIA',  ic:'🔶',co:'🇰🇷',cl:'#0057a8',sh:10,ca:35e6,ag:.9},
  {id:'tesla',  n:'TESLA',        ic:'⚡',co:'🇺🇸',cl:'#cc0000',sh:8, ca:70e6,ag:1.0},
  {id:'renault',n:'RENAULT',      ic:'💛',co:'🇫🇷',cl:'#FFCC00',sh:7, ca:25e6,ag:.6},
];

const CEO_POOL=[
  {name:'Dr. Eva Müller', emoji:'👩‍💼',spec:'Effizienz',  bonus:'Prod.kosten -10%',effect:'prodCost',val:.9},
  {name:'Hans Bergmann',  emoji:'👨‍💼',spec:'Expansion', bonus:'Werke -20% Kosten',effect:'facCost', val:.8},
  {name:'Yuki Tanaka',    emoji:'👩‍🔬',spec:'Technologie',bonus:'F&E +50% Speed',   effect:'rdSpeed', val:1.5},
  {name:'James Wilson',   emoji:'👨‍💼',spec:'Marketing', bonus:'Werbeffekt +25%',   effect:'adBoost', val:1.25},
  {name:'Sofia Reyes',    emoji:'👩‍💼',spec:'Nachhalt.',  bonus:'ESG +30',           effect:'esg',     val:1.3},
  {name:'Klaus Schneider',emoji:'🧓',  spec:'Finanzen',  bonus:'Zinsen -50%',       effect:'loanRate',val:.5},
  {name:'Elena Techvision',emoji:'🦾',spec:'Technologie',bonus:'F&E -20%',effect:'rdCost',val:.8},
  {name:'Markus Logistik',emoji:'📦',spec:'Lieferkette',bonus:'Material +15%',effect:'matBoost',val:1.15},
  {name:'Stella Premium',emoji:'✨',spec:'Luxus',bonus:'Rep +10%',effect:'repBoost',val:1.1},
  {name:'David Krisen',emoji:'🛡️',spec:'Risiko',bonus:'Risiko -30%',effect:'riskRed',val:.7},
  {name:'Viktor Gold',emoji:'🤑',spec:'Finanzen',bonus:'Margin +5%',effect:'marginBoost',val:1.05},
];

const MISSIONS=[
  {id:0, name:'Erster Motor',      desc:'4-Zyl. Benziner Level 1',              check:()=>G.comp['eng_base']>=1,   r:20000},
  {id:1, name:'Erste Karosserie',  desc:'Stahlkarosserie Level 1',              check:()=>G.comp['body_st']>=1,    r:20000},
  {id:2, name:'Polo Neo starten',  desc:'Polo Neo Produktion beginnen',         check:()=>G.vehs['polo']?.on,      r:50000},
  {id:3, name:'€100k Umsatz',      desc:'100.000€ Gesamtumsatz',                check:()=>G.rev>=100000,           r:30000},
  {id:4, name:'2 Modelle',         desc:'Zwei Fahrzeuge gleichzeitig',          check:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=2,r:75000},
  {id:5, name:'Werbung aktiv',     desc:'Mindestens 2 Kampagnen laufen',        check:()=>G.ads.size>=2,           r:40000},
  {id:6, name:'3 Forschungen',     desc:'3 Technologien abgeschlossen',         check:()=>Object.values(G.rdone).filter(Boolean).length>=3,r:100000},
  {id:7, name:'Zweites Werk',      desc:'Emden oder weiteres Werk bauen',       check:()=>G.facs.length>=2,        r:200000},
  {id:8, name:'Elektro-Pionier',   desc:'E-Fahrzeug in Produktion',             check:()=>['id4','beetle','id_buzz'].some(id=>G.vehs[id]?.on),r:150000},
  {id:9, name:'Millionär',         desc:'€1 Million Kapital halten',            check:()=>G.money>=1000000,        r:100000},
  {id:10,name:'2 Regionen',        desc:'Zwei Weltmärkte erschlossen',          check:()=>Object.values(G.regions).filter(r=>r.unlocked).length>=2,r:250000},
  {id:11,name:'Aktionär',          desc:'100 eigene Aktien besitzen',           check:()=>G.stockOwned>=100,       r:120000},
  {id:12,name:'Rennsieger',        desc:'Erstes Rennen gewinnen',               check:()=>G.raceWins>=1,           r:200000},
  {id:13,name:'5 Modelle',         desc:'Fünf verschiedene Fahrzeuge',          check:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=5,r:400000},
  {id:14,name:'Tech Level 3',      desc:'Technologiestufe 3 erreichen',         check:()=>G.tech>=3,               r:500000},
  {id:15,name:'5x Automation',     desc:'Fünf Automationssysteme aktiv',        check:()=>Object.values(G.autos).filter(Boolean).length>=5,r:500000},
  {id:16,name:'3 Patente',         desc:'Drei Patente besitzen',                check:()=>G.patents.length>=3,     r:600000},
  {id:17,name:'4 Showrooms',       desc:'Vier Showrooms weltweit',              check:()=>G.showrooms.length>=4,   r:700000},
  {id:18,name:'20% Marktanteil',   desc:'Zwanzig Prozent Marktanteil',          check:()=>G.share>=20,             r:1000000},
  {id:19,name:'AUTO EMPIRE',       desc:'5000 Fahrzeuge produziert',            check:()=>G.prod>=5000,            r:5000000},
];

const SEASON_CFG={
  spring:{name:'Frühling 🌸',cls:'s-spring',bonus:{golf:1.1,polo:1.15,id4:1.1},malus:{touareg:.9}},
  summer:{name:'Sommer ☀️', cls:'s-summer',bonus:{arteon:1.3,beetle:1.2},       malus:{touareg:.85}},
  autumn:{name:'Herbst 🍂', cls:'s-autumn',bonus:{tiguan:1.2,touareg:1.1,passat:1.1},malus:{beetle:.85}},
  winter:{name:'Winter ❄️', cls:'s-winter',bonus:{touareg:1.3,tiguan:1.2},      malus:{beetle:.7,arteon:.8}},
};

const BM_ITEMS=[
  {id:'bm_st',  name:'Schwarzmarkt Stahl',    emoji:'🔩',amt:500, cost:2000, res:'steel',   risk:15,desc:'50% günstiger, Risikoware'},
  {id:'bm_al',  name:'Schwarzmarkt Alu',      emoji:'🪨',amt:300, cost:3000, res:'aluminum',risk:20,desc:'Schnell verfügbar'},
  {id:'bm_el',  name:'Ungeklärte Elektronik', emoji:'💡',amt:200, cost:5000, res:'elec',    risk:25,desc:'Keine Herkunftsgarantie'},
  {id:'bm_en',  name:'Nicht gemeldeter Sprit',emoji:'⚡',amt:1000,cost:2000, res:'energy',  risk:12,desc:'Steuer umgehen'},
  {id:'bm_pat', name:'Patentklau-Datensatz',  emoji:'📜',amt:1,   cost:50000,res:'patent',  risk:60,desc:'Sofort ein Patent — sehr riskant'},
];

const EVENTS=[
  {name:'Ölpreisschock',     type:'crisis',emoji:'🛢️',desc:'Energiekosten +40%',    effect:'energy_cost', val:1.4,dur:120},
  {name:'E-Mobilitätsboom',  type:'good',  emoji:'⚡',desc:'E-Fahrzeuge +30% Nachfr.',effect:'ev_demand',  val:1.3,dur:120},
  {name:'Wirtschaftskrise',  type:'crisis',emoji:'📉',desc:'Preise -15%',            effect:'price_cut',   val:.85,dur:150},
  {name:'Technologieförder.',type:'good',  emoji:'🏛️',desc:'+€500k Förderung',       effect:'money',       val:500000,dur:1},
  {name:'Globaler Streik',   type:'crisis',emoji:'✊',desc:'Produktion -50%',        effect:'prod_cut',    val:.5,dur:90},
  {name:'Auto des Jahres',   type:'good',  emoji:'🏆',desc:'Rep +20',                effect:'rep',         val:20,dur:1},
  {name:'Chip-Krise',        type:'crisis',emoji:'💻',desc:'Elektronik -70%',        effect:'chip',        val:.3,dur:180},
  {name:'Batterie-Durchbruch',type:'good',emoji:'🔋',desc:'E-Nachfrage +40%',effect:'ev_demand',val:1.4,dur:150},
  {name:'Hackerangriff',type:'crisis',emoji:'💻',desc:'Prod. -30%',effect:'prod_cut',val:.7,dur:100},
  {name:'Neue Subvention',type:'good',emoji:'💰',desc:'+€1M Förder.',effect:'money',val:1000000,dur:1},
  {name:'Schwerer Sturm',type:'crisis',emoji:'⛈️',desc:'Kosten +20%',effect:'price_cut',val:1.2,dur:120},
  {name:'Rohstoff-Fund',type:'good',emoji:'⛏️',desc:'Energie -40%',effect:'energy_cost',val:0.6,dur:150},
];

const SHOWROOM_LOCS=[
  {city:'Berlin',   flag:'🇩🇪',cost:200000,db:2},{city:'München',  flag:'🇩🇪',cost:250000,db:2},
  {city:'New York', flag:'🇺🇸',cost:500000,db:4},{city:'LA',       flag:'🇺🇸',cost:450000,db:3},
  {city:'Shanghai', flag:'🇨🇳',cost:600000,db:5},{city:'Tokyo',    flag:'🇯🇵',cost:400000,db:3},
  {city:'Dubai',    flag:'🇦🇪',cost:350000,db:3},{city:'São Paulo',flag:'🇧🇷',cost:280000,db:2},
];

const MS_DEF=[
  {id:'m1',n:'Erstes Auto!',  c:()=>G.prod>=1,            r:10000},
  {id:'m2',n:'100 Autos',     c:()=>G.prod>=100,          r:50000},
  {id:'m3',n:'1000 Autos',    c:()=>G.prod>=1000,         r:500000},
  {id:'m4',n:'2 Werke',       c:()=>G.facs.length>=2,     r:100000},
  {id:'m5',n:'1 Mio. Umsatz', c:()=>G.rev>=1e6,           r:200000},
  {id:'m6',n:'E-Pionier',     c:()=>['id4','beetle','id_buzz'].some(id=>G.vehs[id]?.on),r:150000},
  {id:'m7',n:'5 Modelle',     c:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=5,r:300000},
  {id:'m8',n:'10% Markt',     c:()=>G.share>=10,          r:500000},
  {id:'m9',n:'Tech Level 3',  c:()=>G.tech>=3,            r:1000000},
  {id:'m10',n:'5x Automation',c:()=>Object.values(G.autos).filter(Boolean).length>=5,r:2000000},
  {id:'m11',n:'Aktionär',     c:()=>G.stockOwned>=100,    r:250000},
  {id:'m12',n:'Weltkonzern',  c:()=>Object.values(G.regions).filter(r=>r.unlocked).length>=4,r:1000000},
  {id:'m13',n:'Rennsieger',   c:()=>G.raceWins>=1,        r:500000},
  {id:'m14',n:'Patent-König', c:()=>G.patents.length>=3,  r:750000},
];

// ── PARTICLE SYSTEM ──
const pCv=document.getElementById('particle-canvas');
const pCx=pCv.getContext('2d');
let ptcls=[];
function resizePcv(){pCv.width=window.innerWidth;pCv.height=window.innerHeight;}
resizePcv();window.addEventListener('resize',resizePcv);
function spawnPtcls(x,y,col,n){for(let i=0;i<n;i++)ptcls.push({x,y,vx:(Math.random()-.5)*8,vy:(Math.random()-1)*10,col,life:1,sz:2+Math.random()*4});}
function drawPtcls(){
  pCx.clearRect(0,0,pCv.width,pCv.height);
  ptcls=ptcls.filter(p=>p.life>0);
  ptcls.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.25;p.life-=.022;pCx.globalAlpha=p.life;pCx.fillStyle=p.col;pCx.beginPath();const r=p.sz*p.life;if(r>0){pCx.arc(p.x,p.y,r,0,Math.PI*2);pCx.fill();}});
  pCx.globalAlpha=1;requestAnimationFrame(drawPtcls);
}drawPtcls();

// ── FLOAT MONEY ──
function floatMoney(amt,pos){
  const el=document.createElement('div');el.className='mf';
  el.textContent=(pos?'+€':'-€')+fm(Math.abs(amt));
  el.style.color=pos?'#00ff88':'#ff3355';
  el.style.left=(30+Math.random()*40)+'%';el.style.top=(window.innerHeight/2-80)+'px';
  document.body.appendChild(el);setTimeout(()=>el.remove(),2100);
}

// ── BURST POPUP ──
function showBurst(title,sub,reward){
  const el=document.createElement('div');el.className='burst';
  el.innerHTML='<div class="burst-inner"><div style="font-size:26px">🏆</div><div style="font-size:15px;font-weight:900;color:#ffaa00">'+title+'</div><div style="font-size:11px;color:#cde0f0;margin-top:4px">'+sub+'</div><div style="font-size:13px;font-weight:700;color:#00ff88;margin-top:5px">'+reward+'</div></div>';
  document.body.appendChild(el);
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',40);
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#00ff88',25);
  setTimeout(()=>el.remove(),1400);
}

// ── COUNTER FLASH ──
function flashEl(id,pos){
  const el=document.getElementById(id);if(!el)return;
  el.classList.remove('flash-g','flash-r');void el.offsetWidth;
  el.classList.add(pos?'flash-g':'flash-r');
  setTimeout(()=>el.classList.remove('flash-g','flash-r'),600);
}

// ── SAVE / LOAD ──
function saveGame(){
  try{
    const d={
      v:8,ts:Date.now(),
      money:G.money,rev:G.rev,cost:G.cost,prod:G.prod,
      rep:G.rep,share:G.share,tech:G.tech,q:G.q,y:G.y,day:G.day,tc:G.tc,rdb:G.rdb,brand:G.brand,
      res:Object.fromEntries(Object.entries(G.res).map(([k,v])=>[k,v.v])),
      comp:{...G.comp},
      facs:G.facs.map(f=>f.id),
      lines:G.lines.map(l=>({vid:l.veh.id,run:l.run,p:l.p,cap:l.cap})),
      rdone:{...G.rdone},active_rd:G.active_rd?.id||null,rd_prog:G.rd_prog,
      vehs:Object.fromEntries(Object.entries(G.vehs).map(([k,v])=>[k,{on:v.on,n:v.n,pm:v.pm||1}])),
      ads:[...G.ads],autos:{...G.autos},ms:[...G.ms],
      stockPrice:G.stockPrice,stockOwned:G.stockOwned,stockHistory:G.stockHistory.slice(-10),
      loans:G.loans,taxTimer:G.taxTimer,taxPaid:G.taxPaid,divTimer:G.divTimer,lastDiv:G.lastDiv,
      workerCount:G.workerCount,workerHappy:G.workerHappy,engineers:G.engineers,currentCEO:G.currentCEO?.name||null,
      commMult:{...G.commMult},
      regions:Object.fromEntries(Object.entries(G.regions).map(([k,v])=>[k,{unlocked:v.unlocked,dealers:v.dealers}])),
      lobbyPts:G.lobbyPts,co2Index:G.co2Index,esgScore:G.esgScore,
      racingTeam:G.racingTeam,racingLevel:G.racingLevel,raceWins:G.raceWins,
      spyPts:G.spyPts,secLevel:G.secLevel,defenseLevel:G.defenseLevel,
      patents:G.patents,showrooms:G.showrooms,tuningDept:G.tuningDept,
      tuningProjects:{...G.tuningProjects},concepts:G.concepts,
      insurance:{...G.insurance},embargos:G.embargos,crisisHistory:G.crisisHistory.slice(-5),
      kiAttacks:G.kiAttacks.slice(-10),
      rivals:RIVALS.map(r=>({id:r.id,sh:r.sh,ca:r.ca})),
      rivalFacs:G.rivalFacs,yearlyData:G.yearlyData.slice(-3),
      season:G.season,seasonTimer:G.seasonTimer,
      qualScore:G.qualScore,dna:{...G.dna},bmRisk:G.bmRisk,
      engTeam:G.engTeam.map(e=>({...e})),
      campaignStep:G.campaignStep,missionsDone:[...G.missionsDone],
      playerScore:G.playerScore,pricewarActive:G.pricewarActive,
      // v12 realism layer
      supplyChain:Object.fromEntries(Object.entries(G.supplyChain).map(([k,v])=>[k,v.health])),
      qualPressure:G.qualPressure,productionStress:G.productionStress,marginPressure:G.marginPressure,
      autoHelpers:{...G.autoHelpers},
    };
    const json=JSON.stringify(d);
    localStorage.setItem(SAVE_KEY,json);
    G.lastSaveTs=Date.now();
    const t=new Date().toLocaleTimeString();
    const ss=document.getElementById('save-status');if(ss)ss.textContent='✓ Gespeichert '+t;
    const ls=document.getElementById('last-save');if(ls)ls.textContent=t;
    const sz=document.getElementById('save-sz');if(sz)sz.textContent=(json.length/1024).toFixed(1)+' KB';
    notify('💾 Spielstand gespeichert!','ok');
  }catch(e){notify('❌ Speichern fehlgeschlagen','err');console.error(e);}
}

function loadGame(){
  try{
    const json=localStorage.getItem(SAVE_KEY);
    if(!json){notify('Kein Spielstand gefunden!','warn');return false;}
    const d=JSON.parse(json);
    // Core
    Object.assign(G,{money:d.money||500000,rev:d.rev||0,cost:d.cost||0,prod:d.prod||0,
      rep:d.rep||50,share:d.share||0,tech:d.tech||1,q:d.q||1,y:d.y||1,day:d.day||0,
      tc:d.tc||0,rdb:d.rdb||.1,brand:d.brand||50});
    if(d.res)Object.entries(d.res).forEach(([k,v])=>{if(G.res[k])G.res[k].v=v;});
    if(d.comp)Object.assign(G.comp,d.comp);
    if(d.facs)G.facs=d.facs.map(id=>({...FACS.find(f=>f.id===id)})).filter(f=>f.id);
    if(!G.facs.length)G.facs=[{...FACS[0]}];
    if(d.lines)G.lines=d.lines.map(l=>{const v=VEHS.find(x=>x.id===l.vid);return v?{id:l.vid+'_'+Date.now(),veh:{...v,pm:l.pm||1},run:l.run,p:l.p||0,rate:100/v.t,cap:l.cap||v.cap}:null;}).filter(Boolean);
    if(d.rdone)Object.assign(G.rdone,d.rdone);
    if(d.active_rd){const f=RD.flatMap(c=>c.items).find(r=>r.id===d.active_rd);if(f){G.active_rd=f;G.rd_prog=d.rd_prog||0;}}
    if(d.vehs)Object.entries(d.vehs).forEach(([k,v])=>{if(G.vehs[k])Object.assign(G.vehs[k],{on:v.on,n:v.n,pm:v.pm||1});});
    if(d.ads)G.ads=new Set(d.ads);
    if(d.autos)Object.assign(G.autos,d.autos);
    if(d.ms)G.ms=new Set(d.ms);
    Object.assign(G,{
      stockPrice:d.stockPrice||100,stockOwned:d.stockOwned||0,
      stockHistory:d.stockHistory||[100,100,100,100,100],
      loans:d.loans||[],taxTimer:d.taxTimer||720,taxPaid:d.taxPaid||0,
      divTimer:d.divTimer||0,lastDiv:d.lastDiv||0,
      workerCount:d.workerCount||200,workerHappy:d.workerHappy||75,engineers:d.engineers||5,
    });
    if(d.currentCEO){const c=CEO_POOL.find(x=>x.name===d.currentCEO);G.currentCEO=c||null;}
    if(d.commMult)Object.assign(G.commMult,d.commMult);
    if(d.regions)Object.entries(d.regions).forEach(([k,v])=>{if(G.regions[k])Object.assign(G.regions[k],{unlocked:v.unlocked,dealers:v.dealers});});
    Object.assign(G,{
      lobbyPts:d.lobbyPts||0,co2Index:d.co2Index||100,esgScore:d.esgScore||50,
      racingTeam:d.racingTeam||false,racingLevel:d.racingLevel||0,raceWins:d.raceWins||0,
      spyPts:d.spyPts||0,secLevel:d.secLevel||0,defenseLevel:d.defenseLevel||0,
      patents:d.patents||[],showrooms:d.showrooms||[],tuningDept:d.tuningDept||false,
      tuningProjects:d.tuningProjects||{},concepts:d.concepts||[],
      insurance:d.insurance||{},embargos:d.embargos||[],crisisHistory:d.crisisHistory||[],
      kiAttacks:d.kiAttacks||[],rivalFacs:d.rivalFacs||[],yearlyData:d.yearlyData||[],
      season:d.season||'spring',seasonTimer:d.seasonTimer||90,
      qualScore:d.qualScore||3.0,dna:d.dna||G.dna,bmRisk:d.bmRisk||0,
      engTeam:d.engTeam||G.engTeam,
      campaignStep:d.campaignStep||0,missionsDone:d.missionsDone||[],
      playerScore:d.playerScore||0,pricewarActive:d.pricewarActive||false,
    });
    if(d.rivals)d.rivals.forEach(r=>{const f=RIVALS.find(x=>x.id===r.id);if(f){f.sh=r.sh;f.ca=r.ca;}});
    // v12 realism layer — safe defaults if missing
    if(d.supplyChain){Object.entries(d.supplyChain).forEach(([k,v])=>{if(G.supplyChain[k])G.supplyChain[k].health=v;});}
    G.qualPressure = d.qualPressure||0;
    G.productionStress = d.productionStress||0;
    G.marginPressure = d.marginPressure||0;
    if(d.autoHelpers)Object.assign(G.autoHelpers, d.autoHelpers);
    G.lastSaveTs=d.ts;
    const ts=new Date(d.ts);
    notify('📂 Spielstand geladen! ('+ts.toLocaleDateString()+')','ok');
    addEv('📂 <span style="color:var(--gn)">Spielstand geladen</span> — Willkommen zurück!');
    renderAll();
    return true;
  }catch(e){notify('❌ Laden fehlgeschlagen: '+e.message,'err');console.error(e);return false;}
}

function resetGame(){
  // Don't use confirm() — blocked in iframe environments.
  // Show an inline confirmation inside the save panel instead.
  const existing = document.getElementById('reset-confirm');
  if(existing){ existing.remove(); return; }
  const box = document.createElement('div');
  box.id = 'reset-confirm';
  box.style.cssText = 'background:rgba(255,51,85,.12);border:1px solid rgba(255,51,85,.5);border-radius:8px;padding:12px;margin-top:8px;text-align:center;';
  box.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--rd);margin-bottom:8px;">⚠️ Spielstand wirklich löschen?<br><span style="font-size:10px;font-weight:400;color:var(--dm);">Das kann nicht rückgängig gemacht werden.</span></div>'
    + '<div style="display:flex;gap:8px;justify-content:center;">'
    + '<button class="btn sm rd-b" onclick="confirmReset()" style="flex:1;">🗑️ Ja, löschen</button>'
    + '<button class="btn sm" onclick="cancelReset()" style="flex:1;">Abbrechen</button>'
    + '</div>';
  // Append to the save panel or body as fallback
  const sp = document.getElementById('save-info') || document.getElementById('v-speichern') || document.body;
  sp.appendChild(box);
  box.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function cancelReset(){
  var b=document.getElementById('reset-confirm');
  if(b)b.remove();
}

function confirmReset(){
  // Clear the save key
  try { localStorage.removeItem(SAVE_KEY); } catch(e){}
  // Remove confirm box
  const box = document.getElementById('reset-confirm');
  if(box) box.remove();
  // Hard reset all game state in-place — no reload needed
  hardResetGame();
}

function hardResetGame(){
  // Stop all running intervals by clearing them
  // (we can't cancel the specific IDs since startIntervals didn't store them,
  //  but we can reset G completely and re-init without a reload)

  // Reset G to initial values
  G.money=500000; G.rev=0; G.cost=0; G.prod=0;
  G.rep=50; G.share=0; G.tech=1; G.q=1; G.y=1; G.day=0; G.tc=0; G.rdb=.1; G.brand=50;
  Object.keys(G.res).forEach(k=>{ G.res[k].v = {steel:1000,aluminum:500,plastic:800,elec:200,rubber:600,energy:5000}[k]||0; });
  COMPS.forEach(c=>G.comp[c.id]=0);
  RD.forEach(cat=>cat.items.forEach(r=>G.rdone[r.id]=false));
  VEHS.forEach(v=>{ G.vehs[v.id]={on:false,n:0,pm:1}; });
  AUTOS.forEach(a=>G.autos[a.id]=false);
  G.facs=[{...FACS[0]}];
  G.lines=[]; G.active_rd=null; G.rd_prog=0;
  G.ads=new Set(); G.ms=new Set();
  G.stockPrice=100; G.stockOwned=0; G.stockHistory=[100,100,100,100,100,100,100,100];
  G.loans=[]; G.loanId=0; G.taxTimer=720; G.taxPaid=0; G.divTimer=0; G.lastDiv=0;
  G.workerCount=200; G.workerHappy=75; G.engineers=5; G.strikeTimer=0; G.currentCEO=null;
  G.commMult={steel:1,aluminum:1,energy:1};
  G.commHist={steel:[1,1,1],aluminum:[1,1,1],energy:[1,1,1]};
  Object.keys(G.regions).forEach(k=>{ G.regions[k].unlocked=(k==='europe'); G.regions[k].dealers=0; });
  G.lobbyPts=0; G.co2Index=100; G.esgScore=50;
  G.racingTeam=false; G.racingLevel=0; G.raceWins=0; G.nextRace=null;
  G.spyPts=0; G.activeSpy=null; G.spyTimer=0; G.secLevel=0; G.incidents=0;
  G.patents=[]; G.showrooms=[]; G.tuningDept=false; G.tuningProjects={};
  G.concepts=[]; G.conceptCD=0;
  G.activeEvent=null; G.eventTimer=200; G.eventHistory=[];
  G.embargos=[]; G.embargoTimer=0; G.insurance={};
  G.crisisHistory=[]; G.weatherTimer=300; G.activeWeather=null;
  G.mergerOffers=[]; G.mergerCD=0; G.pricewarActive=false; G.pricewarTimer=0;
  G.kiAttacks=[]; G.kiAttackTimer=200; G.defenseLevel=0;
  G.rivalFacs=[]; G.rivalFacTimer=0; G.yearlyData=[];
  G.season='spring'; G.seasonTimer=90;
  G.qualScore=3.0; G.reviews=[]; G.reviewTimer=60;
  G.dna={engineering:50,materials:50,assembly:50,safety:50,design:50};
  G.bmRisk=0; G.bmBusts=0; G.bmCD=0;
  G.engTeam=[
    {name:'Klaus Werner',  spec:'Antrieb',    lvl:1,xp:0,xpN:100,emoji:'👨‍🔬'},
    {name:'Petra Braun',   spec:'Elektronik', lvl:1,xp:0,xpN:100,emoji:'👩‍💻'},
    {name:'Tomas Fischer', spec:'Design',     lvl:1,xp:0,xpN:100,emoji:'🎨'},
  ];
  G.campaignStep=0; G.missionsDone=[]; G.playerScore=0;
  // v10+ extended state
  if(G.supplyChain){
    Object.values(G.supplyChain).forEach(cat=>cat.health=75);
  }
  G.qualPressure=0; G.productionStress=0; G.marginPressure=0;
  if(G.autoHelpers) Object.keys(G.autoHelpers).forEach(k=>G.autoHelpers[k]=false);
  G.storyMissionsDone=[]; G.storyChapter=0; G.heritagePoints=0;
  G.companyId=null; G.companyName=null; G.companyIcon=null; G.companyBonus=null;
  if(typeof WM!=='undefined'){
    WM.oil=85; WM.eurUsd=1.08; WM.steelTon=680; WM.aluTon=2400;
    WM.chipIdx=100; WM.evDemandIdx=100; WM.globalDemand=100;
    WM.geoRisk=20; WM.tradeBarriers=0; WM.activeWmEvent=null; WM.wmEventTimer=120;
  }
  // Reset rivals
  RIVALS.forEach(r=>{
    const defaults={bmw:18,merc:16,toyota:14,ford:11,stell:9,hyundai:10,tesla:8,renault:7};
    r.sh=defaults[r.id]||10; r.ca=30e6+(Math.random()*30e6);
  });
  // Reset logo to default
  const logo=document.querySelector('.logo');
  if(logo){ logo.style.background='linear-gradient(90deg,#00d4ff,#ffaa00)'; logo.style['-webkit-background-clip']='text'; logo.style['-webkit-text-fill-color']='transparent'; logo.textContent='AUTO⚡EMPIRE'; }
  // Show company select screen for a fresh start
  const cs=document.getElementById('company-select');
  if(cs){ cs.style.display='flex'; cs.classList.remove('hide'); if(typeof buildCompanySelection==='function') buildCompanySelection(); }
  // Clear event feed and AI log
  const ef=document.getElementById('ev-feed'); if(ef) ef.innerHTML='';
  const al=document.getElementById('ai-log');  if(al) al.innerHTML='';
  // Refresh UI
  if(typeof window.renderAll==='function') window.renderAll();
  notify('✅ Spielstand zurückgesetzt — viel Erfolg!','ok');
  addEv('🔄 <span style="color:var(--cy)">Neues Spiel gestartet</span>');
  sv('dash', document.querySelector('.nb'));
}

// ── INIT ──
function startIntervals(){
  // Game logic tick — 1 second
  setInterval(function(){ if(typeof window.tick==='function') window.tick(); else tick(); }, 1000);
  // Slow ticks
  setInterval(aiTick,5000);
  setInterval(buildTicker,20000);
  setInterval(stockTick,3000);
  setInterval(commTick,8000);
  setInterval(eventTick,1000);
  setInterval(saveGame,30000);
  // RAF live update loop — starts after init
  startRAF();
}

function init(){
  COMPS.forEach(c=>G.comp[c.id]=0);
  RD.forEach(cat=>cat.items.forEach(r=>G.rdone[r.id]=false));
  VEHS.forEach(v=>G.vehs[v.id]={on:false,n:0,pm:1});
  AUTOS.forEach(a=>G.autos[a.id]=false);
  G.facs=[{...FACS[0]}];

  // ALWAYS start intervals first — game runs regardless
  startIntervals();
  buildTicker();

  // Try to load save silently (no confirm dialog)
  const hasSave = localStorage.getItem(SAVE_KEY);
  if(hasSave){
    try {
      loadGame();  // loads and calls renderAll() internally
    } catch(e) {
      console.warn('Save load failed, starting fresh:', e);
      _freshStart();
    }
    return;
  }

  // No save — check if company screen should show (only outside iframes)
  const canShowScreen = window.self === window.top;
  if(canShowScreen && typeof buildCompanySelection === 'function'){
    // Company select will call startWithCompany() → renderAll()
    // Nothing to do here
  } else {
    _freshStart();
  }
}

function _freshStart(){
  addEv('🏭 <span style="color:var(--gn)">Wolfsburg Hauptwerk</span> online!');
  addEv('💰 Startkapital: <span style="color:var(--go)">€500.000</span>');
  notify('Willkommen bei Auto Empire! 💾 Auto-Save aktiv.','ok');
  renderAll();
}

// ── TICKS ──
function tick(){
  G.tc++;
  // Resources
  const rates={steel:5,aluminum:3,plastic:4,elec:2,rubber:3,energy:50};
  Object.keys(G.res).forEach(k=>G.res[k].v=Math.min(G.res[k].max,G.res[k].v+(rates[k]||0)*.1));
  // Production
  G.lines.forEach(l=>{
    if(!l.run)return;
    const strike=G.strikeTimer>0?.5:1;
    l.p+=l.rate*(G.autos['shift3']?1.5:1)*strike;
    if(l.p>=100){
      l.p=0;
      const n=Math.round(l.cap);
      const sc=SEASON_CFG[G.season];
      const sm=(sc.bonus?.[l.veh.id]||1)*(sc.malus?.[l.veh.id]||1);
      const regB=Object.values(G.regions).filter(r=>r.unlocked).reduce((s,r)=>s+r.demand,0)/Math.max(1,Object.values(G.regions).filter(r=>r.unlocked).length);
      const showB=1+G.showrooms.length*.02;
      const adB=adMult();
      const evB=G.activeEvent?.effect==='ev_demand'&&['id4','beetle','id_buzz'].includes(l.veh.id)?1.3:1;
      const priceB=G.pricewarActive?.85:1;
      const ev_cut=G.activeEvent?.effect==='price_cut'?G.activeEvent.val:1;
      const ceoB=G.currentCEO?.effect==='adBoost'?G.currentCEO.val:1;
      const rev=n*l.veh.price*(l.veh.pm||1)*(1+G.brand/200)*adB*regB*showB*evB*priceB*ev_cut*sm*ceoB;
      const ceoPc=G.currentCEO?.effect==='prodCost'?G.currentCEO.val:1;
      const pc=n*l.veh.pc*ceoPc;
      G.money+=rev-pc;G.rev+=rev;G.cost+=pc;G.prod+=n;G.vehs[l.veh.id].n+=n;
      addEv(l.veh.e+' <span style="color:var(--gn)">+'+n+' '+l.veh.name+'</span> → <span style="color:var(--go)">+€'+fm(rev)+'</span>');
      floatMoney(rev,true);
      flashEl('hm',true);flashEl('d-prod',true);
      // Quality recall chance
      if(G.comp['quality']<2&&Math.random()<.0003*n){
        const fine=100000+Math.floor(Math.random()*400000);
        G.money=Math.max(0,G.money-fine);G.rep=Math.max(0,G.rep-8);
        notify('⚠️ RÜCKRUF: '+l.veh.name+' — -€'+fm(fine),'err');
        addEv('⚠️ <span style="color:var(--rd)">RÜCKRUF '+l.veh.emoji+' '+l.veh.name+'</span> — -€'+fm(fine));
      }
    }
  });
  // Research
  if(G.active_rd){
    const engBoost=1+G.engTeam.reduce((s,e)=>s+e.lvl*.05,0);
    const ceoB=G.currentCEO?.effect==='rdSpeed'?G.currentCEO.val:1;
    G.rd_prog+=.4*(1+G.rdb*4)*engBoost*ceoB;
    if(G.rd_prog>=100){
      G.rdone[G.active_rd.id]=true;G.rep=Math.min(100,G.rep+3);
      G.tech=Math.floor(Object.values(G.rdone).filter(Boolean).length/4)+1;
      addEv('🔬 <span style="color:var(--cy)">'+G.active_rd.name+'</span> abgeschlossen!');
      notify('Forschung: '+G.active_rd.name+' ✓','ok');
      // Auto patent
      if(Math.random()<.3)G.patents.push({id:'P'+Date.now(),name:G.active_rd.name,filed:G.y+'Q'+G.q,val:100000+Math.random()*400000});
      G.active_rd=null;G.rd_prog=0;
      // Engineer XP
      G.engTeam.forEach(e=>{e.xp+=10;if(e.xp>=e.xpN){e.lvl++;e.xp=0;e.xpN=Math.round(e.xpN*1.8);notify('🧑‍🔬 '+e.name+' → Level '+e.lvl+'!','ok');}});
    }
  }
  // Ads cost
  G.ads.forEach(id=>{const a=ADS.find(x=>x.id===id);if(a){const c=a.cost/86;G.money-=c;G.cost+=c;}});
  // Loans
  G.loans.forEach(l=>{const p=l.monthly/30;G.money-=p;G.cost+=p;l.remaining-=p;});
  G.loans=G.loans.filter(l=>l.remaining>10);
  // Auto-buy
  if(G.autos['a_steel']&&G.res.steel.v<500&&G.money>5000){G.money-=5000;G.res.steel.v+=500;}
  if(G.autos['a_alu']&&G.res.aluminum.v<300&&G.money>6000){G.money-=6000;G.res.aluminum.v+=300;}
  // Spypoints
  G.spyPts+=.01*(1+G.engineers*.05);
  if(G.activeSpy&&G.spyTimer>0){G.spyTimer--;if(G.spyTimer===0)completeSpy();}
  // Lobby pts
  G.lobbyPts+=.005*(G.share/10);
  // Dividends
  G.divTimer++;
  if(G.divTimer>=360&&G.stockOwned>0){const d=G.stockOwned*G.stockPrice*.02;G.money+=d;G.divTimer=0;G.lastDiv=d;notify('💰 Dividende: +€'+fm(d),'ok');floatMoney(d,true);}
  // Taxes
  G.taxTimer--;
  if(G.taxTimer<=0){const t=Math.max(0,G.rev-G.cost)*.25;G.money-=t;G.taxPaid+=t;G.taxTimer=720;notify('🏛️ Steuern: -€'+fm(t),'warn');floatMoney(t,false);}
  // Pricewar
  if(G.pricewarActive){G.pricewarTimer--;if(G.pricewarTimer<=0){G.pricewarActive=false;notify('Preiskampf beendet','warn');}}
  // Strike
  if(G.tc%60===0){if(G.workerHappy<50&&Math.random()<.1&&G.strikeTimer===0){G.strikeTimer=60;notify('✊ STREIK! Prod. -50% für 60s','err');addEv('✊ <span style="color:var(--rd)">STREIK!</span>');} if(G.strikeTimer>0)G.strikeTimer--;}
  // BM cooldown
  if(G.bmCD>0)G.bmCD--;
  // Season
  G.seasonTimer--;
  if(G.seasonTimer<=0){const s=['spring','summer','autumn','winter'];G.season=s[(s.indexOf(G.season)+1)%4];G.seasonTimer=90;const sc=SEASON_CFG[G.season];notify('🌍 Saisonwechsel: '+sc.name,'info');addEv('🌍 <span style="color:var(--pu)">Saison: '+sc.name+'</span>');}
  // Quality DNA
  G.reviewTimer--;
  if(G.reviewTimer<=0&&G.prod>0){
    G.reviewTimer=60+Math.floor(Math.random()*60);
    G.dna.engineering=Math.min(100,30+G.comp['eng_base']*5+G.comp['eng_v6']*8+G.comp['eng_elec']*10);
    G.dna.materials=Math.min(100,20+G.comp['body_st']*4+G.comp['body_alu']*8+G.comp['body_cfk']*15);
    G.dna.assembly=Math.min(100,20+G.comp['quality']*8+G.comp['weldbot']*6+G.comp['assembly']*10);
    G.dna.safety=Math.min(100,30+(G.rdone['abs']?20:0)+(G.rdone['airbag']?15:0)+(G.rdone['lane']?10:0));
    G.dna.design=Math.min(100,20+G.brand*.4+G.concepts.length*8);
    G.qualScore=Math.min(5,Math.max(1,Object.values(G.dna).reduce((s,v)=>s+v,0)/100));
    const pv=VEHS.filter(v=>G.vehs[v.id]?.on);
    if(pv.length>0){
      const v=pv[Math.floor(Math.random()*pv.length)];
      const r=Math.max(1,Math.min(5,Math.round(G.qualScore+((Math.random()-.4)*1.5))));
      const pos=['Top Qualität!','Sehr zufrieden','Empfehle weiter','Absolut überzeugt'];
      const neg=['Kleine Mängel','Könnte besser sein','Enttäuscht','Nachbesserung nötig'];
      G.reviews.unshift({veh:v.name,emoji:v.e,r,comment:r>=3?pos[Math.floor(Math.random()*pos.length)]:neg[Math.floor(Math.random()*neg.length)],when:G.y+'Q'+G.q});
      if(G.reviews.length>20)G.reviews.pop();
      if(r>=4)G.rep=Math.min(100,G.rep+.3); else if(r<=2)G.rep=Math.max(0,G.rep-.8);
    }
  }
  // Market share
  const ac=VEHS.filter(v=>G.vehs[v.id]?.on).length;
  const rb=Object.values(G.regions).filter(r=>r.unlocked).length*.5;
  const sb=G.showrooms.length*.3;
  G.share=Math.min(45,(ac*2+G.rep*.1+Object.values(G.rdone).filter(Boolean).length*.4+rb+sb)*.5);
  G.esgScore=Math.min(100,Math.max(0,G.esgScore+(G.ads.has('eco')?.01:0)));
  // Day/quarter
  if(G.tc%120===0){G.day++;if(G.day%360===0){G.yearlyData.push({year:G.y-1,rev:G.rev,cost:G.cost,prod:G.prod,share:G.share.toFixed(1)});}if(G.day%90===0){G.q++;if(G.q>4){G.q=1;G.y++;}addEv('📅 <span style="color:var(--go)">Q'+G.q+' Jahr '+G.y+'</span> — Umsatz: €'+fm(G.rev));}}
  // Score
  G.playerScore=Math.floor(G.prod*10+G.rev/1000+G.share*500+G.patents.length*1000+G.raceWins*2000+G.missionsDone.length*500);
  // Campaign
  checkCampaign();
  checkMS();
  // Rival factories
  G.rivalFacTimer++;
  if(G.rivalFacTimer>=300){G.rivalFacTimer=0;const locs=[{rival:'bmw',city:'München'},{rival:'tesla',city:'Berlin'},{rival:'merc',city:'Stuttgart'},{rival:'toyota',city:'Toyota City'},{rival:'ford',city:'Detroit'},{rival:'tesla',city:'Austin'},{rival:'hyundai',city:'Ulsan'}];const avail=locs.filter(l=>!G.rivalFacs.find(f=>f.city===l.city));if(avail.length>0){const loc=avail[Math.floor(Math.random()*avail.length)];const rival=RIVALS.find(r=>r.id===loc.rival);if(rival){G.rivalFacs.push({...loc,built:G.y+'Q'+G.q});rival.sh=Math.min(26,rival.sh+.4);addEv('<span style="color:var(--rd)">'+rival.ic+' '+rival.n+'</span> baut Werk in <b>'+loc.city+'</b>!');notify(rival.n+' eröffnet Werk in '+loc.city,'warn');}}}
  // Embargo timer
  G.embargoTimer++;if(G.embargoTimer>=400&&G.embargos.length<2){G.embargoTimer=0;if(Math.random()<.25){const embs=[{name:'China Chip-Krise',flag:'🇨🇳',affects:'elec',sev:.5,dur:180},{name:'Stahl-Sanktionen',flag:'🌍',affects:'steel',sev:.4,dur:150},{name:'US-EU Zölle',flag:'🇺🇸',affects:'rev',sev:.25,dur:200}];const e=embs[Math.floor(Math.random()*embs.length)];G.embargos.push({...e,remaining:e.dur,id:Date.now()});addEv('🚫 <span style="color:var(--rd)">EMBARGO: '+e.flag+' '+e.name+'</span>');notify('⚠️ Embargo: '+e.name,'err');}}
  G.embargos.forEach(e=>{e.remaining--;if(e.affects==='elec'&&!G.insurance['ins_supply'])G.res.elec.v=Math.max(0,G.res.elec.v-1);if(e.affects==='steel'&&!G.insurance['ins_supply'])G.res.steel.v=Math.max(0,G.res.steel.v-1.5);});
  G.embargos=G.embargos.filter(e=>e.remaining>0);
  // Auto-save
  G.autoSaveTimer++;
  document.getElementById('pbtn').style.display=G.prod>=1000?'block':'none';
}

function aiTick(){
  RIVALS.forEach(r=>{
    r.ca+=700000*(.8+Math.random()*.4);
    if(Math.random()<r.ag*.1){
      const x=Math.random();let msg='';
      if(x<.3){r.sh=Math.max(2,r.sh-Math.random()*.3);msg='Preissenkung';}
      else if(x<.55){r.sh=Math.min(26,r.sh+.2);msg='Neues Modell';}
      else if(x<.7){if(!G.pricewarActive&&Math.random()<.15){G.pricewarActive=true;G.pricewarTimer=120;notify('⚔️ '+r.n+' startet Preiskampf!','err');addEv('<span style="color:var(--rd)">⚔️ PREISKAMPF von '+r.n+'!</span>');}msg='Preiskampf';}
      else if(x<.85){if(G.mergerCD===0&&Math.random()<.1){G.mergerOffers.push({from:r,amount:Math.floor(G.money*1.5+Math.random()*5e6),id:Date.now()});G.mergerCD=300;notify('🤝 Fusionsangebot von '+r.n+'!','info');}msg='Fusionsangebot';}
      else{
        // KI attack
        const atks=[{n:'Patentklage',emoji:'⚖️',d:'money',v:250000},{n:'PR-Angriff',emoji:'📰',d:'rep',v:12},{n:'Mitarbeiter abgeworben',emoji:'👔',d:'eng',v:1}];
        const atk=atks[Math.floor(Math.random()*atks.length)];
        const blocked=G.defenseLevel>=2;
        if(!blocked){
          if(atk.d==='money'){G.money=Math.max(0,G.money-atk.v);floatMoney(atk.v,false);}
          if(atk.d==='rep')G.rep=Math.max(0,G.rep-atk.v);
          if(atk.d==='eng')G.engineers=Math.max(1,G.engineers-1);
          G.kiAttacks.push({rival:r.n,icon:r.ic,atk:atk.n,emoji:atk.emoji,blocked:false,when:G.y+'Q'+G.q});
          addEv(r.ic+' <span style="color:var(--rd)">'+r.n+' ANGRIFF: '+atk.emoji+' '+atk.n+'</span>');
          notify(r.n+' greift an: '+atk.n,'err');
        } else {
          G.kiAttacks.push({rival:r.n,icon:r.ic,atk:atk.n,emoji:atk.emoji,blocked:true,when:G.y+'Q'+G.q});
          notify(r.n+' Angriff geblockt!','ok');
        }
        msg='Angriff';
      }
      addAI(r.ic+' <b style="color:'+r.cl+'">'+r.n+'</b>: '+msg);
    }
  });
  if(G.mergerCD>0)G.mergerCD--;
  const ms=G.share,sum=RIVALS.reduce((s,r)=>s+r.sh,0),scale=(100-ms)/Math.max(1,sum);
  RIVALS.forEach(r=>r.sh=Math.max(2,r.sh*scale*(.97+Math.random()*.06)));
}

function stockTick(){
  const pf=(dailyRev()>0?Math.min(2,dailyRev()/100000):.5)-.5;
  const ch=1+(pf*.01+(Math.random()-.5)*.06+(G.pricewarActive?-.02:0)+(G.activeEvent?.type==='crisis'?-.03:G.activeEvent?.type==='good'?.02:0));
  G.stockPrice=Math.max(10,G.stockPrice*ch);
  G.stockHistory.push(Math.round(G.stockPrice*100)/100);
  if(G.stockHistory.length>20)G.stockHistory.shift();
}

function commTick(){
  ['steel','aluminum','energy'].forEach(k=>{
    G.commMult[k]=Math.max(.5,Math.min(3,G.commMult[k]*(1+(Math.random()-.48)*.15)));
    G.commHist[k].push(Math.round(G.commMult[k]*100)/100);
    if(G.commHist[k].length>8)G.commHist[k].shift();
  });
}

function eventTick(){
  if(G.activeEvent){G.activeEvent.dur--;if(G.activeEvent.dur<=0){addEv('📰 Event beendet: '+G.activeEvent.name);G.eventHistory.push(G.activeEvent);G.activeEvent=null;}return;}
  G.eventTimer--;
  if(G.eventTimer<=0){
    const ev=EVENTS[Math.floor(Math.random()*EVENTS.length)];
    G.activeEvent={...ev};G.eventTimer=180+Math.floor(Math.random()*180);
    if(ev.effect==='money'){G.money+=ev.val;floatMoney(ev.val,true);}
    if(ev.effect==='rep')G.rep=Math.min(100,G.rep+ev.val);
    if(ev.effect==='chip')G.res.elec.v*=ev.val;
    notify('📰 EVENT: '+ev.emoji+' '+ev.name,'info');
    addEv('📰 <span style="color:var(--pu)">'+ev.emoji+' '+ev.name+'</span> — '+ev.desc);
  }
}

// ── ACTIONS ──
function adMult(){let m=1;G.ads.forEach(id=>{const a=ADS.find(x=>x.id===id);if(a)m+=a.ev;});if(G.currentCEO?.effect==='adBoost')m*=G.currentCEO.val;return m;}
function dailyRev(){const sc=SEASON_CFG[G.season];const wmF=typeof WM!=='undefined'?(WM.globalDemand||100)/100:1;return G.lines.filter(l=>l.run).reduce((s,l)=>{const sm=(sc.bonus?.[l.veh.id]||1)*(sc.malus?.[l.veh.id]||1);const rb=Object.values(G.regions).filter(r=>r.unlocked).reduce((a,r)=>a+r.demand,0)/Math.max(1,Object.values(G.regions).filter(r=>r.unlocked).length);return s+l.veh.price*l.cap*(100/l.veh.t)*adMult()*(1+G.brand/200)*(1+G.showrooms.length*.02)*rb*sm*wmF;},0);}


// Force the RAF loop to rebuild the current tab on next frame
function forceTabRefresh(){
  // Get current tab and render it IMMEDIATELY — no waiting for next RAF frame
  var vid = document.querySelector('.view.on');
  vid = vid ? vid.id.replace('v-','') : '';
  if(vid) doTabRender(vid);
  // Reset cache so RAF re-caches new DOM elements
  _barCache = {};
  // Keep _lastVid matching so RAF doesn't double-render
  _lastVid = vid;
}

function upComp(id){const d=COMPS.find(c=>c.id===id);const lv=G.comp[id];if(lv>=d.max){notify('Max!','warn');return;}const cost=d.cost+lv*d.inc;if(G.money<cost){notify('Brauche €'+fm(cost),'err');return;}let ok=true;if(d.req)Object.entries(d.req).forEach(([k,v])=>{if(G.res[k]&&G.res[k].v<v)ok=false;});if(!ok){notify('Nicht genug Ressourcen!','err');return;}G.money-=cost;G.cost+=cost;if(d.req)Object.entries(d.req).forEach(([k,v])=>{if(G.res[k])G.res[k].v-=v;});G.comp[id]++;notify(d.name+' → Lvl '+G.comp[id],'ok');addEv('⚙️ <span style="color:var(--cy)">'+d.name+'</span> → Lvl '+G.comp[id]);spawnPtcls(window.innerWidth/2,window.innerHeight*.7,'#00d4ff',15);forceTabRefresh();}
function buildFac(id){const def=FACS.find(f=>f.id===id);if(G.facs.find(f=>f.id===id)){notify('Bereits vorhanden!','warn');return;}const cm=G.currentCEO?.effect==='facCost'?G.currentCEO.val:1;const cost=def.cost*cm;if(G.money<cost){notify('Brauche €'+fm(cost),'err');return;}G.money-=cost;G.cost+=cost;G.facs.push({...def});addEv('🏭 <span style="color:var(--gn)">'+def.name+'</span> in '+def.city);notify(def.name+' gebaut!','ok');spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',30);forceTabRefresh();}
function launchVeh(id){const v=VEHS.find(x=>x.id===id);for(const r of v.req){if(G.comp[r]<1){const c=COMPS.find(x=>x.id===r);notify('Benötigt: '+(c?.name||r),'err');return;}}const sc=v.pc*5;if(G.money<sc){notify('Brauche €'+fm(sc),'err');return;}G.money-=sc;G.cost+=sc;G.vehs[id].on=true;G.lines.push({id:id+'_'+Date.now(),veh:v,run:true,p:0,rate:100/v.t,cap:v.cap});addEv('🚗 <span style="color:var(--gn)">'+v.name+'</span> Produktion gestartet!');notify(v.name+' aktiv!','ok');spawnPtcls(window.innerWidth/2,window.innerHeight*.6,'#00ff88',25);forceTabRefresh();}
function startRD(ci,ii){const item=RD[ci].items[ii];if(G.rdone[item.id]){notify('Bereits erforscht!','warn');return;}if(G.active_rd){notify('Forschung läuft!','warn');return;}if(G.money<item.cost){notify('Brauche €'+fm(item.cost),'err');return;}G.money-=item.cost;G.cost+=item.cost;G.active_rd=item;G.rd_prog=0;addEv('🔬 Forschung: <span style="color:var(--cy)">'+item.name+'</span>');notify('Forschung: '+item.name,'ok');}
function togAd(id){if(G.ads.has(id)){G.ads.delete(id);notify('Gestoppt.','warn');}else{G.ads.add(id);notify('Kampagne aktiv!','ok');}forceTabRefresh();}
function togAuto(id){const a=AUTOS.find(x=>x.id===id);if(!G.autos[id]){if(G.money<a.cost){notify('Brauche €'+fm(a.cost),'err');return;}G.money-=a.cost;G.cost+=a.cost;G.autos[id]=true;addEv('🤖 <span style="color:var(--cy)">'+a.name+'</span> aktiv');notify(a.name+' aktiv!','ok');}else{G.autos[id]=false;notify(a.name+' deaktiviert.','warn');}forceTabRefresh();}
function togLine(lid){const l=G.lines.find(x=>x.id===lid);if(l)l.run=!l.run;}
function buyStk(n){const c=G.stockPrice*n;if(G.money<c){notify('Zu wenig Kapital!','err');return;}G.money-=c;G.stockOwned+=n;notify(n+' Aktien @ €'+G.stockPrice.toFixed(2),'ok');}
function sellStk(n){if(G.stockOwned<n){notify('Nicht genug Aktien!','err');return;}G.stockOwned-=n;G.money+=G.stockPrice*n;floatMoney(G.stockPrice*n,true);notify(n+' Aktien verkauft','ok');}
function takeLoan(amt,rate,term){if(G.loans.length>=3){notify('Max 3 Kredite!','warn');return;}const r=G.currentCEO?.effect==='loanRate'?rate*G.currentCEO.val:rate;G.loans.push({id:++G.loanId,amount:amt,rate:r,term,monthly:amt*(1+r)/term,remaining:amt*(1+r)});G.money+=amt;notify('Kredit €'+fm(amt)+' aufgenommen','ok');floatMoney(amt,true);}
function acceptMerger(id){const o=G.mergerOffers.find(x=>x.id==id);if(!o)return;G.money+=o.amount;G.mergerOffers=G.mergerOffers.filter(x=>x.id!=id);notify('Fusion angenommen! +€'+fm(o.amount),'ok');floatMoney(o.amount,true);addEv('🤝 <span style="color:var(--gn)">Fusion: +€'+fm(o.amount)+'</span>');}
function rejectMerger(id){G.mergerOffers=G.mergerOffers.filter(x=>x.id!=id);notify('Abgelehnt.','warn');}
function hireCEO(i){if(G.money<1e6){notify('Kostet €1 Mio.','err');return;}G.money-=1e6;G.currentCEO=CEO_POOL[i];notify('CEO '+CEO_POOL[i].name+' engagiert!','ok');addEv('👔 <span style="color:var(--gn)">CEO '+CEO_POOL[i].name+'</span> — '+CEO_POOL[i].bonus);}
function hireMech(){if(G.money<50000){notify('Kostet €50k','err');return;}G.money-=50000;G.workerCount+=10;G.workerHappy=Math.min(100,G.workerHappy+2);notify('+10 Mitarbeiter','ok');}
function hireEng(){if(G.money<150000){notify('Kostet €150k','err');return;}G.money-=150000;G.engineers++;const names=['Alex Müller','Jana Koch','Kai Weber','Sara Fischer'];const specs=['Antrieb','Elektronik','Design','Fahrwerk'];const emojis=['👨‍🔬','👩‍💻','🎨','🔧'];G.engTeam.push({name:names[Math.floor(Math.random()*names.length)],spec:specs[Math.floor(Math.random()*specs.length)],lvl:1,xp:0,xpN:100,emoji:emojis[Math.floor(Math.random()*emojis.length)]});notify('Ingenieur eingestellt!','ok');forceTabRefresh();}
function raiseSal(){if(G.money<500000){notify('Kostet €500k','err');return;}G.money-=500000;G.workerHappy=Math.min(100,G.workerHappy+20);notify('Gehälter erhöht +20 Zufriedenheit','ok');}
function unlockRegion(id){const r=G.regions[id];if(r.unlocked){notify('Bereits freigeschaltet!','warn');return;}if(G.money<r.cost){notify('Brauche €'+fm(r.cost),'err');return;}G.money-=r.cost;r.unlocked=true;r.dealers=1;notify(r.name+' freigeschaltet!','ok');addEv('🗺️ <span style="color:var(--gn)">'+r.name+'</span> erschlossen!');}
function addDealer(id){const r=G.regions[id];if(!r.unlocked){notify('Region zuerst freischalten!','err');return;}const c=200000+r.dealers*100000;if(G.money<c){notify('Brauche €'+fm(c),'err');return;}G.money-=c;r.dealers++;notify('Händler in '+r.name+' hinzugefügt','ok');}
function buildShowroom(i){const loc=SHOWROOM_LOCS[i];if(G.showrooms.find(s=>s.city===loc.city)){notify('Bereits vorhanden!','warn');return;}if(G.money<loc.cost){notify('Kostet €'+fm(loc.cost),'err');return;}G.money-=loc.cost;G.showrooms.push({...loc,opened:G.y+'Q'+G.q});notify('Showroom '+loc.city+' eröffnet!','ok');addEv('🏪 <span style="color:var(--gn)">'+loc.flag+' '+loc.city+'</span> Showroom eröffnet!');}
function unlockTuning(){if(G.money<1e6){notify('Kostet €1 Mio.','err');return;}G.money-=1e6;G.tuningDept=true;notify('Tuning-Abteilung aktiv!','ok');forceTabRefresh();}
function applyTuning(vid,pkgId){if(!G.tuningDept){notify('Tuning-Abteilung benötigt!','err');return;}const pkgs=[{id:'sport',name:'Sport-Paket',emoji:'🏎️',cost:80000,pm:.08,req:'eng_v6'},{id:'luxury',name:'Luxury-Paket',emoji:'💎',cost:120000,pm:.12,req:'int_lux'},{id:'electric',name:'E-Performance',emoji:'⚡',cost:100000,pm:.10,req:'eng_elec'},{id:'offroad',name:'Offroad-Paket',emoji:'🏔️',cost:90000,pm:.09,req:'awd'},{id:'amg',name:'AMG-Line',emoji:'🔥',cost:150000,pm:.15,req:'body_cfk'}];const pkg=pkgs.find(p=>p.id===pkgId);if(!pkg)return;if(G.money<pkg.cost){notify('Kostet €'+fm(pkg.cost),'err');return;}if(pkg.req&&G.comp[pkg.req]<1){const c=COMPS.find(x=>x.id===pkg.req);notify('Benötigt: '+(c?.name||pkg.req),'err');return;}G.money-=pkg.cost;G.tuningProjects[vid]=pkgId;const line=G.lines.find(l=>l.veh.id===vid);if(line)line.veh.pm=1+pkg.pm;G.rep=Math.min(100,G.rep+5);notify(pkg.name+' auf '+vid+' angewendet! Preis +'+Math.round(pkg.pm*100)+'%','ok');forceTabRefresh();}
function buildConcept(id){const cons=[{id:'ev_vision',name:'EX-Vision SUV',emoji:'🚀',cost:500000,rep:15,brand:10},{id:'gti_x',name:'GTI X-Treme',emoji:'🏁',cost:600000,rep:20,brand:12},{id:'phaeton_e',name:'Phaeton E-Concept',emoji:'💎',cost:800000,rep:25,brand:15},{id:'micro',name:'Polo Micro City',emoji:'🐞',cost:300000,rep:10,brand:8},{id:'autobid',name:'AutoBuzz L5',emoji:'🚌',cost:1000000,rep:30,brand:20}];const con=cons.find(c=>c.id===id);if(!con||G.concepts.includes(id)){notify('Bereits präsentiert!','warn');return;}if(G.money<con.cost){notify('Kostet €'+fm(con.cost),'err');return;}if(G.conceptCD>0){notify('Cooldown '+G.conceptCD+'s','warn');return;}G.money-=con.cost;G.concepts.push(id);G.rep=Math.min(100,G.rep+con.rep);G.brand=Math.min(100,G.brand+con.brand);G.conceptCD=120;notify(con.name+' präsentiert! Rep +'+con.rep,'ok');addEv('💡 <span style="color:var(--gn)">Konzept: '+con.emoji+' '+con.name+'</span> präsentiert!');spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#bb55ff',40);showBurst('Konzept!',con.name,'Rep +'+con.rep+' Brand +'+con.brand);forceTabRefresh();}
function buyInsurance(id){const ins={ins_factory:{cost:200000,name:'Werksversicherung'},ins_supply:{cost:150000,name:'Lieferk.-Versicherung'},ins_legal:{cost:100000,name:'Rechtsschutz'},ins_cyber:{cost:120000,name:'Cyber-Versicherung'}};const i=ins[id];if(!i||G.insurance[id]){notify('Bereits versichert!','warn');return;}if(G.money<i.cost){notify('Kostet €'+fm(i.cost),'err');return;}G.money-=i.cost;G.insurance[id]=true;notify(i.name+' abgeschlossen!','ok');}
function startSpy(id){const m={steal_tech:{cost:30,desc:'Technologie stehlen'},sabotage:{cost:50,desc:'Werk sabotieren'},headhunt:{cost:20,desc:'Ingenieur abwerben'},pr_attack:{cost:25,desc:'PR-Angriff starten'}};const mission=m[id];if(!mission){return;}if(G.spyPts<mission.cost){notify('Brauche '+mission.cost+' SP','err');return;}if(G.activeSpy){notify('Mission läuft!','warn');return;}G.spyPts-=mission.cost;G.activeSpy={id,name:mission.desc};G.spyTimer=60+Math.floor(Math.random()*60);notify('Mission: '+mission.desc,'info');addEv('🕵️ <span style="color:var(--pu)">Spionage-Mission</span>: '+mission.desc);}
function completeSpy(){const id=G.activeSpy?.id;if(id==='steal_tech'){const undone=RD.flatMap(c=>c.items).filter(r=>!G.rdone[r.id]);if(undone.length>0){const r=undone[Math.floor(Math.random()*undone.length)];G.rdone[r.id]=true;notify('Technologie gestohlen: '+r.name,'ok');}}if(id==='headhunt'){G.engineers+=2;notify('+2 Ingenieure abgeworben!','ok');}if(id==='sabotage'){const r=RIVALS[Math.floor(Math.random()*RIVALS.length)];r.sh=Math.max(2,r.sh-2);notify(r.n+' sabotiert!','ok');}if(id==='pr_attack'){notify('PR-Schaden bei Rivalen!','ok');}addEv('🕵️ <span style="color:var(--gn)">Mission abgeschlossen</span>');G.activeSpy=null;if(G.secLevel<2&&Math.random()<.2){G.money=Math.max(0,G.money-200000);floatMoney(200000,false);notify('⚠️ Gegenspionage: -€200k','err');}}
function upDefense(){const c=(G.defenseLevel+1)*400000;if(G.money<c){notify('Kostet €'+fm(c),'err');return;}G.money-=c;G.defenseLevel++;notify('Verteidigung Level '+G.defenseLevel,'ok');}
function filePatent(){if(G.patents.length===0){notify('Keine Patente!','err');return;}if(G.money<500000){notify('Kostet €500k','err');return;}G.money-=500000;if(Math.random()<.6){const a=500000+Math.random()*2e6;G.money+=a;notify('Patentklage gewonnen! +€'+fm(a),'ok');floatMoney(a,true);}else{notify('Patentklage verloren.','warn');}}
function startLobby(id){const pts={ev_sub:100,import_tax:150,co2_ex:80,rd_grant:60};const p=pts[id];if(!p)return;if(G.lobbyPts<p){notify('Brauche '+p+' LP','err');return;}G.lobbyPts-=p;if(id==='rd_grant'){G.money+=1e6;notify('Förderung: +€1 Mio.!','ok');floatMoney(1e6,true);}if(id==='co2_ex'){G.co2Index=Math.max(50,G.co2Index-30);notify('CO2-Ausnahme gesichert!','ok');}if(id==='ev_sub'){notify('E-Förderung aktiv!','ok');}addEv('🏛️ <span style="color:var(--pu)">Lobbying: '+id+'</span> erfolgreich');}
function buildRacing(){if(G.money<2e6){notify('Kostet €2 Mio.','err');return;}G.money-=2e6;G.racingTeam=true;G.racingLevel=1;G.nextRace={name:'Heimrennen Nürburgring',in:120,prize:500000};notify('Rennteam aufgebaut!','ok');addEv('🏎️ <span style="color:var(--gn)">Rennteam gegründet!</span>');}
function upRacing(){const c=G.racingLevel*1e6;if(G.money<c){notify('Kostet €'+fm(c),'err');return;}G.money-=c;G.racingLevel++;notify('Rennteam Level '+G.racingLevel,'ok');}
function bmBuy(id){const item=BM_ITEMS.find(x=>x.id===id);if(!item)return;if(G.money<item.cost){notify('Kostet €'+fm(item.cost),'err');return;}if(G.bmCD>0){notify('Gesperrt für '+G.bmCD+'s','err');return;}G.money-=item.cost;G.bmRisk=Math.min(100,G.bmRisk+item.risk);if(item.res==='patent'){const u=RD.flatMap(c=>c.items).filter(r=>!G.rdone[r.id]);if(u.length>0){const r=u[Math.floor(Math.random()*u.length)];G.rdone[r.id]=true;G.patents.push({id:'P'+Date.now(),name:r.name+'(BM)',filed:G.y+'Q'+G.q,val:50000});notify('Schwarzmarkt-Patent: '+r.name,'ok');}}else if(G.res[item.res])G.res[item.res].v=Math.min(G.res[item.res].max,G.res[item.res].v+item.amt);notify('🕶️ '+item.name+' erhalten','ok');if(G.bmRisk>70&&Math.random()<.3){const f=200000+Math.floor(Math.random()*300000);G.money=Math.max(0,G.money-f);G.rep=Math.max(0,G.rep-10);G.bmBusts++;G.bmRisk=Math.max(0,G.bmRisk-30);G.bmCD=120;notify('🚔 RAZZIA! -€'+fm(f)+' -10 Rep','err');floatMoney(f,false);addEv('🚔 <span style="color:var(--rd)">RAZZIA! Strafe -€'+fm(f)+'</span>');spawnPtcls(window.innerWidth/2,200,'#ff3355',25);}if(G.bmCD>0)G.bmCD--;}
function prestige(){if(G.prod<1000){notify('Brauche 1000 Fahrzeuge!','err');return;}const b=Math.floor(G.prod/1000)*500000;G.money=500000+b;G.rev=0;G.cost=0;G.prod=0;G.lines=[];G.active_rd=null;G.rd_prog=0;G.ads.clear();COMPS.forEach(c=>G.comp[c.id]=0);VEHS.forEach(v=>{G.vehs[v.id].on=false;G.vehs[v.id].n=0;});RD.forEach(cat=>cat.items.forEach(r=>G.rdone[r.id]=false));G.rep=Math.min(100,50+Object.values(G.autos).filter(Boolean).length*5);notify('PRESTIGE! Bonus €'+fm(b),'ok');addEv('✨ <span style="color:var(--go)">PRESTIGE</span> — Neustart mit €'+fm(G.money));showBurst('PRESTIGE!','Neues Spiel beginnt','Bonus: €'+fm(b));forceTabRefresh();}

function checkMS(){MS_DEF.forEach(m=>{if(!G.ms.has(m.id)&&m.c()){G.ms.add(m.id);G.money+=m.r;notify('🏆 '+m.n+' +€'+fm(m.r),'ok');addEv('🏆 <span style="color:var(--go)">'+m.n+'</span> +€'+fm(m.r));showBurst('🏆 '+m.n,'Meilenstein!','+€'+fm(m.r));spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',50);}});}
function checkCampaign(){MISSIONS.forEach(m=>{if(G.missionsDone.includes(m.id))return;if(m.check()){G.missionsDone.push(m.id);G.money+=m.r;if(m.id===G.campaignStep)G.campaignStep=Math.min(MISSIONS.length-1,m.id+1);addEv('📖 <span style="color:var(--gn)">MISSION: '+m.name+'</span> — +€'+fm(m.r));notify('📖 Mission: '+m.name,'ok');showBurst('📖 '+m.name,'Mission abgeschlossen!','+€'+fm(m.r));spawnPtcls(window.innerWidth/2,window.innerHeight/3,'#00d4ff',30);}});}

// ── RENDER ──
let _cc='Alle';
// ── SMART DOM UPDATER — prevents flicker by only updating changed text ──
// setTxt defined at top of script as window.setTxt
function setTxt(id,val,col){ window.setTxt(id,val,col); }
// setHTML defined at top of script as window.setHTML
function setHTML(id,html){ window.setHTML(id,html); }

function updateHeader(){
  setTxt('hm','€'+fm(G.money));
  const ch=(G.stockHistory.length>1?(G.stockPrice/G.stockHistory[G.stockHistory.length-2]-1)*100:0);
  setTxt('hstk','€'+Math.round(G.stockPrice),ch>=0?'var(--gn)':'var(--rd)');
  setTxt('hsh',G.share.toFixed(1)+'%');
  setTxt('hesg',Math.round(G.esgScore)+'',G.esgScore>60?'var(--gn)':G.esgScore>30?'var(--go)':'var(--rd)');
  setTxt('hqy','Q'+G.q+'J'+G.y);
}

function updateProdBars(){
  G.lines.forEach(l=>{
    const bar=document.querySelector('[data-lid="'+l.id+'"] .plbar-f');
    const eta=document.querySelector('[data-lid="'+l.id+'"] .pleta');
    if(bar)bar.style.width=l.p.toFixed(1)+'%';
    if(eta)eta.textContent=(l.rate>0?Math.ceil((100-l.p)/l.rate):'?')+'s';
  });
}

// ═══════════════════════════════════════════════════════════
//  RAF LIVE UPDATE SYSTEM
//  requestAnimationFrame = smooth 60fps, browser-native,
//  zero setTimeout drift, zero innerHTML on hot path.
//  Each frame: only update what actually changed.
// ═══════════════════════════════════════════════════════════

var _rafRunning = false;
var _lastVid = '';
var _slowTick = 0;
var _lastTickCount = -1;

function startRAF(){
  if(_rafRunning) return;
  _rafRunning = true;
  rafLoop();
}

function rafLoop(){
  requestAnimationFrame(function(){
    if(_rafRunning) rafLoop();

    // ── 1. Header stats — every frame, text only ──
    liveHeader();

    // ── 2. Production bars — every frame, style.width only ──
    liveProdBars();

    // ── 3. Tab-specific live updates — every frame ──
    var vid = document.querySelector('.view.on');
    vid = vid ? vid.id.replace('v-','') : '';

    // On tab change: do a full rebuild of that tab
    if(vid !== _lastVid){
      _lastVid = vid;
      _tabJustChanged = true;
      doTabRender(vid);
      setTimeout(function(){ _tabJustChanged = false; }, 100);
    } else {
      // Same tab: live-update numbers only (no innerHTML)
      liveTabUpdate(vid);
    }
  });
}

// ── Live header — pure textContent, runs every RAF frame ──
function liveHeader(){
  var m = '€'+fm(G.money||0);
  var hm = document.getElementById('hm');
  if(hm && hm.textContent !== m) hm.textContent = m;

  var ch = G.stockHistory && G.stockHistory.length > 1
    ? (G.stockPrice / G.stockHistory[G.stockHistory.length-2] - 1) * 100 : 0;
  var sv = '€'+Math.round(G.stockPrice||100);
  var sc = ch >= 0 ? 'var(--gn)' : 'var(--rd)';
  var hstk = document.getElementById('hstk');
  if(hstk){ if(hstk.textContent!==sv) hstk.textContent=sv; if(hstk.style.color!==sc) hstk.style.color=sc; }

  var sh = (G.share||0).toFixed(1)+'%';
  var hsh = document.getElementById('hsh');
  if(hsh && hsh.textContent !== sh) hsh.textContent = sh;

  var eg = Math.round(G.esgScore||50)+'';
  var ec = G.esgScore>60?'var(--gn)':G.esgScore>30?'var(--go)':'var(--rd)';
  var hesg = document.getElementById('hesg');
  if(hesg){ if(hesg.textContent!==eg) hesg.textContent=eg; if(hesg.style.color!==ec) hesg.style.color=ec; }

  var qy = 'Q'+(G.q||1)+'J'+(G.y||1);
  var hqy = document.getElementById('hqy');
  if(hqy && hqy.textContent !== qy) hqy.textContent = qy;
}

// ── Live production bars — runs every RAF frame ──
// Uses cached element references for maximum speed
var _barCache = {};
function liveProdBars(){
  for(var i=0; i<G.lines.length; i++){
    var l = G.lines[i];
    var lid = l.id;

    // Build cache entry on first encounter
    if(!_barCache[lid]){
      var root = document.querySelector('[data-lid="'+lid+'"]');
      if(!root) continue;
      _barCache[lid] = {
        bar:   root.querySelector('.plbar-f'),
        eta:   root.querySelector('.pleta'),
        cnt:   root.querySelector('.pl-count'),
        stat:  root.querySelector('.pl-status'),
        btn:   root.querySelector('.btn.sm'),
      };
    }
    var el = _barCache[lid];
    if(!el || !el.bar) continue;

    // Width: the core fix — update every frame so it animates smoothly
    var w = l.p.toFixed(1)+'%';
    if(el.bar.style.width !== w) el.bar.style.width = w;

    // ETA countdown
    var etaVal = l.rate > 0 ? Math.ceil((100 - l.p) / l.rate)+'s' : '?s';
    if(el.eta && el.eta.textContent !== etaVal) el.eta.textContent = etaVal;

    // Produced count
    var vst = G.vehs[l.veh.id];
    var cntVal = (vst ? vst.n : 0)+' prod.';
    if(el.cnt && el.cnt.textContent !== cntVal) el.cnt.textContent = cntVal;

    // Run/pause status
    var stTxt = l.run ? '■ AKTIV' : '⏸ PAUSE';
    var stCol = l.run ? 'var(--gn)' : 'var(--or)';
    if(el.stat){
      if(el.stat.textContent !== stTxt) el.stat.textContent = stTxt;
      if(el.stat.style.color !== stCol) el.stat.style.color = stCol;
    }

    // Toggle button label
    if(el.btn){
      var btnTxt = l.run ? '⏸' : '▶';
      if(el.btn.textContent !== btnTxt) el.btn.textContent = btnTxt;
    }
  }
  // Clear cache entries for lines that no longer exist
  var activeIds = G.lines.map(function(l){ return l.id; });
  Object.keys(_barCache).forEach(function(k){
    if(activeIds.indexOf(k) === -1) delete _barCache[k];
  });
}

// ── Live tab updates — text/style only, per tab ──
function liveTabUpdate(vid){
  if(vid === 'dash'){
    var rev = '€'+fm(dailyRev()); var dr = document.getElementById('d-rev');
    if(dr && dr.textContent!==rev) dr.textContent=rev;
    var prd = fm(G.prod); var dp = document.getElementById('d-prod');
    if(dp && dp.textContent!==prd) dp.textContent=prd;
    var mod = ''+VEHS.filter(function(v){return G.vehs[v.id]&&G.vehs[v.id].on;}).length;
    var dm = document.getElementById('d-mod');
    if(dm && dm.textContent!==mod) dm.textContent=mod;
    var tl = ''+G.tech; var dt = document.getElementById('d-tl');
    if(dt && dt.textContent!==tl) dt.textContent=tl;
    // Event alerts — rebuild only when key changes
    var ea = document.getElementById('ev-alerts');
    if(ea){
      var key = (G.activeEvent?G.activeEvent.name:'')+(G.pricewarActive?'1':'0')+G.embargos.length;
      if(ea._k !== key){
        ea._k = key;
        var h='';
        if(G.activeEvent) h='<div class="ev-alert '+(G.activeEvent.type==='crisis'?'crisis':'good')+'"><b>'+G.activeEvent.emoji+' '+G.activeEvent.name+'</b> — '+G.activeEvent.desc+'<div style="font-size:10px;color:var(--dm);margin-top:3px;">'+G.activeEvent.dur+'s</div></div>';
        if(G.pricewarActive) h+='<div class="ev-alert crisis"><b>⚔️ PREISKAMPF</b> — '+G.pricewarTimer+'s</div>';
        if(G.embargos.length) h+='<div class="ev-alert crisis"><b>🚫 Embargo aktiv</b></div>';
        ea.innerHTML = h;
      }
    }
    return;
  }
  if(vid === 'fin'){
    window.setTxt('f-rev','€'+fm(G.rev));
    window.setTxt('f-cost','€'+fm(G.cost));
    window.setTxt('f-pft','€'+fm(G.rev-G.cost));
    window.setTxt('f-val','€'+fm(G.money*8+G.rev*2+(G.stockOwned||0)*(G.stockPrice||100)));
    return;
  }
  if(vid === 'boerse'){
    var p = G.stockHistory&&G.stockHistory.length>1?G.stockHistory[G.stockHistory.length-2]:G.stockPrice;
    var chg = ((G.stockPrice/p-1)*100);
    window.setTxt('stk-big','€'+G.stockPrice.toFixed(2));
    window.setTxt('stk-chg',(chg>=0?'+':'')+chg.toFixed(2)+'%',chg>=0?'var(--gn)':'var(--rd)');
    return;
  }
  if(vid === 'markt'){
    // Update share bars directly
    var all = [{n:'Du',sh:G.share,cl:'var(--cy)'}].concat(RIVALS.map(function(r){return{n:r.n,sh:r.sh,cl:r.cl};}));
    all.sort(function(a,b){return b.sh-a.sh;});
    var pbs = document.querySelectorAll('#mkt-bars .pb');
    var svs = document.querySelectorAll('#mkt-bars .sv');
    all.forEach(function(p,i){
      if(pbs[i]){ var w=Math.min(100,p.sh/30*100).toFixed(0)+'%'; if(pbs[i].style.width!==w) pbs[i].style.width=w; }
      if(svs[i]){ var t=p.sh.toFixed(1)+'%'; if(svs[i].textContent!==t) svs[i].textContent=t; }
    });
    return;
  }
  if(vid === 'forsch'){
    if(G.active_rd){
      var rb = document.querySelector('.rn.doing .rnpb');
      if(rb){ var fw=G.rd_prog.toFixed(0)+'%'; if(rb.style.width!==fw) rb.style.width=fw; }
      var rl = document.querySelector('.rn.doing .rd-left');
      if(rl){ var lt=Math.round(100-G.rd_prog)+'% left'; if(rl.textContent!==lt) rl.textContent=lt; }
    }
    return;
  }
  if(vid === 'wirtschaft' && typeof WM!=='undefined'){
    var wvals = [(G.gdpGrowth>=0?'+':'')+G.gdpGrowth.toFixed(1)+'%',G.interestRate.toFixed(1)+'%',G.inflation.toFixed(1)+'%',G.unemployment.toFixed(1)+'%'];
    var wcols = [G.gdpGrowth>=0?'var(--gn)':'var(--rd)',G.interestRate>4?'var(--rd)':'var(--go)',G.inflation>3?'var(--rd)':'var(--go)',G.unemployment>7?'var(--rd)':'var(--gn)'];
    ['eco-gdp','eco-rate','eco-inf','eco-unemp'].forEach(function(id,i){ window.setTxt(id,wvals[i],wcols[i]); });
    return;
  }
  if(vid === 'weltmarkt' && typeof WM!=='undefined'){
    window.setTxt('wm-demand',Math.round(WM.globalDemand)+'%',WM.globalDemand>100?'var(--gn)':WM.globalDemand>85?'var(--go)':'var(--rd)');
    window.setTxt('wm-oil','$'+Math.round(WM.oil),WM.oil>100?'var(--rd)':WM.oil>80?'var(--go)':'var(--gn)');
    window.setTxt('wm-usd',WM.eurUsd.toFixed(2),WM.eurUsd>1.0?'var(--gn)':'var(--rd)');
    window.setTxt('wm-steel','$'+Math.round(WM.steelTon),WM.steelTon>800?'var(--rd)':WM.steelTon>600?'var(--go)':'var(--gn)');
    return;
  }
  if(vid === 'personal'){
    window.setTxt('p-total',''+G.workerCount);
    var ph=G.workerHappy; window.setTxt('p-happy',ph+'%',ph>70?'var(--gn)':ph>40?'var(--go)':'var(--rd)');
    return;
  }
  if(vid === 'politik'){
    window.setTxt('pol-lp',(G.lobbyPts||0).toFixed(0));
    window.setTxt('pol-co2',(G.co2Index||100).toFixed(0),G.co2Index<80?'var(--gn)':G.co2Index<120?'var(--go)':'var(--rd)');
    return;
  }
  if(vid === 'lieferkette'){
    var sch=G.scHealth||100,scr=G.scRisk||0;
    window.setTxt('sc-health',sch.toFixed(0)+'%',sch>80?'var(--gn)':sch>50?'var(--go)':'var(--rd)');
    window.setTxt('sc-risk',scr.toFixed(0)+'%',scr>50?'var(--rd)':scr>25?'var(--go)':'var(--gn)');
    return;
  }
  // All other tabs: static until revisited
}

// ── Full tab rebuild — only on tab switch ──
function doTabRender(vid){
  switch(vid){
    case'dash':rDash();break;case'kompo':rKompo();break;case'fahr':rFahr();break;
    case'prod':rProd();break;case'forsch':rForsch();break;case'markt':rMarkt();break;
    case'region':rRegion();break;case'rohstoff':rRohstoff();break;case'personal':rPersonal();break;
    case'boerse':rBoerse();break;case'bank':rBank();break;case'politik':rPolitik();break;
    case'racing':rRacing();break;case'spionage':rSpionage();break;case'patente':rPatente();break;
    case'showrooms':rShowrooms();break;case'werb':rWerb();break;case'auto':rAutoList();break;
    case'werke':rWerke();break;case'tuning':renderTuning();break;case'konzept':renderKonzept();break;
    case'roadmap':rRoadmap();break;case'embargo':rEmbargo();break;case'wetter':rWetter();break;
    case'kiangriff':rKiAngriff();break;case'saison':rSaison();break;case'qualitaet':rQualitaet();break;
    case'blackmarket':rBM();break;case'ingenieure':renderIngenieure();break;
    case'kampagne':rKampagne();break;case'ranking':rRanking();break;
    case'weltkarte':rWeltkarte();break;case'fin':rFin();break;case'speichern':rSpeichern();break;
    case'wirtschaft':if(typeof rWirtschaft==='function')rWirtschaft();break;
    case'ankuendigungen':if(typeof rAnkuendigungen==='function')rAnkuendigungen();break;
    case'fusion2':if(typeof rFusion2==='function')rFusion2();break;
    case'lieferkette':if(typeof rLieferkette==='function')rLieferkette();break;
    case'nachhaltigkeit':if(typeof rNachhaltigkeit==='function')rNachhaltigkeit();break;
    case'absatz':if(typeof rAbsatz==='function')rAbsatz();break;
    case'news':if(typeof rNews==='function')rNews();break;
    case'aktien2':if(typeof rPortfolio==='function')rPortfolio();break;
    case'ziele':if(typeof rZiele==='function')rZiele();break;
    case'lieferant2':if(typeof rPartner==='function')rPartner();break;
    case'forschlab':if(typeof rForschlab==='function')rForschlab();break;
    case'fahrzeugmarkt':if(typeof rFahrzeugmarkt==='function')rFahrzeugmarkt();break;
    case'mitbewerber2':if(typeof rMitbewerber2==='function')rMitbewerber2();break;
    case'weltmarkt':if(typeof rWeltmarkt==='function')rWeltmarkt();break;
    case'story':if(typeof rStory==='function')rStory();break;
  }
  // Clear prod bar cache after rebuild so new elements get re-cached
  _barCache = {};
}

// ── Legacy redrawLoop alias (keeps compatibility with wrapper chains) ──
function redrawLoop(){ /* replaced by RAF — no-op */ }
function _doFullRender(vid){
  window._tabJustChanged = true;
  doTabRender(vid);
  setTimeout(function(){ window._tabJustChanged = false; }, 100);
}
function _doSmartUpdate(vid){ liveTabUpdate(vid); }


function renderAll(){rDash();rKompo();rFahr();rProd();rForsch();rMarkt();rRegion();rRohstoff();rPersonal();rBoerse();rBank();rPolitik();rRacing();rSpionage();rPatente();rShowrooms();rWerb();rAutoList();rWerke();renderTuning();renderKonzept();rRoadmap();rEmbargo();rWetter();rKiAngriff();rSaison();rQualitaet();rBM();renderIngenieure();rKampagne();rRanking();rWeltkarte();rFin();rSpeichern();}

function plHTML(l){
  var eta=l.rate>0?Math.ceil((100-l.p)/l.rate):'?';
  var sc=SEASON_CFG[G.season];
  var sm=(sc.bonus&&sc.bonus[l.veh.id]||1)*(sc.malus&&sc.malus[l.veh.id]||1);
  var seasonTag=sm!==1?' <span style="font-size:10px;color:'+(sm>1?'var(--gn)':'var(--rd)')+';">'+(sm>1?'▲':'▼')+Math.round(Math.abs(sm-1)*100)+'%</span>':'';
  return '<div class="pl '+(l.run?'run':'pau')+'" data-lid="'+l.id+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
    +'<div>'
    +'<div style="font-size:13px;font-weight:700;">'+l.veh.e+' '+l.veh.name+seasonTag+'</div>'
    +'<div class="pl-count" style="font-size:10px;color:var(--t2);">'+G.vehs[l.veh.id].n+' prod.</div>'
    +'</div>'
    +'<button class="btn sm" onclick="togLine(\''+l.id+'\')">'+( l.run?'⏸':'▶')+'</button>'
    +'</div>'
    +'<div class="plbar">'
    +'<div class="plbar-f" style="width:'+l.p.toFixed(1)+'%"></div>'
    +'<div class="pleta">'+eta+'s</div>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:var(--t2);">'
    +'<span class="pl-status" style="color:'+(l.run?'var(--gn)':'var(--or)')+';">'+(l.run?'■ AKTIV':'⏸ PAUSE')+'</span>'
    +'<span>€'+fm(l.veh.price*l.cap)+'/Zyklus</span>'
    +'</div>'
    +'</div>';
}

function rDash(){
  document.getElementById('d-rev').textContent='€'+fm(dailyRev());
  document.getElementById('d-prod').textContent=fm(G.prod);
  document.getElementById('d-mod').textContent=VEHS.filter(v=>G.vehs[v.id]?.on).length;
  document.getElementById('d-tl').textContent=G.tech;
  // Event alerts
  const ea=document.getElementById('ev-alerts');
  if(ea){let h='';if(G.activeEvent)h='<div class="ev-alert '+(G.activeEvent.type==='crisis'?'crisis':'good')+'"><b>'+G.activeEvent.emoji+' '+G.activeEvent.name+'</b> — '+G.activeEvent.desc+'<div style="font-size:10px;color:var(--dm);margin-top:3px;">Verbleibend: '+G.activeEvent.dur+'s</div></div>';if(G.pricewarActive)h+='<div class="ev-alert crisis"><b>⚔️ PREISKAMPF AKTIV</b> — Preise -15% · '+G.pricewarTimer+'s</div>';if(G.embargos.length>0)h+='<div class="ev-alert crisis"><b>🚫 '+G.embargos.length+' Embargo(s) aktiv</b></div>';ea.innerHTML=h;}
  // Guide
  rGuide();
  const el=document.getElementById('dash-lines');
  if(!el)return;
  if(G.lines.length===0){el.innerHTML='<div style="color:var(--dm);font-size:12px;text-align:center;padding:14px;background:var(--card);border-radius:8px;border:1px dashed var(--bdr);">Folge dem Guide ⬆</div>';return;}
  el.innerHTML=G.lines.map(l=>plHTML(l)).join('');
}

function rGuide(){
  const el=document.getElementById('guide-panel');if(!el)return;
  const S=(done,text,action,btnLabel)=>({done,text,action,btnLabel});
  const c=id=>G.comp[id]>=1;const v=id=>G.vehs[id]?.on;
  const steps=[];
  steps.push(S(c('eng_base'),'<b>4-Zyl. Benziner</b> Lvl 1 — €50k · 50 Stahl + 20 Alu',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Antrieb')",'→ Antrieb'));
  steps.push(S(c('body_st'),'<b>Stahlkarosserie</b> Lvl 1 — €40k · 100 Stahl',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Karosserie')",'→ Karosserie'));
  steps.push(S(c('chassis'),'<b>Basis-Plattform</b> Lvl 1 — €60k · 80 Stahl + 30 Gummi',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Fahrwerk')",'→ Fahrwerk'));
  if(c('eng_base')&&c('body_st')&&c('chassis'))steps.push(S(v('polo'),'🚙 <b>Polo Neo starten</b> — alle Anforderungen erfüllt!',"sv('fahr',document.querySelectorAll('.nb')[2])",'→ Fahrzeuge'));
  if(v('polo')||G.lines.length>0){
    steps.push(S(c('int_base'),'<b>Std. Interieur</b> Lvl 1 — wird für Golf benötigt',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Innenraum')",'→ Innenraum'));
    if(c('int_base'))steps.push(S(v('golf'),'🚗 <b>Golf X starten</b> — Benziner + Stahl + Chassis + Interieur',"sv('fahr',document.querySelectorAll('.nb')[2])",'→ Fahrzeuge'));
    steps.push(S(G.ads.size>0,'📺 <b>Werbung einschalten</b> — Social Media reicht für Anfang',"sv('werb',document.querySelectorAll('.nb')[16])",'→ Werbung'));
    steps.push(S(Object.values(G.rdone).some(Boolean),'🔬 <b>Erste Forschung starten</b> — ABS kostet nur €80k',"sv('forsch',document.querySelectorAll('.nb')[4])",'→ Forschung'));
  }
  if(G.prod>=50){
    steps.push(S(c('eng_v6'),'<b>V6 Benziner</b> — für Tiguan, Passat, Arteon, Touareg',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Antrieb')",'→ Antrieb'));
    steps.push(S(c('body_alu'),'<b>Aluminiumrahmen</b> — alle V6-Fahrzeuge benötigen Alu',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Karosserie')",'→ Karosserie'));
    if(c('eng_v6')&&c('body_alu')&&c('awd'))steps.push(S(v('tiguan'),'🛻 <b>Tiguan Pro</b> starten — V6 + Alu + Allrad ✓',"sv('fahr',document.querySelectorAll('.nb')[2])",'→ Fahrzeuge'));
  }
  if(G.prod>=100){
    steps.push(S(c('eng_elec'),'<b>E-Motor</b> — Schlüssel für ID.4, Beetle-E, ID. Buzz',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Antrieb')",'→ Antrieb'));
    steps.push(S(c('battery'),'<b>Batteriepaket</b> — Pflicht für alle E-Fahrzeuge',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Elektronik')",'→ Elektronik'));
    steps.push(S(Object.values(G.regions).filter(r=>r.unlocked).length>=2,'🗺️ <b>USA Markt erschließen</b> — +20% Nachfragebonus',"sv('region',document.querySelectorAll('.nb')[6])",'→ Regionen'));
  }
  if(G.prod>=500){
    steps.push(S(G.racingTeam,'🏎️ <b>Rennteam aufbauen</b> — Rep & Markenimage-Boost',"sv('racing',document.querySelectorAll('.nb')[12])",'→ Racing'));
    steps.push(S(G.showrooms.length>=2,'🏪 <b>Showrooms bauen</b> — +2% Verkauf pro Showroom',"sv('showrooms',document.querySelectorAll('.nb')[15])",'→ Showrooms'));
  }
  const todo=steps.filter(s=>!s.done).slice(0,3);
  const done=steps.filter(s=>s.done).length;
  if(todo.length===0){document.getElementById('guide-panel').innerHTML='<div class="guide"><div class="guide-t">🏆 Alles läuft super!</div></div>';return;}
  document.getElementById('guide-panel').innerHTML='<div class="guide"><div class="guide-t">🚀 Nächste Schritte ('+done+'/'+steps.length+')</div>'
    +todo.map((s,i)=>'<div class="step '+(s.done?'sdone':'')+'"><div class="sn">'+(s.done?'✓':i+1)+'</div><div class="st">'+s.text+(s.action?'<br><span class="sbtn" onclick="'+s.action+'">'+s.btnLabel+'</span>':'')+'</div></div>').join('')+'</div>';
}

function rKompo(){
  const cats=['Alle',...new Set(COMPS.map(c=>c.cat))];
  const ce=document.getElementById('comp-cats');if(!ce)return;
  ce.innerHTML=cats.map(c=>'<button class="btn sm" style="'+(c===_cc?'border-color:var(--cy);color:var(--cy);':'')+'" onclick="setCat(\''+c+'\')">'+c+'</button>').join('');
  const filtered=_cc==='Alle'?COMPS:COMPS.filter(c=>c.cat===_cc);
  const el=document.getElementById('comp-list');if(!el)return;
  const cu={};VEHS.forEach(v=>v.req.forEach(r=>{if(!cu[r])cu[r]=[];cu[r].push(v);}));
  el.innerHTML=filtered.map(c=>{
    const lv=G.comp[c.id],maxed=lv>=c.max,cost=c.cost+lv*c.inc,can=!maxed&&G.money>=cost;
    const rOk=!c.req||Object.entries(c.req).every(([k,v])=>G.res[k]&&G.res[k].v>=v);
    const unlocks=cu[c.id]||[];
    let h='<div class="card '+(maxed?'done':'')+'">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;"><span style="font-size:14px;font-weight:700;">'+c.icon+' '+c.name+'</span><span class="badge '+(maxed?'bo':'bc')+'">'+(maxed?'MAX':'Lvl '+lv+'/'+c.max)+'</span></div>';
    h+='<div class="pw"><div class="pb '+(maxed?'go':'cy')+'" style="width:'+(lv/c.max*100).toFixed(0)+'%"></div></div>';
    if(unlocks.length>0){h+='<div style="margin:6px 0 3px;font-size:10px;color:var(--dm);text-transform:uppercase;">Schaltet frei:</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px;">';unlocks.forEach(v=>{const on=G.vehs[v.id]?.on;const rdy=v.req.every(r=>G.comp[r]>=1);const col=on?'var(--gn)':rdy?'var(--cy)':lv>=1?'var(--go)':'var(--dm)';h+='<span style="font-size:10px;border:1px solid '+col+';color:'+col+';padding:2px 7px;border-radius:4px;">'+v.e+' '+v.name+(on?' ✓':'')+'</span>';});h+='</div>';}
    if(c.req&&!maxed){h+='<div style="background:var(--bg3);border-radius:6px;padding:6px 8px;margin-bottom:7px;">';Object.entries(c.req).forEach(([k,v])=>{const r=G.res[k];const cur=Math.floor(r?.v||0);const ok=cur>=v;h+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span style="color:var(--t2);">'+(r?.icon||'')+' '+(r?.name||k)+'</span><span style="color:'+(ok?'var(--gn)':'var(--rd)')+';font-weight:700;">'+cur+'/'+v+(ok?' ✓':'')+'</span></div><div style="height:3px;background:var(--bg);border-radius:2px;margin-bottom:3px;"><div style="height:100%;width:'+Math.min(100,cur/v*100).toFixed(0)+'%;background:'+(ok?'var(--gn)':'var(--rd)')+';border-radius:2px;"></div></div>';});h+='</div>';}
    h+='<button class="btn '+(maxed?'mx':can&&rOk?'can':'')+'" onclick="upComp(\''+c.id+'\')" '+(maxed?'disabled':'')+'>'+( maxed?'✓ MAXED':!rOk?'⚠ Ressourcen fehlen — €'+fm(cost):can?'⬆ Upgrade Lvl '+(lv+1)+' — €'+fm(cost):'💰 Zu wenig — €'+fm(cost))+'</button>';
    if(lv<1&&unlocks.some(v=>!G.vehs[v.id]?.on))h+='<div style="margin-top:5px;padding:4px 8px;background:rgba(255,51,85,.08);border:1px solid rgba(255,51,85,.3);border-radius:5px;font-size:10px;color:var(--rd);">⚠ Lvl 1 nötig für: '+unlocks.filter(v=>!G.vehs[v.id]?.on).map(v=>v.e+' '+v.name).join(', ')+'</div>';
    h+='</div>';return h;
  }).join('');
}
function setCat(cat){_cc=cat;rKompo();}

function rFahr(){
  const el=document.getElementById('veh-list');if(!el)return;
  el.innerHTML=VEHS.map(v=>{
    const st=G.vehs[v.id];const ok=v.req.every(r=>G.comp[r]>=1);const sc=v.pc*5;const can=!st.on&&G.money>=sc&&ok;
    let h='<div class="card '+(st.on?'done':'')+ '">';
    h+='<span style="font-size:30px;text-align:center;display:block;margin-bottom:4px;">'+v.e+'</span>';
    h+='<div style="font-size:14px;font-weight:700;text-align:center;">'+v.name+'</div>';
    h+='<div style="font-size:10px;color:var(--dm);text-align:center;margin-bottom:8px;text-transform:uppercase;">'+v.seg+'</div>';
    if(st.on)h+='<div style="text-align:center;margin-bottom:7px;"><span class="badge bg">■ IN PRODUKTION · '+st.n+' prod.</span></div>';
    h+='<div class="g2" style="margin-bottom:8px;"><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--cy);">'+v.cap+'/Sch.</div><div style="font-size:9px;color:var(--dm);">Kap.</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--cy);">€'+fm(v.price)+'</div><div style="font-size:9px;color:var(--dm);">Preis</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--cy);">€'+fm(v.pc)+'</div><div style="font-size:9px;color:var(--dm);">Prod.kosten</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--gn);">€'+fm((v.price-v.pc)*v.cap)+'</div><div style="font-size:9px;color:var(--dm);">Profit/Zykl.</div></div></div>';
    h+='<div style="margin-bottom:8px;">'+v.req.map(r=>{const cc=COMPS.find(x=>x.id===r);const bok=G.comp[r]>=1;return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;padding:2px 0;"><span style="color:'+(bok?'var(--gn)':'var(--rd)')+';">'+( bok?'✓':'✗')+'</span><span style="color:'+(bok?'var(--t2)':'var(--dm)')+'">'+(cc?.name||r)+'</span></div>';}).join('')+'</div>';
    h+='<button class="btn '+(st.on?'mx':can?'can':'')+'" onclick="launchVeh(\''+v.id+'\')" '+(st.on?'disabled':'')+'>'+( st.on?'✓ AKTIV':ok?'▶ Produzieren — €'+fm(sc):'⚠ Anforderungen fehlen')+'</button></div>';
    return h;
  }).join('');
}

function rProd(){const el=document.getElementById('prod-lines');if(!el)return;if(G.lines.length===0){el.innerHTML='<div class="card" style="text-align:center;color:var(--dm);padding:14px;">Keine Produktionslinien.</div>';return;}el.innerHTML=G.lines.map(l=>plHTML(l)).join('');}
function rForsch(){const el=document.getElementById('rd-area');if(!el)return;el.innerHTML=RD.map((cat,ci)=>{const done=cat.items.filter(i=>G.rdone[i.id]).length;return '<div class="sh">'+cat.cat+' <span style="font-size:10px;color:var(--dm)">'+done+'/'+cat.items.length+'</span></div><div class="g2" style="margin-bottom:6px;">'+cat.items.map((item,ii)=>{const d=G.rdone[item.id];const doing=G.active_rd?.id===item.id;return '<div class="rn '+(d?'done':doing?'doing':'')+'" style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:9px;text-align:center;cursor:pointer;position:relative;overflow:hidden;'+(d?'border-color:var(--gn)':doing?'border-color:var(--cy)':'')+'" onclick="'+(d||doing?'':'startRD('+ci+','+ii+')')+'">'+( doing?'<div style="position:absolute;bottom:0;left:0;height:3px;background:var(--cy);width:'+G.rd_prog.toFixed(0)+'%"></div>':'')+'<div style="font-size:19px;margin-bottom:3px;">'+item.icon+'</div><div style="font-size:10px;font-weight:700;">'+item.name+'</div><div style="font-size:9px;color:var(--dm);margin-top:2px;">'+(d?'✓ FERTIG':doing?Math.round(100-G.rd_prog)+'% left':'€'+fm(item.cost))+'</div></div>';}).join('')+'</div>';}).join('');}

function rMarkt(){
  const all=[{n:'⭐ Du',sh:G.share,cl:'var(--cy)'},...RIVALS.map(r=>({n:r.ic+' '+r.n.split(' ')[0],sh:r.sh,cl:r.cl}))].sort((a,b)=>b.sh-a.sh);
  const mb=document.getElementById('mkt-bars');if(mb)mb.innerHTML=all.map(p=>'<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span style="color:var(--t2);font-weight:600;">'+p.n+'</span><span style="color:'+p.cl+';font-weight:700;">'+p.sh.toFixed(1)+'%</span></div><div class="pw"><div class="pb" style="width:'+Math.min(100,p.sh/30*100).toFixed(0)+'%;background:'+p.cl+'"></div></div></div>').join('');
  const pw=document.getElementById('pw-panel');if(pw)pw.innerHTML=G.pricewarActive?'<div class="ev-alert crisis"><b>⚔️ PREISKAMPF</b> — Alle Preise -15% · '+G.pricewarTimer+'s</div>':'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Kein Preiskampf aktiv</div>';
  const cc=document.getElementById('comp-cards');if(cc)cc.innerHTML=RIVALS.map(r=>'<div class="card"><div style="display:flex;gap:10px;align-items:center;"><div style="width:40px;height:40px;border-radius:50%;background:'+r.cl+'22;border:2px solid '+r.cl+';color:'+r.cl+';display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">'+r.ic+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;color:'+r.cl+'">'+r.n+'</div><div style="font-size:10px;color:var(--t2);">'+r.co+'</div><div style="display:flex;gap:12px;margin-top:4px;"><div><div style="font-size:12px;font-weight:700;color:'+r.cl+'">'+r.sh.toFixed(1)+'%</div><div style="font-size:9px;color:var(--dm)">Markt</div></div><div><div style="font-size:12px;font-weight:700;">€'+fm(r.ca)+'</div><div style="font-size:9px;color:var(--dm)">Kapital</div></div><div><div style="font-size:12px;font-weight:700;">'+(r.ag*10).toFixed(0)+'/10</div><div style="font-size:9px;color:var(--dm)">Aggr.</div></div></div></div></div></div>').join('');
}

function rRegion(){const el=document.getElementById('region-list');if(!el)return;el.innerHTML=Object.entries(G.regions).map(([id,r])=>'<div class="rg-card"><div style="font-size:24px;">'+r.flag+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+r.name+(r.unlocked?' <span class="badge bg">AKTIV</span>':' <span class="badge br">GESPERRT</span>')+'</div><div style="font-size:10px;color:var(--t2);">Händler: '+r.dealers+' · Nachfrage: '+(r.demand*100).toFixed(0)+'%</div><div class="pw"><div class="pb cy" style="width:'+Math.min(100,r.dealers*10)+'%"></div></div></div>'+(r.unlocked?'<button class="btn sm can" onclick="addDealer(\''+id+'\')">+Händler</button>':'<button class="btn sm cy-b" onclick="unlockRegion(\''+id+'\')">€'+fm(r.cost)+'</button>')+'</div>').join('');}

function rRohstoff(){
  const nm={steel:'Stahl 🔩',aluminum:'Aluminium 🪨',energy:'Energie ⚡'};
  const el=document.getElementById('rohstoff-list');
  if(el)el.innerHTML=Object.entries(G.commMult).map(([k,v])=>{const hist=G.commHist[k]||[];const trend=hist.length>1?hist[hist.length-1]-hist[hist.length-2]:0;const col=v>1.3?'var(--rd)':v<.8?'var(--gn)':'var(--go)';return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);"><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+nm[k]+'</div><div style="font-size:10px;color:var(--dm);">Preisniveau: <span style="color:'+col+';font-weight:700;">'+(v*100).toFixed(0)+'%</span></div></div><div style="display:flex;align-items:flex-end;gap:1px;height:22px;width:50px;">'+hist.map(h=>'<div style="flex:1;height:'+(h/2*22).toFixed(0)+'px;background:'+(h>1.2?'var(--rd)':h<.8?'var(--gn)':'var(--go)')+';border-radius:1px;"></div>').join('')+'</div><div style="font-size:11px;'+(trend>0?'color:var(--rd)':'color:var(--gn)')+';">'+(trend>0?'▲':'▼')+(Math.abs(trend)*100).toFixed(0)+'%</div></div>';}).join('');
  const sl=document.getElementById('supplier-list');
  if(sl)sl.innerHTML='<button class="btn '+(G.money>=500000?'can':'')+'" onclick="buyInsurance(\'ins_supply\')">📦 Lieferkettenversicherung — €150.000</button>';
}

function rPersonal(){
  document.getElementById('p-total').textContent=G.workerCount;
  const h=document.getElementById('p-happy');if(h){h.textContent=G.workerHappy+'%';h.style.color=G.workerHappy>70?'var(--gn)':G.workerHappy>40?'var(--go)':'var(--rd)';}
  const cp=document.getElementById('ceo-panel');
  if(cp){if(G.currentCEO)cp.innerHTML='<div class="card done"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+G.currentCEO.emoji+'</div><div><div style="font-size:13px;font-weight:700;">'+G.currentCEO.name+'</div><div style="font-size:10px;color:var(--pu);">'+G.currentCEO.spec+'</div><div style="font-size:11px;color:var(--gn);margin-top:2px;">'+G.currentCEO.bonus+'</div></div><span class="badge bo">AKTIV</span></div></div>';
    else cp.innerHTML=CEO_POOL.map((c,i)=>'<div class="card"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+c.emoji+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">'+c.name+'</div><div style="font-size:10px;color:var(--pu);">'+c.spec+'</div><div style="font-size:11px;color:var(--gn);">'+c.bonus+'</div></div><button class="btn sm '+(G.money>=1e6?'can':'')+'" onclick="hireCEO('+i+')">€1M</button></div></div>').join('');}
  const hp=document.getElementById('hr-panel');
  if(hp)hp.innerHTML='<div class="g2"><button class="btn '+(G.money>=50000?'can':'')+'" onclick="hireMech()">👷 +10 MA — €50k</button><button class="btn '+(G.money>=150000?'cy-b':'')+'" onclick="hireEng()">🔬 +Ingenieur — €150k</button></div><button class="btn '+(G.money>=500000?'go-b':'')+'" style="margin-top:7px;" onclick="raiseSal()">💰 Gehälter erhöhen — €500k</button>';
}

function rBoerse(){
  const prev=G.stockHistory.length>1?G.stockHistory[G.stockHistory.length-2]:G.stockPrice;
  const ch=((G.stockPrice/prev-1)*100);
  document.getElementById('stk-big').textContent='€'+G.stockPrice.toFixed(2);
  const sc=document.getElementById('stk-chg');if(sc){sc.textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';sc.style.color=ch>=0?'var(--gn)':'var(--rd)';}
  document.getElementById('stk-owned').textContent=G.stockOwned+' (€'+fm(G.stockOwned*G.stockPrice)+')';
  const ch2=document.getElementById('stk-chart');if(ch2){const mx=Math.max(...G.stockHistory),mn=Math.min(...G.stockHistory),rng=mx-mn||1;ch2.innerHTML=G.stockHistory.map((p,i)=>'<div class="sbar" style="height:'+(((p-mn)/rng)*44+3)+'px;background:'+(p>=(G.stockHistory[i-1]||p)?'var(--gn)':'var(--rd)')+'"></div>').join('');}
  const dp=document.getElementById('div-panel');if(dp)dp.innerHTML='<div class="card"><div class="sr"><span class="sl">Letzte Dividende</span><span class="sv" style="color:var(--gn)">€'+fm(G.lastDiv)+'</span></div><div class="sr"><span class="sl">Nächste in</span><span class="sv">'+(360-G.divTimer)+'s</span></div><div class="sr"><span class="sl">Rate</span><span class="sv">2% Aktienwert</span></div></div>';
  const mp=document.getElementById('merger-panel');if(mp){if(G.mergerOffers.length===0)mp.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine Angebote</div>';else mp.innerHTML=G.mergerOffers.map(o=>'<div class="card warn"><div style="font-size:13px;font-weight:700;margin-bottom:5px;">🤝 '+o.from.n+' bietet €'+fm(o.amount)+'</div><div class="g2"><button class="btn can" onclick="acceptMerger(\''+o.id+'\')">✓ Annehmen</button><button class="btn rd-b" onclick="rejectMerger(\''+o.id+'\')">✗ Ablehnen</button></div></div>').join('');}
}

function rBank(){
  const loans=[{amt:500000,rate:.08,term:180,label:'€500k @ 8%'},{amt:2000000,rate:.1,term:360,label:'€2M @ 10%'},{amt:5000000,rate:.12,term:720,label:'€5M @ 12%'}];
  const lo=document.getElementById('loan-opts');if(lo)lo.innerHTML=loans.map(l=>'<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">🏦 '+l.label+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:6px;">Laufzeit '+l.term+'s</div><button class="btn '+(G.loans.length<3?'can':'')+'" onclick="takeLoan('+l.amt+','+l.rate+','+l.term+')">Aufnehmen</button></div>').join('');
  const al=document.getElementById('active-loans');if(al)al.innerHTML=G.loans.length?G.loans.map(l=>'<div style="background:var(--card);border:1px solid rgba(255,51,85,.3);border-radius:8px;padding:9px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">Kredit #'+l.id+'</span><span style="color:var(--rd);font-weight:700;">€'+fm(l.remaining)+' offen</span></div><div class="pw"><div class="pb rd" style="width:'+(100-l.remaining/(l.amount*(1+l.rate))*100).toFixed(0)+'%"></div></div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine aktiven Kredite</div>';
  const tp=document.getElementById('tax-panel');if(tp)tp.innerHTML='<div class="card"><div class="sr"><span class="sl">Steuersatz</span><span class="sv">25% Gewinn</span></div><div class="sr"><span class="sl">Bisher gezahlt</span><span class="sv" style="color:var(--rd)">€'+fm(G.taxPaid)+'</span></div><div class="sr"><span class="sl">Nächste Steuer</span><span class="sv">in '+G.taxTimer+'s</span></div></div>';
}

function rPolitik(){
  document.getElementById('pol-lp').textContent=G.lobbyPts.toFixed(0);
  const co2=document.getElementById('pol-co2');if(co2){co2.textContent=G.co2Index.toFixed(0);co2.style.color=G.co2Index<80?'var(--gn)':G.co2Index<120?'var(--go)':'var(--rd)';}
  const cp=document.getElementById('co2-panel');if(cp)cp.innerHTML='<div class="card"><div class="sr"><span class="sl">CO2-Index</span><span class="sv" style="color:'+(G.co2Index<80?'var(--gn)':'var(--rd)')+'">'+G.co2Index.toFixed(0)+'</span></div><div class="sr"><span class="sl">ESG Score</span><span class="sv" style="color:'+(G.esgScore>60?'var(--gn)':'var(--go)')+'">'+G.esgScore.toFixed(0)+'/100</span></div><div class="sr"><span class="sl">Lobby-Punkte</span><span class="sv" style="color:var(--pu)">'+G.lobbyPts.toFixed(0)+'</span></div></div>';
  const ll=document.getElementById('lobby-list');if(ll)ll.innerHTML=[{id:'ev_sub',cost:100,name:'E-Mobilitäts-Subvention'},{id:'co2_ex',cost:80,name:'CO2-Ausnahme sichern'},{id:'rd_grant',cost:60,name:'F&E-Förderung (+€1M)'},{id:'import_tax',cost:150,name:'Import-Zölle erhöhen'}].map(p=>'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;"><span style="font-size:13px;font-weight:700;">🏛️ '+p.name+'</span><span style="color:var(--pu);font-weight:700;">'+p.cost+' LP</span></div><button class="btn '+(G.lobbyPts>=p.cost?'pu-b':'')+'" onclick="startLobby(\''+p.id+'\')">Starten</button></div>').join('');
}

function rRacing(){
  const rs=document.getElementById('racing-status');if(!rs)return;
  if(!G.racingTeam){rs.innerHTML='<div class="card"><div style="font-size:12px;margin-bottom:9px;">Kein Rennteam. Motorsport steigert Markenimage, Reputation und bringt Preisgeld.</div><button class="btn '+(G.money>=2e6?'can':'')+'" onclick="buildRacing()">🏎️ Team gründen — €2 Mio.</button></div>';return;}
  rs.innerHTML='<div class="g2" style="margin-bottom:8px;"><div class="kpi"><div class="kv" style="color:var(--go)">'+G.racingLevel+'</div><div class="kl">Team Lvl</div></div><div class="kpi"><div class="kv" style="color:var(--gn)">'+G.raceWins+'</div><div class="kl">Siege</div></div></div><button class="btn '+(G.money>=G.racingLevel*1e6?'go-b':'')+'" onclick="upRacing()">⬆ Level '+( G.racingLevel+1)+' — €'+fm(G.racingLevel*1e6)+'</button>';
  const rc=document.getElementById('race-cal');if(rc&&G.nextRace)rc.innerHTML='<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">🏁 '+G.nextRace.name+'</div><div style="font-size:11px;color:var(--t2);">Preisgeld: €'+fm(G.nextRace.prize)+' · Startet in: '+G.nextRace.in+'s</div><div class="pw" style="margin-top:7px;"><div class="pb go" style="width:'+(100-G.nextRace.in/300*100).toFixed(0)+'%"></div></div></div>';
}

function rSpionage(){
  document.getElementById('spy-pts').textContent=G.spyPts.toFixed(0)+' SP';
  const sl=document.getElementById('spy-list');if(sl)sl.innerHTML=[{id:'steal_tech',cost:30,name:'Technologie stehlen'},{id:'sabotage',cost:50,name:'Werk sabotieren'},{id:'headhunt',cost:20,name:'Ingenieur abwerben'},{id:'pr_attack',cost:25,name:'PR-Angriff'}].map(m=>'<div style="background:var(--card);border:1px solid rgba(187,85,255,.3);border-radius:8px;padding:10px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;">🕵️ '+m.name+'</span><span style="color:var(--pu);font-weight:700;">'+m.cost+' SP</span></div><button class="btn sm '+(G.spyPts>=m.cost&&!G.activeSpy?'pu-b':'')+'" onclick="startSpy(\''+m.id+'\')">'+(G.activeSpy?.id===m.id?'Läuft... '+G.spyTimer+'s':'Mission starten')+'</button></div>').join('');
  const sp=document.getElementById('sec-panel');if(sp)sp.innerHTML='<div class="card"><div class="sr"><span class="sl">Sicherheitslevel</span><span class="sv" style="color:var(--cy)">'+G.secLevel+'</span></div><div class="sr"><span class="sl">Vorfälle</span><span class="sv">'+G.incidents+'</span></div><button class="btn '+(G.money>=(G.secLevel+1)*400000?'cy-b':'')+'" style="margin-top:7px;" onclick="upDefense()">🛡️ Lvl '+(G.secLevel+1)+' — €'+fm((G.secLevel+1)*400000)+'</button></div>';
}

function rPatente(){
  const mp=document.getElementById('my-patents');if(mp)mp.innerHTML=G.patents.length?G.patents.map(p=>'<div style="background:var(--card);border:1px solid rgba(187,85,255,.3);border-radius:8px;padding:9px;margin-bottom:6px;"><div style="font-size:12px;font-weight:700;">📜 '+p.name+'</div><div style="font-size:10px;color:var(--t2);">Angemeldet: '+p.filed+' · €'+fm(p.val)+'</div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;">Noch keine Patente. Forsche, um Patente zu erhalten.</div>';
  const ps=document.getElementById('patent-suits');if(ps)ps.innerHTML=RIVALS.map(r=>'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">⚖️ vs. '+r.n+'</span><span style="font-size:10px;color:var(--dm);">60% Chance</span></div><div style="font-size:10px;color:var(--t2);margin-bottom:5px;">€500k Anwaltskosten · Award: €0.5M–€2.5M</div><button class="btn sm '+(G.patents.length>0&&G.money>=500000?'pu-b':'')+'" onclick="filePatent()">⚖️ Klagen</button></div>').join('');
}

function rShowrooms(){
  document.getElementById('sr-total').textContent=G.showrooms.length;
  const sl=document.getElementById('sr-list');if(sl)sl.innerHTML=G.showrooms.map(s=>'<div style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:6px;display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+s.flag+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">'+s.city+'</div><div style="font-size:10px;color:var(--t2);">Seit '+s.opened+' · +'+s.db+'% Verkauf</div></div><span class="badge bg">AKTIV</span></div>').join('');
  const sb=document.getElementById('sr-build');if(sb){const av=SHOWROOM_LOCS.filter(l=>!G.showrooms.find(s=>s.city===l.city));sb.innerHTML=av.map((l,i)=>'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">'+l.flag+' '+l.city+'</span><span style="color:var(--go);font-weight:700;">€'+fm(l.cost)+'</span></div><div style="font-size:10px;color:var(--t2);margin-bottom:5px;">+'+l.db+'% Verkaufsbonus</div><button class="btn '+(G.money>=l.cost?'can':'')+'" onclick="buildShowroom('+SHOWROOM_LOCS.indexOf(l)+')">🏪 Eröffnen</button></div>').join('');}
}

function rWerb(){const el=document.getElementById('ad-list');if(!el)return;el.innerHTML=ADS.map(a=>{const on=G.ads.has(a.id);return '<div class="card"><div style="display:flex;gap:9px;align-items:center;"><div style="font-size:22px;flex-shrink:0;">'+a.icon+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+a.name+'</div><div style="font-size:11px;color:var(--gn);">'+a.eff+'</div><div style="font-size:11px;color:var(--go);">€'+fm(a.cost)+'/Tag</div></div><div class="tw '+(on?'on':'')+'" onclick="togAd(\''+a.id+'\')"><div class="tk"></div></div></div></div>';}).join('');}
function rAutoList(){const el=document.getElementById('auto-list');if(!el)return;el.innerHTML=AUTOS.map(a=>{const on=G.autos[a.id];return '<div class="card"><div style="display:flex;align-items:center;gap:9px;"><div style="flex:1;"><div style="font-size:13px;font-weight:700;">🤖 '+a.name+'</div><div style="font-size:10px;color:var(--t2);margin-top:2px;">'+a.desc+'</div><div style="font-size:10px;color:var(--go);">€'+fm(a.cost)+' einmalig</div></div><div class="tw '+(on?'on':'')+'" onclick="togAuto(\''+a.id+'\')"><div class="tk"></div></div></div></div>';}).join('');}
function rWerke(){
  const ow=document.getElementById('own-fac');if(ow)ow.innerHTML=G.facs.map(f=>'<div class="card done"><div style="font-size:13px;font-weight:700;margin-bottom:3px;">'+f.icon+' '+f.name+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:6px;">'+f.city+'</div><div class="sr"><span class="sl">Mitarbeiter</span><span class="sv">'+f.workers+'</span></div><div class="sr"><span class="sl">Effizienz</span><span class="sv">'+(f.eff*100).toFixed(0)+'%</span></div><div class="pw"><div class="pb gr" style="width:'+(f.eff*100).toFixed(0)+'%"></div></div></div>').join('');
  const bw=document.getElementById('buy-fac');if(!bw)return;
  const av=FACS.filter(f=>!G.facs.find(gf=>gf.id===f.id));const cm=G.currentCEO?.effect==='facCost'?G.currentCEO.val:1;
  bw.innerHTML=av.length?av.map(f=>{const cost=f.cost*cm;return '<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:3px;">'+f.icon+' '+f.name+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:6px;">'+f.city+'</div><div class="sr"><span class="sl">Mitarbeiter</span><span class="sv">'+f.workers+'</span></div><div class="sr"><span class="sl">Effizienz</span><span class="sv">'+(f.eff*100).toFixed(0)+'%</span></div><button class="btn '+(G.money>=cost?'can':'')+'" style="margin-top:8px;" onclick="buildFac(\''+f.id+'\')">🏭 €'+fm(cost)+'</button></div>';}).join(''):'<div class="card"><div style="text-align:center;color:var(--dm);padding:12px;">Alle Werke gebaut! 🏆</div></div>';
}

function renderTuning(){
  const ul=document.getElementById('tuning-unlock');const tl=document.getElementById('tuning-list');if(!ul||!tl)return;
  if(!G.tuningDept){ul.innerHTML='<div class="card"><div style="font-size:12px;margin-bottom:9px;">Tuning erhöht Fahrzeugpreise um 6–15% dauerhaft.</div><button class="btn '+(G.money>=1e6?'can':'')+'" onclick="unlockTuning()">🔩 Tuning-Abteilung — €1 Mio.</button></div>';tl.innerHTML='';return;}
  ul.innerHTML='<div class="card done" style="margin-bottom:9px;font-size:12px;font-weight:700;">✓ Tuning-Abteilung aktiv</div>';
  const pkgs=[{id:'sport',name:'Sport-Paket',emoji:'🏎️',cost:80000,pm:.08,req:'eng_v6'},{id:'luxury',name:'Luxury-Paket',emoji:'💎',cost:120000,pm:.12,req:'int_lux'},{id:'electric',name:'E-Performance',emoji:'⚡',cost:100000,pm:.10,req:'eng_elec'},{id:'offroad',name:'Offroad-Paket',emoji:'🏔️',cost:90000,pm:.09,req:'awd'},{id:'amg',name:'AMG-Line',emoji:'🔥',cost:150000,pm:.15,req:'body_cfk'}];
  const av=VEHS.filter(v=>G.vehs[v.id]?.on);
  if(av.length===0){tl.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Keine Fahrzeuge in Produktion.</div>';return;}
  tl.innerHTML=av.map(veh=>{const cur=G.tuningProjects[veh.id];return '<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:7px;">'+veh.e+' '+veh.name+(cur?' <span class="badge bg">'+pkgs.find(p=>p.id===cur)?.name+'</span>':'')+'</div>'+pkgs.map(pkg=>{const applied=G.tuningProjects[veh.id]===pkg.id;const ca=G.comp[pkg.req]>=1&&G.money>=pkg.cost&&!applied;return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);"><div><div style="font-size:11px;font-weight:700;">'+pkg.emoji+' '+pkg.name+'</div><div style="font-size:10px;color:var(--gn);">Preis +'+Math.round(pkg.pm*100)+'%</div></div><button class="btn sm '+(applied?'mx':ca?'can':'')+'" onclick="applyTuning(\''+veh.id+'\',\''+pkg.id+'\')" '+(applied?'disabled':'')+'>'+(applied?'✓ AKTIV':'€'+fm(pkg.cost))+'</button></div>';}).join('')+'</div>';}).join('');
}

function renderKonzept(){
  const cons=[{id:'ev_vision',name:'EX-Vision SUV',emoji:'🚀',cost:500000,rep:15,brand:10},{id:'gti_x',name:'GTI X-Treme',emoji:'🏁',cost:600000,rep:20,brand:12},{id:'phaeton_e',name:'Phaeton E-Concept',emoji:'💎',cost:800000,rep:25,brand:15},{id:'micro',name:'Polo Micro City',emoji:'🐞',cost:300000,rep:10,brand:8},{id:'autobid',name:'AutoBuzz L5',emoji:'🚌',cost:1000000,rep:30,brand:20}];
  const el=document.getElementById('konzept-list');if(!el)return;
  el.innerHTML=cons.map(con=>{const done=G.concepts.includes(con.id);return '<div class="card '+(done?'done':'')+'"><div style="font-size:28px;text-align:center;margin-bottom:5px;">'+con.emoji+'</div><div style="font-size:13px;font-weight:700;text-align:center;margin-bottom:3px;">'+con.name+'</div><div class="g2" style="margin-bottom:7px;"><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;text-align:center;"><div style="font-size:11px;font-weight:700;color:var(--gn);">+'+con.rep+'</div><div style="font-size:9px;color:var(--dm);">Reputation</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;text-align:center;"><div style="font-size:11px;font-weight:700;color:var(--cy);">+'+con.brand+'</div><div style="font-size:9px;color:var(--dm);">Markenimage</div></div></div>'+(done?'<div style="text-align:center;"><span class="badge bg">✓ PRÄSENTIERT</span></div>':'<button class="btn '+(G.money>=con.cost&&G.conceptCD===0?'cy-b':'')+'" onclick="buildConcept(\''+con.id+'\')">'+(G.conceptCD>0?'Cooldown '+G.conceptCD+'s':'💡 Präsentieren — €'+fm(con.cost))+'</button>')+'</div>';}).join('');
  if(G.conceptCD>0)G.conceptCD--;
}

function rRoadmap(){
  const evV=VEHS.filter(v=>v.req.includes('eng_elec')||v.req.includes('battery'));
  const actEV=evV.filter(v=>G.vehs[v.id]?.on).length;
  const total=VEHS.filter(v=>G.vehs[v.id]?.on).length;
  const evShare=total>0?Math.round(actEV/total*100):0;
  const el=document.getElementById('ev-roadmap');if(!el)return;
  const miles=[{t:10,y:'2025',l:'E-Einstieg',r:'€500k'},{t:25,y:'2027',l:'E-Ausbau',r:'CO2 -50%'},{t:50,y:'2030',l:'E-Parität',r:'EU-Subvention'},{t:75,y:'2035',l:'E-Dominanz',r:'Marktführer'},{t:100,y:'2040',l:'Vollelektro',r:'Prestige'}];
  el.innerHTML=miles.map(m=>{const reached=evShare>=m.t;const pct=Math.min(100,evShare/m.t*100).toFixed(0);return '<div class="ev-mile '+(reached?'reached':'')+'"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;font-weight:700;">'+(reached?'✓':m.y)+' — '+m.l+'</span><span class="badge '+(reached?'bg':'bc')+'">'+m.t+'% E-Anteil</span></div><div class="pw"><div class="pb '+(reached?'gr':'cy')+'" style="width:'+pct+'%"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px;"><span style="color:var(--dm);">Aktuell: '+evShare+'%</span><span style="color:var(--gn);">'+m.r+'</span></div></div>';}).join('');
}

function rEmbargo(){
  document.getElementById('emb-cnt').textContent=G.embargos.length;document.getElementById('emb-exp').textContent=(G.embargos.length*15)+'%';
  const el=document.getElementById('emb-list');if(el)el.innerHTML=G.embargos.length?G.embargos.map(e=>'<div class="ev-alert crisis"><div style="font-size:13px;font-weight:700;">'+e.flag+' '+e.name+'</div><div style="font-size:11px;color:var(--t2);">Verbleibend: '+e.remaining+'s</div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine aktiven Embargos</div>';
  const il=document.getElementById('ins-list');if(il)il.innerHTML=rInsHTML();
}
function rWetter(){
  const cl=document.getElementById('crisis-list');if(cl)cl.innerHTML=(G.activeWeather?[{...G.activeWeather,active:true}]:[]).concat(G.crisisHistory.slice(-3)).map(e=>'<div class="ev-alert crisis" style="'+(e.active?'':'opacity:.7')+'"><div style="font-size:13px;font-weight:700;">'+e.emoji+' '+e.name+'</div><div style="font-size:11px;color:var(--t2);">'+e.desc+'</div></div>').join('')||'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine aktiven Katastrophen</div>';
  const il=document.getElementById('ins-list2');if(il)il.innerHTML=rInsHTML();
}
function rInsHTML(){return['ins_factory','ins_supply','ins_legal','ins_cyber'].map(id=>{const names={ins_factory:'Werksversicherung',ins_supply:'Lieferketten-Versicherung',ins_legal:'Rechtsschutz',ins_cyber:'Cyber-Versicherung'};const costs={ins_factory:200000,ins_supply:150000,ins_legal:100000,ins_cyber:120000};const active=G.insurance[id];return '<div class="card '+(active?'done':'')+'"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;">🛡️ '+names[id]+'</div><div style="font-size:10px;color:var(--t2);">€'+fm(costs[id])+'</div></div>'+(active?'<span class="badge bg">✓</span>':'<button class="btn sm '+(G.money>=costs[id]?'can':'')+'" onclick="buyInsurance(\''+id+'\')">Abschließen</button>')+'</div></div>';}).join('');}
function rKiAngriff(){
  const kl=document.getElementById('ki-log');if(kl)kl.innerHTML=G.kiAttacks.length?[...G.kiAttacks].reverse().slice(0,8).map(a=>'<div class="card '+(a.blocked?'done':'warn')+'"><div style="display:flex;gap:8px;align-items:center;"><div style="font-size:16px;">'+a.emoji+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">'+a.icon+' '+a.rival+' → '+a.atk+'</div><div style="font-size:10px;color:'+(a.blocked?'var(--gn)':'var(--rd)')+';">'+(a.blocked?'🛡️ GEBLOCKT':'💥 '+a.dmg||'Schaden')+' · '+a.when+'</div></div></div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine Angriffe bisher</div>';
  const kd=document.getElementById('ki-def');if(kd)kd.innerHTML='<div class="card"><div class="sr"><span class="sl">Verteidigungslevel</span><span class="sv" style="color:var(--cy)">'+G.defenseLevel+'/5</span></div><div class="sr"><span class="sl">Blockrate</span><span class="sv">'+(G.defenseLevel*15)+'%</span></div></div>'+(G.defenseLevel<5?'<button class="btn '+(G.money>=(G.defenseLevel+1)*400000?'cy-b':'')+'" style="margin-top:7px;" onclick="upDefense()">🛡️ Level '+(G.defenseLevel+1)+' — €'+fm((G.defenseLevel+1)*400000)+'</button>':'<div class="card done" style="text-align:center;">Max Verteidigung!</div>');
}

// ── V8 NEW RENDERS ──
function rSaison(){
  const sc=SEASON_CFG[G.season];
  const sh=document.getElementById('season-hdr');
  if(sh)sh.innerHTML='<div class="sbadge '+sc.cls+'">'+sc.name+' — Wechsel in '+G.seasonTimer+'s</div><div class="card"><div style="font-size:11px;color:var(--t2);line-height:1.7;">🌸 Frühling: Kompaktwagen & Stadtautos<br>☀️ Sommer: Sportwagen, kleine E-Autos<br>🍂 Herbst: SUVs, Mittelklasse, Kombis<br>❄️ Winter: Allrad, Geländewagen</div></div>';
  const sl=document.getElementById('season-list');if(!sl)return;
  const av=VEHS.filter(v=>G.vehs[v.id]?.on);
  if(av.length===0){sl.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Keine Fahrzeuge in Produktion.</div>';return;}
  sl.innerHTML=av.map(v=>{const b=sc.bonus?.[v.id]||1;const m=sc.malus?.[v.id]||1;const mult=b*m;return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:700;">'+v.e+' '+v.name+'</span><span style="font-size:13px;font-weight:700;color:'+(mult>1?'var(--gn)':mult<1?'var(--rd)':'var(--t2)')+'">'+(mult>1?'▲':'▼')+Math.abs(Math.round((mult-1)*100))+'%</span></div><div style="font-size:10px;color:var(--t2);margin-top:3px;">'+(mult>1?'📈 Saisonbonus':mult<1?'📉 Saisonschwäche':'Normal')+'</div></div>';}).join('');
}

function rQualitaet(){
  const st=Math.round(G.qualScore);
  document.getElementById('q-stars').textContent='★'.repeat(st)+'☆'.repeat(5-st);
  document.getElementById('q-stars').style.color=G.qualScore>=4?'var(--gn)':G.qualScore>=3?'var(--go)':'var(--rd)';
  document.getElementById('q-cnt').textContent=G.reviews.length;
  const dn=document.getElementById('q-dna');if(dn)dn.innerHTML='<div class="card">'+Object.entries(G.dna).map(([k,v])=>`<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span style="color:var(--t2);">${{engineering:'Ingenieurskunst',materials:'Materialqualität',assembly:'Montage',safety:'Sicherheit',design:'Design'}[k]||k}</span><span style="font-weight:700;color:${v>70?'var(--gn)':v>40?'var(--go)':'var(--rd)'}">${v.toFixed(0)}%</span></div><div class="pw"><div class="pb ${v>70?'gr':v>40?'go':'rd'}" style="width:${v}%"></div></div></div>`).join('')+'</div>';
  const rv=document.getElementById('q-reviews');if(rv)rv.innerHTML=G.reviews.slice(0,8).map(r=>'<div style="background:var(--card);border:1px solid var(--bdr);border-radius:7px;padding:9px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;font-weight:700;">'+r.emoji+' '+r.veh+'</span><span style="color:var(--go);">'+'★'.repeat(r.r)+'☆'.repeat(5-r.r)+'</span></div><div style="font-size:11px;color:var(--t2);">"'+r.comment+'"</div><div style="font-size:9px;color:var(--dm);margin-top:2px;">'+r.when+'</div></div>').join('')||'<div style="color:var(--dm);font-size:12px;padding:8px;">Noch keine Bewertungen.</div>';
}

function rBM(){
  const rv=document.getElementById('bm-risk-val');if(rv){rv.textContent=G.bmRisk.toFixed(0)+'%'+(G.bmCD>0?' 🚔 GESPERRT '+G.bmCD+'s':'');rv.style.color=G.bmRisk>60?'var(--rd)':G.bmRisk>30?'var(--go)':'var(--gn)';}
  const rb=document.getElementById('bm-risk-bar');if(rb){rb.style.width=G.bmRisk+'%';}
  const bl=document.getElementById('bm-list');if(!bl)return;
  bl.innerHTML=BM_ITEMS.map(item=>'<div class="bm-card"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;color:var(--pu);">'+item.emoji+' '+item.name+'</span><span style="color:var(--go);font-weight:700;">€'+fm(item.cost)+'</span></div><div style="font-size:11px;color:var(--t2);margin-bottom:3px;">'+item.desc+'</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:10px;color:'+(item.risk>30?'var(--rd)':'var(--go)')+';">⚠ Risiko +'+item.risk+'%</span><span style="font-size:10px;color:var(--gn);">+'+item.amt+' '+(item.res==='patent'?'Patent':G.res[item.res]?.name||item.res)+'</span></div><button class="btn sm '+(G.money>=item.cost&&G.bmCD===0?'pu-b':'')+'" onclick="bmBuy(\''+item.id+'\')">Kaufen</button></div>').join('');
}

function renderIngenieure(){
  const el=document.getElementById('eng-list');if(el)el.innerHTML=G.engTeam.map((e,i)=>'<div style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:6px;"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+e.emoji+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+e.name+'</div><div style="font-size:10px;color:var(--pu);">'+e.spec+' · Level '+e.lvl+'</div><div style="font-size:10px;color:var(--t2);margin-top:2px;">+'+( e.lvl*5)+'% F&E Speed · +'+( e.lvl*2)+'% Qualität</div><div class="eng-xp"><div class="eng-xp-f" style="width:'+(e.xp/e.xpN*100).toFixed(0)+'%"></div></div><div style="font-size:9px;color:var(--dm);margin-top:1px;">XP: '+e.xp.toFixed(0)+'/'+e.xpN.toFixed(0)+'</div></div><span class="badge bpu">Lvl '+e.lvl+'</span></div></div>').join('');
  const hl=document.getElementById('eng-hire');if(hl)hl.innerHTML='<button class="btn '+(G.money>=150000?'can':'')+'" onclick="hireEng()">🧑‍🔬 Ingenieur einstellen — €150.000</button>';
}

function rKampagne(){
  const done=G.missionsDone.length;const total=MISSIONS.length;
  const mp=document.getElementById('mission-prog');if(mp)mp.innerHTML='<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-weight:700;">Fortschritt</span><span style="color:var(--cy);font-weight:700;">'+done+'/'+total+'</span></div><div class="pw"><div class="pb cy" style="width:'+(done/total*100).toFixed(0)+'%"></div></div></div>';
  const ml=document.getElementById('mission-list');if(!ml)return;
  ml.innerHTML=MISSIONS.map(m=>{const isDone=G.missionsDone.includes(m.id);const isActive=!isDone&&m.id===G.campaignStep;const locked=!isDone&&m.id>G.campaignStep;return '<div class="mc '+(isDone?'done':isActive?'active':'locked')+'"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;">'+(isDone?'✓':isActive?'▶':'🔒')+' '+m.name+'</span><span class="badge '+(isDone?'bg':isActive?'bc':'br')+'">+€'+fm(m.r)+'</span></div><div style="font-size:11px;color:var(--t2);">'+m.desc+'</div>'+(isActive?'<div style="font-size:10px;color:var(--cy);margin-top:3px;">→ AKTUELLE MISSION</div>':'')+'</div>';}).join('');
}

function rRanking(){
  G.playerScore=Math.floor(G.prod*10+G.rev/1000+G.share*500+G.patents.length*1000+G.raceWins*2000+G.missionsDone.length*500);
  const bots=[{name:'BMW AG Sim',s:Math.floor(G.playerScore*(.8+Math.random()*.4))},{name:'Tesla Motors',s:Math.floor(G.playerScore*(.9+Math.random()*.5))},{name:'Toyota Corp',s:Math.floor(G.playerScore*(.7+Math.random()*.6))},{name:'StarDrive GmbH',s:Math.floor(G.playerScore*(.5+Math.random()*.8))},{name:'EV Pioneer',s:Math.floor(G.playerScore*(.3+Math.random()*.9))},{name:'AutoKing24',s:Math.floor(G.playerScore*(.4+Math.random()*.7))},{name:'GigaWheels AG',s:Math.floor(G.playerScore*(.6+Math.random()*.5))},{name:'VoltCars',s:Math.floor(G.playerScore*(.2+Math.random()*1.1))},{name:'RoadMaster Inc',s:Math.floor(G.playerScore*(.35+Math.random()*.8))}];
  const all=[{name:'Du ⭐',s:G.playerScore,isMe:true},...bots].sort((a,b)=>b.s-a.s);
  const myPos=all.findIndex(x=>x.isMe)+1;
  const rp=document.getElementById('rank-pos');if(rp)rp.textContent='#'+myPos;
  const rs=document.getElementById('rank-score');if(rs)rs.textContent=fm(G.playerScore);
  const lb=document.getElementById('lb-list');if(lb){const medals=['🥇','🥈','🥉'];lb.innerHTML=all.map((p,i)=>'<div class="lb-row" style="'+(p.isMe?'background:rgba(0,212,255,.05);border-radius:6px;padding:8px 6px;':'')+'"><div style="width:28px;height:28px;border-radius:50%;background:'+(i<3?'rgba(255,170,0,.2)':'var(--bg3)')+';color:'+(i<3?'var(--go)':'var(--dm)')+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;">'+(i<3?medals[i]:i+1)+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;'+(p.isMe?'color:var(--cy)':'')+' ">'+p.name+'</div></div><div style="font-size:13px;font-weight:700;font-family:monospace;color:'+(p.isMe?'var(--gn)':'var(--t2)')+'">'+fm(p.s)+'</div></div>').join('');}
}

function rWeltkarte(){
  const wm=document.getElementById('wm-container');
  if(wm){
    const w=320,h=160;
    let svg='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;background:#060e18;border-radius:8px;border:1px solid var(--bdr);"><text x="10" y="18" fill="#4a6880" font-size="10">🌐 KI-Werke Weltkarte</text>';
    for(let x=0;x<w;x+=40)svg+='<line x1="'+x+'" y1="22" x2="'+x+'" y2="'+h+'" stroke="#0d1520" stroke-width="1"/>';
    for(let y=22;y<h;y+=25)svg+='<line x1="0" y1="'+y+'" x2="'+w+'" y2="'+y+'" stroke="#0d1520" stroke-width="1"/>';
    // Player dot (Wolfsburg ~145,60)
    svg+='<circle cx="145" cy="62" r="8" fill="rgba(0,212,255,.25)" stroke="#00d4ff" stroke-width="2"/><text x="156" y="66" fill="#00d4ff" font-size="9" font-weight="bold">Du</text>';
    // Rival factories
    const positions={München:[148,63],Stuttgart:[147,64],Detroit:[80,58],Fremont:[40,60],Austin:[60,65],Ulsan:[250,60],'Toyota City':[248,62],Turin:[148,67]};
    G.rivalFacs.forEach(f=>{const r=RIVALS.find(x=>x.id===f.rival);if(!r)return;const pos=positions[f.city]||[Math.floor(Math.random()*260+20),Math.floor(Math.random()*100+25)];svg+='<circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="5" fill="'+r.cl+'44" stroke="'+r.cl+'" stroke-width="1.5"/><text x="'+(pos[0]+8)+'" y="'+(pos[1]+4)+'" fill="'+r.cl+'" font-size="8">'+f.icon+'</text>';});
    svg+='</svg>';
    wm.innerHTML=svg;
  }
  const rf=document.getElementById('rival-facs');
  if(rf)rf.innerHTML=G.rivalFacs.length?G.rivalFacs.map(f=>{const r=RIVALS.find(x=>x.id===f.rival);return '<div class="card warn"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:20px;">'+f.icon+'</div><div><div style="font-size:13px;font-weight:700;color:'+(r?.cl||'var(--rd)')+'">'+r?.n+' — '+f.city+'</div><div style="font-size:10px;color:var(--t2);">Gebaut: '+f.built+' · Stärkt Rivalen +0.4%</div></div></div></div>';}).join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Noch keine KI-Werke gebaut.<br>Nach ~5 Min. starten Rivalen zu expandieren.</div>';
}

function rFin(){
  const dr=dailyRev();
  document.getElementById('f-rev').textContent='€'+fm(G.rev);document.getElementById('f-cost').textContent='€'+fm(G.cost);document.getElementById('f-pft').textContent='€'+fm(G.rev-G.cost);document.getElementById('f-val').textContent='€'+fm(G.money*8+G.rev*2+G.stockOwned*G.stockPrice);
  const adC=[...G.ads].reduce((s,id)=>s+(ADS.find(a=>a.id===id)?.cost||0),0);const wC=G.facs.reduce((s,f)=>s+f.workers,0)*180;const lC=G.loans.reduce((s,l)=>s+l.monthly,0);
  const el=document.getElementById('fin-detail');if(el)el.innerHTML='<div class="card"><div class="sr"><span class="sl">Umsatz/Tag</span><span class="sv" style="color:var(--gn)">€'+fm(dr)+'</span></div><div class="sr"><span class="sl">Werbekosten</span><span class="sv" style="color:var(--rd)">€'+fm(adC)+'</span></div><div class="sr"><span class="sl">Lohnkosten</span><span class="sv" style="color:var(--rd)">€'+fm(wC)+'</span></div><div class="sr"><span class="sl">Kreditraten</span><span class="sv" style="color:var(--rd)">€'+fm(lC)+'</span></div><div class="sr"><span class="sl">Nettogewinn/Tag</span><span class="sv" style="color:'+(dr-adC-wC-lC>=0?'var(--gn)':'var(--rd)')+'">€'+fm(dr-adC-wC-lC)+'</span></div><div class="sr"><span class="sl">Aktienwert</span><span class="sv" style="color:var(--go)">€'+fm(G.stockOwned*G.stockPrice)+'</span></div><div class="sr"><span class="sl">Reputation</span><span class="sv" style="color:var(--go)">★'+Math.round(G.rep)+'/100</span></div><div class="sr"><span class="sl">ESG Score</span><span class="sv" style="color:'+(G.esgScore>60?'var(--gn)':'var(--go)')+'">'+G.esgScore.toFixed(0)+'/100</span></div><div class="sr"><span class="sl">Qualitätsscore</span><span class="sv" style="color:var(--go)">'+'★'.repeat(Math.round(G.qualScore))+'☆'.repeat(5-Math.round(G.qualScore))+'</span></div></div>';
  const yr=document.getElementById('yr-report');if(yr)yr.innerHTML=G.yearlyData.length?G.yearlyData.slice(-1).map(r=>'<div class="card"><div style="font-size:11px;font-weight:700;color:var(--pu);margin-bottom:6px;">📊 Jahresbericht Jahr '+r.year+'</div><div class="sr"><span class="sl">Umsatz</span><span class="sv" style="color:var(--gn)">€'+fm(r.rev)+'</span></div><div class="sr"><span class="sl">Kosten</span><span class="sv" style="color:var(--rd)">€'+fm(r.cost)+'</span></div><div class="sr"><span class="sl">Produziert</span><span class="sv">'+fm(r.prod)+' Autos</span></div><div class="sr"><span class="sl">Marktanteil</span><span class="sv">'+r.share+'%</span></div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Erscheint nach dem ersten Spieljahr</div>';
}

function rSpeichern(){
  const has=!!localStorage.getItem(SAVE_KEY);
  const el=document.getElementById('save-info');if(!el)return;
  if(!has){el.innerHTML='<div style="color:var(--dm);font-size:12px;padding:10px;text-align:center;">Noch kein Spielstand gespeichert.</div>';return;}
  try{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY));const ts=new Date(d.ts);
    el.innerHTML='<div class="card done"><div style="font-size:13px;font-weight:700;margin-bottom:6px;">📁 Spielstand</div><div class="sr"><span class="sl">Gespeichert</span><span class="sv">'+ts.toLocaleString()+'</span></div><div class="sr"><span class="sl">Jahr/Q</span><span class="sv">Q'+(d.q||1)+' J'+(d.y||1)+'</span></div><div class="sr"><span class="sl">Kapital</span><span class="sv" style="color:var(--gn)">€'+fm(d.money||0)+'</span></div><div class="sr"><span class="sl">Produziert</span><span class="sv">'+fm(d.prod||0)+' Autos</span></div><div class="sr"><span class="sl">Marktanteil</span><span class="sv">'+(d.share||0).toFixed(1)+'%</span></div><div class="g2" style="margin-top:8px;"><button class="btn can" onclick="loadGame()">📂 Laden</button><button class="btn rd-b" onclick="resetGame()">🗑️ Löschen</button></div></div>';
  }catch(e){el.innerHTML='<div style="color:var(--dm)">Fehler beim Lesen.</div>';}
}

// ── HELPERS ──
function fm(n){n=Math.floor(n||0);if(n>=1e9)return(n/1e9).toFixed(1)+'Mrd';if(n>=1e6)return(n/1e6).toFixed(1)+'Mio';if(n>=1e3)return(n/1e3).toFixed(0)+'k';return n+'';}
function addEv(html){const f=document.getElementById('ev-feed');if(!f)return;const d=document.createElement('div');d.style.cssText='display:flex;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px;';const now=new Date();const t=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');d.innerHTML='<span style="color:var(--dm);font-size:10px;flex-shrink:0;">'+t+'</span><span>'+html+'</span>';f.prepend(d);while(f.children.length>60)f.lastChild.remove();}
function addAI(html){const f=document.getElementById('ai-log');if(!f)return;const d=document.createElement('div');d.style.cssText='padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);';d.innerHTML=html;f.prepend(d);while(f.children.length>12)f.lastChild.remove();}
function notify(msg,type){const a=document.getElementById('notifs');const d=document.createElement('div');d.className='notif '+(type||'');d.textContent=msg;d.onclick=()=>d.remove();a.appendChild(d);setTimeout(()=>d.remove(),4000);}
function sv(id,btn){document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));const el=document.getElementById('v-'+id);if(el)el.classList.add('on');if(btn)btn.classList.add('on');document.getElementById('content').scrollTop=0;}
function buildTicker(){const el=document.getElementById('tick-inner');if(!el)return;const ch=(G.stockHistory.length>1?(G.stockPrice/G.stockHistory[G.stockHistory.length-2]-1)*100:0);const items=[{t:'€'+fm(G.money),c:'p'},{t:'AKTIE €'+Math.round(G.stockPrice)+' ('+(ch>=0?'+':'')+ch.toFixed(1)+'%)',c:ch>=0?'p':'r'},{t:'MARKT '+G.share.toFixed(1)+'%',c:''},{t:'PROD '+fm(G.prod),c:'p'},...RIVALS.map(r=>({t:r.n.split(' ')[0]+' '+r.sh.toFixed(1)+'%',c:''})),{t:'SAISON: '+SEASON_CFG[G.season].name,c:'g'},{t:'AUTO EMPIRE v8',c:'g'}];el.innerHTML=items.map(i=>'<span class="ti '+i.c+'">◇ '+i.t+'</span>').join('');}

// init() commented out by patch

// ═══════════════════════════════════════════════════════
//  AUTO EMPIRE v9  —  25 NEUE FEATURES + DESIGN FIXES
// ═══════════════════════════════════════════════════════

// EXTEND STATE
Object.assign(G, {
  // 1. News Feed
  newsItems: [],
  newsTimer: 60,

  // 2. Portfolio (rival stocks)
  rivalStocks: {},
  portfolioValue: 0,

  // 3. Challenges
  challenges: [],
  challengeTimer: 0,
  prestigePts: 0,
  dailyChallengeReset: 0,

  // 4. Partner/Lieferanten 2
  partners: [],

  // 5. F&E Labor
  labLevel: 1,
  labProjects: [],
  labSlots: 1,

  // 6. Fahrzeugmarkt / Preisanpassung
  customPrices: {},

  // 7. Rivalität
  rivalryScore: 0,
  rivalActions: 0,

  // 8. Achievements hidden
  hiddenAchievements: [],

  // 9. Weather insurance premium
  insurancePremium: 0,

  // 10. Tech tree unlocks
  techTree: {},

  // 11. Supply chain disruption
  supplyDisruption: 0,

  // 12. Brand campaigns (long-running)
  brandCampaigns: [],

  // 13. Vehicle upgrades (beyond tuning)
  vehicleUpgrades: {},

  // 14. Market research
  marketResearch: [],
  researchTimer: 120,

  // 15. Export licenses
  exportLicenses: {},

  // 16. Factory efficiency upgrades
  facEffUpgrades: {},

  // 17. Reputation events history
  repHistory: [],

  // 18. Black market busts count (tracked per session)

  // 19. Profit tracking per vehicle
  vehProfit: {},

  // 20. Competitor intelligence
  compIntel: {},

  // 21. Press conference
  lastPressConf: 0,
  pressConfCD: 0,

  // 22. Sustainability goals
  sustainGoals: { co2Target: 80, achieved: false },

  // 23. Employee of the month
  eotm: null,
  eotmTimer: 120,

  // 24. Dynamic market events
  marketTrend: 'stable', // bull/bear/stable
  trendTimer: 180,

  // 25. Loan credit score
  creditScore: 750,
});

// ─── NEWS DATA ───
const NEWS_TEMPLATES = [
  () => RIVALS[Math.floor(Math.random()*RIVALS.length)].n + ' kündigt neues Modell an — Marktanteil +' + (Math.random()*2).toFixed(1) + '%',
  () => 'Ölpreis ' + (Math.random()<.5?'steigt':'fällt') + ' — Energie-Kosten ' + (Math.random()<.5?'erhöhen':'senken') + ' sich',
  () => 'EU verschärft CO2-Vorschriften für ' + (2026+Math.floor(Math.random()*5)),
  () => 'Analysten: E-Mobilität wächst um ' + (15+Math.floor(Math.random()*20)) + '% in diesem Quartal',
  () => 'Chip-Hersteller ' + ['TSMC','Samsung','Intel'][Math.floor(Math.random()*3)] + ' erhöht Kapazität — Elektronik günstiger',
  () => 'Auto Empire erreicht ' + G.share.toFixed(1) + '% Marktanteil — Aktie reagiert positiv',
  () => 'Streikgefahr bei ' + RIVALS[Math.floor(Math.random()*RIVALS.length)].n + ' — Produktion gefährdet',
  () => 'Neue Forschungsstudie: Autonomes Fahren boomt in ' + ['USA','China','Europa'][Math.floor(Math.random()*3)],
  () => G.season === 'winter' ? 'Winterhoch: SUV-Nachfrage steigt um 25%' : G.season === 'summer' ? 'Sommersaison: Sportwagen gefragter' : 'Saisonale Nachfrage normalisiert sich',
  () => 'Rohstoffmärkte: Aluminium ' + (G.commMult.aluminum > 1.2 ? 'auf Jahreshoch' : 'stabilisiert sich'),
];

// ─── CHALLENGES ───
const CHALLENGE_POOL = [
  {id:'c1', name:'Produktionssprint',  desc:'Produziere 50 Fahrzeuge heute',     target:()=>G.prod, thresh:50,   r:25000,  type:'prod'},
  {id:'c2', name:'Verkaufsrekord',      desc:'€500k Umsatz in dieser Session',    target:()=>G.rev,  thresh:500000,r:30000, type:'rev'},
  {id:'c3', name:'Forschungseifer',    desc:'Schließe 2 Forschungen ab',          target:()=>Object.values(G.rdone).filter(Boolean).length, thresh:2,r:20000,type:'rd'},
  {id:'c4', name:'Sparfüchse',         desc:'Starte 3 Werbungen gleichzeitig',    target:()=>G.ads.size, thresh:3,r:15000, type:'ads'},
  {id:'c5', name:'Multimarkt',         desc:'Erschließe eine neue Region',        target:()=>Object.values(G.regions).filter(r=>r.unlocked).length, thresh:2,r:50000,type:'region'},
  {id:'c6', name:'E-Mobilitätspionier',desc:'Produziere ein Elektrofahrzeug',     target:()=>['id4','beetle','id_buzz'].some(id=>G.vehs[id]?.on)?1:0, thresh:1,r:40000,type:'ev'},
  {id:'c7', name:'Aktionär',           desc:'Besitze 50 Aktien',                  target:()=>G.stockOwned, thresh:50,r:20000,type:'stocks'},
  {id:'c8', name:'Qualitätsführer',    desc:'Erreiche 4-Sterne Qualität',          target:()=>Math.round(G.qualScore), thresh:4,r:35000,type:'quality'},
];

// ─── PARTNERS ───
const PARTNER_DATA = [
  {id:'bosch',    name:'BOSCH',         emoji:'⚙️', bonus:'Elektronik -20%',    cost:800000,  effect:'elec_cost', val:.8},
  {id:'basf',     name:'BASF',          emoji:'🧪', bonus:'Kunststoff -15%',    cost:500000,  effect:'plastic_cost',val:.85},
  {id:'thyssenkrupp',name:'ThyssenKrupp',emoji:'🔩',bonus:'Stahl -18%',         cost:700000,  effect:'steel_cost',val:.82},
  {id:'michelin', name:'MICHELIN',      emoji:'⚫', bonus:'Gummi kostenlos',    cost:400000,  effect:'rubber_free',val:1},
  {id:'continental',name:'Continental', emoji:'🔋', bonus:'Batterie -25%',      cost:1200000, effect:'battery_cost',val:.75},
  {id:'panasonic',name:'PANASONIC',     emoji:'💡', bonus:'Elektronik gratis',  cost:900000,  effect:'elec_free',  val:1},
];

// ─── PRESS CONFERENCES ───
function holdPressConference() {
  if(G.pressConfCD > 0) { notify('Nächste in ' + G.pressConfCD + 's', 'warn'); return; }
  const bonus = Math.floor(G.rep * 1000 + G.share * 5000);
  G.money += bonus;
  G.rep = Math.min(100, G.rep + 5);
  G.brand = Math.min(100, G.brand + 3);
  G.pressConfCD = 180;
  addEv('🎤 <span style="color:var(--cy)">Pressekonferenz</span> — Reputation +5, +€' + fm(bonus));
  notify('Pressekonferenz erfolgreich! +€' + fm(bonus), 'ok');
  spawnPtcls(window.innerWidth/2, window.innerHeight/3, '#00d4ff', 20);
  floatMoney(bonus, true);
}

// ─── MARKET TREND SYSTEM ───
function updateMarketTrend() {
  G.trendTimer--;
  if(G.trendTimer <= 0) {
    G.trendTimer = 120 + Math.floor(Math.random() * 120);
    const trends = ['bull','bear','stable','stable'];
    G.marketTrend = trends[Math.floor(Math.random() * trends.length)];
    const msgs = { bull: '📈 Bullenmarkt! Alle Preise +8% für 120s', bear: '📉 Bärenmarkt! Nachfrage -10% für 120s', stable: '📊 Markt stabilisiert sich' };
    addEv('<span style="color:var(--go)">' + msgs[G.marketTrend] + '</span>');
    if(G.marketTrend !== 'stable') notify(msgs[G.marketTrend], G.marketTrend === 'bull' ? 'ok' : 'warn');
  }
}

// ─── NEWS TICK ───
function newsTick() {
  G.newsTimer--;
  if(G.newsTimer <= 0) {
    G.newsTimer = 45 + Math.floor(Math.random() * 60);
    const tmpl = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
    const text = tmpl();
    const sentiment = Math.random();
    const isPos = sentiment > 0.5;
    G.newsItems.unshift({ text, pos: isPos, ts: G.y + 'Q' + G.q, id: Date.now() });
    if(G.newsItems.length > 20) G.newsItems.pop();
    // Stock reaction to news
    G.stockPrice = Math.max(10, G.stockPrice * (1 + (isPos ? 0.01 : -0.01) * Math.random()));
  }
}

// ─── CHALLENGE TICK ───
function challengeTick() {
  // Init challenges if empty
  // Reinit if any challenge has non-function target (happens after JSON restore)
  const hasDeadChallenges = G.challenges.some(ch => typeof ch.target !== 'function');
  if(G.challenges.length === 0 || hasDeadChallenges) {
    G.challenges = CHALLENGE_POOL.slice(0, 3).map(c => ({...c, progress: 0, done: false, startVal: c.target()}));
  }
  G.challenges.forEach(ch => {
    if(ch.done) return;
    if(typeof ch.target !== 'function') return; // skip deserialized (JSON) entries
    const cur = ch.target();
    ch.progress = Math.min(100, ((cur - ch.startVal) / ch.thresh) * 100);
    if(ch.progress >= 100 && !ch.done) {
      ch.done = true;
      G.money += ch.r;
      G.prestigePts += Math.floor(ch.r / 10000);
      notify('🎯 Challenge: ' + ch.name + ' — +€' + fm(ch.r), 'ok');
      addEv('🎯 <span style="color:var(--gn)">Challenge: ' + ch.name + '</span> — +€' + fm(ch.r));
      showBurst('🎯 ' + ch.name, 'Challenge!', '+€' + fm(ch.r));
    }
  });
  // Reset daily
  G.dailyChallengeReset++;
  if(G.dailyChallengeReset >= 360) {
    G.dailyChallengeReset = 0;
    const used = new Set(G.challenges.map(c => c.id));
    const fresh = CHALLENGE_POOL.filter(c => !used.has(c.id));
    if(fresh.length >= 2) {
      G.challenges = [...G.challenges.filter(c => !c.done), ...fresh.slice(0, 3 - G.challenges.filter(c => !c.done).length)].map(c => ({...c, done: false, progress: 0, startVal: c.target()}));
    } else {
      G.challenges = CHALLENGE_POOL.slice(0, 3).map(c => ({...c, done: false, progress: 0, startVal: c.target()}));
    }
    notify('🎯 Neue Challenges verfügbar!', 'info');
  }
}

// ─── EOTM (Employee of the Month) ───
function eotmTick() {
  G.eotmTimer--;
  if(G.eotmTimer <= 0) {
    G.eotmTimer = 120;
    if(G.engTeam.length > 0) {
      const idx = Math.floor(Math.random() * G.engTeam.length);
      G.eotm = G.engTeam[idx];
      G.engTeam[idx].xp += 30;
      G.rep = Math.min(100, G.rep + 2);
      notify('🏅 ' + G.eotm.name + ' ist Mitarbeiter des Monats!', 'ok');
      addEv('🏅 <span style="color:var(--go)">' + G.eotm.name + '</span> — Mitarbeiter des Monats! Rep +2');
    }
  }
  if(G.pressConfCD > 0) G.pressConfCD--;
}

// ─── CREDIT SCORE SYSTEM ───
function updateCreditScore() {
  // Score based on revenue, loans, profitability
  const base = 750;
  const revenueBonus = Math.min(100, G.rev / 100000);
  const loanMalus = G.loans.length * 30;
  const profitBonus = G.rev > G.cost ? 50 : -50;
  G.creditScore = Math.min(850, Math.max(300, base + revenueBonus + profitBonus - loanMalus));
}

// ─── PRICE ADJUSTMENT ───
function setPriceMulti(vid, delta) {
  if(!G.customPrices[vid]) G.customPrices[vid] = 1.0;
  G.customPrices[vid] = Math.max(0.5, Math.min(2.0, G.customPrices[vid] + delta));
  const line = G.lines.find(l => l.veh.id === vid);
  if(line) line.veh.pm = G.customPrices[vid];
  notify('Preis: ' + Math.round(G.customPrices[vid] * 100) + '% des Basispreises', 'ok');
}

// ─── PARTNER SYSTEM ───
function signPartner(id) {
  const p = PARTNER_DATA.find(x => x.id === id);
  if(!p) return;
  if(G.partners.find(x => x.id === id)) { notify('Bereits Partner!', 'warn'); return; }
  if(G.money < p.cost) { notify('Kostet €' + fm(p.cost), 'err'); return; }
  G.money -= p.cost; G.cost += p.cost;
  G.partners.push({...p});
  addEv('🤝 <span style="color:var(--gn)">Partner: ' + p.emoji + ' ' + p.name + '</span> — ' + p.bonus);
  notify('Partner ' + p.name + ' gewonnen!', 'ok');
  spawnPtcls(window.innerWidth/2, window.innerHeight/2, '#00ff88', 20);
}

// ─── LAB SYSTEM ───
function upgradeLab() {
  const cost = G.labLevel * 500000;
  if(G.money < cost) { notify('Kostet €' + fm(cost), 'err'); return; }
  G.money -= cost; G.labLevel++; G.labSlots = Math.min(3, G.labLevel);
  notify('Labor Level ' + G.labLevel + ' — ' + G.labSlots + ' parallele Forschungen!', 'ok');
  addEv('🧪 <span style="color:var(--pu)">F&E Labor Level ' + G.labLevel + '</span>');
}

// ─── RIVALRY ACTIONS ───
function launchCampaignVsRival(rivalId) {
  if(G.money < 500000) { notify('Kostet €500k', 'err'); return; }
  const r = RIVALS.find(x => x.id === rivalId);
  if(!r) return;
  G.money -= 500000;
  const stolen = 1 + Math.random() * 1.5;
  r.sh = Math.max(2, r.sh - stolen);
  G.share = Math.min(45, G.share + stolen * 0.3);
  G.rivalActions++;
  notify('Kampagne gegen ' + r.n + '! Marktanteil -' + stolen.toFixed(1) + '%', 'ok');
  addEv('⚡ <span style="color:var(--gn)">Kampagne gegen ' + r.ic + ' ' + r.n + '</span> — ' + stolen.toFixed(1) + '% gestohlen');
  spawnPtcls(window.innerWidth/2, window.innerHeight/2, '#ff3355', 30);
}

// ─── PRESS CONFERENCE ───
// ─── SUSTAINABILITY GOAL ───
function checkSustainability() {
  if(!G.sustainGoals.achieved && G.co2Index <= G.sustainGoals.co2Target) {
    G.sustainGoals.achieved = true;
    G.money += 1000000;
    G.esgScore = Math.min(100, G.esgScore + 20);
    notify('🌿 CO2-Ziel erreicht! +€1 Mio. + ESG +20', 'ok');
    addEv('🌿 <span style="color:var(--gn)">Nachhaltigkeitsziel erreicht!</span> CO2 ≤ 80 — +€1 Mio.');
    showBurst('🌿 Nachhaltig!', 'CO2-Ziel erfüllt', '+€1 Mio.');
  }
}

// ─── RIVAL STOCK SYSTEM ───
function buyRivalStock(rivalId) {
  const r = RIVALS.find(x => x.id === rivalId);
  const price = r.ca / 1000000;
  if(G.money < price) { notify('Zu wenig Kapital!', 'err'); return; }
  G.money -= price;
  if(!G.rivalStocks[rivalId]) G.rivalStocks[rivalId] = { n: 0, avgPrice: price };
  G.rivalStocks[rivalId].n++;
  G.rivalStocks[rivalId].avgPrice = ((G.rivalStocks[rivalId].avgPrice * (G.rivalStocks[rivalId].n-1)) + price) / G.rivalStocks[rivalId].n;
  notify('Aktie ' + r.n + ' gekauft @€' + fm(price), 'ok');
}

// ─── VEHICLE UPGRADE (beyond tuning) ───
function buyVehicleUpgrade(vid, type) {
  const upgrades = {
    aerodynamics: { name:'Aerodynamik', cost:200000, desc:'+8% Speed', effect:'speed' },
    materials:    { name:'Premium Materialien', cost:350000, desc:'+10% Qualität', effect:'quality' },
    software:     { name:'OTA Software', cost:150000, desc:'+5% Effizienz', effect:'efficiency' },
    branding:     { name:'Premium Branding', cost:400000, desc:'+12% Preis', effect:'price' },
  };
  const up = upgrades[type];
  if(!up) return;
  if(G.money < up.cost) { notify('Kostet €' + fm(up.cost), 'err'); return; }
  if(!G.vehicleUpgrades[vid]) G.vehicleUpgrades[vid] = {};
  if(G.vehicleUpgrades[vid][type]) { notify('Bereits upgegradet!', 'warn'); return; }
  G.money -= up.cost;
  G.vehicleUpgrades[vid][type] = true;
  if(type === 'price') {
    const line = G.lines.find(l => l.veh.id === vid);
    if(line) line.veh.pm = (line.veh.pm || 1) * 1.12;
  }
  notify(up.name + ' auf ' + vid + ' angewendet!', 'ok');
  addEv('🚗 <span style="color:var(--gn)">Upgrade: ' + up.name + '</span> für ' + vid);
}

// ─── EXTEND MAIN TICK ───
// Ensure base tick is on window before wrapping chain begins
if(!window.tick) window.tick = tick;
const _v9OrigTick = window.tick;
function v9Tick(){
  _v9OrigTick();
  newsTick();
  challengeTick();
  eotmTick();
  updateMarketTrend();
  updateCreditScore();
  checkSustainability();
  // Partner bonuses
  G.partners.forEach(p => {
    if(p.effect === 'elec_free' && G.tc % 10 === 0) G.res.elec.v = Math.min(G.res.elec.max, G.res.elec.v + 1);
    if(p.effect === 'rubber_free' && G.tc % 10 === 0) G.res.rubber.v = Math.min(G.res.rubber.max, G.res.rubber.v + 1);
  });
  // Rival stock value change
  Object.keys(G.rivalStocks).forEach(rid => {
    const r = RIVALS.find(x => x.id === rid);
    if(r) {
      const prev = G.rivalStocks[rid].currentPrice || r.ca / 1000000;
      G.rivalStocks[rid].currentPrice = prev * (1 + (Math.random() - 0.49) * 0.04);
    }
  });
  // Market trend effect
  if(G.marketTrend === 'bull') {
    G.lines.forEach(l => { if(!l._bullApplied) { l.veh.pm = (l.veh.pm || 1) * 1.001; } });
  }
  // Rivalry score
  G.rivalryScore = Math.floor(RIVALS.reduce((s, r) => s + (r.sh > G.share ? 1 : 0), 0) * 10 + G.kiAttacks.filter(a => !a.blocked).length * 5);
}
window.tick = v9Tick;

// ─── RENDER NEW VIEWS ───
function rNews(){
  const el = document.getElementById('news-feed');
  if(!el) return;
  if(G.newsItems.length === 0) {
    el.innerHTML = '<div style="color:var(--dm);font-size:12px;text-align:center;padding:14px;">Keine Nachrichten. Läuft nach ~60s...</div>';
    return;
  }
  el.innerHTML = G.newsItems.slice(0, 15).map(n => `
    <div class="${n.pos ? 'gcard-green' : 'gcard-red'}" style="margin-bottom:7px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <span style="font-size:11px;line-height:1.5;font-weight:600;">${n.pos ? '📈' : '📉'} ${n.text}</span>
        <span style="font-size:9px;color:var(--dm);flex-shrink:0;">${n.ts}</span>
      </div>
    </div>`).join('');
}

function rPortfolio(){
  const pfv = Object.entries(G.rivalStocks).reduce((s, [rid, st]) => s + (st.currentPrice || 0) * st.n, 0);
  G.portfolioValue = pfv + G.stockOwned * G.stockPrice;
  const pfEl = document.getElementById('pf-val');
  const roiEl = document.getElementById('pf-roi');
  if(pfEl) pfEl.textContent = '€' + fm(G.portfolioValue);
  const invested = Object.values(G.rivalStocks).reduce((s, st) => s + st.avgPrice * st.n, 0) + G.stockOwned * 100;
  if(roiEl) { const roi = invested > 0 ? ((G.portfolioValue / invested - 1) * 100) : 0; roiEl.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'; roiEl.style.color = roi >= 0 ? 'var(--gn)' : 'var(--rd)'; }
  const pl = document.getElementById('portfolio-list');
  if(pl) pl.innerHTML = `<div class="gcard-cyan">
    <div class="sr"><span class="sl">Auto Empire Aktien</span><span class="sv" style="color:var(--cy)">${G.stockOwned} × €${G.stockPrice.toFixed(2)} = €${fm(G.stockOwned * G.stockPrice)}</span></div>
    ${Object.entries(G.rivalStocks).map(([rid, st]) => {
      const r = RIVALS.find(x => x.id === rid);
      const cur = st.currentPrice || st.avgPrice;
      const roi = ((cur / st.avgPrice) - 1) * 100;
      return `<div class="sr"><span class="sl">${r?.ic} ${r?.n}</span><span class="sv" style="color:${roi>=0?'var(--gn)':'var(--rd)'}">${st.n} × €${fm(cur)} (${roi>=0?'+':''}${roi.toFixed(1)}%)</span></div>`;
    }).join('')}
  </div>`;
  const rs = document.getElementById('rival-stocks');
  if(rs) rs.innerHTML = RIVALS.map(r => {
    const price = r.ca / 1000000;
    const owned = G.rivalStocks[r.id]?.n || 0;
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;color:${r.cl}">${r.ic} ${r.n}</div><div style="font-size:10px;color:var(--t2);">Kurs: €${fm(price)} · Markt: ${r.sh.toFixed(1)}%</div>${owned>0?`<div style="font-size:10px;color:var(--gn);">Besitzt: ${owned} Aktien</div>`:''}</div><button class="btn sm ${G.money>=price?'can':''}" onclick="buyRivalStock('${r.id}')">€${fm(price)}</button></div></div>`;
  }).join('');
}

function rZiele(){
  const pp = document.getElementById('prestige-pts-panel');
  if(pp) pp.innerHTML = `<div class="gcard-pu"><div class="sr"><span class="sl">Prestige-Punkte</span><span class="sv" style="color:var(--pu)">${G.prestigePts} PP</span></div><div class="sr"><span class="sl">Verwendbar für</span><span class="sv">Prestige-Upgrades</span></div><div style="font-size:10px;color:var(--dm);margin-top:5px;">PP werden durch Challenge-Abschlüsse gesammelt</div></div>`;
  const cl = document.getElementById('challenge-list');
  if(!cl) return;
  cl.innerHTML = G.challenges.map(ch => {
    const pct = Math.min(100, ch.progress || 0);
    return `<div class="${ch.done ? 'gcard-green' : 'glass'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:13px;font-weight:700;">${ch.done ? '✓' : '🎯'} ${ch.name}</span>
        <span class="badge ${ch.done ? 'bg' : 'bc'}">+€${fm(ch.r)}</span>
      </div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:5px;">${ch.desc}</div>
      <div class="pw"><div class="pb ${ch.done ? 'gr' : 'cy'}" style="width:${pct}%"></div></div>
      <div style="font-size:10px;color:var(--dm);margin-top:3px;">${pct.toFixed(0)}% abgeschlossen</div>
    </div>`;
  }).join('') + `<button class="btn cy-b" style="margin-top:8px;" onclick="holdPressConference()">🎤 Pressekonferenz halten${G.pressConfCD>0?' ('+G.pressConfCD+'s)':' — Rep +5'}</button>`;
}

function rPartner(){
  const cnt = document.getElementById('pt-cnt');
  const sav = document.getElementById('pt-save');
  if(cnt) cnt.textContent = G.partners.length;
  const dailySav = G.partners.length * 50000;
  if(sav) sav.textContent = '€' + fm(dailySav);
  const pl = document.getElementById('partner-list');
  if(!pl) return;
  pl.innerHTML = PARTNER_DATA.map(p => {
    const active = G.partners.find(x => x.id === p.id);
    return `<div class="${active ? 'gcard-green' : 'glass'}">
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="font-size:24px;">${p.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;">${p.name}</div>
          <div style="font-size:11px;color:var(--gn);margin-top:2px;">✓ ${p.bonus}</div>
          <div style="font-size:10px;color:var(--dm);">Einmalig: €${fm(p.cost)}</div>
        </div>
        ${active ? '<span class="badge bg">AKTIV</span>' : `<button class="btn sm ${G.money>=p.cost?'can':''}" onclick="signPartner('${p.id}')">€${fm(p.cost)}</button>`}
      </div>
    </div>`;
  }).join('');
}

function rForschlab(){
  const lc = document.getElementById('lab-capacity');
  if(lc) lc.innerHTML = `<div class="gcard-pu">
    <div class="sr"><span class="sl">Labor Level</span><span class="sv" style="color:var(--pu)">${G.labLevel}</span></div>
    <div class="sr"><span class="sl">Parallele Slots</span><span class="sv">${G.labSlots}/3</span></div>
    <div class="sr"><span class="sl">F&E Geschwindigkeit</span><span class="sv" style="color:var(--gn)">+${G.labLevel*20}%</span></div>
    <button class="btn ${G.money>=G.labLevel*500000?'pu-b':''}" style="margin-top:8px;" onclick="upgradeLab()">🧪 Labor Level ${G.labLevel+1} — €${fm(G.labLevel*500000)}</button>
  </div>`;
  const tt = document.getElementById('tech-tree');
  if(tt) {
    const trees = [
      {name:'Antriebstechnik', nodes:['Turbo ✓','V8 ✓','Hybrid+','Wasserstoff','Feststoffakku']},
      {name:'Sicherheit',      nodes:['ABS/ESP','Airbag','Lane Assist','L2 Auto','L4 Auto']},
      {name:'Nachhaltigkeit',  nodes:['Recycling','Alu-Bau','Nano-Beschicht.','CO2-Neutral','Null-Emission']},
    ];
    tt.innerHTML = trees.map(t => `<div class="glass" style="margin-bottom:7px;">
      <div style="font-size:11px;font-weight:700;color:var(--cy);margin-bottom:7px;">${t.name}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${t.nodes.map((n,i) => `<div class="chip ${i<2?'gn':i<3?'cy':'dm'}">${n}</div>`).join('')}
      </div>
    </div>`).join('');
  }
}

function rFahrzeugmarkt(){
  const el = document.getElementById('price-adjustment');
  if(!el) return;
  const av = VEHS.filter(v => G.vehs[v.id]?.on);
  if(av.length === 0) { el.innerHTML = '<div style="color:var(--dm);font-size:12px;padding:10px;">Keine Fahrzeuge in Produktion.</div>'; return; }
  el.innerHTML = av.map(v => {
    const pm = G.customPrices[v.id] || 1.0;
    const adjustedPrice = Math.round(v.price * pm);
    const margin = Math.round((1 - v.pc / adjustedPrice) * 100);
    const demand = pm > 1.3 ? 'Niedrig' : pm > 1.1 ? 'Mittel' : pm > 0.9 ? 'Hoch' : 'Sehr hoch';
    const demandCol = pm > 1.3 ? 'var(--rd)' : pm > 1.1 ? 'var(--go)' : 'var(--gn)';
    return `<div class="glass">
      <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${v.e} ${v.name}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:20px;font-weight:700;color:var(--cy);">€${fm(adjustedPrice)}</span>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--t2);">Marge: <b style="color:var(--gn)">${margin}%</b></div>
          <div style="font-size:11px;color:var(--t2);">Nachfrage: <b style="color:${demandCol}">${demand}</b></div>
        </div>
      </div>
      <div class="pw"><div class="pb cy" style="width:${pm*50}%"></div></div>
      <div style="display:flex;gap:7px;margin-top:8px;">
        <button class="btn sm rd-b" onclick="setPriceMulti('${v.id}', -0.05)">▼ -5%</button>
        <button class="btn sm" style="flex:1;font-size:10px;">${Math.round(pm*100)}% Basispreis</button>
        <button class="btn sm can" onclick="setPriceMulti('${v.id}', +0.05)">▲ +5%</button>
      </div>
      <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;">
        ${Object.keys({aerodynamics:'Aero',materials:'Material',software:'OTA',branding:'Brand'}).map(k => {
          const done = G.vehicleUpgrades[v.id]?.[k];
          const costs = {aerodynamics:200000,materials:350000,software:150000,branding:400000};
          const labels = {aerodynamics:'🔵 Aero',materials:'🪨 Mat.',software:'📡 OTA',branding:'💎 Brand'};
          return `<button class="btn sm ${done?'mx':G.money>=costs[k]?'can':''}" onclick="buyVehicleUpgrade('${v.id}','${k}')" ${done?'disabled':''}>${done?'✓':labels[k]+' €'+fm(costs[k])}</button>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function rMitbewerber2(){
  const rt = document.getElementById('riv-threat');
  const ra = document.getElementById('riv-actions');
  if(rt) { rt.textContent = G.rivalryScore; rt.style.color = G.rivalryScore > 50 ? 'var(--rd)' : G.rivalryScore > 25 ? 'var(--go)' : 'var(--gn)'; }
  if(ra) ra.textContent = G.rivalActions;
  const an = document.getElementById('rivalry-analysis');
  if(an) {
    const topRival = [...RIVALS].sort((a,b) => b.sh - a.sh)[0];
    an.innerHTML = `<div class="gcard-red">
      <div style="font-size:12px;font-weight:700;margin-bottom:7px;">⚡ Rivalitäts-Status</div>
      <div class="sr"><span class="sl">Stärkster Rivale</span><span class="sv" style="color:${topRival.cl}">${topRival.ic} ${topRival.n} (${topRival.sh.toFixed(1)}%)</span></div>
      <div class="sr"><span class="sl">Markttrend</span><span class="sv" style="color:${G.marketTrend==='bull'?'var(--gn)':G.marketTrend==='bear'?'var(--rd)':'var(--t2)'}">${G.marketTrend==='bull'?'📈 Bullmarkt':G.marketTrend==='bear'?'📉 Bärenmarkt':'📊 Stabil'}</span></div>
      <div class="sr"><span class="sl">KI-Angriffe total</span><span class="sv">${G.kiAttacks.length}</span></div>
      <div class="sr"><span class="sl">Rival-Werke gebaut</span><span class="sv" style="color:var(--rd)">${G.rivalFacs.length}</span></div>
    </div>`;
  }
  const ral = document.getElementById('rival-actions-list');
  if(ral) ral.innerHTML = RIVALS.map(r => `
    <div class="glass">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:12px;font-weight:700;color:${r.cl}">${r.ic} ${r.n}</span>
        <span class="chip go">${r.sh.toFixed(1)}% Markt</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn sm rd-b" onclick="launchCampaignVsRival('${r.id}')">⚡ Kampagne €500k</button>
        <button class="btn sm pu-b" onclick="buyRivalStock('${r.id}')">📈 Aktie kaufen</button>
      </div>
    </div>`).join('');
}

// ─── EXTEND REDRAW ───
if(!window.redraw) window.redraw = redrawLoop;
const _v9OrigRedraw = window.redraw;
function v9Redraw(){
  _v9OrigRedraw();
  // Only re-render on tab change, not every 900ms tick
  if(!window._tabJustChanged) return;
  const vid = document.querySelector('.view.on')?.id?.replace('v-','');
  switch(vid){
    case 'news':         rNews();         break;
    case 'aktien2':      rPortfolio();    break;
    case 'ziele':        rZiele();        break;
    case 'lieferant2':   rPartner();      break;
    case 'forschlab':    rForschlab();    break;
    case 'fahrzeugmarkt':rFahrzeugmarkt();break;
    case 'mitbewerber2': rMitbewerber2(); break;
  }
}
window.redraw = v9Redraw;

// ─── EXTEND RENDER ALL ───
if(!window.renderAll) window.renderAll = renderAll;
const _v9OrigRenderAll = window.renderAll;
function v9RenderAll(){
  _v9OrigRenderAll();
  rNews(); rPortfolio(); rZiele(); rPartner(); rForschlab(); rFahrzeugmarkt(); rMitbewerber2();
}
window.renderAll = v9RenderAll;

// KPI animation removed — was causing reflow every 5s

// ─── PARTICLE: auto-generate ambient particles ───
setInterval(() => {
  if(G.lines.some(l => l.run) && Math.random() < 0.3) {
    spawnPtcls(Math.random() * window.innerWidth, window.innerHeight, Math.random() > 0.5 ? '#00d4ff' : '#00ff88', 1);
  }
}, 2000);

console.log('🏎️ AUTO EMPIRE v9 — 25 neue Features geladen!');

// ════════════════════════════════════════════════════════
//  AUTO EMPIRE v10  —  25 NEUE REALISTISCHE FEATURES
//  + ADVANCED ANIMATION ENGINE
// ════════════════════════════════════════════════════════

// ─── MATRIX RAIN ───
(function spawnMatrix(){
  const container=document.getElementById('matrix-container');
  if(!container)return;
  container.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
  for(let i=0;i<14;i++){
    const el=document.createElement('div');
    el.className='mat-digit';
    el.textContent=['0','1','█','▓','◈','⊕','⬡'][Math.floor(Math.random()*7)];
    el.style.cssText='position:fixed;font-family:monospace;font-size:'+(8+Math.random()*5)+'px;color:#00d4ff;pointer-events:none;z-index:0;left:'+(Math.random()*100)+'%;animation:matfall '+(6+Math.random()*12)+'s '+(Math.random()*10)+'s linear infinite;opacity:0;';
    container.appendChild(el);
  }
  setInterval(()=>{
    if(container.children.length>22)return;
    const el=document.createElement('div');
    el.className='mat-digit';
    el.textContent=Math.random()>.5?'0':'1';
    el.style.cssText='position:fixed;font-family:monospace;font-size:10px;color:#00d4ff;pointer-events:none;z-index:0;left:'+(Math.random()*100)+'%;animation:matfall '+(5+Math.random()*10)+'s 0s linear 1;opacity:0;';
    container.appendChild(el);
    setTimeout(()=>el.remove(),15000);
  },2500);
})();

// ─── KPI FLASH ───
let _prevVals={};
function flashKPIIfChanged(id,newVal){
  const el=document.getElementById(id);if(!el)return;
  if(_prevVals[id]!==newVal){
    el.classList.remove('odo');void el.offsetWidth;el.classList.add('odo');
    _prevVals[id]=newVal;
    const kpi=el.closest('.kpi');
    if(kpi){kpi.classList.remove('updated');void kpi.offsetWidth;kpi.classList.add('updated');}
  }
}

// ─── CARD ENTRANCE OBSERVER ───
const cardObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('card-enter');cardObs.unobserve(e.target);}});
},{threshold:.1});
setInterval(()=>{document.querySelectorAll('.card:not(.card-enter)').forEach(el=>cardObs.observe(el));},1500);

// ─── EXTEND STATE v10 ───
Object.assign(G,{
  gdpGrowth:2.4,interestRate:3.5,inflation:2.1,unemployment:5.2,
  ecoTimer:240,ecoPhase:'expansion',
  announcements:[],announceCooldown:0,
  acquisitions:[],jointVentures:[],maDealCount:0,
  scHealth:100,scRisk:0,scOptimizations:{},
  esgE:40,esgS:55,esgG:60,
  salesHistory:[],forecastAccuracy:85,
  preorders:{},
  fleetSales:{active:false,discount:.08,volume:0},
  usedCarRevenue:0,usedCarTimer:180,
  recallInsurance:false,
  trainingLevel:0,trainingTimer:0,
  aiAdvice:[],aiAdviceTimer:90,
  limitedEditions:[],leTimer:300,
  dealerNPS:75,defectRate:5.0,
  energyEfficiency:1.0,patentPool:0,
  exportQuote:20,heritagePoints:0,
  investorTimer:0,
  carbonCredits:0,rdCoops:[],
  ipoStatus:'private',ipoValue:0,
  marketTrend:'stable',trendTimer:180,
  prestigePts:G.prestigePts||0,
  partners:G.partners||[],
  challenges:G.challenges||[],
  aiAdvice:[],
});

// ─── DATA ───
var JV_DATA=[
  {id:'jv_toyota',name:'JV mit TOYOTA',partner:'TOYOTA',cost:5000000,bonus:'Batterie -30%, Tech +5%'},
  {id:'jv_bosch',name:'JV BOSCH Electronics',partner:'BOSCH',cost:3000000,bonus:'Elektronik -25%, ADAS frei'},
  {id:'jv_basf',name:'JV BASF Materialien',partner:'BASF',cost:2000000,bonus:'Kunststoff -20%'},
  {id:'jv_panasonic',name:'JV Panasonic Cells',partner:'Panasonic',cost:4000000,bonus:'Batterie Lvl +3 gratis'},
];
var ACQ_TARGETS=[
  {id:'aq_startup',name:'EV-Startup "VoltX"',emoji:'⚡',cost:8000000,benefit:'E-Tech Research +80%'},
  {id:'aq_design',name:'Design Studio "Form+"',emoji:'🎨',cost:3000000,benefit:'Brand +15, Design +3'},
  {id:'aq_battery',name:'BatteryCo Inc.',emoji:'🔋',cost:12000000,benefit:'Batterie Kosten -40%'},
  {id:'aq_software',name:'AutoSoft GmbH',emoji:'💻',cost:5000000,benefit:'OTA + L2 freigeschaltet'},
  {id:'aq_mfg',name:'Fertigungs-Spez. AG',emoji:'🏭',cost:10000000,benefit:'Prod.-Kosten -15%'},
];

// ─── MACRO ECONOMY ───
function ecoTick(){
  G.ecoTimer--;
  if(G.ecoTimer>0)return;
  G.ecoTimer=180+Math.floor(Math.random()*120);
  const phases=['recession','recovery','expansion','boom'];
  if(Math.random()<.3){
    G.ecoPhase=phases[(phases.indexOf(G.ecoPhase)+1)%4];
    const msgs={recession:'Rezession: Nachfrage -15%',recovery:'Erholung: Märkte stabilisieren',expansion:'Expansion: Nachfrage +10%',boom:'BOOM: Rekordnachfrage!'};
    addEv('💰 <span style="color:var(--go)">Konjunktur: '+G.ecoPhase+'</span> — '+msgs[G.ecoPhase]);
    notify('💰 Konjunktur: '+G.ecoPhase,G.ecoPhase==='recession'?'err':G.ecoPhase==='boom'?'ok':'info');
  }
  const pv={recession:{gdp:-1.2,rate:1.0,inf:.8,unemp:8.5},recovery:{gdp:1.5,rate:2.5,inf:1.8,unemp:6.0},expansion:{gdp:2.8,rate:3.5,inf:2.4,unemp:5.0},boom:{gdp:4.5,rate:5.0,inf:3.8,unemp:3.5}}[G.ecoPhase];
  G.gdpGrowth=pv.gdp+(Math.random()-.5)*.5;
  G.interestRate=pv.rate+(Math.random()-.5)*.3;
  G.inflation=pv.inf+(Math.random()-.5)*.4;
  G.unemployment=pv.unemp+(Math.random()-.5)*.8;
  if(G.ecoPhase==='boom')G.lines.forEach(l=>l.veh.pm=Math.min(2,(l.veh.pm||1)*1.015));
  if(G.ecoPhase==='recession')G.lines.forEach(l=>l.veh.pm=Math.max(.7,(l.veh.pm||1)*.985));
}

// ─── USED CAR MARKET ───
function usedCarTick(){
  G.usedCarTimer--;
  if(G.usedCarTimer>0)return;
  G.usedCarTimer=180;
  if(G.prod<50)return;
  const rev=G.prod*50*(1+G.brand/200);
  G.usedCarRevenue+=rev;G.money+=rev;G.rev+=rev;
  addEv('🚗 <span style="color:var(--t2)">Gebrauchtwagenmarkt</span>: +€'+fm(rev));
  floatMoney(rev,true);
  forceTabRefresh();
}

// ─── AI ADVISORY ───
function aiAdviceTick(){
  G.aiAdviceTimer--;
  if(G.aiAdviceTimer>0)return;
  G.aiAdviceTimer=90;
  const pool=[
    ()=>G.ads.size<2?'💡 Mehr Werbung schalten → +'+Math.round(G.ads.size*3)+'% Verkauf':null,
    ()=>G.comp['quality']<3?'⚙️ Qualitätskontrolle verbessern — Defektrate: '+G.defectRate.toFixed(1)+'%':null,
    ()=>G.share<5?'🌍 Mehr Modelle produzieren → Marktanteil +2% pro Modell':null,
    ()=>G.ecoPhase==='boom'?'📈 BOOM! Jetzt Preise erhöhen — Markt trägt +12%':null,
    ()=>G.ecoPhase==='recession'?'📉 Rezession: Kosten senken, Qualität halten':null,
    ()=>G.loans.length>0&&G.money>2000000?'🏦 Kredittilgung möglich — spart Zinsen':null,
    ()=>G.patents.length===0?'📜 Forschung abschließen → automatisch Patente':null,
    ()=>G.esgScore<40?'🌿 ESG verbessern → Zugang zu Subventionen':null,
  ];
  const valid=pool.map(fn=>fn()).filter(Boolean);
  if(valid.length>0){
    G.aiAdvice.unshift({text:valid[Math.floor(Math.random()*valid.length)],ts:G.y+'Q'+G.q});
    if(G.aiAdvice.length>8)G.aiAdvice.pop();
  }
}

// ─── LIMITED EDITIONS ───
function checkLimitedEdition(){
  G.leTimer--;
  if(G.leTimer>0||G.lines.length===0)return;
  G.leTimer=240+Math.floor(Math.random()*120);
  const l=G.lines[Math.floor(Math.random()*G.lines.length)];
  const names=['Black Edition','Concept Line','Heritage','Sport+','Exclusive'];
  const name=l.veh.name+' '+names[Math.floor(Math.random()*names.length)];
  const prem=1.25+Math.random()*.35;
  const units=5+Math.floor(Math.random()*15);
  const rev=units*l.veh.price*prem;
  G.money+=rev;G.rev+=rev;
  if(!G.limitedEditions)G.limitedEditions=[];
  G.limitedEditions.unshift({name,prem:Math.round(prem*100),units,rev,ts:G.y+'Q'+G.q});
  if(G.limitedEditions.length>8)G.limitedEditions.pop();
  G.rep=Math.min(100,G.rep+3);G.brand=Math.min(100,G.brand+2);
  addEv('✨ <span style="color:var(--go)">Limited: '+name+'</span> '+units+' Stück → +€'+fm(rev));
  notify('✨ Limited Edition: '+name,'ok');
  floatMoney(rev,true);
  spawnPtcls(window.innerWidth/2,window.innerHeight*.4,'#ffaa00',25);
}

// ─── CARBON CREDITS ───
function carbonCreditTick(){
  const evOn=['id4','beetle','id_buzz'].filter(id=>G.vehs[id]?.on).length;
  if(evOn===0)return;
  G.carbonCredits=(G.carbonCredits||0)+evOn*.01;
  if(G.carbonCredits>=10){
    const val=Math.floor(G.carbonCredits)*5000;
    G.money+=val;G.rev+=val;
    G.carbonCredits-=Math.floor(G.carbonCredits);
    addEv('🌿 <span style="color:var(--gn)">Carbon Credits → +€'+fm(val)+'</span>');
    floatMoney(val,true);
  }
}

// ─── MARKET TREND ───
function trendTick(){
  G.trendTimer--;
  if(G.trendTimer>0)return;
  G.trendTimer=120+Math.floor(Math.random()*120);
  const t=['bull','bear','stable','stable'];
  G.marketTrend=t[Math.floor(Math.random()*t.length)];
  if(G.marketTrend!=='stable'){
    const m={bull:'📈 Bullenmarkt! Preise +8%',bear:'📉 Bärenmarkt! Nachfrage -10%'};
    addEv('<span style="color:var(--go)">'+m[G.marketTrend]+'</span>');
    notify(m[G.marketTrend],G.marketTrend==='bull'?'ok':'warn');
  }
}

// ─── DEFECT SYSTEM ───
function defectTick(){
  G.defectRate=Math.max(.1,5-(G.comp['quality']||0)*.4-(G.rdone['aiq']?1:0)-(G.trainingLevel||0)*.3);
}

// ─── ACTIONS ───
function announceVehicle(vid){
  const v=VEHS.find(x=>x.id===vid);if(!v)return;
  if(G.announcements.includes(vid)){notify('Bereits angekündigt!','warn');return;}
  if(G.announceCooldown>0){notify('Cooldown: '+G.announceCooldown+'s','warn');return;}
  const bonus=Math.floor(v.price*(50+Math.floor(Math.random()*100)));
  G.money+=bonus;G.rev+=bonus;
  G.announcements.push(vid);G.announceCooldown=60;
  G.rep=Math.min(100,G.rep+5);G.brand=Math.min(100,G.brand+3);
  G.preorders[vid]=(G.preorders[vid]||0)+(50+Math.floor(Math.random()*100));
  addEv('📢 <span style="color:var(--go)">Ankündigung: '+v.e+' '+v.name+'</span> — '+G.preorders[vid]+' Vorbestellungen, +€'+fm(bonus));
  notify('Ankündigung: '+v.name,' ok');floatMoney(bonus,true);
  spawnPtcls(window.innerWidth/2,window.innerHeight*.3,'#ffaa00',20);
  forceTabRefresh();
}

function startFleetDeal(){
  if(G.fleetSales.active){notify('Flottenvertrag läuft!','warn');return;}
  if(G.money<100000){notify('Setup: €100k','err');return;}
  G.money-=100000;G.fleetSales.active=true;
  const activeVehs=VEHS.filter(v=>G.vehs[v.id]?.on);
  const rev=activeVehs.reduce((s,v)=>s+v.price*.92*v.cap,0)*3;
  G.money+=rev;G.rev+=rev;
  addEv('🚗 <span style="color:var(--cy)">Flottenvertrag</span>: +€'+fm(rev));
  notify('Flottenvertrag! +€'+fm(rev),'ok');floatMoney(rev,true);
}

function doAcquisition(id){
  const t=ACQ_TARGETS.find(x=>x.id===id);if(!t)return;
  if(G.acquisitions.includes(id)){notify('Bereits akquiriert!','warn');return;}
  if(G.money<t.cost){notify('Brauche €'+fm(t.cost),'err');return;}
  G.money-=t.cost;G.acquisitions.push(id);G.maDealCount++;
  if(t.id==='aq_design'){G.brand=Math.min(100,G.brand+15);}
  if(t.id==='aq_software'){G.rdone['ota']=true;G.rdone['l2']=true;}
  if(t.id==='aq_mfg'){G.lines.forEach(l=>l.rate*=1.15);}
  addEv('🔀 <span style="color:var(--pu)">Akquisition: '+t.emoji+' '+t.name+'</span> — '+t.benefit);
  notify('Akquisition: '+t.name,'ok');
  showBurst('🔀 Deal!',t.name,t.benefit);
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#bb55ff',35);
  forceTabRefresh();
}

function doJV(id){
  const jv=JV_DATA.find(x=>x.id===id);if(!jv)return;
  if(G.jointVentures.includes(id)){notify('JV aktiv!','warn');return;}
  if(G.money<jv.cost){notify('Brauche €'+fm(jv.cost),'err');return;}
  G.money-=jv.cost;G.jointVentures.push(id);G.maDealCount++;
  addEv('🤝 <span style="color:var(--cy)">JV: '+jv.name+'</span> — '+jv.bonus);
  notify('JV mit '+jv.partner+'!','ok');
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#00d4ff',20);
  forceTabRefresh();
}

function startTraining(){
  if(G.money<200000){notify('€200k','err');return;}
  if(G.trainingTimer>0){notify('Läuft: '+G.trainingTimer+'s','warn');return;}
  G.money-=200000;G.trainingTimer=120;
  notify('Ausbildung startet (120s)...','ok');
}

function optimizeSC(type){
  const opts={
    diversify:{cost:300000,name:'Lieferanten diversifizieren'},
    buffer:{cost:400000,name:'Pufferlagerhaltung'},
    jit:{cost:200000,name:'JIT Optimierung'},
  };
  const o=opts[type];if(!o)return;
  if(G.scOptimizations[type]){notify('Bereits aktiv!','warn');return;}
  if(G.money<o.cost){notify('€'+fm(o.cost),'err');return;}
  G.money-=o.cost;G.scOptimizations[type]=true;
  G.scHealth=Math.min(100,G.scHealth+15);G.scRisk=Math.max(0,G.scRisk-20);
  notify(o.name+' aktiv!','ok');
  addEv('⛓️ <span style="color:var(--cy)">SC: '+o.name+'</span>');
  forceTabRefresh();
}

function doESGAction(type){
  const acts={
    solar:         {cost:500000,name:'☀️ Solaranlage',     eB:15,co2:10},
    green_fleet:   {cost:300000,name:'🚗 Grüne Flotte',    sB:10,rep:5},
    diversity:     {cost:200000,name:'🤝 Diversity-Prog.', sB:15,gB:10},
    transparency:  {cost:150000,name:'📊 ESG-Reporting',   gB:20,rep:3},
    reforestation: {cost:400000,name:'🌳 Aufforstung',     eB:20,co2:15},
  };
  const a=acts[type];if(!a)return;
  if(G.money<a.cost){notify('€'+fm(a.cost),'err');return;}
  G.money-=a.cost;
  if(a.eB)G.esgE=Math.min(100,G.esgE+a.eB);
  if(a.sB)G.esgS=Math.min(100,G.esgS+a.sB);
  if(a.gB)G.esgG=Math.min(100,G.esgG+a.gB);
  if(a.co2)G.co2Index=Math.max(20,G.co2Index-a.co2);
  if(a.rep)G.rep=Math.min(100,G.rep+a.rep);
  G.esgScore=Math.round((G.esgE+G.esgS+G.esgG)/3);
  G.carbonCredits=(G.carbonCredits||0)+(a.co2||0);
  notify(a.name+' gestartet!','ok');
  addEv('🌱 <span style="color:var(--gn)">ESG: '+a.name+'</span>');
  spawnPtcls(window.innerWidth/2,window.innerHeight*.5,'#00ff88',20);
  forceTabRefresh();
}

function launchIPO(){
  if(G.ipoStatus!=='private'){notify('Bereits börsennotiert!','warn');return;}
  if(G.share<10){notify('Brauche 10% Marktanteil','err');return;}
  if(G.rev<5000000){notify('Brauche €5 Mio. Umsatz','err');return;}
  const val=G.money*3+G.rev*2;
  G.ipoValue=val;G.money+=val*.1;G.ipoStatus='public';
  G.stockPrice=Math.max(G.stockPrice,val/10000000);
  addEv('🚀 <span style="color:var(--go)">IPO! +€'+fm(val*.1)+'</span>');
  notify('IPO! +€'+fm(val*.1),'ok');
  showBurst('🚀 IPO!','Börsennotierg!','+€'+fm(val*.1));
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',60);
  spawnPtcls(window.innerWidth*.3,window.innerHeight/2,'#00d4ff',30);
  spawnPtcls(window.innerWidth*.7,window.innerHeight/2,'#00ff88',30);
}

function holdInvestorMeeting(){
  if(G.investorTimer>0){notify('Meeting in '+G.investorTimer+'s','warn');return;}
  const bonus=Math.floor(G.rev*.05+G.share*10000);
  G.money+=bonus;G.investorTimer=240;G.rep=Math.min(100,G.rep+3);
  notify('Investoren-Meeting! +€'+fm(bonus),'ok');
  addEv('💼 <span style="color:var(--cy)">Investoren-Meeting</span>: +€'+fm(bonus));
  floatMoney(bonus,true);
}

function startRDCoop(partner){
  const c={fraunhofer:{name:'Fraunhofer Institut',cost:400000},mit:{name:'MIT Research',cost:500000},stanford:{name:'Stanford AI Lab',cost:600000}};
  const co=c[partner];if(!co)return;
  if((G.rdCoops||[]).includes(partner)){notify('Läuft bereits!','warn');return;}
  if(G.money<co.cost){notify('€'+fm(co.cost),'err');return;}
  G.money-=co.cost;
  if(!G.rdCoops)G.rdCoops=[];
  G.rdCoops.push(partner);
  notify('F&E Kooperation: '+co.name,'ok');
  addEv('🔬 <span style="color:var(--pu)">F&E Koop: '+co.name+'</span>');
}

function buyRecallInsurance(){
  if(G.recallInsurance){notify('Bereits versichert!','warn');return;}
  if(G.money<300000){notify('€300k','err');return;}
  G.money-=300000;G.recallInsurance=true;
  notify('Rückrufversicherung aktiv!','ok');
}

function setPriceMulti(vid,delta){
  if(!G.customPrices)G.customPrices={};
  if(!G.customPrices[vid])G.customPrices[vid]=1.0;
  G.customPrices[vid]=Math.max(.5,Math.min(2.0,G.customPrices[vid]+delta));
  const line=G.lines.find(l=>l.veh.id===vid);
  if(line)line.veh.pm=G.customPrices[vid];
  notify('Preis: '+Math.round(G.customPrices[vid]*100)+'% Basispreis','ok');
}

function buyVehicleUpgrade(vid,type){
  if(!G.vehicleUpgrades)G.vehicleUpgrades={};
  if(!G.vehicleUpgrades[vid])G.vehicleUpgrades[vid]={};
  if(G.vehicleUpgrades[vid][type]){notify('Bereits upgegradet!','warn');return;}
  const costs={aerodynamics:200000,materials:350000,software:150000,branding:400000};
  const c=costs[type];if(!c)return;
  if(G.money<c){notify('€'+fm(c),'err');return;}
  G.money-=c;G.vehicleUpgrades[vid][type]=true;
  if(type==='branding'){const l=G.lines.find(x=>x.veh.id===vid);if(l)l.veh.pm=(l.veh.pm||1)*1.12;}
  notify('Upgrade: '+type+' auf '+vid,'ok');
  addEv('🚗 <span style="color:var(--gn)">Upgrade: '+type+'</span> für '+vid);
}

function buyRivalStock(rid){
  const r=RIVALS.find(x=>x.id===rid);if(!r)return;
  const price=Math.floor(r.ca/1000000);
  if(G.money<price){notify('Zu wenig Kapital!','err');return;}
  G.money-=price;
  if(!G.rivalStocks)G.rivalStocks={};
  if(!G.rivalStocks[rid])G.rivalStocks[rid]={n:0,avgPrice:price,currentPrice:price};
  G.rivalStocks[rid].n++;
  notify(r.n+' Aktie @€'+fm(price),'ok');
}

function launchCampaignVsRival(rid){
  if(G.money<500000){notify('€500k','err');return;}
  const r=RIVALS.find(x=>x.id===rid);if(!r)return;
  G.money-=500000;
  const stolen=1+Math.random()*1.5;
  r.sh=Math.max(2,r.sh-stolen);
  G.share=Math.min(45,G.share+stolen*.3);
  if(!G.rivalActions)G.rivalActions=0;
  G.rivalActions++;
  notify('Kampagne gegen '+r.n+'! -'+stolen.toFixed(1)+'%','ok');
  addEv('⚡ <span style="color:var(--gn)">Kampagne vs '+r.ic+' '+r.n+'</span> — '+stolen.toFixed(1)+'% gestohlen');
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ff3355',25);
}

function holdPressConference(){
  if(G.pressConfCD>0){notify('Cooldown: '+G.pressConfCD+'s','warn');return;}
  const bonus=Math.floor(G.rep*1000+G.share*5000);
  G.money+=bonus;G.rep=Math.min(100,G.rep+5);G.brand=Math.min(100,G.brand+3);
  G.pressConfCD=180;
  addEv('🎤 <span style="color:var(--cy)">Pressekonferenz</span> — Rep +5, +€'+fm(bonus));
  notify('Pressekonferenz! +€'+fm(bonus),'ok');
  floatMoney(bonus,true);
  spawnPtcls(window.innerWidth/2,window.innerHeight*.3,'#00d4ff',20);
}

// ─── EXTEND TICK v10 ───
const _v10Tick=window.tick;
function v10Tick(){
  _v10Tick();
  ecoTick();usedCarTick();aiAdviceTick();checkLimitedEdition();
  carbonCreditTick();trendTick();defectTick();
  if(G.announceCooldown>0)G.announceCooldown--;
  if(G.investorTimer>0)G.investorTimer--;
  if(G.trainingTimer>0){G.trainingTimer--;if(G.trainingTimer===0){G.trainingLevel++;G.workerHappy=Math.min(100,G.workerHappy+10);notify('Training abgeschlossen! Eff. +'+(G.trainingLevel*5)+'%','ok');}}
  G.dealerNPS=Math.round(Math.min(100,Math.max(0,50+G.qualScore*8+G.brand*.2)));
  G.scHealth=Math.max(G.scOptimizations['buffer']?80:50,G.scHealth-.005);
  G.scRisk=Math.max(0,100-G.scHealth);
  G.heritagePoints=Math.floor(G.prod/100+G.raceWins*10+(G.missionsDone||[]).length*5);
  G.esgScore=Math.round((G.esgE+G.esgS+G.esgG)/3);
  // Partner resource bonuses
  if(G.partners){G.partners.forEach(p=>{if(p.effect==='elec_free'&&G.tc%10===0)G.res.elec.v=Math.min(G.res.elec.max,G.res.elec.v+1);if(p.effect==='rubber_free'&&G.tc%10===0)G.res.rubber.v=Math.min(G.res.rubber.max,G.res.rubber.v+1);});}
  // Rival stocks drift
  if(G.rivalStocks){Object.keys(G.rivalStocks).forEach(rid=>{const rs=G.rivalStocks[rid];rs.currentPrice=Math.max(.1,(rs.currentPrice||rs.avgPrice)*(1+(Math.random()-.49)*.04));});}
  flashKPIIfChanged('d-rev',fm(dailyRev()));
  flashKPIIfChanged('d-prod',fm(G.prod));
}
window.tick=v10Tick;

// ─── RENDER NEW VIEWS ───
function rWirtschaft(){
  const phC={recession:'var(--rd)',recovery:'var(--go)',expansion:'var(--cy)',boom:'var(--gn)'};
  const phE={recession:'📉',recovery:'📊',expansion:'📈',boom:'🚀'};
  ['eco-gdp','eco-rate','eco-inf','eco-unemp'].forEach((id,i)=>{
    const el=document.getElementById(id);if(!el)return;
    const vals=[(G.gdpGrowth>=0?'+':'')+G.gdpGrowth.toFixed(1)+'%',G.interestRate.toFixed(1)+'%',G.inflation.toFixed(1)+'%',G.unemployment.toFixed(1)+'%'];
    const cols=[G.gdpGrowth>=0?'var(--gn)':'var(--rd)',G.interestRate>4?'var(--rd)':'var(--go)',G.inflation>3?'var(--rd)':'var(--go)',G.unemployment>7?'var(--rd)':'var(--gn)'];
    el.textContent=vals[i];el.style.color=cols[i];
  });
  const ee=document.getElementById('eco-effects');
  if(ee)ee.innerHTML=`
    <div class="glass">
      <div style="font-size:14px;font-weight:700;color:${phC[G.ecoPhase]};margin-bottom:8px;">${phE[G.ecoPhase]} ${G.ecoPhase.charAt(0).toUpperCase()+G.ecoPhase.slice(1)}</div>
      <div class="sr"><span class="sl">Nachfrage-Effekt</span><span class="sv" style="color:${phC[G.ecoPhase]}">${G.ecoPhase==='boom'?'+12%':G.ecoPhase==='expansion'?'+8%':G.ecoPhase==='recovery'?'+2%':'-15%'}</span></div>
      <div class="sr"><span class="sl">KI-Advisory</span><span class="sv" style="color:var(--cy);font-size:11px;">${(G.aiAdvice&&G.aiAdvice[0]?.text)||'Analyse...'}</span></div>
      <div class="sr"><span class="sl">Dealer-NPS</span><span class="sv" style="color:${G.dealerNPS>70?'var(--gn)':'var(--go)'}">${G.dealerNPS}/100</span></div>
      <div class="sr"><span class="sl">Defektrate</span><span class="sv" style="color:${G.defectRate<2?'var(--gn)':G.defectRate<4?'var(--go)':'var(--rd)'}">${G.defectRate.toFixed(1)}%</span></div>
      <div class="sr"><span class="sl">Heritage-Punkte</span><span class="sv">${G.heritagePoints}</span></div>
    </div>
    <div class="sh">KONJUNKTURPHASEN</div>
    <div style="display:flex;gap:4px;">
      ${['recession','recovery','expansion','boom'].map(p=>`<div style="flex:1;text-align:center;padding:7px 3px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid ${p===G.ecoPhase?phC[p]:'var(--bdr)'};background:${p===G.ecoPhase?phC[p]+'22':'transparent'};color:${p===G.ecoPhase?phC[p]:'var(--dm)'}">${phE[p]}<br>${p}</div>`).join('')}
    </div>
    <div class="sh">LIMITED EDITIONS</div>
    ${G.limitedEditions&&G.limitedEditions.length?G.limitedEditions.slice(0,4).map(le=>`<div class="gcard-gold" style="margin-bottom:5px;"><b style="color:var(--go)">✨ ${le.name}</b><div style="font-size:10px;color:var(--t2);">${le.units} Stück · +${le.prem-100}% · €${fm(le.rev)} · ${le.ts}</div></div>`).join(''):'<div style="color:var(--dm);font-size:11px;padding:6px;">Erscheint automatisch ~alle 4 Min.</div>'}`;
  const ec=document.getElementById('eco-cycle');
  if(ec)ec.innerHTML='<button class="btn go-b" onclick="holdPressConference()">🎤 Pressekonferenz'+(G.pressConfCD>0?' ('+G.pressConfCD+'s)':' — Rep+5, Kapitalbonus')+'</button><button class="btn cy-b" style="margin-top:7px;" onclick="holdInvestorMeeting()">💼 Investoren-Meeting'+(G.investorTimer>0?' ('+G.investorTimer+'s)':'')+'</button><button class="btn pu-b" style="margin-top:7px;" onclick="launchIPO()">🚀 IPO '+(G.ipoStatus==='public'?'✓ Börsennotiert':'— mind. 10% Markt')+'</button>';
}

function rAnkuendigungen(){
  const aa=document.getElementById('announce-active');
  if(aa)aa.innerHTML=G.announcements.length?G.announcements.map(vid=>{const v=VEHS.find(x=>x.id===vid);return v?`<div class="gcard-gold"><b style="color:var(--go)">${v.e} ${v.name} — ANGEKÜNDIGT</b><div style="font-size:11px;color:var(--t2);">${G.preorders[vid]||0} Vorbestellungen</div></div>`:''}).join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;">Noch keine Ankündigungen</div>';
  const al=document.getElementById('announce-list');if(!al)return;
  const notAnn=VEHS.filter(v=>!G.announcements.includes(v.id));
  if(notAnn.length===0){al.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Alle angekündigt!</div>';return;}
  al.innerHTML=notAnn.map(v=>`<div class="glass"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:26px;">${v.e}</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${v.name}</div><div style="font-size:10px;color:var(--t2);">€${fm(v.price)} · ${v.seg}</div></div><button class="btn sm go-b" onclick="announceVehicle('${v.id}')" ${G.announceCooldown>0?'disabled':''}>📢 ${G.announceCooldown>0?G.announceCooldown+'s':'Ankündigen'}</button></div></div>`).join('');
}

function rFusion2(){
  const mc=document.getElementById('ma-deals');const mv=document.getElementById('ma-val');
  if(mc)mc.textContent=G.maDealCount||0;
  if(mv)mv.textContent='€'+fm((G.acquisitions.length*3e6)+(G.jointVentures.length*1.5e6));
  const al=document.getElementById('acquisition-list');
  if(al)al.innerHTML=ACQ_TARGETS.map(t=>{const done=G.acquisitions.includes(t.id);return `<div class="${done?'gcard-green':'glass'}"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">${t.emoji}</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${t.name}</div><div style="font-size:11px;color:var(--gn);">${t.benefit}</div><div style="font-size:10px;color:var(--dm);">€${fm(t.cost)}</div></div>${done?'<span class="badge bg">✓</span>':`<button class="btn sm ${G.money>=t.cost?'pu-b':''}" onclick="doAcquisition('${t.id}')">Kaufen</button>`}</div></div>`;}).join('');
  const jl=document.getElementById('jv-list');
  if(jl)jl.innerHTML=JV_DATA.map(jv=>{const done=G.jointVentures.includes(jv.id);return `<div class="${done?'gcard-cyan':'glass'}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">${jv.name}</span>${done?'<span class="badge bc">AKTIV</span>':`<span style="color:var(--go)">€${fm(jv.cost)}</span>`}</div><div style="font-size:11px;color:var(--gn);">${jv.bonus}</div>${done?'':`<button class="btn sm cy-b" style="margin-top:6px;" onclick="doJV('${jv.id}')">JV starten</button>`}</div>`;}).join('');
}

function rLieferkette(){
  const sch=document.getElementById('sc-health');const scr=document.getElementById('sc-risk');
  if(sch){sch.textContent=(G.scHealth||100).toFixed(0)+'%';sch.style.color=G.scHealth>80?'var(--gn)':G.scHealth>50?'var(--go)':'var(--rd)';}
  if(scr){scr.textContent=(G.scRisk||0).toFixed(0)+'%';scr.style.color=G.scRisk>50?'var(--rd)':G.scRisk>25?'var(--go)':'var(--gn)';}
  const ss=document.getElementById('sc-status');
  if(ss)ss.innerHTML=`<div class="glass">
    <div class="sr"><span class="sl">SC Gesundheit</span><span class="sv">${(G.scHealth||100).toFixed(0)}%</span></div>
    <div class="pw"><div class="pb ${G.scHealth>70?'gr':G.scHealth>40?'go':'rd'}" style="width:${G.scHealth||100}%"></div></div>
    <div class="sr"><span class="sl">Defektrate</span><span class="sv" style="color:${G.defectRate<2?'var(--gn)':G.defectRate<4?'var(--go)':'var(--rd)'}">${G.defectRate.toFixed(1)}%</span></div>
    <div class="sr"><span class="sl">Gebrauchtwagenerlöse</span><span class="sv" style="color:var(--gn)">€${fm(G.usedCarRevenue||0)}</span></div>
    <div class="sr"><span class="sl">Carbon Credits</span><span class="sv" style="color:var(--gn)">${(G.carbonCredits||0).toFixed(1)}</span></div>
    <div class="sr"><span class="sl">Training Level</span><span class="sv">${G.trainingLevel||0}${G.trainingTimer>0?' (läuft '+G.trainingTimer+'s)':''}</span></div>
    <div class="sr"><span class="sl">Rückrufversicherung</span><span class="sv" style="color:${G.recallInsurance?'var(--gn)':'var(--rd)'}">${G.recallInsurance?'✓ Aktiv':'✗ Keine'}</span></div>
    <div class="sr"><span class="sl">Flottenvertrag</span><span class="sv" style="color:${G.fleetSales.active?'var(--gn)':'var(--dm)'}">${G.fleetSales.active?'✓ Aktiv':'Nicht aktiv'}</span></div>
  </div>`;
  const sa=document.getElementById('sc-actions');
  if(sa)sa.innerHTML=[{type:'diversify',name:'Lieferanten diversifizieren',cost:300000,desc:'SC Risk -20%, Health +15%'},{type:'buffer',name:'Pufferlagerhaltung',cost:400000,desc:'Health stabil, Embargo-Schutz'},{type:'jit',name:'JIT Optimierung',cost:200000,desc:'Lagerkosten -30%'}].map(o=>{const done=G.scOptimizations[o.type];return `<div class="${done?'gcard-green':'glass'}" style="margin-bottom:6px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;">${o.name}</div><div style="font-size:10px;color:var(--t2);">${o.desc}</div></div>${done?'<span class="badge bg">✓</span>':`<button class="btn sm ${G.money>=o.cost?'can':''}" onclick="optimizeSC('${o.type}')">€${fm(o.cost)}</button>`}</div></div>`;}).join('')+
  `<button class="btn go-b" style="margin-top:8px;" onclick="startTraining()">🎓 Ausbildung ${G.trainingTimer>0?'läuft '+G.trainingTimer+'s':'— €200k'}</button>
   <button class="btn cy-b" style="margin-top:6px;" onclick="startFleetDeal()">🚗 Flottenvertrag ${G.fleetSales.active?'(AKTIV)':'— €100k'}</button>
   <button class="btn ${G.recallInsurance?'mx':'rd-b'}" style="margin-top:6px;" onclick="buyRecallInsurance()" ${G.recallInsurance?'disabled':''}>🛡️ Rückrufversicherung ${G.recallInsurance?'(AKTIV)':'— €300k'}</button>`;
}

function rNachhaltigkeit(){
  G.esgScore=Math.round(((G.esgE||40)+(G.esgS||55)+(G.esgG||60))/3);
  const et=document.getElementById('esg-total');const er=document.getElementById('esg-rank');
  if(et){et.textContent=G.esgScore;et.style.color=G.esgScore>70?'var(--gn)':G.esgScore>40?'var(--go)':'var(--rd)';}
  const rating=G.esgScore>80?'AAA':G.esgScore>70?'AA':G.esgScore>60?'A':G.esgScore>50?'BBB':G.esgScore>40?'BB':'B';
  if(er){er.textContent=rating;er.style.color=G.esgScore>70?'var(--gn)':G.esgScore>50?'var(--go)':'var(--rd)';}
  const eb=document.getElementById('esg-breakdown');
  if(eb)eb.innerHTML=`<div class="glass">
    <div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:var(--gn)">🌿 Environmental</span><span style="font-weight:700;color:var(--gn)">${G.esgE||40}%</span></div><div class="pw"><div class="pb gr" style="width:${G.esgE||40}%"></div></div></div>
    <div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:var(--cy)">👥 Social</span><span style="font-weight:700;color:var(--cy)">${G.esgS||55}%</span></div><div class="pw"><div class="pb cy" style="width:${G.esgS||55}%"></div></div></div>
    <div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:var(--pu)">🏛️ Governance</span><span style="font-weight:700;color:var(--pu)">${G.esgG||60}%</span></div><div class="pw"><div class="pb pu" style="width:${G.esgG||60}%"></div></div></div>
    <div style="margin-top:8px;" class="sr"><span class="sl">Carbon Credits</span><span class="sv" style="color:var(--gn)">${(G.carbonCredits||0).toFixed(1)} (€${fm((G.carbonCredits||0)*5000)})</span></div>
    <div class="sr"><span class="sl">CO2-Ziel ≤80</span><span class="sv" style="color:${G.sustainGoals?.achieved?'var(--gn)':'var(--dm)'}">${G.sustainGoals?.achieved?'✓ ERREICHT':'CO2: '+G.co2Index.toFixed(0)}</span></div>
  </div>`;
  const ea=document.getElementById('esg-actions');
  if(ea)ea.innerHTML=[
    {t:'solar',n:'☀️ Solaranlage',c:500000,d:'E +15, CO2 -10'},
    {t:'green_fleet',n:'🚗 Grüne Flotte',c:300000,d:'S +10, Rep +5'},
    {t:'diversity',n:'🤝 Diversity',c:200000,d:'S +15, G +10'},
    {t:'transparency',n:'📊 ESG-Report',c:150000,d:'G +20, Rep +3'},
    {t:'reforestation',n:'🌳 Aufforstung',c:400000,d:'E +20, CO2 -15'},
  ].map(a=>`<div class="glass" style="margin-bottom:5px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;">${a.n}</div><div style="font-size:10px;color:var(--gn);">${a.d}</div></div><button class="btn sm ${G.money>=a.c?'can':''}" onclick="doESGAction('${a.t}')">€${fm(a.c)}</button></div></div>`).join('')+
  `<div class="sh">F&E KOOPERATIONEN</div>
  ${[{id:'fraunhofer',n:'Fraunhofer Institut',c:400000},{id:'mit',n:'MIT Research',c:500000},{id:'stanford',n:'Stanford AI Lab',c:600000}].map(co=>`<div class="glass" style="margin-bottom:5px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;font-weight:700;">🔬 ${co.n}</span>${(G.rdCoops||[]).includes(co.id)?'<span class="badge bg">AKTIV</span>':`<button class="btn sm ${G.money>=co.c?'pu-b':''}" onclick="startRDCoop('${co.id}')">€${fm(co.c)}</button>`}</div></div>`).join('')}`;
  const cd=document.getElementById('co2-detail');
  if(cd)cd.innerHTML='';
}

function rAbsatz(){
  const at=document.getElementById('absatz-table');
  if(at){
    const prods=VEHS.filter(v=>G.vehs[v.id]?.on);
    if(!prods.length){at.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Keine aktiven Produktionen.</div>';return;}
    at.innerHTML=prods.map(v=>{
      const n=G.vehs[v.id].n||0;
      const pm=G.customPrices?.[v.id]||1;
      const profit=n*(v.price*pm-v.pc);
      const preord=G.preorders?.[v.id]||0;
      const sc=SEASON_CFG[G.season];
      const sm=(sc.bonus?.[v.id]||1)*(sc.malus?.[v.id]||1);
      return `<div class="glass">
        <div style="display:flex;justify-content:space-between;margin-bottom:7px;"><span style="font-size:14px;font-weight:700;">${v.e} ${v.name}</span><span class="badge ${n>0?'bg':'br'}">${n} prod.</span></div>
        <div class="g2">
          <div style="background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.15);border-radius:7px;padding:6px;text-align:center;"><div style="font-size:12px;font-weight:700;color:var(--gn)">€${fm(profit)}</div><div style="font-size:8px;color:var(--dm)">GESAMT-PROFIT</div></div>
          <div style="background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:7px;padding:6px;text-align:center;"><div style="font-size:12px;font-weight:700;color:var(--cy)">${preord}</div><div style="font-size:8px;color:var(--dm)">VORBESTELLUNGEN</div></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:${sm>1?'var(--gn)':sm<1?'var(--rd)':'var(--dm)'};">${sm>1?'▲ Saisonbonus +'+Math.round((sm-1)*100)+'%':sm<1?'▼ Saisonschwäche -'+Math.round((1-sm)*100)+'%':'Normale Nachfrage'}</div>
      </div>`;
    }).join('');
  }
  const ar=document.getElementById('absatz-regions');
  if(ar)ar.innerHTML=Object.entries(G.regions).filter(([k,v])=>v.unlocked).map(([k,r])=>`<div class="glass" style="display:flex;gap:10px;align-items:center;margin-bottom:6px;"><div style="font-size:20px;">${r.flag}</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">${r.name}</div><div class="pw" style="margin-top:4px;"><div class="pb cy" style="width:${Math.min(100,r.dealers*12)}%"></div></div></div><div style="text-align:right;font-size:12px;font-weight:700;color:var(--cy)">€${fm(Math.floor(dailyRev()*r.demand/5))}<div style="font-size:9px;color:var(--dm)">est./Tag</div></div></div>`).join('');
  const af=document.getElementById('absatz-forecast');
  if(af){
    const t=G.marketTrend==='bull'?1.1:G.marketTrend==='bear'?.9:1;
    const eco=G.ecoPhase==='boom'?1.12:G.ecoPhase==='recession'?.85:1;
    const factor=t*eco;
    af.innerHTML=`<div class="gcard-cyan">
      <div class="sr"><span class="sl">Prognose nächste Woche</span><span class="sv" style="color:${factor>1?'var(--gn)':'var(--rd)'}">€${fm(dailyRev()*7*factor)}</span></div>
      <div class="sr"><span class="sl">Prognose nächster Monat</span><span class="sv" style="color:${factor>1?'var(--gn)':'var(--rd)'}">€${fm(dailyRev()*30*factor)}</span></div>
      <div class="sr"><span class="sl">Markttrend</span><span class="sv">${G.marketTrend} ×${t}</span></div>
      <div class="sr"><span class="sl">Konjunktur</span><span class="sv">${G.ecoPhase} ×${eco}</span></div>
    </div>`;
  }
}

// ─── EXTEND REDRAW ───
const _v10Redraw=window.redraw;
function v10Redraw(){
  _v10Redraw();
  if(!window._tabJustChanged) return;
  const vid=document.querySelector('.view.on')?.id?.replace('v-','');
  switch(vid){
    case'wirtschaft':rWirtschaft();break;
    case'ankuendigungen':rAnkuendigungen();break;
    case'fusion2':rFusion2();break;
    case'lieferkette':rLieferkette();break;
    case'nachhaltigkeit':rNachhaltigkeit();break;
    case'absatz':rAbsatz();break;
  }
}
window.redraw=v10Redraw;

// ─── RENDER ALL ───
const _v10RenderAll=window.renderAll;
function v10RenderAll(){
  _v10RenderAll();
  rWirtschaft();rAnkuendigungen();rFusion2();rLieferkette();rNachhaltigkeit();rAbsatz();
}
window.renderAll=v10RenderAll;

// ─── SMOOTH HEADER STATS ───
// Header stats handled by updateHeader() in redrawLoop — no separate interval needed

// ─── INIT v10 ───
setTimeout(()=>{
  // Fahrzeugmarkt und Rivalität views aus v9 rendern wenn vorhanden
  if(typeof rFahrzeugmarkt==='function')rFahrzeugmarkt();
  if(typeof rMitbewerber2==='function')rMitbewerber2();
  if(typeof rNews==='function')rNews();
},600);

console.log('🏎️ AUTO EMPIRE v10 — Animationen & 25 neue Features geladen!');

// ══════════════════════════════════════════
//  COMPANY SELECTION SYSTEM
// ══════════════════════════════════════════
const COMPANIES = [
  {
    id:'volkswagen', name:'VOLKSWAGEN',  flag:'🇩🇪',icon:'🚗', country:'Wolfsburg, Deutschland',
    color:'#1C6DC4', tag:'Volksauto',
    startMoney:500000, startBrand:50, startRep:55,
    startComp:{eng_base:1, body_st:1, chassis:1},
    bonus:'Günstige Produktion (-10% Kosten)\nBreites Modellprogramm',
    bonusEffect:'prodCost', bonusVal:.9,
    stats:{start:'€500k', markt:'6%', spez:'Volumen', diff:2},
    desc:'Der Volkskonzern. Stärke durch Vielfalt — günstige Produktion und breites Modellspektrum.',
    lore:'Gegründet 1937, heute Wolfsburg. Das Auto für das Volk.',
  },
  {
    id:'bmw', name:'BMW GROUP',  flag:'🇩🇪',icon:'🔵', country:'München, Deutschland',
    color:'#1C69D4', tag:'Premium',
    startMoney:600000, startBrand:70, startRep:70,
    startComp:{eng_v6:1, body_alu:1, chassis:1, susp_sp:1},
    bonus:'Premium-Aufpreis +15% auf alle Preise\nHöhere Kundenakzeptanz',
    bonusEffect:'premiumBonus', bonusVal:1.15,
    stats:{start:'€600k', markt:'5%', spez:'Premium', diff:3},
    desc:'Freude am Fahren. BMW steht für Fahrdynamik und Premium-Qualität. Höhere Preise, anspruchsvolle Käufer.',
    lore:'Bayerische Motoren Werke. Seit 1916.',
  },
  {
    id:'mercedes', name:'MERCEDES-BENZ',  flag:'🇩🇪',icon:'⭐', country:'Stuttgart, Deutschland',
    color:'#CCCCCC', tag:'Luxus',
    startMoney:700000, startBrand:80, startRep:75,
    startComp:{eng_v6:1, body_alu:1, int_lux:1, chassis:1},
    bonus:'Luxus-Modelle: +20% Verkaufspreis\nESG-Bonus: +15 Startpunkte',
    bonusEffect:'luxuryBonus', bonusVal:1.20,
    stats:{start:'€700k', markt:'4%', spez:'Luxus', diff:3},
    desc:'Das Beste oder nichts. Mercedes startet mit Luxus-Ausstattung und höchstem Markenimage.',
    lore:'Erfinder des Automobils, 1886.',
  },
  {
    id:'toyota', name:'TOYOTA',  flag:'🇯🇵',icon:'🔴', country:'Toyota City, Japan',
    color:'#E62333', tag:'Zuverlässigkeit',
    startMoney:550000, startBrand:65, startRep:72,
    startComp:{eng_base:2, body_st:2, quality:1, chassis:1},
    bonus:'Qualität +20%, Rückruf-Risiko halbiert\nKaizen: F&E 15% schneller',
    bonusEffect:'qualityBonus', bonusVal:1.2,
    stats:{start:'€550k', markt:'7%', spez:'Qualität', diff:2},
    desc:'Kaizen — kontinuierliche Verbesserung. Toyota startet mit maximaler Qualität und minimalem Rückrufrisiko.',
    lore:'Gegründet 1937, größter Automobilhersteller der Welt.',
  },
  {
    id:'tesla', name:'TESLA',  flag:'🇺🇸',icon:'⚡', country:'Austin, Texas USA',
    color:'#CC0000', tag:'Elektro-Pionier',
    startMoney:800000, startBrand:85, startRep:68,
    startComp:{eng_elec:1, battery:1, body_alu:1, adas:1},
    bonus:'E-Fahrzeuge: Produktion +30% schneller\nOTA Updates freigeschaltet',
    bonusEffect:'evBonus', bonusVal:1.30,
    stats:{start:'€800k', markt:'3%', spez:'E-Mobilität', diff:4},
    desc:'Die Zukunft ist elektrisch. Tesla startet mit maximaler E-Technologie — aber der Markt ist noch klein.',
    lore:'Gegründet 2003, revolutionierte die Automobilindustrie.',
  },
  {
    id:'ford', name:'FORD',  flag:'🇺🇸',icon:'🔷', country:'Detroit, Michigan USA',
    color:'#003478', tag:'Americana',
    startMoney:450000, startBrand:55, startRep:60,
    startComp:{eng_base:2, body_st:2, chassis:2, assembly:1},
    bonus:'Montageband Level 1 gratis\n3-Schicht: +25% Startoutput',
    bonusEffect:'assemblyBonus', bonusVal:1.25,
    stats:{start:'€450k', markt:'8%', spez:'Volumen', diff:1},
    desc:'Das Original. Ford startet mit starker Fertigungskapazität und günstigem Einstieg — ideal für Einsteiger.',
    lore:'Henry Ford, 1903 — Erfinder der Fließbandfertigung.',
  },
  {
    id:'renault', name:'RENAULT',  flag:'🇫🇷',icon:'💛', country:'Paris, Frankreich',
    color:'#FFCC00', tag:'Innovation',
    startMoney:480000, startBrand:52, startRep:58,
    startComp:{eng_base:1, body_st:1, eng_elec:1, chassis:1},
    bonus:'E-Zugang: eng_elec unlocked\nEU-Förderungen +€100k',
    bonusEffect:'euBonus', bonusVal:1.0,
    stats:{start:'€480k', markt:'5%', spez:'Innovation', diff:2},
    desc:'Renault war E-Pionier in Europa. Startet mit hybridem Portfolio — Benziner UND Elektro von Beginn.',
    lore:'Gegründet 1899, ältester Hersteller im Spiel.',
  },
  {
    id:'hyundai', name:'HYUNDAI-KIA',  flag:'🇰🇷',icon:'🔶', country:'Seoul, Südkorea',
    color:'#0057A8', tag:'Aufsteiger',
    startMoney:520000, startBrand:60, startRep:64,
    startComp:{eng_base:1, body_st:1, chassis:1, infotn:1},
    bonus:'Infotainment bereits Lvl 1\nMarktanteil +30% schneller',
    bonusEffect:'growthBonus', bonusVal:1.30,
    stats:{start:'€520k', markt:'6%', spez:'Wachstum', diff:2},
    desc:'Die koreanische Herausforderung. Hyundai-Kia wächst am schnellsten und hat besten Technologie-Einstieg.',
    lore:'Gegründet 1967, heute Nr. 3 weltweit.',
  },
];

let selectedCompany = null;

function buildCompanySelection() {
  const grid = document.getElementById('cs-grid');
  if(!grid) return;
  grid.innerHTML = COMPANIES.map(co => `
    <div class="cs-card" id="cs-${co.id}" style="--cc:${co.color}" onclick="selectCompany('${co.id}')">
      <span class="cs-icon">${co.icon}</span>
      <div class="cs-name" style="color:${co.color}">${co.flag} ${co.name}</div>
      <div class="cs-country">${co.country}</div>
      <div class="cs-tag">${co.tag}</div>
      <div class="cs-stats">
        <div class="cs-stat"><div class="cs-sv">${co.stats.start}</div><div class="cs-sl">Startkapital</div></div>
        <div class="cs-stat"><div class="cs-sv">${co.stats.markt}</div><div class="cs-sl">Start-Markt</div></div>
        <div class="cs-stat"><div class="cs-sv">${co.stats.spez}</div><div class="cs-sl">Stärke</div></div>
        <div class="cs-stat"><div class="cs-sv">${'★'.repeat(co.stats.diff)+'☆'.repeat(5-co.stats.diff)}</div><div class="cs-sl">Schwierigk.</div></div>
      </div>
      <div class="cs-bonus">${co.bonus.replace(/\n/g,'<br>')}</div>
      <div class="cs-diff">
        ${[1,2,3,4,5].map(i=>`<div class="cs-pip ${i<=co.stats.diff?'on':''}"></div>`).join('')}
      </div>
    </div>
  `).join('');
}

function selectCompany(id) {
  selectedCompany = COMPANIES.find(c => c.id === id);
  if(!selectedCompany) return;
  // Visual selection
  document.querySelectorAll('.cs-card').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById('cs-' + id);
  if(el) el.classList.add('selected');
  // Show info + start button
  const info = document.getElementById('cs-selected-info');
  if(info) info.textContent = selectedCompany.desc;
  const btn = document.getElementById('cs-start');
  if(btn) btn.classList.add('show');
  // Particle effect
  spawnPtcls(window.innerWidth/2, window.innerHeight/2, selectedCompany.color, 20);
}

function startWithCompany() {
  if(!selectedCompany) return;
  const co = selectedCompany;
  // Apply company settings to G
  G.money = co.startMoney;
  G.brand = co.startBrand;
  G.rep = co.startRep;
  G.companyId = co.id;
  G.companyName = co.name;
  G.companyIcon = co.icon;
  G.companyColor = co.color;
  // Apply start components
  Object.entries(co.startComp).forEach(([k,v]) => { G.comp[k] = v; });
  // Apply bonus effect
  G.companyBonus = { effect: co.bonusEffect, val: co.bonusVal };
  // Special unlocks
  if(co.id === 'tesla') { G.rdone['ota'] = true; G.autos['a_price'] = false; }
  if(co.id === 'ford')  { G.autos['shift3'] = false; G.comp['assembly'] = 1; }
  if(co.id === 'renault') { G.money += 100000; } // EU bonus
  if(co.id === 'mercedes') { G.esgScore = 65; G.esgE = 55; G.esgS = 65; G.esgG = 70; }
  // Update header logo to company color
  document.querySelector('.logo').style.background = `linear-gradient(90deg,${co.color},#ffaa00)`;
  document.querySelector('.logo').style['-webkit-background-clip'] = 'text';
  document.querySelector('.logo').style['-webkit-text-fill-color'] = 'transparent';
  document.querySelector('.logo').textContent = co.icon + ' ' + co.name.split(' ')[0].toUpperCase() + ' EMPIRE';
  // Hide company select with animation
  const screen = document.getElementById('company-select');
  screen.classList.add('hide');
  setTimeout(() => { screen.style.display = 'none'; }, 450);
  // Start the game!
  addEv('🚀 <span style="color:' + co.color + '">' + co.icon + ' ' + co.name + '</span> gegründet! ' + co.tag + ' — Startkapital: €' + fm(co.startMoney));
  notify('Willkommen bei ' + co.name + '! Stärke: ' + co.tag, 'ok');
  // Hide company screen and start fresh (intervals already running from init())
  // Big particle burst
  spawnPtcls(window.innerWidth*.3, window.innerHeight/2, co.color, 40);
  spawnPtcls(window.innerWidth*.7, window.innerHeight/2, '#ffaa00', 30);
  spawnPtcls(window.innerWidth/2, window.innerHeight*.3, '#00ff88', 25);
  showBurst(co.icon + ' ' + co.name, co.tag, '€' + fm(co.startMoney) + ' Startkapital');
  // Render with company-aware bonuses
  setTimeout(() => renderAll(), 200);
}

// Apply company bonus in production tick
function applyCompanyBonus(rev, pc) {
  if(!G.companyBonus) return {rev, pc};
  switch(G.companyBonus.effect) {
    case 'prodCost':   return {rev, pc: pc * G.companyBonus.val};
    case 'premiumBonus': return {rev: rev * G.companyBonus.val, pc};
    case 'luxuryBonus':  return {rev: rev * G.companyBonus.val, pc};
    case 'qualityBonus': return {rev, pc: pc * .9};
    case 'evBonus':      return {rev, pc};  // handled in EV tick
    case 'assemblyBonus':return {rev, pc};  // handled via assembly comp
    case 'growthBonus':  return {rev, pc};  // market share grows faster
    default: return {rev, pc};
  }
}

// Init company selection on load
/* Old DOMContentLoaded removed */
// ── NAVIGATION & THEME (RESTORED FROM BACKUP) ──
var _NAV = {
  zentrale:   [{id:'dash',l:'📊 Dash'},{id:'news',l:'📰 News'},{id:'ziele',l:'🎯 Ziele'},{id:'kampagne',l:'📖 Kampagne'},{id:'ranking',l:'🏆 Ranking'},{id:'speichern',l:'💾 Speichern'},{id:'story',l:'📚 Geschichte'}],
  produktion: [{id:'kompo',l:'⚙️ Bauteile'},{id:'fahr',l:'🚗 Fahrzeuge'},{id:'prod',l:'🔧 Produktion'},{id:'werke',l:'🏭 Werke'},{id:'tuning',l:'🔩 Tuning'},{id:'konzept',l:'💡 Konzepte'}],
  forschung:  [{id:'forsch',l:'🔬 Forschung'},{id:'forschlab',l:'🧪 Labor'},{id:'patente',l:'📜 Patente'},{id:'ingenieure',l:'🧑‍🔬 Ingenieure'},{id:'qualitaet',l:'⭐ Qualität'},{id:'roadmap',l:'⚡ E-Roadmap'}],
  markt:      [{id:'markt',l:'🌍 Marktanteile'},{id:'region',l:'🗺️ Regionen'},{id:'weltkarte',l:'🌐 Weltkarte'},{id:'absatz',l:'📦 Absatz'},{id:'showrooms',l:'🏪 Showrooms'},{id:'werb',l:'📺 Werbung'},{id:'fahrzeugmarkt',l:'🏷️ Preise'}],
  wirtschaft: [{id:'fin',l:'💹 Finanzen'},{id:'boerse',l:'📈 Börse'},{id:'bank',l:'🏦 Bank'},{id:'aktien2',l:'💼 Portfolio'},{id:'fusion2',l:'🔀 M&A'},{id:'weltmarkt',l:'🌐 Weltmarkt'}],
  strategie:  [{id:'rohstoff',l:'⛏️ Rohstoffe'},{id:'lieferkette',l:'⛓️ Lieferkette'},{id:'lieferant2',l:'🤝 Partner'},{id:'politik',l:'🏛️ Politik'},{id:'personal',l:'👷 Personal'},{id:'nachhaltigkeit',l:'🌱 ESG'},{id:'mitbewerber2',l:'⚡ Rivalität'}],
  spezial:    [{id:'spionage',l:'🕵️ Spionage'},{id:'blackmarket',l:'🕶️ Schwarzm.'},{id:'wetter',l:'🌩️ Krisen'},{id:'kiangriff',l:'🎯 KI-Angriff'},{id:'embargo',l:'🚫 Embargo'},{id:'saison',l:'🍂 Saison'},{id:'racing',l:'🏎️ Racing'},{id:'auto',l:'🤖 Automat.'},{id:'ankuendigungen',l:'📢 Ankündig.'}]
};

window.sv = function(viewId, btn) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('on'); });
  var tgt = document.getElementById('v-' + viewId);
  if (tgt) tgt.classList.add('on');
  document.querySelectorAll('.nsb').forEach(function(b) { b.classList.remove('on'); });
  if (btn) { btn.classList.add('on'); }
  else { var s = document.getElementById('nsb-' + viewId); if (s) s.classList.add('on'); }
  try {
    if (typeof _barCache !== 'undefined') _barCache = {};
    if (typeof _lastVid  !== 'undefined') _lastVid  = '';
    if (typeof doTabRender === 'function') doTabRender(viewId);
  } catch(e) {}
  var c = document.getElementById('content');
  if (c) c.scrollTop = 0;
};

window.setNavCat = function(cat, el) {
  var map = _NAV[cat]; if (!map) return;
  document.querySelectorAll('.nc').forEach(function(b) { b.classList.remove('on'); });
  if (el) el.classList.add('on');
  var sub = document.getElementById('sub-nav'); if (!sub) return;
  sub.innerHTML = map.map(function(n) {
    return '<button class="nsb" id="nsb-'+n.id+'" onclick="sv(\''+n.id+'\',this)">'+n.l+'</button>';
  }).join('');
  if (map.length > 0) {
    var fb = document.getElementById('nsb-'+map[0].id);
    window.sv(map[0].id, fb);
  }
};

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  var btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = t === 'dark' ? '☀️ Light' : '🌙 Dark';
  try { localStorage.setItem('ae_theme', t); } catch(e) {}
}
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (typeof notify === 'function') notify(next === 'dark' ? '🌙 Dark Theme' : '☀️ Light Theme', 'ok');
}
(function() { try { var t = localStorage.getItem('ae_theme'); if (t) applyTheme(t); } catch(e) {} })();

// ── MULTIPLAYER PERSISTENCE (FIXED) ──
document.addEventListener('DOMContentLoaded', async () => {
  const csEl = document.getElementById('company-select');
  if (csEl) csEl.style.display = 'none';

  if (typeof init === 'function') {
    try { init(); } catch(e) { console.warn('init:', e); }
  }
  window.G = G; // expose globally for state restore

  try {
    const res = await fetch('api.php?action=init');
    const text = await res.text();
    let data = null;
    try { 
      data = JSON.parse(text); 
    } catch(e) { 
      console.error('API Error: Non-JSON response.');
    }

    if (!data || data.error) {
      _showCompanySelect(csEl);
      return;
    }

    if (data.multiplayer_rivals) {
      window.RIVALS = data.multiplayer_rivals;
    }

    const companyId = (data.user_state && data.user_state.companyId) || data.company_id;

    if (companyId) {
      // ⚠️ FIX: Defensive check for Object.assign
      if (data.user_state && typeof data.user_state === 'object' && Object.keys(data.user_state).length > 2) {
        try {
          Object.assign(G, data.user_state);
          if (Array.isArray(G.ads)) G.ads = new Set(G.ads);
          if (Array.isArray(G.ms))  G.ms  = new Set(G.ms);
        } catch(e) { console.warn('State restore failed:', e); }
      }
      
      if (csEl) { csEl.style.cssText = 'display:none !important'; csEl.classList.add('hide'); }
      
      const fb = document.querySelector('.nc.on') || document.querySelector('.nc');
      // Critical: use global window.setNavCat if local not found
      const snc = (typeof setNavCat === 'function') ? setNavCat : window.setNavCat;
      if (typeof snc === 'function') snc('zentrale', fb);
      
      try { if (typeof renderAll === 'function') renderAll(); } catch(e) {}
      if (typeof notify === 'function') notify('🌐 Willkommen zurück!', 'ok');
    } else {
      _showCompanySelect(csEl);
    }

    if (data.leaderboard && typeof renderLeaderboard === 'function') {
      try { renderLeaderboard(data.leaderboard); } catch(e) {}
    }

  } catch(e) {
    console.warn('MP Init error:', e);
    _showCompanySelect(csEl);
  }

  setInterval(() => {
    if (!G.companyId) return;
    const state = JSON.stringify({...G, ads: [...G.ads], ms: [...G.ms]});
    fetch('api.php?action=save', { method:'POST', headers:{'Content-Type':'application/json'}, body: state }).catch(() => {});
  }, 20000);
});

function _showCompanySelect(el) {
  if (typeof buildCompanySelection === 'function') buildCompanySelection();
  const csEl = el || document.getElementById('company-select');
  if (csEl) csEl.style.cssText = 'display:flex !important;position:fixed !important;inset:0 !important;z-index:99998 !important;overflow-y:auto !important;';
}

function renderLeaderboard(entries) {
  const el = document.getElementById('lb-list');
  if (!el || !entries) return;
  const med = ['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'];
  el.innerHTML = entries.map((p, i) =>
    '<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;' + (p.isMe ? 'background:rgba(0,212,255,.05);border-radius:6px;' : '') + 'border-bottom:1px solid rgba(255,255,255,.04)">' +
    '<div style="width:26px;text-align:center;font-weight:900;color:' + (i<3?'var(--go)':'var(--dm)') + '">' + (i<3 ? med[i] : '#'+(i+1)) + '</div>' +
    '<div style="flex:1"><div style="font-size:13px;font-weight:700;' + (p.isMe?'color:var(--cy)':'') + '">' + (p.isAI?'[KI] ':'') + p.name + '</div></div>' +
    '<div style="font-size:13px;font-weight:700;font-family:monospace;color:' + (p.isMe?'var(--gn)':'var(--t2)') + '">\u20ac' + (p.score||0).toLocaleString('de') + '</div>' +
    '</div>'
  ).join('');
}
