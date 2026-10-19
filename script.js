'use strict';
// 画像はこの一覧の image を変更するだけで差し替えできます。
const FRUITS = [
 ['orange','みかん','normal'],['banana','バナナ','normal'],['strawberry','いちご','normal'],['apple','りんご','normal'],['grapes','ぶどう','normal'],['peach','もも','normal'],['pear','なし','normal'],['pineapple','パイナップル','normal'],
 ['blueberry','ブルーベリー','rare'],['cherry','さくらんぼ','rare'],['kiwi','キウイ','rare'],['watermelon','すいか','super'],['melon','メロン','super'],['mango','マンゴー','super'],['muscat','シャインマスカット','secret']
].map(([id,name,rarity])=>({id,name,rarity,image:`assets/${id}.svg`}));
// 元の図鑑画像の表示領域。画像自体の再圧縮や描き直しはしていません。
const FRUIT_CROPS={orange:[40,383,145,134],banana:[201,382,144,135],strawberry:[372,389,137,129],apple:[521,384,140,134],grapes:[37,575,145,153],peach:[204,585,143,143],pear:[372,588,143,141],pineapple:[523,568,141,163],blueberry:[724,385,169,154],cherry:[918,386,154,153],kiwi:[776,603,248,136],watermelon:[48,910,194,171],melon:[269,900,159,181],mango:[453,915,186,164],muscat:[773,904,231,234]};
function fruitArt(f){if(f.image!==`assets/${f.id}.svg`)return `<img class="fruit-art" src="${f.image}" alt="${f.name}">`;const c=FRUIT_CROPS[f.id],scale=100/Math.max(c[2],c[3]),w=c[2]*scale,h=c[3]*scale;return '<svg class="fruit-art" role="img" aria-label="'+f.name+'" viewBox="0 0 100 100"><svg x="'+((100-w)/2)+'" y="'+((100-h)/2)+'" width="'+w+'" height="'+h+'" viewBox="'+c.join(' ')+'" overflow="hidden"><image href="assets/reference-original.png" width="1122" height="1402"/></svg></svg>';}
const MODES={easy:{interval:3,fall:5,width:.4,duration:Infinity},normal:{interval:2,fall:4,width:.32,duration:30},challenge:{interval:1,fall:3,width:.26,duration:30}};
const RARITY={normal:'ノーマル',rare:'レア',super:'スーパーレア',secret:'シークレット'};
const SAVE_KEY='hoji-fruit-catch-v1';
// 自分の録音を置いたら null を 'assets/audio/yatta.mp3' などに変更。
const AUDIO_FILES={wiggle:null,pop:null,catch:null,miss:null,rare:null,secret:null};
// 同梱音声はWeb Audioで再生。file://でも動くようにvoice-data.jsにも収録。
for(const key of Object.keys(window.VOICE_DATA||{}))AUDIO_FILES[key]='assets/audio/'+key+'.wav';
const $=id=>document.getElementById(id);
let save={counts:{},medals:0,plays:0,secretAppeared:false,tutorialSeen:false,sound:true};
try{const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(raw&&typeof raw==='object'){for(const f of FRUITS){const n=raw.counts?.[f.id];if(Number.isSafeInteger(n)&&n>0)save.counts[f.id]=n;}save.medals=Number.isSafeInteger(raw.medals)&&raw.medals>=0?raw.medals:0;save.plays=Number.isSafeInteger(raw.plays)&&raw.plays>=0?raw.plays:0;for(const k of ['secretAppeared','tutorialSeen','sound'])save[k]=raw[k]===true;if(!raw.voiceUpgrade)save.sound=true;}}catch(e){/* 破損データは初期値で続行 */}
function persist(){save.voiceUpgrade=true;try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){$('save-warning').hidden=false;}}
let audioContext,voiceNode,voiceGain;
const voiceBuffers=new Map(),voiceLoads=new Map();let voiceEpoch=0;
function decodeVoice(key){if(voiceBuffers.has(key))return Promise.resolve(voiceBuffers.get(key));if(voiceLoads.has(key))return voiceLoads.get(key);const base64=window.VOICE_DATA?.[key];if(!base64||!audioContext)return Promise.resolve(null);const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const p=audioContext.decodeAudioData(bytes.buffer).then(buffer=>{voiceBuffers.set(key,buffer);return buffer;}).catch(()=>null);voiceLoads.set(key,p);return p;}
function unlockAudio(){if(!save.sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});for(const key of Object.keys(window.VOICE_DATA||{}))decodeVoice(key);}catch(e){}}
function stopVoice(){voiceEpoch++;if(voiceNode){try{voiceNode.stop();}catch(e){}voiceNode=null;}}
async function say(key){if(!save.sound)return;unlockAudio();const epoch=++voiceEpoch;const buffer=await decodeVoice(key);if(!buffer||!save.sound||epoch!==voiceEpoch||document.hidden)return;if(voiceNode){try{voiceNode.stop();}catch(e){}}voiceNode=audioContext.createBufferSource();voiceNode.buffer=buffer;voiceGain=audioContext.createGain();voiceGain.gain.value=.72;voiceNode.connect(voiceGain);voiceGain.connect(audioContext.destination);voiceNode.start();}
function sound(kind){if(!save.sound)return;if(window.VOICE_DATA?.[kind]){say(kind);return;}try{if(AUDIO_FILES[kind]){const a=new Audio(AUDIO_FILES[kind]);a.volume=.4;a.play().catch(()=>tone(kind));}else tone(kind);}catch(e){}}
function tone(kind){if(!audioContext||audioContext.state!=='running')return;const seq={wiggle:[180,210],pop:[440,660],catch:[660,880],miss:[240,160],rare:[880,1100,1320],secret:[523,659,784,1046],yatta:[660,880,1046],sugoi:[784,1046],orange:[523,659],muscat:[659,784,1046]}[kind]||[660];seq.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.09;o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.9,t+.13);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.17);});}
let medalPaused=false;
function renderMedals(){document.querySelectorAll('[data-medals]').forEach(el=>{el.textContent='きんメダル '+save.medals+' まい';});}
function awardMedal(){if(!FRUITS.every(f=>(save.counts[f.id]||0)>0))return false;
 // メダルと空の図鑑を同じ保存データに一度で記録し、再読み込み時の二重授与を防止。
 save.medals++;save.counts={};persist();renderMedals();medalPaused=true;
 $('medal-total').textContent='これで '+save.medals+' まい！';
 $('medal-continue').textContent=screen==='game'?'▶ つづけて あそぶ':'▶ また あつめよう！';
 $('medal-dialog').showModal();return true;
}
$('medal-continue').onclick=()=>{unlockAudio();$('medal-dialog').close();medalPaused=false;lastTime=0;stopVoice();if(screen==='album')renderAlbum();};
$('medal-dialog').addEventListener('cancel',e=>{e.preventDefault();$('medal-continue').click();});
let mode='easy',screen='title',albumFrom='title',state=null,lastTime=0,raf=0;
function show(id){renderMedals();document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));screen=id;document.body.classList.toggle('playing',id==='game');$('progress').textContent=`${Object.keys(save.counts).length} / 15`;}
function updateSound(){$('sound').textContent=`♫ おと：${save.sound?'オン':'オフ'}`;$('sound').setAttribute('aria-pressed',String(save.sound));}
$('sound').onclick=()=>{save.sound=!save.sound;unlockAudio();updateSound();persist();if(save.sound)say('sound_on');else stopVoice();};updateSound();
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('title'));
$('how-button').onclick=()=>{show('how');say('guide');};
$('start').onclick=()=>{unlockAudio();if(!save.tutorialSeen){show('how');say('guide');}else startGame();};
$('how-start').onclick=()=>{unlockAudio();startGame();};$('again').onclick=()=>{unlockAudio();startGame();};
document.querySelectorAll('[data-album]').forEach(b=>b.onclick=()=>{albumFrom=screen;renderAlbum();show('album');});$('album-back').onclick=()=>show(albumFrom);
function renderAlbum(){renderMedals();const count=FRUITS.filter(f=>save.counts[f.id]).length;$('album-progress').textContent=`${count} / 15 しゅるい みつけたよ！`;$('progress-bar').style.width=`${count/15*100}%`;$('album-grid').replaceChildren();for(const f of FRUITS){const n=save.counts[f.id]||0,card=document.createElement('div');card.className='album-card'+(!n?' locked':'');card.dataset.rarity=f.rarity;card.innerHTML=`${n?fruitArt(f):'<div class="unknown">？</div>'}<div>${!n&&f.rarity==='secret'?'？？？':f.name}</div><small>${RARITY[f.rarity]}</small><div>${n} こ</div>`;$('album-grid').append(card);}}
function geometry(){const r=$('field').getBoundingClientRect();return{w:r.width,h:r.height,catchY:r.height-90-Math.max(0,parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0)};}
function startGame(){stopVoice();say('ready');cancelAnimationFrame(raf);const first=!save.tutorialSeen;save.tutorialSeen=true;persist();show('game');const g=geometry();state={config:MODES[mode],phase:'countdown',countdown:3,time:0,next:.6,pending:null,items:[],used:new Set(),spawned:0,score:0,session:{},fresh:new Set(),x:g.w/2,target:g.w/2,playsCounted:false,rescue:false,rescueSpawned:false,finishAfterRescue:false,hint:first};$('fruits').replaceChildren();$('effects').replaceChildren();$('cheer').textContent='';$('score').innerHTML='0 <small>こ</small>';$('timer').textContent=state.config.duration===Infinity?'∞':'30';$('countdown').textContent='3';$('hint').hidden=!first;document.querySelectorAll('.game-character').forEach(c=>c.classList.remove('wiggle','gold','happy'));positionBasket(g);lastTime=0;raf=requestAnimationFrame(frame);}
function pickFruit(s,rng=Math.random){if(s.spawned===0)return FRUITS[0];if(s.rescue&&!s.rescueSpawned)return FRUITS[14];const r=rng();const secretRate=1/30;const rarity=r<1-secretRate-.2-.09?'normal':r<1-secretRate-.09?'rare':r<1-secretRate?'super':'secret';let choices=FRUITS.filter(f=>f.rarity===rarity);if(s.spawned<5){const unused=choices.filter(f=>!s.used.has(f.id));if(unused.length)choices=unused;}return choices[Math.floor(rng()*choices.length)];}
function prepareFruit(){const f=pickFruit(state);state.pending=f;const c=document.querySelector('.game-character');c.classList.add('wiggle');c.classList.toggle('gold',f.rarity==='secret');sound('wiggle');if(f.rarity!=='normal')sound(f.rarity==='secret'?'secret':'rare');}
function spawnFruit(f){const g=geometry(),size=f.id==='watermelon'?70:f.rarity==='secret'?60:52;const element=document.createElement('div');element.className='fruit'+(f.rarity==='secret'?' secret':'');element.style.width=element.style.height=size+'px';element.innerHTML=`${fruitArt(f)}${f.rarity==='secret'?'<span></span>':''}`;$('fruits').append(element);const landing=state.spawned<5?g.w*(.45+Math.random()*.1):size/2+Math.random()*(g.w-size);state.items.push({f,element,size,age:0,startX:g.w/2,destRatio:landing/g.w,prevY:75,caught:false,missAge:null});state.spawned++;state.used.add(f.id);if(f.rarity==='secret'){save.secretAppeared=true;state.rescueSpawned=true;persist();}document.querySelector('.game-character').classList.remove('wiggle','gold');state.pending=null;sound('pop');}
function positionBasket(g){const bw=g.w*state.config.width;state.target=Math.max(bw/2,Math.min(g.w-bw/2,state.target));state.x=Math.max(bw/2,Math.min(g.w-bw/2,state.x));$('basket').style.width=bw+'px';$('basket').style.transform=`translate(${state.x-bw/2}px,${g.catchY}px)`;}
function move(clientX){if(!state||screen!=='game')return;const r=$('field').getBoundingClientRect();state.target=clientX-r.left;}
$('field').addEventListener('pointerdown',e=>{e.preventDefault();unlockAudio();move(e.clientX);try{$('field').setPointerCapture(e.pointerId);}catch(_){}});
$('field').addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons||e.pressure>0){e.preventDefault();move(e.clientX);}});
$('field').addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
document.addEventListener('keydown',e=>{if(screen!=='game'||!state)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.target+=(e.key==='ArrowLeft'?-1:1)*35;}});
function burst(x,y,rainbow=false){const colors=['#f58e88','#f4c84f','#91c76d','#6cc8dc','#a397d8'];for(let i=0;i<(rainbow?32:7);i++){const p=document.createElement('i');p.className='particle'+(rainbow?'':' star');if(!rainbow)p.textContent='✦';p.style.cssText=`left:${x}px;top:${y}px;--dx:${(Math.random()-.5)*(rainbow?330:130)}px;--dy:${-30-Math.random()*160}px;--color:${colors[i%5]}`;$('effects').append(p);p.addEventListener('animationend',()=>p.remove(),{once:true});}}
function catchFruit(item,x,y){const f=item.f;state.score++;state.session[f.id]=(state.session[f.id]||0)+1;if(!save.counts[f.id])state.fresh.add(f.id);save.counts[f.id]=(save.counts[f.id]||0)+1;const completed=awardMedal();if(!completed)persist();$('score').innerHTML=`${state.score} <small>こ</small>`;const img=$('basket').firstElementChild;img.classList.remove('basket-pop');void img.offsetWidth;img.classList.add('basket-pop');burst(x,y,f.rarity==='secret');document.querySelector('.game-character').classList.add('happy');state.happyUntil=state.time+1.1;state.cheerUntil=state.time+1.2;$('cheer').textContent=f.rarity==='secret'?'すごーい！':state.score%3===1?'やったー！':'';sound(f.rarity==='secret'?'secret':'catch');if(completed){sound('secret');say('sugoi');return;}say(f.id);if(state.score%3===1&&f.id!=='muscat'){const activeState=state;const epoch=voiceEpoch;setTimeout(()=>{if(state===activeState&&screen==='game'&&voiceEpoch===epoch)say(state.score%5===0?'sugoi':'yatta');},1500);}}
function update(dt){if(medalPaused)return;const s=state,g=geometry();s.x+=(s.target-s.x)*(1-Math.exp(-dt*16));positionBasket(g);if(s.phase==='countdown'){s.countdown-=dt;$('countdown').textContent=s.countdown>0?Math.ceil(s.countdown):'';if(s.countdown<=0){s.phase='playing';say('start');save.plays++;s.playsCounted=true;s.rescue=!save.secretAppeared&&save.plays>=10;persist();}return;}
 s.time+=dt;const remain=Math.max(0,s.config.duration-s.time);$('timer').textContent=Number.isFinite(remain)?Math.ceil(remain):'∞';if(s.time>6)$('hint').hidden=true;
 if(s.time>=s.next-.5&&!s.pending&&!s.finishAfterRescue)prepareFruit();
 if(s.pending&&s.time>=s.next){spawnFruit(s.pending);s.next+=s.config.interval;}
 for(const it of [...s.items]){it.age+=dt;const t=Math.min(1,it.age/s.config.fall),startY=74,endY=g.catchY-5;const x=g.w/2+(it.destRatio*g.w-g.w/2)*Math.min(1,it.age/.9);let y=startY+(endY-startY)*t*t-40*Math.sin(Math.PI*Math.min(1,it.age/.7));
 if(it.missAge!==null){it.missAge+=dt;y=g.h-it.size/2-40*Math.sin(Math.PI*Math.min(1,it.missAge/.55));it.element.style.opacity=1-it.missAge/.65;if(it.missAge>=.65){removeFruit(it);continue;}}
 else{const bottom=y+it.size/2,prevBottom=it.prevY+it.size/2;const bx=s.x,bw=g.w*s.config.width;if(prevBottom<=g.catchY+15&&bottom>=g.catchY+8&&Math.abs(x-bx)<bw/2+it.size*.27){catchFruit(it,x,g.catchY);removeFruit(it);if(medalPaused)return;continue;}if(it.age>s.config.fall){y=endY+(it.age-s.config.fall)*190;if(y+it.size/2>=g.h){it.missAge=0;y=g.h-it.size/2;sound('miss');}}}
 it.prevY=y;it.element.style.transform=`translate(${x-it.size/2}px,${y-it.size/2}px) rotate(${Math.sin(it.age*2)*9}deg)`;}
 if(s.happyUntil<s.time)document.querySelector('.game-character').classList.remove('happy');if(s.cheerUntil<s.time)$('cheer').textContent='';if(s.finishAfterRescue&&s.items.length===0)finishGame();else if(remain===0)requestEnd();
}
function removeFruit(it){it.element.remove();state.items.splice(state.items.indexOf(it),1);}
function frame(time){if(screen!=='game'||!state)return;if(!document.hidden){if(lastTime){let elapsed=(time-lastTime)/1000;while(elapsed>0&&screen==='game'&&!medalPaused){const step=Math.min(elapsed,.05);update(step);elapsed-=step;}}lastTime=time;}else lastTime=0;if(screen==='game')raf=requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden)stopVoice();});
function requestEnd(){if(!state||medalPaused)return;if(state.rescue&&!state.rescueSpawned){state.pending=null;state.finishAfterRescue=true;if(state.spawned===0)spawnFruit(FRUITS[0]);spawnFruit(FRUITS[14]);$('cheer').textContent='さいごに きらきら！';state.cheerUntil=state.time+2;return;}if(state.finishAfterRescue&&state.items.length)return;finishGame();}
$('end').onclick=requestEnd;
function finishGame(){stopVoice();say(state.score>=5?'sugoi':'yatta');cancelAnimationFrame(raf);$('total').textContent=state.score;$('result-message').textContent=state.fresh.size?`${state.fresh.size} しゅるい はじめて みつけたよ！`:'また いっしょに あそぼう！';$('result-fruits').replaceChildren();for(const f of FRUITS){if(!state.session[f.id])continue;const el=document.createElement('div');el.className='result-item';el.innerHTML=`${fruitArt(f)}<span>${f.name}</span><br>${state.session[f.id]} こ${state.fresh.has(f.id)?'<b class="new-tag">★ NEW!</b>':''}`;$('result-fruits').append(el);}persist();show('result');}
// INLINE_CHARACTER は生成済みSVG。通信せず file:// からも表示します。
const INLINE_CHARACTER = '<div class="portrait"><img src="assets/character-hq.png" alt="ほじほじくん"><svg class="nose" viewBox="450 480 130 100" aria-hidden="true"><image href="assets/character-hq.png" width="1024" height="1536"/></svg><span class="nose-glow" aria-hidden="true"></span></div>';
document.querySelectorAll('[data-character]').forEach(el=>el.innerHTML=INLINE_CHARACTER);
show('title');

document.querySelectorAll('[data-fruit]').forEach(el=>el.innerHTML=fruitArt(FRUITS.find(f=>f.id===el.dataset.fruit)));

// 旧版でコンプリート済みの図鑑にも、一度だけメダルを授与します。
awardMedal();
