// ==========================
// IPTV Player Core
// ==========================
document.body.innerHTML = `
<div id="playerContainer">
  <video id="videoPlayer" autoplay muted playsinline webkit-playsinline></video>

  <div id="overlay">
    <div id="overlayContent">
      <div id="overlayText" style="font-size:28px; font-weight:bold;">Welcome to Juzt TV</div>
      <div style="font-size:20px; margin-top:10px;">Click anywhere or press Enter/OK to start</div>
      <img id="overlayLogo" src="your-logo.png" alt="Juzt TV Logo">
      <div id="overlayHint">Help us keep the service running smoothly. Support Juzt TV. Gcash: 09776192184</div>
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
#overlay { position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; flex-direction:column; color:white; text-align:center; z-index:2000; cursor:pointer; }
#overlayContent { display:flex; flex-direction:column; align-items:center; }
#overlayText { font-size:22px; margin-bottom:20px; }
#overlayLogo { max-width:200px; margin:20px 0; }
#overlayHint { margin-top:20px; font-size:16px; opacity:0.8; }

#sidebar { position:absolute; top:0; left:0; width:30%; max-width:320px; height:100%; background:rgba(20,20,20,0.95); overflow-y:auto; color:white; padding:0; box-shadow:2px 0 10px rgba(0,0,0,0.5); transform:translateX(-100%); opacity:0; transition:transform 0.4s, opacity 0.4s; z-index:1000; }
#sidebar.open { transform:translateX(0); opacity:1; }

/* Sidebar Header - stacked vertically */
#sidebarHeader {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

/* Match search input to favorites button */
#searchInput,
#favoritesToggle {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

/* Search input specific */
#searchInput {
  border: none;
  background: White;
  color: #111;
}
#searchInput::placeholder { color: #aaa; }

/* Favorites button */
#favoritesToggle {
  background: #444;
  color: white;
  border: none;
  cursor: pointer;
  text-align: left;
}
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
// Player Logic
// ==========================
function initPlayer(){
  const container = document.getElementById("playerContainer");
  const video = document.getElementById("videoPlayer");
  const sidebar = document.getElementById("sidebar");
  const channelList = document.getElementById("channelList");
  const overlay = document.getElementById("overlay");
  const spinner = document.getElementById("loadingSpinner");
  const loadingText = document.getElementById("loadingText");
  const searchInput = document.getElementById("searchInput");
  const favoritesToggle = document.getElementById("favoritesToggle");

  let channels = [], currentIndex = 0;
  let hls = null, shakaPlayer = null;
  let preloaded = {};
  let overlayDismissed = false;
  let lastEnterTime = 0;

  // Favorites + Search
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  let showFavoritesOnly = false;

  // Store last progress per channel
  let lastProgress = {};

  video.controls = false;
  video.preload = "auto";

  async function loadPlaylist(url){
    try {
      const res = await fetch(url);
      const text = await res.text();
      const lines = text.split("\n");
      let name = "";
      lines.forEach(line => {
        if(line.startsWith("#EXTINF")) name = line.split(",").pop().trim();
        else if(line && !line.startsWith("#")) channels.push({name:name||`Channel ${channels.length+1}`, url:line.trim()});
      });
      renderChannels();
    } catch(err) {
      console.error("Playlist load error:", err);
      alert("Unable to load playlist.");
    }
  }

  function renderChannels(){
    channelList.innerHTML = "";
    let list = channels;

    if(showFavoritesOnly){
      list = channels.filter(ch => favorites.includes(ch.name));
    }

    const query = searchInput.value.toLowerCase();
    if(query){
      list = list.filter(ch => ch.name.toLowerCase().includes(query));
    }

    list.forEach((ch)=>{
      const li=document.createElement("li");
      li.textContent=ch.name;

      const favBtn = document.createElement("span");
      favBtn.textContent = "★";
      favBtn.className = "favorite-btn" + (favorites.includes(ch.name) ? " active" : "");
      favBtn.onclick=(e)=>{
        e.stopPropagation();
        toggleFavorite(ch.name);
        renderChannels();
      };

      if(channels[currentIndex] && ch.name === channels[currentIndex].name) li.classList.add("highlight");

      li.onclick=(e)=>{
        e.stopPropagation();
        const index = channels.findIndex(c => c.name === ch.name);
        playChannel(index);
        toggleSidebar(false);
      };

      li.appendChild(favBtn);
      channelList.appendChild(li);
    });
  }

  function toggleFavorite(name){
    if(favorites.includes(name)){
      favorites = favorites.filter(f => f !== name);
    } else {
      favorites.push(name);
    }
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }

  favoritesToggle.addEventListener("click", ()=>{
    showFavoritesOnly = !showFavoritesOnly;
    favoritesToggle.classList.toggle("active", showFavoritesOnly);
    renderChannels();
  });

  searchInput.addEventListener("input", renderChannels);

  function highlightChannel(i){
    [...channelList.children].forEach((li,idx)=>li.classList.toggle("highlight", idx===i));
    if(channelList.children[i]) channelList.children[i].scrollIntoView({block:"center", behavior:"smooth"});
  }

  function showLoading(channelIndex){
    spinner.style.display = "flex";
    let progress = lastProgress[channelIndex] || 0;
    loadingText.textContent = Math.floor(progress) + "%";

    const interval = setInterval(()=>{
      if(progress < 95){ 
        progress += Math.random() * 1.5;
        if(progress > 95) progress = 95;
        loadingText.textContent = Math.floor(progress) + "%";
        lastProgress[channelIndex] = progress;
      }
    }, 100);

    return interval;
  }

  function updateHlsProgress(){
    if(hls && video.buffered.length > 0){
      const bufferedEnd = video.buffered.end(video.buffered.length-1);
      const duration = video.duration || 1;
      const percent = Math.min(95, (bufferedEnd/duration)*95);
      loadingText.textContent = Math.floor(percent) + "%";
      lastProgress[currentIndex] = percent;
    }
  }

  function updateShakaProgress(){
    if(shakaPlayer){
      const duration = video.duration || 1;
      const percent = Math.min(95, (video.currentTime / duration) * 95);
      loadingText.textContent = Math.floor(percent) + "%";
      lastProgress[currentIndex] = percent;
    }
  }

  function playChannel(i, retry=0){
    currentIndex=i;
    const url=channels[i].url;
    video.muted=false;
    highlightChannel(i);

    if(hls){ hls.destroy(); hls=null; }
    if(shakaPlayer){ shakaPlayer.destroy(); shakaPlayer=null; }

    let loadInterval = showLoading(i);
    let loadTimeout;

    function onReady(){
      clearTimeout(loadTimeout);
      clearInterval(loadInterval);
      loadingText.textContent = "100%";
      lastProgress[i] = 100;
      spinner.style.display = "none";

      video.play().catch(err=>{
        console.error("Playback error:",err);
        if(retry<2){ playChannel(i,retry+1); }
      });
    }

    function onError(){
      clearTimeout(loadTimeout);
      clearInterval(loadInterval);
      spinner.style.display="none";
      console.error("Load failed for channel", url);
      if(retry<2){ playChannel(i,retry+1); }
    }

    loadTimeout=setTimeout(()=>{ onError(); },5000);

    if(url.endsWith(".m3u8") && Hls.isSupported()){
      hls=new Hls({ maxBufferLength:10, enableWorker:true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ()=>video.play().then(onReady).catch(onError));
      hls.on(Hls.Events.FRAG_BUFFERED, updateHlsProgress);
      hls.on(Hls.Events.ERROR, ()=>onError());
    } else if(url.endsWith(".mpd")){
      shakaPlayer=new shaka.Player(video);
      shakaPlayer.configure({ streaming:{bufferingGoal:5, rebufferingGoal:5}, abr:{enabled:true} });
      shakaPlayer.load(url).then(()=>{
        const shakaProgressInterval = setInterval(updateShakaProgress, 200);
        video.play().then(()=>{
          clearInterval(shakaProgressInterval);
          onReady();
        }).catch(onError);
      }).catch(onError);
    } else {
      video.src=url;
      video.onprogress=()=>{ if(video.buffered.length>0){ const bufferedEnd = video.buffered.end(video.buffered.length-1); const duration = video.duration || 1; const percent = Math.min(95, (bufferedEnd/duration)*95); loadingText.textContent = Math.floor(percent) + "%"; lastProgress[currentIndex] = percent; }};
      video.oncanplay=onReady;
      video.onerror=onError;
    }

    preloadChannel((i+1)%channels.length);
  }

  function preloadChannel(i){
    if(preloaded[i]) return;
    const url=channels[i].url;
    if(url.endsWith(".m3u8") && Hls.isSupported()){
      const dummyVideo=document.createElement("video");
      const tmpHls=new Hls({ maxBufferLength:5, enableWorker:true });
      tmpHls.loadSource(url);
      tmpHls.attachMedia(dummyVideo);
      preloaded[i]={type:"hls", hls:tmpHls};
    } else if(url.endsWith(".mpd")){
      const dummyVideo=document.createElement("video");
      const tmpShaka=new shaka.Player(dummyVideo);
      tmpShaka.configure({ streaming:{bufferingGoal:5, rebufferingGoal:5}, abr:{enabled:true} });
      tmpShaka.load(url).catch(()=>{});
      preloaded[i]={type:"shaka", shaka:tmpShaka};
    } else {
      preloaded[i]={type:"native"};
    }
  }

  function toggleSidebar(force){
    if(force===true){ sidebar.classList.add("open"); }
    else if(force===false){ sidebar.classList.remove("open"); }
    else{ sidebar.classList.toggle("open"); }
    if(sidebar.classList.contains("open")) highlightChannel(currentIndex);
  }

  function toggleFullscreen(){
    if(!document.fullscreenElement) container.requestFullscreen?.().catch(()=>{}); else document.exitFullscreen?.().catch(()=>{});
  }

  overlay.addEventListener("click", ()=>{
    overlay.style.display="none";
    overlayDismissed = true;
    playChannel(0);
  });

  container.addEventListener("click", (e)=>{
    if(!overlayDismissed) return; 
    if(e.detail === 2){ toggleFullscreen(); return; }
    if(e.target.closest("#sidebar")) return;
    toggleSidebar();
  });

  document.addEventListener("keydown", e => {
    const now = Date.now();
    if(e.key === "Enter" || e.keyCode === 13){
      if(now - lastEnterTime < 300){
        toggleFullscreen();
        lastEnterTime = 0;
        return;
      }
      lastEnterTime = now;

      if(overlay.style.display !== "none"){
        overlay.style.display="none";
        overlayDismissed = true;
        playChannel(0);
      } else if(sidebar.classList.contains("open")){
        playChannel(currentIndex);
        toggleSidebar(false);
      } else {
        toggleSidebar(true);
      }
      e.preventDefault();
    }

    const tvChannelUp = e.keyCode === 33 || e.keyCode === 428;
    const tvChannelDown = e.keyCode === 34 || e.keyCode === 427;

    if(sidebar.classList.contains("open")){
      if(e.key === "ArrowUp" || tvChannelUp) {
        currentIndex = (currentIndex - 1 + channels.length) % channels.length;
        highlightChannel(currentIndex);
        e.preventDefault();
      }
      if(e.key === "ArrowDown" || tvChannelDown) {
        currentIndex = (currentIndex + 1) % channels.length;
        highlightChannel(currentIndex);
        e.preventDefault();
      }
    }
  });

  document.addEventListener("mousemove", ()=>{
    document.body.classList.remove("hide-cursor");
    clearTimeout(window.cursorTimeout);
    window.cursorTimeout=setTimeout(()=>document.body.classList.add("hide-cursor"), 2000);
  });

  video.addEventListener("pause", ()=>{ if(document.fullscreenElement) video.play(); });

  loadPlaylist("https://raw.githubusercontent.com/juztnobadi24/mychannels/main/juztchannels.m3u");
}
