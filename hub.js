'use strict';
/* ================= hub: deploy / stash / gunsmith / shop / operators / net / help ================= */
const Hub={tab:'deploy',shopCat:'weapons',gsW:null};
const TABS=[['deploy','出擊'],['stash','倉庫'],['gun','改槍台'],['shop','商店'],['ops','探員'],['quest','委託'],['net','連線'],['set','設定'],['help','說明']];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function h(tag,attrs={},...kids){const e=document.createElement(tag);for(const k in attrs){if(k==='on')for(const ev in attrs.on)e.addEventListener(ev,attrs.on[ev]);else if(k==='html')e.innerHTML=attrs[k];else if(k==='text')e.textContent=attrs[k];else if(attrs[k]!==false&&attrs[k]!=null)e.setAttribute(k,attrs[k])}for(const c of kids)if(c!=null)e.append(c);return e}
function sec(title,...kids){return h('div',{class:'sec'},h('h2',{text:title}),...kids)}
function seg(cur,opts,onPick){const d=h('div',{class:'seg'});for(const [v,l] of opts)d.append(h('button',{type:'button','aria-pressed':String(v===cur),text:l,on:{click:()=>{onPick(v);Hub.render()}}}));return d}
Hub.render=function(){$('money').textContent=fmt(PF.money);const tabs=$('tabs');tabs.innerHTML='';
  for(const [id,l] of TABS)tabs.append(h('button',{type:'button',role:'tab','aria-selected':String(Hub.tab===id),text:l,on:{click:()=>{Hub.tab=id;Hub.render()}}}));
  const p=$('panel');const keep=Hub._lastTab===Hub.tab?p.scrollTop:0;Hub._lastTab=Hub.tab;p.innerHTML='';({deploy:tabDeploy,stash:tabStash,gun:tabGun,shop:tabShop,ops:tabOps,quest:tabQuests,net:tabNet,set:tabSettings,help:tabHelp})[Hub.tab](p);
  p.scrollTop=keep;requestAnimationFrame(()=>{if(Hub._lastTab===Hub.tab)p.scrollTop=keep});
  if(Hub.tab!=='gun')gsStop();if(Hub.tab!=='ops')opStop()};
const S_=()=>PF.settings;
function setSetting(k,v){S_()[k]=v;savePF();if(k==='map'||k==='tod'){hubWorld()}}
function hubWorld(){newWorld(S_().map,4242,'hub');applyTOD(S_().tod)}

/* ---------- deploy ---------- */
function loadoutProblems(){const lo=PF.loadout,pr=[];const need={};const cnt=(c,id)=>{need[c+id]=(need[c+id]||0)+1;return need[c+id]};
  for(const k of ['p1','p2']){const w=lo[k];if(w&&cnt('weapons',w)>ownCount('weapons',w))pr.push(`${WEAPONS[w].name} 數量不足`)}
  if(lo.pistol&&!WEAPONS[lo.pistol].free&&ownCount('weapons',lo.pistol)<1)pr.push(`${WEAPONS[lo.pistol].name} 不在倉庫`);
  for(const [k,id] of [['helmet',lo.helmet],['armor',lo.armor],['rig',lo.rig],['bag',lo.bag],['pouch',lo.pouch]])if(GEAR[k][id].price>0&&ownCount('gear',id)<1)pr.push(`${GEAR[k][id].name} 不在倉庫`);
  return pr}
function fixLoadout(){const lo=PF.loadout;const pr=loadoutProblems();if(!pr.length)return;
  const used={};const ok=w=>{if(!w)return true;if(WEAPONS[w].free)return true;used[w]=(used[w]||0)+1;return used[w]<=ownCount('weapons',w)};
  if(!ok(lo.p1))lo.p1=null;if(!ok(lo.p2))lo.p2=null;if(lo.pistol&&!WEAPONS[lo.pistol].free&&ownCount('weapons',lo.pistol)<1)lo.pistol='g19';
  const base={helmet:'h0',armor:'a0',rig:'rig0',bag:'bag0',pouch:'pouch0'};for(const k in base)if(GEAR[k][lo[k]].price>0&&ownCount('gear',lo[k])<1)lo[k]=base[k];savePF()}
function tabDeploy(p){const st=S_();const inRoom=NET.status==='hosting'||NET.status==='joined';const isClient=inRoom&&!NET.isHost;
  {const e=liveEvent(),nx=liveEvent(e.ends+1000);p.append(h('div',{class:'liveBox'},h('span',{class:'tg',text:'本期活動 · 剩 '+liveLeft(e)}),h('b',{text:e.name}),h('small',{text:e.desc}),h('small',{class:'next',text:'下一個活動：'+nx.name})))}
  if(isClient&&NET.hostSet){const hs=NET.hostSet;p.append(sec('房主設定',h('div',{class:'chips'},h('span',{class:'chip',text:MODES[hs.mode].name}),h('span',{class:'chip',text:MAPS[hs.map].name}),h('span',{class:'chip',text:DIFFS[hs.diff].name}),...(hs.mut||[]).map(m=>h('span',{class:'chip',text:MUTATORS[m]}))),h('p',{class:'hint',text:'模式和地圖由房主決定。你可以先調整自己的配裝與探員。'})))}
  else{
  const mg=h('div',{id:'modeGrid'});for(const id in MODES){const m=MODES[id];mg.append(h('button',{class:'mcard'+(m.pistolFriendly?' pf':''),type:'button','aria-pressed':String(st.mode===id),on:{click:()=>{setSetting('mode',id);Hub.render()}}},
    h('span',{class:'tg',text:m.tag+(m.pistolFriendly?' · 手槍友善':'')}),h('b',{text:m.name}),h('small',{text:m.desc})))}
  p.append(sec('1　選模式',mg));
  p.append(sec('2　選地圖',h('div',{class:'cards'},...Object.entries(MAPS).filter(([id,m])=>!m.hidden).map(([id,m])=>h('button',{class:'card',type:'button','aria-pressed':String(st.map===id),on:{click:()=>{setSetting('map',id);Hub.render()}}},h('b',{text:m.name}),h('small',{text:m.size+' · '+m.desc}))))));
  const mut=h('div',{class:'chips'});for(const k in MUTATORS){const on=st.mut.includes(k);mut.append(h('button',{type:'button',class:'chip tog','aria-pressed':String(on),text:MUTATORS[k],on:{click:()=>{st.mut=on?st.mut.filter(x=>x!==k):[...st.mut,k];savePF();Hub.render()}}}))}
  p.append(sec('3　趣味規則（可複選）',mut,h('p',{class:'hint',style:'margin:0',text:'「只用手槍」配「一擊必殺」或「巨頭」最刺激。低重力可以跳上屋頂。'})));
  const s=h('div',{class:'settings'});
  s.append(h('span',{text:'難度'}),seg(st.diff,Object.entries(DIFFS).map(([k,v])=>[k,v.name]),v=>setSetting('diff',v)));
  s.append(h('span',{text:MODES[st.mode].team?'每隊人數':'敵人數量'}),seg(st.count,[['few','少'],['mid','中'],['many','多'],['max','爆量']],v=>setSetting('count',v)));
  s.append(h('span',{text:'時限'}),seg(st.time,[['inf','不限時'],['10','10 分'],['20','20 分'],['30','30 分']],v=>setSetting('time',v)));
  s.append(h('span',{text:'開始時段'}),seg(st.tod,[['cycle','清晨'],['day','白天'],['dusk','黃昏'],['night','夜戰']],v=>setSetting('tod',v)));
  if(st.mode==='extract')s.append(h('span',{text:'敵對小隊'}),seg(String(st.rivals||0),[['0','無'],['2','2 隊'],['5','5 隊（6 隊混戰）']],v=>{st.rivals=+v;savePF();Hub.render()}));
  s.append(h('span',{text:'日夜循環'}),seg(PF.settings.cycle===false?'off':'on',[['on','開（現實 2.5 秒 = 遊戲 5 分鐘）'],['off','固定時段']],v=>{PF.settings.cycle=v==='on';savePF();Hub.render()}));
  p.append(h('details',{class:'adv',open:Hub.advOpen?'':null,on:{toggle:e=>{Hub.advOpen=e.target.open}}},h('summary',{text:`進階：${DIFFS[st.diff].name} · ${({few:'少',mid:'中',many:'多',max:'爆量'})[st.count]} · ${st.time==='inf'?'不限時':st.time+' 分'} · ${({cycle:'清晨',day:'白天',dusk:'黃昏',night:'夜戰'})[st.tod]} · 今日天氣：${WEATHERS[dailyWeather(st.map)].name}`}),h('div',{style:'margin-top:10px'},s)))}
  const op=OPERATORS[PF.operator];
  p.append(sec('探員',h('div',{class:'lrow'},h('span',{class:'lbl',text:op.role}),h('b',{text:op.name+'　'+op.s1.name+' / '+op.s2.name+' / '+op.s3.name}),h('button',{class:'mini',type:'button',text:'更換',on:{click:()=>{Hub.tab='ops';Hub.render()}}}))));
  const mode=isClient&&NET.hostSet?NET.hostSet.mode:st.mode;
  {const ps=personnelSec(mode,inRoom,isClient);if(ps)p.append(ps)}
  if(mode==='extract'){fixLoadout();const lo=PF.loadout;const pr=loadoutProblems();
    const items=[['主武器',lo.p1?WEAPONS[lo.p1].name:'無'],['副武器',lo.p2?WEAPONS[lo.p2].name:'無'],['手槍',WEAPONS[lo.pistol||'g19'].name],['頭盔',GEAR.helmet[lo.helmet].name],['護甲',GEAR.armor[lo.armor].name],['背包',GEAR.bag[lo.bag].name],['保險箱',GEAR.safe[PF.safe].cap+' 格']];
    const box=h('div',{class:'chips'});for(const [k,v] of items)box.append(h('span',{class:'chip',text:k+'：'+v}));
    p.append(sec('攜帶裝備（陣亡會遺失）',box,h('div',{class:'btns'},h('button',{class:'mini',type:'button',text:'到倉庫調整',on:{click:()=>{Hub.tab='stash';Hub.render()}}})),pr.length?h('p',{class:'warn',text:pr.join('、')}):null))}
  else if(mode==='conquest'||mode==='tdm'||mode==='relic'||mode==='zombie'){const g=h('div',{class:'cards'});PF.presets.forEach((pr,i)=>g.append(h('button',{class:'card',type:'button','aria-pressed':String(PF.preset===i),on:{click:()=>{PF.preset=i;savePF();Hub.render()}}},h('b',{text:pr.name}),h('small',{text:[pr.p1,pr.p2,pr.pistol].filter(Boolean).map(w=>WEAPONS[w].name).join(' · ')}))));
    p.append(sec('配裝（免費，不會遺失 · 戰鬥中按 F1–F3 切換）',g,h('div',{class:'btns'},h('button',{class:'mini',type:'button',text:'編輯配裝',on:{click:()=>{Hub.tab='stash';Hub.render()}}}))))}
  else p.append(sec('配裝',h('p',{class:'hint',text:mode==='duel'?`西部對決只能用手槍（目前：${WEAPONS[PF.loadout.pistol||'g19'].name}，可到倉庫更換）。`:mode==='oitc'?'一發入魂統一配發 M686 左輪與戰術刀。':'槍王之王會依擊殺自動換槍。'})));
  const sm=isClient&&NET.hostSet?NET.hostSet:st;
  const btn=h('button',{class:'go',type:'button',text:inRoom?(NET.isHost?'開始連線對局':'等待房主開始'):'出擊'});if(isClient)btn.disabled=true;
  btn.onclick=()=>{initAudio();const cfg={mode:st.mode,map:st.map,diff:st.diff,tod:st.tod,time:st.time,count:st.count,mut:st.mut.slice(),seed:(Math.random()*1e9)|0,spawnIdx:Math.random()*4|0,tickets:{10:150,15:200,20:260,30:350}[st.time],room:{ff:!!st.ff,pickup:st.pickup!==false,killcam:st.killcam!==false}};
    const ta=(st.teamAI||{})[st.mode];if(ta)cfg.teamAI=Object.assign({},ta);if(!inRoom){const mt=(st.myTeam||{})[st.mode];if(mt&&teamList(st.mode).some(t=>t.team===mt&&t.join))cfg.myTeam=mt}
    if(inRoom&&NET.isHost)netStartGame(cfg);else startMatch(cfg)};
  p.append(h('div',{id:'deployBar'},h('div',{class:'sum',text:`${MODES[sm.mode].name} · ${MAPS[sm.map].name} · ${DIFFS[sm.diff].name}${(sm.mut||[]).length?' · '+sm.mut.map(m=>MUTATORS[m]).join('、'):''}${inRoom?` · 房間 ${NET.code}（${Object.keys(NET.members).length} 人）`:''}`}),btn))}

