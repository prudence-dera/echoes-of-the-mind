'use strict';
const app=document.querySelector('#app'),toastEl=document.querySelector('#toast');
let ws,state=null,audio=null,toastTimer=null,lastPulse=0;
let countdownState='normal',warning30Shown=false,warning10Shown=false;
const roleNames={logic:'LOGIC ENGINE',emotion:'EMOTIONAL CORE',corrupt:'CORRUPTED FILE'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function toast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3200);
}
function emit(obj){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));else toast('Reconnecting? Refresh and join a new room.');}
function time(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}

function connect(type){
  const name=document.querySelector('#name')?.value.trim();
  const room=document.querySelector('#room')?.value.trim().toUpperCase();
  if(!name)return toast('Enter your callsign first.');
  if(type==='join'&&room?.length!==6)return toast('Enter a six-character room code.');
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
  ws.onopen=()=>emit({type,name,code:room});
  ws.onmessage=ev=>{
    let m;try{m=JSON.parse(ev.data)}catch{return}
    if(m.type==='error')return toast(m.message);
    if(m.type==='state'){
      state=m;
      syncCountdownState(true);
      render();
      return;
    }
    if(m.type==='tick'&&state){
      state.timer=m.timer;
      updateTimerUI();
      syncCountdownState(false);
      return;
    }
    if(m.type==='pulse')pulse(m.value);
    if(m.type==='glitch')triggerGlitch();
  };
  ws.onclose=()=>{
    if(state){
      toast('Link lost. Refresh to join another room.');
      document.querySelectorAll('button').forEach(b=>b.disabled=true);
    }else toast('Could not connect to the game server.');
  };
}

function ensureAudio(){
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    audio.resume?.();
  }catch{}
  return audio;
}

function pulse(value){
  if(Date.now()-lastPulse<150)return;
  lastPulse=Date.now();
  try{
    ensureAudio();
    const counts=value==='STRONG'?3:value==='SOFT'?1:2;
    for(let i=0;i<counts;i++){
      const o=audio.createOscillator(),g=audio.createGain();
      o.type='sine';
      o.frequency.value=value==='COOL'?280:540;
      g.gain.setValueAtTime(0.0001,audio.currentTime+i*.19);
      g.gain.exponentialRampToValueAtTime(.13,audio.currentTime+i*.19+.02);
      g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+i*.19+.16);
      o.connect(g);g.connect(audio.destination);o.start(audio.currentTime+i*.19);o.stop(audio.currentTime+i*.19+.18);
    }
  }catch{}
  if(navigator.vibrate)navigator.vibrate(value==='STRONG'?[180,100,180]:[100]);
  toast('EMOTIONAL PULSE: '+value);
}

function warningTone(level='warn'){
  try{
    ensureAudio();
    const pattern=level==='danger'
      ? [{f:760,d:.08},{f:620,d:.08},{f:880,d:.1}]
      : [{f:720,d:.09},{f:560,d:.11}];
    let start=audio.currentTime;
    pattern.forEach((step,i)=>{
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type='triangle';
      osc.frequency.value=step.f;
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(level==='danger'?.18:.12,start+.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,start+step.d);
      osc.connect(gain);gain.connect(audio.destination);
      osc.start(start);osc.stop(start+step.d+.01);
      start+=step.d+(i<pattern.length-1?.04:0);
    });
  }catch{}
  if(navigator.vibrate)navigator.vibrate(level==='danger'?[120,60,120,60,160]:[120,80,120]);
}

function triggerGlitch(){
  document.body.animate(
    [{filter:'hue-rotate(0deg)'},{filter:'hue-rotate(100deg) saturate(1.3)'},{filter:'hue-rotate(0deg)'}],
    {duration:420}
  );
}

function countdownSeverity(seconds){
  if(seconds<=10)return 'danger';
  if(seconds<=30)return 'warn';
  return 'normal';
}

function syncCountdownState(skipSounds){
  const body=document.body;
  if(!state||state.phase!=='playing'){
    countdownState='normal';
    warning30Shown=false;
    warning10Shown=false;
    body.classList.remove('warning-30','warning-10');
    return;
  }
  const severity=countdownSeverity(state.timer);
  body.classList.toggle('warning-30',severity!=='normal');
  body.classList.toggle('warning-10',severity==='danger');
  if(!skipSounds){
    if(state.timer<=30 && !warning30Shown){
      warning30Shown=true;
      toast('⚠ FINAL 30 SECONDS — MEMORY STABILITY IS FAILING');
      warningTone('warn');
    }
    if(state.timer<=10 && !warning10Shown){
      warning10Shown=true;
      toast('🚨 FINAL 10 SECONDS — SUBMIT NOW');
      warningTone('danger');
      triggerGlitch();
    }
  }
  if(state.timer>30){warning30Shown=false;warning10Shown=false;}
  else if(state.timer>10){warning10Shown=false;}
  countdownState=severity;
}

