/* Nexus Number V7 client. Fictional in-game mobile-number collectibles. */
(function(){
'use strict';
window.NEXUS_NUMBER_BOOTED=false;
const API_BASE=String(window.NEXUS_NUMBER_API||'https://nexus-number-api.longyxs999.workers.dev').replace(/\/$/,'');
const STATE_KEY='nexus_number_v7';
const DROP_TABLE=[
 {key:'common',label:'Обычный',pct:65,oneIn:'1 к 1,54'},
 {key:'uncommon',label:'Необычный',pct:20,oneIn:'1 к 5'},
 {key:'rare',label:'Редкий',pct:10,oneIn:'1 к 10'},
 {key:'epic',label:'Эпический',pct:4,oneIn:'1 к 25'},
 {key:'legendary',label:'Легендарный',pct:.9,oneIn:'1 к 111'},
 {key:'mythic',label:'Мифический',pct:.1,oneIn:'1 к 1 000'}
];
const DEFAULT_STATE={auth:null,me:null,current:null,attempts:0,best:0,history:[],serverInventory:[],rareCounts:{common:0,uncommon:0,rare:0,epic:0,legendary:0,mythic:0},sound:true,theme:'dark',adminData:null};
let state=loadState(),current=state.current||null,page='generator',rolling=false,feedTimer=null,onlineTimer=null;
function loadState(){try{return Object.assign({},DEFAULT_STATE,JSON.parse(localStorage.getItem(STATE_KEY)||'{}'));}catch{return {...DEFAULT_STATE}}}
function save(){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function money(n){return Number(n||0).toLocaleString('ru-RU')+' ₽'}
function fmt(d){return '+7 '+d.slice(0,3).join('')+' '+d.slice(3,6).join('')+' '+d.slice(6,8).join('')+' '+d.slice(8,10).join('')}
async function api(path,opts={}){
 const headers={'content-type':'application/json',...(opts.headers||{})};
 if(state.auth)headers.authorization='Bearer '+state.auth;
 const r=await fetch(API_BASE+path,{...opts,headers});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok===false)throw new Error(data.error||'API_ERROR');
 return data;
}
function renderTop(){
 const b=state.me?.balance??0,el=document.getElementById('balanceTop');if(el)el.textContent=Number(b).toLocaleString('ru-RU');
 const n=document.getElementById('menuProfile');if(n)n.textContent=state.me?state.me.username:'Войти';
 const online=document.getElementById('onlineCount');if(online&&state.onlineCount!=null)online.textContent=state.onlineCount;
 renderAdminMenu();
}
function renderAdminMenu(){
 const grid=document.querySelector('.menu-grid');if(!grid)return;
 let item=grid.querySelector('[data-action="admin"]');
 if(state.me?.isAdmin){
  if(!item){item=document.createElement('button');item.className='menu-item admin-item';item.dataset.action='admin';item.innerHTML='<b>АДМИН-ПАНЕЛЬ</b><span>Баланс, удача, промокоды и онлайн</span><em class="preview">ADMIN CONTROL</em>';grid.appendChild(item)}
 }else if(item)item.remove();
}
function rarityClass(r){return r||'common'}
function luckBadge(){
 const m=Number(state.me?.luckMultiplier||1);if(m<=1.001)return '';
 return `<span class="tag luck-tag">X${Number(m.toFixed(2)).toString().replace('.','·')} УДАЧА</span>`;
}
function generatorView(){
 const r=current||{number:'+7 999 000 00 00',rarityKey:'common',rarity:'Обычный',rarityPct:65,oneIn:'1 к 1,54',pattern:'Случайная',price:1000};
 const meter=Math.min(100,Math.max(0,Math.log10(Math.max(r.price,1000))/12*100));
 const logged=!!state.me;
 return `<section class="hero"><span class="eyebrow">MOBILE NUMBER HUNT</span><h1>Выбей самый дорогой номер</h1><p>Все типы комбинаций смешаны в одном пуле. Цена зависит от самой комбинации цифр, а не назначается случайно.</p></section>
 <section class="card generator"><div class="card-top"><div class="statusline"><span class="tag">1 из общего пула</span><span class="tag">${logged?'ONLINE':'НУЖЕН АККАУНТ'}</span>${luckBadge()}</div><div class="pill">Попытка <b>${state.attempts}</b></div></div>
 <div id="stage" class="stage"><div class="stage-label">ВЫПАВШАЯ SIM-КАРТА</div><div class="phone-card"><div class="phone-head"><span>NEXUS NUMBER</span><span>${esc(r.pattern||'Случайная')}</span></div><div id="numberMain" class="phone-main"><div class="country-mark">RUSSIA</div><div class="number">${esc(r.number)}</div><div class="nexus-mark">N</div></div><div class="phone-foot"><span>${logged?esc(state.me.username):'GUEST'}</span><span>FICTIONAL GAME ITEM</span></div></div>
 <div class="result-meta"><div class="pattern"><small>КОМБИНАЦИЯ</small>${esc(r.pattern||'Случайная')}</div><div class="rarity ${rarityClass(r.rarityKey)}">${esc(r.rarity||'Обычный')}</div></div>
 <div class="price-row"><span>Стоимость SIM</span><b>${money(r.price)}</b></div><div class="chance-row"><span>Шанс редкости</span><strong>${esc(r.oneIn||'—')} · ${esc(String(r.rarityPct||r.chancePct||0))}%</strong></div><div class="meter"><i style="width:${meter}%"></i></div>
 </div><div class="actions"><button id="generateBtn" class="generate">${logged?'СГЕНЕРИРОВАТЬ':'ВОЙТИ / ЗАРЕГИСТРИРОВАТЬСЯ'}<span>${logged?'Стоимость попытки: 1 000 ₽':'Чтобы играть и попасть в общий рейтинг'}</span></button><div class="two-actions"><button id="shareBtn" class="sub">Поделиться</button><button id="openCollection" class="sub">Мой инвентарь</button></div></div>
 <div class="quick"><div class="mini"><span>Баланс</span><b>${money(state.me?.balance||0)}</b></div><div class="mini"><span>Лучший дроп</span><b>${state.best?money(state.best):'—'}</b></div><div class="mini"><span>SIM в инв.</span><b>${state.me?.inventoryCount??state.serverInventory.length}</b></div></div></section>
 <section class="section"><div class="section-head"><div><h2>Сейчас выбили</h2><div class="muted">Онлайн-лента редких находок</div></div><span class="tag">LIVE</span></div><div id="liveFeed" class="live-feed"><div class="empty">Загрузка ленты…</div></div></section>`;
}
function invRow(r){return `<div class="row"><div><strong>${esc(r.number)}</strong><small>${esc(r.rarity||'Обычный')} · ${esc(r.pattern||'Случайная')} · ${money(r.price)}</small></div><button class="sell" data-sell="${esc(r.id||r.number)}" data-price="${Number(r.price||0)}">Продать</button></div>`}
function collectionView(){const items=state.serverInventory||[];return `<section class="hero"><span class="eyebrow">MY INVENTORY</span><h1>Мои SIM-карты</h1><p>Цена каждой SIM определяется её комбинацией. Продажа возвращает 80% стоимости.</p></section><section class="section"><div class="section-head"><h2>Баланс</h2><b>${money(state.me?.balance||0)}</b></div><div class="row-list" id="inventoryList">${items.length?items.map(invRow).join(''):'<div class="empty">Инвентарь пока пуст.</div>'}</div></section>`}
function rankRow(i,x){const inv=Number(x.inventoryCount||0);return `<div class="rank ${i<=3?'top':''}"><div class="pos">#${i}</div><div><strong>${esc(x.username||'Игрок')}</strong><small>${esc(x.bestNumber||'—')} · ${esc(x.bestRarity||'—')}<br>Инвентарь: ${inv} SIM${x.online?' · <span style="color:#57d79d">ONLINE</span>':''}</small></div><div class="sum">${money(x.bestPrice||0)}</div></div>`}
function ratingView(){return `<section class="hero"><span class="eyebrow">LIVE LEADERBOARD</span><h1>Самые дорогие SIM</h1><p>Только реальные зарегистрированные игроки из общей онлайн-базы.</p></section><section class="section"><div class="section-head"><h2>ТОП игроков</h2><span class="tag">ONLINE DATA</span></div><div id="leaderboard" class="lb"><div class="empty">Загрузка рейтинга…</div></div></section>`}
function statsView(){return `<section class="hero"><span class="eyebrow">DROP DATA</span><h1>Шансы и редкость</h1><p>Редкость рассчитывается сервером. При X2 удаче редкие уровни получают повышенный вес, а цена отдельно зависит от комбинации.</p></section><section class="section"><div class="stats"><div class="bigstat"><span>Генераций</span><b>${state.attempts}</b></div><div class="bigstat"><span>Редких+</span><b>${state.rareCounts.rare+state.rareCounts.epic+state.rareCounts.legendary+state.rareCounts.mythic}</b></div><div class="bigstat"><span>Рекорд</span><b>${state.best?money(state.best):'—'}</b></div><div class="bigstat"><span>SIM</span><b>${state.me?.inventoryCount??state.serverInventory.length}</b></div></div><h2 style="margin:15px 0 4px;font-size:16px">Базовые шансы</h2>${DROP_TABLE.map(x=>`<div class="barrow"><span>${x.label}</span><div class="bar"><i style="width:${Math.min(100,x.pct)}%"></i></div><b>${x.pct}% · ${x.oneIn}</b></div>`).join('')}<div class="modal-note" style="margin-top:12px">Все цифры выпадают из общего серверного пула. Одинаковый полный номер не может быть выдан дважды.</div></section>`}
function settingsView(){return `<section class="hero"><span class="eyebrow">CONTROL</span><h1>Настройки</h1><p>Только настройки игры и профиля. Технические адреса Worker здесь не показываются.</p></section><section class="section"><div class="row"><div><strong>Звук</strong><small>Сигнал после генерации</small></div><button id="soundBtn" class="chip ${state.sound?'active':''}">${state.sound?'ВКЛ':'ВЫКЛ'}</button></div><div class="row" style="margin-top:8px"><div><strong>Аккаунт</strong><small>${state.me?esc(state.me.username):'Не выполнен вход'}</small></div><button id="authSettingsBtn" class="chip">${state.me?'Профиль':'Войти'}</button></div><div class="row" style="margin-top:8px"><div><strong>Локальная история</strong><small>Сбрасывает только историю отображения и счётчики</small></div><button id="resetBtn" class="chip">Сброс</button></div></section>`}
function adminView(){
 if(!state.me?.isAdmin)return `<section class="section"><div class="empty">Доступ запрещён.</div></section>`;
 const d=state.adminData||{},luck=d.luck||{globalMultiplier:1,globalUntil:0};
 const until=Number(luck.globalUntil||0)>Date.now()?new Date(luck.globalUntil).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'выключена';
 return `<section class="hero admin-hero"><span class="eyebrow">ADMIN CONTROL</span><h1>Админ-панель</h1><p>Только для аккаунта администратора. Изменения применяются сразу в D1.</p></section>
 <section class="section admin-grid">
  <div class="admin-card"><div class="section-head"><h2>Глобальная удача</h2><span class="tag">X${Number(luck.globalMultiplier||1).toFixed(2).replace('.00','')}</span></div><div class="modal-note">Сейчас: <b>${esc(until)}</b></div><div class="admin-fields"><select id="luckMultiplier" class="field"><option value="1">1× — выключить</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="3">3×</option><option value="5">5×</option></select><input id="luckDuration" class="field" type="number" min="1" max="43200" value="60" placeholder="Минуты"><button id="applyLuck" class="primary">Запустить удачу</button></div></div>
  <div class="admin-card"><div class="section-head"><h2>Начислить баланс</h2><span class="tag">INSTANT</span></div><div class="admin-fields"><input id="grantUser" class="field" maxlength="20" placeholder="Логин игрока"><input id="grantAmount" class="field" type="number" min="1" max="100000000000000" placeholder="Сумма ₽"><button id="grantBalance" class="primary">Начислить</button></div></div>
  <div class="admin-card"><div class="section-head"><h2>Создать промокод</h2><span class="tag">PROMO</span></div><div class="admin-fields"><input id="promoCode" class="field" maxlength="32" placeholder="Код, например NEXUS500"><select id="promoRewardType" class="field"><option value="money">Деньги</option><option value="luck">Бафф удачи</option></select><input id="promoAmount" class="field" type="number" min="1" placeholder="Сумма ₽"><div id="promoLuckBox" class="hidden"><select id="promoRewardMode" class="field"><option value="x">X удачи</option><option value="percent">Процент к удаче</option></select><input id="promoLuckValue" class="field" type="number" min="0.01" step="0.01" placeholder="Например 2 или 50"><input id="promoDuration" class="field" type="number" min="1" max="43200" value="60" placeholder="Длительность, минут"></div><input id="promoMaxUses" class="field" type="number" min="0" max="1000000" value="0" placeholder="Лимит использований, 0 = без лимита"><input id="promoExpires" class="field" type="number" min="0" max="43200" value="0" placeholder="Срок действия кода, минут; 0 = без срока"><button id="createPromo" class="primary">Создать промокод</button></div></div>
  <div class="admin-card"><div class="section-head"><h2>Онлайн</h2><button id="adminRefresh" class="chip">Обновить</button></div><div class="admin-online"><b>${Number(d.onlineCount||state.onlineCount||0)}</b><span>игроков онлайн</span></div><div class="admin-list">${(d.players||[]).slice(0,30).map(x=>`<div class="admin-line"><span><b>${esc(x.username)}</b>${x.online?' · <i>ONLINE</i>':''}</span><strong>${money(x.balance)}</strong></div>`).join('')||'<div class="empty">Нет игроков</div>'}</div></div>
  <div class="admin-card"><div class="section-head"><h2>Промокоды</h2><span class="tag">${(d.promos||[]).length}</span></div><div class="admin-list">${(d.promos||[]).map(p=>`<div class="admin-line"><span><b>${esc(p.code)}</b><small>${p.rewardType==='money'?money(p.amount):(p.rewardMode==='percent'?`+${Math.max(1,Math.round((Number(p.luckValue||1)-1)*100))}% удачи`:`X${Number(p.luckValue||1).toFixed(2)} удачи`)+` · ${Math.round(Number(p.durationSeconds||0)/60)} мин`}</small></span><span>${p.uses}/${p.maxUses||'∞'} <button class="chip promo-toggle" data-promo-id="${esc(p.id)}">${p.active?'ВЫКЛ':'ВКЛ'}</button></span></div>`).join('')||'<div class="empty">Промокодов пока нет</div>'}</div></div>
 </section>`;
}
function navigate(next){
 if(next==='admin'&&!state.me?.isAdmin){toast('Нет доступа');return navigate('generator')}
 page=next;const titles={generator:'Генератор',collection:'Инвентарь',rating:'Рейтинг',stats:'Стата',settings:'Настройки',admin:'Админ-панель'};document.getElementById('pageTitle').textContent=titles[next]||'Генератор';document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===next));
 const view=document.getElementById('appView');view.innerHTML=({generator:generatorView,collection:collectionView,rating:ratingView,stats:statsView,settings:settingsView,admin:adminView}[next]||generatorView)();renderTop();bindPage();
 window.scrollTo({top:0,behavior:'smooth'});
 if(next==='collection')loadInventory();if(next==='rating')loadLeaderboard();if(next==='generator')loadFeed();if(next==='admin')loadAdminData();
}
function bindPage(){
 document.getElementById('generateBtn')?.addEventListener('click',generate);document.getElementById('shareBtn')?.addEventListener('click',share);document.getElementById('openCollection')?.addEventListener('click',()=>navigate('collection'));document.getElementById('authBtn')?.addEventListener('click',()=>openAuth());document.getElementById('authSettingsBtn')?.addEventListener('click',()=>openAuth());
 document.getElementById('soundBtn')?.addEventListener('click',()=>{state.sound=!state.sound;save();navigate('settings')});
 document.getElementById('resetBtn')?.addEventListener('click',()=>{if(!confirm('Сбросить историю и локальные данные интерфейса?'))return;state.attempts=0;state.best=0;state.history=[];state.rareCounts={common:0,uncommon:0,rare:0,epic:0,legendary:0,mythic:0};state.current=null;current=null;save();navigate('generator');toast('Локальная история сброшена')});
 document.querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sellItem(b.dataset.sell,Number(b.dataset.price||0))));
 document.getElementById('applyLuck')?.addEventListener('click',adminApplyLuck);document.getElementById('grantBalance')?.addEventListener('click',adminGrantBalance);document.getElementById('createPromo')?.addEventListener('click',adminCreatePromo);document.getElementById('adminRefresh')?.addEventListener('click',loadAdminData);document.querySelectorAll('.promo-toggle').forEach(b=>b.addEventListener('click',()=>adminTogglePromo(b.dataset.promoId)));
 document.getElementById('promoRewardType')?.addEventListener('change',()=>{const box=document.getElementById('promoLuckBox'),amt=document.getElementById('promoAmount');const luck=document.getElementById('promoRewardType').value==='luck';box?.classList.toggle('hidden',!luck);if(amt)amt.classList.toggle('hidden',luck);});
}
function openMenu(v){const o=document.getElementById('menuOverlay');o.classList.toggle('hidden',!v);o.setAttribute('aria-hidden',v?'false':'true');renderAdminMenu()}
function openModal(html){document.getElementById('modalRoot').innerHTML=html}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
function authModal(mode='login'){
 const reg=mode==='register';
 openModal(`<div class="modal"><div class="modal-card"><div class="modal-head"><div><span class="eyebrow">NEXUS ACCOUNT</span><h2>${reg?'Регистрация':'Вход'}</h2></div><button class="close" id="modalClose">×</button></div><div class="modal-body"><div class="modal-row"><label>ЛОГИН</label><input id="authUser" class="field" maxlength="20" autocomplete="username" placeholder="Например: DIGITKING"></div><div class="modal-row"><label>ПАРОЛЬ</label><input id="authPass" class="field" type="password" minlength="6" maxlength="72" autocomplete="${reg?'new-password':'current-password'}" placeholder="Минимум 6 символов"></div><div class="modal-note">Данные аккаунта и игровые номера хранятся в общей D1-базе.</div></div><div class="modal-actions"><button id="authSubmit" class="primary">${reg?'Создать аккаунт':'Войти'}</button><button id="authSwitch" class="secondary">${reg?'У меня уже есть аккаунт':'Регистрация'}</button></div></div></div>`);
 document.getElementById('modalClose').onclick=closeModal;document.getElementById('authSwitch').onclick=()=>authModal(reg?'login':'register');document.getElementById('authSubmit').onclick=()=>submitAuth(reg);
}
function openAuth(){if(state.me){openProfileModal();return}authModal('login')}
async function submitAuth(reg){
 const username=document.getElementById('authUser')?.value.trim(),password=document.getElementById('authPass')?.value;
 if(!/^[A-Za-z0-9_А-Яа-яЁё-]{3,20}$/.test(username||'')){toast('Логин: 3–20 символов');return}
 if((password||'').length<6){toast('Пароль минимум 6 символов');return}
 try{const data=await api(reg?'/api/register':'/api/login',{method:'POST',body:JSON.stringify({username,password})});state.auth=data.token;state.me=data.user;state.onlineCount=state.onlineCount||0;save();closeModal();toast(reg?'Аккаунт создан':'Вход выполнен');await refreshMe();navigate(page);startLive()}
 catch(e){toast(e.message==='USERNAME_TAKEN'?'Логин уже занят':e.message==='INVALID_CREDENTIALS'?'Неверный логин или пароль':e.message==='RATE_LIMITED'?'Слишком много запросов, попробуй позже':'Не удалось выполнить запрос')}
}
function openProfileModal(){
 const m=state.me;if(!m)return openAuth();
 openModal(`<div class="modal"><div class="modal-card"><div class="modal-head"><div><span class="eyebrow">PLAYER PROFILE</span><h2>${esc(m.username)}</h2></div><button class="close" id="profileClose">×</button></div><div class="stats"><div class="bigstat"><span>Баланс</span><b>${money(m.balance||0)}</b></div><div class="bigstat"><span>SIM</span><b>${m.inventoryCount||0}</b></div><div class="bigstat"><span>Рекорд</span><b>${money(m.bestPrice||0)}</b></div><div class="bigstat"><span>Удача</span><b>X${Number(m.luckMultiplier||1).toFixed(2)}</b></div></div>
 <div class="modal-body"><div class="modal-row"><label>НИК</label><input id="nickInput" class="field" maxlength="20" value="${esc(m.username)}"></div><button id="saveNick" class="primary">Сохранить ник</button><div class="modal-row"><label>ПРОМОКОД</label><input id="promoInput" class="field" maxlength="32" placeholder="Введите код"></div><button id="redeemPromo" class="secondary">Активировать промокод</button></div>
 <div class="modal-actions">${m.isAdmin?'<button id="profileAdmin" class="primary">Админ-панель</button>':'<button id="profileInventory" class="primary">Инвентарь</button>'}<button id="profileLogout" class="secondary">Выйти</button></div></div></div>`);
 document.getElementById('profileClose').onclick=closeModal;document.getElementById('saveNick').onclick=saveNickname;document.getElementById('redeemPromo').onclick=redeemPromo;document.getElementById('profileInventory')?.addEventListener('click',()=>{closeModal();navigate('collection')});document.getElementById('profileAdmin')?.addEventListener('click',()=>{closeModal();navigate('admin')});document.getElementById('profileLogout').onclick=logout;
}
async function saveNickname(){
 const username=document.getElementById('nickInput')?.value.trim();if(!/^[A-Za-z0-9_А-Яа-яЁё-]{3,20}$/.test(username||'')){toast('Ник: 3–20 символов');return}
 try{const data=await api('/api/profile',{method:'PATCH',body:JSON.stringify({username})});state.me=data.user;save();closeModal();toast('Ник изменён');navigate(page)}catch(e){toast(e.message==='USERNAME_TAKEN'?'Такой ник уже занят':'Не удалось изменить ник')}
}
async function redeemPromo(){
 const code=document.getElementById('promoInput')?.value.trim();if(!code){toast('Введи промокод');return}
 try{const data=await api('/api/promo/redeem',{method:'POST',body:JSON.stringify({code})});state.me=data.user;save();closeModal();toast(data.rewardType==='money'?`Начислено ${money(data.amount)}`:(data.rewardMode==='percent'?`Бафф +${Math.max(1,Math.round((Number(data.luckValue||1)-1)*100))}% активирован`:`Бафф X${Number(data.luckValue||1).toFixed(2)} активирован`));navigate(page)}catch(e){const map={PROMO_NOT_FOUND:'Промокод не найден',PROMO_ALREADY_USED:'Ты уже использовал этот код',PROMO_EXPIRED:'Промокод недействителен',PROMO_LIMIT:'Лимит промокода исчерпан',AUTH_REQUIRED:'Выполни вход'};toast(map[e.message]||'Не удалось активировать промокод')}
}
async function logout(){if(state.auth){try{await api('/api/logout',{method:'POST',body:'{}'})}catch{}}state.auth=null;state.me=null;state.serverInventory=[];state.adminData=null;save();closeModal();toast('Вы вышли');navigate('generator')}
async function refreshMe(){if(!state.auth)return;try{const data=await api('/api/me');state.me=data.user;save();renderTop()}catch{state.auth=null;state.me=null;save()}}
async function loadInventory(){if(!state.me)return;try{const data=await api('/api/inventory');state.serverInventory=data.items||[];state.me.balance=data.balance;state.me.inventoryCount=data.items.length;save();const view=document.getElementById('appView');if(page==='collection'&&view){view.innerHTML=collectionView();bindPage();renderTop()}}catch{toast('Не удалось загрузить инвентарь')}}
async function generate(){
 if(rolling)return;if(!state.me){openAuth();return}rolling=true;
 const stage=document.getElementById('stage'),btn=document.getElementById('generateBtn'),main=document.getElementById('numberMain');btn&&(btn.disabled=true);stage?.classList.add('roll');const started=Date.now();
 const interval=setInterval(()=>{if(main){const d=[9,...Array.from({length:9},()=>Math.floor(Math.random()*10))];main.innerHTML=`<div class="country-mark">RUSSIA</div><div class="number">${esc(fmt(d))}</div><div class="nexus-mark">N</div>`}},55);
 let result;try{const data=await api('/api/generate',{method:'POST',body:'{}'});result=data.result;state.me=data.user}catch(e){clearInterval(interval);stage?.classList.remove('roll');rolling=false;toast(e.message==='INSUFFICIENT_BALANCE'?'Недостаточно баланса':e.message==='AUTH_REQUIRED'?'Выполни вход':e.message==='RATE_LIMITED'?'Слишком много генераций подряд':'Ошибка генерации');return}
 const wait=Math.max(1050-(Date.now()-started),200);setTimeout(()=>{clearInterval(interval);stage?.classList.remove('roll');current=result;state.current=result;state.attempts++;state.best=Math.max(state.best,Number(result.price||0));state.rareCounts[result.rarityKey]=(state.rareCounts[result.rarityKey]||0)+1;state.history.unshift(result);state.history=state.history.slice(0,200);save();play(result.rarityKey==='mythic'||result.rarityKey==='legendary'?'rare':'normal');rolling=false;navigate('generator');toast(result.rarityKey==='mythic'?'МИФИЧЕСКИЙ НОМЕР — ДЖЕКПОТ!':result.rarityKey==='legendary'?'ЛЕГЕНДАРНЫЙ НОМЕР!':`SIM получена · X${Number(result.luckMultiplier||1).toFixed(2)} удача`)},wait)
}
async function sellItem(id,price){if(!confirm(`Продать SIM за ${money(Math.round(price*.8))}?`))return;try{const data=await api('/api/sell',{method:'POST',body:JSON.stringify({itemId:id})});state.me=data.user;toast('SIM продана');await loadInventory();}catch(e){toast(e.message==='ITEM_NOT_FOUND'?'SIM уже продана':'Не удалось продать')}}
async function loadLeaderboard(){const root=document.getElementById('leaderboard');if(!root)return;try{const data=await api('/api/leaderboard?limit=100');root.innerHTML=data.items?.length?data.items.map((x,i)=>rankRow(i+1,x)).join(''):'<div class="empty">Пока никто не выбил SIM.</div>';state.onlineCount=Number(data.onlineCount||0);save();renderTop()}catch{root.innerHTML='<div class="empty">Не удалось загрузить общий рейтинг.</div>'}}
async function loadFeed(){const root=document.getElementById('liveFeed');if(!root)return;try{const data=await api('/api/feed?limit=12');root.innerHTML=data.items?.length?data.items.map(x=>`<div class="feed-row"><div><strong>${esc(x.username)} выбил ${esc(x.number)}</strong><small>${esc(x.rarity)} · ${esc(x.pattern)} · ${esc(x.createdAtText||'только что')}</small></div><b>${money(x.price)}</b></div>`).join(''):'<div class="empty">Редких находок пока нет.</div>'}catch{root.innerHTML='<div class="empty">Лента временно недоступна.</div>'}}
async function refreshOnline(){try{const data=await api('/api/online');state.onlineCount=Number(data.onlineCount||0);save();renderTop()}catch{}}
async function heartbeat(){if(!state.auth)return;try{await api('/api/heartbeat',{method:'POST',body:'{}'});}catch{}}
function startLive(){clearInterval(feedTimer);clearInterval(onlineTimer);loadFeed();refreshOnline();heartbeat();feedTimer=setInterval(()=>{if(page==='generator')loadFeed()},30000);onlineTimer=setInterval(()=>{heartbeat();refreshOnline()},60000)}
async function loadAdminData(){if(!state.me?.isAdmin)return;try{const data=await api('/api/admin/data');state.adminData=data;state.onlineCount=Number(data.onlineCount||0);save();if(page==='admin'){const v=document.getElementById('appView');v.innerHTML=adminView();renderTop();bindPage()}}catch(e){toast(e.message==='ADMIN_REQUIRED'?'Нет доступа':'Ошибка загрузки админки')}}
async function adminApplyLuck(){try{const multiplier=Number(document.getElementById('luckMultiplier').value||1),durationMinutes=Math.floor(Number(document.getElementById('luckDuration').value||60));const data=await api('/api/admin/luck',{method:'POST',body:JSON.stringify({multiplier,durationMinutes})});toast(multiplier>1?`Запущена удача X${multiplier} на ${durationMinutes} мин`:'Удача выключена');state.adminData=state.adminData||{};state.adminData.luck=data.luck;save();await loadAdminData()}catch{toast('Не удалось изменить удачу')}}
async function adminGrantBalance(){const username=document.getElementById('grantUser')?.value.trim(),amount=Math.floor(Number(document.getElementById('grantAmount')?.value||0));if(!username||amount<1){toast('Укажи игрока и сумму');return}try{const data=await api('/api/admin/balance',{method:'POST',body:JSON.stringify({username,amount})});toast(`Игроку ${username} начислено ${money(data.amount)}`);await loadAdminData()}catch(e){toast(e.message==='PLAYER_NOT_FOUND'?'Игрок не найден':'Не удалось начислить баланс')}}
async function adminCreatePromo(){
 const rewardType=document.getElementById('promoRewardType')?.value||'money',code=document.getElementById('promoCode')?.value.trim(),amount=Math.floor(Number(document.getElementById('promoAmount')?.value||0)),rewardMode=document.getElementById('promoRewardMode')?.value||'x',luckValue=Number(document.getElementById('promoLuckValue')?.value||0),durationMinutes=Math.floor(Number(document.getElementById('promoDuration')?.value||0)),maxUses=Math.floor(Number(document.getElementById('promoMaxUses')?.value||0)),expiresMinutes=Math.floor(Number(document.getElementById('promoExpires')?.value||0));
 if(rewardType==='money'&&amount<1){toast('Укажи сумму промокода');return}if(rewardType==='luck'&&(luckValue<=0||durationMinutes<1)){toast('Укажи бафф и его время');return}
 try{const data=await api('/api/admin/promo',{method:'POST',body:JSON.stringify({code,rewardType,rewardMode,amount,luckValue,durationMinutes,maxUses,expiresMinutes})});toast(`Промокод создан: ${data.promo.code}`);await loadAdminData()}catch(e){toast(e.message==='PROMO_EXISTS'?'Такой промокод уже существует':'Не удалось создать промокод')}}
