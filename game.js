/* Nexus Number V5 — self-contained client logic.
   All generated numbers are fictional in-game combinations, not real phone subscriptions. */
(function(){
'use strict';
window.NEXUS_NUMBER_BOOTED = false;

const API_BASE = String(window.NEXUS_NUMBER_API || localStorage.getItem('nexus_api') || '').replace(/\/$/,'');
const STORAGE_KEY='nexus_number_v5_state';
const DB_NAME='nexus-number-v5';
const STORE='used_numbers';

const DROP_TABLE=[
  {key:'common',label:'Обычный',pct:92,oneIn:'1.09 к 1',min:500,max:10000},
  {key:'uncommon',label:'Необычный',pct:6,oneIn:'1 к 17',min:10000,max:75000},
  {key:'rare',label:'Редкий',pct:1.7,oneIn:'1 к 59',min:75000,max:500000},
  {key:'epic',label:'Эпический',pct:.25,oneIn:'1 к 400',min:500000,max:2500000},
  {key:'legendary',label:'Легендарный',pct:.049,oneIn:'1 к 2 041',min:2500000,max:12000000},
  {key:'mythic',label:'Мифический',pct:.001,oneIn:'1 к 100 000',min:12000000,max:49900000}
];
const TYPE_LABELS={
  random:'Случайная',pair:'Двойная пара',triple:'Тройка',quad:'Четвёрка',quint:'Пятёрка',sext:'Шестёрка',sept:'Семёрка',
  mirror:'Зеркало',half:'Двойной блок',alternate:'Чередование',stairs:'Лестница',stairsWide:'Длинная лестница',
  lucky777:'Lucky 777',lucky000:'Lucky 000',lucky123:'123-пульс',all:'Полный дубль',palindrome:'Палиндром',blocks:'Блоки'
};
const TYPE_WEIGHTS={
  common:[['random',72],['pair',16],['triple',7],['blocks',5]],
  uncommon:[['pair',35],['triple',27],['alternate',16],['stairs',12],['lucky123',10]],
  rare:[['triple',22],['quad',16],['alternate',15],['stairs',14],['lucky777',13],['lucky000',8],['blocks',7],['mirror',5]],
  epic:[['quad',20],['quint',18],['mirror',19],['half',15],['stairsWide',15],['alternate',8],['lucky777',5]],
  legendary:[['quint',20],['sext',15],['mirror',21],['half',18],['stairsWide',18],['palindrome',8]],
  mythic:[['all',28],['sept',18],['sext',20],['mirror',16],['half',10],['stairsWide',5],['lucky777',3]]
};
const DEMO_LEADERS=[
 ['NEXUS_01',49900000,'+7 999 999 99 99','Мифический'],
 ['NUMBERKING',31750000,'+7 977 777 77 77','Мифический'],
 ['DIGIT LORD',12400000,'+7 988 888 88 88','Легендарный'],
 ['ARCTIC',7300000,'+7 900 123 12 12','Легендарный'],
 ['PHONE X',2900000,'+7 911 111 22 33','Эпический'],
 ['R9',740000,'+7 999 777 12 34','Редкий'],
 ['NOVA',188000,'+7 922 555 66 77','Редкий'],
 ['LIME',76000,'+7 933 123 45 67','Необычный']
];

let state=loadState();
let current=state.current||null;
let page='generator';
let rolling=false;
let usedCache=new Set(state.recentUsed||[]);
let dbPromise=null;

function loadState(){
  const base={attempts:0,best:0,history:[],rareCounts:{common:0,uncommon:0,rare:0,epic:0,legendary:0,mythic:0},sound:true,theme:'dark',nick:'Игрок',playerId:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),current:null,recentUsed:[]};
  try{return Object.assign(base,JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||{});}catch{return base;}
}
function save(){try{state.recentUsed=Array.from(usedCache).slice(-2500);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function money(n){return Number(n||0).toLocaleString('ru-RU')+' ₽';}
function rand(n=1){return Math.floor(Math.random()*n);}
function pickWeighted(list){let total=list.reduce((a,x)=>a+x[1],0),r=Math.random()*total;for(const [v,w] of list){r-=w;if(r<0)return v}return list[list.length-1][0];}
function pickDrop(){let r=Math.random()*100,acc=0;for(const x of DROP_TABLE){acc+=x.pct;if(r<acc)return x}return DROP_TABLE[0];}
function randomDigits(){return [9,...Array.from({length:9},()=>rand(10))];}
function digitsFrom(arr){return arr.map(Number).slice(0,10);}
function fmt(d){return '+7 '+d.slice(0,3).join('')+' '+d.slice(3,6).join('')+' '+d.slice(6,8).join('')+' '+d.slice(8,10).join('');}
function uniqueDigits(){return Array.from(new Set(randomDigits())).length;}
function makeByType(type){
  const r=()=>rand(10), d=randomDigits();
  if(type==='random')return d;
  if(type==='pair'){const a=r(),b=r(),c=r();return [9,a,a,b,b,c,c,r(),r(),r()];}
  if(type==='triple'){const a=r();let x=[9,a,a,a,r(),r(),r(),r(),r(),r()];return x;}
  if(type==='quad'){const a=r();return [9,a,a,a,a,r(),r(),r(),r(),r()];}
  if(type==='quint'){const a=r();return [9,a,a,a,a,a,r(),r(),r(),r()];}
  if(type==='sext'){const a=r();return [9,a,a,a,a,a,a,r(),r(),r()];}
  if(type==='sept'){const a=r();return [9,a,a,a,a,a,a,a,r(),r()];}
  if(type==='mirror'){const a=[r(),r(),r(),r()];return [9,...a,r(),r(),r(),...a.slice().reverse()];}
  if(type==='half'){const a=[r(),r(),r(),r(),r()];return [9,...a,...a];}
  if(type==='alternate'){const a=r(),b=r();return [9,a,b,a,b,a,b,a,b,a];}
  if(type==='stairs'||type==='stairsWide'){const start=r(),step=pickWeighted([[1,60],[2,22],[9,18]]);return [9,...Array.from({length:9},(_,i)=>(start+i*step)%10)];}
  if(type==='lucky777'){return [9,7,7,7,r(),7,7,7,r(),r()];}
  if(type==='lucky000'){return [9,0,0,0,r(),0,0,0,r(),r()];}
  if(type==='lucky123'){const s=[1,2,3,1,2,3,rand(10),rand(10),1,2];return [9,...s];}
  if(type==='all'){const a=pickWeighted([[7,36],[8,24],[9,20],[1,20]]);return Array(10).fill(a).map((v,i)=>i===0?9:v);}
  if(type==='palindrome'){const a=[r(),r(),r(),r(),r()];return [9,a[0],a[1],a[2],a[3],a[4],a[3],a[2],a[1],a[0]];}
  if(type==='blocks'){const a=r(),b=r(),c=r();return [9,a,a,b,b,c,c,r(),r(),r()];}
  return d;
}
function detect(d){
  const body=d.slice(1), s=body.join('');
  const groups=Object.values(body.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{})).sort((a,b)=>b-a);
  let asc=0,desc=0;for(let i=2;i<10;i++){if(d[i]===d[i-1]+1)asc++;if(d[i]===d[i-1]-1)desc++;}
  if(groups[0]>=9)return['Полный дубль','all'];
  if(groups[0]>=7)return['Семёрка','sept'];
  if(groups[0]>=6)return['Шестёрка','sext'];
  if(groups[0]>=5)return['Пятёрка','quint'];
  if(groups[0]>=4)return['Четвёрка','quad'];
  if(s.slice(0,4)===s.slice(4).split('').reverse().join(''))return['Зеркало','mirror'];
  if(body.slice(0,5).join('')===body.slice(5).join(''))return['Двойной блок','half'];
  if(body.every((v,i)=>i<2||v===body[i%2]))return['Чередование','alternate'];
  if(Math.max(asc,desc)>=7)return['Длинная лестница','stairsWide'];
  if(Math.max(asc,desc)>=5)return['Лестница','stairs'];
  if(s.includes('777'))return['Lucky 777','lucky777'];
  if(s.includes('000'))return['Lucky 000','lucky000'];
  if(s.includes('123'))return['123-пульс','lucky123'];
  if(Object.values(body.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{})).filter(v=>v>=2).length>=3)return['Блоки','blocks'];
  if(groups[0]>=3)return['Тройка','triple'];
  if(groups[0]>=2)return['Двойная пара','pair'];
  return['Случайная','random'];
}
function priceFor(d,rarityKey,type){
  const body=d.slice(1);let score=500;
  const maxGroup=Math.max(...Object.values(body.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{})));
  score += (maxGroup-1)*4200;
  const [_,t]=detect(d);
  const bonus={random:0,pair:9000,triple:26000,quad:90000,quint:280000,sext:850000,sept:1600000,mirror:700000,half:1200000,alternate:420000,stairs:280000,stairsWide:850000,lucky777:175000,lucky000:95000,lucky123:70000,blocks:110000,all:25000000,palindrome:1600000}[t]||0;
  score += bonus;
  score += ({common:0,uncommon:5000,rare:50000,epic:250000,legendary:1200000,mythic:10000000}[rarityKey]||0);
  score=Math.max(score, DROP_TABLE.find(x=>x.key===rarityKey).min);
  score=Math.min(score, DROP_TABLE.find(x=>x.key===rarityKey).max);
  return Math.round(score/100)*100;
}
function chanceFor(key){return DROP_TABLE.find(x=>x.key===key)||DROP_TABLE[0];}
async function openDB(){
  if(!('indexedDB' in window))return null;
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'number'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);
  });return dbPromise;
}
async function reserveLocal(number, data){
  if(usedCache.has(number))return false;
  const db=await openDB();
  if(!db){usedCache.add(number);return true;}
  return new Promise(resolve=>{
    const tx=db.transaction(STORE,'readwrite'); const store=tx.objectStore(STORE);
    const req=store.add({number,createdAt:Date.now(),rarity:data.rarityKey});
    req.onsuccess=()=>{usedCache.add(number);resolve(true)};req.onerror=()=>resolve(false);
  });
}
async function generateUniqueLocal(){
  for(let i=0;i<80;i++){
    const drop=pickDrop();const type=pickWeighted(TYPE_WEIGHTS[drop.key]);const d=makeByType(type);const number=fmt(d);
    const ok=await reserveLocal(number,{rarityKey:drop.key}); if(!ok)continue;
    const detected=detect(d);const price=priceFor(d,drop.key,type);const chance=chanceFor(drop.key);
    return buildResult(d,drop,detected,price,chance);
  }
  const d=randomDigits();const drop=DROP_TABLE[0];return buildResult(d,drop,detect(d),priceFor(d,'common','random'),chanceFor('common'));
}
function buildResult(d,drop,detected,price,chance){
  return {number:fmt(d),digits:d,rarityKey:drop.key,rarity:drop.label,rarityPct:drop.pct,oneIn:drop.oneIn,pattern:TYPE_LABELS[detected[1]]||detected[0],type:detected[1],price,chancePct:drop.pct,createdAt:Date.now()};
}
function historyRows(limit=5){
  if(!state.history.length)return '<div class="muted" style="padding:9px 2px">После генерации здесь появятся твои номера.</div>';
  return state.history.slice(0,limit).map(r=>`<div class="row"><div><strong>${esc(r.number)}</strong><small>${esc(r.rarity)} · ${esc(r.pattern)} · шанс ${esc(String(r.chancePct))}%</small></div><b>${money(r.price)}</b></div>`).join('');
}
function generatorView(){
  const r=current;
  const meter=Math.min(100,Math.max(0,Math.log10(Math.max(r.price,500))/8*100));
  return `<section class="hero"><span class="eyebrow">MOBILE NUMBER HUNT</span><h1>Выбей самый дорогой номер</h1><p>Все типы номеров находятся в одном общем пуле. Каждый запуск случайно определяет редкость, шанс, комбинацию и игровую стоимость.</p></section>
  <section class="card generator">
    <div class="card-top"><div class="pill">ПУЛ: <b>1 000 000 000+</b> комбинаций</div><div class="pill">РЕКОРД: <b>${money(state.best)}</b></div></div>
    <div id="stage" class="stage"><div class="stage-label">VIRTUAL MOBILE NUMBER</div>
      <div class="phone-card"><div class="phone-head"><span>NEXUS NUMBER</span><span>RU · GAME ITEM</span></div><div class="phone-main" id="numberMain"><div class="country-mark">RUSSIA</div><div class="number">${esc(r.number)}</div><div class="nexus-mark">N</div></div><div class="phone-foot"><span>${esc(r.pattern.toUpperCase())}</span><span>${esc(r.rarity.toUpperCase())}</span></div></div>
      <div class="result-meta"><div class="pattern"><small>ТИП КОМБИНАЦИИ</small>${esc(r.pattern)}</div><div class="rarity ${esc(r.rarityKey)}">${esc(r.rarity)}</div></div>
      <div class="price-row"><span>Игровая стоимость</span><b>${money(r.price)}</b></div>
      <div class="chance-row"><span>Шанс выпадения типа</span><strong>${r.chancePct}% · ${esc(r.oneIn)}</strong></div>
      <div class="meter"><i style="width:${meter}%"></i></div>
    </div>
    <div class="actions"><button id="generateBtn" class="generate">СГЕНЕРИРОВАТЬ НОМЕР<span>ВСЕ ТИПЫ · ОДИН ОБЩИЙ ПУЛ · БЕЗ ПОВТОРОВ</span></button><div class="two-actions"><button id="shareBtn" class="sub">Поделиться</button><button id="settingsBtn" class="sub">Настройки</button></div></div>
    <div class="quick"><div class="mini"><span>ГЕНЕРАЦИЙ</span><b>${state.attempts}</b></div><div class="mini"><span>МИФИЧЕСКИХ</span><b>${state.rareCounts.mythic||0}</b></div><div class="mini"><span>УНИКАЛЬНЫХ</span><b>${state.history.length}</b></div></div>
  </section>
  <section class="section"><div class="section-head"><div><h2>Последние результаты</h2><span class="muted">Номера не выбираются из фиксированного списка</span></div><button id="openCollection" class="chip">Все</button></div><div class="row-list">${historyRows(5)}</div></section>`;
}
function catalogView(){
  return `<section class="hero"><span class="eyebrow">NUMBER MARKET</span><h1>Каталог редкости</h1><p>Витрина автоматически создаётся из разных типов комбинаций. Генератор при этом использует общий случайный пул.</p></section><section class="section"><div class="filters"><input id="search" class="field" placeholder="Поиск по номеру или типу"><div class="chips" id="rarityChips">${DROP_TABLE.map(x=>`<button class="chip ${x.key==='all'?'active':''}" data-rarity="${x.key}">${x.label}</button>`).join('')}<button class="chip active" data-rarity="all">Все</button></div><div class="chips" id="sortChips"><button class="chip active" data-sort="priceDesc">Дорогие</button><button class="chip" data-sort="priceAsc">Дешёвые</button></div></div></section><div id="catalogGrid" class="catalog-grid"></div>`;
}
function makeCatalog(){
  const list=[];const rar=DROP_TABLE.map(x=>x.key);const types=Object.keys(TYPE_LABELS);
  for(let i=0;i<72;i++){
    const rk=rar[i%rar.length];const type=types[(i*7+3)%types.length];let d=makeByType(type);if(d[0]!==9)d[0]=9;const detected=detect(d);const drop=DROP_TABLE.find(x=>x.key===rk)||DROP_TABLE[0];list.push(buildResult(d,drop,detected,priceFor(d,rk,type),chanceFor(rk)));
  }return list;
}
let catalog=makeCatalog();
function renderCatalog(){
  const root=document.getElementById('catalogGrid');if(!root)return;
  const q=(document.getElementById('search')?.value||'').toLowerCase().trim();const active=document.querySelector('#rarityChips .chip.active')?.dataset.rarity||'all';const sort=document.querySelector('#sortChips .chip.active')?.dataset.sort||'priceDesc';
  let data=catalog.filter(x=>(active==='all'||x.rarityKey===active)&&(!q||x.number.toLowerCase().includes(q)||x.pattern.toLowerCase().includes(q)||x.rarity.toLowerCase().includes(q)));
  data.sort((a,b)=>sort==='priceAsc'?a.price-b.price:b.price-a.price);
  root.innerHTML=data.map((x,i)=>`<div class="catalog-card"><div class="catalog-number">${esc(x.number)}</div><div><strong>${esc(x.pattern)}</strong><small>${esc(x.rarity)} · ${x.chancePct}%</small></div><div><b>${money(x.price)}</b><button class="open-item" data-index="${i}">Открыть</button></div></div>`).join('')||'<div class="section muted">Ничего не найдено.</div>';
  root.querySelectorAll('[data-index]').forEach(btn=>btn.addEventListener('click',()=>{const x=data[Number(btn.dataset.index)];current=x;state.current=x;save();navigate('generator');toast('Комбинация открыта');}));
}
function collectionView(){return `<section class="hero"><span class="eyebrow">MY NUMBERS</span><h1>Коллекция</h1><p>Все уникальные номера, которые ты получил на этом устройстве.</p></section><section class="section"><div class="stats"><div class="bigstat"><span>Собрано</span><b>${state.history.length}</b></div><div class="bigstat"><span>Сумма цен</span><b>${money(state.history.reduce((a,x)=>a+Number(x.price||0),0))}</b></div></div><div class="row-list" style="margin-top:10px">${historyRows(100)}</div></section>`;}
function ratingView(){return `<section class="hero"><span class="eyebrow">GLOBAL HUNT</span><h1>Лидерборд</h1><p>Соревнование по стоимости: кто выбил самый дорогой номер.</p></section><section class="section"><div id="leaderboard" class="lb"></div><div style="margin-top:10px;display:grid;grid-template-columns:1fr auto;gap:8px"><input id="nick" class="field" maxlength="20" value="${esc(state.nick)}" placeholder="Твой ник"><button id="sendScore" class="primary">В рейтинг</button></div><div id="ratingStatus" class="muted" style="margin-top:8px">${API_BASE?'Онлайн-режим подключён.':'Worker не подключён — пока работает локальный интерфейс.'}</div></section>`;}
async function loadLeaderboard(){
  const root=document.getElementById('leaderboard');if(!root)return;
  if(!API_BASE){root.innerHTML=DEMO_LEADERS.map((x,i)=>rankRow(i+1,x[0],x[1],x[2],x[3])).join('')+rankRow(DEMO_LEADERS.length+1,state.nick,state.best,current?.number||'—',current?.rarity||'');return;}
  try{const r=await fetch(API_BASE+'/api/leaderboard?limit=100');if(!r.ok)throw new Error();const data=await r.json();const items=data.items||[];root.innerHTML=items.length?items.map((x,i)=>rankRow(i+1,x.nickname,x.price,x.number,x.rarity)).join(''):'<div class="muted">Пока нет результатов.</div>';}catch{root.innerHTML=DEMO_LEADERS.map((x,i)=>rankRow(i+1,x[0],x[1],x[2],x[3])).join('');const s=document.getElementById('ratingStatus');if(s)s.textContent='Worker временно недоступен — показана локальная витрина.';}
}
function rankRow(i,n,p,num,r){return `<div class="rank ${i<=3?'top':''}"><div class="pos">#${i}</div><div><strong>${esc(n||'Игрок')}</strong><small>${esc(num||'—')} · ${esc(r||'')}</small></div><div class="sum">${money(p)}</div></div>`;}
function statsView(){const total=Math.max(1,state.attempts);const rareTotal=Object.entries(state.rareCounts).filter(([k])=>k!=='common').reduce((a,[,v])=>a+v,0);return `<section class="hero"><span class="eyebrow">DROP DATA</span><h1>Статистика</h1><p>Реальные игровые вероятности классов, результаты и рекорд.</p></section><section class="section"><div class="stats"><div class="bigstat"><span>Генераций</span><b>${state.attempts}</b></div><div class="bigstat"><span>Редких</span><b>${rareTotal}</b></div><div class="bigstat"><span>Рекорд</span><b>${money(state.best)}</b></div><div class="bigstat"><span>Уникальных</span><b>${state.history.length}</b></div></div><h2 style="margin:15px 0 4px;font-size:16px">Таблица шансов</h2>${DROP_TABLE.map(x=>{const got=state.rareCounts[x.key]||0;const p=total?Math.round(got/total*1000)/10:0;return `<div class="barrow"><span>${x.label}</span><div class="bar"><i style="width:${Math.min(100,p/Math.max(x.pct,0.001)*100)}%"></i></div><b>${x.pct}%</b></div>`}).join('')}</section>`;}
function settingsView(){return `<section class="hero"><span class="eyebrow">CONTROL</span><h1>Настройки</h1><p>Подключение Worker, звук и локальный прогресс.</p></section><section class="section"><div class="row"><div><strong>Worker API</strong><small>${API_BASE?esc(API_BASE):'Не указан'}</small></div><button id="apiBtn" class="chip">Изменить</button></div><div class="row" style="margin-top:8px"><div><strong>Звук</strong><small>Сигнал после генерации</small></div><button id="soundBtn" class="chip ${state.sound?'active':''}">${state.sound?'ВКЛ':'ВЫКЛ'}</button></div><div class="row" style="margin-top:8px"><div><strong>Сбросить локальные данные</strong><small>Коллекция, рекорд и статистика</small></div><button id="resetBtn" class="chip">Сброс</button></div></section>`;}
function navigate(next){page=next;const title={generator:'Генератор',catalog:'Каталог',collection:'Коллекция',rating:'Рейтинг',stats:'Стата',settings:'Настройки'}[next]||'Генератор';document.getElementById('pageTitle').textContent=title;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===next));const view=document.getElementById('appView');view.innerHTML={generator:generatorView,catalog:catalogView,collection:collectionView,rating:ratingView,stats:statsView,settings:settingsView}[next]();bindPage();window.scrollTo({top:0,behavior:'smooth'});if(next==='catalog')renderCatalog();if(next==='rating')loadLeaderboard();}
function bindPage(){
  document.getElementById('generateBtn')?.addEventListener('click',generate);
  document.getElementById('shareBtn')?.addEventListener('click',share);
  document.getElementById('settingsBtn')?.addEventListener('click',()=>navigate('settings'));
  document.getElementById('openCollection')?.addEventListener('click',()=>navigate('collection'));
  document.querySelectorAll('[data-rarity]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#rarityChips .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderCatalog();}));
  document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#sortChips .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderCatalog();}));
  document.getElementById('search')?.addEventListener('input',renderCatalog);
  document.getElementById('sendScore')?.addEventListener('click',sendScore);
  document.getElementById('nick')?.addEventListener('input',e=>{state.nick=e.target.value;save();});
  document.getElementById('apiBtn')?.addEventListener('click',()=>{const v=prompt('Вставь URL Cloudflare Worker',API_BASE);if(v!==null){try{localStorage.setItem('nexus_api',v.trim().replace(/\/$/,''));location.reload();}catch{}}});
  document.getElementById('soundBtn')?.addEventListener('click',()=>{state.sound=!state.sound;save();navigate('settings');});
  document.getElementById('resetBtn')?.addEventListener('click',async()=>{if(!confirm('Удалить локальную коллекцию и статистику?'))return;state.attempts=0;state.best=0;state.history=[];state.rareCounts={common:0,uncommon:0,rare:0,epic:0,legendary:0,mythic:0};state.current=null;current=null;usedCache.clear();try{localStorage.removeItem(STORAGE_KEY);}catch{};navigate('generator');toast('Локальные данные сброшены');});
}
async function generate(){
  if(rolling)return;rolling=true;const btn=document.getElementById('generateBtn'),stage=document.getElementById('stage'),main=document.getElementById('numberMain');if(btn)btn.disabled=true;stage?.classList.add('roll');
  const started=Date.now();
  const interval=setInterval(()=>{if(main)main.innerHTML='<div class="country-mark">RUSSIA</div><div class="number">+7 9'+String(rand(1e8)).padStart(8,'0').replace(/(\d{3})(\d{3})(\d{2})$/,'$1 $2 $3')+'</div><div class="nexus-mark">N</div>';},65);
  let result;
  try{
    if(API_BASE){
      const rr=await fetch(API_BASE+'/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:state.playerId})});
      if(rr.ok){const data=await rr.json();if(data.ok)result=data.result;}
    }
    if(!result)result=await generateUniqueLocal();
  }catch{result=await generateUniqueLocal();}
  const wait=Math.max(850-Date.now()+started,0);setTimeout(()=>{
    clearInterval(interval);current=result;state.current=result;state.attempts++;state.best=Math.max(state.best,Number(result.price||0));state.rareCounts[result.rarityKey]=(state.rareCounts[result.rarityKey]||0)+1;state.history.unshift(result);state.history=state.history.slice(0,250);save();play(result.rarityKey==='mythic'||result.rarityKey==='legendary'?'rare':'normal');rolling=false;navigate('generator');toast(result.rarityKey==='mythic'?'МИФИЧЕСКИЙ НОМЕР!':'Номер сгенерирован');},wait);
}
function play(kind){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);const t=c.currentTime;o.type='sine';o.frequency.value=kind==='rare'?760:290;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+(kind==='rare'?.36:.16));o.start(t);o.stop(t+(kind==='rare'?.4:.2));}catch{}}
async function share(){if(!current)return;const text=`Я выбил ${current.number} — ${money(current.price)} · ${current.rarity} · шанс ${current.chancePct}%. Nexus Number`;try{if(navigator.share){await navigator.share({title:'Nexus Number',text});return;}await navigator.clipboard.writeText(text);toast('Результат скопирован');}catch{toast('Не удалось поделиться');}}
async function sendScore(){if(!current){toast('Сначала сгенерируй номер');return;}const input=document.getElementById('nick');const nick=(input?.value||state.nick||'Игрок').trim().slice(0,20)||'Игрок';state.nick=nick;save();const s=document.getElementById('ratingStatus');if(!API_BASE){if(s)s.textContent='Локальный режим: подключи Worker для общего рейтинга.';toast('Worker не подключён');return;}if(s)s.textContent='Отправляем…';try{const rr=await fetch(API_BASE+'/api/score',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playerId:state.playerId,nickname:nick,number:current.number,digits:current.digits,price:current.price,rarity:current.rarityKey,pattern:current.pattern})});const data=await rr.json().catch(()=>({}));if(!rr.ok||!data.ok)throw new Error(data.error||'bad');if(s)s.textContent='Результат записан в общий рейтинг.';await loadLeaderboard();toast('В рейтинг отправлено');}catch(e){if(s)s.textContent='Не удалось записать результат. Проверь Worker.';toast('Ошибка Worker');}}
function openMenu(v){document.getElementById('menuOverlay').classList.toggle('hidden',!v);document.getElementById('menuOverlay').setAttribute('aria-hidden',v?'false':'true');}

document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
document.getElementById('menuBtn').addEventListener('click',()=>openMenu(true));
document.getElementById('closeMenu').addEventListener('click',()=>openMenu(false));
document.getElementById('menuOverlay').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){openMenu(false);navigate(b.dataset.page);}});
document.getElementById('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';document.documentElement.style.setProperty('--bg',state.theme==='light'?'#d6d9df':'#202126');document.documentElement.style.setProperty('--bg2',state.theme==='light'?'#cdd1d8':'#1a1b20');save();});

if(!current){current={number:'+7 999 000 00 00',digits:[9,9,9,0,0,0,0,0,0,0],rarityKey:'common',rarity:'Обычный',rarityPct:92,oneIn:'1.09 к 1',pattern:'Случайная',type:'random',price:500,chancePct:92};state.current=current;save();}
navigate('generator');
window.NEXUS_NUMBER_BOOTED=true;
})();