/* ---------- 人員配置：各隊成員、AI 人數、選擇加入哪一隊 ---------- */
const TEAM_HEX={1:'#72c8f5',2:'#ff6b5e',3:'#9be15d',4:'#ffc94d',5:'#c38bff',6:'#ff9ad5'};
function teamList(mode){const st=S_(),C=COUNT[st.count||'mid'],s=C.c/10;
  switch(mode){
    case 'tdm':case 'relic':return[{team:1,name:'藍隊 ALPHA',def:C.t,join:1},{team:2,name:'紅隊 BRAVO',def:C.t,join:1}];
    case 'conquest':return[{team:1,name:'藍隊 ALPHA',def:C.c,join:1},{team:2,name:'紅隊 BRAVO',def:C.c,join:1}];
    case 'sf':return[{team:1,name:'匪徒（進攻）',def:Math.round(20*s),join:1},{team:2,name:'警察（防守）',def:Math.round(10*s),join:1}];
    case 'nuke':return[{team:1,name:'攻方（發射核彈）',def:Math.round(10*s),join:1},{team:2,name:'守方（阻止發射）',def:Math.round(10*s),join:1}];
    case 'rats':return[1,2,3].map(t=>({team:t,name:'小隊 '+'ABC'[t-1],def:3,join:1}));
    case 'bedwars':return[1,2,3,4].map(t=>({team:t,name:['藍','紅','綠','黃'][t-1]+'隊',def:3,join:1}));
    case 'bio':return[1,2,3,4,5,6].map(t=>({team:t,name:'小隊 '+t,def:3,join:1}));
    case 'extract':{const rv=+(st.rivals||0);return[{team:1,name:'你的小隊',def:0,join:1,noAI:1}].concat(Array.from({length:rv},(_,i)=>({team:3+i,name:'敵對小隊 '+'ABCDE'[i],def:2,max:3})))}}
  return null}
function personnelSec(mode,inRoom,isClient){const L=teamList(mode);if(!L)return null;const st=S_();st.teamAI=st.teamAI||{};st.myTeam=st.myTeam||{};const ta=st.teamAI[mode]||{};
  const myTeam=inRoom?((NET.members[NET.myId]||{}).team||1):(st.myTeam[mode]||1);const wrap=h('div',{class:'teams'});
  for(const t of L){const hum=[];if(inRoom){for(const id in NET.members){const m=NET.members[id];if((mode==='extract'?1:(m.team||1))===t.team)hum.push((m.nick||'玩家')+(id===NET.myId?'（你）':''))}}else if(myTeam===t.team||mode==='extract'&&t.team===1)hum.push((PF.nick||'你')+'（你）');
    const humN=hum.length;const def=Math.max(0,t.def-humN);const ai=ta[t.team]!=null?ta[t.team]:def;const max=t.max||30;
    const setAI=v=>{st.teamAI[mode]=Object.assign({},st.teamAI[mode]||{},{[t.team]:clamp(v,0,max)});savePF();Hub.render()};
    const step=t.noAI?h('small',{class:'hint',text:'烽火只能和真人組隊（最多 3 人）'}):h('div',{class:'stepper'},h('button',{type:'button',text:'−',disabled:isClient||ai<=0?'':null,on:{click:()=>setAI(ai-1)}}),h('b',{text:'AI × '+ai}),h('button',{type:'button',text:'+',disabled:isClient||ai>=max?'':null,on:{click:()=>setAI(ai+1)}}));
    const join=t.join&&mode!=='extract'&&myTeam!==t.team?h('button',{type:'button',class:'mini',text:'加入此隊',on:{click:()=>{if(inRoom)netSetTeam(t.team);else{st.myTeam[mode]=t.team;savePF()}Hub.render()}}}):null;
    wrap.append(h('div',{class:'teamCard'+(myTeam===t.team&&!(mode==='extract'&&t.team!==1)?' mine':''),style:`--tc:${TEAM_HEX[Math.min(6,t.team>2&&mode==='extract'?t.team-1:t.team)]}`},h('h3',{text:t.name}),
      h('ul',{},...(hum.length?hum.map(n=>h('li',{text:n})):[h('li',{class:'empty',text:'（沒有真人）'})])),step,join))}
  const reset=isClient?null:h('button',{type:'button',class:'mini ghost',text:'恢復預設人數',on:{click:()=>{delete st.teamAI[mode];savePF();Hub.render()}}});
  return sec('人員配置',h('p',{class:'hint',style:'margin:0',text:inRoom?'朋友用房號或邀請連結加入後，可以自己選要加入哪一隊；房主調整每隊的 AI 人數。':mode==='extract'?'設定敵對小隊各有幾名 AI（敵對小隊數量在「進階」裡調整）。想和朋友一起打，到「連線」開房間。':'選擇要加入的隊伍，並調整每隊的 AI 人數。想和朋友一起打，到「連線」開房間。'}),wrap,reset)}

