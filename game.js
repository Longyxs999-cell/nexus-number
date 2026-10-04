const KEY="nexus_number_v3";
const state=JSON.parse(localStorage.getItem(KEY)||"null")||{
  country:"ru",mode:"mixed",history:[],best:0,attempts:0,rare:0,streak:0,bestStreak:0,theme:"dark",
  playerId:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),nickname:""
};
if(!state.playerId)state.playerId=String(Date.now()+Math.random());
let current=null, rolling=false, board="price";

const COUNTRIES={
 ru:{name:"Россия",code:"RU",prefix:"+7",make:d=>`${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`},
 kz:{name:"Казахстан",code:"KZ",prefix:"+7",make:d=>`${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`},
 ua:{name:"Украина",code:"UA",prefix:"+380",make:d=>`${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`},
 by:{name:"Беларусь",code:"BY",prefix:"+375",make:d=>`${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`},
 us:{name:"США",code:"US",prefix:"+1",make:d=>`${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`},
 uk:{name:"Великобритания",code:"GB",prefix:"+44",make:d=>`7${d[0]}${d[1]} ${d[2]}${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`},
 de:{name:"Германия",code:"DE",prefix:"+49",make:d=>`15${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]}${d[5]}${d[6]}${d[7]}`}
};

const RARITIES=[
 {min:0,name:"Обычный",cls:"common"},
 {min:2500,name:"Необычный",cls:"uncommon"},
 {min:10000,name:"Редкий",cls:"rare"},
 {min:50000,name:"Эпический",cls:"epic"},
 {min:250000,name:"Легендарный",cls:"legendary"},
 {min:1000000,name:"Мифический",cls:"mythic"}
];
const PATTERNS=[
 ["Двойные пары",d=>countKinds(d,2)>=2,6500],
 ["Тройной блок",d=>maxCount(d)>=3,12000],
 ["Четвёрка",d=>maxCount(d)>=4,45000],
 ["Пятёрка",d=>maxCount(d)>=5,150000],
 ["Зеркало",d=>d.slice(0,4).join("")===d.slice(4,8).reverse().join(""),85000],
 ["Палиндром",d=>d.join("")===d.slice().reverse().join(""),400000],
 ["Лесенка вверх",d=>longestRun(d,1)>=4,28000],
 ["Лесенка вниз",d=>longestRun(d,-1)>=4,28000],
 ["Чёткий блок",d=>sameBlock(d),18000],
 ["Все разные",d=>new Set(d).size===8,8500],
 ["Много нулей",d=>d.filter(x=>x===0).length>=3,17000],
 ["Семёрки",d=>d.filter(x=>x===7).length>=3,33000],
 ["Восьмёрки",d=>d.filter(x=>x===8).length>=3,33000],
 ["Девятки",d=>d.filter(x=>x===9).length>=3,30000],
 ["Чередование",d=>alternating(d),21000],
 ["Две половины",d=>d.slice(0,4).join("")===d.slice(4).join(""),50000]
];

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function rand(n=10){return Math.floor(Math.random()*n)}
function digits(){return Array.from({length:8},()=>rand())}
function maxCount(d){const m={};d.forEach(x=>m[x]=(m[x]||0)+1);return Math.max(...Object.values(m))}
function countKinds(d,n){const m={};d.forEach(x=>m[x]=(m[x]||0)+1);return Object.values(m).filter(x=>x>=n).length}
function longestRun(d,dir){let best=1,run=1;for(let i=1;i<d.length;i++){if(d[i]===d[i-1]+dir)run++;else run=1;best=Math.max(best,run)}return best}
function sameBlock(d){return d.slice(0,2).join("")===d.slice(2,4).join("")||d.slice(4,6).join("")===d.slice(6,8).join("")}
function alternating(d){for(let i=2;i<d.length;i++)if(d[i]!==d[i-2])return false;return true}

