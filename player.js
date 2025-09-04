// ==========================
// IPTV Player Core (Fixed Controls + % Counter + Smart Retry)
// ==========================
document.body.innerHTML = `
<div id="playerContainer">
  <video id="videoPlayer" autoplay muted playsinline webkit-playsinline></video>

  <div id="overlay">
    <div id="overlayContent">
      <div id="overlayText" style="font-size:28px; font-weight:bold;">Welcome to Juzt TV</div>
      <div style="font-size:20px; margin-top:10px;">Click anywhere or press Enter/OK to start</div>
      <img id="overlayLogo" src="your-logo.png" alt="Juzt TV Logo">
      <div id="overlayHint">Help us keep the service running smoothly. Your generosity can support our efforts. Gcash: 09776192184</div>
    </div>
  </div>

  <div id="sidebar">
    <div id="sidebarHeader">
      <input id="searchInput" type="text" placeholder="Search channel...">
      <button id="favoritesToggle">⭐ Favorites</button>
    </div>
    <ul id="channelList"></ul>
  </div>

  <div id="loadingSpinner">
    <div class="spinner"></div>
    <div id="loadingText">0%</div>
  </div>
</div>
`;

// ==========================
// Styles
// ==========================
const style = document.createElement("style");
style.textContent = `
html, body { margin:0; padding:0; width:100%; height:100%; background:black; font-family:Arial,sans-serif; overflow:hidden; touch-action:manipulation;}
#playerContainer { position:relative; width:100vw; height:100vh; background:black; overflow:hidden; }
#videoPlayer { position:absolute; top:50%; left:50%; width:100%; height:100%; object-fit:contain; transform:translate(-50%, -50%);}
#overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  color: white;
  text-align: center;
  z-index: 2000;
  cursor: pointer;
  padding: 3vh; /* scale padding with screen height */
  box-sizing: border-box;
}

#overlayContent {
margin-bottom: 5vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 90%;
  max-height: 100%;
  justify-content: center;
}

#overlayText {
  font-size: clamp(12px, 2vh, 24px); /* scales with screen height */
  margin-bottom: 2vh;
  line-height: 1.3;
}

#overlayLogo {
  max-width: 80%;
  max-height: 40vh; /* logo scales by height */
  width: auto;
  height: auto;
  margin: 0 auto;
}

#overlayHint {
  margin-top: 2vh;
  font-size: clamp(10px, 1.5vh, 18px); /* scales with screen height */
  opacity: 0.8;
}


#sidebar { position:absolute; top:0; left:0; width:30%; max-width:320px; height:100%; background:rgba(20,20,20,0.95); overflow-y:auto; color:white; padding:0; box-shadow:2px 0 10px rgba(0,0,0,0.5); transform:translateX(-100%); opacity:0; transition:transform 0.4s, opacity 0.4s; z-index:1000; }
#sidebar.open { transform:translateX(0); opacity:1; }

#sidebarHeader { display: flex; flex-direction: column; gap: 10px; padding: 10px; margin-bottom: 10px; box-sizing: border-box; }
#searchInput, #favoritesToggle { width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
#searchInput { border: none; background: White; color: #111; }
#searchInput::placeholder { color: #aaa; }
#favoritesToggle { background: #444; color: white; border: none; cursor: pointer; text-align: left; }
#favoritesToggle.active { background:#28a745; }

#channelList { list-style:none; padding:0; margin:0; }
#channelList li { display:flex; justify-content:space-between; align-items:center; padding:12px 10px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.1); }
#channelList li:hover { background: rgba(255,255,255,0.2); }
#channelList li.highlight { background:#28a745; color:white; font-weight:600; }
.favorite-btn { margin-left:10px; cursor:pointer; }
.favorite-btn.active { color:gold; }

body.hide-cursor { cursor:none; }
@media (orientation: landscape){ #videoPlayer{width:100vw;height:100vh;top:0;left:0;transform:none;} }

#loadingSpinner { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2000; display:none; align-items:center; justify-content:center; color:white; }
.spinner { border:6px solid rgba(255,255,255,0.2); border-top:6px solid #fff; border-radius:50%; width:80px; height:80px; animation:spin 1s linear infinite; }
#loadingText { position:absolute; font-size:16px; font-weight:bold; color:white; pointer-events:none; }
@keyframes spin { 100% { transform:rotate(360deg);} }
`;
document.head.appendChild(style);