/* ---------- stash ---------- */
function tabStash(p){const lo=PF.loadout;fixLoadout();
  {const all=Object.keys(WEAPONS);const longs=all.filter(w=>WEAPONS[w].slot==='long'),pis=all.filter(w=>WEAPONS[w].slot==='pistol');const box=h('div',{class:'list'});
   PF.presets.forEach((pr,i)=>{const mk=(key,list,none)=>{const sl=h('select');if(none)sl.append(h('option',{value:'',text:'無'}));for(const w of list){const o=h('option',{value:w,text:WEAPONS[w].name});if(pr[key]===w)o.selected=true;sl.append(o)}sl.onchange=()=>{pr[key]=sl.value||null;savePF()};return sl};
     box.append(h('div',{class:'lrow',style:'grid-template-columns:70px 1fr 1fr 1fr'},h('b',{text:pr.name}),mk('p1',longs,true),mk('p2',longs,true),mk('pistol',pis,false)))});
   p.append(sec('重生模式配裝 A / B / C（全面戰場、團隊死鬥、奪取聖物、殭屍圍城使用，免費不會遺失）',box))}
  const sel=(label,cur,opts,onChange,meta)=>{const s=h('select');for(const [v,l] of opts){const o=h('option',{value:v,text:l});if(v===(cur||''))o.selected=true;s.append(o)}s.onchange=()=>{onChange(s.value||null);savePF();Hub.render()};return h('div',{class:'lrow'},h('span',{class:'lbl',text:label}),s,h('span',{class:'meta',text:meta||''}))};
  const longs=Object.keys(WEAPONS).filter(w=>WEAPONS[w].slot==='long'&&ownCount('weapons',w)>0);
  const wopts=[['','無'],...longs.map(w=>[w,`${WEAPONS[w].name}（擁有 ${ownCount('weapons',w)}）`])];
  const pist=[['g19',WEAPONS.g19.name+'（免費）'],...Object.keys(WEAPONS).filter(w=>WEAPONS[w].slot==='pistol'&&!WEAPONS[w].free&&ownCount('weapons',w)>0).map(w=>[w,WEAPONS[w].name])];
  const gopts=k=>Object.entries(GEAR[k]).filter(([id,g])=>g.price===0||ownCount('gear',id)>0).map(([id,g])=>[id,g.name+(g.price?`（擁有 ${ownCount('gear',id)}）`:'')]);
  const box=h('div',{class:'list'});
  box.append(sel('主武器',lo.p1,wopts,v=>lo.p1=v,lo.p1?WEAPONS[lo.p1].cls:''));box.append(sel('副武器',lo.p2,wopts,v=>lo.p2=v,lo.p2?WEAPONS[lo.p2].cls:''));box.append(sel('手槍',lo.pistol,pist,v=>lo.pistol=v||'g19'));
  box.append(sel('頭盔',lo.helmet,gopts('helmet'),v=>lo.helmet=v,`${GEAR.helmet[lo.helmet].tier} 級`));box.append(sel('護甲',lo.armor,gopts('armor'),v=>lo.armor=v,`${GEAR.armor[lo.armor].tier} 級 · 耐久 ${GEAR.armor[lo.armor].dur}`));
  box.append(sel('胸掛',lo.rig,gopts('rig'),v=>lo.rig=v,`${GEAR.rig[lo.rig].grid[0]}×${GEAR.rig[lo.rig].grid[1]} 格`));box.append(sel('背包',lo.bag,gopts('bag'),v=>lo.bag=v,`${GEAR.bag[lo.bag].grid[0]}×${GEAR.bag[lo.bag].grid[1]} 格`));
  box.append(sel('彈掛',lo.pouch,gopts('pouch'),v=>lo.pouch=v,`${GEAR.pouch[lo.pouch].mags} 個彈匣`));
  box.append(h('div',{class:'lrow'},h('span',{class:'lbl',text:'保險箱'}),h('b',{text:GEAR.safe[PF.safe].name}),h('span',{class:'meta',text:GEAR.safe[PF.safe].cap+' 格 · 商店升級'})));
  const step=(label,key,stashId,max)=>{const v=Math.min(lo[key]||0,ownCount('stash',stashId));lo[key]=v;return h('div',{class:'lrow'},h('span',{class:'lbl',text:label}),h('div',{class:'stepper'},
      h('button',{class:'mini',type:'button',text:'−',on:{click:()=>{lo[key]=Math.max(0,v-1);savePF();Hub.render()}}}),h('b',{text:String(v)}),h('button',{class:'mini',type:'button',text:'＋',on:{click:()=>{lo[key]=Math.min(max,ownCount('stash',stashId),v+1);savePF();Hub.render()}}})),h('span',{class:'meta',text:`倉庫 ${ownCount('stash',stashId)}`}))};
  box.append(step('急救包','meds','med',8));
  const tog=(label,key,id)=>{const c=h('input',{type:'checkbox'});c.checked=!!lo[key];c.onchange=()=>{lo[key]=c.checked;savePF()};return h('label',{class:'lrow',style:'cursor:pointer'},h('span',{class:'lbl',text:label}),c,h('span',{class:'meta',text:id.map(i=>`${ITEMS[i].name} ${ownCount('stash',i)}`).join(' · ')}))};
  box.append(tog('維修包','repair',['repair']),tog('鑰匙卡','keys',['keyR','keyB']),tog('信號彈','flare',['flare']));
  p.append(sec('出擊配裝',box,h('p',{class:'hint',text:'所選的槍枝與裝備會從倉庫帶出；成功撤離會連同戰利品帶回，陣亡則遺失（Glock 19 與基礎裝備除外）。'})));
  // stash contents
  const vals=Object.keys(PF.stash).filter(id=>ITEMS[id]&&!ITEMS[id].use&&!ITEMS[id].key&&PF.stash[id]>0).sort((a,b)=>ITEMS[b].v-ITEMS[a].v);
  const total=vals.reduce((s,id)=>s+ITEMS[id].v*PF.stash[id],0);
  const vl=h('div',{class:'list'});for(const id of vals){const it=ITEMS[id],n=PF.stash[id];vl.append(h('div',{class:'item'},h('span',{},h('span',{style:`color:${RARITY[it.r]}`,text:`${it.name} ×${n}`}),h('small',{text:`單價 ${fmt(it.v)} · ${it.w}×${it.h} 格`})),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('stash',id,1,it.v)}}),h('button',{type:'button',text:`全賣 ${fmt(it.v*n)}`,on:{click:()=>sell('stash',id,n,it.v)}})))}
  p.append(sec(`收藏品（總值 ${fmt(total)}）`,vals.length?vl:h('p',{class:'hint',text:'還沒有收藏品。出擊撤離後，帶回的物資會出現在這裡。'}),vals.length?h('div',{class:'btns'},h('button',{class:'go',type:'button',text:`一鍵出售全部 ${fmt(total)}`,on:{click:()=>{for(const id of vals){PF.money+=ITEMS[id].v*PF.stash[id];delete PF.stash[id]}savePF();blip(880,.1,'square',.05);Hub.render()}}})):null));
  const cons=Object.keys(PF.stash).filter(id=>ITEMS[id]&&(ITEMS[id].use||ITEMS[id].key)&&PF.stash[id]>0);const cl=h('div',{class:'list'});
  for(const id of cons){const it=ITEMS[id];cl.append(h('div',{class:'item'},h('span',{text:`${it.name} ×${PF.stash[id]}`}),h('span',{class:'price',text:fmt(Math.round(it.v*.5))}),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('stash',id,1,Math.round(it.v*.5))}})))}
  p.append(sec('消耗品與鑰匙卡',cons.length?cl:h('p',{class:'hint',text:'沒有消耗品。'})));
  const am=h('div',{class:'chips'});for(const k in AMMO)am.append(h('span',{class:'chip',text:`${AMMO[k].name} ${PF.ammo[k]||0}`}));p.append(sec('彈藥庫存',am));
  const gl=h('div',{class:'list'});for(const w in PF.weapons)if(PF.weapons[w]>0)gl.append(h('div',{class:'item'},h('span',{text:`${WEAPONS[w].name} ×${PF.weapons[w]}`}),h('span',{class:'price',text:fmt(WEAPONS[w].price*.5)}),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('weapons',w,1,WEAPONS[w].price*.5)}})));
  for(const id in PF.gear){const k=Object.keys(GEAR).find(k=>GEAR[k][id]);if(!k||PF.gear[id]<=0)continue;const g=GEAR[k][id];gl.append(h('div',{class:'item'},h('span',{text:`${g.name} ×${PF.gear[id]}`}),h('span',{class:'price',text:fmt(g.price*.5)}),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('gear',id,1,g.price*.5)}})))}
  p.append(sec('槍枝與裝備',gl))}
function sell(cat,id,n,price){addOwn(cat,id,-n);PF.money+=price*n;savePF();blip(880,.08,'square',.05);Hub.render()}

/* ---------- gunsmith ---------- */
let gsR=null,gsScene=null,gsCam=null,gsModel=null,gsRAF=0;
function gsStart(){const c=$('gsPrev');if(!c)return;if(!gsR){gsR=new T.WebGLRenderer({canvas:c,antialias:true,alpha:true});gsScene=new T.Scene();gsScene.add(new T.HemisphereLight(0xfff1dc,0x3a3024,1.1));const l=new T.DirectionalLight(0xffe0b0,1.2);l.position.set(1,2,1.5);gsScene.add(l);gsCam=new T.PerspectiveCamera(30,16/10,.01,10);gsCam.position.set(-.55,.18,.55);gsCam.lookAt(0,0,-.2);gsR.outputEncoding=T.sRGBEncoding}
  else if(gsR.domElement!==c){gsR.dispose();gsR=null;return gsStart()}
  const w=c.clientWidth,hh=c.clientHeight;gsR.setPixelRatio(Math.min(2,devicePixelRatio));gsR.setSize(w,hh,false);gsCam.aspect=w/hh;gsCam.updateProjectionMatrix();
  cancelAnimationFrame(gsRAF);const tick=t=>{if(!$('gsPrev')){gsRAF=0;return}if(gsModel)gsModel.rotation.y=Math.sin(t/1600)*.5+.3;gsR.render(gsScene,gsCam);gsRAF=requestAnimationFrame(tick)};gsRAF=requestAnimationFrame(tick)}
