const KEY = "nexus_number_v3";
const API_BASE = window.NEXUS_NUMBER_API || "";
const COUNTRIES = {
  ru: { name:"Россия", prefix:"+7", flag:"ru", format:d=>`+7 ${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]}${d[5]} ${d[6]}${d[7]} ${d[8]}${d[9]}` },
  kz: { name:"Казахстан", prefix:"+7", flag:"kz", format:d=>`+7 ${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]}${d[5]} ${d[6]}${d[7]} ${d[8]}${d[9]}` },
  us: { name:"США", prefix:"+1", flag:"us", format:d=>`+1 ${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]}${d[5]} ${d[6]}${d[7]} ${d[8]}${d[9]}` },
  uk: { name:"Великобритания", prefix:"+44", flag:"gb", format:d=>`+44 7${d[0]}${d[1]} ${d[2]}${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}${d[8]}${d[9]}` },
  de: { name:"Германия", prefix:"+49", flag:"de", format:d=>`+49 1${d[0]}${d[1]} ${d[2]}${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}${d[8]}${d[9]}` },
  fr: { name:"Франция", prefix:"+33", flag:"fr", format:d=>`+33 6 ${d[0]}${d[1]} ${d[2]}${d[3]} ${d[4]}${d[5]} ${d[6]}${d[7]}` }
};

const MODE_LABELS = {
  mixed:"Случайный", beautiful:"Красивый", repeat:"Повторы", mirror:"Зеркальный", stairs:"Лестница", jackpot:"Джекпот"
};

const DEMO_PLAYERS = [
  ["NexusPrime", 48700000, "+7 777 777 77 77"], ["PhoneLord", 18950000, "+7 900 000 00 00"],
  ["MOBILEX", 12640000, "+7 999 123 12 12"], ["Arctic", 8420000, "+1 888 888 88 88"],
  ["Seven", 6130000, "+7 911 111 11 11"], ["NeoUser", 3890000, "+44 777 123 45 67"],
  ["Lime", 2740000, "+7 922 100 00 01"], ["Pixel", 1980000, "+7 999 987 65 43"]
];

let state = loadState();
let current = state.current || null;
let page = "generator";
let generationTimer = null;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    const base = {country:"ru",mode:"mixed",sound:true,theme:"dark",history:[],attempts:0,best:0,rare:0,playerId:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),current:null};
    return Object.assign(base, saved || {});
  }catch{
    return {country:"ru",mode:"mixed",sound:true,theme:"dark",history:[],attempts:0,best:0,rare:0,playerId:String(Date.now())+Math.random(),current:null};
  }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function money(n){ return `${Number(n||0).toLocaleString("ru-RU")} ₽`; }
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
function rand(n=10){ return Math.floor(Math.random()*n); }
function digits10(){ return Array.from({length:10},()=>rand(10)); }

function pick(arr){ return arr[rand(arr.length)]; }
function makeDigits(mode){
  let d = digits10();
  if(mode === "repeat"){
    const a=rand(10), b=rand(10), c=rand(10); d=[a,a,b,b,c,c,b,b,a,a];
  }else if(mode === "mirror"){
    const a=Array.from({length:5},()=>rand(10)); d=[...a,...a.slice().reverse()];
  }else if(mode === "stairs"){
    const start=rand(10), step=pick([1,1,1,2,9]); d=Array.from({length:10},(_,i)=>(start+i*step)%10);
  }else if(mode === "jackpot"){
    d=pick([
      [7,7,7,7,7,7,7,7,7,7],[8,8,8,8,8,8,8,8,8,8],[9,9,9,9,9,9,9,9,9,9],
      [1,2,3,4,5,6,7,8,9,0],[0,0,0,0,1,1,1,1,1,1],[1,1,2,2,3,3,4,4,5,5],
      [0,1,0,1,0,1,0,1,0,1],[7,7,0,0,7,7,0,0,7,7]
    ]);
  }else if(mode === "beautiful"){
    d=pick([
      [1,1,1,2,2,2,3,3,3,3],[7,7,7,0,0,0,7,7,7,7],[9,9,8,8,7,7,6,6,5,5],
      [1,2,3,4,4,3,2,1,0,0],[0,0,1,1,2,2,3,3,4,4],[5,5,5,1,1,1,8,8,8,8],
      [9,0,9,0,9,0,9,0,9,0],[6,6,1,6,6,1,6,6,1,1]
    ]);
  }else if(mode === "mixed"){
    const roll = Math.random();
    if(roll < .045) return makeDigits("jackpot");
    if(roll < .17) return makeDigits(pick(["beautiful","mirror","repeat","stairs"]));
  }
  return d;
}