// ==========================
// External Libraries
// ==========================
const scriptHls = document.createElement("script");
scriptHls.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
document.head.appendChild(scriptHls);

const scriptShaka = document.createElement("script");
scriptShaka.src = "https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.3.5/shaka-player.compiled.js";
document.head.appendChild(scriptShaka);

Promise.all([
  new Promise(res => scriptHls.onload = res),
  new Promise(res => scriptShaka.onload = res)
]).then(initPlayer);
// ==========================
// Built-in Channels
// ==========================
const builtInChannels = [
  { 
    name:"Animax", 
    type:"dash", 
    logo:"https://th.bing.com/th/id/OIP.39-tpYJk2UwoQjQc7Af_oAHaCi", 
    manifestUri:"https://tglmp01.akamaized.net/out/v1/de55fad9216e4fe7ad8d2eed456ba1ec/manifest.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "edf1a715de9748638dd2fad75a419af2":"2f5a3199b26e9b693ae881af7ff864cf" } 
    } 
  },
  { 
    name:"DreamWorks Tagalized", 
    type:"dash", 
    logo:"https://i.imgur.com/fh1Lg7b.png", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_dreamworktag.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "564b3b1c781043c19242c66e348699c5":"d3ad27d7fe1f14fb1a2cd5688549fbab" } 
    } 
  },
  { 
    name:"DreamWorks", 
    type:"dash", 
    logo:"https://i.imgur.com/fh1Lg7b.png", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_dreamworks_hd1.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "4ab9645a2a0a47edbd65e8479c2b9669":"8cb209f1828431ce9b50b593d1f44079" } 
    } 
  },

  // ==========================
  // New Channels
  // ==========================
  { 
    name:"Disney Channel", 
    type:"hls", 
    logo:"https://i.imgur.com/NVRbZfJ.png", 
    manifestUri:"https://disney-channel.13l.link/live/Disney/index.m3u8" 
  },
  { 
    name:"CINEMO!", 
    type:"dash", 
    manifestUri:"https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-cinemo-dash-abscbnono/index.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "aa8aebe35ccc4541b7ce6292efcb1bfb":"aab1df109d22fc5d7e3ec121ddf24e5f" } 
    } 
  },
  { 
    name:"TV5 HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/tv5_hd.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "2615129ef2c846a9bbd43a641c7303ef":"07c7f996b1734ea288641a68e1cfdc4d" } 
    } 
  },
  { 
    name:"A2Z", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_a2z.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "f703e4c8ec9041eeb5028ab4248fa094":"c22f2162e176eee6273a5d0b68d19530" } 
    } 
  },
  { 
    name:"PTV 4", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_ptv4_sd.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "71a130a851b9484bb47141c8966fb4a3":"ad1f003b4f0b31b75ea4593844435600" } 
    } 
  },
  { 
    name:"NBA TV Philippines", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cgnl_nba.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "c5e51f41ceac48709d0bdcd9c13a4d88":"20b91609967e472c27040716ef6a8b9a" } 
    } 
  },
  { 
    name:"One Sports HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_onesports_hd.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "53c3bf2eba574f639aa21f2d4409ff11":"3de28411cf08a64ea935b9578f6d0edd" } 
    } 
  },
  { 
    name:"PBA Rush", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_pbarush_hd1.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "76dc29dd87a244aeab9e8b7c5da1e5f3":"95b2f2ffd4e14073620506213b62ac82" } 
    } 
  },
  { 
    name:"UAAP Varsity Channel", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/cg_uaap_cplay_sd.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "95588338ee37423e99358a6d431324b9":"6e0f50a12f36599a55073868f814e81e" } 
    } 
  },
  { 
    name:"Warner TV HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-05-prod.akamaized.net/out/u/cg_warnerhd.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "4503cf86bca3494ab95a77ed913619a0":"afc9c8f627fb3fb255dee8e3b0fe1d71" } 
    } 
  }
];