function gsStop(){cancelAnimationFrame(gsRAF);gsRAF=0;if(gsR){gsR.dispose();gsR=null}}
function gsSetModel(wid){if(!gsScene)return;if(gsModel)gsScene.remove(gsModel);const vm=buildVM(wid,PF.builds[wid]||{},true);gsModel=new T.Group();vm.g.visible=true;vm.g.position.set(0,0,.2);gsModel.add(vm.g);
  const S=VMSPEC[WEAPONS[wid].model];const len=S.pistol?.35:1;gsModel.scale.setScalar(S.pistol?1.9:1);gsScene.add(gsModel)}
function tabGun(p){const owned=Object.keys(WEAPONS).filter(w=>WEAPONS[w].free||ownCount('weapons',w)>0);if(!Hub.gsW||!owned.includes(Hub.gsW))Hub.gsW=owned[0];const wid=Hub.gsW;
  p.append(sec('選擇槍枝',seg(wid,owned.map(w=>[w,WEAPONS[w].name]),v=>{Hub.gsW=v})));
  const build=PF.builds[wid]||(PF.builds[wid]={});const st=weaponStats(wid,build),base=weaponStats(wid,{});const w=WEAPONS[wid];
  const stats=h('div',{class:'list'});const bar=(l,v,max,txt,better)=>h('div',{class:'stat'},h('span',{text:l}),h('div',{class:'meter'},h('div',{style:`width:${clamp(v/max,0,1)*100}%`})),h('b',{text:txt,style:better===true?'color:var(--exfil)':better===false?'color:var(--danger)':''}));
  const cmp=(a,b,hi)=>a===b?null:(hi?a>b:a<b);
  stats.append(bar('傷害',st.dmg*(w.pel||1),130,String(Math.round(st.dmg))+(w.pel?'×'+w.pel:''),cmp(st.dmg,base.dmg,true)),bar('射速',st.rpm,950,st.rpm+' rpm'),bar('彈容',st.mag,100,String(st.mag),cmp(st.mag,base.mag,true)),
    bar('穩定',.08-st.recoil,.08,Math.round((1-st.recoil/.07)*100)+'',cmp(st.recoil,base.recoil,false)),bar('腰射',.09-st.hip,.09,Math.round((1-st.hip/.09)*100)+'',cmp(st.hip,base.hip,false)),
    bar('開鏡',.4-st.adsT,.4,st.adsT.toFixed(2)+' s',cmp(st.adsT,base.adsT,false)),bar('倍率',st.zoom,8,st.zoom.toFixed(2)+'×',cmp(st.zoom,base.zoom,true)),bar('換彈',5-st.reload,5,st.reload.toFixed(1)+' s',cmp(st.reload,base.reload,false)),bar('噪音',80-st.noise,80,Math.round(st.noise)+' m',cmp(st.noise,base.noise,false)));
  p.append(h('div',{class:'gs'},h('canvas',{id:'gsPrev'}),h('div',{},h('div',{style:'font-family:var(--f-disp);font-weight:800;font-size:24px',text:w.name}),h('div',{class:'hint',text:`${w.cls} · ${AMMO[w.ammo].name}`}),stats)));
  for(const sl of ATT_SLOTS){const opts=Object.keys(ATTS).filter(a=>ATTS[a].slot===sl&&attAllowed(wid,a));if(!opts.length)continue;const row=h('div',{class:'list'});
    const cur=build[sl]||null;
    row.append(h('div',{class:'item'},h('span',{text:'無'+(sl==='optic'?'（機械瞄具）':'')}),h('span'),h('button',{type:'button',text:cur?'卸下':'使用中',disabled:cur?null:'',on:{click:()=>{delete build[sl];savePF();Hub.render()}}})));
    for(const a of opts){const A=ATTS[a],own=ownCount('atts',a)>0;
      row.append(h('div',{class:'item'},h('span',{},h('span',{text:A.name}),h('small',{text:A.desc})),h('span',{class:'price',text:own?'已擁有':fmt(A.price)}),
        h('button',{type:'button',text:cur===a?'使用中':own?'裝上':'購買並裝上',disabled:cur===a||(!own&&PF.money<A.price)?'':null,on:{click:()=>{if(!own){if(PF.money<A.price)return;PF.money-=A.price;addOwn('atts',a,1);blip(880,.08,'square',.05)}build[sl]=a;savePF();Hub.render()}}})))}
    p.append(sec(ATT_SLOT_NAME[sl],row))}
  p.append(h('p',{class:'hint',text:'配件購買後永久解鎖，可以裝在所有相容的槍上。改裝會套用到這把槍的所有出擊。'}));
  requestAnimationFrame(()=>{gsStart();gsSetModel(wid)})}

/* ---------- shop ---------- */
function openWeaponCrate(ci){const cr=CRATES[ci];if(PF.money<cr.price)return;PF.money-=cr.price;const tier=ci;
  if(Math.random()<cr.rate){const pool=Object.keys(WEAPONS).filter(w=>WEAPONS[w].crate&&WEAPONS[w].crate<=Math.max(1,tier));const ws=pool.map(w=>Math.pow(WEAPONS[w].crate,2));let r=Math.random()*ws.reduce((a,b)=>a+b,0),k=0;while(k<pool.length-1&&r>ws[k]){r-=ws[k];k++}
    const w=pool[k];addOwn('weapons',w,1);Hub.crateRes={ok:true,t:`開出 ${WEAPONS[w].name}！`,s:`${WEAPONS[w].cls} · 箱子限定 · 市值 ${fmt(WEAPONS[w].price)}`,col:RARITY[2+WEAPONS[w].crate]}}
  else{const pool=Object.keys(WEAPONS).filter(w=>!WEAPONS[w].crate&&!WEAPONS[w].free&&WEAPONS[w].price<=cr.price*.7);if(pool.length){const w=pick(pool);addOwn('weapons',w,1);Hub.crateRes={ok:false,t:`開出 ${WEAPONS[w].name}`,s:'普通槍枝（沒有開到限定槍）',col:'#d8d0bf'}}else{const back=Math.round(cr.price*.3);PF.money+=back;Hub.crateRes={ok:false,t:'沒有開到限定槍',s:'退還 '+fmt(back),col:'#d8d0bf'}}}
  savePF();blip(Hub.crateRes.ok?880:330,.15,'square',.06);if(Hub.crateRes.ok){blip(1320,.2,'square',.06,0,.12);blip(1760,.3,'square',.06,0,.26)}Hub.render()}
function openSkinCrate(ci){const cr=SKIN_CRATES[ci];if(PF.money<cr.price)return;PF.money-=cr.price;
  const cand=[];for(const op of OP_IDS)for(const k of ['purple','gold','red'])if(!PF.ownSkins[op+'.'+k])cand.push([op,k,{purple:6,gold:3,red:1+ci}[k]]);
  if(cand.length&&Math.random()<cr.rate){let r=Math.random()*cand.reduce((a,c)=>a+c[2],0),k=0;while(k<cand.length-1&&r>cand[k][2]){r-=cand[k][2];k++}const [op,sk]=cand[k];PF.ownSkins[op+'.'+sk]=1;
    Hub.crateRes={ok:true,t:`${OPERATORS[op].name} · ${SKINS[sk].name}`,s:'新外觀已解鎖，到「探員」頁套用',col:{purple:'#b36bff',gold:'#ffcf5a',red:'#ff3b2f'}[sk]}}
  else{const back=Math.round(cr.price*.3);PF.money+=back;Hub.crateRes={ok:false,t:cand.length?'沒有開到外觀':'外觀已全部收集',s:'退還 '+fmt(back),col:'#d8d0bf'}}
  savePF();blip(Hub.crateRes.ok?880:330,.15,'square',.06);Hub.render()}
