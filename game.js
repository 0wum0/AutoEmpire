// â”€â”€ MOBILE VIEWPORT FIX â”€â”€
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

// â”€â”€ CRITICAL GLOBALS â€” defined first, before anything else â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUTO EMPIRE v8  â€”  COMPLETE GAME ENGINE
//  Features: Save/Load, Kampagne, Ranking, QualitÃ¤t,
//  Saisonale Nachfrage, Schwarzmarkt, Ingenieure Skill-Tree
//  Particle FX, Float Money, Milestone Bursts, Counter Flash
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const SAVE_KEY = 'ae_v8_save';

const G = {
  money:500000,rev:0,cost:0,prod:0,
  rep:50,share:0,tech:1,q:1,y:1,day:0,tc:0,rdb:.1,brand:50,
  res:{
    steel:   {v:1000,max:5000,icon:'ðŸ”©',name:'Stahl'},
    aluminum:{v:500, max:3000,icon:'ðŸª¨',name:'Aluminium'},
    plastic: {v:800, max:4000,icon:'ðŸ§ª',name:'Kunststoff'},
    elec:    {v:200, max:2000,icon:'ðŸ’¡',name:'Elektronik'},
    rubber:  {v:600, max:3000,icon:'âš«',name:'Gummi'},
    energy:  {v:5000,max:10000,icon:'âš¡',name:'Energie'},
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
    europe:{name:'Europa', flag:'ðŸ‡ªðŸ‡º',share:0,dealers:0,unlocked:true, cost:0,       demand:1.0},
    usa:   {name:'USA',    flag:'ðŸ‡ºðŸ‡¸',share:0,dealers:0,unlocked:false,cost:2000000, demand:1.2},
    china: {name:'China',  flag:'ðŸ‡¨ðŸ‡³',share:0,dealers:0,unlocked:false,cost:3000000, demand:1.4},
    latam: {name:'Latein.',flag:'ðŸŒŽ',share:0,dealers:0,unlocked:false,cost:1500000, demand:0.9},
    asia:  {name:'Asien',  flag:'ðŸŒ',share:0,dealers:0,unlocked:false,cost:2500000, demand:1.1},
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
    {name:'Klaus Werner',  spec:'Antrieb',    lvl:1,xp:0,xpN:100,emoji:'ðŸ‘¨â€ðŸ”¬'},
    {name:'Petra Braun',   spec:'Elektronik', lvl:1,xp:0,xpN:100,emoji:'ðŸ‘©â€ðŸ’»'},
    {name:'Tomas Fischer', spec:'Design',     lvl:1,xp:0,xpN:100,emoji:'ðŸŽ¨'},
  ],
  campaignStep:0,missionsDone:[],
  playerScore:0,
  lastSaveTs:null,autoSaveTimer:0,
  // â”€â”€ Realism Layer (v12 additive) â”€â”€
  // Supply chain categories (0â€“100 health per category)
  supplyChain:{
    mechanik:  {health:80, label:'Mechanik',    icon:'âš™ï¸'},
    elektronik:{health:75, label:'Elektronik',  icon:'ðŸ’¡'},
    struktur:  {health:85, label:'Struktur',    icon:'ðŸ”©'},
    energie:   {health:90, label:'Energie',     icon:'âš¡'},
    komfort:   {health:70, label:'Komfort',     icon:'ðŸª‘'},
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

// â”€â”€ DATA â”€â”€
// COMPS is now loaded dynamically from DB via Twig

// VEHS is now loaded dynamically from DB via Twig

const FACS=[
  {id:'wolfsburg',name:'Wolfsburg Hauptwerk',city:'Wolfsburg, DE', cost:0,       workers:200,eff:1.0,icon:'ðŸ­'},
  {id:'emden',    name:'Emden Werk',         city:'Emden, DE',     cost:2000000, workers:150,eff:.95,icon:'âš“'},
  {id:'brussels', name:'BrÃ¼ssel Werk',       city:'BrÃ¼ssel, BE',   cost:5000000, workers:180,eff:.98,icon:'ðŸ‡§ðŸ‡ª'},
  {id:'puebla',   name:'Puebla Werk',        city:'Puebla, MX',    cost:8000000, workers:250,eff:.92,icon:'ðŸ‡²ðŸ‡½'},
  {id:'chatt',    name:'Chattanooga',        city:'Tennessee, USA',cost:15000000,workers:300,eff:.97,icon:'ðŸ‡ºðŸ‡¸'},
  {id:'shanghai', name:'Shanghai Werk',      city:'Shanghai, CN',  cost:20000000,workers:400,eff:1.05,icon:'ðŸ‡¨ðŸ‡³'},
  {id:'zwickau',  name:'Zwickau E-Werk',     city:'Zwickau, DE',   cost:12000000,workers:220,eff:1.1,icon:'âš¡'},
];

// RD is now loaded dynamically from DB via Twig

// ADS is now loaded dynamically from DB via Twig

const AUTOS=[
  {id:'a_steel', name:'Auto-Stahl',        desc:'Stahl auto-bestellen',    cost:200000},
  {id:'a_alu',   name:'Auto-Aluminium',    desc:'Alu auto-bestellen',      cost:250000},
  {id:'a_price', name:'Dyn. Preise',       desc:'KI optimiert Preise',     cost:400000},
  {id:'a_prod',  name:'Prod. KI',         desc:'Optimiert Produktionsmix',cost:600000},
  {id:'shift3',  name:'3-Schicht 24/7',   desc:'+50% Output',             cost:1000000},
  {id:'pred',    name:'Pred. Maintenance',desc:'Ausfall -80%',            cost:700000},
  {id:'supply',  name:'KI Lieferkette',   desc:'Materialkosten -15%',     cost:900000},
];

// RIVALS is now loaded dynamically from DB via Twig

// CEO_POOL is now loaded dynamically from DB via Twig

const MISSIONS=[
  {id:0, name:'Erster Motor',      desc:'4-Zyl. Benziner Level 1',              check:()=>G.comp['eng_base']>=1,   r:20000},
  {id:1, name:'Erste Karosserie',  desc:'Stahlkarosserie Level 1',              check:()=>G.comp['body_st']>=1,    r:20000},
  {id:2, name:'Polo Neo starten',  desc:'Polo Neo Produktion beginnen',         check:()=>G.vehs['polo']?.on,      r:50000},
  {id:3, name:'â‚¬100k Umsatz',      desc:'100.000â‚¬ Gesamtumsatz',                check:()=>G.rev>=100000,           r:30000},
  {id:4, name:'2 Modelle',         desc:'Zwei Fahrzeuge gleichzeitig',          check:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=2,r:75000},
  {id:5, name:'Werbung aktiv',     desc:'Mindestens 2 Kampagnen laufen',        check:()=>G.ads.size>=2,           r:40000},
  {id:6, name:'3 Forschungen',     desc:'3 Technologien abgeschlossen',         check:()=>Object.values(G.rdone).filter(Boolean).length>=3,r:100000},
  {id:7, name:'Zweites Werk',      desc:'Emden oder weiteres Werk bauen',       check:()=>G.facs.length>=2,        r:200000},
  {id:8, name:'Elektro-Pionier',   desc:'E-Fahrzeug in Produktion',             check:()=>['id4','beetle','id_buzz'].some(id=>G.vehs[id]?.on),r:150000},
  {id:9, name:'MillionÃ¤r',         desc:'â‚¬1 Million Kapital halten',            check:()=>G.money>=1000000,        r:100000},
  {id:10,name:'2 Regionen',        desc:'Zwei WeltmÃ¤rkte erschlossen',          check:()=>Object.values(G.regions).filter(r=>r.unlocked).length>=2,r:250000},
  {id:11,name:'AktionÃ¤r',          desc:'100 eigene Aktien besitzen',           check:()=>G.stockOwned>=100,       r:120000},
  {id:12,name:'Rennsieger',        desc:'Erstes Rennen gewinnen',               check:()=>G.raceWins>=1,           r:200000},
  {id:13,name:'5 Modelle',         desc:'FÃ¼nf verschiedene Fahrzeuge',          check:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=5,r:400000},
  {id:14,name:'Tech Level 3',      desc:'Technologiestufe 3 erreichen',         check:()=>G.tech>=3,               r:500000},
  {id:15,name:'5x Automation',     desc:'FÃ¼nf Automationssysteme aktiv',        check:()=>Object.values(G.autos).filter(Boolean).length>=5,r:500000},
  {id:16,name:'3 Patente',         desc:'Drei Patente besitzen',                check:()=>G.patents.length>=3,     r:600000},
  {id:17,name:'4 Showrooms',       desc:'Vier Showrooms weltweit',              check:()=>G.showrooms.length>=4,   r:700000},
  {id:18,name:'20% Marktanteil',   desc:'Zwanzig Prozent Marktanteil',          check:()=>G.share>=20,             r:1000000},
  {id:19,name:'AUTO EMPIRE',       desc:'5000 Fahrzeuge produziert',            check:()=>G.prod>=5000,            r:5000000},
];

const SEASON_CFG={
  spring:{name:'FrÃ¼hling ðŸŒ¸',cls:'s-spring',bonus:{golf:1.1,polo:1.15,id4:1.1},malus:{touareg:.9}},
  summer:{name:'Sommer â˜€ï¸', cls:'s-summer',bonus:{arteon:1.3,beetle:1.2},       malus:{touareg:.85}},
  autumn:{name:'Herbst ðŸ‚', cls:'s-autumn',bonus:{tiguan:1.2,touareg:1.1,passat:1.1},malus:{beetle:.85}},
  winter:{name:'Winter â„ï¸', cls:'s-winter',bonus:{touareg:1.3,tiguan:1.2},      malus:{beetle:.7,arteon:.8}},
};

const BM_ITEMS=[
  {id:'bm_st',  name:'Schwarzmarkt Stahl',    emoji:'ðŸ”©',amt:500, cost:2000, res:'steel',   risk:15,desc:'50% gÃ¼nstiger, Risikoware'},
  {id:'bm_al',  name:'Schwarzmarkt Alu',      emoji:'ðŸª¨',amt:300, cost:3000, res:'aluminum',risk:20,desc:'Schnell verfÃ¼gbar'},
  {id:'bm_el',  name:'UngeklÃ¤rte Elektronik', emoji:'ðŸ’¡',amt:200, cost:5000, res:'elec',    risk:25,desc:'Keine Herkunftsgarantie'},
  {id:'bm_en',  name:'Nicht gemeldeter Sprit',emoji:'âš¡',amt:1000,cost:2000, res:'energy',  risk:12,desc:'Steuer umgehen'},
  {id:'bm_pat', name:'Patentklau-Datensatz',  emoji:'ðŸ“œ',amt:1,   cost:50000,res:'patent',  risk:60,desc:'Sofort ein Patent â€” sehr riskant'},
];

// EVENTS is now loaded dynamically from DB via Twig

const SHOWROOM_LOCS=[
  {city:'Berlin',   flag:'ðŸ‡©ðŸ‡ª',cost:200000,db:2},{city:'MÃ¼nchen',  flag:'ðŸ‡©ðŸ‡ª',cost:250000,db:2},
  {city:'New York', flag:'ðŸ‡ºðŸ‡¸',cost:500000,db:4},{city:'LA',       flag:'ðŸ‡ºðŸ‡¸',cost:450000,db:3},
  {city:'Shanghai', flag:'ðŸ‡¨ðŸ‡³',cost:600000,db:5},{city:'Tokyo',    flag:'ðŸ‡¯ðŸ‡µ',cost:400000,db:3},
  {city:'Dubai',    flag:'ðŸ‡¦ðŸ‡ª',cost:350000,db:3},{city:'SÃ£o Paulo',flag:'ðŸ‡§ðŸ‡·',cost:280000,db:2},
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
  {id:'m11',n:'AktionÃ¤r',     c:()=>G.stockOwned>=100,    r:250000},
  {id:'m12',n:'Weltkonzern',  c:()=>Object.values(G.regions).filter(r=>r.unlocked).length>=4,r:1000000},
  {id:'m13',n:'Rennsieger',   c:()=>G.raceWins>=1,        r:500000},
  {id:'m14',n:'Patent-KÃ¶nig', c:()=>G.patents.length>=3,  r:750000},
];

// â”€â”€ PARTICLE SYSTEM â”€â”€
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

// â”€â”€ FLOAT MONEY â”€â”€
function floatMoney(amt,pos){
  const el=document.createElement('div');el.className='mf';
  el.textContent=(pos?'+â‚¬':'-â‚¬')+fm(Math.abs(amt));
  el.style.color=pos?'#00ff88':'#ff3355';
  el.style.left=(30+Math.random()*40)+'%';el.style.top=(window.innerHeight/2-80)+'px';
  document.body.appendChild(el);setTimeout(()=>el.remove(),2100);
}

// â”€â”€ BURST POPUP â”€â”€
function showBurst(title,sub,reward){
  const el=document.createElement('div');el.className='burst';
  el.innerHTML='<div class="burst-inner"><div style="font-size:26px">ðŸ†</div><div style="font-size:15px;font-weight:900;color:#ffaa00">'+title+'</div><div style="font-size:11px;color:#cde0f0;margin-top:4px">'+sub+'</div><div style="font-size:13px;font-weight:700;color:#00ff88;margin-top:5px">'+reward+'</div></div>';
  document.body.appendChild(el);
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',40);
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#00ff88',25);
  setTimeout(()=>el.remove(),1400);
}

// â”€â”€ COUNTER FLASH â”€â”€
function flashEl(id,pos){
  const el=document.getElementById(id);if(!el)return;
  el.classList.remove('flash-g','flash-r');void el.offsetWidth;
  el.classList.add(pos?'flash-g':'flash-r');
  setTimeout(()=>el.classList.remove('flash-g','flash-r'),600);
}

// â”€â”€ SAVE / LOAD â”€â”€
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
    const ss=document.getElementById('save-status');if(ss)ss.textContent='âœ“ Gespeichert '+t;
    const ls=document.getElementById('last-save');if(ls)ls.textContent=t;
    const sz=document.getElementById('save-sz');if(sz)sz.textContent=(json.length/1024).toFixed(1)+' KB';
    notify('ðŸ’¾ Spielstand gespeichert!','ok');
  }catch(e){notify('âŒ Speichern fehlgeschlagen','err');console.error(e);}
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
    // v12 realism layer â€” safe defaults if missing
    if(d.supplyChain){Object.entries(d.supplyChain).forEach(([k,v])=>{if(G.supplyChain[k])G.supplyChain[k].health=v;});}
    G.qualPressure = d.qualPressure||0;
    G.productionStress = d.productionStress||0;
    G.marginPressure = d.marginPressure||0;
    if(d.autoHelpers)Object.assign(G.autoHelpers, d.autoHelpers);
    G.lastSaveTs=d.ts;
    const ts=new Date(d.ts);
    notify('ðŸ“‚ Spielstand geladen! ('+ts.toLocaleDateString()+')','ok');
    addEv('ðŸ“‚ <span style="color:var(--gn)">Spielstand geladen</span> â€” Willkommen zurÃ¼ck!');
    renderAll();
    return true;
  }catch(e){notify('âŒ Laden fehlgeschlagen: '+e.message,'err');console.error(e);return false;}
}

function resetGame(){
  // Don't use confirm() â€” blocked in iframe environments.
  // Show an inline confirmation inside the save panel instead.
  const existing = document.getElementById('reset-confirm');
  if(existing){ existing.remove(); return; }
  const box = document.createElement('div');
  box.id = 'reset-confirm';
  box.style.cssText = 'background:rgba(255,51,85,.12);border:1px solid rgba(255,51,85,.5);border-radius:8px;padding:12px;margin-top:8px;text-align:center;';
  box.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--rd);margin-bottom:8px;">âš ï¸ Spielstand wirklich lÃ¶schen?<br><span style="font-size:10px;font-weight:400;color:var(--dm);">Das kann nicht rÃ¼ckgÃ¤ngig gemacht werden.</span></div>'
    + '<div style="display:flex;gap:8px;justify-content:center;">'
    + '<button class="btn sm rd-b" onclick="confirmReset()" style="flex:1;">ðŸ—‘ï¸ Ja, lÃ¶schen</button>'
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
  // Hard reset all game state in-place â€” no reload needed
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
    {name:'Klaus Werner',  spec:'Antrieb',    lvl:1,xp:0,xpN:100,emoji:'ðŸ‘¨â€ðŸ”¬'},
    {name:'Petra Braun',   spec:'Elektronik', lvl:1,xp:0,xpN:100,emoji:'ðŸ‘©â€ðŸ’»'},
    {name:'Tomas Fischer', spec:'Design',     lvl:1,xp:0,xpN:100,emoji:'ðŸŽ¨'},
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
  if(logo){ logo.style.background='linear-gradient(90deg,#00d4ff,#ffaa00)'; logo.style['-webkit-background-clip']='text'; logo.style['-webkit-text-fill-color']='transparent'; logo.textContent='AUTOâš¡EMPIRE'; }
  // Show company select screen for a fresh start
  const cs=document.getElementById('company-select');
  if(cs){ cs.style.display='flex'; cs.classList.remove('hide'); if(typeof buildCompanySelection==='function') buildCompanySelection();
            if(typeof window.init==='function') window.init();
            let cs = document.getElementById('company-select');
            if (cs && cs.innerHTML === '') { console.log('GRID STILL EMPTY'); } }
  // Clear event feed and AI log
  const ef=document.getElementById('ev-feed'); if(ef) ef.innerHTML='';
  const al=document.getElementById('ai-log');  if(al) al.innerHTML='';
  // Refresh UI
  if(typeof window.renderAll==='function') window.renderAll();
  notify('âœ… Spielstand zurÃ¼ckgesetzt â€” viel Erfolg!','ok');
  addEv('ðŸ”„ <span style="color:var(--cy)">Neues Spiel gestartet</span>');
  sv('dash', document.querySelector('.nb'));
}

// â”€â”€ INIT â”€â”€
function startIntervals(){
  // Game logic tick â€” 1 second
  setInterval(function(){ if(typeof window.tick==='function') window.tick(); else tick(); }, 1000);
  // Slow ticks
  setInterval(aiTick,5000);
  setInterval(buildTicker,20000);
  setInterval(stockTick,3000);
  setInterval(commTick,8000);
  setInterval(eventTick,1000);
  setInterval(saveGame,30000);
  // RAF live update loop â€” starts after init
  startRAF();
}

function init(){
  COMPS.forEach(c=>G.comp[c.id]=0);
  RD.forEach(cat=>cat.items.forEach(r=>G.rdone[r.id]=false));
  VEHS.forEach(v=>G.vehs[v.id]={on:false,n:0,pm:1});
  AUTOS.forEach(a=>G.autos[a.id]=false);
  G.facs=[{...FACS[0]}];

  // ALWAYS start intervals first â€” game runs regardless
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

  // No save â€” check if company screen should show (only outside iframes)
  const canShowScreen = window.self === window.top;
  if(canShowScreen && typeof buildCompanySelection === 'function'){
    // Company select will call startWithCompany() â†’ renderAll()
    // Nothing to do here
  } else {
    _freshStart();
  }
}

function _freshStart(){
  addEv('ðŸ­ <span style="color:var(--gn)">Wolfsburg Hauptwerk</span> online!');
  addEv('ðŸ’° Startkapital: <span style="color:var(--go)">â‚¬500.000</span>');
  notify('Willkommen bei Auto Empire! ðŸ’¾ Auto-Save aktiv.','ok');
  renderAll();
}