function detect(d){
  const counts={}; d.forEach(x=>counts[x]=(counts[x]||0)+1);
  const groups=Object.values(counts).sort((a,b)=>b-a);
  const unique=new Set(d).size;
  let asc=0, desc=0;
  for(let i=1;i<d.length;i++){ if(d[i]===d[i-1]+1) asc++; if(d[i]===d[i-1]-1) desc++; }
  const exactReverse=d.slice(0,5).join("")===d.slice(5).reverse().join("");
  const halfRepeat=d.slice(0,5).join("")===d.slice(5).join("");
  const alternating=d.every((v,i)=>i<2 || v===d[i%2]);
  const doublePairs=Object.values(counts).filter(v=>v>=2).length>=3;
  const has777=d.join("").includes("777");
  const has123=d.join("").includes("123");
  const has000=d.join("").includes("000");
  if(groups[0]>=9) return {name:"Фулл-дубль", rarity:"mythic"};
  if(groups[0]>=7) return {name:"Монолит", rarity:"mythic"};
  if(exactReverse) return {name:"Зеркальный", rarity:"legendary"};
  if(halfRepeat) return {name:"Двойной блок", rarity:"legendary"};
  if(alternating) return {name:"Шахматный ритм", rarity:"epic"};
  if(groups[0]>=5) return {name:"Большой повтор", rarity:"epic"};
  if(Math.max(asc,desc)>=6) return {name:"Длинная лестница", rarity:"legendary"};
  if(Math.max(asc,desc)>=4) return {name:"Лестница", rarity:"epic"};
  if(doublePairs) return {name:"Сет из пар", rarity:"rare"};
  if(has777 || has000 || has123) return {name:"Счастливый блок", rarity:"rare"};
  if(unique<=5) return {name:"Мало разных цифр", rarity:"uncommon"};
  if(groups[0]>=3) return {name:"Тройка", rarity:"uncommon"};
  return {name:"Чистая комбинация", rarity:"common"};
}

function calcPrice(d){
  const counts={}; d.forEach(x=>counts[x]=(counts[x]||0)+1);
  const group=Object.values(counts);
  let score=500;
  group.forEach(c=>{
    if(c>=2) score += (c-1)*4500;
    if(c>=3) score += (c-2)*17000;
    if(c>=4) score += (c-3)*60000;
    if(c>=5) score += (c-4)*260000;
    if(c>=6) score += (c-5)*850000;
  });
  let asc=0,desc=0; for(let i=1;i<10;i++){if(d[i]===d[i-1]+1)asc++;if(d[i]===d[i-1]-1)desc++;}
  score += Math.max(asc,desc)*24000;
  if(d.slice(0,5).join("")===d.slice(5).reverse().join("")) score+=850000;
  if(d.slice(0,5).join("")===d.slice(5).join("")) score+=620000;
  if(d.every((v,i)=>i<2 || v===d[i%2])) score+=340000;
  if(d.join("").includes("777")) score+=75000;
  if(d.join("").includes("000")) score+=50000;
  if(d.join("").includes("123")) score+=40000;
  score += Math.max(0,10-new Set(d).size)*6500;
  return Math.round(Math.min(Math.max(score,500),49900000));
}

function rarityLabel(key){ return ({common:"Обычный",uncommon:"Необычный",rare:"Редкий",epic:"Эпический",legendary:"Легендарный",mythic:"Мифический"}[key] || "Обычный"); }
function rarityClass(key){ return `rarity-${key}`; }
function buildResult(d){
  const c=COUNTRIES[state.country]; const pattern=detect(d); const price=calcPrice(d);
  return {digits:d,number:c.format(d),price,pattern:pattern.name,rarity:rarityLabel(pattern.rarity),rarityClass:rarityClass(pattern.rarity),country:c.name,prefix:c.prefix,time:Date.now()};
}