function tabShop(p){const cats=[['weapons','槍枝'],['crates','開箱'],['atts','配件'],['armor','頭盔護甲'],['gear','胸掛背包彈掛'],['safe','保險箱'],['cons','彈藥消耗品'],['sell','出售']];
  p.append(seg(Hub.shopCat,cats,v=>{Hub.shopCat=v;Hub.crateRes=null}));const L=h('div',{class:'list',style:'margin-top:12px'});
  const row=(name,desc,price,owned,onBuy,label='購買',col)=>L.append(h('div',{class:'item'},h('span',{},h('span',{text:name,style:col?`color:${col}`:''}),h('small',{text:desc})),h('span',{class:'price',text:fmt(price)+(owned!=null?` · 擁有 ${owned}`:'')}),h('button',{type:'button',text:label,disabled:PF.money<price?'':null,on:{click:()=>{if(PF.money<price)return;PF.money-=price;onBuy();savePF();blip(880,.08,'square',.05);Hub.render()}}})));
  switch(Hub.shopCat){
  case 'weapons':{const order=['手槍','突擊步槍','衝鋒槍','射手步槍','狙擊步槍','輕機槍','霰彈槍'];const ws=Object.keys(WEAPONS).filter(w=>!WEAPONS[w].free).sort((a,b)=>order.indexOf(WEAPONS[a].cls)-order.indexOf(WEAPONS[b].cls)||WEAPONS[a].price-WEAPONS[b].price);
    for(const w of ws){const d=WEAPONS[w];const desc=`${d.cls} · 傷害 ${d.dmg}${d.pel?'×'+d.pel:''} · ${d.rpm} rpm · 彈匣 ${d.mag} · ${AMMO[d.ammo].name}`;
      if(d.crate)L.append(h('div',{class:'item'},h('span',{},h('span',{text:d.name,style:`color:${RARITY[2+d.crate]}`}),h('small',{text:desc})),h('span',{class:'price',text:`${CRATES[Math.max(1,d.crate)].name}以上限定 · 擁有 ${ownCount('weapons',w)}`}),h('button',{type:'button',text:'去開箱',on:{click:()=>{Hub.shopCat='crates';Hub.render()}}})));
      else row(d.name,desc,d.price,ownCount('weapons',w),()=>addOwn('weapons',w,1))}break}
  case 'crates':{if(Hub.crateRes){const r=Hub.crateRes;p.append(h('div',{class:'crateRes'+(r.ok?' ok':''),style:`--cc:${r.col}`},h('b',{text:r.t}),h('small',{text:r.s})))}
    L.append(h('h3',{class:'subh',text:'槍械箱（開出箱子限定槍的機率）'}));CRATES.forEach((cr,i)=>{const pool=Object.keys(WEAPONS).filter(w=>WEAPONS[w].crate&&WEAPONS[w].crate<=Math.max(1,i)).map(w=>WEAPONS[w].name).join('、');
      L.append(h('div',{class:'item'},h('span',{},h('span',{text:cr.name,style:`color:${cr.col}`}),h('small',{text:`限定槍機率 ${Math.round(cr.rate*100)}% · 可能開出：${pool}；沒中會拿到一把普通槍`})),h('span',{class:'price',text:fmt(cr.price)}),h('button',{type:'button',text:'開箱',disabled:PF.money<cr.price?'':null,on:{click:()=>openWeaponCrate(i)}})))});
    L.append(h('h3',{class:'subh',text:'外觀箱（開出探員紫／金／紅外觀的機率）'}));SKIN_CRATES.forEach((cr,i)=>{L.append(h('div',{class:'item'},h('span',{},h('span',{text:cr.name,style:`color:${cr.col}`}),h('small',{text:`外觀機率 ${Math.round(cr.rate*100)}% · 越高級的箱子越容易開到紅色外觀；沒中退還 30%`})),h('span',{class:'price',text:fmt(cr.price)}),h('button',{type:'button',text:'開箱',disabled:PF.money<cr.price?'':null,on:{click:()=>openSkinCrate(i)}})))});break}
  case 'atts':for(const a in ATTS){const A=ATTS[a];if(ownCount('atts',a))continue;row(`${ATT_SLOT_NAME[A.slot]} · ${A.name}`,A.desc,A.price,null,()=>addOwn('atts',a,1),'解鎖')}if(!L.children.length)L.append(h('p',{class:'hint',text:'所有配件都已解鎖。'}));break;
  case 'armor':for(const k of ['helmet','armor'])for(const id in GEAR[k]){const g=GEAR[k][id];if(!g.price)continue;row(g.name,`${g.tier} 級防護 · 耐久 ${g.dur} · 減傷 ${Math.round(TIER_PROT[g.tier]*100)}%`,g.price,ownCount('gear',id),()=>addOwn('gear',id,1),'購買',RARITY[Math.min(6,g.tier)])}break;
  case 'gear':for(const k of ['bag','rig','pouch'])for(const id in GEAR[k]){const g=GEAR[k][id];if(!g.price)continue;row(g.name,k==='pouch'?`可攜帶 ${g.mags} 個彈匣（備彈 ×${g.mul}）`:`${g.cap} 格（${g.grid[0]}×${g.grid[1]}）`,g.price,ownCount('gear',id),()=>addOwn('gear',id,1))}break;
  case 'cons':for(const c in AMMO){const n=c==='338'?10:c==='50bmg'?10:c==='12g'||c==='357'?20:60;row(`${AMMO[c].name} ×${n}`,'彈藥',AMMO[c].price*n,PF.ammo[c]||0,()=>{PF.ammo[c]=(PF.ammo[c]||0)+n})}
    for(const id of ['med','surg','repair','flare']){const it=ITEMS[id];row(it.name,{med:'回復 45 生命',surg:'回復全部生命',repair:'護甲耐久 +40',flare:'呼叫直升機到直升機坪撤離'}[id],Math.round(it.v*1.2),ownCount('stash',id),()=>addOwn('stash',id,1))}break;
  case 'safe':for(const id in GEAR.safe){const g=GEAR.safe[id];if(!g.price)continue;const cur=GEAR.safe[PF.safe].cap>=g.cap;L.append(h('div',{class:'item'},h('span',{},h('span',{text:g.name}),h('small',{text:`${g.cap} 格（${g.grid[0]}×${g.grid[1]}）· 陣亡時保留內容物`})),h('span',{class:'price',text:fmt(g.price)}),h('button',{type:'button',text:cur?'已擁有':'升級',disabled:cur||PF.money<g.price?'':null,on:{click:()=>{PF.money-=g.price;PF.safe=id;savePF();blip(880,.08,'square',.05);Hub.render()}}})))}break;
  case 'sell':Hub.tab='stash';Hub.render();return}
  p.append(L)}

/* ---------- operators ---------- */
let opR=null,opScene=null,opCam=null,opRig=null,opRAF=0,opPose='idle',opView=null,opT=0;
const OP_POSES=[['idle','待命'],['walk','行走'],['run','衝刺'],['crouch','蹲下'],['prone','趴下'],['reload','換彈'],['throw','投擲'],['jump','跳躍'],['down','倒地'],['wave','揮手']];
function opStart(){const c=$('opPrev');if(!c)return;if(!opR||opR.domElement!==c){if(opR)opR.dispose();opR=new T.WebGLRenderer({canvas:c,antialias:true,alpha:true});opR.outputEncoding=T.sRGBEncoding;opR.toneMapping=T.ACESFilmicToneMapping;opR.toneMappingExposure=1.15;opScene=new T.Scene();
    opScene.add(new T.HemisphereLight(0xfff1dc,0x3a3024,1.05));const l=new T.DirectionalLight(0xffe0b0,1.25);l.position.set(1.5,3,2.5);opScene.add(l);const r=new T.DirectionalLight(0x8ab4ff,.5);r.position.set(-2,1.5,-2);opScene.add(r);
    const fl=new T.Mesh(new T.CircleGeometry(1.4,40),new T.MeshStandardMaterial({color:0x2a2a24,roughness:.9}));fl.rotation.x=-Math.PI/2;opScene.add(fl);opCam=new T.PerspectiveCamera(30,1,.05,30)}
  const w=c.clientWidth,hh=c.clientHeight;opR.setPixelRatio(Math.min(2,devicePixelRatio));opR.setSize(w,hh,false);opCam.aspect=w/hh;opCam.updateProjectionMatrix();
  cancelAnimationFrame(opRAF);let last=performance.now();const tick=t=>{if(!$('opPrev')){opStop();return}const dt=Math.min(.05,(t-last)/1000);last=t;opT+=dt;
    if(opRig){const pz=opPose;const s={spd:0,fwd:1};if(pz==='walk')s.spd=3.6;if(pz==='run'){s.spd=6.5;s.sprint=1}if(pz==='crouch')s.crouch=1;if(pz==='prone'){s.prone=1;s.spd=Math.sin(opT)>0?1:0}
      if(pz==='reload')s.reload=(opT%2.2)/2.2;if(pz==='throw')s.thr=(opT%1.4)/1.4;if(pz==='jump')s.air=Math.sin(opT*3)>0;if(pz==='down')s.down=1;if(pz==='wave')s.emote='wave';s.pitch=pz==='idle'?Math.sin(opT*.7)*.15:0;
      rigAnimate(opRig,s,dt);opRig.root.rotation.y=opView!==null?opView:Math.sin(opT*.4)*.6+.5}
    const pr=opPose==='prone';opCam.position.set(0,pr?1.1:1.25,pr?4.6:4.2);opCam.lookAt(0,pr?.35:.95,0);opR.render(opScene,opCam);opRAF=requestAnimationFrame(tick)};opRAF=requestAnimationFrame(tick)}
