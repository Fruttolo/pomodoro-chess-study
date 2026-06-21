(function(){
  "use strict";

  // ---------- elements ----------
  const $ = id => document.getElementById(id);
  const cardStudy=$("cardStudy"), cardBreak=$("cardBreak");
  const spotlightEl=$("cardSpotlight");
  const timeStudy=$("timeStudy"), timeBreak=$("timeBreak");
  const pillStudy=$("pillStudy"), pillBreak=$("pillBreak");
  const barStudy=$("barStudy"), barBreak=$("barBreak");
  const mainBtn=$("mainBtn"), stopBtn=$("stopBtn"), resetBtn=$("resetBtn");
  const studySoundBtn=$("studySoundBtn"), breakSoundBtn=$("breakSoundBtn");
  const goalSoundBtn=$("goalSoundBtn"), clearAllBtn=$("clearAllBtn");
  const studyEditor=$("studyEditor"), breakEditor=$("breakEditor");
  const barWrapStudy=$("barWrapStudy"), barWrapBreak=$("barWrapBreak");
  const studyMinVal=$("studyMinVal"), studySecVal=$("studySecVal");
  const breakMinVal=$("breakMinVal"), breakSecVal=$("breakSecVal");
  const studyMinDec=$("studyMinDec"), studyMinInc=$("studyMinInc");
  const studySecDec=$("studySecDec"), studySecInc=$("studySecInc");
  const breakMinDec=$("breakMinDec"), breakMinInc=$("breakMinInc");
  const breakSecDec=$("breakSecDec"), breakSecInc=$("breakSecInc");
  const statCycleCount=$("statCycleCount"), statCycleGoal=$("statCycleGoal");
  const goalDec=$("goalDec"), goalInc=$("goalInc");
  const statStreak=$("statStreak"), statTotalStudied=$("statTotalStudied"), statLogCount=$("statLogCount");
  const sessionLogList=$("sessionLogList");

  // ---------- stepper state ----------
  let sMin=25, sSec=0, bMin=5, bSec=0;
  let studySoundEnabled=true, breakSoundEnabled=true, goalSoundEnabled=false;

  // ---------- stats state ----------
  let cycleGoal=4;
  let todayLog=[];      // [{startTime, durationSec, interruptions}]
  let streakData={lastDate:null, streak:0};
  let currentCycleStart=0;   // performance.now() at cycle start
  let currentInterruptions=0;

  // ---------- persistence ----------
  function saveSettings(){
    localStorage.setItem('pomodoroSettings', JSON.stringify(
      {sMin,sSec,bMin,bSec,studySoundEnabled,breakSoundEnabled,goalSoundEnabled}
    ));
  }
  function loadSettings(){
    try{
      const s=JSON.parse(localStorage.getItem('pomodoroSettings'));
      if(!s) return;
      if(typeof s.sMin==='number') sMin=s.sMin;
      if(typeof s.sSec==='number') sSec=s.sSec;
      if(typeof s.bMin==='number') bMin=s.bMin;
      if(typeof s.bSec==='number') bSec=s.bSec;
      if(typeof s.studySoundEnabled==='boolean') studySoundEnabled=s.studySoundEnabled;
      if(typeof s.breakSoundEnabled==='boolean') breakSoundEnabled=s.breakSoundEnabled;
      if(typeof s.goalSoundEnabled==='boolean') goalSoundEnabled=s.goalSoundEnabled;
    }catch(e){}
  }

  // ---------- stats persistence ----------
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function saveStats(){
    const d=todayStr();
    localStorage.setItem('pomodoroLog_'+d, JSON.stringify(todayLog));
    localStorage.setItem('pomodoroStreak', JSON.stringify(streakData));
    localStorage.setItem('pomodoroCycleGoal', String(cycleGoal));
  }
  function loadStats(){
    try{
      const g=localStorage.getItem('pomodoroCycleGoal');
      if(g) cycleGoal=Math.max(1,parseInt(g,10)||4);
    }catch(e){}
    try{
      const raw=localStorage.getItem('pomodoroLog_'+todayStr());
      if(raw) todayLog=JSON.parse(raw);
    }catch(e){}
    try{
      const raw=localStorage.getItem('pomodoroStreak');
      if(raw) streakData=JSON.parse(raw);
    }catch(e){}
  }
  function updateStreak(){
    const today=todayStr();
    if(streakData.lastDate===today) return;
    const yesterday=new Date(Date.now()-864e5).toISOString().slice(0,10);
    streakData.streak = streakData.lastDate===yesterday ? streakData.streak+1 : 1;
    streakData.lastDate=today;
  }
  function recordCycle(){
    const elapsed=performance.now()-currentCycleStart;
    const startDate=new Date(Date.now()-elapsed);
    const startTime=startDate.toTimeString().slice(0,5);
    const durationSec=Math.round(elapsed/1000);
    todayLog.push({startTime, durationSec, studySec:studyTotal, interruptions:currentInterruptions});
    updateStreak();
    saveStats();
    if(todayLog.length===cycleGoal) playGoalSound();
  }

  // ---------- state ----------
  let phase="idle";          // "idle" | "running"
  let active="study";        // "study" | "break"
  let studyTotal=1500, breakTotal=300;
  let studyRem=1500, breakRem=300;
  let studyDone=false, breakDone=false;
  let ringing=false;
  let lastTs=0, loopId=null;
  let pipCanvas=null, pipVideo=null, pipCtx=null;

  // ---------- helpers ----------
  function fmt(sec){
    sec=Math.max(0,Math.ceil(sec));
    const m=Math.floor(sec/60), s=sec%60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }
  function fmtN(n,pad){ return String(n).padStart(pad,"0"); }
  function fmtDuration(sec){
    const m=Math.floor(sec/60), s=sec%60;
    return m+'m'+(s>0?' '+s+'s':'');
  }
  function clamp(v,min,max){ v=parseInt(v,10); return isNaN(v)?min:Math.max(min,Math.min(max,v)); }
  function readInputs(){
    studyTotal=Math.max(1, sMin*60+sSec);
    breakTotal=Math.max(1, bMin*60+bSec);
  }
  function stepVal(cur,delta,min,max){ return Math.max(min,Math.min(max,cur+delta)); }
  function applyStep(){
    readInputs();
    if(phase==="idle"){
      studyRem=studyTotal; breakRem=breakTotal;
    }
    saveSettings();
    renderSteppers();
    render();
  }
  function renderSteppers(){
    const ae=document.activeElement;
    if(ae!==studyMinVal) studyMinVal.value=String(sMin).padStart(2,"0");
    if(ae!==studySecVal) studySecVal.value=String(sSec).padStart(2,"0");
    if(ae!==breakMinVal) breakMinVal.value=String(bMin).padStart(2,"0");
    if(ae!==breakSecVal) breakSecVal.value=String(bSec).padStart(2,"0");
  }

  // ---------- audio (melodic chime) ----------
  const NOTES=[523.25,659.25,783.99,1046.5,783.99,659.25]; // C5 E5 G5 C6 G5 E5 – up then down
  const NOTE_SPACING=0.22;   // seconds between note onsets
  const PHRASE_INTERVAL=1320; // ms = NOTES.length * NOTE_SPACING * 1000 → seamless loop
  let actx=null, melodyTimer=null, phraseCount=0;

  function ensureCtx(){
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended") actx.resume();
    setupPip();
  }
  function playNote(freq,startTime,volume){
    const osc=actx.createOscillator(), gain=actx.createGain();
    osc.type="square";
    osc.frequency.value=freq;
    const t=startTime;
    gain.gain.setValueAtTime(0.001,t);
    gain.gain.exponentialRampToValueAtTime(volume,t+0.012);
    gain.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(t); osc.stop(t+1.15);
  }
  function playPhrase(){
    if(!actx) return;
    const now=actx.currentTime+0.02;
    const vol=Math.min(0.35, 0.04+phraseCount*0.05);
    phraseCount++;
    NOTES.forEach((freq,i)=>playNote(freq,now+i*NOTE_SPACING,vol));
  }
  function startSound(){
    ensureCtx();
    if(ringing) return;
    ringing=true;
    phraseCount=0;
    playPhrase();
    melodyTimer=setInterval(playPhrase,PHRASE_INTERVAL);
    render();
  }
  function stopSound(){
    ringing=false;
    phraseCount=0;
    if(melodyTimer){ clearInterval(melodyTimer); melodyTimer=null; }
    render();
  }

  // ---------- goal sound (fanfare, played once) ----------
  function playGoalSound(){
    if(!goalSoundEnabled) return;
    ensureCtx();
    if(!actx) return;
    const notes=[523.25,659.25,783.99,1046.5,1318.51]; // C5 E5 G5 C6 E6
    const now=actx.currentTime+0.02;
    notes.forEach((freq,i)=>{
      const osc=actx.createOscillator(), gain=actx.createGain();
      osc.type="triangle";
      osc.frequency.value=freq;
      const t=now+i*0.14;
      gain.gain.setValueAtTime(0.001,t);
      gain.gain.exponentialRampToValueAtTime(0.28,t+0.015);
      gain.gain.exponentialRampToValueAtTime(0.001,t+0.65);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(t); osc.stop(t+0.8);
    });
  }

  // ---------- picture-in-picture ----------
  function setupPip(){
    if(pipVideo||!document.pictureInPictureEnabled) return;
    pipCanvas=document.createElement('canvas');
    pipCanvas.width=320; pipCanvas.height=180;
    pipCtx=pipCanvas.getContext('2d');
    pipVideo=document.createElement('video');
    pipVideo.srcObject=pipCanvas.captureStream(2);
    pipVideo.muted=true;
    pipVideo.play().catch(()=>{});
  }
  function drawPip(){
    if(!pipCtx||phase==='idle') return;
    const w=pipCanvas.width, h=pipCanvas.height;
    const rem=active==='study'?studyRem:breakRem;
    const total=active==='study'?studyTotal:breakTotal;
    const label=active==='study'?'STUDY':'BREAK';
    const color=active==='study'?'#5b9dff':'#33d39a';
    const soundOn=active==='study'?studySoundEnabled:breakSoundEnabled;
    const progress=total>0?Math.max(0,Math.min(1,rem/total)):0;
    pipCtx.fillStyle='#0f1115';
    pipCtx.fillRect(0,0,w,h);
    pipCtx.font='600 11px -apple-system,sans-serif';
    pipCtx.fillStyle=color;
    pipCtx.textAlign='center';
    pipCtx.fillText(label,w/2,46);
    pipCtx.font='700 56px "JetBrains Mono",ui-monospace,monospace';
    pipCtx.fillStyle='#eef1f6';
    pipCtx.fillText(fmt(rem),w/2,114);
    pipCtx.fillStyle='#2a3140';
    pipCtx.fillRect(24,140,w-48,5);
    pipCtx.fillStyle=color;
    pipCtx.fillRect(24,140,(w-48)*progress,5);
    // bell icon top-right (only when muted)
    if(!soundOn){
      const bx=w-30, by=32, bs=10;
      pipCtx.save();
      pipCtx.lineWidth=1.5;
      pipCtx.lineCap='round';
      pipCtx.lineJoin='round';
      pipCtx.strokeStyle='#3a4155';
      pipCtx.beginPath();
      pipCtx.moveTo(bx-bs*0.55,by+bs*0.35);
      pipCtx.bezierCurveTo(bx-bs*0.55,by-bs*0.55,bx+bs*0.55,by-bs*0.55,bx+bs*0.55,by+bs*0.35);
      pipCtx.lineTo(bx+bs*0.75,by+bs*0.55);
      pipCtx.lineTo(bx-bs*0.75,by+bs*0.55);
      pipCtx.closePath();
      pipCtx.stroke();
      pipCtx.beginPath();
      pipCtx.arc(bx,by+bs*0.7,bs*0.18,0,Math.PI*2);
      pipCtx.stroke();
      pipCtx.beginPath();
      pipCtx.moveTo(bx-bs*0.18,by-bs*0.55);
      pipCtx.bezierCurveTo(bx-bs*0.18,by-bs*0.85,bx+bs*0.18,by-bs*0.85,bx+bs*0.18,by-bs*0.55);
      pipCtx.stroke();
      pipCtx.strokeStyle='#e05555';
      pipCtx.beginPath();
      pipCtx.moveTo(bx-bs*0.7,by-bs*0.7);
      pipCtx.lineTo(bx+bs*0.7,by+bs*0.7);
      pipCtx.stroke();
      pipCtx.restore();
    }
  }
  async function enterPip(){
    if(!pipVideo||!document.pictureInPictureEnabled||phase!=='running') return;
    try{
      drawPip();
      if(document.pictureInPictureElement!==pipVideo) await pipVideo.requestPictureInPicture();
    }catch(e){}
  }
  async function exitPip(){
    try{
      if(document.pictureInPictureElement) await document.exitPictureInPicture();
    }catch(e){}
  }

  // ---------- core loop ----------
  function ensureLoop(){ if(loopId==null) loopId=setInterval(tick,200); }
  function tick(){
    if(phase!=="running") return;
    const now=performance.now();
    const dt=(now-lastTs)/1000;
    lastTs=now;
    if(active==="study"){
      studyRem=Math.max(0,studyRem-dt);
      if(studyRem<=0 && !studyDone) return finish("study");
    }else{
      breakRem=Math.max(0,breakRem-dt);
      if(breakRem<=0 && !breakDone) return finish("break");
    }
    render();
  }

  function finish(which){
    // RULE: study finishes but break still has time ->
    // do NOT switch to break. Reset study and bank one break block onto break remaining.
    if(which==="study" && breakRem>0 && !breakDone){
      recordCycle();
      studyRem=studyTotal;
      studyDone=false;
      breakRem=breakRem+breakTotal;
      active="study";
      lastTs=performance.now();
      currentCycleStart=performance.now();
      currentInterruptions=0;
      if(studySoundEnabled) startSound();
      render();
      return;
    }

    if(which==="study"){ recordCycle(); studyDone=true; } else breakDone=true;
    if(which==="break" && breakSoundEnabled) startSound();
    if(which==="study" && studySoundEnabled) startSound();
    if(studyDone && breakDone){
      // both used up -> reset whole session, study runs again
      studyRem=studyTotal; breakRem=breakTotal;
      studyDone=false; breakDone=false;
      active="study";
      currentCycleStart=performance.now();
      currentInterruptions=0;
    }else{
      // hand over to the other timer automatically
      active = (which==="study") ? "break" : "study";
      if(which==="break"){
        // break ended, new study cycle begins
        currentCycleStart=performance.now();
        currentInterruptions=0;
      }
    }
    lastTs=performance.now();
    positionSpotlight(active==="study" ? cardStudy : cardBreak, active, false);
    render();
  }

  // ---------- spotlight animation ----------
  function positionSpotlight(targetCard, type, instant, slowIntro){
    if(instant){
      spotlightEl.style.transition="none";
      spotlightEl.offsetWidth; // force reflow
    }
    spotlightEl.style.left  =targetCard.offsetLeft  +"px";
    spotlightEl.style.top   =targetCard.offsetTop   +"px";
    spotlightEl.style.width =targetCard.offsetWidth +"px";
    spotlightEl.style.height=targetCard.offsetHeight+"px";
    spotlightEl.classList.toggle("study", type==="study");
    spotlightEl.classList.toggle("break", type==="break");
    if(instant){
      spotlightEl.offsetWidth; // force reflow
      spotlightEl.style.transition="";
    }
    if(slowIntro) spotlightEl.classList.add("slow-intro");
    spotlightEl.classList.add("visible");
    if(slowIntro) setTimeout(()=>spotlightEl.classList.remove("slow-intro"), 1200);
  }
  function hideSpotlight(){
    spotlightEl.classList.remove("visible","study","break");
  }

  // ---------- actions ----------
  function startSession(){
    readInputs();
    studyRem=studyTotal; breakRem=breakTotal;
    studyDone=false; breakDone=false;
    active="study"; phase="running";
    lastTs=performance.now();
    currentCycleStart=performance.now();
    currentInterruptions=0;
    ensureLoop();
    render();
    setTimeout(()=>{ if(phase==="running") positionSpotlight(cardStudy,"study",true,true); }, 340);
  }
  function switchActive(){
    if(phase!=="running") return;
    if(active==="study" && breakDone) return;   // can't go to a used-up timer
    if(active==="break" && studyDone) return;
    if(active==="study") currentInterruptions++;
    active = (active==="study") ? "break" : "study";
    lastTs=performance.now();
    positionSpotlight(active==="study" ? cardStudy : cardBreak, active, false);
    render();
  }
  function resetAll(){
    phase="idle";
    stopSound();
    readInputs();
    studyRem=studyTotal; breakRem=breakTotal;
    studyDone=false; breakDone=false;
    active="study";
    hideSpotlight();
    render();
  }

  // ---------- render ----------
  function cardClass(card,t){
    const isActive = phase==="running" && active===t;
    const isDone   = (t==="study") ? studyDone : breakDone;
    card.classList.toggle("active", isActive);
    card.classList.toggle("done",  isDone && !isActive);
    card.classList.toggle("waiting", phase==="running" && !isActive && !isDone);
    card.classList.toggle("idle", phase==="idle");
  }
  function pillText(t){
    const isActive = phase==="running" && active===t;
    const isDone   = (t==="study") ? studyDone : breakDone;
    if(phase==="idle") return "ready";
    if(isDone) return "done";
    if(isActive) return "active";
    return "waiting";
  }
  function render(){
    timeStudy.textContent=fmt(studyRem);
    timeBreak.textContent=fmt(breakRem);

    cardClass(cardStudy,"study"); cardClass(cardBreak,"break");
    pillStudy.textContent=pillText("study");
    pillBreak.textContent=pillText("break");

    barStudy.style.width=(phase==="idle"?1:(studyTotal>0? Math.max(0,Math.min(1,studyRem/studyTotal)):0))*100+"%";
    barBreak.style.width=(phase==="idle"?1:(breakTotal>0? Math.max(0,Math.min(1,breakRem/breakTotal)):0))*100+"%";

    if(phase==="idle"){
      mainBtn.textContent="Start"; mainBtn.disabled=false;
    }else if(active==="study"){
      mainBtn.textContent="Switch to break"; mainBtn.disabled=breakDone;
    }else{
      mainBtn.textContent="Resume study"; mainBtn.disabled=studyDone;
    }

    stopBtn.classList.toggle("hidden", !ringing);
    mainBtn.classList.toggle("hidden", ringing);

    const isIdle = phase==="idle";
    document.body.classList.toggle("running", !isIdle);

    if(!isIdle){
      const sS=Math.max(0,Math.ceil(studyRem));
      studyMinVal.value=String(Math.floor(sS/60)).padStart(2,"0");
      studySecVal.value=String(sS%60).padStart(2,"0");
      const bS=Math.max(0,Math.ceil(breakRem));
      breakMinVal.value=String(Math.floor(bS/60)).padStart(2,"0");
      breakSecVal.value=String(bS%60).padStart(2,"0");
      [studyMinVal,studySecVal,breakMinVal,breakSecVal].forEach(el=>el.readOnly=true);
    }else{
      [studyMinVal,studySecVal,breakMinVal,breakSecVal].forEach(el=>el.readOnly=false);
      renderSteppers();
    }

    barWrapStudy.classList.toggle("hidden", false);
    barWrapBreak.classList.toggle("hidden", false);

    document.body.classList.toggle("ringing", ringing);

    if(phase==="idle"){
      document.title="Pomodoro Chess";
    }else{
      const activeRem = active==="study" ? studyRem : breakRem;
      const label     = active==="study" ? "Study" : "Break";
      document.title  = fmt(activeRem)+" "+label;
    }
    drawPip();
    renderStats();
  }

  // ---------- stats render ----------
  function renderStats(){
    const count=todayLog.length;
    statCycleCount.textContent=count;
    statCycleGoal.textContent=cycleGoal;
    statCycleCount.classList.toggle("goal-reached", count>0 && count>=cycleGoal);

    const s=streakData.streak||0;
    statStreak.textContent=s===0?'–':s+(s===1?' day':' days');
    const totalSec=todayLog.reduce((a,c)=>a+(c.studySec||c.durationSec),0);
    const hh=Math.floor(totalSec/3600), mm=Math.floor((totalSec%3600)/60), ss=totalSec%60;
    statTotalStudied.textContent=hh+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');

    statLogCount.textContent=count+(count===1?' cycle':' cycles');

    sessionLogList.innerHTML='';
    if(count===0){
      const li=document.createElement('li');
      li.className='log-empty';
      li.textContent='No cycles completed today.';
      sessionLogList.appendChild(li);
    }else{
      todayLog.forEach((c,i)=>{
        const li=document.createElement('li');
        li.className='log-item';
        const intStr=c.interruptions>0?c.interruptions+'×':'–';
        li.innerHTML=
          '<span class="log-n">'+(i+1)+'</span>'+
          '<span class="log-time">'+c.startTime+'</span>'+
          '<span class="log-dur">'+fmtDuration(c.durationSec)+'</span>'+
          '<span class="log-int">'+intStr+'</span>';
        sessionLogList.appendChild(li);
      });
    }
  }

  // ---------- wiring ----------
  mainBtn.addEventListener("click", ()=>{
    ensureCtx();                          // unlock audio on user gesture
    if(phase==="idle") startSession(); else switchActive();
  });
  stopBtn.addEventListener("click", ()=>{ ensureCtx(); stopSound(); });
  resetBtn.addEventListener("click", ()=>{ ensureCtx(); resetAll(); });

  // ---------- info modal ----------
  const avanzateToggle=$("avanzateToggle"), avanzatePanel=$("avanzatePanel");
  function setAvanzate(open){
    avanzatePanel.classList.toggle("open", open);
    avanzateToggle.textContent=open?"Hide":"Advanced";
    avanzateToggle.setAttribute("aria-expanded", open?"true":"false");
    localStorage.setItem("pomodoroAvanzate", open?"1":"0");
  }
  setAvanzate(localStorage.getItem("pomodoroAvanzate")==="1");
  avanzateToggle.addEventListener("click",()=>setAvanzate(!avanzatePanel.classList.contains("open")));

  const infoModal=$("infoModal"), infoBtn=$("infoBtn"), modalClose=$("modalClose");
  function openModal(){ infoModal.classList.add("open"); }
  function closeModal(){ infoModal.classList.remove("open"); }
  infoBtn.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  infoModal.addEventListener("click", e=>{ if(e.target===infoModal) closeModal(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModal(); });

  studyMinDec.addEventListener("click",()=>{ sMin=stepVal(sMin,-1,0,999); applyStep(); });
  studyMinInc.addEventListener("click",()=>{ sMin=stepVal(sMin,+1,0,999); applyStep(); });
  studySecDec.addEventListener("click",()=>{ sSec=stepVal(sSec,-1,0,59); applyStep(); });
  studySecInc.addEventListener("click",()=>{ sSec=stepVal(sSec,+1,0,59); applyStep(); });
  breakMinDec.addEventListener("click",()=>{ bMin=stepVal(bMin,-1,0,999); applyStep(); });
  breakMinInc.addEventListener("click",()=>{ bMin=stepVal(bMin,+1,0,999); applyStep(); });
  breakSecDec.addEventListener("click",()=>{ bSec=stepVal(bSec,-1,0,59); applyStep(); });
  breakSecInc.addEventListener("click",()=>{ bSec=stepVal(bSec,+1,0,59); applyStep(); });

  studyMinVal.addEventListener("input",()=>{ sMin=clamp(studyMinVal.value,0,999); applyStep(); });
  studySecVal.addEventListener("input",()=>{ sSec=clamp(studySecVal.value,0,59);  applyStep(); });
  breakMinVal.addEventListener("input",()=>{ bMin=clamp(breakMinVal.value,0,999); applyStep(); });
  breakSecVal.addEventListener("input",()=>{ bSec=clamp(breakSecVal.value,0,59);  applyStep(); });

  [studyMinVal,studySecVal,breakMinVal,breakSecVal].forEach(el=>{
    el.addEventListener("blur",()=>{ if(phase==="idle") renderSteppers(); });
  });

  studySoundBtn.addEventListener("click", ()=>{
    studySoundEnabled=!studySoundEnabled;
    studySoundBtn.classList.toggle("muted",!studySoundEnabled);
    saveSettings();
  });
  breakSoundBtn.addEventListener("click", ()=>{
    breakSoundEnabled=!breakSoundEnabled;
    breakSoundBtn.classList.toggle("muted",!breakSoundEnabled);
    saveSettings();
  });

  goalSoundBtn.addEventListener("click", ()=>{
    goalSoundEnabled=!goalSoundEnabled;
    goalSoundBtn.classList.toggle("muted",!goalSoundEnabled);
    saveSettings();
  });

  clearAllBtn.addEventListener("click", ()=>{
    if(!confirm("Clear all data? Cycles, streak and goal will be reset.")) return;
    todayLog=[];
    streakData={lastDate:null,streak:0};
    cycleGoal=4;
    saveStats();
    renderStats();
  });

  goalDec.addEventListener("click",()=>{
    cycleGoal=Math.max(1,cycleGoal-1);
    saveStats();
    renderStats();
  });
  goalInc.addEventListener("click",()=>{
    cycleGoal=Math.min(99,cycleGoal+1);
    saveStats();
    renderStats();
  });

  document.addEventListener("visibilitychange", ()=>{
    if(!document.hidden && ringing) ensureCtx();
    if(document.hidden && phase==='running') enterPip();
    else if(!document.hidden) exitPip();
  });

  window.addEventListener("resize", ()=>{
    if(phase==="running"){
      positionSpotlight(active==="study" ? cardStudy : cardBreak, active, true);
    }
  });

  loadSettings();
  loadStats();
  studySoundBtn.classList.toggle("muted",!studySoundEnabled);
  breakSoundBtn.classList.toggle("muted",!breakSoundEnabled);
  goalSoundBtn.classList.toggle("muted",!goalSoundEnabled);
  readInputs();
  studyRem=studyTotal; breakRem=breakTotal;
  renderSteppers();
  render();
})();