function setCurrent(result, addHistory=true){
  current=result; state.current=result; state.attempts++; state.best=Math.max(state.best,result.price);
  if(result.price>=100000) state.rare++;
  if(addHistory){ state.history.unshift(result); state.history=state.history.slice(0,60); }
  save();
}

function playSound(kind){
  if(!state.sound) return;
  try{
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    const ctx=new C(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination);
    const now=ctx.currentTime; o.type="triangle"; o.frequency.value=kind==="win"?640:220; g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(.045,now+.02); g.gain.exponentialRampToValueAtTime(.0001,now+(kind==="win"?.32:.14)); o.start(now); o.stop(now+(kind==="win"?.36:.17));
  }catch{}
}

function formatNumberForCard(number){
  const parts=number.split(" ");
  if(state.country === "ru" || state.country === "kz") return `<div class="prefix">+7</div><div class="main-digits">${esc(parts.slice(1).join(" "))}</div><div class="mobile-mark">N</div>`;
  return `<div class="prefix">${esc(parts[0])}</div><div class="main-digits">${esc(parts.slice(1).join(" "))}</div><div class="mobile-mark">N</div>`;
}

function generatorView(){
  if(!current){ const d=makeDigits(state.mode); current=buildResult(d); state.current=current; save(); }
  const r=current;
  return `
    <section class="hero-head">
      <div><span class="eyebrow">MOBILE NUMBER HUNT</span><h1>Выбей номер дороже всех</h1><p>Охоться за редкими комбинациями мобильных номеров. Чем красивее шаблон — тем выше игровая стоимость.</p></div>
      <div class="best-pill"><span>ЛУЧШИЙ</span><b>${money(state.best)}</b></div>
    </section>
    <section class="gloss-card generator-card" id="generatorCard">
      <div class="country-row"><div class="country-badge"><span class="flag"></span><div><span class="micro">Страна</span><div>${esc(r.country)} · ${esc(r.prefix)}</div></div></div><select id="countrySelect" class="country-select">${Object.entries(COUNTRIES).map(([k,c])=>`<option value="${k}" ${state.country===k?"selected":""}>${esc(c.name)} · ${esc(c.prefix)}</option>`).join("")}</select></div>
      <div class="phone-stage" id="phoneStage">
        <div class="phone-label">VIRTUAL MOBILE NUMBER</div>
        <div class="mobile-card"><div class="mobile-topline"><span>NEXUS NUMBER</span><span>${esc(r.country).toUpperCase()}</span></div><div class="mobile-main" id="mobileMain">${formatNumberForCard(r.number)}</div><div class="mobile-bottom"><span>${esc(r.pattern).toUpperCase()}</span><span>GAME ITEM</span></div></div>
        <div class="rarity-bar"><div class="pattern">Комбинация: <b>${esc(r.pattern)}</b></div><span class="rarity-tag ${r.rarityClass}">${esc(r.rarity)}</span></div>
        <div class="value-row"><span>Игровая стоимость номера</span><b>${money(r.price)}</b></div>
      </div>
      <div class="action-stack"><button id="generateBtn" class="main-action">СГЕНЕРИРОВАТЬ НОМЕР<span class="small">БЫСТРАЯ ОХОТА ЗА РЕДКОСТЬЮ</span></button><div class="sub-row"><button id="settingsBtn" class="sub-action">Параметры генерации</button><button id="shareBtn" class="sub-action">Поделиться результатом</button></div></div>
      <div class="stats-strip"><div class="stat-box"><span>Генерации</span><b>${state.attempts}</b></div><div class="stat-box"><span>Редкие</span><b>${state.rare}</b></div><div class="stat-box"><span>Рекорд</span><b>${money(state.best).replace(" ₽","")}</b></div></div>
    </section>
    <section class="section-card"><div class="section-title"><h2>Стиль охоты</h2><span class="muted">${esc(MODE_LABELS[state.mode])}</span></div><div class="chips">${Object.entries(MODE_LABELS).map(([k,v])=>`<button class="chip ${state.mode===k?"active":""}" data-mode="${k}">${v}</button>`).join("")}</div></section>
    <section class="section-card"><div class="section-title"><h2>Последние выбитые</h2><button id="openHistory" class="chip">Все</button></div><div class="mini-list">${historyRows(4)}</div></section>
  `;
}