function opStop(){cancelAnimationFrame(opRAF);opRAF=0;if(opR){opR.dispose();opR=null}opRig=null}
function opSetRig(id,skin){if(!opScene)return;if(opRig){opScene.remove(opRig.root);rigDispose(opRig)}opRig=makeRig({op:id,skin,team:1,wid:PF.loadout.p1||'m4a1'});opScene.add(opRig.root)}
function tabOps(p){Hub.opSel=Hub.opSel&&OPERATORS[Hub.opSel]?Hub.opSel:PF.operator;const id=Hub.opSel,o=OPERATORS[id];const owned=k=>k==='base'||!!PF.ownSkins[id+'.'+k]||liveSkinFree(id);
  const curSkin=(PF.skin||{})[id]||'base';Hub.opSkin=Hub.opSkin&&Hub.opSkinOp===id?Hub.opSkin:curSkin;Hub.opSkinOp=id;const viewSkin=Hub.opSkin;
  const skinRow=h('div',{class:'seg skins'});for(const k of SKIN_ORDER){const sk=SKINS[k];const col={base:'#efe7d6',purple:'#b36bff',gold:'#ffcf5a',red:'#ff3b2f'}[k];
    skinRow.append(h('button',{type:'button','aria-pressed':String(viewSkin===k),style:`color:${col}`,html:`${esc(sk.name)}${sk.loot?'<small> 爆率'+sk.loot+'</small>':''}${owned(k)?(curSkin===k?' ✓':''):'<small> '+fmt(sk.price)+'</small>'}`,on:{click:()=>{Hub.opSkin=k;opSetRig(id,k);Hub.render()}}}))}
  const poseRow=h('div',{class:'seg poses'});for(const [k,l] of OP_POSES)poseRow.append(h('button',{type:'button','aria-pressed':String(opPose===k),text:l,on:{click:function(){opPose=k;opT=0;[...poseRow.children].forEach(b=>b.setAttribute('aria-pressed',String(b===this)))}}}));
  const act=h('div',{class:'btns'});const isSel=PF.operator===id;
  act.append(h('button',{type:'button',class:isSel?'ghost':'',text:isSel?'目前使用中':'使用這位探員',on:{click:()=>{PF.operator=id;savePF();Hub.render()}}}));
  if(!owned(viewSkin))act.append(h('button',{type:'button',text:`購買 ${SKINS[viewSkin].name}（${fmt(SKINS[viewSkin].price)}）`,disabled:PF.money<SKINS[viewSkin].price?'':false,on:{click:()=>{if(PF.money<SKINS[viewSkin].price)return;PF.money-=SKINS[viewSkin].price;PF.ownSkins[id+'.'+viewSkin]=1;PF.skin[id]=viewSkin;savePF();Hub.render()}}}));
  else if(curSkin!==viewSkin)act.append(h('button',{type:'button',class:'ghost',text:'套用這個外觀',on:{click:()=>{PF.skin[id]=viewSkin;savePF();Hub.render()}}}));
  const sk=(k,key)=>{const x=o[k];return h('div',{class:'skrow'},h('kbd',{text:key}),h('div',{},h('b',{text:x.name+'　'}),h('small',{text:`冷卻 ${x.cd} 秒${x.charges?' · '+x.charges+' 次':''}`}),h('p',{text:x.desc})))};
  const detail=h('div',{class:'opdetail'},
    h('div',{class:'opview'},h('canvas',{id:'opPrev'}),h('div',{class:'opview-ctl'},h('button',{type:'button',class:'ghost',text:'⟲',title:'轉向',on:{click:()=>{opView=opView===null?0:(opView+Math.PI/3)}}}))),
    poseRow,
    h('div',{class:'ophead'},h('h3',{text:o.name,style:`color:${o.color}`}),h('span',{class:'role',text:o.role+' · '+o.desc})),
    skinRow,act,
    h('div',{class:'skills'},sk('s1','長按 Q'),sk('s2','B'),sk('s3','V'),h('div',{class:'skrow pas'},h('kbd',{text:'被動'}),h('div',{},h('b',{text:o.passive.name}),h('p',{text:o.passive.desc})))));
  const g=h('div',{class:'oplist'});for(const k of OP_IDS){const x=OPERATORS[k];g.append(h('button',{class:'opc',type:'button','aria-pressed':String(k===id),on:{click:()=>{Hub.opSel=k;Hub.render()}}},
    h('i',{style:`background:${x.color}`}),h('b',{text:x.name}),h('small',{text:x.role}),PF.operator===k?h('em',{text:'使用中'}):''))}
  p.append(h('div',{class:'opwrap'},detail,sec(`探員（${OP_IDS.length}）`,g)));
  requestAnimationFrame(()=>{opStart();opSetRig(id,viewSkin)})}

