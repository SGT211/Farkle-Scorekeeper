(() => {
  const $ = (id) => document.getElementById(id);
  const colors = ["#ed38a1","#8b50ff","#299cff","#a99be9","#ff9b45","#38cda7","#ef6b75","#b7a4ff"];
  const defaultNames = ["Maya","Jordan","Sam","Lee"];
  let state = {
    players: defaultNames.map((name,i)=>({name,score:0,farkles:0,color:colors[i]})),
    current:0, entry:"", stack:[], history:[], round:1, target:10000, need500:true,
    winner:null, undoStack:[]
  };
  let editorNames = [...defaultNames];
  let toastTimer;
  const clone = x => JSON.parse(JSON.stringify(x));
  const fmt = n => Number(n||0).toLocaleString("en-US");
  const currentPlayer = () => state.players[state.current];
  const stacked = () => state.stack.reduce((a,b)=>a+b,0);
  const total = () => stacked() + (Number(state.entry)||0);
  const snapshot = () => { state.undoStack.push(clone({...state,undoStack:[]})); if(state.undoStack.length>40)state.undoStack.shift(); };
  const showToast = msg => { const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),1800); };
  const save = () => { try{localStorage.setItem("familyFarkleSave",JSON.stringify({...state,undoStack:[]}));}catch(e){} };
  const load = () => { try{const s=JSON.parse(localStorage.getItem("familyFarkleSave"));if(s&&s.players?.length>=2){state={...state,...s,undoStack:[]};}}catch(e){} };
  function render(){
    $("players").innerHTML=state.players.map((p,i)=>`<div class="player-card ${i===state.current?"current":""}" style="--player:${p.color}">
      <div class="player-name">${esc(p.name)}</div><div class="player-score">${fmt(p.score)}</div>
      <div class="player-progress"><span style="width:${Math.min(100,p.score/state.target*100)}%"></span></div>
      <div class="player-meta">${fmt(p.score)} / ${fmt(state.target)}</div></div>`).join("");
    $("turnLabel").textContent=`${currentPlayer().name}'s turn`;
    $("stackLine").textContent=state.stack.length?`${state.stack.map(fmt).join(" + ")} +`:"";
    $("entryScore").textContent=state.entry?fmt(Number(state.entry)):"0";
    $("turnTotal").textContent=fmt(total());
    $("bankBtn").textContent=`Bank ${fmt(total())}`;
    $("bankBtn").disabled=total()<=0;
    $("undoBtn").disabled=!state.undoStack.length;
    $("farkleCount").textContent=state.players.map(p=>`${p.name}: ${p.farkles} Farkles`).join("  ·  ");
    $("scoreHint").textContent=state.stack.length?`Hot dice stack · ${fmt(stacked())} saved this turn`:"Enter your score";
    save();
  }
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function openScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$(id).classList.add("active");}
  function addKey(key){
    if(key==="+"){addStack();return;}
    snapshot();
    if(state.entry.length<8){state.entry+=key;}
    render();
  }
  function addStack(){
    const value=Number(state.entry)||0;
    if(value<=0){showToast("Enter a score before adding +");return;}
    snapshot();state.stack.push(value);state.entry="";render();showToast(`${fmt(value)} added to hot dice stack`);
  }
  function clearEntry(){if(!state.entry){showToast("Nothing to clear");return;}snapshot();state.entry="";render();}
  function undo(){if(!state.undoStack.length){showToast("Nothing to undo");return;}const prior=state.undoStack.pop();state={...prior,undoStack:state.undoStack};render();showToast("Last action undone");}
  function nextPlayer(){state.current=(state.current+1)%state.players.length;if(state.current===0)state.round++;}
  function bank(){
    const score=total();if(score<=0)return;
    if(score%50!==0){showToast("Banked scores must end in 00 or 50");return;}
    if(state.need500&&currentPlayer().score===0&&score<500){showToast("You need 500 points to get on the board");return;}
    snapshot();
    const p=currentPlayer();p.score+=score;
    state.history.push({round:state.round,player:p.name,playerIndex:state.current,score,farkle:false,total:p.score});
    state.entry="";state.stack=[];
    if(p.score>=state.target){state.winner=state.current;render();showWinner();return;}
    nextPlayer();render();
  }
  function farkle(){
    snapshot();const p=currentPlayer();p.farkles++;
    state.history.push({round:state.round,player:p.name,playerIndex:state.current,score:0,farkle:true,total:p.score});
    state.entry="";state.stack=[];nextPlayer();render();showToast(`${p.name} farkled — turn score lost`);
  }
  function showWinner(){
    const p=state.players[state.winner];$("winnerName").textContent=`${p.name} wins!`;$("winnerScore").textContent=fmt(p.score);
    $("finalScores").innerHTML=[...state.players].sort((a,b)=>b.score-a.score).map(x=>`<div class="final-row"><span>${esc(x.name)}</span><strong>${fmt(x.score)}</strong></div>`).join("");
    openScreen("winnerScreen");
  }
  function showHistory(){
    drawChart();const groups={};[...state.history].reverse().forEach(h=>(groups[h.round]??=[]).push(h));
    $("historyRounds").innerHTML=Object.keys(groups).sort((a,b)=>b-a).map(round=>`<div class="round-title">Round ${round}</div>`+groups[round].map(h=>`<div class="history-item"><span style="color:${colors[h.playerIndex%colors.length]}">▦</span><strong>${esc(h.player)}</strong><span class="result ${h.farkle?"farkled":"scored"}">${h.farkle?"Farkle":`+${fmt(h.score)}`}</span></div>`).join("")).join("")||'<div class="round-title">No turns recorded yet.</div>';
    openScreen("historyScreen");
  }
  function drawChart(){
    const canvas=$("historyChart"),ctx=canvas.getContext("2d"),w=canvas.clientWidth,h=canvas.clientHeight,dpr=window.devicePixelRatio||1;
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
    const pad={l:34,r:10,t:10,b:24},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    const rounds=Math.max(2,state.round),max=Math.max(state.target,...state.players.map(p=>p.score),1000);
    ctx.font="9px -apple-system, sans-serif";ctx.textAlign="right";ctx.fillStyle="#9e92b6";ctx.strokeStyle="#ffffff18";
    for(let i=0;i<=4;i++){let y=pad.t+ph*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(Math.round(max*(1-i/4))),pad.l-5,y+3);}
    state.players.forEach((p,pi)=>{let points=[0];let totalScore=0;for(let r=1;r<=rounds;r++){state.history.filter(x=>x.playerIndex===pi&&x.round===r&&!x.farkle).forEach(x=>totalScore+=x.score);points.push(totalScore);}
      ctx.beginPath();ctx.strokeStyle=p.color;ctx.lineWidth=2.2;points.forEach((v,i)=>{let x=pad.l+pw*i/rounds,y=pad.t+ph-(v/max)*ph;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();points.forEach((v,i)=>{let x=pad.l+pw*i/rounds,y=pad.t+ph-(v/max)*ph;ctx.beginPath();ctx.fillStyle=p.color;ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();});});
    ctx.textAlign="center";ctx.fillStyle="#9e92b6";for(let i=1;i<=rounds;i++)ctx.fillText(i,pad.l+pw*i/rounds,h-6);
    $("chartLegend").innerHTML=state.players.map(p=>`<span><i class="legend-dot" style="background:${p.color}"></i>${esc(p.name)}</span>`).join("");
  }
  function renderEditor(){
    $("playerEditor").innerHTML=editorNames.map((n,i)=>`<div class="edit-player"><input data-player="${i}" maxlength="18" aria-label="Player ${i+1} name" value="${esc(n)}"><button class="remove-player" data-remove="${i}" aria-label="Remove player">−</button></div>`).join("");
    $("playerEditor").querySelectorAll("input").forEach(inp=>inp.addEventListener("input",e=>editorNames[Number(e.target.dataset.player)]=e.target.value));
    $("playerEditor").querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{if(editorNames.length<=2){showToast("At least 2 players are needed");return;}editorNames.splice(Number(btn.dataset.remove),1);renderEditor();}));
    $("addPlayerBtn").disabled=editorNames.length>=8;
  }
  function openNewGame(){editorNames=state.players.map(p=>p.name);$("targetValue").textContent=fmt(state.target);$("boardToggle").checked=state.need500;renderEditor();openScreen("newGameScreen");}
  function startGame(){
    const names=editorNames.map((n,i)=>n.trim()||`Player ${i+1}`);
    if(names.length<2){showToast("Add at least 2 players");return;}
    state={players:names.map((name,i)=>({name,score:0,farkles:0,color:colors[i%colors.length]})),current:0,entry:"",stack:[],history:[],round:1,target:state.target,need500:$("boardToggle").checked,winner:null,undoStack:[]};
    render();openScreen("gameScreen");
  }
  document.querySelectorAll("[data-key]").forEach(b=>b.addEventListener("click",()=>addKey(b.dataset.key)));
  $("clearBtn").addEventListener("click",clearEntry);$("undoBtn").addEventListener("click",undo);$("bankBtn").addEventListener("click",bank);$("farkleBtn").addEventListener("click",farkle);
  $("newGameBtn").addEventListener("click",openNewGame);$("historyBtn").addEventListener("click",showHistory);
  $("addPlayerBtn").addEventListener("click",()=>{if(editorNames.length<8){editorNames.push("");renderEditor();}});
  $("targetMinus").addEventListener("click",()=>{state.target=Math.max(1000,state.target-500);$("targetValue").textContent=fmt(state.target);});
  $("targetPlus").addEventListener("click",()=>{state.target=Math.min(50000,state.target+500);$("targetValue").textContent=fmt(state.target);});
  $("startGameBtn").addEventListener("click",startGame);
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>openScreen("gameScreen")));
  $("playAgainBtn").addEventListener("click",openNewGame);$("winnerClose").addEventListener("click",()=>openScreen("gameScreen"));
  window.addEventListener("resize",()=>{if($("historyScreen").classList.contains("active"))drawChart();});
  load();render();
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();