function makeStyled(mode){
  let d=digits();
  if(mode==="repeat"){const a=rand(),b=rand();d=[a,a,b,b,a,a,b,b]}
  if(mode==="mirror"){const a=Array.from({length:4},()=>rand());d=[...a,...a.slice().reverse()]}
  if(mode==="stairs"){const start=rand(5);d=Array.from({length:8},(_,i)=>(start+i)%10)}
  if(mode==="blocks"){const a=rand(),b=rand(),c=rand();d=[a,a,a,b,b,c,c,c]}
  if(mode==="lucky"){
    const templates=[
      [7,7,7,7,7,7,7,7],[8,8,8,8,8,8,8,8],[1,2,3,4,4,3,2,1],
      [9,9,9,8,8,8,9,9],[0,0,0,7,7,7,0,0],[1,1,1,1,2,2,2,2]
    ]; d=templates[rand(templates.length)].slice()
  }
  if(mode==="mixed" && Math.random()<.52){
    const modes=["repeat","mirror","stairs","blocks","lucky"];d=makeStyled(modes[rand(modes.length)])
  }
  return d;
}
function score(d){
  let s=100;
  const m={};d.forEach(x=>m[x]=(m[x]||0)+1);
  Object.values(m).forEach(c=>{if(c>=2)s+=(c-1)*1500;if(c>=3)s+=(c-2)*6500;if(c>=4)s+=(c-3)*22000;if(c>=5)s+=(c-4)*80000;if(c>=6)s+=(c-5)*250000});
  for(const [name,test,bonus] of PATTERNS)if(test(d))s+=bonus;
  const sum=d.reduce((a,b)=>a+b,0); if(sum===36)s+=90000;if(sum===42)s+=120000;
  if(d[0]===0)s+=500;
  return Math.min(Math.max(Math.round(s),100),99999999);
}
function rarity(price){let r=RARITIES[0];for(const x of RARITIES)if(price>=x.min)r=x;return r}
function pattern(d){
  const found=PATTERNS.filter(x=>x[1](d)).sort((a,b)=>b[2]-a[2]);
  return found.length?found[0][0]:"Случайная комбинация";
}
function formatted(d){return COUNTRIES[state.country].make(d)}
function generate(){
  if(rolling)return;
  rolling=true;
  const d=makeStyled(state.mode),p=score(d),r=rarity(p);
  current={digits:d,number:formatted(d),price:p,rarity:r.name,rarityClass:r.cls,pattern:pattern(d)};
  state.attempts++;state.best=Math.max(state.best,p);
  if(p>=10000)state.rare++; else state.streak=0;
  if(p>=10000)state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);
  state.history.unshift({number:current.number,prefix:COUNTRIES[state.country].prefix,price:p,rarity:r.name,pattern:current.pattern,at:Date.now()});
  state.history=state.history.slice(0,50);save();
  animateNumber(current);
}
function animateNumber(result){
  const display=document.querySelector("#numberDisplay"), stage=document.querySelector("#numberStage");
  stage.classList.add("rolling");
  let ticks=0,total=13;
  const timer=setInterval(()=>{
    const temp=Array.from({length:8},()=>rand());
    display.textContent=COUNTRIES[state.country].make(temp);
    ticks++;
    if(ticks>=total){
      clearInterval(timer);display.textContent=result.number;
      stage.classList.remove("rolling");rolling=false;render();loadLeaderboard();
    }
  },65);
}
function render(){
  if(!current){
    const d=makeStyled("mixed"),p=score(d),r=rarity(p);
    current={digits:d,number:formatted(d),price:p,rarity:r.name,rarityClass:r.cls,pattern:pattern(d)};
  }
  document.querySelector("#numberDisplay").textContent=current.number;
  document.querySelector("#prefix").textContent=COUNTRIES[state.country].prefix;
  document.querySelector("#regionLabel").textContent=`${COUNTRIES[state.country].code} · MOBILE`;
  document.querySelector("#priceValue").textContent=money(current.price);
  document.querySelector("#bestScore").textContent=money(state.best);
  document.querySelector("#attempts").textContent=state.attempts.toLocaleString("ru-RU");
  document.querySelector("#rareCount").textContent=state.rare.toLocaleString("ru-RU");
  document.querySelector("#streak").textContent=state.streak;
  document.querySelector("#level").textContent=Math.max(1,Math.floor(state.attempts/25)+1);
  const badge=document.querySelector("#rarityBadge");badge.textContent=current.rarity.toUpperCase();badge.className="rarity "+current.rarityClass;
  document.querySelector("#patternText").textContent=current.pattern;
  document.querySelector("#countrySelect").value=state.country;
  document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x.dataset.mode===state.mode));
  renderHistory();renderAchievements();renderCatalog();
}
function money(n){return Number(n||0).toLocaleString("ru-RU")+" ₽"}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderHistory(){
 const el=document.querySelector("#historyList");
 el.innerHTML=state.history.length?state.history.map(x=>`<div class="history-row"><div><b>${esc(x.prefix||"+7")} ${esc(x.number)}</b><small>${new Date(x.at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})} · ${esc(x.rarity)} · ${esc(x.pattern)}</small></div><div class="history-price">${money(x.price)}</div></div>`).join(""):`<div class="empty">Здесь появятся твои номера</div>`;
}
function buildCatalog(){
  const arr=[];
  const patterns=[
    ["77777777","Восемь семёрок"],["88888888","Восемь восьмёрок"],["99999999","Восемь девяток"],
    ["12344321","Зеркальная лестница"],["7654567","Лестница вниз"],["11223344","Четыре пары"],
    ["11112222","Два блока"],["12121212","Чередование"],["00007777","Нули + семёрки"],
    ["12345678","Полная лестница"],["87654321","Обратная лестница"],["12211221","Парный узор"],
    ["70007000","Три нуля"],["55555511","Шесть пятёрок"],["22223333","Два квартета"],
    ["98766789","Зеркальные пары"],["10000001","Рамка из единиц"],["77708888","Семёрка + восьмёрки"],
    ["31415926","Число-пасхалка"],["27182818","Число-пасхалка 2"],["20262026","Годовой паттерн"],
    ["11117777","Четвёрки"],["22228888","Смешанный квартет"],["90909090","Пульс"]
  ];
  patterns.forEach(([num,name],i)=>{
    const d=num.split("").map(Number),p=score(d),r=rarity(p);
    arr.push({num,name,price:p,rarity:r.name,cls:r.cls});
  });
  for(let i=0;i<60;i++){
    const d=makeStyled(["repeat","mirror","stairs","blocks","lucky"][i%5]),p=score(d),r=rarity(p);
    arr.push({num:d.join(""),name:pattern(d),price:p,rarity:r.name,cls:r.cls});
  }
  return arr.sort((a,b)=>b.price-a.price);
}
const CATALOG=buildCatalog();
function renderCatalog(){
 const q=(document.querySelector("#catalogSearch").value||"").trim().toLowerCase();
 const sort=document.querySelector("#sortCatalog").value;
 let arr=CATALOG.filter(x=>(x.num+" "+x.name+" "+x.rarity).toLowerCase().includes(q));
 if(sort==="price-asc")arr.sort((a,b)=>a.price-b.price);
 else if(sort==="rarity")arr.sort((a,b)=>rarityIndex(b.rarity)-rarityIndex(a.rarity)||b.price-a.price);
 else arr.sort((a,b)=>b.price-a.price);
 document.querySelector("#catalogCount").textContent=`${arr.length} вариантов`;
 document.querySelector("#catalogList").innerHTML=arr.slice(0,48).map(x=>`<div class="catalog-item"><span class="catalog-rarity ${x.cls}">${x.rarity}</span><div class="catalog-num">${x.num}</div><div class="catalog-name">${esc(x.name)}</div><div class="catalog-price">${money(x.price)}</div></div>`).join("")||`<div class="empty" style="grid-column:1/-1">Ничего не найдено</div>`;
}
function rarityIndex(n){return RARITIES.findIndex(x=>x.name===n)}
function renderAchievements(){
 const items=[
  ["Первый номер","Сгенерируй 1 номер",state.attempts>=1],
  ["Охотник","Сделай 100 генераций",state.attempts>=100],
  ["Редкий дроп","Выбей 10 000 ₽+",state.best>=10000],
  ["Большой дроп","Выбей 100 000 ₽+",state.best>=100000],
  ["Легенда","Выбей 1 000 000 ₽+",state.best>=1000000],
  ["Коллекционер","Собери 50 номеров",state.history.length>=50],
  ["Серия","Сделай серию из 5 дорогих",state.bestStreak>=5],
  ["Джекпот","Выбей 10 000 000 ₽+",state.best>=10000000]
 ];
 document.querySelector("#achievementList").innerHTML=items.map(x=>`<div class="achievement ${x[2]?"done":""}"><b>${x[0]}</b><small>${x[1]}</small></div>`).join("");
}
async function submitScore(){
 if(!current)return;
 const name=(document.querySelector("#nickname").value||state.nickname||"Игрок").trim().slice(0,16)||"Игрок";
 state.nickname=name;save();
 const status=document.querySelector("#leaderboardStatus");
 if(!window.API_BASE){status.textContent="Локальный режим: Worker не подключён.";return}
 status.textContent="Отправляем результат…";
 try{
  const res=await fetch(window.API_BASE+"/api/score",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId:state.playerId,nickname:name,number:current.number,digits:current.digits,price:current.price})});
  if(!res.ok)throw new Error();
  status.textContent="Результат отправлен в общий рейтинг.";await loadLeaderboard();
 }catch{status.textContent="Общий рейтинг временно недоступен. Локальная игра продолжает работать."}
}
const localPlayers=[
 ["NexusFox",1267812,967],["NumberKing",892400,731],["Mira",640300,511],["Pixel",387900,388],["Neo",241700,214],
 ["Rex",180500,190],["Nova",99400,153],["Lynx",71200,126]
];
async function loadLeaderboard(){
 const el=document.querySelector("#leaderboardList");
 if(!window.API_BASE){renderLocalBoard(el);return}
 try{
  const res=await fetch(window.API_BASE+"/api/leaderboard");if(!res.ok)throw new Error();
  const data=await res.json();el.innerHTML=data.items.length?data.items.slice(0,20).map((x,i)=>row(i+1,x.nickname,x.price,true)).join(""):`<div class="empty">Пока нет результатов</div>`;
 }catch{renderLocalBoard(el)}
}
function renderLocalBoard(el){
 const arr=localPlayers.slice();
 if(board==="count")arr.sort((a,b)=>b[2]-a[2]);
 else arr.sort((a,b)=>b[1]-a[1]);
 el.innerHTML=arr.map((x,i)=>row(i+1,x[0],board==="count"?x[2]:x[1],false)).join("");
}
function row(rank,name,value,remote){
 return `<div class="rank-row"><div class="rank">#${rank}</div><div><strong>${esc(name)}</strong><small>${remote?"Общий рейтинг":"Демо-результат"}</small></div><div class="rank-price">${board==="count"?Number(value).toLocaleString("ru-RU")+" раз":money(value)}</div></div>`;
}
async function share(){
 if(!current)return;
 const text=`Я выбил игровой номер ${current.number} стоимостью ${money(current.price)} в Nexus Number. Паттерн: ${current.pattern}.`;
 if(navigator.share){try{await navigator.share({title:"Nexus Number",text});return}catch{}}
 try{await navigator.clipboard.writeText(text);toast("Результат скопирован")}catch{toast("Не удалось поделиться")}
}
function toast(msg){
 let e=document.querySelector(".toast");if(!e){e=document.createElement("div");e.className="toast";Object.assign(e.style,{position:"fixed",left:"50%",bottom:"78px",transform:"translateX(-50%)",padding:"10px 14px",borderRadius:"10px",background:"#101216",color:"#fff",zIndex:60,fontWeight:"800",fontSize:"11px"});document.body.appendChild(e)}
 e.textContent=msg;clearTimeout(e._t);e._t=setTimeout(()=>e.remove(),1600);
}
document.querySelector("#generateBtn").onclick=generate;
document.querySelector("#shareBtn").onclick=share;
document.querySelector("#submitScore").onclick=submitScore;
document.querySelector("#refreshLeaderboard").onclick=loadLeaderboard;
document.querySelector("#clearHistory").onclick=()=>{state.history=[];save();renderHistory();renderAchievements()};
document.querySelector("#countrySelect").onchange=e=>{state.country=e.target.value;save();current=null;render()};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;save();generate()});
document.querySelectorAll(".leader-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".leader-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");board=b.dataset.board;loadLeaderboard()});
document.querySelector("#catalogSearch").oninput=renderCatalog;
document.querySelector("#sortCatalog").onchange=renderCatalog;
document.querySelector("#themeBtn").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";document.body.classList.toggle("light",state.theme==="light");save()};
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>document.querySelector("."+b.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"}));
document.querySelector("#menuBtn").onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
document.body.classList.toggle("light",state.theme==="light");
render();loadLeaderboard();