function historyRows(limit=20){
  if(!state.history.length) return `<div class="collection-empty">Здесь появятся твои номера после генерации.</div>`;
  return state.history.slice(0,limit).map(x=>`<div class="list-row"><div><strong>${esc(x.number)}</strong><small>${esc(x.rarity)} · ${esc(x.pattern)}</small></div><b>${money(x.price)}</b></div>`).join("");
}

function catalogSeed(){
  const modes=["jackpot","beautiful","mirror","repeat","stairs"];
  const arr=[];
  for(let i=0;i<48;i++){
    const old=state.mode; state.mode=modes[i%modes.length]; const d=makeDigits(state.mode); state.mode=old; arr.push(buildResult(d));
  }
  return arr.sort((a,b)=>b.price-a.price);
}
let catalog = catalogSeed();
function catalogView(){
  return `<section class="view-head"><span class="eyebrow">MOBILE MARKET</span><h1>Каталог редкости</h1><p>Здесь собраны разные шаблоны. Комбинации генерируются из огромного пространства вариантов, а цена зависит от редкости.</p></section>
    <section class="section-card"><input id="catalogSearch" class="field" placeholder="Поиск по номеру или комбинации" autocomplete="off"><div class="range-row"><input id="minPrice" class="field" type="number" min="0" placeholder="Цена от"><input id="maxPrice" class="field" type="number" min="0" placeholder="Цена до"></div><div class="sort-row"><button class="chip active" data-sort="price">Дороже → дешевле</button><button class="chip" data-sort="cheap">Дешевле → дороже</button><button class="chip" data-sort="rarity">По редкости</button></div></section>
    <section class="catalog-grid" id="catalogList"></section>`;
}
function renderCatalog(){
  const q=(document.querySelector("#catalogSearch")?.value||"").trim().toLowerCase(); const min=Number(document.querySelector("#minPrice")?.value||0); const max=Number(document.querySelector("#maxPrice")?.value||0); const sort=document.querySelector(".sort-row .active")?.dataset.sort||"price";
  let data=catalog.filter(x=>(!q||x.number.toLowerCase().includes(q)||x.pattern.toLowerCase().includes(q))&&x.price>=min&&(!max||x.price<=max));
  if(sort==="cheap") data.sort((a,b)=>a.price-b.price); else if(sort==="rarity") data.sort((a,b)=>rarityWeight(b.rarity)-rarityWeight(a.rarity)||b.price-a.price); else data.sort((a,b)=>b.price-a.price);
  const el=document.querySelector("#catalogList"); if(!el)return;
  el.innerHTML=data.slice(0,48).map((x,i)=>`<div class="catalog-item"><div class="catalog-preview">${esc(shortNumber(x.number))}</div><div><strong>${esc(x.pattern)}</strong><small>${esc(x.rarity)} · лот #${i+1}</small></div><div class="catalog-price"><b>${money(x.price)}</b><button data-pick="${i}" data-id="${encodeURIComponent(JSON.stringify(x))}">Открыть</button></div></div>`).join("") || `<div class="collection-empty">По этим фильтрам номеров не найдено.</div>`;
  el.querySelectorAll("[data-id]").forEach(btn=>btn.addEventListener("click",()=>{try{const item=JSON.parse(decodeURIComponent(btn.dataset.id)); state.country=Object.keys(COUNTRIES).find(k=>COUNTRIES[k].name===item.country)||state.country; setCurrent(item,false); save(); navigate("generator"); toast("Номер открыт в генераторе");}catch{}}));
}
function shortNumber(n){ return n.replace(/\s+/g," "); }
function rarityWeight(r){ return ({Обычный:1,Необычный:2,Редкий:3,Эпический:4,Легендарный:5,Мифический:6}[r]||0); }