// ==========================
// Player Logic (with smart retry, 1s timeout)
// ==========================
function initPlayer(){
  const container=document.getElementById("playerContainer");
  const video=document.getElementById("videoPlayer");
  const sidebar=document.getElementById("sidebar");
  const channelList=document.getElementById("channelList");
  const overlay=document.getElementById("overlay");
  const spinner=document.getElementById("loadingSpinner");
  const loadingText=document.getElementById("loadingText");
  const searchInput=document.getElementById("searchInput");
  const favoritesToggle=document.getElementById("favoritesToggle");

  let channels=[...builtInChannels];
  let currentIndex=0, hls=null, shakaPlayer=null, preloaded={}, overlayDismissed=false, lastEnterTime=0;
  let favorites=JSON.parse(localStorage.getItem("favorites")||"[]"), showFavoritesOnly=false;

  video.controls=false; video.preload="auto";

  // Playlist Loader
  async function loadPlaylist(url){
    try{
      const res=await fetch(url); const text=await res.text();
      const lines=text.split("\n"); let parsed=[], name="";
      lines.forEach(line=>{
        if(line.startsWith("#EXTINF")) name=line.split(",").pop().trim();
        else if(line && !line.startsWith("#")) parsed.push({ name:name||`Channel ${parsed.length+1}`, type:line.endsWith(".mpd")?"dash":"hls", manifestUri:line.trim() });
      });
      channels=[...builtInChannels,...parsed]; renderChannels();
    }catch(err){ console.error("Playlist load error:",err); alert("Unable to load playlist."); }
  }

  // Render Channels
  function renderChannels(){
    channelList.innerHTML=""; let list=channels;
    if(showFavoritesOnly) list=channels.filter(ch=>favorites.includes(ch.name));
    const query=searchInput.value.toLowerCase(); if(query) list=list.filter(ch=>ch.name.toLowerCase().includes(query));
    list.forEach((ch,idx)=>{
      const li=document.createElement("li"); li.textContent=ch.name;
      const favBtn=document.createElement("span"); favBtn.textContent="★";
      favBtn.className="favorite-btn"+(favorites.includes(ch.name)?" active":"");
      favBtn.onclick=(e)=>{e.stopPropagation();toggleFavorite(ch.name);renderChannels();};
      if(channels[currentIndex] && ch.name===channels[currentIndex].name) li.classList.add("highlight");
      li.onclick=()=>{ playChannel(channels.indexOf(ch)); toggleSidebar(false); };
      li.appendChild(favBtn); channelList.appendChild(li);
    });
  }

  function toggleFavorite(name){
    favorites=favorites.includes(name)?favorites.filter(f=>f!==name):[...favorites,name];
    localStorage.setItem("favorites",JSON.stringify(favorites));
  }

  favoritesToggle.onclick=()=>{ showFavoritesOnly=!showFavoritesOnly; favoritesToggle.classList.toggle("active",showFavoritesOnly); renderChannels(); };
  searchInput.oninput=renderChannels;

  function highlightChannel(i){ [...channelList.children].forEach((li,idx)=>li.classList.toggle("highlight",idx===i)); if(channelList.children[i]) channelList.children[i].scrollIntoView({block:"center",behavior:"smooth"}); }

  // Playback with retry after 1s
  function playChannel(i, retry=0){
    currentIndex=i; const ch=channels[i]; const url=ch.manifestUri;
    video.muted=false; highlightChannel(i);
    if(hls){hls.destroy();hls=null;} if(shakaPlayer){shakaPlayer.destroy();shakaPlayer=null;}
    spinner.style.display="flex"; let progress=0; loadingText.textContent="0%";
    const prog=setInterval(()=>{ if(progress<95){progress+=5;loadingText.textContent=progress+"%";} },200);

    let retryTimeout;

    function onReady(){ clearInterval(prog); clearTimeout(retryTimeout); loadingText.textContent="100%"; setTimeout(()=>spinner.style.display="none",300); video.play().catch(err=>{console.error("Playback error:",err); if(retry<1) playChannel(i,retry+1);}); }
    function onError(err){ console.error("Load failed:",err); clearInterval(prog); clearTimeout(retryTimeout); spinner.style.display="none"; if(retry<1) playChannel(i,retry+1); }

    retryTimeout=setTimeout(()=>{ console.warn("Retrying channel load..."); if(retry<1) playChannel(i,retry+1); },1000);

    if(ch.type==="hls"&&Hls.isSupported()){ hls=new Hls(); hls.loadSource(url); hls.attachMedia(video); hls.on(Hls.Events.MANIFEST_PARSED,()=>onReady()); hls.on(Hls.Events.ERROR,()=>onError()); }
    else if(ch.type==="dash"){ shakaPlayer=new shaka.Player(video); if(ch.drm){ shakaPlayer.configure({drm:{clearKeys:ch.drm.keyIds}}); } shakaPlayer.load(url).then(onReady).catch(onError); }
    else{ video.src=url; video.oncanplay=onReady; video.onerror=onError; }

    preloadChannel((i+1)%channels.length);
  }

  function preloadChannel(i){ if(preloaded[i]) return; const ch=channels[i]; if(ch.type==="hls"&&Hls.isSupported()){ const dummy=document.createElement("video"),tmp=new Hls(); tmp.loadSource(ch.manifestUri); tmp.attachMedia(dummy); preloaded[i]={type:"hls",hls:tmp}; } else if(ch.type==="dash"){ const dummy=document.createElement("video"),tmp=new shaka.Player(dummy); if(ch.drm){ tmp.configure({drm:{clearKeys:ch.drm.keyIds}});} tmp.load(ch.manifestUri).catch(()=>{}); preloaded[i]={type:"shaka",shaka:tmp}; } else preloaded[i]={type:"native"}; }

  function toggleSidebar(force){ if(force===true) sidebar.classList.add("open"); else if(force===false) sidebar.classList.remove("open"); else sidebar.classList.toggle("open"); if(sidebar.classList.contains("open")) highlightChannel(currentIndex); }
  function toggleFullscreen(){ if(!document.fullscreenElement) container.requestFullscreen?.(); else document.exitFullscreen?.(); }

  overlay.onclick=()=>{ overlay.style.display="none"; overlayDismissed=true; playChannel(0); };
  container.onclick=(e)=>{ if(!overlayDismissed) return; if(e.detail===2){toggleFullscreen();return;} if(e.target.closest("#sidebar")) return; toggleSidebar(); };

  // Key Controls
  document.addEventListener("keydown",e=>{ const now=Date.now(); if(e.key==="Enter"){ if(now-lastEnterTime<300){toggleFullscreen();lastEnterTime=0;return;} lastEnterTime=now;
      if(overlay.style.display!=="none"){ overlay.style.display="none"; overlayDismissed=true; playChannel(0); }
      else if(sidebar.classList.contains("open")){ playChannel(currentIndex); toggleSidebar(false); }
      else toggleSidebar(true); e.preventDefault(); }
    if(sidebar.classList.contains("open")){ if(e.key==="ArrowDown"){currentIndex=(currentIndex+1)%channels.length;highlightChannel(currentIndex);} if(e.key==="ArrowUp"){currentIndex=(currentIndex-1+channels.length)%channels.length;highlightChannel(currentIndex);} }
    else{ if(e.key==="PageDown"){currentIndex=(currentIndex+1)%channels.length;playChannel(currentIndex);} if(e.key==="PageUp"){currentIndex=(currentIndex-1+channels.length)%channels.length;playChannel(currentIndex);} }
  });

  document.addEventListener("mousemove",()=>{ document.body.classList.remove("hide-cursor"); clearTimeout(window.cursorTimeout); window.cursorTimeout=setTimeout(()=>document.body.classList.add("hide-cursor"),2000); });
  video.addEventListener("pause",()=>{ if(document.fullscreenElement) video.play(); });

  loadPlaylist("https://raw.githubusercontent.com/juztnobadi24/mychannels/main/juztchannels.m3u");
}