// â”€â”€ TICKS â”€â”€
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
      addEv(l.veh.e+' <span style="color:var(--gn)">+'+n+' '+l.veh.name+'</span> â†’ <span style="color:var(--go)">+â‚¬'+fm(rev)+'</span>');
      floatMoney(rev,true);
      flashEl('hm',true);flashEl('d-prod',true);
      // Quality recall chance
      if(G.comp['quality']<2&&Math.random()<.0003*n){
        const fine=100000+Math.floor(Math.random()*400000);
        G.money=Math.max(0,G.money-fine);G.rep=Math.max(0,G.rep-8);
        notify('âš ï¸ RÃœCKRUF: '+l.veh.name+' â€” -â‚¬'+fm(fine),'err');
        addEv('âš ï¸ <span style="color:var(--rd)">RÃœCKRUF '+l.veh.emoji+' '+l.veh.name+'</span> â€” -â‚¬'+fm(fine));
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
      addEv('ðŸ”¬ <span style="color:var(--cy)">'+G.active_rd.name+'</span> abgeschlossen!');
      notify('Forschung: '+G.active_rd.name+' âœ“','ok');
      // Auto patent
      if(Math.random()<.3)G.patents.push({id:'P'+Date.now(),name:G.active_rd.name,filed:G.y+'Q'+G.q,val:100000+Math.random()*400000});
      G.active_rd=null;G.rd_prog=0;
      // Engineer XP
      G.engTeam.forEach(e=>{e.xp+=10;if(e.xp>=e.xpN){e.lvl++;e.xp=0;e.xpN=Math.round(e.xpN*1.8);notify('ðŸ§‘â€ðŸ”¬ '+e.name+' â†’ Level '+e.lvl+'!','ok');}});
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
  if(G.divTimer>=360&&G.stockOwned>0){const d=G.stockOwned*G.stockPrice*.02;G.money+=d;G.divTimer=0;G.lastDiv=d;notify('ðŸ’° Dividende: +â‚¬'+fm(d),'ok');floatMoney(d,true);}
  // Taxes
  G.taxTimer--;
  if(G.taxTimer<=0){const t=Math.max(0,G.rev-G.cost)*.25;G.money-=t;G.taxPaid+=t;G.taxTimer=720;notify('ðŸ›ï¸ Steuern: -â‚¬'+fm(t),'warn');floatMoney(t,false);}
  // Pricewar
  if(G.pricewarActive){G.pricewarTimer--;if(G.pricewarTimer<=0){G.pricewarActive=false;notify('Preiskampf beendet','warn');}}
  // Strike
  if(G.tc%60===0){if(G.workerHappy<50&&Math.random()<.1&&G.strikeTimer===0){G.strikeTimer=60;notify('âœŠ STREIK! Prod. -50% fÃ¼r 60s','err');addEv('âœŠ <span style="color:var(--rd)">STREIK!</span>');} if(G.strikeTimer>0)G.strikeTimer--;}
  // BM cooldown
  if(G.bmCD>0)G.bmCD--;
  // Season
  G.seasonTimer--;
  if(G.seasonTimer<=0){const s=['spring','summer','autumn','winter'];G.season=s[(s.indexOf(G.season)+1)%4];G.seasonTimer=90;const sc=SEASON_CFG[G.season];notify('ðŸŒ Saisonwechsel: '+sc.name,'info');addEv('ðŸŒ <span style="color:var(--pu)">Saison: '+sc.name+'</span>');}
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
      const pos=['Top QualitÃ¤t!','Sehr zufrieden','Empfehle weiter','Absolut Ã¼berzeugt'];
      const neg=['Kleine MÃ¤ngel','KÃ¶nnte besser sein','EnttÃ¤uscht','Nachbesserung nÃ¶tig'];
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
  if(G.tc%120===0){G.day++;if(G.day%360===0){G.yearlyData.push({year:G.y-1,rev:G.rev,cost:G.cost,prod:G.prod,share:G.share.toFixed(1)});}if(G.day%90===0){G.q++;if(G.q>4){G.q=1;G.y++;}addEv('ðŸ“… <span style="color:var(--go)">Q'+G.q+' Jahr '+G.y+'</span> â€” Umsatz: â‚¬'+fm(G.rev));}}
  // Score
  G.playerScore=Math.floor(G.prod*10+G.rev/1000+G.share*500+G.patents.length*1000+G.raceWins*2000+G.missionsDone.length*500);
  // Campaign
  checkCampaign();
  checkMS();
  // Rival factories
  G.rivalFacTimer++;
  if(G.rivalFacTimer>=300){G.rivalFacTimer=0;const locs=[{rival:'bmw',city:'MÃ¼nchen'},{rival:'tesla',city:'Berlin'},{rival:'merc',city:'Stuttgart'},{rival:'toyota',city:'Toyota City'},{rival:'ford',city:'Detroit'},{rival:'tesla',city:'Austin'},{rival:'hyundai',city:'Ulsan'}];const avail=locs.filter(l=>!G.rivalFacs.find(f=>f.city===l.city));if(avail.length>0){const loc=avail[Math.floor(Math.random()*avail.length)];const rival=RIVALS.find(r=>r.id===loc.rival);if(rival){G.rivalFacs.push({...loc,built:G.y+'Q'+G.q});rival.sh=Math.min(26,rival.sh+.4);addEv('<span style="color:var(--rd)">'+rival.ic+' '+rival.n+'</span> baut Werk in <b>'+loc.city+'</b>!');notify(rival.n+' erÃ¶ffnet Werk in '+loc.city,'warn');}}}
  // Embargo timer
  G.embargoTimer++;if(G.embargoTimer>=400&&G.embargos.length<2){G.embargoTimer=0;if(Math.random()<.25){const embs=[{name:'China Chip-Krise',flag:'ðŸ‡¨ðŸ‡³',affects:'elec',sev:.5,dur:180},{name:'Stahl-Sanktionen',flag:'ðŸŒ',affects:'steel',sev:.4,dur:150},{name:'US-EU ZÃ¶lle',flag:'ðŸ‡ºðŸ‡¸',affects:'rev',sev:.25,dur:200}];const e=embs[Math.floor(Math.random()*embs.length)];G.embargos.push({...e,remaining:e.dur,id:Date.now()});addEv('ðŸš« <span style="color:var(--rd)">EMBARGO: '+e.flag+' '+e.name+'</span>');notify('âš ï¸ Embargo: '+e.name,'err');}}
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
      else if(x<.7){if(!G.pricewarActive&&Math.random()<.15){G.pricewarActive=true;G.pricewarTimer=120;notify('âš”ï¸ '+r.n+' startet Preiskampf!','err');addEv('<span style="color:var(--rd)">âš”ï¸ PREISKAMPF von '+r.n+'!</span>');}msg='Preiskampf';}
      else if(x<.85){if(G.mergerCD===0&&Math.random()<.1){G.mergerOffers.push({from:r,amount:Math.floor(G.money*1.5+Math.random()*5e6),id:Date.now()});G.mergerCD=300;notify('ðŸ¤ Fusionsangebot von '+r.n+'!','info');}msg='Fusionsangebot';}
      else{
        // KI attack
        const atks=[{n:'Patentklage',emoji:'âš–ï¸',d:'money',v:250000},{n:'PR-Angriff',emoji:'ðŸ“°',d:'rep',v:12},{n:'Mitarbeiter abgeworben',emoji:'ðŸ‘”',d:'eng',v:1}];
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
  if(G.activeEvent){G.activeEvent.dur--;if(G.activeEvent.dur<=0){addEv('ðŸ“° Event beendet: '+G.activeEvent.name);G.eventHistory.push(G.activeEvent);G.activeEvent=null;}return;}
  G.eventTimer--;
  if(G.eventTimer<=0){
    const ev=EVENTS[Math.floor(Math.random()*EVENTS.length)];
    G.activeEvent={...ev};G.eventTimer=180+Math.floor(Math.random()*180);
    if(ev.effect==='money'){G.money+=ev.val;floatMoney(ev.val,true);}
    if(ev.effect==='rep')G.rep=Math.min(100,G.rep+ev.val);
    if(ev.effect==='chip')G.res.elec.v*=ev.val;
    notify('ðŸ“° EVENT: '+ev.emoji+' '+ev.name,'info');
    addEv('ðŸ“° <span style="color:var(--pu)">'+ev.emoji+' '+ev.name+'</span> â€” '+ev.desc);
  }
}

// â”€â”€ ACTIONS â”€â”€
function adMult(){let m=1;G.ads.forEach(id=>{const a=ADS.find(x=>x.id===id);if(a)m+=a.ev;});if(G.currentCEO?.effect==='adBoost')m*=G.currentCEO.val;return m;}
function dailyRev(){const sc=SEASON_CFG[G.season];const wmF=typeof WM!=='undefined'?(WM.globalDemand||100)/100:1;return G.lines.filter(l=>l.run).reduce((s,l)=>{const sm=(sc.bonus?.[l.veh.id]||1)*(sc.malus?.[l.veh.id]||1);const rb=Object.values(G.regions).filter(r=>r.unlocked).reduce((a,r)=>a+r.demand,0)/Math.max(1,Object.values(G.regions).filter(r=>r.unlocked).length);return s+l.veh.price*l.cap*(100/l.veh.t)*adMult()*(1+G.brand/200)*(1+G.showrooms.length*.02)*rb*sm*wmF;},0);}


// Force the RAF loop to rebuild the current tab on next frame
function forceTabRefresh(){
  // Get current tab and render it IMMEDIATELY â€” no waiting for next RAF frame
  var vid = document.querySelector('.view.on');
  vid = vid ? vid.id.replace('v-','') : '';
  if(vid) doTabRender(vid);
  // Reset cache so RAF re-caches new DOM elements
  _barCache = {};
  // Keep _lastVid matching so RAF doesn't double-render
  _lastVid = vid;
}

function upComp(id){const d=COMPS.find(c=>c.id===id);const lv=G.comp[id];if(lv>=d.max){notify('Max!','warn');return;}const cost=d.cost+lv*d.inc;if(G.money<cost){notify('Brauche â‚¬'+fm(cost),'err');return;}let ok=true;if(d.req)Object.entries(d.req).forEach(([k,v])=>{if(G.res[k]&&G.res[k].v<v)ok=false;});if(!ok){notify('Nicht genug Ressourcen!','err');return;}G.money-=cost;G.cost+=cost;if(d.req)Object.entries(d.req).forEach(([k,v])=>{if(G.res[k])G.res[k].v-=v;});G.comp[id]++;notify(d.name+' â†’ Lvl '+G.comp[id],'ok');addEv('âš™ï¸ <span style="color:var(--cy)">'+d.name+'</span> â†’ Lvl '+G.comp[id]);spawnPtcls(window.innerWidth/2,window.innerHeight*.7,'#00d4ff',15);forceTabRefresh();}
function buildFac(id){const def=FACS.find(f=>f.id===id);if(G.facs.find(f=>f.id===id)){notify('Bereits vorhanden!','warn');return;}const cm=G.currentCEO?.effect==='facCost'?G.currentCEO.val:1;const cost=def.cost*cm;if(G.money<cost){notify('Brauche â‚¬'+fm(cost),'err');return;}G.money-=cost;G.cost+=cost;G.facs.push({...def});addEv('ðŸ­ <span style="color:var(--gn)">'+def.name+'</span> in '+def.city);notify(def.name+' gebaut!','ok');spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',30);forceTabRefresh();}
function launchVeh(id){const v=VEHS.find(x=>x.id===id);for(const r of v.req){if(G.comp[r]<1){const c=COMPS.find(x=>x.id===r);notify('BenÃ¶tigt: '+(c?.name||r),'err');return;}}const sc=v.pc*5;if(G.money<sc){notify('Brauche â‚¬'+fm(sc),'err');return;}G.money-=sc;G.cost+=sc;G.vehs[id].on=true;G.lines.push({id:id+'_'+Date.now(),veh:v,run:true,p:0,rate:100/v.t,cap:v.cap});addEv('ðŸš— <span style="color:var(--gn)">'+v.name+'</span> Produktion gestartet!');notify(v.name+' aktiv!','ok');spawnPtcls(window.innerWidth/2,window.innerHeight*.6,'#00ff88',25);forceTabRefresh();}
function startRD(ci,ii){const item=RD[ci].items[ii];if(G.rdone[item.id]){notify('Bereits erforscht!','warn');return;}if(G.active_rd){notify('Forschung lÃ¤uft!','warn');return;}if(G.money<item.cost){notify('Brauche â‚¬'+fm(item.cost),'err');return;}G.money-=item.cost;G.cost+=item.cost;G.active_rd=item;G.rd_prog=0;addEv('ðŸ”¬ Forschung: <span style="color:var(--cy)">'+item.name+'</span>');notify('Forschung: '+item.name,'ok');}
function togAd(id){if(G.ads.has(id)){G.ads.delete(id);notify('Gestoppt.','warn');}else{G.ads.add(id);notify('Kampagne aktiv!','ok');}forceTabRefresh();}
function togAuto(id){const a=AUTOS.find(x=>x.id===id);if(!G.autos[id]){if(G.money<a.cost){notify('Brauche â‚¬'+fm(a.cost),'err');return;}G.money-=a.cost;G.cost+=a.cost;G.autos[id]=true;addEv('ðŸ¤– <span style="color:var(--cy)">'+a.name+'</span> aktiv');notify(a.name+' aktiv!','ok');}else{G.autos[id]=false;notify(a.name+' deaktiviert.','warn');}forceTabRefresh();}
function togLine(lid){const l=G.lines.find(x=>x.id===lid);if(l)l.run=!l.run;}
function buyStk(n){const c=G.stockPrice*n;if(G.money<c){notify('Zu wenig Kapital!','err');return;}G.money-=c;G.stockOwned+=n;notify(n+' Aktien @ â‚¬'+G.stockPrice.toFixed(2),'ok');}
function sellStk(n){if(G.stockOwned<n){notify('Nicht genug Aktien!','err');return;}G.stockOwned-=n;G.money+=G.stockPrice*n;floatMoney(G.stockPrice*n,true);notify(n+' Aktien verkauft','ok');}
function takeLoan(amt,rate,term){if(G.loans.length>=3){notify('Max 3 Kredite!','warn');return;}const r=G.currentCEO?.effect==='loanRate'?rate*G.currentCEO.val:rate;G.loans.push({id:++G.loanId,amount:amt,rate:r,term,monthly:amt*(1+r)/term,remaining:amt*(1+r)});G.money+=amt;notify('Kredit â‚¬'+fm(amt)+' aufgenommen','ok');floatMoney(amt,true);}
function acceptMerger(id){const o=G.mergerOffers.find(x=>x.id==id);if(!o)return;G.money+=o.amount;G.mergerOffers=G.mergerOffers.filter(x=>x.id!=id);notify('Fusion angenommen! +â‚¬'+fm(o.amount),'ok');floatMoney(o.amount,true);addEv('ðŸ¤ <span style="color:var(--gn)">Fusion: +â‚¬'+fm(o.amount)+'</span>');}
function rejectMerger(id){G.mergerOffers=G.mergerOffers.filter(x=>x.id!=id);notify('Abgelehnt.','warn');}
function hireCEO(i){if(G.money<1e6){notify('Kostet â‚¬1 Mio.','err');return;}G.money-=1e6;G.currentCEO=CEO_POOL[i];notify('CEO '+CEO_POOL[i].name+' engagiert!','ok');addEv('ðŸ‘” <span style="color:var(--gn)">CEO '+CEO_POOL[i].name+'</span> â€” '+CEO_POOL[i].bonus);}
function hireMech(){if(G.money<50000){notify('Kostet â‚¬50k','err');return;}G.money-=50000;G.workerCount+=10;G.workerHappy=Math.min(100,G.workerHappy+2);notify('+10 Mitarbeiter','ok');}
function hireEng(){if(G.money<150000){notify('Kostet â‚¬150k','err');return;}G.money-=150000;G.engineers++;const names=['Alex MÃ¼ller','Jana Koch','Kai Weber','Sara Fischer'];const specs=['Antrieb','Elektronik','Design','Fahrwerk'];const emojis=['ðŸ‘¨â€ðŸ”¬','ðŸ‘©â€ðŸ’»','ðŸŽ¨','ðŸ”§'];G.engTeam.push({name:names[Math.floor(Math.random()*names.length)],spec:specs[Math.floor(Math.random()*specs.length)],lvl:1,xp:0,xpN:100,emoji:emojis[Math.floor(Math.random()*emojis.length)]});notify('Ingenieur eingestellt!','ok');forceTabRefresh();}
function raiseSal(){if(G.money<500000){notify('Kostet â‚¬500k','err');return;}G.money-=500000;G.workerHappy=Math.min(100,G.workerHappy+20);notify('GehÃ¤lter erhÃ¶ht +20 Zufriedenheit','ok');}
function unlockRegion(id){const r=G.regions[id];if(r.unlocked){notify('Bereits freigeschaltet!','warn');return;}if(G.money<r.cost){notify('Brauche â‚¬'+fm(r.cost),'err');return;}G.money-=r.cost;r.unlocked=true;r.dealers=1;notify(r.name+' freigeschaltet!','ok');addEv('ðŸ—ºï¸ <span style="color:var(--gn)">'+r.name+'</span> erschlossen!');}
function addDealer(id){const r=G.regions[id];if(!r.unlocked){notify('Region zuerst freischalten!','err');return;}const c=200000+r.dealers*100000;if(G.money<c){notify('Brauche â‚¬'+fm(c),'err');return;}G.money-=c;r.dealers++;notify('HÃ¤ndler in '+r.name+' hinzugefÃ¼gt','ok');}
function buildShowroom(i){const loc=SHOWROOM_LOCS[i];if(G.showrooms.find(s=>s.city===loc.city)){notify('Bereits vorhanden!','warn');return;}if(G.money<loc.cost){notify('Kostet â‚¬'+fm(loc.cost),'err');return;}G.money-=loc.cost;G.showrooms.push({...loc,opened:G.y+'Q'+G.q});notify('Showroom '+loc.city+' erÃ¶ffnet!','ok');addEv('ðŸª <span style="color:var(--gn)">'+loc.flag+' '+loc.city+'</span> Showroom erÃ¶ffnet!');}
function unlockTuning(){if(G.money<1e6){notify('Kostet â‚¬1 Mio.','err');return;}G.money-=1e6;G.tuningDept=true;notify('Tuning-Abteilung aktiv!','ok');forceTabRefresh();}
function applyTuning(vid,pkgId){if(!G.tuningDept){notify('Tuning-Abteilung benÃ¶tigt!','err');return;}const pkgs=[{id:'sport',name:'Sport-Paket',emoji:'ðŸŽï¸',cost:80000,pm:.08,req:'eng_v6'},{id:'luxury',name:'Luxury-Paket',emoji:'ðŸ’Ž',cost:120000,pm:.12,req:'int_lux'},{id:'electric',name:'E-Performance',emoji:'âš¡',cost:100000,pm:.10,req:'eng_elec'},{id:'offroad',name:'Offroad-Paket',emoji:'ðŸ”ï¸',cost:90000,pm:.09,req:'awd'},{id:'amg',name:'AMG-Line',emoji:'ðŸ”¥',cost:150000,pm:.15,req:'body_cfk'}];const pkg=pkgs.find(p=>p.id===pkgId);if(!pkg)return;if(G.money<pkg.cost){notify('Kostet â‚¬'+fm(pkg.cost),'err');return;}if(pkg.req&&G.comp[pkg.req]<1){const c=COMPS.find(x=>x.id===pkg.req);notify('BenÃ¶tigt: '+(c?.name||pkg.req),'err');return;}G.money-=pkg.cost;G.tuningProjects[vid]=pkgId;const line=G.lines.find(l=>l.veh.id===vid);if(line)line.veh.pm=1+pkg.pm;G.rep=Math.min(100,G.rep+5);notify(pkg.name+' auf '+vid+' angewendet! Preis +'+Math.round(pkg.pm*100)+'%','ok');forceTabRefresh();}
function buildConcept(id){const cons=[{id:'ev_vision',name:'EX-Vision SUV',emoji:'ðŸš€',cost:500000,rep:15,brand:10},{id:'gti_x',name:'GTI X-Treme',emoji:'ðŸ',cost:600000,rep:20,brand:12},{id:'phaeton_e',name:'Phaeton E-Concept',emoji:'ðŸ’Ž',cost:800000,rep:25,brand:15},{id:'micro',name:'Polo Micro City',emoji:'ðŸž',cost:300000,rep:10,brand:8},{id:'autobid',name:'AutoBuzz L5',emoji:'ðŸšŒ',cost:1000000,rep:30,brand:20}];const con=cons.find(c=>c.id===id);if(!con||G.concepts.includes(id)){notify('Bereits prÃ¤sentiert!','warn');return;}if(G.money<con.cost){notify('Kostet â‚¬'+fm(con.cost),'err');return;}if(G.conceptCD>0){notify('Cooldown '+G.conceptCD+'s','warn');return;}G.money-=con.cost;G.concepts.push(id);G.rep=Math.min(100,G.rep+con.rep);G.brand=Math.min(100,G.brand+con.brand);G.conceptCD=120;notify(con.name+' prÃ¤sentiert! Rep +'+con.rep,'ok');addEv('ðŸ’¡ <span style="color:var(--gn)">Konzept: '+con.emoji+' '+con.name+'</span> prÃ¤sentiert!');spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#bb55ff',40);showBurst('Konzept!',con.name,'Rep +'+con.rep+' Brand +'+con.brand);forceTabRefresh();}
function buyInsurance(id){const ins={ins_factory:{cost:200000,name:'Werksversicherung'},ins_supply:{cost:150000,name:'Lieferk.-Versicherung'},ins_legal:{cost:100000,name:'Rechtsschutz'},ins_cyber:{cost:120000,name:'Cyber-Versicherung'}};const i=ins[id];if(!i||G.insurance[id]){notify('Bereits versichert!','warn');return;}if(G.money<i.cost){notify('Kostet â‚¬'+fm(i.cost),'err');return;}G.money-=i.cost;G.insurance[id]=true;notify(i.name+' abgeschlossen!','ok');}
function startSpy(id){const m={steal_tech:{cost:30,desc:'Technologie stehlen'},sabotage:{cost:50,desc:'Werk sabotieren'},headhunt:{cost:20,desc:'Ingenieur abwerben'},pr_attack:{cost:25,desc:'PR-Angriff starten'}};const mission=m[id];if(!mission){return;}if(G.spyPts<mission.cost){notify('Brauche '+mission.cost+' SP','err');return;}if(G.activeSpy){notify('Mission lÃ¤uft!','warn');return;}G.spyPts-=mission.cost;G.activeSpy={id,name:mission.desc};G.spyTimer=60+Math.floor(Math.random()*60);notify('Mission: '+mission.desc,'info');addEv('ðŸ•µï¸ <span style="color:var(--pu)">Spionage-Mission</span>: '+mission.desc);}
function completeSpy(){const id=G.activeSpy?.id;if(id==='steal_tech'){const undone=RD.flatMap(c=>c.items).filter(r=>!G.rdone[r.id]);if(undone.length>0){const r=undone[Math.floor(Math.random()*undone.length)];G.rdone[r.id]=true;notify('Technologie gestohlen: '+r.name,'ok');}}if(id==='headhunt'){G.engineers+=2;notify('+2 Ingenieure abgeworben!','ok');}if(id==='sabotage'){const r=RIVALS[Math.floor(Math.random()*RIVALS.length)];r.sh=Math.max(2,r.sh-2);notify(r.n+' sabotiert!','ok');}if(id==='pr_attack'){notify('PR-Schaden bei Rivalen!','ok');}addEv('ðŸ•µï¸ <span style="color:var(--gn)">Mission abgeschlossen</span>');G.activeSpy=null;if(G.secLevel<2&&Math.random()<.2){G.money=Math.max(0,G.money-200000);floatMoney(200000,false);notify('âš ï¸ Gegenspionage: -â‚¬200k','err');}}
function upDefense(){const c=(G.defenseLevel+1)*400000;if(G.money<c){notify('Kostet â‚¬'+fm(c),'err');return;}G.money-=c;G.defenseLevel++;notify('Verteidigung Level '+G.defenseLevel,'ok');}
function filePatent(){if(G.patents.length===0){notify('Keine Patente!','err');return;}if(G.money<500000){notify('Kostet â‚¬500k','err');return;}G.money-=500000;if(Math.random()<.6){const a=500000+Math.random()*2e6;G.money+=a;notify('Patentklage gewonnen! +â‚¬'+fm(a),'ok');floatMoney(a,true);}else{notify('Patentklage verloren.','warn');}}
function startLobby(id){const pts={ev_sub:100,import_tax:150,co2_ex:80,rd_grant:60};const p=pts[id];if(!p)return;if(G.lobbyPts<p){notify('Brauche '+p+' LP','err');return;}G.lobbyPts-=p;if(id==='rd_grant'){G.money+=1e6;notify('FÃ¶rderung: +â‚¬1 Mio.!','ok');floatMoney(1e6,true);}if(id==='co2_ex'){G.co2Index=Math.max(50,G.co2Index-30);notify('CO2-Ausnahme gesichert!','ok');}if(id==='ev_sub'){notify('E-FÃ¶rderung aktiv!','ok');}addEv('ðŸ›ï¸ <span style="color:var(--pu)">Lobbying: '+id+'</span> erfolgreich');}
function buildRacing(){if(G.money<2e6){notify('Kostet â‚¬2 Mio.','err');return;}G.money-=2e6;G.racingTeam=true;G.racingLevel=1;G.nextRace={name:'Heimrennen NÃ¼rburgring',in:120,prize:500000};notify('Rennteam aufgebaut!','ok');addEv('ðŸŽï¸ <span style="color:var(--gn)">Rennteam gegrÃ¼ndet!</span>');}
function upRacing(){const c=G.racingLevel*1e6;if(G.money<c){notify('Kostet â‚¬'+fm(c),'err');return;}G.money-=c;G.racingLevel++;notify('Rennteam Level '+G.racingLevel,'ok');}
function bmBuy(id){const item=BM_ITEMS.find(x=>x.id===id);if(!item)return;if(G.money<item.cost){notify('Kostet â‚¬'+fm(item.cost),'err');return;}if(G.bmCD>0){notify('Gesperrt fÃ¼r '+G.bmCD+'s','err');return;}G.money-=item.cost;G.bmRisk=Math.min(100,G.bmRisk+item.risk);if(item.res==='patent'){const u=RD.flatMap(c=>c.items).filter(r=>!G.rdone[r.id]);if(u.length>0){const r=u[Math.floor(Math.random()*u.length)];G.rdone[r.id]=true;G.patents.push({id:'P'+Date.now(),name:r.name+'(BM)',filed:G.y+'Q'+G.q,val:50000});notify('Schwarzmarkt-Patent: '+r.name,'ok');}}else if(G.res[item.res])G.res[item.res].v=Math.min(G.res[item.res].max,G.res[item.res].v+item.amt);notify('ðŸ•¶ï¸ '+item.name+' erhalten','ok');if(G.bmRisk>70&&Math.random()<.3){const f=200000+Math.floor(Math.random()*300000);G.money=Math.max(0,G.money-f);G.rep=Math.max(0,G.rep-10);G.bmBusts++;G.bmRisk=Math.max(0,G.bmRisk-30);G.bmCD=120;notify('ðŸš” RAZZIA! -â‚¬'+fm(f)+' -10 Rep','err');floatMoney(f,false);addEv('ðŸš” <span style="color:var(--rd)">RAZZIA! Strafe -â‚¬'+fm(f)+'</span>');spawnPtcls(window.innerWidth/2,200,'#ff3355',25);}if(G.bmCD>0)G.bmCD--;}
function prestige(){if(G.prod<1000){notify('Brauche 1000 Fahrzeuge!','err');return;}const b=Math.floor(G.prod/1000)*500000;G.money=500000+b;G.rev=0;G.cost=0;G.prod=0;G.lines=[];G.active_rd=null;G.rd_prog=0;G.ads.clear();COMPS.forEach(c=>G.comp[c.id]=0);VEHS.forEach(v=>{G.vehs[v.id].on=false;G.vehs[v.id].n=0;});RD.forEach(cat=>cat.items.forEach(r=>G.rdone[r.id]=false));G.rep=Math.min(100,50+Object.values(G.autos).filter(Boolean).length*5);notify('PRESTIGE! Bonus â‚¬'+fm(b),'ok');addEv('âœ¨ <span style="color:var(--go)">PRESTIGE</span> â€” Neustart mit â‚¬'+fm(G.money));showBurst('PRESTIGE!','Neues Spiel beginnt','Bonus: â‚¬'+fm(b));forceTabRefresh();}

function checkMS(){MS_DEF.forEach(m=>{if(!G.ms.has(m.id)&&m.c()){G.ms.add(m.id);G.money+=m.r;notify('ðŸ† '+m.n+' +â‚¬'+fm(m.r),'ok');addEv('ðŸ† <span style="color:var(--go)">'+m.n+'</span> +â‚¬'+fm(m.r));showBurst('ðŸ† '+m.n,'Meilenstein!','+â‚¬'+fm(m.r));spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',50);}});}
function checkCampaign(){MISSIONS.forEach(m=>{if(G.missionsDone.includes(m.id))return;if(m.check()){G.missionsDone.push(m.id);G.money+=m.r;if(m.id===G.campaignStep)G.campaignStep=Math.min(MISSIONS.length-1,m.id+1);addEv('ðŸ“– <span style="color:var(--gn)">MISSION: '+m.name+'</span> â€” +â‚¬'+fm(m.r));notify('ðŸ“– Mission: '+m.name,'ok');showBurst('ðŸ“– '+m.name,'Mission abgeschlossen!','+â‚¬'+fm(m.r));spawnPtcls(window.innerWidth/2,window.innerHeight/3,'#00d4ff',30);}});}

// â”€â”€ RENDER â”€â”€
let _cc='Alle';
// â”€â”€ SMART DOM UPDATER â€” prevents flicker by only updating changed text â”€â”€
// setTxt defined at top of script as window.setTxt
function setTxt(id,val,col){ window.setTxt(id,val,col); }
// setHTML defined at top of script as window.setHTML
function setHTML(id,html){ window.setHTML(id,html); }

function updateHeader(){
  setTxt('hm','â‚¬'+fm(G.money));
  const ch=(G.stockHistory.length>1?(G.stockPrice/G.stockHistory[G.stockHistory.length-2]-1)*100:0);
  setTxt('hstk','â‚¬'+Math.round(G.stockPrice),ch>=0?'var(--gn)':'var(--rd)');
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  RAF LIVE UPDATE SYSTEM
//  requestAnimationFrame = smooth 60fps, browser-native,
//  zero setTimeout drift, zero innerHTML on hot path.
//  Each frame: only update what actually changed.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

    // â”€â”€ 1. Header stats â€” every frame, text only â”€â”€
    liveHeader();

    // â”€â”€ 2. Production bars â€” every frame, style.width only â”€â”€
    liveProdBars();

    // â”€â”€ 3. Tab-specific live updates â€” every frame â”€â”€
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

// â”€â”€ Live header â€” pure textContent, runs every RAF frame â”€â”€
function liveHeader(){
  var m = 'â‚¬'+fm(G.money||0);
  var hm = document.getElementById('hm');
  if(hm && hm.textContent !== m) hm.textContent = m;

  var ch = G.stockHistory && G.stockHistory.length > 1
    ? (G.stockPrice / G.stockHistory[G.stockHistory.length-2] - 1) * 100 : 0;
  var sv = 'â‚¬'+Math.round(G.stockPrice||100);
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

// â”€â”€ Live production bars â€” runs every RAF frame â”€â”€
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

    // Width: the core fix â€” update every frame so it animates smoothly
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
    var stTxt = l.run ? 'â–  AKTIV' : 'â¸ PAUSE';
    var stCol = l.run ? 'var(--gn)' : 'var(--or)';
    if(el.stat){
      if(el.stat.textContent !== stTxt) el.stat.textContent = stTxt;
      if(el.stat.style.color !== stCol) el.stat.style.color = stCol;
    }

    // Toggle button label
    if(el.btn){
      var btnTxt = l.run ? 'â¸' : 'â–¶';
      if(el.btn.textContent !== btnTxt) el.btn.textContent = btnTxt;
    }
  }
  // Clear cache entries for lines that no longer exist
  var activeIds = G.lines.map(function(l){ return l.id; });
  Object.keys(_barCache).forEach(function(k){
    if(activeIds.indexOf(k) === -1) delete _barCache[k];
  });
}

// â”€â”€ Live tab updates â€” text/style only, per tab â”€â”€
function liveTabUpdate(vid){
  if(vid === 'dash'){
    var rev = 'â‚¬'+fm(dailyRev()); var dr = document.getElementById('d-rev');
    if(dr && dr.textContent!==rev) dr.textContent=rev;
    var prd = fm(G.prod); var dp = document.getElementById('d-prod');
    if(dp && dp.textContent!==prd) dp.textContent=prd;
    var mod = ''+VEHS.filter(function(v){return G.vehs[v.id]&&G.vehs[v.id].on;}).length;
    var dm = document.getElementById('d-mod');
    if(dm && dm.textContent!==mod) dm.textContent=mod;
    var tl = ''+G.tech; var dt = document.getElementById('d-tl');
    if(dt && dt.textContent!==tl) dt.textContent=tl;
    // Event alerts â€” rebuild only when key changes
    var ea = document.getElementById('ev-alerts');
    if(ea){
      var key = (G.activeEvent?G.activeEvent.name:'')+(G.pricewarActive?'1':'0')+G.embargos.length;
      if(ea._k !== key){
        ea._k = key;
        var h='';
        if(G.activeEvent) h='<div class="ev-alert '+(G.activeEvent.type==='crisis'?'crisis':'good')+'"><b>'+G.activeEvent.emoji+' '+G.activeEvent.name+'</b> â€” '+G.activeEvent.desc+'<div style="font-size:10px;color:var(--dm);margin-top:3px;">'+G.activeEvent.dur+'s</div></div>';
        if(G.pricewarActive) h+='<div class="ev-alert crisis"><b>âš”ï¸ PREISKAMPF</b> â€” '+G.pricewarTimer+'s</div>';
        if(G.embargos.length) h+='<div class="ev-alert crisis"><b>ðŸš« Embargo aktiv</b></div>';
        ea.innerHTML = h;
      }
    }
    return;
  }
  if(vid === 'fin'){
    window.setTxt('f-rev','â‚¬'+fm(G.rev));
    window.setTxt('f-cost','â‚¬'+fm(G.cost));
    window.setTxt('f-pft','â‚¬'+fm(G.rev-G.cost));
    window.setTxt('f-val','â‚¬'+fm(G.money*8+G.rev*2+(G.stockOwned||0)*(G.stockPrice||100)));
    return;
  }
  if(vid === 'boerse'){
    var p = G.stockHistory&&G.stockHistory.length>1?G.stockHistory[G.stockHistory.length-2]:G.stockPrice;
    var chg = ((G.stockPrice/p-1)*100);
    window.setTxt('stk-big','â‚¬'+G.stockPrice.toFixed(2));
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

// â”€â”€ Full tab rebuild â€” only on tab switch â”€â”€
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

// â”€â”€ Legacy redrawLoop alias (keeps compatibility with wrapper chains) â”€â”€
function redrawLoop(){ /* replaced by RAF â€” no-op */ }
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
  var seasonTag=sm!==1?' <span style="font-size:10px;color:'+(sm>1?'var(--gn)':'var(--rd)')+';">'+(sm>1?'â–²':'â–¼')+Math.round(Math.abs(sm-1)*100)+'%</span>':'';
  return '<div class="pl '+(l.run?'run':'pau')+'" data-lid="'+l.id+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
    +'<div>'
    +'<div style="font-size:13px;font-weight:700;">'+l.veh.e+' '+l.veh.name+seasonTag+'</div>'
    +'<div class="pl-count" style="font-size:10px;color:var(--t2);">'+G.vehs[l.veh.id].n+' prod.</div>'
    +'</div>'
    +'<button class="btn sm" onclick="togLine(\''+l.id+'\')">'+( l.run?'â¸':'â–¶')+'</button>'
    +'</div>'
    +'<div class="plbar">'
    +'<div class="plbar-f" style="width:'+l.p.toFixed(1)+'%"></div>'
    +'<div class="pleta">'+eta+'s</div>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:var(--t2);">'
    +'<span class="pl-status" style="color:'+(l.run?'var(--gn)':'var(--or)')+';">'+(l.run?'â–  AKTIV':'â¸ PAUSE')+'</span>'
    +'<span>â‚¬'+fm(l.veh.price*l.cap)+'/Zyklus</span>'
    +'</div>'
    +'</div>';
}

function rDash(){
  document.getElementById('d-rev').textContent='â‚¬'+fm(dailyRev());
  document.getElementById('d-prod').textContent=fm(G.prod);
  document.getElementById('d-mod').textContent=VEHS.filter(v=>G.vehs[v.id]?.on).length;
  document.getElementById('d-tl').textContent=G.tech;
  // Event alerts
  const ea=document.getElementById('ev-alerts');
  if(ea){let h='';if(G.activeEvent)h='<div class="ev-alert '+(G.activeEvent.type==='crisis'?'crisis':'good')+'"><b>'+G.activeEvent.emoji+' '+G.activeEvent.name+'</b> â€” '+G.activeEvent.desc+'<div style="font-size:10px;color:var(--dm);margin-top:3px;">Verbleibend: '+G.activeEvent.dur+'s</div></div>';if(G.pricewarActive)h+='<div class="ev-alert crisis"><b>âš”ï¸ PREISKAMPF AKTIV</b> â€” Preise -15% Â· '+G.pricewarTimer+'s</div>';if(G.embargos.length>0)h+='<div class="ev-alert crisis"><b>ðŸš« '+G.embargos.length+' Embargo(s) aktiv</b></div>';ea.innerHTML=h;}
  // Guide
  rGuide();
  const el=document.getElementById('dash-lines');
  if(!el)return;
  if(G.lines.length===0){el.innerHTML='<div style="color:var(--dm);font-size:12px;text-align:center;padding:14px;background:var(--card);border-radius:8px;border:1px dashed var(--bdr);">Folge dem Guide â¬†</div>';return;}
  el.innerHTML=G.lines.map(l=>plHTML(l)).join('');
}

function rGuide(){
  const el=document.getElementById('guide-panel');if(!el)return;
  const S=(done,text,action,btnLabel)=>({done,text,action,btnLabel});
  const c=id=>G.comp[id]>=1;const v=id=>G.vehs[id]?.on;
  const steps=[];
  steps.push(S(c('eng_base'),'<b>4-Zyl. Benziner</b> Lvl 1 â€” â‚¬50k Â· 50 Stahl + 20 Alu',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Antrieb')",'â†’ Antrieb'));
  steps.push(S(c('body_st'),'<b>Stahlkarosserie</b> Lvl 1 â€” â‚¬40k Â· 100 Stahl',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Karosserie')",'â†’ Karosserie'));
  steps.push(S(c('chassis'),'<b>Basis-Plattform</b> Lvl 1 â€” â‚¬60k Â· 80 Stahl + 30 Gummi',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Fahrwerk')",'â†’ Fahrwerk'));
  if(c('eng_base')&&c('body_st')&&c('chassis'))steps.push(S(v('polo'),'ðŸš™ <b>Polo Neo starten</b> â€” alle Anforderungen erfÃ¼llt!',"sv('fahr',document.querySelectorAll('.nb')[2])",'â†’ Fahrzeuge'));
  if(v('polo')||G.lines.length>0){
    steps.push(S(c('int_base'),'<b>Std. Interieur</b> Lvl 1 â€” wird fÃ¼r Golf benÃ¶tigt',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Innenraum')",'â†’ Innenraum'));
    if(c('int_base'))steps.push(S(v('golf'),'ðŸš— <b>Golf X starten</b> â€” Benziner + Stahl + Chassis + Interieur',"sv('fahr',document.querySelectorAll('.nb')[2])",'â†’ Fahrzeuge'));
    steps.push(S(G.ads.size>0,'ðŸ“º <b>Werbung einschalten</b> â€” Social Media reicht fÃ¼r Anfang',"sv('werb',document.querySelectorAll('.nb')[16])",'â†’ Werbung'));
    steps.push(S(Object.values(G.rdone).some(Boolean),'ðŸ”¬ <b>Erste Forschung starten</b> â€” ABS kostet nur â‚¬80k',"sv('forsch',document.querySelectorAll('.nb')[4])",'â†’ Forschung'));
  }
  if(G.prod>=50){
    steps.push(S(c('eng_v6'),'<b>V6 Benziner</b> â€” fÃ¼r Tiguan, Passat, Arteon, Touareg',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Antrieb')",'â†’ Antrieb'));
    steps.push(S(c('body_alu'),'<b>Aluminiumrahmen</b> â€” alle V6-Fahrzeuge benÃ¶tigen Alu',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Karosserie')",'â†’ Karosserie'));
    if(c('eng_v6')&&c('body_alu')&&c('awd'))steps.push(S(v('tiguan'),'ðŸ›» <b>Tiguan Pro</b> starten â€” V6 + Alu + Allrad âœ“',"sv('fahr',document.querySelectorAll('.nb')[2])",'â†’ Fahrzeuge'));
  }
  if(G.prod>=100){
    steps.push(S(c('eng_elec'),'<b>E-Motor</b> â€” SchlÃ¼ssel fÃ¼r ID.4, Beetle-E, ID. Buzz',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Antrieb')",'â†’ Antrieb'));
    steps.push(S(c('battery'),'<b>Batteriepaket</b> â€” Pflicht fÃ¼r alle E-Fahrzeuge',"sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Elektronik')",'â†’ Elektronik'));
    steps.push(S(Object.values(G.regions).filter(r=>r.unlocked).length>=2,'ðŸ—ºï¸ <b>USA Markt erschlieÃŸen</b> â€” +20% Nachfragebonus',"sv('region',document.querySelectorAll('.nb')[6])",'â†’ Regionen'));
  }
  if(G.prod>=500){
    steps.push(S(G.racingTeam,'ðŸŽï¸ <b>Rennteam aufbauen</b> â€” Rep & Markenimage-Boost',"sv('racing',document.querySelectorAll('.nb')[12])",'â†’ Racing'));
    steps.push(S(G.showrooms.length>=2,'ðŸª <b>Showrooms bauen</b> â€” +2% Verkauf pro Showroom',"sv('showrooms',document.querySelectorAll('.nb')[15])",'â†’ Showrooms'));
  }
  const todo=steps.filter(s=>!s.done).slice(0,3);
  const done=steps.filter(s=>s.done).length;
  if(todo.length===0){document.getElementById('guide-panel').innerHTML='<div class="guide"><div class="guide-t">ðŸ† Alles lÃ¤uft super!</div></div>';return;}
  document.getElementById('guide-panel').innerHTML='<div class="guide"><div class="guide-t">ðŸš€ NÃ¤chste Schritte ('+done+'/'+steps.length+')</div>'
    +todo.map((s,i)=>'<div class="step '+(s.done?'sdone':'')+'"><div class="sn">'+(s.done?'âœ“':i+1)+'</div><div class="st">'+s.text+(s.action?'<br><span class="sbtn" onclick="'+s.action+'">'+s.btnLabel+'</span>':'')+'</div></div>').join('')+'</div>';
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
    if(unlocks.length>0){h+='<div style="margin:6px 0 3px;font-size:10px;color:var(--dm);text-transform:uppercase;">Schaltet frei:</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px;">';unlocks.forEach(v=>{const on=G.vehs[v.id]?.on;const rdy=v.req.every(r=>G.comp[r]>=1);const col=on?'var(--gn)':rdy?'var(--cy)':lv>=1?'var(--go)':'var(--dm)';h+='<span style="font-size:10px;border:1px solid '+col+';color:'+col+';padding:2px 7px;border-radius:4px;">'+v.e+' '+v.name+(on?' âœ“':'')+'</span>';});h+='</div>';}
    if(c.req&&!maxed){h+='<div style="background:var(--bg3);border-radius:6px;padding:6px 8px;margin-bottom:7px;">';Object.entries(c.req).forEach(([k,v])=>{const r=G.res[k];const cur=Math.floor(r?.v||0);const ok=cur>=v;h+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span style="color:var(--t2);">'+(r?.icon||'')+' '+(r?.name||k)+'</span><span style="color:'+(ok?'var(--gn)':'var(--rd)')+';font-weight:700;">'+cur+'/'+v+(ok?' âœ“':'')+'</span></div><div style="height:3px;background:var(--bg);border-radius:2px;margin-bottom:3px;"><div style="height:100%;width:'+Math.min(100,cur/v*100).toFixed(0)+'%;background:'+(ok?'var(--gn)':'var(--rd)')+';border-radius:2px;"></div></div>';});h+='</div>';}
    h+='<button class="btn '+(maxed?'mx':can&&rOk?'can':'')+'" onclick="upComp(\''+c.id+'\')" '+(maxed?'disabled':'')+'>'+( maxed?'âœ“ MAXED':!rOk?'âš  Ressourcen fehlen â€” â‚¬'+fm(cost):can?'â¬† Upgrade Lvl '+(lv+1)+' â€” â‚¬'+fm(cost):'ðŸ’° Zu wenig â€” â‚¬'+fm(cost))+'</button>';
    if(lv<1&&unlocks.some(v=>!G.vehs[v.id]?.on))h+='<div style="margin-top:5px;padding:4px 8px;background:rgba(255,51,85,.08);border:1px solid rgba(255,51,85,.3);border-radius:5px;font-size:10px;color:var(--rd);">âš  Lvl 1 nÃ¶tig fÃ¼r: '+unlocks.filter(v=>!G.vehs[v.id]?.on).map(v=>v.e+' '+v.name).join(', ')+'</div>';
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
    if(st.on)h+='<div style="text-align:center;margin-bottom:7px;"><span class="badge bg">â–  IN PRODUKTION Â· '+st.n+' prod.</span></div>';
    h+='<div class="g2" style="margin-bottom:8px;"><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--cy);">'+v.cap+'/Sch.</div><div style="font-size:9px;color:var(--dm);">Kap.</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--cy);">â‚¬'+fm(v.price)+'</div><div style="font-size:9px;color:var(--dm);">Preis</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--cy);">â‚¬'+fm(v.pc)+'</div><div style="font-size:9px;color:var(--dm);">Prod.kosten</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;"><div style="font-size:11px;font-weight:700;color:var(--gn);">â‚¬'+fm((v.price-v.pc)*v.cap)+'</div><div style="font-size:9px;color:var(--dm);">Profit/Zykl.</div></div></div>';
    h+='<div style="margin-bottom:8px;">'+v.req.map(r=>{const cc=COMPS.find(x=>x.id===r);const bok=G.comp[r]>=1;return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;padding:2px 0;"><span style="color:'+(bok?'var(--gn)':'var(--rd)')+';">'+( bok?'âœ“':'âœ—')+'</span><span style="color:'+(bok?'var(--t2)':'var(--dm)')+'">'+(cc?.name||r)+'</span></div>';}).join('')+'</div>';
    h+='<button class="btn '+(st.on?'mx':can?'can':'')+'" onclick="launchVeh(\''+v.id+'\')" '+(st.on?'disabled':'')+'>'+( st.on?'âœ“ AKTIV':ok?'â–¶ Produzieren â€” â‚¬'+fm(sc):'âš  Anforderungen fehlen')+'</button></div>';
    return h;
  }).join('');
}

function rProd(){const el=document.getElementById('prod-lines');if(!el)return;if(G.lines.length===0){el.innerHTML='<div class="card" style="text-align:center;color:var(--dm);padding:14px;">Keine Produktionslinien.</div>';return;}el.innerHTML=G.lines.map(l=>plHTML(l)).join('');}
function rForsch(){const el=document.getElementById('rd-area');if(!el)return;el.innerHTML=RD.map((cat,ci)=>{const done=cat.items.filter(i=>G.rdone[i.id]).length;return '<div class="sh">'+cat.cat+' <span style="font-size:10px;color:var(--dm)">'+done+'/'+cat.items.length+'</span></div><div class="g2" style="margin-bottom:6px;">'+cat.items.map((item,ii)=>{const d=G.rdone[item.id];const doing=G.active_rd?.id===item.id;return '<div class="rn '+(d?'done':doing?'doing':'')+'" style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:9px;text-align:center;cursor:pointer;position:relative;overflow:hidden;'+(d?'border-color:var(--gn)':doing?'border-color:var(--cy)':'')+'" onclick="'+(d||doing?'':'startRD('+ci+','+ii+')')+'">'+( doing?'<div style="position:absolute;bottom:0;left:0;height:3px;background:var(--cy);width:'+G.rd_prog.toFixed(0)+'%"></div>':'')+'<div style="font-size:19px;margin-bottom:3px;">'+item.icon+'</div><div style="font-size:10px;font-weight:700;">'+item.name+'</div><div style="font-size:9px;color:var(--dm);margin-top:2px;">'+(d?'âœ“ FERTIG':doing?Math.round(100-G.rd_prog)+'% left':'â‚¬'+fm(item.cost))+'</div></div>';}).join('')+'</div>';}).join('');}

function rMarkt(){
  const all=[{n:'â­ Du',sh:G.share,cl:'var(--cy)'},...RIVALS.map(r=>({n:r.ic+' '+r.n.split(' ')[0],sh:r.sh,cl:r.cl}))].sort((a,b)=>b.sh-a.sh);
  const mb=document.getElementById('mkt-bars');if(mb)mb.innerHTML=all.map(p=>'<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span style="color:var(--t2);font-weight:600;">'+p.n+'</span><span style="color:'+p.cl+';font-weight:700;">'+p.sh.toFixed(1)+'%</span></div><div class="pw"><div class="pb" style="width:'+Math.min(100,p.sh/30*100).toFixed(0)+'%;background:'+p.cl+'"></div></div></div>').join('');
  const pw=document.getElementById('pw-panel');if(pw)pw.innerHTML=G.pricewarActive?'<div class="ev-alert crisis"><b>âš”ï¸ PREISKAMPF</b> â€” Alle Preise -15% Â· '+G.pricewarTimer+'s</div>':'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Kein Preiskampf aktiv</div>';
  const cc=document.getElementById('comp-cards');if(cc)cc.innerHTML=RIVALS.map(r=>'<div class="card"><div style="display:flex;gap:10px;align-items:center;"><div style="width:40px;height:40px;border-radius:50%;background:'+r.cl+'22;border:2px solid '+r.cl+';color:'+r.cl+';display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">'+r.ic+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;color:'+r.cl+'">'+r.n+'</div><div style="font-size:10px;color:var(--t2);">'+r.co+'</div><div style="display:flex;gap:12px;margin-top:4px;"><div><div style="font-size:12px;font-weight:700;color:'+r.cl+'">'+r.sh.toFixed(1)+'%</div><div style="font-size:9px;color:var(--dm)">Markt</div></div><div><div style="font-size:12px;font-weight:700;">â‚¬'+fm(r.ca)+'</div><div style="font-size:9px;color:var(--dm)">Kapital</div></div><div><div style="font-size:12px;font-weight:700;">'+(r.ag*10).toFixed(0)+'/10</div><div style="font-size:9px;color:var(--dm)">Aggr.</div></div></div></div></div></div>').join('');
}

function rRegion(){const el=document.getElementById('region-list');if(!el)return;el.innerHTML=Object.entries(G.regions).map(([id,r])=>'<div class="rg-card"><div style="font-size:24px;">'+r.flag+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+r.name+(r.unlocked?' <span class="badge bg">AKTIV</span>':' <span class="badge br">GESPERRT</span>')+'</div><div style="font-size:10px;color:var(--t2);">HÃ¤ndler: '+r.dealers+' Â· Nachfrage: '+(r.demand*100).toFixed(0)+'%</div><div class="pw"><div class="pb cy" style="width:'+Math.min(100,r.dealers*10)+'%"></div></div></div>'+(r.unlocked?'<button class="btn sm can" onclick="addDealer(\''+id+'\')">+HÃ¤ndler</button>':'<button class="btn sm cy-b" onclick="unlockRegion(\''+id+'\')">â‚¬'+fm(r.cost)+'</button>')+'</div>').join('');}

function rRohstoff(){
  const nm={steel:'Stahl ðŸ”©',aluminum:'Aluminium ðŸª¨',energy:'Energie âš¡'};
  const el=document.getElementById('rohstoff-list');
  if(el)el.innerHTML=Object.entries(G.commMult).map(([k,v])=>{const hist=G.commHist[k]||[];const trend=hist.length>1?hist[hist.length-1]-hist[hist.length-2]:0;const col=v>1.3?'var(--rd)':v<.8?'var(--gn)':'var(--go)';return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);"><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+nm[k]+'</div><div style="font-size:10px;color:var(--dm);">Preisniveau: <span style="color:'+col+';font-weight:700;">'+(v*100).toFixed(0)+'%</span></div></div><div style="display:flex;align-items:flex-end;gap:1px;height:22px;width:50px;">'+hist.map(h=>'<div style="flex:1;height:'+(h/2*22).toFixed(0)+'px;background:'+(h>1.2?'var(--rd)':h<.8?'var(--gn)':'var(--go)')+';border-radius:1px;"></div>').join('')+'</div><div style="font-size:11px;'+(trend>0?'color:var(--rd)':'color:var(--gn)')+';">'+(trend>0?'â–²':'â–¼')+(Math.abs(trend)*100).toFixed(0)+'%</div></div>';}).join('');
  const sl=document.getElementById('supplier-list');
  if(sl)sl.innerHTML='<button class="btn '+(G.money>=500000?'can':'')+'" onclick="buyInsurance(\'ins_supply\')">ðŸ“¦ Lieferkettenversicherung â€” â‚¬150.000</button>';
}

function rPersonal(){
  document.getElementById('p-total').textContent=G.workerCount;
  const h=document.getElementById('p-happy');if(h){h.textContent=G.workerHappy+'%';h.style.color=G.workerHappy>70?'var(--gn)':G.workerHappy>40?'var(--go)':'var(--rd)';}
  const cp=document.getElementById('ceo-panel');
  if(cp){if(G.currentCEO)cp.innerHTML='<div class="card done"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+G.currentCEO.emoji+'</div><div><div style="font-size:13px;font-weight:700;">'+G.currentCEO.name+'</div><div style="font-size:10px;color:var(--pu);">'+G.currentCEO.spec+'</div><div style="font-size:11px;color:var(--gn);margin-top:2px;">'+G.currentCEO.bonus+'</div></div><span class="badge bo">AKTIV</span></div></div>';
    else cp.innerHTML=CEO_POOL.map((c,i)=>'<div class="card"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+c.emoji+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">'+c.name+'</div><div style="font-size:10px;color:var(--pu);">'+c.spec+'</div><div style="font-size:11px;color:var(--gn);">'+c.bonus+'</div></div><button class="btn sm '+(G.money>=1e6?'can':'')+'" onclick="hireCEO('+i+')">â‚¬1M</button></div></div>').join('');}
  const hp=document.getElementById('hr-panel');
  if(hp)hp.innerHTML='<div class="g2"><button class="btn '+(G.money>=50000?'can':'')+'" onclick="hireMech()">ðŸ‘· +10 MA â€” â‚¬50k</button><button class="btn '+(G.money>=150000?'cy-b':'')+'" onclick="hireEng()">ðŸ”¬ +Ingenieur â€” â‚¬150k</button></div><button class="btn '+(G.money>=500000?'go-b':'')+'" style="margin-top:7px;" onclick="raiseSal()">ðŸ’° GehÃ¤lter erhÃ¶hen â€” â‚¬500k</button>';
}

function rBoerse(){
  const prev=G.stockHistory.length>1?G.stockHistory[G.stockHistory.length-2]:G.stockPrice;
  const ch=((G.stockPrice/prev-1)*100);
  document.getElementById('stk-big').textContent='â‚¬'+G.stockPrice.toFixed(2);
  const sc=document.getElementById('stk-chg');if(sc){sc.textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';sc.style.color=ch>=0?'var(--gn)':'var(--rd)';}
  document.getElementById('stk-owned').textContent=G.stockOwned+' (â‚¬'+fm(G.stockOwned*G.stockPrice)+')';
  const ch2=document.getElementById('stk-chart');if(ch2){const mx=Math.max(...G.stockHistory),mn=Math.min(...G.stockHistory),rng=mx-mn||1;ch2.innerHTML=G.stockHistory.map((p,i)=>'<div class="sbar" style="height:'+(((p-mn)/rng)*44+3)+'px;background:'+(p>=(G.stockHistory[i-1]||p)?'var(--gn)':'var(--rd)')+'"></div>').join('');}
  const dp=document.getElementById('div-panel');if(dp)dp.innerHTML='<div class="card"><div class="sr"><span class="sl">Letzte Dividende</span><span class="sv" style="color:var(--gn)">â‚¬'+fm(G.lastDiv)+'</span></div><div class="sr"><span class="sl">NÃ¤chste in</span><span class="sv">'+(360-G.divTimer)+'s</span></div><div class="sr"><span class="sl">Rate</span><span class="sv">2% Aktienwert</span></div></div>';
  const mp=document.getElementById('merger-panel');if(mp){if(G.mergerOffers.length===0)mp.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine Angebote</div>';else mp.innerHTML=G.mergerOffers.map(o=>'<div class="card warn"><div style="font-size:13px;font-weight:700;margin-bottom:5px;">ðŸ¤ '+o.from.n+' bietet â‚¬'+fm(o.amount)+'</div><div class="g2"><button class="btn can" onclick="acceptMerger(\''+o.id+'\')">âœ“ Annehmen</button><button class="btn rd-b" onclick="rejectMerger(\''+o.id+'\')">âœ— Ablehnen</button></div></div>').join('');}
}

function rBank(){
  const loans=[{amt:500000,rate:.08,term:180,label:'â‚¬500k @ 8%'},{amt:2000000,rate:.1,term:360,label:'â‚¬2M @ 10%'},{amt:5000000,rate:.12,term:720,label:'â‚¬5M @ 12%'}];
  const lo=document.getElementById('loan-opts');if(lo)lo.innerHTML=loans.map(l=>'<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">ðŸ¦ '+l.label+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:6px;">Laufzeit '+l.term+'s</div><button class="btn '+(G.loans.length<3?'can':'')+'" onclick="takeLoan('+l.amt+','+l.rate+','+l.term+')">Aufnehmen</button></div>').join('');
  const al=document.getElementById('active-loans');if(al)al.innerHTML=G.loans.length?G.loans.map(l=>'<div style="background:var(--card);border:1px solid rgba(255,51,85,.3);border-radius:8px;padding:9px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">Kredit #'+l.id+'</span><span style="color:var(--rd);font-weight:700;">â‚¬'+fm(l.remaining)+' offen</span></div><div class="pw"><div class="pb rd" style="width:'+(100-l.remaining/(l.amount*(1+l.rate))*100).toFixed(0)+'%"></div></div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine aktiven Kredite</div>';
  const tp=document.getElementById('tax-panel');if(tp)tp.innerHTML='<div class="card"><div class="sr"><span class="sl">Steuersatz</span><span class="sv">25% Gewinn</span></div><div class="sr"><span class="sl">Bisher gezahlt</span><span class="sv" style="color:var(--rd)">â‚¬'+fm(G.taxPaid)+'</span></div><div class="sr"><span class="sl">NÃ¤chste Steuer</span><span class="sv">in '+G.taxTimer+'s</span></div></div>';
}

function rPolitik(){
  document.getElementById('pol-lp').textContent=G.lobbyPts.toFixed(0);
  const co2=document.getElementById('pol-co2');if(co2){co2.textContent=G.co2Index.toFixed(0);co2.style.color=G.co2Index<80?'var(--gn)':G.co2Index<120?'var(--go)':'var(--rd)';}
  const cp=document.getElementById('co2-panel');if(cp)cp.innerHTML='<div class="card"><div class="sr"><span class="sl">CO2-Index</span><span class="sv" style="color:'+(G.co2Index<80?'var(--gn)':'var(--rd)')+'">'+G.co2Index.toFixed(0)+'</span></div><div class="sr"><span class="sl">ESG Score</span><span class="sv" style="color:'+(G.esgScore>60?'var(--gn)':'var(--go)')+'">'+G.esgScore.toFixed(0)+'/100</span></div><div class="sr"><span class="sl">Lobby-Punkte</span><span class="sv" style="color:var(--pu)">'+G.lobbyPts.toFixed(0)+'</span></div></div>';
  const ll=document.getElementById('lobby-list');if(ll)ll.innerHTML=[{id:'ev_sub',cost:100,name:'E-MobilitÃ¤ts-Subvention'},{id:'co2_ex',cost:80,name:'CO2-Ausnahme sichern'},{id:'rd_grant',cost:60,name:'F&E-FÃ¶rderung (+â‚¬1M)'},{id:'import_tax',cost:150,name:'Import-ZÃ¶lle erhÃ¶hen'}].map(p=>'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;"><span style="font-size:13px;font-weight:700;">ðŸ›ï¸ '+p.name+'</span><span style="color:var(--pu);font-weight:700;">'+p.cost+' LP</span></div><button class="btn '+(G.lobbyPts>=p.cost?'pu-b':'')+'" onclick="startLobby(\''+p.id+'\')">Starten</button></div>').join('');
}

function rRacing(){
  const rs=document.getElementById('racing-status');if(!rs)return;
  if(!G.racingTeam){rs.innerHTML='<div class="card"><div style="font-size:12px;margin-bottom:9px;">Kein Rennteam. Motorsport steigert Markenimage, Reputation und bringt Preisgeld.</div><button class="btn '+(G.money>=2e6?'can':'')+'" onclick="buildRacing()">ðŸŽï¸ Team grÃ¼nden â€” â‚¬2 Mio.</button></div>';return;}
  rs.innerHTML='<div class="g2" style="margin-bottom:8px;"><div class="kpi"><div class="kv" style="color:var(--go)">'+G.racingLevel+'</div><div class="kl">Team Lvl</div></div><div class="kpi"><div class="kv" style="color:var(--gn)">'+G.raceWins+'</div><div class="kl">Siege</div></div></div><button class="btn '+(G.money>=G.racingLevel*1e6?'go-b':'')+'" onclick="upRacing()">â¬† Level '+( G.racingLevel+1)+' â€” â‚¬'+fm(G.racingLevel*1e6)+'</button>';
  const rc=document.getElementById('race-cal');if(rc&&G.nextRace)rc.innerHTML='<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">ðŸ '+G.nextRace.name+'</div><div style="font-size:11px;color:var(--t2);">Preisgeld: â‚¬'+fm(G.nextRace.prize)+' Â· Startet in: '+G.nextRace.in+'s</div><div class="pw" style="margin-top:7px;"><div class="pb go" style="width:'+(100-G.nextRace.in/300*100).toFixed(0)+'%"></div></div></div>';
}

function rSpionage(){
  document.getElementById('spy-pts').textContent=G.spyPts.toFixed(0)+' SP';
  const sl=document.getElementById('spy-list');if(sl)sl.innerHTML=[{id:'steal_tech',cost:30,name:'Technologie stehlen'},{id:'sabotage',cost:50,name:'Werk sabotieren'},{id:'headhunt',cost:20,name:'Ingenieur abwerben'},{id:'pr_attack',cost:25,name:'PR-Angriff'}].map(m=>'<div style="background:var(--card);border:1px solid rgba(187,85,255,.3);border-radius:8px;padding:10px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;">ðŸ•µï¸ '+m.name+'</span><span style="color:var(--pu);font-weight:700;">'+m.cost+' SP</span></div><button class="btn sm '+(G.spyPts>=m.cost&&!G.activeSpy?'pu-b':'')+'" onclick="startSpy(\''+m.id+'\')">'+(G.activeSpy?.id===m.id?'LÃ¤uft... '+G.spyTimer+'s':'Mission starten')+'</button></div>').join('');
  const sp=document.getElementById('sec-panel');if(sp)sp.innerHTML='<div class="card"><div class="sr"><span class="sl">Sicherheitslevel</span><span class="sv" style="color:var(--cy)">'+G.secLevel+'</span></div><div class="sr"><span class="sl">VorfÃ¤lle</span><span class="sv">'+G.incidents+'</span></div><button class="btn '+(G.money>=(G.secLevel+1)*400000?'cy-b':'')+'" style="margin-top:7px;" onclick="upDefense()">ðŸ›¡ï¸ Lvl '+(G.secLevel+1)+' â€” â‚¬'+fm((G.secLevel+1)*400000)+'</button></div>';
}

function rPatente(){
  const mp=document.getElementById('my-patents');if(mp)mp.innerHTML=G.patents.length?G.patents.map(p=>'<div style="background:var(--card);border:1px solid rgba(187,85,255,.3);border-radius:8px;padding:9px;margin-bottom:6px;"><div style="font-size:12px;font-weight:700;">ðŸ“œ '+p.name+'</div><div style="font-size:10px;color:var(--t2);">Angemeldet: '+p.filed+' Â· â‚¬'+fm(p.val)+'</div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;">Noch keine Patente. Forsche, um Patente zu erhalten.</div>';
  const ps=document.getElementById('patent-suits');if(ps)ps.innerHTML=RIVALS.map(r=>'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">âš–ï¸ vs. '+r.n+'</span><span style="font-size:10px;color:var(--dm);">60% Chance</span></div><div style="font-size:10px;color:var(--t2);margin-bottom:5px;">â‚¬500k Anwaltskosten Â· Award: â‚¬0.5Mâ€“â‚¬2.5M</div><button class="btn sm '+(G.patents.length>0&&G.money>=500000?'pu-b':'')+'" onclick="filePatent()">âš–ï¸ Klagen</button></div>').join('');
}

function rShowrooms(){
  document.getElementById('sr-total').textContent=G.showrooms.length;
  const sl=document.getElementById('sr-list');if(sl)sl.innerHTML=G.showrooms.map(s=>'<div style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:6px;display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+s.flag+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">'+s.city+'</div><div style="font-size:10px;color:var(--t2);">Seit '+s.opened+' Â· +'+s.db+'% Verkauf</div></div><span class="badge bg">AKTIV</span></div>').join('');
  const sb=document.getElementById('sr-build');if(sb){const av=SHOWROOM_LOCS.filter(l=>!G.showrooms.find(s=>s.city===l.city));sb.innerHTML=av.map((l,i)=>'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">'+l.flag+' '+l.city+'</span><span style="color:var(--go);font-weight:700;">â‚¬'+fm(l.cost)+'</span></div><div style="font-size:10px;color:var(--t2);margin-bottom:5px;">+'+l.db+'% Verkaufsbonus</div><button class="btn '+(G.money>=l.cost?'can':'')+'" onclick="buildShowroom('+SHOWROOM_LOCS.indexOf(l)+')">ðŸª ErÃ¶ffnen</button></div>').join('');}
}

function rWerb(){const el=document.getElementById('ad-list');if(!el)return;el.innerHTML=ADS.map(a=>{const on=G.ads.has(a.id);return '<div class="card"><div style="display:flex;gap:9px;align-items:center;"><div style="font-size:22px;flex-shrink:0;">'+a.icon+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+a.name+'</div><div style="font-size:11px;color:var(--gn);">'+a.eff+'</div><div style="font-size:11px;color:var(--go);">â‚¬'+fm(a.cost)+'/Tag</div></div><div class="tw '+(on?'on':'')+'" onclick="togAd(\''+a.id+'\')"><div class="tk"></div></div></div></div>';}).join('');}
function rAutoList(){const el=document.getElementById('auto-list');if(!el)return;el.innerHTML=AUTOS.map(a=>{const on=G.autos[a.id];return '<div class="card"><div style="display:flex;align-items:center;gap:9px;"><div style="flex:1;"><div style="font-size:13px;font-weight:700;">ðŸ¤– '+a.name+'</div><div style="font-size:10px;color:var(--t2);margin-top:2px;">'+a.desc+'</div><div style="font-size:10px;color:var(--go);">â‚¬'+fm(a.cost)+' einmalig</div></div><div class="tw '+(on?'on':'')+'" onclick="togAuto(\''+a.id+'\')"><div class="tk"></div></div></div></div>';}).join('');}
function rWerke(){
  const ow=document.getElementById('own-fac');if(ow)ow.innerHTML=G.facs.map(f=>'<div class="card done"><div style="font-size:13px;font-weight:700;margin-bottom:3px;">'+f.icon+' '+f.name+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:6px;">'+f.city+'</div><div class="sr"><span class="sl">Mitarbeiter</span><span class="sv">'+f.workers+'</span></div><div class="sr"><span class="sl">Effizienz</span><span class="sv">'+(f.eff*100).toFixed(0)+'%</span></div><div class="pw"><div class="pb gr" style="width:'+(f.eff*100).toFixed(0)+'%"></div></div></div>').join('');
  const bw=document.getElementById('buy-fac');if(!bw)return;
  const av=FACS.filter(f=>!G.facs.find(gf=>gf.id===f.id));const cm=G.currentCEO?.effect==='facCost'?G.currentCEO.val:1;
  bw.innerHTML=av.length?av.map(f=>{const cost=f.cost*cm;return '<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:3px;">'+f.icon+' '+f.name+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:6px;">'+f.city+'</div><div class="sr"><span class="sl">Mitarbeiter</span><span class="sv">'+f.workers+'</span></div><div class="sr"><span class="sl">Effizienz</span><span class="sv">'+(f.eff*100).toFixed(0)+'%</span></div><button class="btn '+(G.money>=cost?'can':'')+'" style="margin-top:8px;" onclick="buildFac(\''+f.id+'\')">ðŸ­ â‚¬'+fm(cost)+'</button></div>';}).join(''):'<div class="card"><div style="text-align:center;color:var(--dm);padding:12px;">Alle Werke gebaut! ðŸ†</div></div>';
}

function renderTuning(){
  const ul=document.getElementById('tuning-unlock');const tl=document.getElementById('tuning-list');if(!ul||!tl)return;
  if(!G.tuningDept){ul.innerHTML='<div class="card"><div style="font-size:12px;margin-bottom:9px;">Tuning erhÃ¶ht Fahrzeugpreise um 6â€“15% dauerhaft.</div><button class="btn '+(G.money>=1e6?'can':'')+'" onclick="unlockTuning()">ðŸ”© Tuning-Abteilung â€” â‚¬1 Mio.</button></div>';tl.innerHTML='';return;}
  ul.innerHTML='<div class="card done" style="margin-bottom:9px;font-size:12px;font-weight:700;">âœ“ Tuning-Abteilung aktiv</div>';
  const pkgs=[{id:'sport',name:'Sport-Paket',emoji:'ðŸŽï¸',cost:80000,pm:.08,req:'eng_v6'},{id:'luxury',name:'Luxury-Paket',emoji:'ðŸ’Ž',cost:120000,pm:.12,req:'int_lux'},{id:'electric',name:'E-Performance',emoji:'âš¡',cost:100000,pm:.10,req:'eng_elec'},{id:'offroad',name:'Offroad-Paket',emoji:'ðŸ”ï¸',cost:90000,pm:.09,req:'awd'},{id:'amg',name:'AMG-Line',emoji:'ðŸ”¥',cost:150000,pm:.15,req:'body_cfk'}];
  const av=VEHS.filter(v=>G.vehs[v.id]?.on);
  if(av.length===0){tl.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Keine Fahrzeuge in Produktion.</div>';return;}
  tl.innerHTML=av.map(veh=>{const cur=G.tuningProjects[veh.id];return '<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:7px;">'+veh.e+' '+veh.name+(cur?' <span class="badge bg">'+pkgs.find(p=>p.id===cur)?.name+'</span>':'')+'</div>'+pkgs.map(pkg=>{const applied=G.tuningProjects[veh.id]===pkg.id;const ca=G.comp[pkg.req]>=1&&G.money>=pkg.cost&&!applied;return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);"><div><div style="font-size:11px;font-weight:700;">'+pkg.emoji+' '+pkg.name+'</div><div style="font-size:10px;color:var(--gn);">Preis +'+Math.round(pkg.pm*100)+'%</div></div><button class="btn sm '+(applied?'mx':ca?'can':'')+'" onclick="applyTuning(\''+veh.id+'\',\''+pkg.id+'\')" '+(applied?'disabled':'')+'>'+(applied?'âœ“ AKTIV':'â‚¬'+fm(pkg.cost))+'</button></div>';}).join('')+'</div>';}).join('');
}

function renderKonzept(){
  const cons=[{id:'ev_vision',name:'EX-Vision SUV',emoji:'ðŸš€',cost:500000,rep:15,brand:10},{id:'gti_x',name:'GTI X-Treme',emoji:'ðŸ',cost:600000,rep:20,brand:12},{id:'phaeton_e',name:'Phaeton E-Concept',emoji:'ðŸ’Ž',cost:800000,rep:25,brand:15},{id:'micro',name:'Polo Micro City',emoji:'ðŸž',cost:300000,rep:10,brand:8},{id:'autobid',name:'AutoBuzz L5',emoji:'ðŸšŒ',cost:1000000,rep:30,brand:20}];
  const el=document.getElementById('konzept-list');if(!el)return;
  el.innerHTML=cons.map(con=>{const done=G.concepts.includes(con.id);return '<div class="card '+(done?'done':'')+'"><div style="font-size:28px;text-align:center;margin-bottom:5px;">'+con.emoji+'</div><div style="font-size:13px;font-weight:700;text-align:center;margin-bottom:3px;">'+con.name+'</div><div class="g2" style="margin-bottom:7px;"><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;text-align:center;"><div style="font-size:11px;font-weight:700;color:var(--gn);">+'+con.rep+'</div><div style="font-size:9px;color:var(--dm);">Reputation</div></div><div style="background:var(--bg3);padding:5px 7px;border-radius:5px;text-align:center;"><div style="font-size:11px;font-weight:700;color:var(--cy);">+'+con.brand+'</div><div style="font-size:9px;color:var(--dm);">Markenimage</div></div></div>'+(done?'<div style="text-align:center;"><span class="badge bg">âœ“ PRÃ„SENTIERT</span></div>':'<button class="btn '+(G.money>=con.cost&&G.conceptCD===0?'cy-b':'')+'" onclick="buildConcept(\''+con.id+'\')">'+(G.conceptCD>0?'Cooldown '+G.conceptCD+'s':'ðŸ’¡ PrÃ¤sentieren â€” â‚¬'+fm(con.cost))+'</button>')+'</div>';}).join('');
  if(G.conceptCD>0)G.conceptCD--;
}

function rRoadmap(){
  const evV=VEHS.filter(v=>v.req.includes('eng_elec')||v.req.includes('battery'));
  const actEV=evV.filter(v=>G.vehs[v.id]?.on).length;
  const total=VEHS.filter(v=>G.vehs[v.id]?.on).length;
  const evShare=total>0?Math.round(actEV/total*100):0;
  const el=document.getElementById('ev-roadmap');if(!el)return;
  const miles=[{t:10,y:'2025',l:'E-Einstieg',r:'â‚¬500k'},{t:25,y:'2027',l:'E-Ausbau',r:'CO2 -50%'},{t:50,y:'2030',l:'E-ParitÃ¤t',r:'EU-Subvention'},{t:75,y:'2035',l:'E-Dominanz',r:'MarktfÃ¼hrer'},{t:100,y:'2040',l:'Vollelektro',r:'Prestige'}];
  el.innerHTML=miles.map(m=>{const reached=evShare>=m.t;const pct=Math.min(100,evShare/m.t*100).toFixed(0);return '<div class="ev-mile '+(reached?'reached':'')+'"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;font-weight:700;">'+(reached?'âœ“':m.y)+' â€” '+m.l+'</span><span class="badge '+(reached?'bg':'bc')+'">'+m.t+'% E-Anteil</span></div><div class="pw"><div class="pb '+(reached?'gr':'cy')+'" style="width:'+pct+'%"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px;"><span style="color:var(--dm);">Aktuell: '+evShare+'%</span><span style="color:var(--gn);">'+m.r+'</span></div></div>';}).join('');
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
function rInsHTML(){return['ins_factory','ins_supply','ins_legal','ins_cyber'].map(id=>{const names={ins_factory:'Werksversicherung',ins_supply:'Lieferketten-Versicherung',ins_legal:'Rechtsschutz',ins_cyber:'Cyber-Versicherung'};const costs={ins_factory:200000,ins_supply:150000,ins_legal:100000,ins_cyber:120000};const active=G.insurance[id];return '<div class="card '+(active?'done':'')+'"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;">ðŸ›¡ï¸ '+names[id]+'</div><div style="font-size:10px;color:var(--t2);">â‚¬'+fm(costs[id])+'</div></div>'+(active?'<span class="badge bg">âœ“</span>':'<button class="btn sm '+(G.money>=costs[id]?'can':'')+'" onclick="buyInsurance(\''+id+'\')">AbschlieÃŸen</button>')+'</div></div>';}).join('');}
function rKiAngriff(){
  const kl=document.getElementById('ki-log');if(kl)kl.innerHTML=G.kiAttacks.length?[...G.kiAttacks].reverse().slice(0,8).map(a=>'<div class="card '+(a.blocked?'done':'warn')+'"><div style="display:flex;gap:8px;align-items:center;"><div style="font-size:16px;">'+a.emoji+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">'+a.icon+' '+a.rival+' â†’ '+a.atk+'</div><div style="font-size:10px;color:'+(a.blocked?'var(--gn)':'var(--rd)')+';">'+(a.blocked?'ðŸ›¡ï¸ GEBLOCKT':'ðŸ’¥ '+a.dmg||'Schaden')+' Â· '+a.when+'</div></div></div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Keine Angriffe bisher</div>';
  const kd=document.getElementById('ki-def');if(kd)kd.innerHTML='<div class="card"><div class="sr"><span class="sl">Verteidigungslevel</span><span class="sv" style="color:var(--cy)">'+G.defenseLevel+'/5</span></div><div class="sr"><span class="sl">Blockrate</span><span class="sv">'+(G.defenseLevel*15)+'%</span></div></div>'+(G.defenseLevel<5?'<button class="btn '+(G.money>=(G.defenseLevel+1)*400000?'cy-b':'')+'" style="margin-top:7px;" onclick="upDefense()">ðŸ›¡ï¸ Level '+(G.defenseLevel+1)+' â€” â‚¬'+fm((G.defenseLevel+1)*400000)+'</button>':'<div class="card done" style="text-align:center;">Max Verteidigung!</div>');
}

// â”€â”€ V8 NEW RENDERS â”€â”€
function rSaison(){
  const sc=SEASON_CFG[G.season];
  const sh=document.getElementById('season-hdr');
  if(sh)sh.innerHTML='<div class="sbadge '+sc.cls+'">'+sc.name+' â€” Wechsel in '+G.seasonTimer+'s</div><div class="card"><div style="font-size:11px;color:var(--t2);line-height:1.7;">ðŸŒ¸ FrÃ¼hling: Kompaktwagen & Stadtautos<br>â˜€ï¸ Sommer: Sportwagen, kleine E-Autos<br>ðŸ‚ Herbst: SUVs, Mittelklasse, Kombis<br>â„ï¸ Winter: Allrad, GelÃ¤ndewagen</div></div>';
  const sl=document.getElementById('season-list');if(!sl)return;
  const av=VEHS.filter(v=>G.vehs[v.id]?.on);
  if(av.length===0){sl.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Keine Fahrzeuge in Produktion.</div>';return;}
  sl.innerHTML=av.map(v=>{const b=sc.bonus?.[v.id]||1;const m=sc.malus?.[v.id]||1;const mult=b*m;return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:700;">'+v.e+' '+v.name+'</span><span style="font-size:13px;font-weight:700;color:'+(mult>1?'var(--gn)':mult<1?'var(--rd)':'var(--t2)')+'">'+(mult>1?'â–²':'â–¼')+Math.abs(Math.round((mult-1)*100))+'%</span></div><div style="font-size:10px;color:var(--t2);margin-top:3px;">'+(mult>1?'ðŸ“ˆ Saisonbonus':mult<1?'ðŸ“‰ SaisonschwÃ¤che':'Normal')+'</div></div>';}).join('');
}

function rQualitaet(){
  const st=Math.round(G.qualScore);
  document.getElementById('q-stars').textContent='â˜…'.repeat(st)+'â˜†'.repeat(5-st);
  document.getElementById('q-stars').style.color=G.qualScore>=4?'var(--gn)':G.qualScore>=3?'var(--go)':'var(--rd)';
  document.getElementById('q-cnt').textContent=G.reviews.length;
  const dn=document.getElementById('q-dna');if(dn)dn.innerHTML='<div class="card">'+Object.entries(G.dna).map(([k,v])=>`<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span style="color:var(--t2);">${{engineering:'Ingenieurskunst',materials:'MaterialqualitÃ¤t',assembly:'Montage',safety:'Sicherheit',design:'Design'}[k]||k}</span><span style="font-weight:700;color:${v>70?'var(--gn)':v>40?'var(--go)':'var(--rd)'}">${v.toFixed(0)}%</span></div><div class="pw"><div class="pb ${v>70?'gr':v>40?'go':'rd'}" style="width:${v}%"></div></div></div>`).join('')+'</div>';
  const rv=document.getElementById('q-reviews');if(rv)rv.innerHTML=G.reviews.slice(0,8).map(r=>'<div style="background:var(--card);border:1px solid var(--bdr);border-radius:7px;padding:9px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;font-weight:700;">'+r.emoji+' '+r.veh+'</span><span style="color:var(--go);">'+'â˜…'.repeat(r.r)+'â˜†'.repeat(5-r.r)+'</span></div><div style="font-size:11px;color:var(--t2);">"'+r.comment+'"</div><div style="font-size:9px;color:var(--dm);margin-top:2px;">'+r.when+'</div></div>').join('')||'<div style="color:var(--dm);font-size:12px;padding:8px;">Noch keine Bewertungen.</div>';
}

function rBM(){
  const rv=document.getElementById('bm-risk-val');if(rv){rv.textContent=G.bmRisk.toFixed(0)+'%'+(G.bmCD>0?' ðŸš” GESPERRT '+G.bmCD+'s':'');rv.style.color=G.bmRisk>60?'var(--rd)':G.bmRisk>30?'var(--go)':'var(--gn)';}
  const rb=document.getElementById('bm-risk-bar');if(rb){rb.style.width=G.bmRisk+'%';}
  const bl=document.getElementById('bm-list');if(!bl)return;
  bl.innerHTML=BM_ITEMS.map(item=>'<div class="bm-card"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;color:var(--pu);">'+item.emoji+' '+item.name+'</span><span style="color:var(--go);font-weight:700;">â‚¬'+fm(item.cost)+'</span></div><div style="font-size:11px;color:var(--t2);margin-bottom:3px;">'+item.desc+'</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:10px;color:'+(item.risk>30?'var(--rd)':'var(--go)')+';">âš  Risiko +'+item.risk+'%</span><span style="font-size:10px;color:var(--gn);">+'+item.amt+' '+(item.res==='patent'?'Patent':G.res[item.res]?.name||item.res)+'</span></div><button class="btn sm '+(G.money>=item.cost&&G.bmCD===0?'pu-b':'')+'" onclick="bmBuy(\''+item.id+'\')">Kaufen</button></div>').join('');
}

function renderIngenieure(){
  const el=document.getElementById('eng-list');if(el)el.innerHTML=G.engTeam.map((e,i)=>'<div style="background:var(--card);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:6px;"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">'+e.emoji+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+e.name+'</div><div style="font-size:10px;color:var(--pu);">'+e.spec+' Â· Level '+e.lvl+'</div><div style="font-size:10px;color:var(--t2);margin-top:2px;">+'+( e.lvl*5)+'% F&E Speed Â· +'+( e.lvl*2)+'% QualitÃ¤t</div><div class="eng-xp"><div class="eng-xp-f" style="width:'+(e.xp/e.xpN*100).toFixed(0)+'%"></div></div><div style="font-size:9px;color:var(--dm);margin-top:1px;">XP: '+e.xp.toFixed(0)+'/'+e.xpN.toFixed(0)+'</div></div><span class="badge bpu">Lvl '+e.lvl+'</span></div></div>').join('');
  const hl=document.getElementById('eng-hire');if(hl)hl.innerHTML='<button class="btn '+(G.money>=150000?'can':'')+'" onclick="hireEng()">ðŸ§‘â€ðŸ”¬ Ingenieur einstellen â€” â‚¬150.000</button>';
}

function rKampagne(){
  const done=G.missionsDone.length;const total=MISSIONS.length;
  const mp=document.getElementById('mission-prog');if(mp)mp.innerHTML='<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-weight:700;">Fortschritt</span><span style="color:var(--cy);font-weight:700;">'+done+'/'+total+'</span></div><div class="pw"><div class="pb cy" style="width:'+(done/total*100).toFixed(0)+'%"></div></div></div>';
  const ml=document.getElementById('mission-list');if(!ml)return;
  ml.innerHTML=MISSIONS.map(m=>{const isDone=G.missionsDone.includes(m.id);const isActive=!isDone&&m.id===G.campaignStep;const locked=!isDone&&m.id>G.campaignStep;return '<div class="mc '+(isDone?'done':isActive?'active':'locked')+'"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;">'+(isDone?'âœ“':isActive?'â–¶':'ðŸ”’')+' '+m.name+'</span><span class="badge '+(isDone?'bg':isActive?'bc':'br')+'">+â‚¬'+fm(m.r)+'</span></div><div style="font-size:11px;color:var(--t2);">'+m.desc+'</div>'+(isActive?'<div style="font-size:10px;color:var(--cy);margin-top:3px;">â†’ AKTUELLE MISSION</div>':'')+'</div>';}).join('');
}

function rRanking(){
  G.playerScore=Math.floor(G.prod*10+G.rev/1000+G.share*500+G.patents.length*1000+G.raceWins*2000+G.missionsDone.length*500);
  const bots=[{name:'BMW AG Sim',s:Math.floor(G.playerScore*(.8+Math.random()*.4))},{name:'Tesla Motors',s:Math.floor(G.playerScore*(.9+Math.random()*.5))},{name:'Toyota Corp',s:Math.floor(G.playerScore*(.7+Math.random()*.6))},{name:'StarDrive GmbH',s:Math.floor(G.playerScore*(.5+Math.random()*.8))},{name:'EV Pioneer',s:Math.floor(G.playerScore*(.3+Math.random()*.9))},{name:'AutoKing24',s:Math.floor(G.playerScore*(.4+Math.random()*.7))},{name:'GigaWheels AG',s:Math.floor(G.playerScore*(.6+Math.random()*.5))},{name:'VoltCars',s:Math.floor(G.playerScore*(.2+Math.random()*1.1))},{name:'RoadMaster Inc',s:Math.floor(G.playerScore*(.35+Math.random()*.8))}];
  const all=[{name:'Du â­',s:G.playerScore,isMe:true},...bots].sort((a,b)=>b.s-a.s);
  const myPos=all.findIndex(x=>x.isMe)+1;
  const rp=document.getElementById('rank-pos');if(rp)rp.textContent='#'+myPos;
  const rs=document.getElementById('rank-score');if(rs)rs.textContent=fm(G.playerScore);
  const lb=document.getElementById('lb-list');if(lb){const medals=['ðŸ¥‡','ðŸ¥ˆ','ðŸ¥‰'];lb.innerHTML=all.map((p,i)=>'<div class="lb-row" style="'+(p.isMe?'background:rgba(0,212,255,.05);border-radius:6px;padding:8px 6px;':'')+'"><div style="width:28px;height:28px;border-radius:50%;background:'+(i<3?'rgba(255,170,0,.2)':'var(--bg3)')+';color:'+(i<3?'var(--go)':'var(--dm)')+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;">'+(i<3?medals[i]:i+1)+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;'+(p.isMe?'color:var(--cy)':'')+' ">'+p.name+'</div></div><div style="font-size:13px;font-weight:700;font-family:monospace;color:'+(p.isMe?'var(--gn)':'var(--t2)')+'">'+fm(p.s)+'</div></div>').join('');}
}

function rWeltkarte(){
  const wm=document.getElementById('wm-container');
  if(wm){
    const w=320,h=160;
    let svg='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;background:#060e18;border-radius:8px;border:1px solid var(--bdr);"><text x="10" y="18" fill="#4a6880" font-size="10">ðŸŒ KI-Werke Weltkarte</text>';
    for(let x=0;x<w;x+=40)svg+='<line x1="'+x+'" y1="22" x2="'+x+'" y2="'+h+'" stroke="#0d1520" stroke-width="1"/>';
    for(let y=22;y<h;y+=25)svg+='<line x1="0" y1="'+y+'" x2="'+w+'" y2="'+y+'" stroke="#0d1520" stroke-width="1"/>';
    // Player dot (Wolfsburg ~145,60)
    svg+='<circle cx="145" cy="62" r="8" fill="rgba(0,212,255,.25)" stroke="#00d4ff" stroke-width="2"/><text x="156" y="66" fill="#00d4ff" font-size="9" font-weight="bold">Du</text>';
    // Rival factories
    const positions={MÃ¼nchen:[148,63],Stuttgart:[147,64],Detroit:[80,58],Fremont:[40,60],Austin:[60,65],Ulsan:[250,60],'Toyota City':[248,62],Turin:[148,67]};
    G.rivalFacs.forEach(f=>{const r=RIVALS.find(x=>x.id===f.rival);if(!r)return;const pos=positions[f.city]||[Math.floor(Math.random()*260+20),Math.floor(Math.random()*100+25)];svg+='<circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="5" fill="'+r.cl+'44" stroke="'+r.cl+'" stroke-width="1.5"/><text x="'+(pos[0]+8)+'" y="'+(pos[1]+4)+'" fill="'+r.cl+'" font-size="8">'+f.icon+'</text>';});
    svg+='</svg>';
    wm.innerHTML=svg;
  }
  const rf=document.getElementById('rival-facs');
  if(rf)rf.innerHTML=G.rivalFacs.length?G.rivalFacs.map(f=>{const r=RIVALS.find(x=>x.id===f.rival);return '<div class="card warn"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:20px;">'+f.icon+'</div><div><div style="font-size:13px;font-weight:700;color:'+(r?.cl||'var(--rd)')+'">'+r?.n+' â€” '+f.city+'</div><div style="font-size:10px;color:var(--t2);">Gebaut: '+f.built+' Â· StÃ¤rkt Rivalen +0.4%</div></div></div></div>';}).join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Noch keine KI-Werke gebaut.<br>Nach ~5 Min. starten Rivalen zu expandieren.</div>';
}

function rFin(){
  const dr=dailyRev();
  document.getElementById('f-rev').textContent='â‚¬'+fm(G.rev);document.getElementById('f-cost').textContent='â‚¬'+fm(G.cost);document.getElementById('f-pft').textContent='â‚¬'+fm(G.rev-G.cost);document.getElementById('f-val').textContent='â‚¬'+fm(G.money*8+G.rev*2+G.stockOwned*G.stockPrice);
  const adC=[...G.ads].reduce((s,id)=>s+(ADS.find(a=>a.id===id)?.cost||0),0);const wC=G.facs.reduce((s,f)=>s+f.workers,0)*180;const lC=G.loans.reduce((s,l)=>s+l.monthly,0);
  const el=document.getElementById('fin-detail');if(el)el.innerHTML='<div class="card"><div class="sr"><span class="sl">Umsatz/Tag</span><span class="sv" style="color:var(--gn)">â‚¬'+fm(dr)+'</span></div><div class="sr"><span class="sl">Werbekosten</span><span class="sv" style="color:var(--rd)">â‚¬'+fm(adC)+'</span></div><div class="sr"><span class="sl">Lohnkosten</span><span class="sv" style="color:var(--rd)">â‚¬'+fm(wC)+'</span></div><div class="sr"><span class="sl">Kreditraten</span><span class="sv" style="color:var(--rd)">â‚¬'+fm(lC)+'</span></div><div class="sr"><span class="sl">Nettogewinn/Tag</span><span class="sv" style="color:'+(dr-adC-wC-lC>=0?'var(--gn)':'var(--rd)')+'">â‚¬'+fm(dr-adC-wC-lC)+'</span></div><div class="sr"><span class="sl">Aktienwert</span><span class="sv" style="color:var(--go)">â‚¬'+fm(G.stockOwned*G.stockPrice)+'</span></div><div class="sr"><span class="sl">Reputation</span><span class="sv" style="color:var(--go)">â˜…'+Math.round(G.rep)+'/100</span></div><div class="sr"><span class="sl">ESG Score</span><span class="sv" style="color:'+(G.esgScore>60?'var(--gn)':'var(--go)')+'">'+G.esgScore.toFixed(0)+'/100</span></div><div class="sr"><span class="sl">QualitÃ¤tsscore</span><span class="sv" style="color:var(--go)">'+'â˜…'.repeat(Math.round(G.qualScore))+'â˜†'.repeat(5-Math.round(G.qualScore))+'</span></div></div>';
  const yr=document.getElementById('yr-report');if(yr)yr.innerHTML=G.yearlyData.length?G.yearlyData.slice(-1).map(r=>'<div class="card"><div style="font-size:11px;font-weight:700;color:var(--pu);margin-bottom:6px;">ðŸ“Š Jahresbericht Jahr '+r.year+'</div><div class="sr"><span class="sl">Umsatz</span><span class="sv" style="color:var(--gn)">â‚¬'+fm(r.rev)+'</span></div><div class="sr"><span class="sl">Kosten</span><span class="sv" style="color:var(--rd)">â‚¬'+fm(r.cost)+'</span></div><div class="sr"><span class="sl">Produziert</span><span class="sv">'+fm(r.prod)+' Autos</span></div><div class="sr"><span class="sl">Marktanteil</span><span class="sv">'+r.share+'%</span></div></div>').join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;text-align:center;">Erscheint nach dem ersten Spieljahr</div>';
}

function rSpeichern(){
  const has=!!localStorage.getItem(SAVE_KEY);
  const el=document.getElementById('save-info');if(!el)return;
  if(!has){el.innerHTML='<div style="color:var(--dm);font-size:12px;padding:10px;text-align:center;">Noch kein Spielstand gespeichert.</div>';return;}
  try{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY));const ts=new Date(d.ts);
    el.innerHTML='<div class="card done"><div style="font-size:13px;font-weight:700;margin-bottom:6px;">ðŸ“ Spielstand</div><div class="sr"><span class="sl">Gespeichert</span><span class="sv">'+ts.toLocaleString()+'</span></div><div class="sr"><span class="sl">Jahr/Q</span><span class="sv">Q'+(d.q||1)+' J'+(d.y||1)+'</span></div><div class="sr"><span class="sl">Kapital</span><span class="sv" style="color:var(--gn)">â‚¬'+fm(d.money||0)+'</span></div><div class="sr"><span class="sl">Produziert</span><span class="sv">'+fm(d.prod||0)+' Autos</span></div><div class="sr"><span class="sl">Marktanteil</span><span class="sv">'+(d.share||0).toFixed(1)+'%</span></div><div class="g2" style="margin-top:8px;"><button class="btn can" onclick="loadGame()">ðŸ“‚ Laden</button><button class="btn rd-b" onclick="resetGame()">ðŸ—‘ï¸ LÃ¶schen</button></div></div>';
  }catch(e){el.innerHTML='<div style="color:var(--dm)">Fehler beim Lesen.</div>';}
}

// â”€â”€ HELPERS â”€â”€
function fm(n){n=Math.floor(n||0);if(n>=1e9)return(n/1e9).toFixed(1)+'Mrd';if(n>=1e6)return(n/1e6).toFixed(1)+'Mio';if(n>=1e3)return(n/1e3).toFixed(0)+'k';return n+'';}
function addEv(html){const f=document.getElementById('ev-feed');if(!f)return;const d=document.createElement('div');d.style.cssText='display:flex;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px;';const now=new Date();const t=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');d.innerHTML='<span style="color:var(--dm);font-size:10px;flex-shrink:0;">'+t+'</span><span>'+html+'</span>';f.prepend(d);while(f.children.length>60)f.lastChild.remove();}
function addAI(html){const f=document.getElementById('ai-log');if(!f)return;const d=document.createElement('div');d.style.cssText='padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);';d.innerHTML=html;f.prepend(d);while(f.children.length>12)f.lastChild.remove();}
function notify(msg,type){const a=document.getElementById('notifs');const d=document.createElement('div');d.className='notif '+(type||'');d.textContent=msg;d.onclick=()=>d.remove();a.appendChild(d);setTimeout(()=>d.remove(),4000);}
function sv(id,btn){document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));const el=document.getElementById('v-'+id);if(el)el.classList.add('on');if(btn)btn.classList.add('on');document.getElementById('content').scrollTop=0;}
function buildTicker(){const el=document.getElementById('tick-inner');if(!el)return;const ch=(G.stockHistory.length>1?(G.stockPrice/G.stockHistory[G.stockHistory.length-2]-1)*100:0);const items=[{t:'â‚¬'+fm(G.money),c:'p'},{t:'AKTIE â‚¬'+Math.round(G.stockPrice)+' ('+(ch>=0?'+':'')+ch.toFixed(1)+'%)',c:ch>=0?'p':'r'},{t:'MARKT '+G.share.toFixed(1)+'%',c:''},{t:'PROD '+fm(G.prod),c:'p'},...RIVALS.map(r=>({t:r.n.split(' ')[0]+' '+r.sh.toFixed(1)+'%',c:''})),{t:'SAISON: '+SEASON_CFG[G.season].name,c:'g'},{t:'AUTO EMPIRE v8',c:'g'}];el.innerHTML=items.map(i=>'<span class="ti '+i.c+'">â—‡ '+i.t+'</span>').join('');}

// init(); removed for multiplayer
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUTO EMPIRE v9  â€”  25 NEUE FEATURES + DESIGN FIXES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // 7. RivalitÃ¤t
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

// â”€â”€â”€ NEWS DATA â”€â”€â”€
const NEWS_TEMPLATES = [
  () => RIVALS[Math.floor(Math.random()*RIVALS.length)].n + ' kÃ¼ndigt neues Modell an â€” Marktanteil +' + (Math.random()*2).toFixed(1) + '%',
  () => 'Ã–lpreis ' + (Math.random()<.5?'steigt':'fÃ¤llt') + ' â€” Energie-Kosten ' + (Math.random()<.5?'erhÃ¶hen':'senken') + ' sich',
  () => 'EU verschÃ¤rft CO2-Vorschriften fÃ¼r ' + (2026+Math.floor(Math.random()*5)),
  () => 'Analysten: E-MobilitÃ¤t wÃ¤chst um ' + (15+Math.floor(Math.random()*20)) + '% in diesem Quartal',
  () => 'Chip-Hersteller ' + ['TSMC','Samsung','Intel'][Math.floor(Math.random()*3)] + ' erhÃ¶ht KapazitÃ¤t â€” Elektronik gÃ¼nstiger',
  () => 'Auto Empire erreicht ' + G.share.toFixed(1) + '% Marktanteil â€” Aktie reagiert positiv',
  () => 'Streikgefahr bei ' + RIVALS[Math.floor(Math.random()*RIVALS.length)].n + ' â€” Produktion gefÃ¤hrdet',
  () => 'Neue Forschungsstudie: Autonomes Fahren boomt in ' + ['USA','China','Europa'][Math.floor(Math.random()*3)],
  () => G.season === 'winter' ? 'Winterhoch: SUV-Nachfrage steigt um 25%' : G.season === 'summer' ? 'Sommersaison: Sportwagen gefragter' : 'Saisonale Nachfrage normalisiert sich',
  () => 'RohstoffmÃ¤rkte: Aluminium ' + (G.commMult.aluminum > 1.2 ? 'auf Jahreshoch' : 'stabilisiert sich'),
];

// â”€â”€â”€ CHALLENGES â”€â”€â”€
const CHALLENGE_POOL = [
  {id:'c1', name:'Produktionssprint',  desc:'Produziere 50 Fahrzeuge heute',     target:()=>G.prod, thresh:50,   r:25000,  type:'prod'},
  {id:'c2', name:'Verkaufsrekord',      desc:'â‚¬500k Umsatz in dieser Session',    target:()=>G.rev,  thresh:500000,r:30000, type:'rev'},
  {id:'c3', name:'Forschungseifer',    desc:'SchlieÃŸe 2 Forschungen ab',          target:()=>Object.values(G.rdone).filter(Boolean).length, thresh:2,r:20000,type:'rd'},
  {id:'c4', name:'SparfÃ¼chse',         desc:'Starte 3 Werbungen gleichzeitig',    target:()=>G.ads.size, thresh:3,r:15000, type:'ads'},
  {id:'c5', name:'Multimarkt',         desc:'ErschlieÃŸe eine neue Region',        target:()=>Object.values(G.regions).filter(r=>r.unlocked).length, thresh:2,r:50000,type:'region'},
  {id:'c6', name:'E-MobilitÃ¤tspionier',desc:'Produziere ein Elektrofahrzeug',     target:()=>['id4','beetle','id_buzz'].some(id=>G.vehs[id]?.on)?1:0, thresh:1,r:40000,type:'ev'},
  {id:'c7', name:'AktionÃ¤r',           desc:'Besitze 50 Aktien',                  target:()=>G.stockOwned, thresh:50,r:20000,type:'stocks'},
  {id:'c8', name:'QualitÃ¤tsfÃ¼hrer',    desc:'Erreiche 4-Sterne QualitÃ¤t',          target:()=>Math.round(G.qualScore), thresh:4,r:35000,type:'quality'},
];

// â”€â”€â”€ PARTNERS â”€â”€â”€
const PARTNER_DATA = [
  {id:'bosch',    name:'BOSCH',         emoji:'âš™ï¸', bonus:'Elektronik -20%',    cost:800000,  effect:'elec_cost', val:.8},
  {id:'basf',     name:'BASF',          emoji:'ðŸ§ª', bonus:'Kunststoff -15%',    cost:500000,  effect:'plastic_cost',val:.85},
  {id:'thyssenkrupp',name:'ThyssenKrupp',emoji:'ðŸ”©',bonus:'Stahl -18%',         cost:700000,  effect:'steel_cost',val:.82},
  {id:'michelin', name:'MICHELIN',      emoji:'âš«', bonus:'Gummi kostenlos',    cost:400000,  effect:'rubber_free',val:1},
  {id:'continental',name:'Continental', emoji:'ðŸ”‹', bonus:'Batterie -25%',      cost:1200000, effect:'battery_cost',val:.75},
  {id:'panasonic',name:'PANASONIC',     emoji:'ðŸ’¡', bonus:'Elektronik gratis',  cost:900000,  effect:'elec_free',  val:1},
];

// â”€â”€â”€ PRESS CONFERENCES â”€â”€â”€
function holdPressConference() {
  if(G.pressConfCD > 0) { notify('NÃ¤chste in ' + G.pressConfCD + 's', 'warn'); return; }
  const bonus = Math.floor(G.rep * 1000 + G.share * 5000);
  G.money += bonus;
  G.rep = Math.min(100, G.rep + 5);
  G.brand = Math.min(100, G.brand + 3);
  G.pressConfCD = 180;
  addEv('ðŸŽ¤ <span style="color:var(--cy)">Pressekonferenz</span> â€” Reputation +5, +â‚¬' + fm(bonus));
  notify('Pressekonferenz erfolgreich! +â‚¬' + fm(bonus), 'ok');
  spawnPtcls(window.innerWidth/2, window.innerHeight/3, '#00d4ff', 20);
  floatMoney(bonus, true);
}

// â”€â”€â”€ MARKET TREND SYSTEM â”€â”€â”€
function updateMarketTrend() {
  G.trendTimer--;
  if(G.trendTimer <= 0) {
    G.trendTimer = 120 + Math.floor(Math.random() * 120);
    const trends = ['bull','bear','stable','stable'];
    G.marketTrend = trends[Math.floor(Math.random() * trends.length)];
    const msgs = { bull: 'ðŸ“ˆ Bullenmarkt! Alle Preise +8% fÃ¼r 120s', bear: 'ðŸ“‰ BÃ¤renmarkt! Nachfrage -10% fÃ¼r 120s', stable: 'ðŸ“Š Markt stabilisiert sich' };
    addEv('<span style="color:var(--go)">' + msgs[G.marketTrend] + '</span>');
    if(G.marketTrend !== 'stable') notify(msgs[G.marketTrend], G.marketTrend === 'bull' ? 'ok' : 'warn');
  }
}

// â”€â”€â”€ NEWS TICK â”€â”€â”€
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

// â”€â”€â”€ CHALLENGE TICK â”€â”€â”€
function challengeTick() {
  // Init challenges if empty
  if(G.challenges.length === 0) {
    G.challenges = CHALLENGE_POOL.slice(0, 3).map(c => ({...c, progress: 0, done: false, startVal: c.target()}));
  }
  G.challenges.forEach(ch => {
    if(ch.done) return;
    const cur = ch.target();
    ch.progress = Math.min(100, ((cur - ch.startVal) / ch.thresh) * 100);
    if(ch.progress >= 100 && !ch.done) {
      ch.done = true;
      G.money += ch.r;
      G.prestigePts += Math.floor(ch.r / 10000);
      notify('ðŸŽ¯ Challenge: ' + ch.name + ' â€” +â‚¬' + fm(ch.r), 'ok');
      addEv('ðŸŽ¯ <span style="color:var(--gn)">Challenge: ' + ch.name + '</span> â€” +â‚¬' + fm(ch.r));
      showBurst('ðŸŽ¯ ' + ch.name, 'Challenge!', '+â‚¬' + fm(ch.r));
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
    notify('ðŸŽ¯ Neue Challenges verfÃ¼gbar!', 'info');
  }
}

// â”€â”€â”€ EOTM (Employee of the Month) â”€â”€â”€
function eotmTick() {
  G.eotmTimer--;
  if(G.eotmTimer <= 0) {
    G.eotmTimer = 120;
    if(G.engTeam.length > 0) {
      const idx = Math.floor(Math.random() * G.engTeam.length);
      G.eotm = G.engTeam[idx];
      G.engTeam[idx].xp += 30;
      G.rep = Math.min(100, G.rep + 2);
      notify('ðŸ… ' + G.eotm.name + ' ist Mitarbeiter des Monats!', 'ok');
      addEv('ðŸ… <span style="color:var(--go)">' + G.eotm.name + '</span> â€” Mitarbeiter des Monats! Rep +2');
    }
  }
  if(G.pressConfCD > 0) G.pressConfCD--;
}

// â”€â”€â”€ CREDIT SCORE SYSTEM â”€â”€â”€
function updateCreditScore() {
  // Score based on revenue, loans, profitability
  const base = 750;
  const revenueBonus = Math.min(100, G.rev / 100000);
  const loanMalus = G.loans.length * 30;
  const profitBonus = G.rev > G.cost ? 50 : -50;
  G.creditScore = Math.min(850, Math.max(300, base + revenueBonus + profitBonus - loanMalus));
}

// â”€â”€â”€ PRICE ADJUSTMENT â”€â”€â”€
function setPriceMulti(vid, delta) {
  if(!G.customPrices[vid]) G.customPrices[vid] = 1.0;
  G.customPrices[vid] = Math.max(0.5, Math.min(2.0, G.customPrices[vid] + delta));
  const line = G.lines.find(l => l.veh.id === vid);
  if(line) line.veh.pm = G.customPrices[vid];
  notify('Preis: ' + Math.round(G.customPrices[vid] * 100) + '% des Basispreises', 'ok');
}

// â”€â”€â”€ PARTNER SYSTEM â”€â”€â”€
function signPartner(id) {
  const p = PARTNER_DATA.find(x => x.id === id);
  if(!p) return;
  if(G.partners.find(x => x.id === id)) { notify('Bereits Partner!', 'warn'); return; }
  if(G.money < p.cost) { notify('Kostet â‚¬' + fm(p.cost), 'err'); return; }
  G.money -= p.cost; G.cost += p.cost;
  G.partners.push({...p});
  addEv('ðŸ¤ <span style="color:var(--gn)">Partner: ' + p.emoji + ' ' + p.name + '</span> â€” ' + p.bonus);
  notify('Partner ' + p.name + ' gewonnen!', 'ok');
  spawnPtcls(window.innerWidth/2, window.innerHeight/2, '#00ff88', 20);
}

// â”€â”€â”€ LAB SYSTEM â”€â”€â”€
function upgradeLab() {
  const cost = G.labLevel * 500000;
  if(G.money < cost) { notify('Kostet â‚¬' + fm(cost), 'err'); return; }
  G.money -= cost; G.labLevel++; G.labSlots = Math.min(3, G.labLevel);
  notify('Labor Level ' + G.labLevel + ' â€” ' + G.labSlots + ' parallele Forschungen!', 'ok');
  addEv('ðŸ§ª <span style="color:var(--pu)">F&E Labor Level ' + G.labLevel + '</span>');
}

// â”€â”€â”€ RIVALRY ACTIONS â”€â”€â”€
function launchCampaignVsRival(rivalId) {
  if(G.money < 500000) { notify('Kostet â‚¬500k', 'err'); return; }
  const r = RIVALS.find(x => x.id === rivalId);
  if(!r) return;
  G.money -= 500000;
  const stolen = 1 + Math.random() * 1.5;
  r.sh = Math.max(2, r.sh - stolen);
  G.share = Math.min(45, G.share + stolen * 0.3);
  G.rivalActions++;
  notify('Kampagne gegen ' + r.n + '! Marktanteil -' + stolen.toFixed(1) + '%', 'ok');
  addEv('âš¡ <span style="color:var(--gn)">Kampagne gegen ' + r.ic + ' ' + r.n + '</span> â€” ' + stolen.toFixed(1) + '% gestohlen');
  spawnPtcls(window.innerWidth/2, window.innerHeight/2, '#ff3355', 30);
}

// â”€â”€â”€ PRESS CONFERENCE â”€â”€â”€
// â”€â”€â”€ SUSTAINABILITY GOAL â”€â”€â”€
function checkSustainability() {
  if(!G.sustainGoals.achieved && G.co2Index <= G.sustainGoals.co2Target) {
    G.sustainGoals.achieved = true;
    G.money += 1000000;
    G.esgScore = Math.min(100, G.esgScore + 20);
    notify('ðŸŒ¿ CO2-Ziel erreicht! +â‚¬1 Mio. + ESG +20', 'ok');
    addEv('ðŸŒ¿ <span style="color:var(--gn)">Nachhaltigkeitsziel erreicht!</span> CO2 â‰¤ 80 â€” +â‚¬1 Mio.');
    showBurst('ðŸŒ¿ Nachhaltig!', 'CO2-Ziel erfÃ¼llt', '+â‚¬1 Mio.');
  }
}

// â”€â”€â”€ RIVAL STOCK SYSTEM â”€â”€â”€
function buyRivalStock(rivalId) {
  const r = RIVALS.find(x => x.id === rivalId);
  const price = r.ca / 1000000;
  if(G.money < price) { notify('Zu wenig Kapital!', 'err'); return; }
  G.money -= price;
  if(!G.rivalStocks[rivalId]) G.rivalStocks[rivalId] = { n: 0, avgPrice: price };
  G.rivalStocks[rivalId].n++;
  G.rivalStocks[rivalId].avgPrice = ((G.rivalStocks[rivalId].avgPrice * (G.rivalStocks[rivalId].n-1)) + price) / G.rivalStocks[rivalId].n;
  notify('Aktie ' + r.n + ' gekauft @â‚¬' + fm(price), 'ok');
}

// â”€â”€â”€ VEHICLE UPGRADE (beyond tuning) â”€â”€â”€
function buyVehicleUpgrade(vid, type) {
  const upgrades = {
    aerodynamics: { name:'Aerodynamik', cost:200000, desc:'+8% Speed', effect:'speed' },
    materials:    { name:'Premium Materialien', cost:350000, desc:'+10% QualitÃ¤t', effect:'quality' },
    software:     { name:'OTA Software', cost:150000, desc:'+5% Effizienz', effect:'efficiency' },
    branding:     { name:'Premium Branding', cost:400000, desc:'+12% Preis', effect:'price' },
  };
  const up = upgrades[type];
  if(!up) return;
  if(G.money < up.cost) { notify('Kostet â‚¬' + fm(up.cost), 'err'); return; }
  if(!G.vehicleUpgrades[vid]) G.vehicleUpgrades[vid] = {};
  if(G.vehicleUpgrades[vid][type]) { notify('Bereits upgegradet!', 'warn'); return; }
  G.money -= up.cost;
  G.vehicleUpgrades[vid][type] = true;
  if(type === 'price') {
    const line = G.lines.find(l => l.veh.id === vid);
    if(line) line.veh.pm = (line.veh.pm || 1) * 1.12;
  }
  notify(up.name + ' auf ' + vid + ' angewendet!', 'ok');
  addEv('ðŸš— <span style="color:var(--gn)">Upgrade: ' + up.name + '</span> fÃ¼r ' + vid);
}

// â”€â”€â”€ EXTEND MAIN TICK â”€â”€â”€
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

// â”€â”€â”€ RENDER NEW VIEWS â”€â”€â”€
function rNews(){
  const el = document.getElementById('news-feed');
  if(!el) return;
  if(G.newsItems.length === 0) {
    el.innerHTML = '<div style="color:var(--dm);font-size:12px;text-align:center;padding:14px;">Keine Nachrichten. LÃ¤uft nach ~60s...</div>';
    return;
  }
  el.innerHTML = G.newsItems.slice(0, 15).map(n => `
    <div class="${n.pos ? 'gcard-green' : 'gcard-red'}" style="margin-bottom:7px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <span style="font-size:11px;line-height:1.5;font-weight:600;">${n.pos ? 'ðŸ“ˆ' : 'ðŸ“‰'} ${n.text}</span>
        <span style="font-size:9px;color:var(--dm);flex-shrink:0;">${n.ts}</span>
      </div>
    </div>`).join('');
}

function rPortfolio(){
  const pfv = Object.entries(G.rivalStocks).reduce((s, [rid, st]) => s + (st.currentPrice || 0) * st.n, 0);
  G.portfolioValue = pfv + G.stockOwned * G.stockPrice;
  const pfEl = document.getElementById('pf-val');
  const roiEl = document.getElementById('pf-roi');
  if(pfEl) pfEl.textContent = 'â‚¬' + fm(G.portfolioValue);
  const invested = Object.values(G.rivalStocks).reduce((s, st) => s + st.avgPrice * st.n, 0) + G.stockOwned * 100;
  if(roiEl) { const roi = invested > 0 ? ((G.portfolioValue / invested - 1) * 100) : 0; roiEl.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'; roiEl.style.color = roi >= 0 ? 'var(--gn)' : 'var(--rd)'; }
  const pl = document.getElementById('portfolio-list');
  if(pl) pl.innerHTML = `<div class="gcard-cyan">
    <div class="sr"><span class="sl">Auto Empire Aktien</span><span class="sv" style="color:var(--cy)">${G.stockOwned} Ã— â‚¬${G.stockPrice.toFixed(2)} = â‚¬${fm(G.stockOwned * G.stockPrice)}</span></div>
    ${Object.entries(G.rivalStocks).map(([rid, st]) => {
      const r = RIVALS.find(x => x.id === rid);
      const cur = st.currentPrice || st.avgPrice;
      const roi = ((cur / st.avgPrice) - 1) * 100;
      return `<div class="sr"><span class="sl">${r?.ic} ${r?.n}</span><span class="sv" style="color:${roi>=0?'var(--gn)':'var(--rd)'}">${st.n} Ã— â‚¬${fm(cur)} (${roi>=0?'+':''}${roi.toFixed(1)}%)</span></div>`;
    }).join('')}
  </div>`;
  const rs = document.getElementById('rival-stocks');
  if(rs) rs.innerHTML = RIVALS.map(r => {
    const price = r.ca / 1000000;
    const owned = G.rivalStocks[r.id]?.n || 0;
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;color:${r.cl}">${r.ic} ${r.n}</div><div style="font-size:10px;color:var(--t2);">Kurs: â‚¬${fm(price)} Â· Markt: ${r.sh.toFixed(1)}%</div>${owned>0?`<div style="font-size:10px;color:var(--gn);">Besitzt: ${owned} Aktien</div>`:''}</div><button class="btn sm ${G.money>=price?'can':''}" onclick="buyRivalStock('${r.id}')">â‚¬${fm(price)}</button></div></div>`;
  }).join('');
}

function rZiele(){
  const pp = document.getElementById('prestige-pts-panel');
  if(pp) pp.innerHTML = `<div class="gcard-pu"><div class="sr"><span class="sl">Prestige-Punkte</span><span class="sv" style="color:var(--pu)">${G.prestigePts} PP</span></div><div class="sr"><span class="sl">Verwendbar fÃ¼r</span><span class="sv">Prestige-Upgrades</span></div><div style="font-size:10px;color:var(--dm);margin-top:5px;">PP werden durch Challenge-AbschlÃ¼sse gesammelt</div></div>`;
  const cl = document.getElementById('challenge-list');
  if(!cl) return;
  cl.innerHTML = G.challenges.map(ch => {
    const pct = Math.min(100, ch.progress || 0);
    return `<div class="${ch.done ? 'gcard-green' : 'glass'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:13px;font-weight:700;">${ch.done ? 'âœ“' : 'ðŸŽ¯'} ${ch.name}</span>
        <span class="badge ${ch.done ? 'bg' : 'bc'}">+â‚¬${fm(ch.r)}</span>
      </div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:5px;">${ch.desc}</div>
      <div class="pw"><div class="pb ${ch.done ? 'gr' : 'cy'}" style="width:${pct}%"></div></div>
      <div style="font-size:10px;color:var(--dm);margin-top:3px;">${pct.toFixed(0)}% abgeschlossen</div>
    </div>`;
  }).join('') + `<button class="btn cy-b" style="margin-top:8px;" onclick="holdPressConference()">ðŸŽ¤ Pressekonferenz halten${G.pressConfCD>0?' ('+G.pressConfCD+'s)':' â€” Rep +5'}</button>`;
}

function rPartner(){
  const cnt = document.getElementById('pt-cnt');
  const sav = document.getElementById('pt-save');
  if(cnt) cnt.textContent = G.partners.length;
  const dailySav = G.partners.length * 50000;
  if(sav) sav.textContent = 'â‚¬' + fm(dailySav);
  const pl = document.getElementById('partner-list');
  if(!pl) return;
  pl.innerHTML = PARTNER_DATA.map(p => {
    const active = G.partners.find(x => x.id === p.id);
    return `<div class="${active ? 'gcard-green' : 'glass'}">
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="font-size:24px;">${p.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;">${p.name}</div>
          <div style="font-size:11px;color:var(--gn);margin-top:2px;">âœ“ ${p.bonus}</div>
          <div style="font-size:10px;color:var(--dm);">Einmalig: â‚¬${fm(p.cost)}</div>
        </div>
        ${active ? '<span class="badge bg">AKTIV</span>' : `<button class="btn sm ${G.money>=p.cost?'can':''}" onclick="signPartner('${p.id}')">â‚¬${fm(p.cost)}</button>`}
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
    <button class="btn ${G.money>=G.labLevel*500000?'pu-b':''}" style="margin-top:8px;" onclick="upgradeLab()">ðŸ§ª Labor Level ${G.labLevel+1} â€” â‚¬${fm(G.labLevel*500000)}</button>
  </div>`;
  const tt = document.getElementById('tech-tree');
  if(tt) {
    const trees = [
      {name:'Antriebstechnik', nodes:['Turbo âœ“','V8 âœ“','Hybrid+','Wasserstoff','Feststoffakku']},
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
        <span style="font-size:20px;font-weight:700;color:var(--cy);">â‚¬${fm(adjustedPrice)}</span>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--t2);">Marge: <b style="color:var(--gn)">${margin}%</b></div>
          <div style="font-size:11px;color:var(--t2);">Nachfrage: <b style="color:${demandCol}">${demand}</b></div>
        </div>
      </div>
      <div class="pw"><div class="pb cy" style="width:${pm*50}%"></div></div>
      <div style="display:flex;gap:7px;margin-top:8px;">
        <button class="btn sm rd-b" onclick="setPriceMulti('${v.id}', -0.05)">â–¼ -5%</button>
        <button class="btn sm" style="flex:1;font-size:10px;">${Math.round(pm*100)}% Basispreis</button>
        <button class="btn sm can" onclick="setPriceMulti('${v.id}', +0.05)">â–² +5%</button>
      </div>
      <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;">
        ${Object.keys({aerodynamics:'Aero',materials:'Material',software:'OTA',branding:'Brand'}).map(k => {
          const done = G.vehicleUpgrades[v.id]?.[k];
          const costs = {aerodynamics:200000,materials:350000,software:150000,branding:400000};
          const labels = {aerodynamics:'ðŸ”µ Aero',materials:'ðŸª¨ Mat.',software:'ðŸ“¡ OTA',branding:'ðŸ’Ž Brand'};
          return `<button class="btn sm ${done?'mx':G.money>=costs[k]?'can':''}" onclick="buyVehicleUpgrade('${v.id}','${k}')" ${done?'disabled':''}>${done?'âœ“':labels[k]+' â‚¬'+fm(costs[k])}</button>`;
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
      <div style="font-size:12px;font-weight:700;margin-bottom:7px;">âš¡ RivalitÃ¤ts-Status</div>
      <div class="sr"><span class="sl">StÃ¤rkster Rivale</span><span class="sv" style="color:${topRival.cl}">${topRival.ic} ${topRival.n} (${topRival.sh.toFixed(1)}%)</span></div>
      <div class="sr"><span class="sl">Markttrend</span><span class="sv" style="color:${G.marketTrend==='bull'?'var(--gn)':G.marketTrend==='bear'?'var(--rd)':'var(--t2)'}">${G.marketTrend==='bull'?'ðŸ“ˆ Bullmarkt':G.marketTrend==='bear'?'ðŸ“‰ BÃ¤renmarkt':'ðŸ“Š Stabil'}</span></div>
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
        <button class="btn sm rd-b" onclick="launchCampaignVsRival('${r.id}')">âš¡ Kampagne â‚¬500k</button>
        <button class="btn sm pu-b" onclick="buyRivalStock('${r.id}')">ðŸ“ˆ Aktie kaufen</button>
      </div>
    </div>`).join('');
}

// â”€â”€â”€ EXTEND REDRAW â”€â”€â”€
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

// â”€â”€â”€ EXTEND RENDER ALL â”€â”€â”€
if(!window.renderAll) window.renderAll = renderAll;
const _v9OrigRenderAll = window.renderAll;
function v9RenderAll(){
  _v9OrigRenderAll();
  rNews(); rPortfolio(); rZiele(); rPartner(); rForschlab(); rFahrzeugmarkt(); rMitbewerber2();
}
window.renderAll = v9RenderAll;

// KPI animation removed â€” was causing reflow every 5s

// â”€â”€â”€ PARTICLE: auto-generate ambient particles â”€â”€â”€
setInterval(() => {
  if(G.lines.some(l => l.run) && Math.random() < 0.3) {
    spawnPtcls(Math.random() * window.innerWidth, window.innerHeight, Math.random() > 0.5 ? '#00d4ff' : '#00ff88', 1);
  }
}, 2000);

console.log('ðŸŽï¸ AUTO EMPIRE v9 â€” 25 neue Features geladen!');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUTO EMPIRE v10  â€”  25 NEUE REALISTISCHE FEATURES
//  + ADVANCED ANIMATION ENGINE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ MATRIX RAIN â”€â”€â”€
(function spawnMatrix(){
  const container=document.getElementById('matrix-container');
  if(!container)return;
  container.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
  for(let i=0;i<14;i++){
    const el=document.createElement('div');
    el.className='mat-digit';
    el.textContent=['0','1','â–ˆ','â–“','â—ˆ','âŠ•','â¬¡'][Math.floor(Math.random()*7)];
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

// â”€â”€â”€ KPI FLASH â”€â”€â”€
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

// â”€â”€â”€ CARD ENTRANCE OBSERVER â”€â”€â”€
const cardObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('card-enter');cardObs.unobserve(e.target);}});
},{threshold:.1});
setInterval(()=>{document.querySelectorAll('.card:not(.card-enter)').forEach(el=>cardObs.observe(el));},1500);

// â”€â”€â”€ EXTEND STATE v10 â”€â”€â”€
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

// â”€â”€â”€ DATA â”€â”€â”€
var JV_DATA=[
  {id:'jv_toyota',name:'JV mit TOYOTA',partner:'TOYOTA',cost:5000000,bonus:'Batterie -30%, Tech +5%'},
  {id:'jv_bosch',name:'JV BOSCH Electronics',partner:'BOSCH',cost:3000000,bonus:'Elektronik -25%, ADAS frei'},
  {id:'jv_basf',name:'JV BASF Materialien',partner:'BASF',cost:2000000,bonus:'Kunststoff -20%'},
  {id:'jv_panasonic',name:'JV Panasonic Cells',partner:'Panasonic',cost:4000000,bonus:'Batterie Lvl +3 gratis'},
];
var ACQ_TARGETS=[
  {id:'aq_startup',name:'EV-Startup "VoltX"',emoji:'âš¡',cost:8000000,benefit:'E-Tech Research +80%'},
  {id:'aq_design',name:'Design Studio "Form+"',emoji:'ðŸŽ¨',cost:3000000,benefit:'Brand +15, Design +3'},
  {id:'aq_battery',name:'BatteryCo Inc.',emoji:'ðŸ”‹',cost:12000000,benefit:'Batterie Kosten -40%'},
  {id:'aq_software',name:'AutoSoft GmbH',emoji:'ðŸ’»',cost:5000000,benefit:'OTA + L2 freigeschaltet'},
  {id:'aq_mfg',name:'Fertigungs-Spez. AG',emoji:'ðŸ­',cost:10000000,benefit:'Prod.-Kosten -15%'},
];

// â”€â”€â”€ MACRO ECONOMY â”€â”€â”€
function ecoTick(){
  G.ecoTimer--;
  if(G.ecoTimer>0)return;
  G.ecoTimer=180+Math.floor(Math.random()*120);
  const phases=['recession','recovery','expansion','boom'];
  if(Math.random()<.3){
    G.ecoPhase=phases[(phases.indexOf(G.ecoPhase)+1)%4];
    const msgs={recession:'Rezession: Nachfrage -15%',recovery:'Erholung: MÃ¤rkte stabilisieren',expansion:'Expansion: Nachfrage +10%',boom:'BOOM: Rekordnachfrage!'};
    addEv('ðŸ’° <span style="color:var(--go)">Konjunktur: '+G.ecoPhase+'</span> â€” '+msgs[G.ecoPhase]);
    notify('ðŸ’° Konjunktur: '+G.ecoPhase,G.ecoPhase==='recession'?'err':G.ecoPhase==='boom'?'ok':'info');
  }
  const pv={recession:{gdp:-1.2,rate:1.0,inf:.8,unemp:8.5},recovery:{gdp:1.5,rate:2.5,inf:1.8,unemp:6.0},expansion:{gdp:2.8,rate:3.5,inf:2.4,unemp:5.0},boom:{gdp:4.5,rate:5.0,inf:3.8,unemp:3.5}}[G.ecoPhase];
  G.gdpGrowth=pv.gdp+(Math.random()-.5)*.5;
  G.interestRate=pv.rate+(Math.random()-.5)*.3;
  G.inflation=pv.inf+(Math.random()-.5)*.4;
  G.unemployment=pv.unemp+(Math.random()-.5)*.8;
  if(G.ecoPhase==='boom')G.lines.forEach(l=>l.veh.pm=Math.min(2,(l.veh.pm||1)*1.015));
  if(G.ecoPhase==='recession')G.lines.forEach(l=>l.veh.pm=Math.max(.7,(l.veh.pm||1)*.985));
}

// â”€â”€â”€ USED CAR MARKET â”€â”€â”€
function usedCarTick(){
  G.usedCarTimer--;
  if(G.usedCarTimer>0)return;
  G.usedCarTimer=180;
  if(G.prod<50)return;
  const rev=G.prod*50*(1+G.brand/200);
  G.usedCarRevenue+=rev;G.money+=rev;G.rev+=rev;
  addEv('ðŸš— <span style="color:var(--t2)">Gebrauchtwagenmarkt</span>: +â‚¬'+fm(rev));
  floatMoney(rev,true);
  forceTabRefresh();
}

// â”€â”€â”€ AI ADVISORY â”€â”€â”€
function aiAdviceTick(){
  G.aiAdviceTimer--;
  if(G.aiAdviceTimer>0)return;
  G.aiAdviceTimer=90;
  const pool=[
    ()=>G.ads.size<2?'ðŸ’¡ Mehr Werbung schalten â†’ +'+Math.round(G.ads.size*3)+'% Verkauf':null,
    ()=>G.comp['quality']<3?'âš™ï¸ QualitÃ¤tskontrolle verbessern â€” Defektrate: '+G.defectRate.toFixed(1)+'%':null,
    ()=>G.share<5?'ðŸŒ Mehr Modelle produzieren â†’ Marktanteil +2% pro Modell':null,
    ()=>G.ecoPhase==='boom'?'ðŸ“ˆ BOOM! Jetzt Preise erhÃ¶hen â€” Markt trÃ¤gt +12%':null,
    ()=>G.ecoPhase==='recession'?'ðŸ“‰ Rezession: Kosten senken, QualitÃ¤t halten':null,
    ()=>G.loans.length>0&&G.money>2000000?'ðŸ¦ Kredittilgung mÃ¶glich â€” spart Zinsen':null,
    ()=>G.patents.length===0?'ðŸ“œ Forschung abschlieÃŸen â†’ automatisch Patente':null,
    ()=>G.esgScore<40?'ðŸŒ¿ ESG verbessern â†’ Zugang zu Subventionen':null,
  ];
  const valid=pool.map(fn=>fn()).filter(Boolean);
  if(valid.length>0){
    G.aiAdvice.unshift({text:valid[Math.floor(Math.random()*valid.length)],ts:G.y+'Q'+G.q});
    if(G.aiAdvice.length>8)G.aiAdvice.pop();
  }
}

// â”€â”€â”€ LIMITED EDITIONS â”€â”€â”€
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
  addEv('âœ¨ <span style="color:var(--go)">Limited: '+name+'</span> '+units+' StÃ¼ck â†’ +â‚¬'+fm(rev));
  notify('âœ¨ Limited Edition: '+name,'ok');
  floatMoney(rev,true);
  spawnPtcls(window.innerWidth/2,window.innerHeight*.4,'#ffaa00',25);
}

// â”€â”€â”€ CARBON CREDITS â”€â”€â”€
function carbonCreditTick(){
  const evOn=['id4','beetle','id_buzz'].filter(id=>G.vehs[id]?.on).length;
  if(evOn===0)return;
  G.carbonCredits=(G.carbonCredits||0)+evOn*.01;
  if(G.carbonCredits>=10){
    const val=Math.floor(G.carbonCredits)*5000;
    G.money+=val;G.rev+=val;
    G.carbonCredits-=Math.floor(G.carbonCredits);
    addEv('ðŸŒ¿ <span style="color:var(--gn)">Carbon Credits â†’ +â‚¬'+fm(val)+'</span>');
    floatMoney(val,true);
  }
}

// â”€â”€â”€ MARKET TREND â”€â”€â”€
function trendTick(){
  G.trendTimer--;
  if(G.trendTimer>0)return;
  G.trendTimer=120+Math.floor(Math.random()*120);
  const t=['bull','bear','stable','stable'];
  G.marketTrend=t[Math.floor(Math.random()*t.length)];
  if(G.marketTrend!=='stable'){
    const m={bull:'ðŸ“ˆ Bullenmarkt! Preise +8%',bear:'ðŸ“‰ BÃ¤renmarkt! Nachfrage -10%'};
    addEv('<span style="color:var(--go)">'+m[G.marketTrend]+'</span>');
    notify(m[G.marketTrend],G.marketTrend==='bull'?'ok':'warn');
  }
}

// â”€â”€â”€ DEFECT SYSTEM â”€â”€â”€
function defectTick(){
  G.defectRate=Math.max(.1,5-(G.comp['quality']||0)*.4-(G.rdone['aiq']?1:0)-(G.trainingLevel||0)*.3);
}

// â”€â”€â”€ ACTIONS â”€â”€â”€
function announceVehicle(vid){
  const v=VEHS.find(x=>x.id===vid);if(!v)return;
  if(G.announcements.includes(vid)){notify('Bereits angekÃ¼ndigt!','warn');return;}
  if(G.announceCooldown>0){notify('Cooldown: '+G.announceCooldown+'s','warn');return;}
  const bonus=Math.floor(v.price*(50+Math.floor(Math.random()*100)));
  G.money+=bonus;G.rev+=bonus;
  G.announcements.push(vid);G.announceCooldown=60;
  G.rep=Math.min(100,G.rep+5);G.brand=Math.min(100,G.brand+3);
  G.preorders[vid]=(G.preorders[vid]||0)+(50+Math.floor(Math.random()*100));
  addEv('ðŸ“¢ <span style="color:var(--go)">AnkÃ¼ndigung: '+v.e+' '+v.name+'</span> â€” '+G.preorders[vid]+' Vorbestellungen, +â‚¬'+fm(bonus));
  notify('AnkÃ¼ndigung: '+v.name,' ok');floatMoney(bonus,true);
  spawnPtcls(window.innerWidth/2,window.innerHeight*.3,'#ffaa00',20);
  forceTabRefresh();
}

function startFleetDeal(){
  if(G.fleetSales.active){notify('Flottenvertrag lÃ¤uft!','warn');return;}
  if(G.money<100000){notify('Setup: â‚¬100k','err');return;}
  G.money-=100000;G.fleetSales.active=true;
  const activeVehs=VEHS.filter(v=>G.vehs[v.id]?.on);
  const rev=activeVehs.reduce((s,v)=>s+v.price*.92*v.cap,0)*3;
  G.money+=rev;G.rev+=rev;
  addEv('ðŸš— <span style="color:var(--cy)">Flottenvertrag</span>: +â‚¬'+fm(rev));
  notify('Flottenvertrag! +â‚¬'+fm(rev),'ok');floatMoney(rev,true);
}

function doAcquisition(id){
  const t=ACQ_TARGETS.find(x=>x.id===id);if(!t)return;
  if(G.acquisitions.includes(id)){notify('Bereits akquiriert!','warn');return;}
  if(G.money<t.cost){notify('Brauche â‚¬'+fm(t.cost),'err');return;}
  G.money-=t.cost;G.acquisitions.push(id);G.maDealCount++;
  if(t.id==='aq_design'){G.brand=Math.min(100,G.brand+15);}
  if(t.id==='aq_software'){G.rdone['ota']=true;G.rdone['l2']=true;}
  if(t.id==='aq_mfg'){G.lines.forEach(l=>l.rate*=1.15);}
  addEv('ðŸ”€ <span style="color:var(--pu)">Akquisition: '+t.emoji+' '+t.name+'</span> â€” '+t.benefit);
  notify('Akquisition: '+t.name,'ok');
  showBurst('ðŸ”€ Deal!',t.name,t.benefit);
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#bb55ff',35);
  forceTabRefresh();
}

function doJV(id){
  const jv=JV_DATA.find(x=>x.id===id);if(!jv)return;
  if(G.jointVentures.includes(id)){notify('JV aktiv!','warn');return;}
  if(G.money<jv.cost){notify('Brauche â‚¬'+fm(jv.cost),'err');return;}
  G.money-=jv.cost;G.jointVentures.push(id);G.maDealCount++;
  addEv('ðŸ¤ <span style="color:var(--cy)">JV: '+jv.name+'</span> â€” '+jv.bonus);
  notify('JV mit '+jv.partner+'!','ok');
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#00d4ff',20);
  forceTabRefresh();
}

function startTraining(){
  if(G.money<200000){notify('â‚¬200k','err');return;}
  if(G.trainingTimer>0){notify('LÃ¤uft: '+G.trainingTimer+'s','warn');return;}
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
  if(G.money<o.cost){notify('â‚¬'+fm(o.cost),'err');return;}
  G.money-=o.cost;G.scOptimizations[type]=true;
  G.scHealth=Math.min(100,G.scHealth+15);G.scRisk=Math.max(0,G.scRisk-20);
  notify(o.name+' aktiv!','ok');
  addEv('â›“ï¸ <span style="color:var(--cy)">SC: '+o.name+'</span>');
  forceTabRefresh();
}

function doESGAction(type){
  const acts={
    solar:         {cost:500000,name:'â˜€ï¸ Solaranlage',     eB:15,co2:10},
    green_fleet:   {cost:300000,name:'ðŸš— GrÃ¼ne Flotte',    sB:10,rep:5},
    diversity:     {cost:200000,name:'ðŸ¤ Diversity-Prog.', sB:15,gB:10},
    transparency:  {cost:150000,name:'ðŸ“Š ESG-Reporting',   gB:20,rep:3},
    reforestation: {cost:400000,name:'ðŸŒ³ Aufforstung',     eB:20,co2:15},
  };
  const a=acts[type];if(!a)return;
  if(G.money<a.cost){notify('â‚¬'+fm(a.cost),'err');return;}
  G.money-=a.cost;
  if(a.eB)G.esgE=Math.min(100,G.esgE+a.eB);
  if(a.sB)G.esgS=Math.min(100,G.esgS+a.sB);
  if(a.gB)G.esgG=Math.min(100,G.esgG+a.gB);
  if(a.co2)G.co2Index=Math.max(20,G.co2Index-a.co2);
  if(a.rep)G.rep=Math.min(100,G.rep+a.rep);
  G.esgScore=Math.round((G.esgE+G.esgS+G.esgG)/3);
  G.carbonCredits=(G.carbonCredits||0)+(a.co2||0);
  notify(a.name+' gestartet!','ok');
  addEv('ðŸŒ± <span style="color:var(--gn)">ESG: '+a.name+'</span>');
  spawnPtcls(window.innerWidth/2,window.innerHeight*.5,'#00ff88',20);
  forceTabRefresh();
}

function launchIPO(){
  if(G.ipoStatus!=='private'){notify('Bereits bÃ¶rsennotiert!','warn');return;}
  if(G.share<10){notify('Brauche 10% Marktanteil','err');return;}
  if(G.rev<5000000){notify('Brauche â‚¬5 Mio. Umsatz','err');return;}
  const val=G.money*3+G.rev*2;
  G.ipoValue=val;G.money+=val*.1;G.ipoStatus='public';
  G.stockPrice=Math.max(G.stockPrice,val/10000000);
  addEv('ðŸš€ <span style="color:var(--go)">IPO! +â‚¬'+fm(val*.1)+'</span>');
  notify('IPO! +â‚¬'+fm(val*.1),'ok');
  showBurst('ðŸš€ IPO!','BÃ¶rsennotierg!','+â‚¬'+fm(val*.1));
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ffaa00',60);
  spawnPtcls(window.innerWidth*.3,window.innerHeight/2,'#00d4ff',30);
  spawnPtcls(window.innerWidth*.7,window.innerHeight/2,'#00ff88',30);
}

function holdInvestorMeeting(){
  if(G.investorTimer>0){notify('Meeting in '+G.investorTimer+'s','warn');return;}
  const bonus=Math.floor(G.rev*.05+G.share*10000);
  G.money+=bonus;G.investorTimer=240;G.rep=Math.min(100,G.rep+3);
  notify('Investoren-Meeting! +â‚¬'+fm(bonus),'ok');
  addEv('ðŸ’¼ <span style="color:var(--cy)">Investoren-Meeting</span>: +â‚¬'+fm(bonus));
  floatMoney(bonus,true);
}

function startRDCoop(partner){
  const c={fraunhofer:{name:'Fraunhofer Institut',cost:400000},mit:{name:'MIT Research',cost:500000},stanford:{name:'Stanford AI Lab',cost:600000}};
  const co=c[partner];if(!co)return;
  if((G.rdCoops||[]).includes(partner)){notify('LÃ¤uft bereits!','warn');return;}
  if(G.money<co.cost){notify('â‚¬'+fm(co.cost),'err');return;}
  G.money-=co.cost;
  if(!G.rdCoops)G.rdCoops=[];
  G.rdCoops.push(partner);
  notify('F&E Kooperation: '+co.name,'ok');
  addEv('ðŸ”¬ <span style="color:var(--pu)">F&E Koop: '+co.name+'</span>');
}

function buyRecallInsurance(){
  if(G.recallInsurance){notify('Bereits versichert!','warn');return;}
  if(G.money<300000){notify('â‚¬300k','err');return;}
  G.money-=300000;G.recallInsurance=true;
  notify('RÃ¼ckrufversicherung aktiv!','ok');
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
  if(G.money<c){notify('â‚¬'+fm(c),'err');return;}
  G.money-=c;G.vehicleUpgrades[vid][type]=true;
  if(type==='branding'){const l=G.lines.find(x=>x.veh.id===vid);if(l)l.veh.pm=(l.veh.pm||1)*1.12;}
  notify('Upgrade: '+type+' auf '+vid,'ok');
  addEv('ðŸš— <span style="color:var(--gn)">Upgrade: '+type+'</span> fÃ¼r '+vid);
}

function buyRivalStock(rid){
  const r=RIVALS.find(x=>x.id===rid);if(!r)return;
  const price=Math.floor(r.ca/1000000);
  if(G.money<price){notify('Zu wenig Kapital!','err');return;}
  G.money-=price;
  if(!G.rivalStocks)G.rivalStocks={};
  if(!G.rivalStocks[rid])G.rivalStocks[rid]={n:0,avgPrice:price,currentPrice:price};
  G.rivalStocks[rid].n++;
  notify(r.n+' Aktie @â‚¬'+fm(price),'ok');
}

function launchCampaignVsRival(rid){
  if(G.money<500000){notify('â‚¬500k','err');return;}
  const r=RIVALS.find(x=>x.id===rid);if(!r)return;
  G.money-=500000;
  const stolen=1+Math.random()*1.5;
  r.sh=Math.max(2,r.sh-stolen);
  G.share=Math.min(45,G.share+stolen*.3);
  if(!G.rivalActions)G.rivalActions=0;
  G.rivalActions++;
  notify('Kampagne gegen '+r.n+'! -'+stolen.toFixed(1)+'%','ok');
  addEv('âš¡ <span style="color:var(--gn)">Kampagne vs '+r.ic+' '+r.n+'</span> â€” '+stolen.toFixed(1)+'% gestohlen');
  spawnPtcls(window.innerWidth/2,window.innerHeight/2,'#ff3355',25);
}

function holdPressConference(){
  if(G.pressConfCD>0){notify('Cooldown: '+G.pressConfCD+'s','warn');return;}
  const bonus=Math.floor(G.rep*1000+G.share*5000);
  G.money+=bonus;G.rep=Math.min(100,G.rep+5);G.brand=Math.min(100,G.brand+3);
  G.pressConfCD=180;
  addEv('ðŸŽ¤ <span style="color:var(--cy)">Pressekonferenz</span> â€” Rep +5, +â‚¬'+fm(bonus));
  notify('Pressekonferenz! +â‚¬'+fm(bonus),'ok');
  floatMoney(bonus,true);
  spawnPtcls(window.innerWidth/2,window.innerHeight*.3,'#00d4ff',20);
}

// â”€â”€â”€ EXTEND TICK v10 â”€â”€â”€
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

// â”€â”€â”€ RENDER NEW VIEWS â”€â”€â”€
function rWirtschaft(){
  const phC={recession:'var(--rd)',recovery:'var(--go)',expansion:'var(--cy)',boom:'var(--gn)'};
  const phE={recession:'ðŸ“‰',recovery:'ðŸ“Š',expansion:'ðŸ“ˆ',boom:'ðŸš€'};
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
    ${G.limitedEditions&&G.limitedEditions.length?G.limitedEditions.slice(0,4).map(le=>`<div class="gcard-gold" style="margin-bottom:5px;"><b style="color:var(--go)">âœ¨ ${le.name}</b><div style="font-size:10px;color:var(--t2);">${le.units} StÃ¼ck Â· +${le.prem-100}% Â· â‚¬${fm(le.rev)} Â· ${le.ts}</div></div>`).join(''):'<div style="color:var(--dm);font-size:11px;padding:6px;">Erscheint automatisch ~alle 4 Min.</div>'}`;
  const ec=document.getElementById('eco-cycle');
  if(ec)ec.innerHTML='<button class="btn go-b" onclick="holdPressConference()">ðŸŽ¤ Pressekonferenz'+(G.pressConfCD>0?' ('+G.pressConfCD+'s)':' â€” Rep+5, Kapitalbonus')+'</button><button class="btn cy-b" style="margin-top:7px;" onclick="holdInvestorMeeting()">ðŸ’¼ Investoren-Meeting'+(G.investorTimer>0?' ('+G.investorTimer+'s)':'')+'</button><button class="btn pu-b" style="margin-top:7px;" onclick="launchIPO()">ðŸš€ IPO '+(G.ipoStatus==='public'?'âœ“ BÃ¶rsennotiert':'â€” mind. 10% Markt')+'</button>';
}

function rAnkuendigungen(){
  const aa=document.getElementById('announce-active');
  if(aa)aa.innerHTML=G.announcements.length?G.announcements.map(vid=>{const v=VEHS.find(x=>x.id===vid);return v?`<div class="gcard-gold"><b style="color:var(--go)">${v.e} ${v.name} â€” ANGEKÃœNDIGT</b><div style="font-size:11px;color:var(--t2);">${G.preorders[vid]||0} Vorbestellungen</div></div>`:''}).join(''):'<div style="color:var(--dm);font-size:12px;padding:8px;">Noch keine AnkÃ¼ndigungen</div>';
  const al=document.getElementById('announce-list');if(!al)return;
  const notAnn=VEHS.filter(v=>!G.announcements.includes(v.id));
  if(notAnn.length===0){al.innerHTML='<div style="color:var(--dm);font-size:12px;padding:8px;">Alle angekÃ¼ndigt!</div>';return;}
  al.innerHTML=notAnn.map(v=>`<div class="glass"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:26px;">${v.e}</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${v.name}</div><div style="font-size:10px;color:var(--t2);">â‚¬${fm(v.price)} Â· ${v.seg}</div></div><button class="btn sm go-b" onclick="announceVehicle('${v.id}')" ${G.announceCooldown>0?'disabled':''}>ðŸ“¢ ${G.announceCooldown>0?G.announceCooldown+'s':'AnkÃ¼ndigen'}</button></div></div>`).join('');
}

function rFusion2(){
  const mc=document.getElementById('ma-deals');const mv=document.getElementById('ma-val');
  if(mc)mc.textContent=G.maDealCount||0;
  if(mv)mv.textContent='â‚¬'+fm((G.acquisitions.length*3e6)+(G.jointVentures.length*1.5e6));
  const al=document.getElementById('acquisition-list');
  if(al)al.innerHTML=ACQ_TARGETS.map(t=>{const done=G.acquisitions.includes(t.id);return `<div class="${done?'gcard-green':'glass'}"><div style="display:flex;gap:10px;align-items:center;"><div style="font-size:22px;">${t.emoji}</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${t.name}</div><div style="font-size:11px;color:var(--gn);">${t.benefit}</div><div style="font-size:10px;color:var(--dm);">â‚¬${fm(t.cost)}</div></div>${done?'<span class="badge bg">âœ“</span>':`<button class="btn sm ${G.money>=t.cost?'pu-b':''}" onclick="doAcquisition('${t.id}')">Kaufen</button>`}</div></div>`;}).join('');
  const jl=document.getElementById('jv-list');
  if(jl)jl.innerHTML=JV_DATA.map(jv=>{const done=G.jointVentures.includes(jv.id);return `<div class="${done?'gcard-cyan':'glass'}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">${jv.name}</span>${done?'<span class="badge bc">AKTIV</span>':`<span style="color:var(--go)">â‚¬${fm(jv.cost)}</span>`}</div><div style="font-size:11px;color:var(--gn);">${jv.bonus}</div>${done?'':`<button class="btn sm cy-b" style="margin-top:6px;" onclick="doJV('${jv.id}')">JV starten</button>`}</div>`;}).join('');
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
    <div class="sr"><span class="sl">GebrauchtwagenerlÃ¶se</span><span class="sv" style="color:var(--gn)">â‚¬${fm(G.usedCarRevenue||0)}</span></div>
    <div class="sr"><span class="sl">Carbon Credits</span><span class="sv" style="color:var(--gn)">${(G.carbonCredits||0).toFixed(1)}</span></div>
    <div class="sr"><span class="sl">Training Level</span><span class="sv">${G.trainingLevel||0}${G.trainingTimer>0?' (lÃ¤uft '+G.trainingTimer+'s)':''}</span></div>
    <div class="sr"><span class="sl">RÃ¼ckrufversicherung</span><span class="sv" style="color:${G.recallInsurance?'var(--gn)':'var(--rd)'}">${G.recallInsurance?'âœ“ Aktiv':'âœ— Keine'}</span></div>
    <div class="sr"><span class="sl">Flottenvertrag</span><span class="sv" style="color:${G.fleetSales.active?'var(--gn)':'var(--dm)'}">${G.fleetSales.active?'âœ“ Aktiv':'Nicht aktiv'}</span></div>
  </div>`;
  const sa=document.getElementById('sc-actions');
  if(sa)sa.innerHTML=[{type:'diversify',name:'Lieferanten diversifizieren',cost:300000,desc:'SC Risk -20%, Health +15%'},{type:'buffer',name:'Pufferlagerhaltung',cost:400000,desc:'Health stabil, Embargo-Schutz'},{type:'jit',name:'JIT Optimierung',cost:200000,desc:'Lagerkosten -30%'}].map(o=>{const done=G.scOptimizations[o.type];return `<div class="${done?'gcard-green':'glass'}" style="margin-bottom:6px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;">${o.name}</div><div style="font-size:10px;color:var(--t2);">${o.desc}</div></div>${done?'<span class="badge bg">âœ“</span>':`<button class="btn sm ${G.money>=o.cost?'can':''}" onclick="optimizeSC('${o.type}')">â‚¬${fm(o.cost)}</button>`}</div></div>`;}).join('')+
  `<button class="btn go-b" style="margin-top:8px;" onclick="startTraining()">ðŸŽ“ Ausbildung ${G.trainingTimer>0?'lÃ¤uft '+G.trainingTimer+'s':'â€” â‚¬200k'}</button>
   <button class="btn cy-b" style="margin-top:6px;" onclick="startFleetDeal()">ðŸš— Flottenvertrag ${G.fleetSales.active?'(AKTIV)':'â€” â‚¬100k'}</button>
   <button class="btn ${G.recallInsurance?'mx':'rd-b'}" style="margin-top:6px;" onclick="buyRecallInsurance()" ${G.recallInsurance?'disabled':''}>ðŸ›¡ï¸ RÃ¼ckrufversicherung ${G.recallInsurance?'(AKTIV)':'â€” â‚¬300k'}</button>`;
}

function rNachhaltigkeit(){
  G.esgScore=Math.round(((G.esgE||40)+(G.esgS||55)+(G.esgG||60))/3);
  const et=document.getElementById('esg-total');const er=document.getElementById('esg-rank');
  if(et){et.textContent=G.esgScore;et.style.color=G.esgScore>70?'var(--gn)':G.esgScore>40?'var(--go)':'var(--rd)';}
  const rating=G.esgScore>80?'AAA':G.esgScore>70?'AA':G.esgScore>60?'A':G.esgScore>50?'BBB':G.esgScore>40?'BB':'B';
  if(er){er.textContent=rating;er.style.color=G.esgScore>70?'var(--gn)':G.esgScore>50?'var(--go)':'var(--rd)';}
  const eb=document.getElementById('esg-breakdown');
  if(eb)eb.innerHTML=`<div class="glass">
    <div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:var(--gn)">ðŸŒ¿ Environmental</span><span style="font-weight:700;color:var(--gn)">${G.esgE||40}%</span></div><div class="pw"><div class="pb gr" style="width:${G.esgE||40}%"></div></div></div>
    <div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:var(--cy)">ðŸ‘¥ Social</span><span style="font-weight:700;color:var(--cy)">${G.esgS||55}%</span></div><div class="pw"><div class="pb cy" style="width:${G.esgS||55}%"></div></div></div>
    <div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:var(--pu)">ðŸ›ï¸ Governance</span><span style="font-weight:700;color:var(--pu)">${G.esgG||60}%</span></div><div class="pw"><div class="pb pu" style="width:${G.esgG||60}%"></div></div></div>
    <div style="margin-top:8px;" class="sr"><span class="sl">Carbon Credits</span><span class="sv" style="color:var(--gn)">${(G.carbonCredits||0).toFixed(1)} (â‚¬${fm((G.carbonCredits||0)*5000)})</span></div>
    <div class="sr"><span class="sl">CO2-Ziel â‰¤80</span><span class="sv" style="color:${G.sustainGoals?.achieved?'var(--gn)':'var(--dm)'}">${G.sustainGoals?.achieved?'âœ“ ERREICHT':'CO2: '+G.co2Index.toFixed(0)}</span></div>
  </div>`;
  const ea=document.getElementById('esg-actions');
  if(ea)ea.innerHTML=[
    {t:'solar',n:'â˜€ï¸ Solaranlage',c:500000,d:'E +15, CO2 -10'},
    {t:'green_fleet',n:'ðŸš— GrÃ¼ne Flotte',c:300000,d:'S +10, Rep +5'},
    {t:'diversity',n:'ðŸ¤ Diversity',c:200000,d:'S +15, G +10'},
    {t:'transparency',n:'ðŸ“Š ESG-Report',c:150000,d:'G +20, Rep +3'},
    {t:'reforestation',n:'ðŸŒ³ Aufforstung',c:400000,d:'E +20, CO2 -15'},
  ].map(a=>`<div class="glass" style="margin-bottom:5px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:700;">${a.n}</div><div style="font-size:10px;color:var(--gn);">${a.d}</div></div><button class="btn sm ${G.money>=a.c?'can':''}" onclick="doESGAction('${a.t}')">â‚¬${fm(a.c)}</button></div></div>`).join('')+
  `<div class="sh">F&E KOOPERATIONEN</div>
  ${[{id:'fraunhofer',n:'Fraunhofer Institut',c:400000},{id:'mit',n:'MIT Research',c:500000},{id:'stanford',n:'Stanford AI Lab',c:600000}].map(co=>`<div class="glass" style="margin-bottom:5px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;font-weight:700;">ðŸ”¬ ${co.n}</span>${(G.rdCoops||[]).includes(co.id)?'<span class="badge bg">AKTIV</span>':`<button class="btn sm ${G.money>=co.c?'pu-b':''}" onclick="startRDCoop('${co.id}')">â‚¬${fm(co.c)}</button>`}</div></div>`).join('')}`;
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
          <div style="background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.15);border-radius:7px;padding:6px;text-align:center;"><div style="font-size:12px;font-weight:700;color:var(--gn)">â‚¬${fm(profit)}</div><div style="font-size:8px;color:var(--dm)">GESAMT-PROFIT</div></div>
          <div style="background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:7px;padding:6px;text-align:center;"><div style="font-size:12px;font-weight:700;color:var(--cy)">${preord}</div><div style="font-size:8px;color:var(--dm)">VORBESTELLUNGEN</div></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:${sm>1?'var(--gn)':sm<1?'var(--rd)':'var(--dm)'};">${sm>1?'â–² Saisonbonus +'+Math.round((sm-1)*100)+'%':sm<1?'â–¼ SaisonschwÃ¤che -'+Math.round((1-sm)*100)+'%':'Normale Nachfrage'}</div>
      </div>`;
    }).join('');
  }
  const ar=document.getElementById('absatz-regions');
  if(ar)ar.innerHTML=Object.entries(G.regions).filter(([k,v])=>v.unlocked).map(([k,r])=>`<div class="glass" style="display:flex;gap:10px;align-items:center;margin-bottom:6px;"><div style="font-size:20px;">${r.flag}</div><div style="flex:1;"><div style="font-size:12px;font-weight:700;">${r.name}</div><div class="pw" style="margin-top:4px;"><div class="pb cy" style="width:${Math.min(100,r.dealers*12)}%"></div></div></div><div style="text-align:right;font-size:12px;font-weight:700;color:var(--cy)">â‚¬${fm(Math.floor(dailyRev()*r.demand/5))}<div style="font-size:9px;color:var(--dm)">est./Tag</div></div></div>`).join('');
  const af=document.getElementById('absatz-forecast');
  if(af){
    const t=G.marketTrend==='bull'?1.1:G.marketTrend==='bear'?.9:1;
    const eco=G.ecoPhase==='boom'?1.12:G.ecoPhase==='recession'?.85:1;
    const factor=t*eco;
    af.innerHTML=`<div class="gcard-cyan">
      <div class="sr"><span class="sl">Prognose nÃ¤chste Woche</span><span class="sv" style="color:${factor>1?'var(--gn)':'var(--rd)'}">â‚¬${fm(dailyRev()*7*factor)}</span></div>
      <div class="sr"><span class="sl">Prognose nÃ¤chster Monat</span><span class="sv" style="color:${factor>1?'var(--gn)':'var(--rd)'}">â‚¬${fm(dailyRev()*30*factor)}</span></div>
      <div class="sr"><span class="sl">Markttrend</span><span class="sv">${G.marketTrend} Ã—${t}</span></div>
      <div class="sr"><span class="sl">Konjunktur</span><span class="sv">${G.ecoPhase} Ã—${eco}</span></div>
    </div>`;
  }
}

// â”€â”€â”€ EXTEND REDRAW â”€â”€â”€
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

// â”€â”€â”€ RENDER ALL â”€â”€â”€
const _v10RenderAll=window.renderAll;
function v10RenderAll(){
  _v10RenderAll();
  rWirtschaft();rAnkuendigungen();rFusion2();rLieferkette();rNachhaltigkeit();rAbsatz();
}
window.renderAll=v10RenderAll;

// â”€â”€â”€ SMOOTH HEADER STATS â”€â”€â”€
// Header stats handled by updateHeader() in redrawLoop â€” no separate interval needed

// â”€â”€â”€ INIT v10 â”€â”€â”€
setTimeout(()=>{
  // Fahrzeugmarkt und RivalitÃ¤t views aus v9 rendern wenn vorhanden
  if(typeof rFahrzeugmarkt==='function')rFahrzeugmarkt();
  if(typeof rMitbewerber2==='function')rMitbewerber2();
  if(typeof rNews==='function')rNews();
},600);

console.log('ðŸŽï¸ AUTO EMPIRE v10 â€” Animationen & 25 neue Features geladen!');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  COMPANY SELECTION SYSTEM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const COMPANIES = [
  {
    id:'volkswagen', name:'VOLKSWAGEN',  flag:'ðŸ‡©ðŸ‡ª',icon:'ðŸš—', country:'Wolfsburg, Deutschland',
    color:'#1C6DC4', tag:'Volksauto',
    startMoney:500000, startBrand:50, startRep:55,
    startComp:{eng_base:1, body_st:1, chassis:1},
    bonus:'GÃ¼nstige Produktion (-10% Kosten)\nBreites Modellprogramm',
    bonusEffect:'prodCost', bonusVal:.9,
    stats:{start:'â‚¬500k', markt:'6%', spez:'Volumen', diff:2},
    desc:'Der Volkskonzern. StÃ¤rke durch Vielfalt â€” gÃ¼nstige Produktion und breites Modellspektrum.',
    lore:'GegrÃ¼ndet 1937, heute Wolfsburg. Das Auto fÃ¼r das Volk.',
  },
  {
    id:'bmw', name:'BMW GROUP',  flag:'ðŸ‡©ðŸ‡ª',icon:'ðŸ”µ', country:'MÃ¼nchen, Deutschland',
    color:'#1C69D4', tag:'Premium',
    startMoney:600000, startBrand:70, startRep:70,
    startComp:{eng_v6:1, body_alu:1, chassis:1, susp_sp:1},
    bonus:'Premium-Aufpreis +15% auf alle Preise\nHÃ¶here Kundenakzeptanz',
    bonusEffect:'premiumBonus', bonusVal:1.15,
    stats:{start:'â‚¬600k', markt:'5%', spez:'Premium', diff:3},
    desc:'Freude am Fahren. BMW steht fÃ¼r Fahrdynamik und Premium-QualitÃ¤t. HÃ¶here Preise, anspruchsvolle KÃ¤ufer.',
    lore:'Bayerische Motoren Werke. Seit 1916.',
  },
  {
    id:'mercedes', name:'MERCEDES-BENZ',  flag:'ðŸ‡©ðŸ‡ª',icon:'â­', country:'Stuttgart, Deutschland',
    color:'#CCCCCC', tag:'Luxus',
    startMoney:700000, startBrand:80, startRep:75,
    startComp:{eng_v6:1, body_alu:1, int_lux:1, chassis:1},
    bonus:'Luxus-Modelle: +20% Verkaufspreis\nESG-Bonus: +15 Startpunkte',
    bonusEffect:'luxuryBonus', bonusVal:1.20,
    stats:{start:'â‚¬700k', markt:'4%', spez:'Luxus', diff:3},
    desc:'Das Beste oder nichts. Mercedes startet mit Luxus-Ausstattung und hÃ¶chstem Markenimage.',
    lore:'Erfinder des Automobils, 1886.',
  },
  {
    id:'toyota', name:'TOYOTA',  flag:'ðŸ‡¯ðŸ‡µ',icon:'ðŸ”´', country:'Toyota City, Japan',
    color:'#E62333', tag:'ZuverlÃ¤ssigkeit',
    startMoney:550000, startBrand:65, startRep:72,
    startComp:{eng_base:2, body_st:2, quality:1, chassis:1},
    bonus:'QualitÃ¤t +20%, RÃ¼ckruf-Risiko halbiert\nKaizen: F&E 15% schneller',
    bonusEffect:'qualityBonus', bonusVal:1.2,
    stats:{start:'â‚¬550k', markt:'7%', spez:'QualitÃ¤t', diff:2},
    desc:'Kaizen â€” kontinuierliche Verbesserung. Toyota startet mit maximaler QualitÃ¤t und minimalem RÃ¼ckrufrisiko.',
    lore:'GegrÃ¼ndet 1937, grÃ¶ÃŸter Automobilhersteller der Welt.',
  },
  {
    id:'tesla', name:'TESLA',  flag:'ðŸ‡ºðŸ‡¸',icon:'âš¡', country:'Austin, Texas USA',
    color:'#CC0000', tag:'Elektro-Pionier',
    startMoney:800000, startBrand:85, startRep:68,
    startComp:{eng_elec:1, battery:1, body_alu:1, adas:1},
    bonus:'E-Fahrzeuge: Produktion +30% schneller\nOTA Updates freigeschaltet',
    bonusEffect:'evBonus', bonusVal:1.30,
    stats:{start:'â‚¬800k', markt:'3%', spez:'E-MobilitÃ¤t', diff:4},
    desc:'Die Zukunft ist elektrisch. Tesla startet mit maximaler E-Technologie â€” aber der Markt ist noch klein.',
    lore:'GegrÃ¼ndet 2003, revolutionierte die Automobilindustrie.',
  },
  {
    id:'ford', name:'FORD',  flag:'ðŸ‡ºðŸ‡¸',icon:'ðŸ”·', country:'Detroit, Michigan USA',
    color:'#003478', tag:'Americana',
    startMoney:450000, startBrand:55, startRep:60,
    startComp:{eng_base:2, body_st:2, chassis:2, assembly:1},
    bonus:'Montageband Level 1 gratis\n3-Schicht: +25% Startoutput',
    bonusEffect:'assemblyBonus', bonusVal:1.25,
    stats:{start:'â‚¬450k', markt:'8%', spez:'Volumen', diff:1},
    desc:'Das Original. Ford startet mit starker FertigungskapazitÃ¤t und gÃ¼nstigem Einstieg â€” ideal fÃ¼r Einsteiger.',
    lore:'Henry Ford, 1903 â€” Erfinder der FlieÃŸbandfertigung.',
  },
  {
    id:'renault', name:'RENAULT',  flag:'ðŸ‡«ðŸ‡·',icon:'ðŸ’›', country:'Paris, Frankreich',
    color:'#FFCC00', tag:'Innovation',
    startMoney:480000, startBrand:52, startRep:58,
    startComp:{eng_base:1, body_st:1, eng_elec:1, chassis:1},
    bonus:'E-Zugang: eng_elec unlocked\nEU-FÃ¶rderungen +â‚¬100k',
    bonusEffect:'euBonus', bonusVal:1.0,
    stats:{start:'â‚¬480k', markt:'5%', spez:'Innovation', diff:2},
    desc:'Renault war E-Pionier in Europa. Startet mit hybridem Portfolio â€” Benziner UND Elektro von Beginn.',
    lore:'GegrÃ¼ndet 1899, Ã¤ltester Hersteller im Spiel.',
  },
  {
    id:'hyundai', name:'HYUNDAI-KIA',  flag:'ðŸ‡°ðŸ‡·',icon:'ðŸ”¶', country:'Seoul, SÃ¼dkorea',
    color:'#0057A8', tag:'Aufsteiger',
    startMoney:520000, startBrand:60, startRep:64,
    startComp:{eng_base:1, body_st:1, chassis:1, infotn:1},
    bonus:'Infotainment bereits Lvl 1\nMarktanteil +30% schneller',
    bonusEffect:'growthBonus', bonusVal:1.30,
    stats:{start:'â‚¬520k', markt:'6%', spez:'Wachstum', diff:2},
    desc:'Die koreanische Herausforderung. Hyundai-Kia wÃ¤chst am schnellsten und hat besten Technologie-Einstieg.',
    lore:'GegrÃ¼ndet 1967, heute Nr. 3 weltweit.',
  },
];

alert('Multiplayer v3 lädt...');let selectedCompany = null;

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
        <div class="cs-stat"><div class="cs-sv">${co.stats.spez}</div><div class="cs-sl">StÃ¤rke</div></div>
        <div class="cs-stat"><div class="cs-sv">${'â˜…'.repeat(co.stats.diff)+'â˜†'.repeat(5-co.stats.diff)}</div><div class="cs-sl">Schwierigk.</div></div>
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
  addEv('ðŸš€ <span style="color:' + co.color + '">' + co.icon + ' ' + co.name + '</span> gegrÃ¼ndet! ' + co.tag + ' â€” Startkapital: â‚¬' + fm(co.startMoney));
  notify('Willkommen bei ' + co.name + '! StÃ¤rke: ' + co.tag, 'ok');
  // Hide company screen and start fresh (intervals already running from init())
  // Big particle burst
  spawnPtcls(window.innerWidth*.3, window.innerHeight/2, co.color, 40);
  spawnPtcls(window.innerWidth*.7, window.innerHeight/2, '#ffaa00', 30);
  spawnPtcls(window.innerWidth/2, window.innerHeight*.3, '#00ff88', 25);
  showBurst(co.icon + ' ' + co.name, co.tag, 'â‚¬' + fm(co.startMoney) + ' Startkapital');
  // Render with company-aware bonuses, then initialize sub-navigation
  setTimeout(() => {
    renderAll();
    var firstNc = document.querySelector('.nc');
    if(firstNc && typeof window.setNavCat === 'function') window.setNavCat('zentrale', firstNc);
  }, 200);
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
document.addEventListener('DOMContentLoaded', () => {
  const hasSave = localStorage.getItem('ae_v8_save');
  const screen = document.getElementById('company-select');
  if(!screen) return;
  if(hasSave){
    // Have a save â€” hide company select, init() will load it
    screen.style.display = 'none';
    // Initialize sub-navigation so buttons are visible immediately
    var firstNc = document.querySelector('.nc');
    if(firstNc && typeof window.setNavCat === 'function') window.setNavCat('zentrale', firstNc);
  } else {
    // No save â€” show company select
    if(typeof buildCompanySelection === 'function') buildCompanySelection();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUTO EMPIRE v11  â€”  ECHTER WELTMARKT + STORY + 40 MISSIONEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ WELTMARKT ENGINE â”€â”€â”€
// Simuliert echte Marktdynamik: Ã–lpreis, Wechselkurse, Rohstoffe,
// geopolitische Events und Branchentrends mit realistischen Kausalketten

var WM = {
  oil: 85,          // $/Barrel â€” beeinflusst Energiekosten
  eurUsd: 1.08,     // EUR/USD â€” beeinflusst Export-ErlÃ¶se
  steelTon: 680,    // $/Tonne â€” direkt Stahl-Kosten
  aluTon: 2400,     // $/Tonne â€” direkt Alu-Kosten
  chipIdx: 100,     // Chip-VerfÃ¼gbarkeit Index (100=normal)
  evDemandIdx: 100, // EV-Markt-Nachfrage Index
  globalDemand: 100,// Gesamt-Nachfrage Index
  interestFed: 5.0, // US-Leitzins
  interestEcb: 4.0, // EU-Leitzins
  inflation: 2.8,
  // Historien fÃ¼r Charts
  oilHist: [85,84,86,83,87,85,88,86,84,85],
  eurHist: [1.08,1.09,1.07,1.08,1.09,1.07,1.08,1.09,1.08,1.07],
  evHist:  [100,102,105,103,108,110,109,112,115,113],
  // Geopolitik
  geoRisk: 20,      // 0-100 Geopolitisches Risiko
  tradeBarriers: 0, // Handelsbarrieren %
  // Aktive Weltmarkt-Events
  activeWmEvent: null,
  wmEventTimer: 120,
};

// Weltmarkt-Events Pool â€” realistisch und mit echten Kausalketten
var WM_EVENTS = [
  {
    id:'opec_cut', name:'OPEC+ FÃ¶rdermengensenkung',
    emoji:'ðŸ›¢ï¸', category:'Energie',
    desc:'OPEC+-LÃ¤nder reduzieren FÃ¶rderung um 1 Mio. Barrel/Tag â€” Ã–lpreisanstieg erwartet.',
    effect: ()=>{ WM.oil = Math.min(140, WM.oil * 1.18); G.commMult.energy = Math.min(2, G.commMult.energy * 1.15); },
    undoEffect: ()=>{ WM.oil *= 0.95; G.commMult.energy *= 0.95; },
    gameImpact: 'Energiekosten +15%, Benziner-Nachfrage -8%, E-Autos +12%',
    dur: 90, type:'crisis',
  },
  {
    id:'fed_hike', name:'FED erhÃ¶ht Leitzins auf 5.75%',
    emoji:'ðŸ¦', category:'Finanzen',
    desc:'US-Notenbank hebt Leitzins an â€” Kredit wird teurer, Konsumausgaben sinken.',
    effect: ()=>{ WM.interestFed = 5.75; WM.globalDemand = Math.max(70, WM.globalDemand - 8); G.interestRate = Math.min(7, G.interestRate + 0.5); },
    undoEffect: ()=>{ WM.globalDemand += 4; },
    gameImpact: 'Kreditkosten +0.5%, Nachfrage -8%, AktienmÃ¤rkte -5%',
    dur: 120, type:'crisis',
  },
  {
    id:'ev_subsidy_eu', name:'EU beschlieÃŸt â‚¬3.000 E-Auto-PrÃ¤mie',
    emoji:'âš¡', category:'Politik',
    desc:'EuropÃ¤ischer Rat verabschiedet neue KaufprÃ¤mie fÃ¼r Elektrofahrzeuge bis 2030.',
    effect: ()=>{ WM.evDemandIdx = Math.min(180, WM.evDemandIdx + 25); G.evSubsidyActive = true; G.evSubsidyTimer = 300; G.money += 200000; },
    undoEffect: ()=>{ WM.evDemandIdx -= 10; },
    gameImpact: 'E-Auto-Nachfrage +25%, â‚¬200k FÃ¶rderung sofort',
    dur: 180, type:'good',
  },
  {
    id:'chip_shortage', name:'TSMC Werk-Brand in Taiwan',
    emoji:'ðŸ’»', category:'Lieferkette',
    desc:'Feuer in Taiwans grÃ¶ÃŸter Chipfabrik â€” weltweite Halbleiter-Lieferkrise.',
    effect: ()=>{ WM.chipIdx = Math.max(40, WM.chipIdx - 40); G.res.elec.v = Math.floor(G.res.elec.v * 0.4); G.commMult.energy *= 1.1; },
    undoEffect: ()=>{ WM.chipIdx = Math.min(100, WM.chipIdx + 15); },
    gameImpact: 'Elektronik -60%, Chip-VerfÃ¼gbarkeit kritisch, E-Produktion gestÃ¶rt',
    dur: 150, type:'crisis',
  },
  {
    id:'china_lockdown', name:'China verhÃ¤ngt Industriestillstand',
    emoji:'ðŸ‡¨ðŸ‡³', category:'Geopolitik',
    desc:'Peking ordnet temporÃ¤ren Produktionsstopp fÃ¼r Industriebetriebe an.',
    effect: ()=>{ WM.aluTon *= 1.25; WM.steelTon *= 1.20; WM.geoRisk = Math.min(100, WM.geoRisk + 20); G.commMult.aluminum = Math.min(2.5, G.commMult.aluminum * 1.2); G.commMult.steel = Math.min(2.5, G.commMult.steel * 1.15); },
    undoEffect: ()=>{ WM.aluTon *= 0.9; WM.steelTon *= 0.92; G.commMult.aluminum *= 0.93; G.commMult.steel *= 0.95; },
    gameImpact: 'Aluminium +25%, Stahl +20%, China-Markt geschlossen',
    dur: 120, type:'crisis',
  },
  {
    id:'steel_boom', name:'Infrastruktur-Boom in Indien',
    emoji:'ðŸ—ï¸', category:'Rohstoffe',
    desc:'Indiens Megaprojekte treiben globale Stahl-Nachfrage auf Rekordhoch.',
    effect: ()=>{ WM.steelTon *= 1.30; G.commMult.steel = Math.min(2.5, G.commMult.steel * 1.20); },
    undoEffect: ()=>{ WM.steelTon *= 0.88; G.commMult.steel *= 0.92; },
    gameImpact: 'Stahl +30% â€” Karosserieproduktion teurer',
    dur: 100, type:'crisis',
  },
  {
    id:'eur_weakens', name:'Euro fÃ¤llt auf 1.02 USD',
    emoji:'ðŸ’¶', category:'WÃ¤hrung',
    desc:'EZB-Zinsentscheid schwÃ¤cht Euro â€” Exporte in USD-Raum werden profitabler.',
    effect: ()=>{ WM.eurUsd = 1.02; const exportBoost = 0.08; G.lines.forEach(l=>{ if(G.regions.usa?.unlocked || G.regions.china?.unlocked) l.veh.pm = (l.veh.pm||1) * (1 + exportBoost); }); },
    undoEffect: ()=>{ WM.eurUsd = 1.08; G.lines.forEach(l=>{ l.veh.pm = Math.max(0.7, (l.veh.pm||1) * 0.93); }); },
    gameImpact: 'Export-ErlÃ¶se +8% (USA/China), Import teurer',
    dur: 140, type:'neutral',
  },
  {
    id:'ev_battery_breakthrough', name:'Feststoffbatterie: Durchbruch!',
    emoji:'ðŸ”‹', category:'Technologie',
    desc:'Solid-State-Battery mit 800km Reichweite und 10-Min-Ladezeit â€” EV-Revolution.',
    effect: ()=>{ WM.evDemandIdx = Math.min(200, WM.evDemandIdx + 35); if(!G.rdone['solid']) { G.rdone['solid'] = true; notify('ðŸ”‹ Feststoffakku durch Weltmarkt-Event freigeschaltet!','ok'); } G.rep = Math.min(100, G.rep + 8); },
    undoEffect: ()=>{ WM.evDemandIdx -= 15; },
    gameImpact: 'E-Auto-Nachfrage +35%, Feststoffakku freigeschaltet',
    dur: 200, type:'good',
  },
  {
    id:'trade_war', name:'USA-EU Handelskrieg eskaliert',
    emoji:'âš”ï¸', category:'Geopolitik',
    desc:'Washington verhÃ¤ngt 30% Strafzoll auf europÃ¤ische Fahrzeuge.',
    effect: ()=>{ WM.tradeBarriers = 30; WM.geoRisk = Math.min(100, WM.geoRisk + 25); if(G.regions.usa?.unlocked) G.regions.usa.demand *= 0.6; },
    undoEffect: ()=>{ WM.tradeBarriers = 0; WM.geoRisk -= 15; if(G.regions.usa?.unlocked) G.regions.usa.demand = Math.min(1.4, G.regions.usa.demand * 1.3); },
    gameImpact: 'USA-Markt -40% Nachfrage, alle US-VerkÃ¤ufe geschwÃ¤cht',
    dur: 180, type:'crisis',
  },
  {
    id:'auto_show_success', name:'IAA Frankfurt: BegeisterungsstÃ¼rme',
    emoji:'ðŸ›ï¸', category:'Marketing',
    desc:'Deine Modelle dominieren die Internationale Automobilausstellung.',
    effect: ()=>{ const bonus = 300000 + G.share * 10000; G.money += bonus; G.rep = Math.min(100, G.rep + 12); G.brand = Math.min(100, G.brand + 8); floatMoney(bonus, true); },
    undoEffect: ()=>{ },
    gameImpact: '+â‚¬300k+, Rep +12, Brand +8, Bestellungen steigen',
    dur: 1, type:'good',
  },
  {
    id:'pandemic_fear', name:'Neue Variante: Lockdown-Angst',
    emoji:'ðŸ¦ ', category:'Gesundheit',
    desc:'Internationale MÃ¤rkte reagieren auf neue Pandemiemeldungen â€” Autoverkauf bricht ein.',
    effect: ()=>{ WM.globalDemand = Math.max(60, WM.globalDemand - 20); G.lines.forEach(l=>{ l.veh.pm = Math.max(0.7, (l.veh.pm||1) * 0.88); }); },
    undoEffect: ()=>{ WM.globalDemand = Math.min(120, WM.globalDemand + 12); G.lines.forEach(l=>{ l.veh.pm = Math.min(2, (l.veh.pm||1) * 1.08); }); },
    gameImpact: 'Globale Nachfrage -20%, Preise -12%, Lieferketten gestÃ¶rt',
    dur: 160, type:'crisis',
  },
  {
    id:'raw_mat_boom', name:'Rohstoff-Superzyklus beginnt',
    emoji:'â›ï¸', category:'Rohstoffe',
    desc:'Emerging Markets Infrastruktur-Boom treibt alle Rohstoffe gleichzeitig hoch.',
    effect: ()=>{ WM.steelTon *= 1.15; WM.aluTon *= 1.20; G.commMult.steel = Math.min(2.5, G.commMult.steel * 1.15); G.commMult.aluminum = Math.min(2.5, G.commMult.aluminum * 1.18); },
    undoEffect: ()=>{ WM.steelTon *= 0.93; WM.aluTon *= 0.92; G.commMult.steel *= 0.95; G.commMult.aluminum *= 0.94; },
    gameImpact: 'Stahl +15%, Alu +20% â€” alle Produktionskosten steigen',
    dur: 130, type:'crisis',
  },
];

// Land-Wirtschaftsdaten
var WM_COUNTRIES = [
  {name:'Deutschland', flag:'ðŸ‡©ðŸ‡ª', gdp:3.6, ev_share:28, car_market:3.9, trend:+0.3},
  {name:'USA',         flag:'ðŸ‡ºðŸ‡¸', gdp:2.8, ev_share:9,  car_market:16.2,trend:+0.8},
  {name:'China',       flag:'ðŸ‡¨ðŸ‡³', gdp:5.2, ev_share:38, car_market:28.0,trend:+1.2},
  {name:'Japan',       flag:'ðŸ‡¯ðŸ‡µ', gdp:1.1, ev_share:4,  car_market:5.5, trend:-0.2},
  {name:'SÃ¼dkorea',    flag:'ðŸ‡°ðŸ‡·', gdp:2.6, ev_share:12, car_market:1.8, trend:+0.4},
  {name:'Frankreich',  flag:'ðŸ‡«ðŸ‡·', gdp:0.9, ev_share:22, car_market:2.1, trend:+0.1},
  {name:'Indien',      flag:'ðŸ‡®ðŸ‡³', gdp:7.2, ev_share:3,  car_market:4.8, trend:+2.1},
  {name:'Brasilien',   flag:'ðŸ‡§ðŸ‡·', gdp:2.4, ev_share:5,  car_market:2.3, trend:+0.6},
];

// â”€â”€â”€ STORY / GESCHICHTE SYSTEM â”€â”€â”€
// 40 Missionen mit Narrativen, verknÃ¼pft mit Weltmarkt

var STORY_CHAPTERS = [
  {
    id: 'ch1', title: 'Kapitel 1: Die GrÃ¼ndung',
    emoji:'ðŸ­', unlock_at:0,
    lore: 'Es ist 2024. Du Ã¼bernimmst einen traditionsreichen Automobilkonzern in der Krise. Die AktionÃ¤re fordern ProfitabilitÃ¤t, die Regierung verlangt E-MobilitÃ¤t â€” und die Konkurrenz schlÃ¤ft nicht.',
    missions: [
      {id:'s1_1', name:'Erster Atemzug',   desc:'Starte die erste Produktionslinie',    check:()=>G.lines.length>=1,        r:15000,  lore:'Der erste Motor lÃ¤uft. Deine Mitarbeiter applaudieren.'},
      {id:'s1_2', name:'QualitÃ¤tssicherung', desc:'Upgrade QualitÃ¤tskontrolle Lvl 1',   check:()=>G.comp['quality']>=1,     r:20000,  lore:'Ein RÃ¼ckruf wÃ¤re ein Desaster. Sorge fÃ¼r QualitÃ¤t.'},
      {id:'s1_3', name:'Auf die StraÃŸe!',  desc:'Produziere deine ersten 10 Fahrzeuge', check:()=>G.prod>=10,               r:25000,  lore:'10 Autos. Klein, aber real. Die Reise beginnt.'},
      {id:'s1_4', name:'Erste Werbung',    desc:'Schalte eine Werbekampagne',           check:()=>G.ads.size>=1,            r:20000,  lore:'Ohne Marketing kein Absatz. Zeit, sichtbar zu werden.'},
      {id:'s1_5', name:'Schwarze Zahlen',  desc:'Erreiche â‚¬200k Gesamtumsatz',          check:()=>G.rev>=200000,            r:40000,  lore:'Die erste Ãœberweisung ans Mutterhaus. Endlich Luft.'},
    ]
  },
  {
    id: 'ch2', title: 'Kapitel 2: Das Wachstum',
    emoji:'ðŸ“ˆ', unlock_at:5,
    lore: 'Erste Erfolge. Aber BMW drÃ¼ckt die Preise, Tesla kÃ¼ndigt neue Modelle an und der Ã–lpreis steigt. Du brauchst mehr Modelle, mehr Werke â€” mehr Kapital.',
    missions: [
      {id:'s2_1', name:'Zweites Modell',    desc:'Starte ein zweites Fahrzeugmodell',    check:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=2, r:50000, lore:'Ein Modell ist kein GeschÃ¤ftsmodell. Diversifizierung ist Pflicht.'},
      {id:'s2_2', name:'Ingenieurteam',     desc:'Stelle 3 Ingenieure ein (Team)',        check:()=>G.engTeam.length>=3,     r:40000, lore:'Technik ist der Kern. Dein IngenieurbÃ¼ro wÃ¤chst.'},
      {id:'s2_3', name:'Expansion',         desc:'Baue ein zweites Werk',                check:()=>G.facs.length>=2,        r:150000, lore:'Wolfsburg allein reicht nicht. Der Konzern expandiert.'},
      {id:'s2_4', name:'Forscher',          desc:'SchlieÃŸe 5 Forschungsprojekte ab',     check:()=>Object.values(G.rdone).filter(Boolean).length>=5, r:100000, lore:'Ohne F&E Ã¼berholt uns die Konkurrenz in 5 Jahren.'},
      {id:'s2_5', name:'Millionengrenze',   desc:'Erreiche â‚¬1 Mio. Kapital',             check:()=>G.money>=1000000,        r:100000, lore:'Die erste Million. Der Vorstand ist beeindruckt.'},
      {id:'s2_6', name:'Marktmacht',        desc:'Erreiche 5% Marktanteil',              check:()=>G.share>=5,              r:120000, lore:'5 Prozent. Klein aber sichtbar auf dem Radar der GroÃŸen.'},
    ]
  },
  {
    id: 'ch3', title: 'Kapitel 3: Die Elektrowende',
    emoji:'âš¡', unlock_at:11,
    lore: 'BrÃ¼ssel verschÃ¤rft CO2-Ziele. Tesla verkÃ¼ndet Model 4. Die EU-Kommissarin ruft persÃ¶nlich an und fragt nach deiner Elektrostrategie. Die Investoren wollen Antworten.',
    missions: [
      {id:'s3_1', name:'E-Motor Forschung',  desc:'E-Motor auf Lvl 1 bringen',          check:()=>G.comp['eng_elec']>=1,   r:80000,  lore:'Der Verbrennungsmotor hat Zukunft â€” aber nicht alleine.'},
      {id:'s3_2', name:'Batterie-Pionier',   desc:'Batteriepaket auf Lvl 1',             check:()=>G.comp['battery']>=1,   r:100000, lore:'Die Batterie ist das neue Getriebe. Wer sie beherrscht, gewinnt.'},
      {id:'s3_3', name:'Erster Stromer',     desc:'Produziere ein E-Fahrzeug',           check:()=>['id4','beetle','id_buzz'].some(id=>G.vehs[id]?.on), r:150000, lore:'Applaus auf der Motorshow. Dein erstes E-Fahrzeug fÃ¤hrt vor.'},
      {id:'s3_4', name:'CO2-Engagement',     desc:'CO2-Index unter 90 bringen',          check:()=>G.co2Index<90,           r:120000, lore:'BrÃ¼ssel honoriert das Engagement. Erste FÃ¶rdergelder flieÃŸen.'},
      {id:'s3_5', name:'E-Roadmap',          desc:'Elektroflotte: 25% Anteil',           check:()=>{ const ev=VEHS.filter(v=>v.req.includes('eng_elec')&&G.vehs[v.id]?.on).length;const t=VEHS.filter(v=>G.vehs[v.id]?.on).length;return t>0&&ev/t>=.25;}, r:200000, lore:'Ein Viertel deiner Flotte fÃ¤hrt elektrisch. Die Presse jubelt.'},
      {id:'s3_6', name:'ESG-Pioneer',        desc:'ESG Score Ã¼ber 60 erreichen',         check:()=>G.esgScore>=60,          r:180000, lore:'Investoren aus Skandinavien steigen ein. ESG zahlt sich aus.'},
    ]
  },
  {
    id: 'ch4', title: 'Kapitel 4: Globale Expansion',
    emoji:'ðŸŒ', unlock_at:17,
    lore: 'China ist der grÃ¶ÃŸte Automarkt der Welt. USA fordert lokale Fertigung. Dein CFO warnt vor Ãœberexpansion â€” aber die Rivalen sind schon lÃ¤ngst global.',
    missions: [
      {id:'s4_1', name:'WeltbÃ¼rger',         desc:'ErschlieÃŸe 2 internationale Regionen',check:()=>Object.values(G.regions).filter(r=>r.unlocked).length>=2, r:200000, lore:'Der erste Container fÃ¤hrt nach New York. Globalisierung, persÃ¶nlich.'},
      {id:'s4_2', name:'Showroom-Kette',     desc:'Baue 4 Showrooms weltweit',           check:()=>G.showrooms.length>=4,   r:250000, lore:'Tokio, Dubai, Shanghai, New York â€” deine Marke glÃ¤nzt weltweit.'},
      {id:'s4_3', name:'Asien-Strategie',    desc:'China und Asien erschlieÃŸen',         check:()=>G.regions.china?.unlocked&&G.regions.asia?.unlocked, r:300000, lore:'Der Drache ist gezÃ¤hmt. Asien akzeptiert deine Marke.'},
      {id:'s4_4', name:'Exportchampion',     desc:'USA-Markt erschlieÃŸen + 3 HÃ¤ndler',   check:()=>G.regions.usa?.unlocked&&(G.regions.usa?.dealers||0)>=3, r:350000, lore:'Made in Germany â€” Made for the World. Detroit knirscht mit den ZÃ¤hnen.'},
      {id:'s4_5', name:'Weltkonzern',        desc:'Alle 5 Regionen erschlossen',         check:()=>Object.values(G.regions).every(r=>r.unlocked), r:500000, lore:'5 Kontinente. 1 Marke. Der Vorstandsvorsitzende erhÃ¤lt den Global Business Award.'},
    ]
  },
  {
    id: 'ch5', title: 'Kapitel 5: MarktfÃ¼hrerschaft',
    emoji:'ðŸ†', unlock_at:22,
    lore: 'Du bist auf dem Radar aller Konkurrenten. BMW schickt Spione. Tesla kÃ¼ndigt Preisschlacht an. Der Weltmarkt tobt â€” aber dein Konzern ist gewachsen, stark und bereit.',
    missions: [
      {id:'s5_1', name:'Premium-Position',   desc:'5 Modelle gleichzeitig produzieren',  check:()=>VEHS.filter(v=>G.vehs[v.id]?.on).length>=5, r:300000, lore:'FÃ¼nf Fahrzeuglinien. Vom Volksauto bis zum Luxussegment.'},
      {id:'s5_2', name:'Tech-Konzern',       desc:'Tech Level 5 erreichen',              check:()=>G.tech>=5,               r:500000, lore:'Patent Nr. 47 eingereicht. Silicon Valley nimmt dich ernst.'},
      {id:'s5_3', name:'Rennlegende',        desc:'5 Rennen gewinnen',                   check:()=>G.raceWins>=5,           r:400000, lore:'Le Mans. Monaco. Spa. Deine Farben sind Ã¼berall zu sehen.'},
      {id:'s5_4', name:'MarktfÃ¼hrer',        desc:'20% Marktanteil',                     check:()=>G.share>=20,             r:1000000,lore:'Ein FÃ¼nftel aller Autos weltweit trÃ¤gt dein Logo. Atemberaubend.'},
      {id:'s5_5', name:'Milliarden-Konzern', desc:'â‚¬50 Mio. Gesamtumsatz',               check:()=>G.rev>=50000000,         r:1000000,lore:'50 Millionen Euro Umsatz. Der Dax-Vorstand gratuliert persÃ¶nlich.'},
      {id:'s5_6', name:'Automobillegende',   desc:'1000 Fahrzeuge produziert',            check:()=>G.prod>=1000,            r:750000, lore:'Tausend Autos. Jedes davon eine Geschichte. Du hast Geschichte geschrieben.'},
    ]
  },
  {
    id: 'ch6', title: 'Kapitel 6: Das Erbe',
    emoji:'ðŸŒŸ', unlock_at:28,
    lore: '2030. Die Welt ist elektrifiziert. Dein Konzern steht am Scheideweg: Weitermachen wie bisher oder eine neue Ã„ra einlÃ¤uten? Die nÃ¤chste Generation wartet.',
    missions: [
      {id:'s6_1', name:'Nachhaltig',          desc:'CO2-Ziel â‰¤80 erreicht',              check:()=>G.sustainGoals?.achieved, r:500000,lore:'Nachhaltigkeit ist keine PR â€” es ist die Zukunft. Respekt.'},
      {id:'s6_2', name:'Konzept-VisionÃ¤r',    desc:'3 Konzeptfahrzeuge prÃ¤sentiert',      check:()=>G.concepts.length>=3,    r:600000, lore:'Drei Konzepte, die die Zukunft zeigen. Eines wird das Auto 2035.'},
      {id:'s6_3', name:'Patent-Imperium',     desc:'10 Patente besitzen',                 check:()=>G.patents.length>=10,    r:800000, lore:'Zehn Patente. Wer deine Technologie nutzen will, zahlt.'},
      {id:'s6_4', name:'Mega-Konzern',         desc:'IPO erfolgreich durchgefÃ¼hrt',        check:()=>G.ipoStatus==='public',  r:2000000,lore:'BÃ¶rsengang. Milliarden flieÃŸen. Der Konzern gehÃ¶rt jetzt der Welt.'},
      {id:'s6_5', name:'Vollautomatisierung',  desc:'Alle Automationen aktiv',             check:()=>Object.values(G.autos).every(Boolean), r:1000000,lore:'KI steuert die Produktion. Menschen entwickeln, Maschinen fertigen.'},
      {id:'s6_6', name:'AUTO EMPIRE',          desc:'5000 Fahrzeuge â€” Ende des Spiels',    check:()=>G.prod>=5000,            r:5000000,lore:'FÃ¼nftausend Fahrzeuge. Dein Konzern hat die Welt verÃ¤ndert. Das ist dein Erbe.'},
    ]
  },
];

// State fÃ¼r Story
Object.assign(G, {
  storyChapter: 0,
  storyMissionsDone: G.storyMissionsDone || [],
  wmTick: 0,
  wmEventActive: null,
  wmEventTimer: 120,
  wmHistory: [],
});
if(!G.storyMissionsDone) G.storyMissionsDone = [];

// â”€â”€â”€ WELTMARKT TICK â”€â”€â”€
function wmTick(){
  G.wmTick++;
  // Ã–lpreis schwankt realistisch (mean-reverting)
  const oilTarget = 85;
  WM.oil += (oilTarget - WM.oil) * 0.01 + (Math.random()-0.49) * 3;
  WM.oil = Math.max(45, Math.min(160, WM.oil));
  // EUR/USD
  WM.eurUsd += (1.08 - WM.eurUsd)*0.02 + (Math.random()-0.49)*0.008;
  WM.eurUsd = Math.max(0.85, Math.min(1.35, WM.eurUsd));
  // Stahl/Alu
  WM.steelTon += (680 - WM.steelTon)*0.01 + (Math.random()-0.49)*8;
  WM.steelTon = Math.max(400, Math.min(1200, WM.steelTon));
  WM.aluTon += (2400 - WM.aluTon)*0.01 + (Math.random()-0.49)*30;
  WM.aluTon = Math.max(1500, Math.min(4000, WM.aluTon));
  // Chip Index
  WM.chipIdx += (100 - WM.chipIdx)*0.02 + (Math.random()-0.49)*2;
  WM.chipIdx = Math.max(30, Math.min(130, WM.chipIdx));
  // EV Demand wÃ¤chst langfristig
  WM.evDemandIdx += 0.03 + (Math.random()-0.48)*1;
  WM.evDemandIdx = Math.max(50, Math.min(250, WM.evDemandIdx));
  // Global Demand mean-reverts
  WM.globalDemand += (100 - WM.globalDemand)*0.005 + (Math.random()-0.49)*1.5;
  WM.globalDemand = Math.max(60, Math.min(140, WM.globalDemand));

  // KAUSALKETTENEFFEKTE auf das Spiel:
  // Ã–lpreis â†’ Energiekosten
  G.commMult.energy = Math.max(0.5, Math.min(3.0, WM.oil / 85));
  // Stahl â†’ Produktionskosten
  G.commMult.steel = Math.max(0.5, Math.min(3.0, WM.steelTon / 680));
  // Alu â†’ Aluminiumkosten
  G.commMult.aluminum = Math.max(0.5, Math.min(3.0, WM.aluTon / 2400));
  // Chips â†’ Elektronik-VerfÃ¼gbarkeit
  if(WM.chipIdx < 60 && G.tc%30===0) {
    G.res.elec.v = Math.max(0, G.res.elec.v - 2);
  }
  // EUR/USD â†’ Export-ErlÃ¶se
  const fxMult = WM.eurUsd / 1.08;
  // (angewendet wenn US/Asien Regionen offen)
  // EV Demand â†’ E-Auto Preis-Multiplikator
  const evMult = WM.evDemandIdx / 100;
  G.lines.forEach(l=>{
    if(['id4','beetle','id_buzz'].includes(l.veh.id)){
      l.veh._wmEvMult = evMult;
    }
    // FX effect on export regions
    if(G.regions.usa?.unlocked || G.regions.china?.unlocked || G.regions.asia?.unlocked){
      l.veh._fxMult = 0.7 + fxMult * 0.3; // 70% base + 30% fx
    }
  });
  // Global Demand â†’ alle Preise
  // (verwendet in rDash/dailyRev)

  // WM Event System
  G.wmEventTimer--;
  if(G.wmEventTimer<=0 && !WM.activeWmEvent){
    G.wmEventTimer = 90 + Math.floor(Math.random()*120);
    if(Math.random()<0.35){
      const pool = WM_EVENTS.filter(e=>!G.wmHistory.includes(e.id));
      const ev = pool.length>0 ? pool[Math.floor(Math.random()*pool.length)] : WM_EVENTS[Math.floor(Math.random()*WM_EVENTS.length)];
      WM.activeWmEvent = {...ev, dur: ev.dur};
      G.wmHistory.push(ev.id);
      if(G.wmHistory.length > 6) G.wmHistory.shift();
      ev.effect();
      addEv('ðŸŒ <span style="color:var(--go)">WELTMARKT: '+ev.emoji+' '+ev.name+'</span> â€” '+ev.gameImpact);
      notify('ðŸŒ '+ev.emoji+' '+ev.name, ev.type==='crisis'?'err':ev.type==='good'?'ok':'warn');
      spawnPtcls(window.innerWidth/2, window.innerHeight*.3, ev.type==='crisis'?'#ff3355':ev.type==='good'?'#00ff88':'#ffaa00', 15);
    }
  }
  if(WM.activeWmEvent){
    WM.activeWmEvent.dur--;
    if(WM.activeWmEvent.dur<=0){
      if(WM.activeWmEvent.undoEffect) WM.activeWmEvent.undoEffect();
      addEv('ðŸŒ Weltmarkt-Event beendet: '+WM.activeWmEvent.name);
      WM.activeWmEvent=null;
    }
  }

  // Charts history
  if(G.wmTick%10===0){
    WM.oilHist.push(Math.round(WM.oil));if(WM.oilHist.length>12)WM.oilHist.shift();
    WM.eurHist.push(Math.round(WM.eurUsd*100)/100);if(WM.eurHist.length>12)WM.eurHist.shift();
    WM.evHist.push(Math.round(WM.evDemandIdx));if(WM.evHist.length>12)WM.evHist.shift();
  }
}

// â”€â”€â”€ STORY TICK â”€â”€â”€
function storyTick(){
  // Check all story missions
  STORY_CHAPTERS.forEach(ch=>{
    ch.missions.forEach(m=>{
      if(G.storyMissionsDone.includes(m.id)) return;
      if(m.check()){
        G.storyMissionsDone.push(m.id);
        G.money += m.r;
        G.heritagePoints = (G.heritagePoints||0) + Math.floor(m.r/10000);
        addEv('ðŸ“š <span style="color:var(--cy)">STORY: '+m.name+'</span> â€” '+m.lore.substring(0,60)+'... +â‚¬'+fm(m.r));
        notify('ðŸ“š '+m.name+' â€” +â‚¬'+fm(m.r),'ok');
        floatMoney(m.r, true);
        // Chapter advance check
        const chDone = ch.missions.filter(mi=>G.storyMissionsDone.includes(mi.id)).length;
        if(chDone===ch.missions.length){
          showBurst(ch.emoji+' '+ch.title,'Kapitel abgeschlossen!','NÃ¤chstes Kapitel freigeschaltet');
          spawnPtcls(window.innerWidth/2, window.innerHeight/2, '#bb55ff', 50);
          spawnPtcls(window.innerWidth*.3, window.innerHeight/2, '#ffaa00', 30);
        } else {
          // Small celebration for individual mission
          spawnPtcls(window.innerWidth/2, window.innerHeight*.4, '#00d4ff', 20);
        }
      }
    });
  });
  // Advance story chapter
  G.storyChapter = STORY_CHAPTERS.filter(ch=>
    ch.missions.every(m=>G.storyMissionsDone.includes(m.id))
  ).length;
}

// â”€â”€â”€ EXTEND TICK â”€â”€â”€
const _v11Tick = window.tick;
function v11Tick(){
  _v11Tick();
  wmTick();
  storyTick();
  // Apply WM demand multiplier to dailyRev
  // (globalDemand/100 is applied in revenue calculation)
}
window.tick = v11Tick;

// WM factor now baked into dailyRev() directly

// â”€â”€â”€ RENDER WELTMARKT â”€â”€â”€
function miniSparkline(data, colorHigh, colorLow){
  if(!data||data.length<2) return '';
  const mx=Math.max(...data), mn=Math.min(...data), rng=mx-mn||1;
  return '<div style="display:flex;align-items:flex-end;gap:2px;height:28px;width:80px;">'
    +data.map(v=>{
      const h=Math.max(3,((v-mn)/rng)*26);
      const pct=(v-mn)/rng;
      const col=pct>0.5?colorHigh:colorLow;
      return `<div style="flex:1;height:${h}px;background:${col};border-radius:1px 1px 0 0;opacity:.8;"></div>`;
    }).join('')+'</div>';
}

function rWeltmarkt(){
  // Update KPIs
  setTxt('wm-demand', Math.round(WM.globalDemand)+'%', WM.globalDemand>100?'var(--gn)':WM.globalDemand>85?'var(--go)':'var(--rd)');
  setTxt('wm-oil', '$'+Math.round(WM.oil), WM.oil>100?'var(--rd)':WM.oil>80?'var(--go)':'var(--gn)');
  setTxt('wm-usd', WM.eurUsd.toFixed(2), WM.eurUsd>1.0?'var(--gn)':'var(--rd)');
  setTxt('wm-steel', '$'+Math.round(WM.steelTon), WM.steelTon>800?'var(--rd)':WM.steelTon>600?'var(--go)':'var(--gn)');

  const we = document.getElementById('wm-events');
  if(we){
    let h = '';
    // Active event
    if(WM.activeWmEvent){
      const ev = WM.activeWmEvent;
      h += `<div class="ev-alert ${ev.type==='crisis'?'crisis':ev.type==='good'?'good':''}" style="margin-bottom:8px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:5px;">${ev.emoji} ${ev.name}</div>
        <div style="font-size:11px;color:var(--t2);margin-bottom:4px;">${ev.desc}</div>
        <div style="font-size:11px;color:var(--go);margin-bottom:4px;">ðŸ“Š Auswirkung: ${ev.gameImpact}</div>
        <div style="font-size:10px;color:var(--dm);">Verbleibend: ${ev.dur}s</div>
      </div>`;
    } else {
      h += `<div class="glass" style="margin-bottom:8px;text-align:center;padding:14px;"><div style="font-size:12px;color:var(--dm);">Keine aktiven Weltmarkt-Events<br><span style="font-size:10px;">NÃ¤chstes Event in ~${G.wmEventTimer}s</span></div></div>`;
    }
    // Market indicators
    h += `<div class="glass">
      <div style="font-size:11px;font-weight:700;color:var(--cy);margin-bottom:9px;">ðŸ“Š MARKTINDIKATOREN LIVE</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div><div style="font-size:12px;font-weight:700;">ðŸ›¢ï¸ Ã–lpreis</div><div style="font-size:10px;color:var(--dm);">Auswirkung auf Energiekosten</div></div>
        <div style="text-align:right;">${miniSparkline(WM.oilHist,'#ff3355','#00ff88')}<div style="font-size:12px;font-weight:700;color:${WM.oil>100?'var(--rd)':'var(--go)'}">$${Math.round(WM.oil)}/Barrel</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div><div style="font-size:12px;font-weight:700;">ðŸ’¶ EUR/USD</div><div style="font-size:10px;color:var(--dm);">Beeinflusst Export-ErlÃ¶se</div></div>
        <div style="text-align:right;">${miniSparkline(WM.eurHist,'#00ff88','#ff3355')}<div style="font-size:12px;font-weight:700;color:${WM.eurUsd>1.05?'var(--gn)':'var(--rd)'}">â‚¬1 = $${WM.eurUsd.toFixed(3)}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div><div style="font-size:12px;font-weight:700;">âš¡ E-Auto Nachfrage</div><div style="font-size:10px;color:var(--dm);">EV-Markt Wachstumsindex</div></div>
        <div style="text-align:right;">${miniSparkline(WM.evHist,'#00ff88','#ffaa00')}<div style="font-size:12px;font-weight:700;color:var(--gn)">${Math.round(WM.evDemandIdx)} Idx</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
        <div><div style="font-size:12px;font-weight:700;">ðŸ’» Chip-VerfÃ¼gbarkeit</div><div style="font-size:10px;color:var(--dm);">Halbleiter-Index</div></div>
        <div style="text-align:right;"><div style="font-size:12px;font-weight:700;color:${WM.chipIdx<70?'var(--rd)':WM.chipIdx<90?'var(--go)':'var(--gn)'}">
          ${Math.round(WM.chipIdx)} Idx ${WM.chipIdx<70?'âš ï¸':WM.chipIdx<90?'ðŸŸ¡':'ðŸŸ¢'}
        </div></div>
      </div>
    </div>`;
    we.innerHTML = h;
  }

  const wt = document.getElementById('wm-trends');
  if(wt){
    const trendItems = [
      {emoji:'âš¡',name:'E-MobilitÃ¤t',val:WM.evDemandIdx,base:100,unit:'Idx',good:true},
      {emoji:'ðŸ­',name:'Globale Produktion',val:WM.globalDemand,base:100,unit:'%',good:true},
      {emoji:'ðŸ’°',name:'US-Leitzins (Fed)',val:WM.interestFed,base:3,unit:'%',good:false},
      {emoji:'ðŸ‡ªðŸ‡º',name:'EU-Leitzins (EZB)',val:WM.interestEcb,base:2,unit:'%',good:false},
      {emoji:'ðŸŒ¡ï¸',name:'Inflation',val:WM.inflation,base:2,unit:'%',good:false},
      {emoji:'âš”ï¸',name:'Geopolitik-Risiko',val:WM.geoRisk,base:20,unit:'',good:false},
    ];
    wt.innerHTML = `<div class="glass">`+trendItems.map(t=>{
      const isGood = t.good ? t.val>=t.base : t.val<=t.base*1.2;
      const col = isGood?'var(--gn)':'var(--rd)';
      const change = t.val-t.base;
      return `<div class="sr">
        <span class="sl">${t.emoji} ${t.name}</span>
        <span class="sv" style="color:${col}">${typeof t.val==='number'&&t.val%1!==0?t.val.toFixed(1):Math.round(t.val)}${t.unit} <span style="font-size:10px">${change>=0?'â–²':'â–¼'}${Math.abs(change).toFixed(1)}</span></span>
      </div>`;
    }).join('')+'</div>';
  }

  const wc = document.getElementById('wm-countries');
  if(wc){
    wc.innerHTML = WM_COUNTRIES.map(co=>{
      const open = Object.values(G.regions).some(r=>r.flag===co.flag&&r.unlocked);
      return `<div class="glass" style="margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:22px;">${co.flag}</div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">${co.name} ${open?'<span class="badge bg">AKTIV</span>':''}</div>
            <div style="font-size:10px;color:var(--t2);">BIP: ${co.gdp>0?'+':''}${co.gdp}% Â· E-Anteil: ${co.ev_share}% Â· Markt: ${co.car_market}M Fzg/Jahr</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;font-weight:700;color:${co.trend>0?'var(--gn)':'var(--rd)'}">${co.trend>0?'â–²':'â–¼'}${Math.abs(co.trend).toFixed(1)}%</div>
            <div style="font-size:9px;color:var(--dm);">Trend</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
}

// â”€â”€â”€ RENDER STORY â”€â”€â”€
function rStory(){
  const totalDone = G.storyMissionsDone.length;
  const totalAll = STORY_CHAPTERS.reduce((s,ch)=>s+ch.missions.length,0);
  const pct = Math.round(totalDone/totalAll*100);

  const sh = document.getElementById('story-header');
  if(sh) sh.innerHTML = `<div class="holo" style="border-radius:12px;padding:13px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="font-size:14px;font-weight:700;">${G.companyIcon||'ðŸš—'} ${G.companyName||'Auto Empire'}</span>
      <span class="badge bpu">Kapitel ${G.storyChapter+1}/6</span>
    </div>
    <div class="pw"><div class="pb pu" style="width:${pct}%"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px;color:var(--dm);">
      <span>${totalDone}/${totalAll} Missionen</span>
      <span>Heritage-Punkte: ${G.heritagePoints||0}</span>
    </div>
  </div>`;

  // Active mission
  const sa = document.getElementById('story-active');
  if(sa){
    let nextMission = null;
    let nextChapter = null;
    outer: for(const ch of STORY_CHAPTERS){
      for(const m of ch.missions){
        if(!G.storyMissionsDone.includes(m.id)){
          nextMission=m; nextChapter=ch; break outer;
        }
      }
    }
    if(nextMission&&nextChapter){
      sa.innerHTML = `<div class="gcard-cyan">
        <div style="font-size:11px;color:var(--cy);font-weight:700;margin-bottom:4px;">${nextChapter.emoji} ${nextChapter.title}</div>
        <div style="font-size:14px;font-weight:800;margin-bottom:5px;">â–¶ ${nextMission.name}</div>
        <div style="font-size:12px;color:var(--t2);margin-bottom:6px;">${nextMission.desc}</div>
        <div style="font-size:11px;color:var(--go);font-style:italic;">"${nextMission.lore}"</div>
        <div style="margin-top:7px;font-size:12px;color:var(--gn);font-weight:700;">Belohnung: +â‚¬${fm(nextMission.r)}</div>
      </div>`;
    } else {
      sa.innerHTML='<div class="gcard-green" style="text-align:center;padding:16px;"><div style="font-size:24px;margin-bottom:6px;">ðŸ†</div><div style="font-size:14px;font-weight:700;">Alle Missionen abgeschlossen!</div><div style="font-size:11px;color:var(--t2);margin-top:4px;">Du hast die Geschichte von '+( G.companyName||'Auto Empire')+' geschrieben.</div></div>';
    }
  }

  const sc = document.getElementById('story-chapters');
  if(!sc) return;
  sc.innerHTML = STORY_CHAPTERS.map(ch=>{
    const done = ch.missions.filter(m=>G.storyMissionsDone.includes(m.id)).length;
    const total = ch.missions.length;
    const complete = done===total;
    const locked = ch.unlock_at > G.storyMissionsDone.length;
    const pct2 = Math.round(done/total*100);
    return `<div class="${complete?'gcard-green':locked?'glass':'glass'}" style="margin-bottom:8px;${locked?'opacity:.45;':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:14px;font-weight:800;">${ch.emoji} ${ch.title}</span>
        <span class="badge ${complete?'bg':'bc'}">${done}/${total}</span>
      </div>
      ${locked?'<div style="font-size:11px;color:var(--dm);">ðŸ”’ Freischaltung nach '+ch.unlock_at+' erledigten Missionen</div>':''}
      <div style="font-size:11px;color:var(--t2);line-height:1.5;margin-bottom:7px;font-style:italic;">"${ch.lore.substring(0,120)}..."</div>
      <div class="pw"><div class="pb ${complete?'gr':'cy'}" style="width:${pct2}%"></div></div>
      ${!locked?'<div style="margin-top:8px;">'+ch.missions.map(m=>{
        const mDone=G.storyMissionsDone.includes(m.id);
        return `<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <span style="font-size:14px;flex-shrink:0;">${mDone?'âœ…':'â¬œ'}</span>
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:700;${mDone?'text-decoration:line-through;opacity:.6':''}color:${mDone?'var(--gn)':'var(--tx)'}">${m.name}</div>
            <div style="font-size:10px;color:var(--dm);">${m.desc}</div>
          </div>
          <span style="font-size:10px;color:var(--go);flex-shrink:0;">+â‚¬${fm(m.r)}</span>
        </div>`;
      }).join('')+'</div>':''}
    </div>`;
  }).join('');
}

// â”€â”€â”€ EXTEND REDRAW â”€â”€â”€
const _v11Redraw = window.redraw;
function v11Redraw(){
  _v11Redraw();
  if(!window._tabJustChanged) return;
  const vid=document.querySelector('.view.on')?.id?.replace('v-','');
  if(vid==='weltmarkt') rWeltmarkt();
  else if(vid==='story') rStory();
}
window.redraw = v11Redraw;

// â”€â”€â”€ EXTEND RENDER ALL â”€â”€â”€
const _v11RenderAll = window.renderAll;
function v11RenderAll(){
  _v11RenderAll();
  rWeltmarkt();
  rStory();
}
window.renderAll = v11RenderAll;

console.log('ðŸŒ AUTO EMPIRE v11 â€” Weltmarkt + Story + Anti-Flicker geladen!');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUTO EMPIRE â€” REALISM LAYER (additive, non-destructive)
//  Supply Chain Abstraction Â· Bottleneck Engine Â· Health Overview
//  Quality/Defect Pressure Â· Auto-Helpers Â· Vehicle Insights
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function statusPill(val, hi, mid) {
  // val 0-100. hi threshold = green, mid = yellow, else red
  if (val >= hi)  return `<span class="st-pill st-ok">â— Stabil</span>`;
  if (val >= mid) return `<span class="st-pill st-warn">â— Angespannt</span>`;
  return              `<span class="st-pill st-crit">â— Kritisch</span>`;
}
function margPill(pct) {
  if (pct >= 30) return `<span class="st-pill st-ok">â–² ${pct.toFixed(0)}%</span>`;
  if (pct >= 12) return `<span class="st-pill st-warn">â†’ ${pct.toFixed(0)}%</span>`;
  return              `<span class="st-pill st-crit">â–¼ ${pct.toFixed(0)}%</span>`;
}
function demandPill(mult) {
  if (mult >= 1.1) return `<span class="st-pill st-ok">â–² Hoch</span>`;
  if (mult >= 0.9) return `<span class="st-pill" style="background:rgba(0,212,255,.1);color:var(--cy);border:1px solid rgba(0,212,255,.25);">â†’ Normal</span>`;
  return               `<span class="st-pill st-warn">â–¼ Niedrig</span>`;
}
function togglePanel(bodyId, arrowId) {
  const b = document.getElementById(bodyId);
  const a = document.getElementById(arrowId);
  if (!b) return;
  if (b.style.display === 'none') {
    b.style.display = '';
    if (a) a.textContent = 'â–¼';
  } else {
    b.style.display = 'none';
    if (a) a.textContent = 'â–¶';
  }
}

// â”€â”€â”€ SUPPLY CHAIN CATEGORY MODEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each category health is derived from existing G state â€” no new
// data entry by the player. Pure abstraction over what already exists.

function computeSupplyChainHealth() {
  const sc = G.supplyChain;

  // MECHANIK â€” driven by engine comps, steel/alu resources, embargos
  const mechComp = Math.min(10, (G.comp['eng_base']||0) + (G.comp['eng_v6']||0) + (G.comp['trans']||0) + (G.comp['chassis']||0));
  const steelRatio = G.res.steel.v / G.res.steel.max;
  const aluRatio   = G.res.aluminum.v / G.res.aluminum.max;
  const embargoHit = G.embargos.some(e=>e.affects==='steel') ? 20 : 0;
  sc.mechanik.health = Math.round(Math.min(100, Math.max(0,
    20 + mechComp * 5 + steelRatio * 25 + aluRatio * 15 - embargoHit
    - (G.productionStress||0) * 0.15
  )));

  // ELEKTRONIK â€” driven by elec resource, chip index, adas/battery comps
  const elecRatio  = G.res.elec.v / G.res.elec.max;
  const chipFactor = typeof WM !== 'undefined' ? (WM.chipIdx||100) / 100 : 1;
  const elecComp   = Math.min(8, (G.comp['adas']||0) + (G.comp['battery']||0) + (G.comp['infotn']||0));
  const chipEmb    = G.embargos.some(e=>e.affects==='elec') ? 25 : 0;
  sc.elektronik.health = Math.round(Math.min(100, Math.max(0,
    15 + elecRatio * 30 + chipFactor * 20 + elecComp * 4 - chipEmb
    - (G.productionStress||0) * 0.20
  )));

  // STRUKTUR â€” driven by body comps, presswerk, welding, carbon tech
  const structComp = Math.min(10,
    (G.comp['body_st']||0) * 0.5 + (G.comp['body_alu']||0) * 0.8
    + (G.comp['body_cfk']||0) + (G.comp['press']||0) + (G.comp['weldbot']||0)
  );
  const rubberRatio = G.res.rubber.v / G.res.rubber.max;
  sc.struktur.health = Math.round(Math.min(100, Math.max(0,
    25 + structComp * 5 + rubberRatio * 15 + aluRatio * 10
    + (G.rdone['cfk'] ? 8 : 0) + (G.rdone['alubody'] ? 5 : 0)
  )));

  // ENERGIE â€” driven by energy resource, oil price, green contracts
  const energyRatio = G.res.energy.v / G.res.energy.max;
  const oilPenalty  = typeof WM !== 'undefined' ? Math.max(0, (WM.oil - 85) / 100 * 30) : 0;
  const greenBonus  = G.insurance['ins_supply'] ? 10 : 0;
  const commEnergyHit = ((G.commMult.energy||1) - 1) * 30;
  sc.energie.health = Math.round(Math.min(100, Math.max(0,
    30 + energyRatio * 35 - oilPenalty - commEnergyHit + greenBonus
    + (G.rdone['lean'] ? 8 : 0)
  )));

  // KOMFORT/INTERIOR â€” driven by interior comps, plastic, design, brand
  const intComp    = Math.min(10, (G.comp['int_base']||0) + (G.comp['int_lux']||0)*1.5 + (G.comp['paint']||0));
  const plasticRatio= G.res.plastic.v / G.res.plastic.max;
  const brandFactor = G.brand / 100;
  sc.komfort.health = Math.round(Math.min(100, Math.max(0,
    15 + intComp * 5 + plasticRatio * 20 + brandFactor * 20 + G.dna.design * 0.2
    + (G.concepts.length > 0 ? 8 : 0)
  )));
}

// â”€â”€â”€ QUALITY / DEFECT PRESSURE MODEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Hidden model â€” creates meaningful tradeoffs without micromanagement.

function computeQualityPressure() {
  const sc = G.supplyChain;

  // Base pressure from production speed vs quality investment
  const runningLines = G.lines.filter(l=>l.run).length;
  const qualComp  = (G.comp['quality']||0) * 10;      // up to 80 pts protection
  const shiftBonus= G.autos['shift3'] ? 18 : 0;       // 3-shift adds stress
  const engBonus  = Math.min(30, G.engTeam.reduce((s,e)=>s+e.lvl*3, 0));
  const rdBonus   = (G.rdone['aiq'] ? 15 : 0) + (G.rdone['cobot'] ? 8 : 0);
  const lowScPenalty = (100 - sc.elektronik.health) * 0.15
                     + (100 - sc.mechanik.health)  * 0.10;
  const workerPenalty = G.workerHappy < 50 ? 20 : G.workerHappy < 70 ? 8 : 0;

  G.qualPressure = Math.round(Math.min(100, Math.max(0,
    runningLines * 8 + shiftBonus + workerPenalty + lowScPenalty
    - qualComp - engBonus - rdBonus
  )));

  // Production stress â€” overload check
  const maxCap = G.facs.length * 6;
  const usedCap = G.lines.length;
  G.productionStress = Math.round(Math.min(100, Math.max(0,
    (usedCap / Math.max(1, maxCap)) * 80
    + shiftBonus * 0.3
    - (G.autos['a_prod'] ? 15 : 0)
    - (G.rdone['lean'] ? 10 : 0)
  )));

  // Margin pressure â€” cost vs revenue squeeze
  const dRev = typeof dailyRev === 'function' ? dailyRev() : 0;
  const adCost = [...(G.ads||[])].reduce((s,id)=>{const a=ADS.find(x=>x.id===id);return s+(a?a.cost/86:0);},0);
  const loanCost = (G.loans||[]).reduce((s,l)=>s+l.monthly/30, 0);
  const totalCostPerS = adCost + loanCost + G.facs.reduce((s,f)=>s+f.workers*0.002, 0);
  const margin = dRev > 0 ? Math.max(0, (dRev - totalCostPerS) / dRev * 100) : 50;
  G.marginPressure = Math.round(Math.min(100, Math.max(0, 100 - margin)));

  // Quality pressure feeds into recall risk (extending existing mechanic)
  // The existing recall logic uses comp['quality']<2 â€” we augment it here
  if (G.qualPressure > 70 && G.lines.some(l=>l.run) && Math.random() < 0.0002) {
    const veh = VEHS.filter(v=>G.vehs[v.id]?.on)[0];
    if (veh) {
      const fine = 50000 + Math.floor(G.qualPressure * 2000 * Math.random());
      G.money = Math.max(0, G.money - fine);
      G.rep   = Math.max(0, G.rep - 5);
      notify('âš ï¸ QualitÃ¤tsdruck verursacht RÃ¼ckruf â€” -â‚¬' + fm(fine), 'err');
      addEv('âš ï¸ <span style="color:var(--rd)">QualitÃ¤tsdruck-RÃ¼ckruf</span> â€” Druck: ' + G.qualPressure + '% â†’ -â‚¬' + fm(fine));
    }
  }
}

// â”€â”€â”€ AUTO-HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function runAutoHelpers() {
  const h = G.autoHelpers;

  // 1. Supply balance â€” auto top-up the most critical supply category
  if (h.supplyBalance) {
    const sc = G.supplyChain;
    const worst = Object.entries(sc).sort((a,b)=>a[1].health-b[1].health)[0];
    if (worst[1].health < 50 && G.money > 20000) {
      // Map category to resource and buy
      const map = { mechanik:'steel', elektronik:'elec', energie:'energy',
                    struktur:'aluminum', komfort:'plastic' };
      const res = map[worst[0]];
      if (res && G.res[res]) {
        const buyAmt = Math.min(500, G.res[res].max - G.res[res].v);
        if (buyAmt > 50) {
          const cost = buyAmt * 8;
          G.money -= cost; G.res[res].v += buyAmt;
          // silent â€” no notification to avoid spamming
        }
      }
    }
  }

  // 2. Quality protect â€” slow production when pressure critical
  if (h.qualityProtect && G.qualPressure > 75) {
    G.lines.forEach(l => {
      if (l.run && l.rate > 0) l._qualSlowed = true;
    });
  } else {
    G.lines.forEach(l => { l._qualSlowed = false; });
  }

  // 3. Margin protect â€” notify once per quarter if margin is squeezed
  if (h.marginProtect && G.marginPressure > 80 && G.tc % 360 === 0) {
    notify('ðŸ’° Margin-Alarm: Kosten fressen Gewinn auf!', 'warn');
    addEv('ðŸ’° <span style="color:var(--go)">Margin-Schutz warnt:</span> Margendruck ' + G.marginPressure + '%');
  }

  // 4. Supplier stabilisation â€” spend a small amount to stabilise worst SC
  if (h.supplierStab && G.tc % 60 === 0) {
    const sc = G.supplyChain;
    Object.values(sc).forEach(cat => {
      if (cat.health < 60 && G.money > 5000) {
        cat.health = Math.min(100, cat.health + 3);
        G.money -= 3000;
      }
    });
  }
}

// â”€â”€â”€ BOTTLENECK / OPPORTUNITY ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Runs each tick, builds a prioritised list of issues and chances.
// Stored in G._bottlenecks / G._opportunities for render.

function computeBottlenecks() {
  const issues = [];
  const opps   = [];
  const sc = G.supplyChain;

  // Supply chain issues
  Object.entries(sc).forEach(([k, cat]) => {
    if (cat.health < 40) {
      issues.push({
        sev: 'rd',
        label: cat.icon + ' ' + cat.label + '-Engpass',
        sub: 'Kategorie kritisch (' + cat.health + '%) â€” Produktion beeintrÃ¤chtigt',
        action: k === 'elektronik' ? "sv('rohstoff',document.querySelectorAll('.nb')[7])" : null,
        actionLabel: 'Rohstoffe â†’',
        score: 100 - cat.health,
      });
    } else if (cat.health < 65) {
      issues.push({
        sev: 'go',
        label: cat.icon + ' ' + cat.label + ' angespannt',
        sub: 'Gesundheit ' + cat.health + '% â€” bald kritisch',
        action: null, actionLabel: '',
        score: 80 - cat.health,
      });
    }
  });

  // Quality pressure
  if (G.qualPressure > 70) {
    issues.push({
      sev: 'rd',
      label: 'âš ï¸ Hoher QualitÃ¤tsdruck (' + G.qualPressure + '%)',
      sub: 'RÃ¼ckrufrisiko erhÃ¶ht â€” QualitÃ¤tskontrolle upgraden oder 3-Schicht reduzieren',
      action: "sv('kompo',document.querySelectorAll('.nb')[1]);setCat('Fertigung')",
      actionLabel: 'QualitÃ¤t upgraden â†’',
      score: G.qualPressure,
    });
  } else if (G.qualPressure > 45) {
    issues.push({
      sev: 'go',
      label: 'âš ï¸ QualitÃ¤tsdruck steigt (' + G.qualPressure + '%)',
      sub: 'Ingenieure leveln oder QualitÃ¤tskontrolle verbessern',
      action: null, actionLabel: '', score: G.qualPressure,
    });
  }

  // Margin squeeze
  if (G.marginPressure > 75) {
    issues.push({
      sev: 'rd',
      label: 'ðŸ’¸ Margendruck kritisch',
      sub: 'Kosten Ã¼bersteigen fast den Umsatz â€” Kredite oder Werbung prÃ¼fen',
      action: "sv('fin',document.querySelectorAll('.nb').item(Array.from(document.querySelectorAll('.nb')).findIndex(b=>b.textContent.includes('Finanzen'))))",
      actionLabel: 'Finanzen â†’',
      score: G.marginPressure,
    });
  }

  // Production stress
  if (G.productionStress > 80) {
    issues.push({
      sev: 'rd',
      label: 'ðŸ­ Produktion Ã¼berlastet (' + G.productionStress + '%)',
      sub: 'Zu viele Linien fÃ¼r verfÃ¼gbare WerkskapazitÃ¤t â€” neues Werk bauen?',
      action: "sv('werke',document.querySelectorAll('.nb').item(Array.from(document.querySelectorAll('.nb')).findIndex(b=>b.textContent.includes('Werke'))))",
      actionLabel: 'Werke â†’',
      score: G.productionStress,
    });
  }

  // Worker happiness
  if (G.workerHappy < 50) {
    issues.push({
      sev: 'rd',
      label: 'âœŠ Streikgefahr (Zufriedenheit ' + G.workerHappy + '%)',
      sub: 'GehÃ¤lter erhÃ¶hen oder neue Mitarbeiter einstellen',
      action: "sv('personal',document.querySelectorAll('.nb').item(Array.from(document.querySelectorAll('.nb')).findIndex(b=>b.textContent.includes('Personal'))))",
      actionLabel: 'Personal â†’',
      score: 100 - G.workerHappy,
    });
  }

  // Embargos
  if (G.embargos.length > 0) {
    issues.push({
      sev: 'go',
      label: 'ðŸš« ' + G.embargos.length + ' aktives Embargo',
      sub: G.embargos.map(e=>e.name).join(', ') + ' â€” Lieferketten gestÃ¶rt',
      action: "sv('embargo',document.querySelectorAll('.nb').item(Array.from(document.querySelectorAll('.nb')).findIndex(b=>b.textContent.includes('Embargo'))))",
      actionLabel: 'Details â†’',
      score: 50,
    });
  }

  // â”€â”€ OPPORTUNITIES â”€â”€
  const sc2 = SEASON_CFG[G.season];
  // Seasonal demand opportunity
  const seasonBonusVeh = VEHS.find(v =>
    G.vehs[v.id]?.on && sc2.bonus?.[v.id] && sc2.bonus[v.id] > 1.1
  );
  if (seasonBonusVeh) {
    opps.push({
      sev: 'gn',
      label: seasonBonusVeh.e + ' ' + seasonBonusVeh.name + ' Saison-Boost',
      sub: SEASON_CFG[G.season].name + ': Nachfrage â–²' + Math.round((sc2.bonus[seasonBonusVeh.id]-1)*100) + '% â€” Produktion hochfahren?',
      action: "sv('saison',document.querySelectorAll('.nb').item(Array.from(document.querySelectorAll('.nb')).findIndex(b=>b.textContent.includes('Saison'))))",
      actionLabel: 'Saison â†’',
    });
  }

  // EV demand opportunity from world market
  if (typeof WM !== 'undefined' && WM.evDemandIdx > 120) {
    const evVeh = VEHS.find(v =>
      v.req.includes('eng_elec') && G.vehs[v.id]?.on
    );
    const canBuild = VEHS.find(v =>
      v.req.includes('eng_elec') && !G.vehs[v.id]?.on
      && v.req.every(r => G.comp[r] >= 1)
    );
    if (evVeh) {
      opps.push({
        sev: 'gn',
        label: 'âš¡ E-Auto Nachfrage hoch (' + Math.round(WM.evDemandIdx) + 'idx)',
        sub: 'Weltmarkt boosted E-Fahrzeuge â€” mehr Linien lohnenswert',
        action: null, actionLabel: '',
      });
    } else if (canBuild) {
      opps.push({
        sev: 'cy',
        label: 'âš¡ E-Auto starten: ' + canBuild.name,
        sub: 'Alle Anforderungen erfÃ¼llt â€” Nachfrage jetzt sehr hoch!',
        action: "sv('fahr',document.querySelectorAll('.nb')[2])",
        actionLabel: 'Fahrzeuge â†’',
      });
    }
  }

  // Unlockable vehicle with all comps ready
  const nextUnlock = VEHS.find(v =>
    !G.vehs[v.id]?.on
    && v.req.every(r => G.comp[r] >= 1)
    && G.money >= v.pc * 5
  );
  if (nextUnlock) {
    opps.push({
      sev: 'gn',
      label: nextUnlock.e + ' ' + nextUnlock.name + ' startklar',
      sub: 'Alle Bauteile vorhanden, Kapital reicht â€” jetzt produzieren!',
      action: "sv('fahr',document.querySelectorAll('.nb')[2])",
      actionLabel: 'Fahrzeuge â†’',
    });
  }

  // Research opportunity â€” next cheap research
  if (!G.active_rd) {
    const cheap = RD.flatMap(c=>c.items).filter(r=>!G.rdone[r.id]).sort((a,b)=>a.cost-b.cost)[0];
    if (cheap && G.money >= cheap.cost) {
      opps.push({
        sev: 'cy',
        label: 'ðŸ”¬ ' + cheap.name + ' forschbar',
        sub: 'Kein aktives Projekt â€” â‚¬' + fm(cheap.cost) + ' verfÃ¼gbar',
        action: "sv('forsch',document.querySelectorAll('.nb')[4])",
        actionLabel: 'Forschung â†’',
      });
    }
  }

  // Sort by severity (rd > go > cy > gn) then score
  const sevOrder = { rd: 0, go: 1, cy: 2, gn: 3 };
  issues.sort((a,b) => (sevOrder[a.sev]||3) - (sevOrder[b.sev]||3) || b.score - a.score);

  G._bottlenecks  = issues;
  G._opportunities = opps;
}

// â”€â”€â”€ EXTEND MAIN TICK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Wrap the existing tick chain â€” called last to avoid ordering issues
const _rlOrigTick = window.tick;
function realismLayerTick() {
  _rlOrigTick();
  // Compute supply chain health (fast, pure math)
  computeSupplyChainHealth();
  computeQualityPressure();
  runAutoHelpers();
  // Rebuild bottleneck list every 5 ticks to avoid noise
  if (G.tc % 5 === 0) computeBottlenecks();
}
window.tick = realismLayerTick;

// â”€â”€â”€ RENDER FUNCTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderBottlenecks() {
  const el = document.getElementById('bn-list');
  if (!el) return;
  const all = [...G._bottlenecks, ...G._opportunities];
  if (all.length === 0) {
    setHTML('bn-list', '<div style="font-size:11px;color:var(--gn);padding:4px 0;">âœ“ Alles stabil â€” keine kritischen EngpÃ¤sse</div>');
    return;
  }
  const html = all.slice(0, 6).map(item => `
    <div class="bn-item">
      <div class="bn-dot ${item.sev}"></div>
      <div style="flex:1;">
        <div class="bn-label">${item.label}</div>
        <div class="bn-sub">${item.sub}</div>
        ${item.action ? `<span class="bn-action" onclick="${item.action}">${item.actionLabel}</span>` : ''}
      </div>
    </div>`).join('');
  setHTML('bn-list', html);
}

function renderProductionHealth() {
  const el = document.getElementById('ph-list');
  if (!el) return;
  const sc = G.supplyChain;

  // Overall production status
  const avgSC = Math.round(Object.values(sc).reduce((s,c)=>s+c.health,0) / Object.keys(sc).length);
  const dRev  = typeof dailyRev === 'function' ? dailyRev() : 0;
  const adCost= [...(G.ads||[])].reduce((s,id)=>{const a=ADS.find(x=>x.id===id);return s+(a?a.cost/86:0);},0);
  const lCost = (G.loans||[]).reduce((s,l)=>s+l.monthly/30, 0);
  const margin = dRev > 0 ? Math.max(0, (dRev - adCost - lCost) / dRev * 100) : 0;
  const demandMult = typeof WM !== 'undefined' ? WM.globalDemand / 100 : 1;

  // 5 health rows
  const rows = [
    {
      icon: 'ðŸ­', name: 'Produktionsstatus',
      val: 100 - G.productionStress,
      col: G.productionStress < 40 ? 'var(--gn)' : G.productionStress < 70 ? 'var(--go)' : 'var(--rd)',
      label: G.productionStress < 40 ? 'Normal' : G.productionStress < 70 ? 'Angespannt' : 'Ãœberlastet',
    },
    {
      icon: 'â›“ï¸', name: 'Lieferkette',
      val: avgSC,
      col: avgSC >= 65 ? 'var(--gn)' : avgSC >= 40 ? 'var(--go)' : 'var(--rd)',
      label: avgSC >= 65 ? 'Stabil' : avgSC >= 40 ? 'Engpass' : 'Kritisch',
    },
    {
      icon: 'â­', name: 'QualitÃ¤tsstatus',
      val: 100 - G.qualPressure,
      col: G.qualPressure < 35 ? 'var(--gn)' : G.qualPressure < 65 ? 'var(--go)' : 'var(--rd)',
      label: G.qualPressure < 35 ? 'Gut' : G.qualPressure < 65 ? 'Risiko' : 'Kritisch (' + G.qualPressure + '%)',
    },
    {
      icon: 'ðŸ’°', name: 'Margenstatus',
      val: Math.min(100, margin),
      col: margin >= 25 ? 'var(--gn)' : margin >= 10 ? 'var(--go)' : 'var(--rd)',
      label: margin >= 25 ? fm(margin.toFixed(0)) + '% Marge' : margin >= 10 ? 'Niedrig (' + margin.toFixed(0) + '%)' : 'Kritisch (' + margin.toFixed(0) + '%)',
    },
    {
      icon: 'ðŸ“ˆ', name: 'Nachfrage-Trend',
      val: Math.min(100, demandMult * 80),
      col: demandMult >= 1.05 ? 'var(--gn)' : demandMult >= 0.92 ? 'var(--cy)' : 'var(--rd)',
      label: demandMult >= 1.05 ? 'Wachsend (' + Math.round(demandMult*100) + '%)' : demandMult >= 0.92 ? 'Stabil' : 'RÃ¼cklÃ¤ufig',
    },
  ];

  const html = rows.map(r => `
    <div class="ph-row">
      <span class="ph-icon">${r.icon}</span>
      <span class="ph-name">${r.name}</span>
      <div class="ph-bar"><div class="ph-fill" style="width:${r.val}%;background:${r.col};"></div></div>
      <span class="ph-val" style="color:${r.col};">${r.label}</span>
    </div>`).join('');

  // Supply category breakdown (compact)
  const scHtml = Object.values(sc).map(cat => {
    const col = cat.health >= 65 ? 'var(--gn)' : cat.health >= 40 ? 'var(--go)' : 'var(--rd)';
    return `<div class="sc-cat">
      <div class="sc-cat-hd">
        <span class="sc-cat-name">${cat.icon} ${cat.label}</span>
        ${statusPill(cat.health, 65, 40)}
      </div>
      <div class="sc-bar"><div class="sc-fill" style="width:${cat.health}%;background:${col};"></div></div>
    </div>`;
  }).join('');

  setHTML('ph-list', html + `
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);">
      <div style="font-size:10px;color:var(--dm);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Lieferketten-Kategorien</div>
      ${scHtml}
    </div>`);
}

function renderVehicleInsights() {
  const el = document.getElementById('veh-insights');
  if (!el) return;
  const active = VEHS.filter(v => G.vehs[v.id]?.on);
  if (active.length === 0) {
    setHTML('veh-insights', '<div style="font-size:11px;color:var(--dm);padding:4px 0;">Noch keine Fahrzeuge in Produktion.</div>');
    return;
  }

  const sc2  = SEASON_CFG[G.season];
  const html = active.map(v => {
    const seasonMult = (sc2.bonus?.[v.id]||1) * (sc2.malus?.[v.id]||1);
    const margin     = v.price > 0 ? Math.max(0, (v.price*(v.pm||1) - v.pc) / (v.price*(v.pm||1)) * 100) : 0;
    const stress     = G.productionStress > 70 ? 'rd' : G.productionStress > 40 ? 'go' : 'gn';
    const qualPress  = G.qualPressure    > 70 ? 'rd' : G.qualPressure    > 40 ? 'go' : 'gn';

    return `<div class="vi-row">
      <span class="vi-emoji">${v.e}</span>
      <span class="vi-name">${v.name}</span>
      <div class="vi-pills">
        ${demandPill(seasonMult)}
        ${margPill(margin)}
        <span class="st-pill ${stress==='rd'?'st-crit':stress==='go'?'st-warn':'st-ok'}">${stress==='rd'?'â— Stress':stress==='go'?'â— Belastet':'â— OK'}</span>
        ${G.qualPressure > 65 ? `<span class="st-pill st-crit">âš  Qual.</span>` : ''}
      </div>
    </div>`;
  }).join('');

  setHTML('veh-insights', html);
}

// â”€â”€â”€ AUTO-HELPERS UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Injected into the existing Automation tab (v-auto) â€” appended after existing content

function renderAutoHelpers() {
  // Inject into auto tab if we haven't yet
  const autoList = document.getElementById('auto-list');
  if (!autoList) return;
  let helperEl = document.getElementById('auto-helpers-section');
  if (!helperEl) {
    helperEl = document.createElement('div');
    helperEl.id = 'auto-helpers-section';
    // Insert after auto-list
    autoList.parentNode.insertBefore(helperEl, autoList.nextSibling);
  }
  const h = G.autoHelpers;
  const helpers = [
    { id:'supplyBalance', icon:'â›“ï¸', name:'Auto Supply-Balance',   sub:'Kritische Rohstoffe werden automatisch aufgestockt' },
    { id:'qualityProtect',icon:'â­', name:'QualitÃ¤tsschutz',        sub:'Verlangsamt Produktion wenn QualitÃ¤tsdruck >75%' },
    { id:'marginProtect', icon:'ðŸ’°', name:'Margin-WÃ¤chter',         sub:'Warnt sofort wenn Marge unter 10% sinkt' },
    { id:'supplierStab',  icon:'ðŸ“¦', name:'Lieferanten-Stabilisierung',sub:'Stabilisiert schwache SC-Kategorien kontinuierlich' },
  ];

  helperEl.innerHTML = `
    <div class="sh" style="margin-top:12px;">ðŸ¤– INTELLIGENTE ASSISTENTEN</div>
    <div class="card" style="padding:10px 11px;">
      <div style="font-size:10px;color:var(--dm);margin-bottom:8px;line-height:1.5;">
        Optionale Automatisierungen â€” reduzieren Micromanagement ohne Strategie zu ersetzen.
      </div>
      ${helpers.map(hl => `
        <div class="ah-row">
          <div style="font-size:16px;flex-shrink:0;">${hl.icon}</div>
          <div style="flex:1;">
            <div class="ah-name">${hl.name}</div>
            <div class="ah-sub">${hl.sub}</div>
          </div>
          <div class="tw ${h[hl.id]?'on':''}" onclick="toggleHelper('${hl.id}')"><div class="tk"></div></div>
        </div>`).join('')}
    </div>`;
}

function toggleHelper(id) {
  if (!(id in G.autoHelpers)) return;
  G.autoHelpers[id] = !G.autoHelpers[id];
  notify((G.autoHelpers[id] ? 'âœ“ ' : 'âœ— ') + id + ' ' + (G.autoHelpers[id] ? 'aktiviert' : 'deaktiviert'), 'ok');
  renderAutoHelpers();
}

// â”€â”€â”€ HOOK INTO EXISTING REDRAW LOOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Extend _doSmartUpdate and _doFullRender non-destructively.
// We wrap the dashboard smart update to also render our new panels.

const _rlOrigFullRender = window._doFullRender;
window._doFullRender = function(vid) {
  _rlOrigFullRender(vid);
  if (vid === 'dash') {
    renderBottlenecks();
    renderProductionHealth();
    renderVehicleInsights();
  }
  if (vid === 'auto') {
    renderAutoHelpers();
  }
};

const _rlOrigSmartUpdate = window._doSmartUpdate;
window._doSmartUpdate = function(vid) {
  _rlOrigSmartUpdate(vid);
  if (vid === 'dash') {
    // Bottleneck and health update on the same cadence as smart updates
    // Only update realism panels if they exist and are visible
    // Use setHTML which skips update when content hasn't changed
    renderBottlenecks();
    renderProductionHealth();
    renderVehicleInsights();
  }
};

// â”€â”€â”€ INITIAL RENDER ON LOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _rlOrigRenderAll = window.renderAll;
window.renderAll = function() {
  _rlOrigRenderAll();
  computeSupplyChainHealth();
  computeQualityPressure();
  computeBottlenecks();
  renderBottlenecks();
  renderProductionHealth();
  renderVehicleInsights();
  renderAutoHelpers();
};

console.log('âœ… Realism Layer loaded â€” Supply Chain Â· Bottleneck Engine Â· Health Overview');
// â”€â”€ NEW TWO-TIER NAVIGATION SYSTEM â”€â”€
const NAV_MAP={
  zentrale: [{id:'dash',l:'ðŸ“Š Dash'},{id:'news',l:'ðŸ“° News'},{id:'ziele',l:'ðŸŽ¯ Ziele'},{id:'kampagne',l:'ðŸ“– Kampagne'},{id:'ranking',l:'ðŸ† Ranking'},{id:'speichern',l:'ðŸ’¾ Speichern'},{id:'story',l:'ðŸ“š Geschichte'}],
  produktion: [{id:'kompo',l:'âš™ï¸ Bauteile'},{id:'fahr',l:'ðŸš— Fahrzeuge'},{id:'prod',l:'ðŸ”§ Produktion'},{id:'werke',l:'ðŸ­ Werke'},{id:'tuning',l:'ðŸ”© Tuning'},{id:'konzept',l:'ðŸ’¡ Konzepte'}],
  forschung: [{id:'forsch',l:'ðŸ”¬ Forschung'},{id:'forschlab',l:'ðŸ§ª Labor'},{id:'patente',l:'ðŸ“œ Patente'},{id:'ingenieure',l:'ðŸ§‘â€ðŸ”¬ Ingenieure'},{id:'qualitaet',l:'â­ QualitÃ¤t'},{id:'roadmap',l:'âš¡ E-Roadmap'}],
  markt: [{id:'markt',l:'ðŸŒ Marktanteile'},{id:'region',l:'ðŸ—ºï¸ Regionen'},{id:'weltkarte',l:'ðŸŒ Weltkarte'},{id:'absatz',l:'ðŸ“¦ Absatz'},{id:'showrooms',l:'ðŸª Showrooms'},{id:'werb',l:'ðŸ“º Werbung'},{id:'fahrzeugmarkt',l:'ðŸ·ï¸ Preise'}],
  wirtschaft: [{id:'fin',l:'ðŸ’¹ Finanzen'},{id:'boerse',l:'ðŸ“ˆ BÃ¶rse'},{id:'bank',l:'ðŸ¦ Bank'},{id:'aktien2',l:'ðŸ’¼ Portfolio'},{id:'fusion2',l:'ðŸ”€ M&A'},{id:'weltmarkt',l:'ðŸŒ Makro-Ã–konomie'}],
  strategie: [{id:'rohstoff',l:'â›ï¸ Rohstoffe'},{id:'lieferkette',l:'â›“ï¸ Lieferkette'},{id:'lieferant2',l:'ðŸ¤ Partner'},{id:'politik',l:'ðŸ›ï¸ Politik'},{id:'personal',l:'ðŸ‘· Personal'},{id:'nachhaltigkeit',l:'ðŸŒ± ESG'},{id:'mitbewerber2',l:'âš¡ RivalitÃ¤t'}],
  spezial: [{id:'spionage',l:'ðŸ•µï¸ Spionage'},{id:'blackmarket',l:'ðŸ•¶ï¸ Schwarzm.'},{id:'wetter',l:'ðŸŒ©ï¸ Krisen'},{id:'kiangriff',l:'ðŸŽ¯ KI-Angriff'},{id:'embargo',l:'ðŸš« Embargo'},{id:'saison',l:'ðŸ‚ Saison'},{id:'racing',l:'ðŸŽï¸ Racing'},{id:'auto',l:'ðŸ¤– Automat.'},{id:'ankuendigungen',l:'ðŸ“¢ AnkÃ¼ndig.'}]
};

let currentCat='zentrale';
window.setNavCat = function(cat, el) {
  currentCat=cat;
  document.querySelectorAll('.nc').forEach(e=>e.classList.remove('on'));
  if(el) el.classList.add('on');
  let html = '';
  NAV_MAP[cat].forEach(n => {
    html += `<button class="nsb" id="nsb-${n.id}" onclick="sv('${n.id}',this)">${n.l}</button>`;
  });
  setHTML('sub-nav', html);
  // Auto-open first
  if(NAV_MAP[cat].length > 0) sv(NAV_MAP[cat][0].id, document.getElementById(`nsb-${NAV_MAP[cat][0].id}`));
};

// Override standard sv slightly to handle .nsb active states
const _origSv = window.sv;
window.sv = function(v, el) {
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('on'));
  let tgt = document.getElementById('v-'+v);
  if(tgt) tgt.classList.add('on');
  document.querySelectorAll('.nsb').forEach(e=>e.classList.remove('on'));
  if(el) el.classList.add('on');
  else {
     let sel = document.getElementById('nsb-'+v);
     if(sel) sel.classList.add('on');
  }
};

// â”€â”€ OPTION B: FEINDLICHE ÃœBERNAHMEN & MONOPOLE â”€â”€

// Initiierung der Daten
if(typeof G.rivalShares === 'undefined') G.rivalShares = {};
if(typeof G.takenOver === 'undefined') G.takenOver = {};

// Override renderAll to include our new render function
const _oldRenderAll_v2 = window.renderAll;
window.renderAll = function() {
    if(_oldRenderAll_v2) _oldRenderAll_v2();
    renderFusion2();
};

function renderFusion2() {
    let html = '';
    RIVALS.forEach(r => {
        if (!G.rivalShares[r.id]) G.rivalShares[r.id] = 0;
        let owned = G.rivalShares[r.id];
        let val = r.ca; // Valuation
        let cost10Pct = val * 0.1;
        let isOwned = G.takenOver[r.id];
        
        let actions = ``;
        if (isOwned) {
            actions = `<div style="color:var(--cy);font-weight:700;margin-top:5px;">âœ… 100% Tochtergesellschaft</div>
                       <div style="font-size:10px;color:var(--dm);">- SÃ¤mtliche Marktanteile addiert<br>- Gewinne flieÃŸen in deinen Konzern</div>`;
        } else {
            actions = `<div style="display:flex;gap:5px;margin-top:8px;">
                <button class="btn sm cy-b" onclick="buyRivalShare('${r.id}', 10)" ${G.money < cost10Pct || owned >= 50 ? 'disabled' : ''}>ðŸ“ˆ 10% kaufen (â‚¬${fm(cost10Pct)})</button>
                <button class="btn sm rd-b" onclick="hostileTakeover('${r.id}')" ${owned < 50 || G.money < (val*0.5) ? 'disabled' : ''}>ðŸ’¥ Feindliche Ãœbernahme (â‚¬${fm(val*0.5)})</button>
            </div>`;
        }

        html += `<div class="card" style="margin-bottom:8px;border-left:4px solid ${r.cl};">
            <div style="display:flex;justify-content:space-between;">
                <div>
                    <div style="font-size:16px;font-weight:800;">${r.ic} ${r.n} ${r.co}</div>
                    <div style="font-size:11px;color:var(--dm);">Unternehmenswert: <b style="color:var(--go)">â‚¬${fm(val)}</b> â€¢ Marktanteil: <b style="color:var(--gn)">${r.sh.toFixed(1)}%</b></div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:10px;color:var(--dm);">Deine Anteile</div>
                    <div style="font-size:18px;font-weight:900;color:${owned>=50?'var(--cy)':'var(--gn)'};">${owned}%</div>
                </div>
            </div>
            <div class="pw" style="margin-top:6px;height:6px;"><div class="pb ${owned>=50?'cy':'gr'}" style="width:${owned}%"></div></div>
            ${actions}
        </div>`;
    });
    setHTML('acquisition-list', html);
    setTxt('ma-deals', Object.keys(G.takenOver).length);
    let pfVal = 0;
    RIVALS.forEach(r => pfVal += r.ca * (G.rivalShares[r.id] || 0) / 100);
    setTxt('ma-val', `â‚¬${fm(pfVal)}`);
}

window.buyRivalShare = function(id, pct) {
    let r = RIVALS.find(x => x.id === id);
    if (!r) return;
    let cost = r.ca * (pct / 100);
    if (G.money >= cost) {
        G.money -= cost;
        G.rivalShares[r.id] = (G.rivalShares[r.id] || 0) + pct;
        notify(`Du hast ${pct}% von ${r.n} gekauft!`, 'ok');
        addEv(`ðŸ“‰ <span style="color:var(--cy)">Aktienkauf: ${pct}% von ${r.ic} ${r.n}</span>`);
        renderAll();
    } else {
        notify('Nicht genug Kapital!', 'err');
    }
};

window.hostileTakeover = function(id) {
    let r = RIVALS.find(x => x.id === id);
    if (!r) return;
    let cost = r.ca * 0.5; // Restliche 50%
    if (G.money >= cost && G.rivalShares[r.id] >= 50 && !G.takenOver[r.id]) {
        G.money -= cost;
        G.rivalShares[r.id] = 100;
        G.takenOver[r.id] = true;
        // Merge effects
        G.share += r.sh; // Take their market share
        r.sh = 0; // They disappear from market
        G.rep = Math.min(100, G.rep + 10);
        showBurst(`${r.n} ÃœBERNOMMEN!`, 'Du hast einen Giganten zerschlagen!', 'Monopol wÃ¤chst');
        addEv(`ðŸ’¥ <span style="color:var(--rd)">FEINDLICHE ÃœBERNAHME: ${r.ic} ${r.n} gehÃ¶rt nun dir!</span>`);
        notify(`Ãœbernahme erfolgreich! +Marktanteil`, 'ok');
        renderAll();
    }
};

// Also hook into tick to simulate revenue flow from taken over companies
const _oldTick_v2 = window.tick || function(){};
window.tick = function() {
    _oldTick_v2();
    if (G.tc % 10 === 0) { // Every 10 seconds, get some passive income
        let passiveIncome = 0;
        RIVALS.forEach(r => {
            if (G.takenOver[r.id]) {
                passiveIncome += r.ca * 0.0001; // Tiny steady stream
            }
        });
        if (passiveIncome > 0) {
            G.money += passiveIncome;
            floatMoney(passiveIncome, true);
        }
    }
};


// â”€â”€ MULTIPLAYER PATCH â”€â”€
// Override localStorage saves to use the PHP Backend API

window.saveGame = function(manual) {
    if(typeof G === 'undefined' || !G.id) return;
    const saveObj = JSON.stringify(G);
    
    fetch('api.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: saveObj
    }).then(res => res.json()).then(data => {
        if(data.status === 'saved') {
            let d = new Date();
            let ds = d.toLocaleDateString()+' '+d.toLocaleTimeString();
            setTxt('last-save', ds);
            let kb = (saveObj.length/1024).toFixed(1);
            setTxt('save-sz', kb+' kb');
            if(manual) {
                notify('Cloud Save erfolgreich!', 'ok');
                document.getElementById('save-status').textContent = 'Gespeichert in der Cloud!';
            }
        }
    }).catch(e => {
        notify('Cloud Save Fehler!', 'err');
    });
};

window.loadGame = function() {
    // Check if the Twig template injected SERVER_STATE
    if(typeof window.SERVER_STATE !== 'undefined' && window.SERVER_STATE && window.SERVER_STATE.id) {
        G = window.SERVER_STATE;
        
        // Render triggers
        if(typeof renderDash==='function') renderDash();
        if(typeof renderVeh==='function') renderVeh();
        if(typeof renderProd==='function') renderProd();
        if(typeof renderComp==='function') renderComp();
        if(typeof renderRoadmap==='function') renderRoadmap();
        if(typeof renderWorldMarket==='function') renderWorldMarket();
        if(typeof renderRivalry==='function') renderRivalry();
        
        let cs=document.getElementById('company-select');
        if(cs){ cs.style.display='none'; cs.classList.add('hide'); }
        
        notify('Cloud Save geladen!', 'ok');
    } else {
        // New user or no save found. Proceed to company selection.
        if (typeof buildCompanySelection === 'function') buildCompanySelection();
    }
};


// â”€â”€ MULTIPLAYER ASYNC INIT â”€â”€
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('api.php?action=init');
        const textData = await res.text();
        let data;
        try {
            data = JSON.parse(textData);
        } catch(parsErr) {
            console.error("API Response was not JSON:", textData);
            document.body.innerHTML += '<div style="position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:999999;">API Fehler: ' + textData.substring(0, 200) + '</div>';
            if(typeof buildCompanySelection==='function') buildCompanySelection();
            if(typeof window.init==='function') window.init();
            let cs = document.getElementById('company-select');
            if (cs && cs.innerHTML === '') { console.log('GRID STILL EMPTY'); }
            return;
        }
        
        if (data.error) {
            document.body.innerHTML += '<div style="position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:999999;">Backend Fehler: ' + data.error + '</div>';
        }

        // Restore globals with fallbacks
        window.VEHS = data.configs && data.configs.VEHS ? eval('[' + data.configs.VEHS + ']') : [];
        window.COMPS = data.configs && data.configs.COMPS ? eval('[' + data.configs.COMPS + ']') : [];
        window.RD = data.configs && data.configs.RD ? eval('[' + data.configs.RD + ']') : [];
        window.EVENTS = data.configs && data.configs.EVENTS ? eval('[' + data.configs.EVENTS + ']') : [];
        window.ADS = data.configs && data.configs.ADS ? eval('[' + data.configs.ADS + ']') : [];
        window.CEO_POOL = data.configs && data.configs.CEO_POOL ? eval('[' + data.configs.CEO_POOL + ']') : [];
        
        // Multiplayer Rivals
        window.RIVALS = data.multiplayer_rivals || [];
        
        // Load cloud state
        if(data.user_state && data.user_state.id) {
            window.G = data.user_state;
            if(typeof renderDash==='function') renderDash();
            if(typeof renderVeh==='function') renderVeh();
            if(typeof renderProd==='function') renderProd();
            if(typeof renderComp==='function') renderComp();
            let cs=document.getElementById('company-select');
            if(cs) { cs.style.display='none'; cs.classList.add('hide'); }
            notify('Multiplayer Sync erfolgreich', 'ok');
        } else {
            if(typeof buildCompanySelection==='function') buildCompanySelection();
            if(typeof window.init==='function') window.init();
            let cs = document.getElementById('company-select');
            if (cs && cs.innerHTML === '') { console.log('GRID STILL EMPTY'); }
        }
        
        // Auto Save Loop
        setInterval(() => {
            if(typeof window.saveGame === 'function') window.saveGame(false);
        }, 15000);
        
    } catch (e) {
        console.error("Multiplayer Init Fehler: ", e);
        document.body.innerHTML += '<div style="position:fixed;top:50px;left:10px;background:orange;color:white;padding:10px;z-index:999999;">Kritischer Fehler: ' + e.message + '</div>';
        if(typeof buildCompanySelection==='function') buildCompanySelection();
            if(typeof window.init==='function') window.init();
            let cs = document.getElementById('company-select');
            if (cs && cs.innerHTML === '') { console.log('GRID STILL EMPTY'); }
    }
});