function collectionView(){
  return `<section class="view-head"><span class="eyebrow">MY NUMBERS</span><h1>Коллекция</h1><p>Все номера, которые ты выбил за эту сессию на устройстве.</p></section><section class="section-card"><div class="two-stat"><div class="big-stat"><span>Собрано номеров</span><b>${state.history.length}</b></div><div class="big-stat"><span>Сумма коллекции</span><b>${money(state.history.reduce((a,x)=>a+x.price,0))}</b></div></div><div class="collection-grid">${historyRows(60)}</div></section>`;
}

function ratingView(){
  return `<section class="view-head"><span class="eyebrow">GLOBAL HUNT</span><h1>Лидерборд</h1><p>Главная гонка — кто выбьет самый дорогой мобильный номер.</p></section><section class="section-card"><div id="ratingList" class="leaderboard"></div><div class="leader-tools"><input id="nickname" class="field" maxlength="16" placeholder="Твой ник" value="${esc(localStorage.getItem("nexus_nn_nick")||"")}"><button id="submitScore" class="primary-small">В рейтинг</button></div><small id="ratingStatus" class="muted">Общий рейтинг подключается через Cloudflare Worker. Без Worker работает локальная витрина.</small></section>`;
}
async function loadRating(){
  const el=document.querySelector("#ratingList"); if(!el)return;
  if(!API_BASE){ el.innerHTML=DEMO_PLAYERS.map((p,i)=>rankRow(i+1,p[0],p[1],p[2],false)).join("")+rankRow(9,"Ты",state.best,current?.number||"—",false,true); return; }
  try{ const res=await fetch(API_BASE+"/api/leaderboard"); if(!res.ok)throw new Error(); const data=await res.json(); el.innerHTML=(data.items||[]).map((x,i)=>rankRow(i+1,x.nickname,x.price,x.number||"",true)).join("")||`<div class="collection-empty">Пока нет результатов.</div>`; }
  catch{ el.innerHTML=DEMO_PLAYERS.map((p,i)=>rankRow(i+1,p[0],p[1],p[2],false)).join("")+rankRow(9,"Ты",state.best,current?.number||"—",false,true); const s=document.querySelector("#ratingStatus"); if(s)s.textContent="Worker сейчас недоступен — показана локальная витрина."; }
}
function rankRow(rank,name,price,num,remote,me=false){ return `<div class="rank-card ${rank<=3?"top":""}"><div class="rank-num">#${rank}</div><div><strong>${esc(name)}${me?" · ты":""}</strong><small>${esc(num||"Результат игрока")}${remote?" · общий":" · пример"}</small></div><div class="rank-value">${money(price)}</div></div>`; }

function statsView(){
  const total=state.attempts||0, rare=state.rare||0, collection=state.history.length; const max=state.best||0;
  const rows=["Обычный","Необычный","Редкий","Эпический","Легендарный","Мифический"];
  return `<section class="view-head"><span class="eyebrow">PROFILE DATA</span><h1>Статистика</h1><p>Все основные показатели твоей охоты за комбинациями.</p></section><section class="section-card"><div class="progress"><i style="width:${Math.min(100,Math.round(Math.log10(Math.max(total,1)+1)*18))}%"></i></div><small class="muted">Уровень ${Math.max(1,Math.floor(total/25)+1)} · ${total} генераций</small><div class="two-stat"><div class="big-stat"><span>Самый дорогой</span><b>${money(max)}</b></div><div class="big-stat"><span>Редких номеров</span><b>${rare}</b></div></div></section><section class="section-card"><div class="section-title"><h2>Редкость выбитых</h2><span class="muted">${collection} всего</span></div>${rows.map((r,i)=>{const count=state.history.filter(x=>x.rarity===r).length; const pct=collection?Math.round(count/collection*100):0; return `<div class="metric"><span>${r}</span><div class="progress"><i style="width:${pct}%"></i></div><b>${count}</b></div>`}).join("")}</section>`;
}