function countdownBanner(){
  if(!state||state.phase!=='playing' || state.timer>30)return '';
  const urgent=state.timer<=10;
  return `<div class="warning-banner ${urgent?'danger':'warn'}" id="countdown-warning" role="alert" aria-live="assertive"><span class="warning-kicker">${urgent?'CRITICAL COUNTDOWN':'FINAL COUNTDOWN'}</span><strong>${urgent?'SUBMIT THE MEMORY NOW':'30-SECOND WARNING'}</strong><span class="warning-time">${time(state.timer)} remaining</span></div>`;
}

function updateTimerUI(){
  const timerEls=document.querySelectorAll('[data-timer-display]');
  timerEls.forEach(el=>el.textContent=time(state.timer));
  const banner=document.querySelector('#countdown-warning');
  if(banner){
    const strong=banner.querySelector('.warning-time');
    if(strong)strong.textContent=`${time(state.timer)} remaining`;
    banner.classList.toggle('danger',state.timer<=10);
    banner.classList.toggle('warn',state.timer>10&&state.timer<=30);
    const kicker=banner.querySelector('.warning-kicker');
    const title=banner.querySelector('strong');
    if(kicker)kicker.textContent=state.timer<=10?'CRITICAL COUNTDOWN':'FINAL COUNTDOWN';
    if(title)title.textContent=state.timer<=10?'SUBMIT THE MEMORY NOW':'30-SECOND WARNING';
  }
}

function formatStat(s){
  const isTimer=s.k==='timer';
  const severityClass=isTimer?countdownSeverity(state?.timer ?? 999):'';
  return `<div class="status-panel ${isTimer?`timer-panel ${severityClass}`:''}"><span>${esc(s.k)}</span><strong ${isTimer?'data-timer-display class="timer"':''}>${esc(s.v)}</strong></div>`;
}

function brainStage({phaseLabel,statusClass='good',title,note,stats=[],footerNote=''}){
  return `<section class="brain-stage panel"><div class="brain-image" aria-hidden="true"></div><div class="brain-grid" aria-hidden="true"></div><div class="brain-fog" aria-hidden="true"></div><div class="brain-hud top-left"><div class="status-chip ${statusClass}">${esc(phaseLabel)}</div><div class="hud-card"><span class="k">room</span><span class="v">${esc(state.code)}</span></div></div><div class="brain-hud top-right"><button data-action="invite">COPY INVITE LINK</button></div><div class="brain-content"><div class="brain-tag">FUTURISTIC AI CONTROL ROOM / SYNCHRONIZED</div><h2>${esc(title)}</h2><p>${esc(note)}</p>${stats.length?`<div class="status-bar">${stats.map(formatStat).join('')}</div>`:''}</div>${footerNote?`<div class="brain-hud bottom-left"><div class="hud-note">${footerNote}</div></div>`:''}</section>`;
}
function playerList(){return `<div class="player-list">${state.players.map(p=>`<div class="player"><span class="dot"></span>${esc(p.name)} ${p.id===state.hostId?'<span class="badge host">HOST</span>':''}${p.id===state.you?'<span class="badge">YOU</span>':''}</div>`).join('')}${Array.from({length:Math.max(0,3-state.players.length)},()=>'<div class="player muted">○ Awaiting a consciousness...</div>').join('')}</div>`;}

function lobby(){
  const isHost=state.you===state.hostId;
  return `${brainStage({phaseLabel:'LOBBY / LINK OPEN',statusClass:'good',title:'THE BRAIN CHAMBER IS ONLINE',note:'The neural control room now stays visible throughout the entire game. Link three minds, then enter the memory reconstruction sequence.',stats:[{k:'linked minds',v:`${state.players.length}/3`},{k:'round window',v:'4:00'},{k:'attempts',v:'3 submissions'}],footerNote:'One player becomes the Logic Engine, one the Emotional Core, and one the hidden Corrupted File. All three see the same control room, but each receives different private instructions.'})}<div class="main-grid" style="margin-top:18px"><section class="panel" style="padding:20px"><div class="section-title"><h3>MISSION BRIEF</h3></div><div class="rule"><b>GOAL:</b> Reconstruct the human memory by identifying <b>WHO</b>, <b>WHERE</b>, <b>WHAT HAPPENED</b>, and <b>HOW IT FELT</b>.</div><div class="rule"><b>TEAM TWIST:</b> One player is secretly the saboteur. They can edit shared selections and trigger visual glitches.</div><div class="rule"><b>FAILURE ISN'T INSTANT:</b> The team gets three submissions. Wrong guesses tell you how many memory fragments are correct.</div><div class="rule"><b>FINAL SUBMIT:</b> Only the Logic Engine can submit the reconstruction.</div>${isHost?`<button data-action="start" class="cta full-width" ${state.players.length!==3?'disabled':''} style="margin-top:16px">◈ BEGIN MEMORY RECONSTRUCTION</button>`:'<p class="copy">The host will begin the round after all three minds connect.</p>'}</section><section class="panel" style="padding:20px"><div class="section-title"><h3>CONNECTED MINDS</h3><span class="badge">WAITING ROOM</span></div>${playerList()}<div class="rule"></div><p class="copy">Use your desktop plus two phones, or invite friends with the room code. Keep private role panels hidden once the round starts.</p></section></div>`;
}

