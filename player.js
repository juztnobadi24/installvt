// ==========================
// IPTV Player Core (Fixed Controls + % Counter + Smart Retry)
// ==========================
document.body.innerHTML = `
<div id="playerContainer">
  <video id="videoPlayer" autoplay muted playsinline webkit-playsinline></video>

  <div id="overlay">
    <div id="overlayContent">
      <div id="overlayText" style="font-size:28px; font-weight:bold;">Welcome!!!</div>
      <img id="overlayLogo" src="your-logo.png" alt="Juzt TV Logo">
      <div style="font-size:20px; margin-top:10px;">Click anywhere or press Enter/OK to start</div>
      <div id="overlayHint">Help us keep the service running smoothly. Your generosity can support our efforts.</div>
    </div>
  </div>

  <div id="sidebar">
    <div id="sidebarHeader">
      <input id="searchInput" type="text" placeholder="Search channel...">
      <button id="favoritesToggle">⭐ Favorites</button>
    </div>
    <ul id="channelList"></ul>
    <div id="sidebarFooter">
      <button id="supportBtn">Support Me thru GCash</button>
    </div>
  </div>

  <!-- GCash Modal -->
  <div id="gcashModal" class="modal">
    <div class="modal-content">
      <h2>Support thru GCash</h2>
      <p>Scan or send to: <b>09776192184</b></p>
      <img src="gcash-placeholder.png" alt="GCash QR" style="max-width:80%; border-radius:10px;">
    </div>
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
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center;
  flex-direction: column; color: white; text-align: center; z-index: 2000; cursor: pointer;
  padding: 3vh; box-sizing: border-box;
}
#overlayContent { margin-bottom: 5vh; display: flex; flex-direction: column; align-items: center; max-width: 90%; max-height: 100%; justify-content: center; }
#overlayText { font-size: clamp(12px, 2vh, 24px); margin-bottom: 2vh; line-height: 1.3; }
#overlayLogo {
  position: absolute;       /* overlay it */
  top: 10px;                /* adjust vertical position */
  left: 10px;               /* adjust horizontal position */
  max-width: 80%;           /* responsive scaling */
  max-height: 40vh;         /* responsive scaling */
  width: auto;              /* keep aspect ratio */
  height: auto;             /* keep aspect ratio */
  margin: 0;                /* remove centering */
  object-fit: contain;      /* prevent stretching */
  z-index: 1000;            /* keep it on top */
  pointer-events: none;     /* don't block clicks */
}
#overlayHint { margin-top: 2vh; font-size: clamp(10px, 1.5vh, 18px); opacity: 0.8; }

#sidebar {
  position:absolute; top:0; left:0; width:30%; max-width:320px; height:100%;
  background:rgba(20,20,20,0.95); display:flex; flex-direction:column;
  color:white; box-shadow:2px 0 10px rgba(0,0,0,0.5);
  transform:translateX(-100%); opacity:0; transition:transform 0.4s, opacity 0.4s; z-index:1000;
}
#sidebar.open { transform:translateX(0); opacity:1; }
#sidebarHeader { flex:0 0 auto; display:flex; flex-direction:column; gap:10px; padding:10px; box-sizing:border-box; background:#222; position:sticky; top:0; z-index:10; }
#searchInput, #favoritesToggle { width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
#searchInput { border: none; background: White; color: #111; }
#searchInput::placeholder { color: #aaa; }
#favoritesToggle { background: #444; color: white; border: none; cursor: pointer; text-align: left; }
#favoritesToggle.active { background:#28a745; }

#channelList { flex:1; overflow-y:auto; list-style:none; padding:0; margin:0; }
#channelList li { display:flex; justify-content:space-between; align-items:center; padding:12px 10px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.1); }
#channelList li:hover { background: rgba(255,255,255,0.2); }
#channelList li.highlight { background:#28a745; color:white; font-weight:600; }
.favorite-btn { margin-left:10px; cursor:pointer; }
.favorite-btn.active { color:gold; }

#sidebarFooter {
  flex:0 0 auto; padding:10px; background:#222; position:sticky; bottom:0; z-index:10;
}
#supportBtn { width:100%; padding:12px; border:none; border-radius:8px; font-size:14px; cursor:pointer; background:#007bff; color:white; font-weight:bold; }
#supportBtn:hover { background:#0056b3; }

.modal { display:none; position:fixed; z-index:5000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); justify-content:center; align-items:center; }
.modal-content { background:#fff; padding:20px; border-radius:12px; text-align:center; color:#111; max-width:90%; max-height:90%; overflow:auto; }

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
// (Keep your builtInChannels here - unchanged)
// ==========================
const builtInChannels = [
  { 
  name:"KAPAMILYA CHANNEL", 
  type:"dash", 
  manifestUri:"https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-kapcha-dash-abscbnono/index.mpd", 
  drm:{ 
    type:"org.w3.clearkey", 
    keyIds:{ "bd17afb5dc9648a39be79ee3634dd4b8":"3ecf305d54a7729299b93a3d69c02ea5" } 
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
  name:"CINEMA ONE", 
  type:"dash", 
  manifestUri:"https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-cinemaone-dash-abscbnono/index.mpd", 
  drm:{ 
    type:"org.w3.clearkey", 
    keyIds:{ "58d0e56991194043b8fb82feb4db7276":"d68f41b59649676788889e19fb10d22c" } 
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
    name:"TV5 HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/tv5_hd.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "2615129ef2c846a9bbd43a641c7303ef":"07c7f996b1734ea288641a68e1cfdc4d" } 
    } 
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
    name:"Pinoy Box Office (PBO)", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/pbo_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "dcbdaaa6662d4188bdf97f9f0ca5e830":"31e752b441bd2972f2b98a4b1bc1c7a1" } }
  },
  { 
    name:"Viva Cinema", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/viva_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "07aa813bf2c147748046edd930f7736e":"3bd6688b8b44e96201e753224adfc8fb" } }
  },
  { 
    name:"Tagalog Movie Channel (TMC)", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_tagalogmovie.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "96701d297d1241e492d41c397631d857":"ca2931211c1a261f082a3a2c4fd9f91b" } }
  },
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
    name:"AXN", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_axn_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "fd5d928f5d974ca4983f6e9295dfe410":"3aaa001ddc142fedbb9d5557be43792f" } }
  },
  { 
    name:"Lifetime SD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_lifetime.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "cf861d26e7834166807c324d57df5119":"64a81e30f6e5b7547e3516bbf8c647d0" } }
  },
  { 
    name:"HBO HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_hbohd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "d47ebabf7a21430b83a8c4b82d9ef6b1":"54c213b2b5f885f1e0290ee4131d425b" } }
  },
  { 
    name:"HITS Movies", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_hitsmovies.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "f56b57b32d7e4b2cb21748c0b56761a7":"3df06a89aa01b32655a77d93e09e266f" } }
  },
  { 
    name:"Rock Action", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_rockextreme.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "0f852fb8412b11edb8780242ac120002":"4cbc004d8c444f9f996db42059ce8178" } }
  },
  { 
    name:"Tap Action Flix HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_tapactionflix_hd1.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "bee1066160c0424696d9bf99ca0645e3":"f5b72bf3b89b9848de5616f37de040b7" } }
  },
  { 
    name:"HBO Family HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_hbofam.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "872910c843294319800d85f9a0940607":"f79fd895b79c590708cf5e8b5c6263be" } }
  },
  { 
    name:"Cinemax HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_cinemax.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "b207c44332844523a3a3b0469e5652d7":"fe71aea346db08f8c6fbf0592209f955" } }
  },
  { 
    name:"HBO Signature HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_hbosign.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "a06ca6c275744151895762e0346380f5":"559da1b63eec77b5a942018f14d3f56f" } }
  },
  { 
    name:"HBO Hits HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_hbohits.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "b04ae8017b5b4601a5a0c9060f6d5b7d":"a8795f3bdb8a4778b7e888ee484cc7a1" } }
  },
  { 
    name:"CNN HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_cnnhd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "900c43f0e02742dd854148b7a75abbec":"da315cca7f2902b4de23199718ed7e90" } }
  },
  { 
    name:"One PH", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/oneph_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "92834ab4a7e1499b90886c5d49220e46":"a7108d9a6cfcc1b7939eb111daf09ab3" } }
  },
  { 
    name:"One News", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/onenews_hd1.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "d39eb201ae494a0b98583df4d110e8dd":"6797066880d344422abd3f5eda41f45f" } }
  },
  { 
    name:"Nickelodeon SD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_nickelodeon.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "9ce58f37576b416381b6514a809bfd8b":"f0fbb758cdeeaddfa3eae538856b4d72" } }
  },
  { 
    name:"DepEd TV", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/depedch_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "0f853706412b11edb8780242ac120002":"2157d6529d80a760f60a8b5350dbc4df" } }
  },
  { 
    name:"Animal Planet", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_animal_planet_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "436b69f987924fcbbc06d40a69c2799a":"c63d5b0d7e52335b61aeba4f6537d54d" } }
  },
  { 
    name:"BBC Earth HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_bbcearth_hd1.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "34ce95b60c424e169619816c5181aded":"0e2a2117d705613542618f58bf26fc8e" } }
  },
  { 
    name:"Discovery Channel SD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_discovery.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "d9ac48f5131641a789328257e778ad3a":"b6e67c37239901980c6e37e0607ceee6" } }
  },
  { 
    name:"Asian Food Network", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/asianfoodnetwork_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "1619db30b9ed42019abb760a0a3b5e7f":"5921e47fb290ae263291b851c0b4b6e4" } }
  },
  { 
    name:"Cartoon Network HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_cartoonnetworkhd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "a2d1f552ff9541558b3296b5a932136b":"cdd48fa884dc0c3a3f85aeebca13d444" } }
  },
  { 
    name:"Nick JR", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_nickjr.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "bab5c11178b646749fbae87962bf5113":"0ac679aad3b9d619ac39ad634ec76bc8" } }
  },
  { 
    name:"Kix HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/kix_hd1.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "a8d5712967cd495ca80fdc425bc61d6b":"f248c29525ed4c40cc39baeee9634735" } }
  },
  { 
    name:"Thrill SD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_thrill_sd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "928114ffb2394d14b5585258f70ed183":"a82edc340bc73447bac16cdfed0a4c62" } }
  },
  { 
    name:"SPOTV HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-05-prod.akamaized.net/out/u/cg_spotvhd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "ec7ee27d83764e4b845c48cca31c8eef":"9c0e4191203fccb0fde34ee29999129e" } }
  },
  { 
    name:"SPOTV 2 HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_spotv2hd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "7eea72d6075245a99ee3255603d58853":"6848ef60575579bf4d415db1032153ed" } }
  },
  { 
    name:"TV Maria", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/tvmaria_prd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "fa3998b9a4de40659725ebc5151250d6":"998f1294b122bbf1a96c1ddc0cbb229f" } }
  },
  { 
    name:"Lotus Macau", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/lotusmacau_prd.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "60dc692e64ea443a8fb5ac186c865a9b":"01bdbe22d59b2a4504b53adc2f606cc1" } }
  },
  { 
    name:"Premier Sports HD", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_ps_hd1.mpd", 
    drm:{ type:"org.w3.clearkey", keyIds:{ "b8b595299fdf41c1a3481fddeb0b55e4":"cd2b4ad0eb286239a4a022e6ca5fd007" } }
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
    name:"A2Z", 
    type:"dash", 
    manifestUri:"https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_a2z.mpd", 
    drm:{ 
      type:"org.w3.clearkey", 
      keyIds:{ "f703e4c8ec9041eeb5028ab4248fa094":"c22f2162e176eee6273a5d0b68d19530" } 
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
// Player Logic
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
  const supportBtn=document.getElementById("supportBtn");
  const modal=document.getElementById("gcashModal");

  let channels=[...builtInChannels];
  let currentIndex=0, hls=null, shakaPlayer=null, preloaded={}, overlayDismissed=false, lastEnterTime=0;
  let favorites=JSON.parse(localStorage.getItem("favorites")||"[]"), showFavoritesOnly=false;

  video.controls=false; video.preload="auto";

  // Modal logic (close anywhere)
  supportBtn.onclick=()=>{ modal.style.display="flex"; };
  modal.onclick=()=>{ modal.style.display="none"; };

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

  // Render Channels (no sorting)
  function renderChannels(){
    channelList.innerHTML=""; 
    let list=[...channels];
    if(showFavoritesOnly) list=list.filter(ch=>favorites.includes(ch.name));
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