function settingsView(){
  return `<section class="view-head"><span class="eyebrow">CONTROL ROOM</span><h1>Настройки</h1><p>Все основные параметры генератора — здесь, без прыжков страницы.</p></section><section class="section-card"><div class="setting-list"><div class="setting-row"><div><strong>Страна генерации</strong><small>${esc(COUNTRIES[state.country].name)} · ${esc(COUNTRIES[state.country].prefix)}</small></div><select id="settingsCountry" class="setting-control">${Object.entries(COUNTRIES).map(([k,c])=>`<option value="${k}" ${state.country===k?"selected":""}>${esc(c.name)} · ${esc(c.prefix)}</option>`).join("")}</select></div><div class="setting-row"><div><strong>Звук генерации</strong><small>Сигнал после редкого результата</small></div><button id="soundToggle" class="toggle ${state.sound?"on":""}"><i></i></button></div><div class="setting-row"><div><strong>Текущий стиль</strong><small>${esc(MODE_LABELS[state.mode])}</small></div><button id="settingsStyle" class="chip">Изменить</button></div><div class="setting-row"><div><strong>Сбросить локальные данные</strong><small>История, рекорды и статистика на этом устройстве</small></div><button id="resetData" class="chip">Сброс</button></div></div></section>`;
}

function navigate(next){
  page=next; const titles={generator:"Генератор",catalog:"Каталог",collection:"Коллекция",rating:"Лидерборд",stats:"Статистика",settings:"Настройки"}; document.querySelector("#pageTitle").textContent=titles[next]||"Генератор";
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===next));
  const view=document.querySelector("#appView"); view.innerHTML={generator:generatorView,catalog:catalogView,collection:collectionView,rating:ratingView,stats:statsView,settings:settingsView}[next](); bindPage(); window.scrollTo({top:0,behavior:"smooth"}); if(next==="catalog")renderCatalog(); if(next==="rating")loadRating();
}

function bindPage(){
  document.querySelector("#generateBtn")?.addEventListener("click", generateAnimated);
  document.querySelector("#shareBtn")?.addEventListener("click", shareCurrent);
  document.querySelector("#settingsBtn")?.addEventListener("click", openSettingsModal);
  document.querySelector("#countrySelect")?.addEventListener("change", e=>{state.country=e.target.value; const d=makeDigits(state.mode); setCurrent(buildResult(d)); render(); toast("Страна генерации изменена");});
  document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{state.mode=b.dataset.mode;save(); if(page==="generator")render(); toast(`Стиль: ${MODE_LABELS[state.mode]}`);}));
  document.querySelector("#openHistory")?.addEventListener("click",()=>navigate("collection"));
  document.querySelectorAll("[data-sort]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-sort]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderCatalog();}));
  ["catalogSearch","minPrice","maxPrice"].forEach(id=>document.querySelector("#"+id)?.addEventListener("input",renderCatalog));
  document.querySelector("#submitScore")?.addEventListener("click", submitScore);
  document.querySelector("#settingsCountry")?.addEventListener("change",e=>{state.country=e.target.value; if(current){current=buildResult(current.digits||digits10()); setCurrent(current,false);} save(); navigate("generator"); toast("Настройки сохранены")});
  document.querySelector("#soundToggle")?.addEventListener("click",()=>{state.sound=!state.sound;save();navigate("settings")});
  document.querySelector("#settingsStyle")?.addEventListener("click",openSettingsModal);
  document.querySelector("#resetData")?.addEventListener("click",()=>{if(confirm("Сбросить историю и статистику?")){state.history=[];state.attempts=0;state.best=0;state.rare=0;state.current=null;save();current=null;navigate("generator");toast("Данные сброшены")}});
}

function render(){ navigate(page); }

function generateAnimated(){
  if(generationTimer) return;
  const btn=document.querySelector("#generateBtn"), stage=document.querySelector("#phoneStage"), main=document.querySelector("#mobileMain"); if(!btn||!stage||!main)return;
  btn.disabled=true; stage.classList.add("rolling"); const started=Date.now();
  let ticks=0;
  generationTimer=setInterval(()=>{
    ticks++;
    const temp=buildResult(digits10());
    main.innerHTML=formatNumberForCard(temp.number);
    if(Date.now()-started>760){ clearInterval(generationTimer); generationTimer=null; const result=buildResult(makeDigits(state.mode)); setCurrent(result); playSound(result.price>=100000?"win":"roll"); btn.disabled=false; stage.classList.remove("rolling"); render(); if(result.price>=100000)toast(`Редкий номер: ${money(result.price)}`); else toast("Новый номер сгенерирован"); }
  },70);
}