function endedView(){
  const p=state.post;
  return `${brainStage({phaseLabel:state.victory?'MEMORY RESTORED':'CORRUPTION WON',statusClass:state.victory?'good':'danger',title:state.victory?'THE BRAIN HAS STABILIZED':'THE MEMORY HAS COLLAPSED',note:state.victory?'Your team successfully restored the authentic memory.':'The neural chamber timed out or exhausted its attempts before the memory was recovered.',stats:[{k:'round',v:String(state.round)},{k:'outcome',v:state.victory?'TEAM WIN':'TEAM LOSS'},{k:'memory',v:p.title}],footerNote:`The fabricated story was: ${p.lie}`})}<div class="main-grid" style="margin-top:18px"><section class="panel" style="padding:20px"><div class="section-title"><h3>AUTHENTIC MEMORY</h3><span class="badge">REVEALED</span></div><div class="result-grid">${Object.entries(p.truth).map(([k,v])=>`<div class="result-card"><span class="small">${esc(state.labels[k])}</span><br><b>${esc(v)}</b></div>`).join('')}</div></section><section class="panel" style="padding:20px"><div class="section-title"><h3>ROLE REVEAL</h3></div>${state.players.map(p=>`<div class="player">${esc(p.name)} — <b>${esc(roleNames[p.role]||'UNKNOWN')}</b></div>`).join('')}${state.you===state.hostId?'<button data-action="lobby" class="cta full-width" style="margin-top:16px">START ANOTHER ROUND →</button>':'<p class="copy">Waiting for the host to restart the neural link.</p>'}</section></div>`;
}