/* ---------- net ---------- */
function copyText(t,btn){const ok=()=>{if(btn){const o=btn.textContent;btn.textContent='已複製';setTimeout(()=>btn.textContent=o,1200)}};try{navigator.clipboard.writeText(t).then(ok,()=>prompt?0:0)}catch(e){}}
function tabNet(p){const av=netAvailable();
  if(!av.ok)p.append(h('p',{class:'warn',text:av.why}));
  const nick=h('input',{type:'text',maxlength:'12',placeholder:'你的暱稱',value:PF.nick||''});nick.addEventListener('change',()=>{PF.nick=nick.value.trim().slice(0,12);savePF()});
  const saveNick=()=>{PF.nick=nick.value.trim().slice(0,12)||PF.nick||('玩家'+(Math.random()*900+100|0));savePF()};
  p.append(sec('暱稱',nick));
  const inRoom=NET.status!=='idle';
  if(!inRoom){const qm=h('div',{class:'chips'});for(const k of ['extract','conquest','rats','disaster','sf','nuke','bedwars','bio','tdm'])qm.append(h('button',{type:'button',class:'chip tog',text:MODES[k].name,disabled:NET.matching?'':null,on:{click:()=>{saveNick();quickMatch(k)}}}));
    p.append(sec('公開匹配（1 分鐘）',h('div',{},qm,h('p',{class:'hint',style:'margin:0',text:serverUrl()?'選一個模式開始配對，最多 60 秒；人數不足的位置由 AI 補滿。':'需要先在「設定」填入配對伺服器網址才能公開匹配；也可以用下面的房號邀請朋友（私人房間）。'}))))}
  if(!inRoom){
    if(Hub.joinCode){p.append(sec('受邀加入',h('div',{class:'btns'},h('button',{class:'go',type:'button',text:'加入房間 '+Hub.joinCode,disabled:av.ok?null:'',on:{click:()=>{saveNick();netCreate(false,Hub.joinCode);Hub.joinCode=null;Hub.render()}}}))))}
    const code=h('input',{type:'text',maxlength:'6',placeholder:'輸入房號',style:'text-transform:uppercase;width:140px;font-size:18px;letter-spacing:.2em'});
    p.append(sec('開房或加入',h('div',{class:'btns'},
      h('button',{class:'go',type:'button',text:'建立房間',disabled:av.ok?null:'',on:{click:()=>{saveNick();const c=Array.from({length:5},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');netCreate(true,c);Hub.render()}}}),
      code,h('button',{class:'ghost',type:'button',text:'加入',disabled:av.ok?null:'',on:{click:()=>{const c=code.value.trim().toUpperCase();if(c.length<4)return;saveNick();netCreate(false,c);Hub.render()}}}))));
    const list=h('div',{class:'list',id:'pubList'},h('p',{class:'hint',text:'按「重新整理」看看有沒有人開房。'}));
    p.append(sec('公開房間（測試功能）',h('div',{class:'btns'},h('button',{class:'mini',type:'button',text:'重新整理',disabled:av.ok?null:'',on:{click:()=>{list.innerHTML='<p class="hint">搜尋中…</p>';pubList(rows=>{list.innerHTML='';if(!rows.length){list.append(h('p',{class:'hint',text:'目前沒有公開房間。你可以自己開一間，別人重新整理就看得到。'}));return}
      for(const r of rows)list.append(h('div',{class:'item'},h('span',{},h('span',{text:`${r.host} 的房間`}),h('small',{text:`${MODES[r.mode]?MODES[r.mode].name:''} · ${MAPS[r.map]?MAPS[r.map].name:''} · ${r.n} 人${r.playing?' · 遊戲中':''}`})),h('span',{class:'price',text:r.code}),h('button',{type:'button',text:'加入',on:{click:()=>{saveNick();netCreate(false,r.code);Hub.render()}}})))})}}})),list));
    p.append(h('p',{class:'hint',text:'連線用 WebRTC 點對點，敵人由房主的電腦模擬。公開房間清單由正在玩的玩家互相轉發，人少時可能看不到，直接分享房號或邀請連結最穩。'}))}
  else{const code=h('b',{text:NET.code,style:'font-family:var(--f-num);font-size:32px;letter-spacing:.24em;color:var(--amber)'});
    const c1=h('button',{class:'mini',type:'button',text:'複製房號'});c1.onclick=()=>copyText(NET.code,c1);const c2=h('button',{class:'mini',type:'button',text:'複製邀請連結'});c2.onclick=()=>copyText(inviteLink(),c2);
    p.append(sec('房間',h('div',{style:'display:flex;gap:12px;align-items:center;flex-wrap:wrap'},code,c1,c2,h('button',{class:'mini',type:'button',text:'離開房間',on:{click:()=>{netLeave();Hub.render()}}})),h('p',{class:'hint',style:'margin:0;user-select:text',text:'邀請連結：'+inviteLink()})));
    const set=NET.isHost?lobbySettings():NET.hostSet;const teamMode=set&&MODES[set.mode]&&MODES[set.mode].team;
    if(set&&teamList(set.mode)&&set.mode!=='extract'){const me=NET.members[NET.myId]||{};p.append(sec('選隊伍',seg(me.team||1,teamList(set.mode).map(t=>[t.team,t.name]),v=>netSetTeam(v)),h('p',{class:'hint',style:'margin:0',text:'每隊的 AI 人數由房主在「出擊」頁的人員配置調整。'})))}
    p.append(sec('成員',h('div',{class:'list',id:'netMembers'})));
    if(set)p.append(sec('對局設定',h('div',{class:'chips'},h('span',{class:'chip',text:MODES[set.mode].name}),h('span',{class:'chip',text:MAPS[set.map].name}),h('span',{class:'chip',text:DIFFS[set.diff].name}),...(set.mut||[]).map(m=>h('span',{class:'chip',text:MUTATORS[m]})),h('span',{class:'chip',text:'友軍傷害 '+(set.ff?'開':'關')}),h('span',{class:'chip',text:'撿武器 '+(set.pickup!==false?'開':'關')}))));
    if(NET.isHost)p.append(h('div',{class:'btns'},h('button',{class:'go',type:'button',text:'選模式並開始',on:{click:()=>{Hub.tab='deploy';Hub.render()}}}),h('button',{class:'ghost',type:'button',text:'房間設定',on:{click:()=>{Hub.tab='set';Hub.render()}}})));
    else p.append(h('p',{class:'hint',text:'等待房主開始對局。'}))}
  p.append(h('div',{class:'netstatus'+(Hub.netErr?' err':''),id:'netStatus',text:Hub.netMsg||''}));renderMembers()}
function renderMembers(){const ml=$('netMembers');if(!ml)return;ml.innerHTML='';const set=NET.isHost?lobbySettings():NET.hostSet;const teamMode=set&&MODES[set.mode]&&MODES[set.mode].team;
  for(const id in NET.members){const m=NET.members[id];ml.append(h('div',{class:'item'},h('span',{},h('span',{text:(m.host?'房主 · ':'')+m.nick+(id===NET.myId?'（你）':'')}),h('small',{text:OPERATORS[m.op]?OPERATORS[m.op].name:''})),h('span',{class:'price',style:teamMode?`color:${TEAM_HEX[m.team||1]}`:'',text:teamMode?((teamList(set.mode)||[]).find(t=>t.team===(m.team||1))||{name:''}).name:''}),h('span')))}}
UI.netStatus=(msg,err)=>{Hub.netMsg=msg;Hub.netErr=!!err;const el=$('netStatus');if(el){el.textContent=msg;el.classList.toggle('err',!!err)}if(err&&NET.status==='connecting'){NET.status='idle';if(Hub.tab==='net'&&!M.running)Hub.render()}};
UI.netLobby=()=>{if(!M.running&&(Hub.tab==='net'||Hub.tab==='deploy'))Hub.render();else renderMembers()};

/* ---------- settings ---------- */
function tabSettings(p){const st=S_();const s=h('div',{class:'settings'});
  const slider=(label,key,min,max,step,fmtf,after)=>{const i=h('input',{type:'range',id:'set_'+key,min:String(min),max:String(max),step:String(step),value:String(st[key])});const v=h('span',{text:fmtf(st[key]),style:'font-family:var(--f-num);font-size:13px;min-width:46px'});
    i.addEventListener('input',()=>{st[key]=+i.value;v.textContent=fmtf(st[key]);savePF();after&&after()});s.append(h('label',{for:'set_'+key,text:label}),h('div',{style:'display:flex;gap:10px;align-items:center'},i,v))};
  slider('滑鼠靈敏度','sens',.2,3,.05,v=>v.toFixed(2));slider('開鏡靈敏度','adsSens',.3,2,.05,v=>'×'+v.toFixed(2));slider('音量','vol',0,1,.05,v=>Math.round(v*100)+'%',()=>{if(master)master.gain.value=st.vol});slider('視野 FOV','fov',65,100,1,v=>v+'°');
  s.append(h('span',{text:'畫質'}),seg(st.quality,[['auto','自動'],['low','低'],['mid','中'],['high','高']],v=>{st.quality=v;savePF();applyQuality()}));
  s.append(h('span',{text:'開鏡方式'}),seg(st.adsMode,[['toggle','按一下切換'],['hold','按住瞄準']],v=>{st.adsMode=v;savePF()}));
  const tog=(label,key)=>{s.append(h('span',{text:label}),seg(st[key]?1:0,[[1,'開'],[0,'關']],v=>{st[key]=!!v;savePF()}))};
  tog('命中音效','hitSnd');tog('擊殺語音','killVoice');tog('陣亡回放 KILLCAM','killcam');tog('顯示 FPS','fps');
  p.append(sec('遊戲設定',s));p.append(keySec());
  const r=h('div',{class:'settings'});const tog2=(label,key)=>{r.append(h('span',{text:label}),seg(st[key]?1:0,[[1,'開'],[0,'關']],v=>{st[key]=!!v;savePF();if(NET.isHost)netBroadcastLobby()}))};
  tog2('友軍傷害','ff');tog2('可撿地上武器','pickup');tog2('房間公開列出','pub');
  p.append(sec('房間設定（你當房主時套用）',r));
  const sv=h('input',{type:'url',placeholder:'https://greyzone-match.你的帳號.workers.dev',value:st.server||''});sv.addEventListener('change',()=>{st.server=sv.value.trim();savePF()});
  const test=h('button',{type:'button',class:'mini',text:'測試連線',on:{click:async()=>{const u=(sv.value||'').trim().replace(/\/$/,'');try{const r=await fetch(u+'/health');test.textContent=r.ok?'連線成功 ✓':'失敗'}catch(e){test.textContent='連不上'}}}});
  const rs=h('div',{class:'settings'});rs.append(h('span',{text:'網址'}),h('div',{style:'display:flex;gap:8px'},sv,test),h('span',{text:'連線方式'}),seg(st.relay===false?0:1,[[1,'經伺服器轉發（穩定）'],[0,'點對點（較快）']],v=>{st.relay=!!v;savePF()}));
  p.append(sec('配對伺服器（Cloudflare Workers）',h('div',{},rs,h('p',{class:'hint',style:'margin:0',text:'填入後可以使用「公開匹配」（最多等 60 秒，人數不足由 AI 補滿），房間也會改由伺服器轉發，學校或公司網路擋 WebRTC 時也能連。部署方法見 worker 資料夾的 README。'}))))}

/* ---------- help ---------- */
// 每個按鍵：[按鍵, 做什麼, 補充說明]；說明頁依類別分組
const HELP_KEYS=[
 ['移動與姿勢','',[
  ['WASD','移動','走路會發出腳步聲，蹲下或趴下比較安靜'],
  ['Shift','衝刺','消耗體力；體力見底會喘氣變慢，跳躍也會扣體力'],
  ['Space','跳躍 / 翻越 / 爬梯','對著齊腰高的矮牆按會直接翻過去；貼著梯子按住往上爬'],
  ['C','蹲下 / 站起','蹲下時腰射更準、目標更小'],
  ['衝刺中按 C','滑鏟','滑完自動站起，適合衝過空曠處'],
  ['X','趴下 / 起身','最隱蔽，但移動很慢；站在坡頂趴下可以只露出頭'],
  ['Q / E','向左 / 右探頭','切換式；從掩體邊探頭只會露出半個身體（開鏡時短按 Q 改成切換側鏡）'],
  ['水中','空白鍵上浮、C 下潛','潛水有 30 秒氧氣，畫面下方會出現氧氣條']]],
 ['射擊與武器','',[
  ['左鍵','射擊','拿著技能道具或手雷時，左鍵改成「使用」'],
  ['右鍵','開鏡 / 關鏡','狙擊鏡連按兩下右鍵進入第二段放大'],
  ['右鍵 → Q','切換側鏡','先按右鍵開鏡，再短按 Q 切到側鏡（Alt 也可以）；畫面中央會出現側鏡紅點，子彈打在紅點上。需要改槍台裝上 45° 側置紅點'],
  ['R','換彈','右下角顯示彈匣 / 備彈'],
  ['1 2 3 4 / 滾輪','切換武器','主武器 / 副武器 / 手槍 / 刀'],
  ['滑鼠中鍵','快速近戰（快速刀）','不用切到刀就能揮一下'],
  ['P','丟下手上的槍','在背包裡滑鼠指著物品按 P 是丟棄該物品']]],
 ['探員技能','每位探員有小招、二招、大招和一個被動。按技能鍵只是「拿出」道具，要再按左鍵才會真的使用。',[
  ['長按 Q 0.4 秒','拿出小招','短按 Q 是探頭（開鏡時是切側鏡），按住超過 0.4 秒才是小招'],
  ['B','拿出二招',''],
  ['V','拿出大招','大招冷卻最久，畫面右下技能格會顯示倒數'],
  ['G','拿出探員手雷','按住左鍵蓄力、放開丟出；按越久丟越遠'],
  ['右鍵 / 再按一次同一鍵','收起道具','收起不會進入冷卻']]],
 ['互動與道具','',[
  ['F','互動','物資箱、屍體、保險櫃要「按住」搜索；門、電閘、上車、砲塔按一下'],
  ['H','治療','治療中移動會變慢；被植入追蹤晶片時，治療完成會順便把晶片挖出來'],
  ['T','修復護甲','需要背包裡有修甲包'],
  ['L','手電筒','開著燈敵人更容易看到你'],
  ['Z','夜視鏡','夜晚或暗處使用'],
  ['J','動作','跳舞、唱歌、吃東西、喝水、打牌（第三人稱）'],
  ['K','隨身電腦','站在訊號中繼站（地圖上的綠色 H）8 m 內打開，選 400 m 內的敵人駭入：對方 20 秒位置暴露、移動變慢、畫面受干擾']]],
 ['團隊溝通','',[
  ['O','標點','準心指著地面或建築按 O，放一個黃色標點（最遠 300 m，30 秒後消失）'],
  ['O（指著敵人）','發現敵人','準心對準敵人按 O，該敵人被全隊標記 8 秒，穿牆可見'],
  ['O（指著自己的標點）','取消標點','準心指著原標點 5 m 內再按一次'],
  ['M 大地圖點一下','發座標','點在地圖上任何位置就放標點（隊友會前往）；再點同一處取消。滾輪縮放、拖曳移動、雙擊回到核心區'],
  ['偵察鳥飛行中按 O','空中發座標','蒼鷹的飛鳥偵查：從空中對準地面按 O 發座標（最遠 600 m）'],
  ['Enter','聊天','只有連線時可用']]],
 ['載具與固定武器','走到載具旁邊按 F 上車，再按 F 下車。',[
  ['駕駛','WASD 開、空白鍵煞車','可以撞倒敵人'],
  ['坦克','滑鼠轉砲塔、左鍵開砲','裝甲厚，但怕飛彈和反坦克地雷'],
  ['直升機','空白鍵上升、C 下降、左鍵機砲','在空中按 F 會直接跳機'],
  ['重機槍 / 飛彈發射器','F 使用、左鍵射擊','重機槍會過熱；飛彈發射器有冷卻'],
  ['戰鬥機（全面戰場）','W 油門、S 減速、滑鼠左右轉向、空白鍵拉高、C 壓低、A/D 側滾','起飛要助跑：先按 W 加速到 45 m/s 以上再按空白鍵拉起；低於 40 m/s 會失速。左鍵機砲；右鍵導引飛彈（飛向準心，用滑鼠引導，再按右鍵提早引爆，冷卻 8 秒；導引時戰鬥機自動減速、保持高度緩慢前進）；F 彈射跳傘']]],
 ['介面','',[
  ['Tab','背包 / 計分板','撤離模式是背包：拖曳物品放到你想要的格子（放不下會自動試著轉 90°，也可以拖曳時按 R 旋轉）、拖到空白處或「丟棄區」丟在地上；背包與胸掛可以連同內容物一起拖進箱子；其他模式是計分板'],
  ['M','大地圖','顯示地標、撤離點、被標記的敵人和標點'],
  ['F1–F3','切換重生配裝','只在可重生的模式有效'],
  ['Esc','暫停','連線時只會打開選單，遊戲不會停']]]];
function tabHelp(p){p.append(h('p',{class:'hint',text:'以下是預設按鍵；可以到「設定 → 按鍵設定」改成你習慣的鍵。'}));
  for(const [title,intro,list] of HELP_KEYS){const kids=[];if(intro)kids.push(h('p',{class:'hint',text:intro}));
    kids.push(h('div',{class:'keys keys2',html:list.map(([k,v,n])=>`<span><kbd>${k}</kbd><b>${v}</b>${n?`<small>${n}</small>`:''}</span>`).join('')}));p.append(sec(title,...kids))}
  p.append(sec('手機操作',h('p',{class:'hint',text:'左半邊拖曳移動，推到底自動衝刺；衝刺時按「蹲/滑」會滑鏟。右半邊拖曳轉視角，按住射擊鍵時也可以拖曳瞄準，並會輕微自動吸附敵人。靠近物資箱、門、電閘時會出現互動按鈕，按住即可。下排的「標點」鈕等於 O 鍵。建議橫向遊玩。'})));
  p.append(sec('地形',h('p',{class:'hint',html:'<b>10 × 10 公里大世界</b>：烽火撤離和全面戰場的地圖是 10 km 見方，原本的地圖在正中央（核心區），外圍是丘陵與山脈，散布 20 多個小據點（村莊、哨站、倉儲站、通訊站、農場、墜機點），每個都有物資和守軍；最遠的 3 個據點有撤離點，4 個有車庫。其他模式只用核心區。<br>野外地圖（長風谷、叢林、寒脊研究站、斷河水壩、赤沙綠洲、餘燼核電廠）核心區也有明顯起伏；星港發射場、怒濤監獄只有少量緩坡；城市地圖（灰區鎮、台北101）核心區大致平坦。<br>· <b>山丘會擋子彈和視線</b>：躲在坡後面敵人打不到你，AI 也看不到你。<br>· <b>佔高點</b>：坡頂視野遠，但站在稜線上很顯眼，趴下或退半步只露頭比較安全。<br>· <b>小地圖與大地圖</b>：亮的地方比較高，細線是每 5 公尺一條的等高線。<br>· 建築、道路、撤離點周圍一定是平地。'})));
  p.append(sec('物品顏色與價值',h('p',{class:'hint',html:'背包裡的物品只寫名字和實際價格，<b>名字的顏色代表值多少錢</b>：'+VAL_TIERS.map(t=>`<b style="color:${t[1]}">${t[2]}</b>（${t[0]?fmt(t[0])+' 以上':'以下'}）`).join('、')+'。物品佔幾格就畫幾格；拖到放不下的地方會自動偵測要不要轉 90°。'})));
  p.append(sec('挖寶、駭入與活動',h('p',{class:'hint',html:'· <b>挖寶</b>：物資箱、保險櫃、金庫偶爾開出「藏寶圖」，在背包裡點一下讀取，大地圖上出現金色圓圈；走到 25 m 內會看到土堆，按住 F 挖出寶箱（至少 3 件高價值物品）。也可以把自己的東西拖到「埋藏」格，下一局再挖。<br>· <b>隨身電腦</b>（K）：站在訊號中繼站旁駭入敵人，4 秒完成，冷卻 45 秒。被駭的人按 H 用醫療包可以重開機解除。<br>· <b>皮膚爆率</b>：紫皮 +10%、金皮 +20%、紅皮 +35%（烽火撤離容器開出高價值物品的機率）。<br>· <b>定期活動</b>（每 2 天輪替）：特殊頭目、特殊地圖（血月之夜）、特殊探員、特殊任務，出擊頁最上方會顯示目前活動與剩餘時間。<br>· <b>人員配置</b>：出擊頁可以選要加入哪一隊、調整每隊 AI 人數；開房間後朋友可以自己選隊。<br>· <b>連線同步</b>：烽火撤離中，一個容器被搜過後，其他人打開只剩下沒被拿走的東西；丟在地上的東西全場都看得到、撿得到。'})));
  p.append(sec('標記、晶片與標點',h('p',{class:'hint',html:'· <b style="color:#ff4b3e">紅色標記</b>：被技能偵測或被隊友按 O 標出的敵人，頭上出現紅色標記，穿牆可見，小地圖和大地圖也會顯示。<br>· <b style="color:#ff4b3e">追蹤晶片</b>（蒼鷹小招）：命中後 30 秒內位置一直暴露給對方全隊。如果是你被植入，畫面會跳警告，狀態列會倒數，附近 120 m 的敵方 AI 會一直追著你。按 H 用醫療包（即使滿血也可以）治療完成時會把晶片挖出來。<br>· <b style="color:#ffc640">黃色標點</b>：你自己按 O 放的；<b style="color:#6fd0ff">藍色標點</b>是隊友放的，旁邊會寫是誰。標點上方會顯示距離。<br>· 同隊的 AI 隊友（團隊死鬥、全面戰場等模式）看到標點會跑過去，在附近散開待命；遇到敵人會先打，打完繼續過去。'})));
  p.append(sec('撤離方式',h('p',{class:'hint',html:'<b style="color:#72f5a8">常規撤離</b> 隨時可用。<b style="color:#ffb547">付費撤離</b> 在撤離點按住 F 支付倉庫資金。<b style="color:#ff4b3e">拉閘撤離</b> 要先找到黃色電閘拉下，會觸發警報。<b style="color:#9ad0ff">直升機撤離</b> 在中段時間自動開放，或發射信號彈呼叫。<b style="color:#6db5ff">無背包撤離</b> 只有沒背背包才能通過。<br>站進撤離圈後要待滿倒數，期間離開圈子會重新計時。帶出來的物資才算你的；死亡的話身上帶的裝備會遺失。'})));
  p.append(sec('機關',h('p',{class:'hint',text:'紅、藍色門需要對應鑰匙卡（保險櫃、敵人遺體可能掉落）。監視器發現你會拉警報並叫來增援，可以射壞。自動砲塔有 160 點耐久。門口的紅線是絆雷，跳過去或繞開。紅色油桶一槍就會連鎖爆炸。中途會有空投，物資豐厚但敵人也會趕去。'})));
  p.append(sec('倉庫與存檔',h('p',{class:'hint',text:'資金、倉庫與配裝存在這台裝置的瀏覽器裡。清除瀏覽器資料會重置進度。'}),h('div',{class:'btns'},h('button',{class:'ghost',type:'button',text:'重置所有進度',on:{click:function(){if(this.dataset.c){PF=defaultProfile();savePF();Hub.render()}else{this.dataset.c=1;this.textContent='再按一次確認重置'}}}}))))}