async function shareCurrent(){
  if(!current)return;
  const text=`Я выбил ${current.number} — ${money(current.price)}. Комбинация: ${current.pattern}. Nexus Number`;
  if(navigator.share){try{await navigator.share({title:"Nexus Number",text});return}catch{}}
  try{await navigator.clipboard.writeText(text);toast("Результат скопирован")}catch{toast("Не удалось скопировать")}
}

async function submitScore(){
  if(!current){toast("Сначала сгенерируй номер");return}
  const input=document.querySelector("#nickname"); const name=(input?.value||"Игрок").trim().slice(0,16)||"Игрок"; localStorage.setItem("nexus_nn_nick",name);
  const status=document.querySelector("#ratingStatus");
  if(!API_BASE){status.textContent="Локальный режим: подключи Worker, чтобы отправлять результат в общий рейтинг.";toast("Локальный рейтинг");return}
  status.textContent="Отправляем результат…";
  try{const res=await fetch(API_BASE+"/api/score",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId:state.playerId,nickname:name,number:current.number,digits:current.digits,price:current.price})});if(!res.ok)throw new Error();status.textContent="Результат отправлен в общий рейтинг.";await loadRating();toast("В рейтинг отправлено")}catch{status.textContent="Worker недоступен. Результат сохранён только локально.";toast("Не удалось отправить")}
}

function openSettingsModal(){
  const existing=document.querySelector("#settingsModal"); if(existing){existing.remove();return;}
  const modal=document.createElement("div"); modal.id="settingsModal"; modal.className="modal"; modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><span class="micro">GENERATOR CONTROL</span><h2>Параметры</h2></div><button class="close-btn" data-close>×</button></div><div class="modal-grid"><div class="modal-row"><label>Страна</label><select id="mCountry">${Object.entries(COUNTRIES).map(([k,c])=>`<option value="${k}" ${state.country===k?"selected":""}>${esc(c.name)} · ${esc(c.prefix)}</option>`).join("")}</select></div><div class="modal-row"><label>Стиль</label><div class="chips">${Object.entries(MODE_LABELS).map(([k,v])=>`<button class="chip ${state.mode===k?"active":""}" data-modal-mode="${k}">${v}</button>`).join("")}</div></div></div><div class="modal-actions"><button class="sub-action" data-close>Закрыть</button><button class="main-action" id="applyModal"><span>Применить</span></button></div></div>`;
  document.body.appendChild(modal); modal.querySelectorAll("[data-modal-mode]").forEach(b=>b.addEventListener("click",()=>{modal.querySelectorAll("[data-modal-mode]").forEach(x=>x.classList.remove("active"));b.classList.add("active");modal.dataset.mode=b.dataset.modalMode})); modal.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>modal.remove())); modal.querySelector("#applyModal").addEventListener("click",()=>{state.country=modal.querySelector("#mCountry").value;state.mode=modal.dataset.mode||state.mode;save();modal.remove();navigate("generator");toast("Параметры применены")});
}

function toast(msg){const el=document.querySelector("#toast"); if(!el)return; el.textContent=msg; el.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),1600);}

// Main navigation
 document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
 document.querySelector("#menuBtn").addEventListener("click",()=>{document.querySelector("#menuOverlay").classList.remove("hidden")});
 document.querySelector("#closeMenu").addEventListener("click",()=>document.querySelector("#menuOverlay").classList.add("hidden"));
 document.querySelector("#menuOverlay").addEventListener("click",e=>{const btn=e.target.closest("[data-page]"); if(btn){document.querySelector("#menuOverlay").classList.add("hidden");navigate(btn.dataset.page)}});
 document.querySelector("#themeBtn").addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";document.body.classList.toggle("light",state.theme==="light");save()});
 document.body.classList.toggle("light",state.theme==="light");
 navigate("generator");