function liveView(){
  const filled=Object.values(state.answers).filter(Boolean).length;
  const role=state.role;
  const note = role==='logic'
    ? 'Read the verified facts, guide the team, and submit the final memory reconstruction.'
    : role==='emotion'
      ? 'Interpret the emotional tone and send coded pulses to help the team decode the memory.'
      : 'You are the hidden saboteur. Mislead the team subtly while the control room remains shared for everyone.';
  return `${brainStage({phaseLabel:'LIVE ROUND / ACTIVE',statusClass:state.feedback?'warn':'good',title:`ROUND ${state.round} — THE GLOWING BRAIN IS LISTENING`,note,stats:[{k:'timer',v:time(state.timer)},{k:'selected',v:`${filled}/4`},{k:'attempts left',v:String(state.attemptsLeft)}],footerNote:'The AI control room is persistent throughout gameplay. Shared answer changes sync in real time across all devices.'})}${countdownBanner()}${state.feedback?`<div class="feedback" role="status">⚠ ${esc(state.feedback)}</div>`:''}<div class="main-grid" style="margin-top:18px"><div class="subgrid"><section class="panel" style="padding:20px"><div class="section-title"><h3>SHARED SIGNAL FRAGMENTS</h3><span class="badge">VISIBLE TO ALL</span></div><p class="copy">These fragments appear beneath the central brain chamber. Their meaning is incomplete without combining all private clues.</p><div class="memory-cluster"><div class="memory-visuals">${state.board.visual.map(x=>`<span class="symbol">${esc(x)}</span>`).join('')}</div>${state.board.noise?'<div class="noise"></div>':''}<div class="words">${state.board.words.map(w=>`<span class="word">${esc(w)}</span>`).join('')}</div></div></section><section class="panel" style="padding:20px"><div class="section-title"><h3>RECONSTRUCT THE MEMORY</h3><span class="badge">SHARED BOARD</span></div><div class="cards">${Object.keys(state.labels).map(k=>`<div class="tile"><label for="choice-${k}">${esc(state.labels[k])}</label><select id="choice-${k}" data-field="${k}"><option value="">UNKNOWN — SELECT</option>${state.choices[k].map(v=>`<option value="${esc(v)}" ${state.answers[k]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`).join('')}</div><p class="copy">Anyone can edit the shared choices. Only the Logic Engine can submit. The Corrupted File can interfere, so talk through every change.</p><button data-action="submit" class="cta full-width" ${filled!==4||role!=='logic'?'disabled':''} style="margin-top:14px">◈ TEST MEMORY (${state.attemptsLeft} TRIES LEFT)</button></section></div><div class="subgrid"><section class="panel" style="padding:20px"><div class="role ${esc(role)}"><div class="section-title"><h3>${esc(roleNames[role])}</h3>${role==='corrupt'?'<span class="badge">SECRET</span>':'<span class="badge">PRIVATE ROLE</span>'}</div><p class="copy">${note}</p></div>${roleContent()}</section><section class="panel" style="padding:20px"><div class="section-title"><h3>NEURAL ACTIVITY</h3><span class="badge">LIVE FEED</span></div><div class="log">${[...state.commands.map(c=>`<div class="entry">🧠 ${esc(c.by)}: ${esc(c.value)}</div>`),...state.signals.map(s=>`<div class="entry">${s.kind==='pulse'?'💓':'⚡'} ${esc(s.by)}: ${esc(s.value)}</div>`)].slice(-9).reverse().join('')||'<p class="small">No incoming signals yet.</p>'}</div><div class="section-title" style="margin-top:18px"><h3>CONNECTED MINDS</h3></div>${playerList()}<p class="copy">Tap the page once if you need to unlock audio on mobile browsers.</p></section></div></div>`;
}

function render(){
  if(!state)return;
  if(state.phase==='lobby'){
    document.body.classList.remove('warning-30','warning-10');
    app.innerHTML=lobby();
    return;
  }
  if(state.phase==='ended'){
    document.body.classList.remove('warning-30','warning-10');
    app.innerHTML=endedView();
    return;
  }
  app.innerHTML=liveView();
  updateTimerUI();
}

function roleContent(){
  const p=state.private||{};
  if(state.role==='logic')return `<h3>VERIFIED MEMORY FACTS</h3>${(p.facts||[]).map((f,i)=>`<div class="clue"><b>${String(i+1).padStart(2,'0')}</b> ${esc(f)}</div>`).join('')}<h3>BROADCAST A COMMAND</h3><div class="actions">${['CHECK THE IMAGE','FOCUS ON WHO','FOCUS ON WHERE','FOCUS ON EVENT','TRUST THE FACTS','REVIEW ALL CLUES'].map(v=>`<button data-command="${v}">${v}</button>`).join('')}</div>`;
  if(state.role==='emotion')return `<h3>YOUR PRIVATE EMOTIONAL KEY</h3><div class="clue" style="border-color:${esc(p.color)}"><div style="background:${esc(p.color)};height:78px;border-radius:12px;margin-bottom:10px"></div><b>${esc(p.emotion)}</b><p class="small">Signal convention: <b>SOFT</b> = calm, <b>STRONG</b> = intense, <b>WARM</b> = positive, <b>COOL</b> = negative.</p></div><h3>SEND AN EMOTIONAL PULSE</h3><div class="actions">${['SOFT','STRONG','WARM','COOL'].map(v=>`<button data-pulse="${v}">${v}</button>`).join('')}</div>`;
  return `<h3>YOUR FABRICATED NARRATIVE</h3><div class="clue">${esc(p.lie)}</div><p class="small">You can alter shared answer choices and trigger up to three signal distortions to increase doubt.</p><h3>FALSE LEADS</h3><div class="words">${(p.falseWords||[]).map(v=>`<span class="word">${esc(v)}</span>`).join('')}</div><button data-action="distort" ${state.board.noise>=3?'disabled':''}>⚡ DISTORT THE SIGNAL (${3-state.board.noise} LEFT)</button>`;
}

function copyLink(){
  const url=new URL(location.href);
  url.searchParams.set('room',state.code);
  navigator.clipboard?.writeText(url.href).then(()=>toast('Invite link copied!')).catch(()=>toast('Room code: '+state.code));
}

document.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!button)return;
  const a=button.dataset.action;
  ensureAudio();
  if(button.id==='create')return connect('create');
  if(button.id==='join')return connect('join');
  if(a==='invite')return copyLink();
  if(a==='start')return emit({type:'start'});
  if(a==='lobby')return emit({type:'lobby'});
  if(a==='distort')return emit({type:'distort'});
  if(a==='submit'){
    if(!window.confirm('Submit this reconstruction? An incorrect answer uses one of your three attempts.'))return;
    return emit({type:'submit'});
  }
  if(button.dataset.command)return emit({type:'command',value:button.dataset.command});
  if(button.dataset.pulse){pulse(button.dataset.pulse);return emit({type:'pulse',value:button.dataset.pulse});}
});

document.addEventListener('change',e=>{if(e.target.dataset.field)emit({type:'answer',key:e.target.dataset.field,value:e.target.value});});
const code=new URLSearchParams(location.search).get('room');
if(code&&/^[a-f0-9]{6}$/i.test(code))document.querySelector('#room').value=code.toUpperCase();