async function adminTogglePromo(id){try{await api('/api/admin/promo/toggle',{method:'POST',body:JSON.stringify({id})});await loadAdminData();toast('Статус промокода изменён')}catch{toast('Не удалось изменить промокод')}}
function play(kind){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=kind==='rare'?780:300;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.04,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+(kind==='rare'?.38:.16));o.start(t);o.stop(t+(kind==='rare'?.42:.2))}catch{}}
async function share(){if(!current)return toast('Сначала выбей SIM');const text=`${state.me?.username||'Игрок'} выбил ${current.number} — ${money(current.price)} · ${current.rarity} · ${current.pattern}. Nexus Number`;try{if(navigator.share){await navigator.share({title:'Nexus Number',text});return}await navigator.clipboard.writeText(text);toast('Результат скопирован')}catch{toast('Не удалось поделиться')}}
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}

document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
document.getElementById('menuBtn').addEventListener('click',()=>openMenu(true));document.getElementById('closeMenu').addEventListener('click',()=>openMenu(false));document.getElementById('menuOverlay').addEventListener('click',e=>{const b=e.target.closest('[data-page],[data-action]');if(!b)return;openMenu(false);if(b.dataset.page)navigate(b.dataset.page);else if(b.dataset.action==='profile')openProfileModal();else if(b.dataset.action==='settings')navigate('settings');else if(b.dataset.action==='admin'){if(state.me?.isAdmin)navigate('admin')}});
document.querySelector('.mini-title')?.addEventListener('click',()=>{if(state.me?.isAdmin)navigate('admin')});
document.getElementById('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';document.documentElement.style.setProperty('--bg',state.theme==='light'?'#d7dae0':'#1e2026');document.documentElement.style.setProperty('--bg2',state.theme==='light'?'#cdd1d8':'#17191e');save()});
if(!current){current={number:'+7 999 000 00 00',rarityKey:'common',rarity:'Обычный',rarityPct:65,oneIn:'1 к 1,54',pattern:'Случайная',price:1000};state.current=current;save()}
(async()=>{await refreshMe();navigate('generator');startLive();renderTop();window.NEXUS_NUMBER_BOOTED=true})();
})();
