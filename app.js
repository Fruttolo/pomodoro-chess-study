(function(){
  "use strict";

  // ---------- elements ----------
  const $ = id => document.getElementById(id);
  const cardStudy=$("cardStudy"), cardBreak=$("cardBreak");
  const timeStudy=$("timeStudy"), timeBreak=$("timeBreak");
  const pillStudy=$("pillStudy"), pillBreak=$("pillBreak");
  const barStudy=$("barStudy"), barBreak=$("barBreak");
  const mainBtn=$("mainBtn"), stopBtn=$("stopBtn"), resetBtn=$("resetBtn");
  const studySoundBtn=$("studySoundBtn"), breakSoundBtn=$("breakSoundBtn");
  const studyEditor=$("studyEditor"), breakEditor=$("breakEditor");
  const barWrapStudy=$("barWrapStudy"), barWrapBreak=$("barWrapBreak");
  const studyMinVal=$("studyMinVal"), studySecVal=$("studySecVal");
  const breakMinVal=$("breakMinVal"), breakSecVal=$("breakSecVal");
  const studyMinDec=$("studyMinDec"), studyMinInc=$("studyMinInc");
  const studySecDec=$("studySecDec"), studySecInc=$("studySecInc");
  const breakMinDec=$("breakMinDec"), breakMinInc=$("breakMinInc");
  const breakSecDec=$("breakSecDec"), breakSecInc=$("breakSecInc");

  // ---------- stepper state ----------
  let sMin=25, sSec=0, bMin=5, bSec=0;
  let studySoundEnabled=false, breakSoundEnabled=true;

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
  const NOTES=[523.25,659.25,783.99,1046.5]; // C5 E5 G5 C6 – major arpeggio
  const NOTE_SPACING=0.34;   // seconds between note onsets
  const PHRASE_INTERVAL=3200; // ms between phrase starts
  let actx=null, melodyTimer=null;

  function ensureCtx(){
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended") actx.resume();
    setupPip();
  }
  function playNote(freq,startTime){
    const osc=actx.createOscillator(), gain=actx.createGain();
    osc.type="sine";
    osc.frequency.value=freq;
    const t=startTime;
    gain.gain.setValueAtTime(0.001,t);
    gain.gain.exponentialRampToValueAtTime(0.20,t+0.012);
    gain.gain.exponentialRampToValueAtTime(0.001,t+1.1);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(t); osc.stop(t+1.15);
  }
  function playPhrase(){
    if(!actx) return;
    const now=actx.currentTime+0.02;
    NOTES.forEach((freq,i)=>playNote(freq,now+i*NOTE_SPACING));
  }
  function startSound(){
    ensureCtx();
    if(ringing) return;
    ringing=true;
    playPhrase();
    melodyTimer=setInterval(playPhrase,PHRASE_INTERVAL);
    render();
  }
  function stopSound(){
    ringing=false;
    if(melodyTimer){ clearInterval(melodyTimer); melodyTimer=null; }
    render();
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
    // RULE: study finishes but pause still has time ->
    // do NOT switch to pause. Reset study and bank one pause block onto pause remaining.
    if(which==="study" && breakRem>0 && !breakDone){
      studyRem=studyTotal;
      studyDone=false;
      breakRem=breakRem+breakTotal;
      active="study";
      lastTs=performance.now();
      if(studySoundEnabled) startSound();
      render();
      return;
    }

    if(which==="study") studyDone=true; else breakDone=true;
    if(which==="break" && breakSoundEnabled) startSound();
    if(which==="study" && studySoundEnabled) startSound();
    if(studyDone && breakDone){
      // both used up -> reset whole session, study runs again
      studyRem=studyTotal; breakRem=breakTotal;
      studyDone=false; breakDone=false;
      active="study";
    }else{
      // hand over to the other timer automatically
      active = (which==="study") ? "break" : "study";
    }
    lastTs=performance.now();
    render();
  }

  // ---------- actions ----------
  function startSession(){
    readInputs();
    studyRem=studyTotal; breakRem=breakTotal;
    studyDone=false; breakDone=false;
    active="study"; phase="running";
    lastTs=performance.now();
    ensureLoop();
    render();
  }
  function switchActive(){
    if(phase!=="running") return;
    if(active==="study" && breakDone) return;   // can't go to a used-up timer
    if(active==="break" && studyDone) return;
    active = (active==="study") ? "break" : "study";
    lastTs=performance.now();
    render();
  }
  function resetAll(){
    phase="idle";
    stopSound();
    readInputs();
    studyRem=studyTotal; breakRem=breakTotal;
    studyDone=false; breakDone=false;
    active="study";
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
  }

  // ---------- wiring ----------
  mainBtn.addEventListener("click", ()=>{
    ensureCtx();                          // unlock audio on user gesture
    if(phase==="idle") startSession(); else switchActive();
  });
  stopBtn.addEventListener("click", ()=>{ ensureCtx(); stopSound(); });
  resetBtn.addEventListener("click", ()=>{ ensureCtx(); resetAll(); });

  // ---------- info modal ----------
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
  });
  breakSoundBtn.addEventListener("click", ()=>{
    breakSoundEnabled=!breakSoundEnabled;
    breakSoundBtn.classList.toggle("muted",!breakSoundEnabled);
  });

  document.addEventListener("visibilitychange", ()=>{
    if(!document.hidden && ringing) ensureCtx();
    if(document.hidden && phase==='running') enterPip();
    else if(!document.hidden) exitPip();
  });

  readInputs();
  studyRem=studyTotal; breakRem=breakTotal;
  renderSteppers();
  render();
})();
