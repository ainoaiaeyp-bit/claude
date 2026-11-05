'use strict';
/* ---------- Config ---------- */
const FONTS=['Poppins','Montserrat','Roboto','Raleway','Playfair Display','Merriweather','Oswald','Bebas Neue','Anton','Abril Fatface','Pacifico','Lobster','Dancing Script','Caveat','Permanent Marker','Cinzel','Josefin Sans','Lora','Righteous','Satisfy','Space Grotesk','Arial','Georgia','Courier New'];
const PALETTE=['#1f2430','#ffffff','#6c4cf1','#18c5b4','#ff5c7a','#ffb020','#2f80ed','#27ae60','#ff3d3d','#9b59b6','#f1c40f','#8d6e63'];
const FILLS=['#6c4cf1','#18c5b4','#ff5c7a','#ffb020','#2f80ed','#27ae60'];
const SIZES=[['Post Instagram',1080,1080],['Story / Reel',1080,1920],['Presentación 16:9',1920,1080],['Facebook / OG',1200,630],['Banner 16:9 grande',2560,1440],['Póster A4',1240,1754],['Tarjeta',1050,600]];
const CUSTOM=['uid','_frame','_mask','_anim','_arc','_crop','_round','isBg','locked','lockMovementX','lockMovementY','lockRotation','lockScalingX','lockScalingY','hasControls','selectable','evented','_g','_f','name'];
const GRADS=[['#6c4cf1','#18c5b4'],['#ff5c7a','#ffb020'],['#2f80ed','#56ccf2'],['#11998e','#38ef7d'],['#fc466b','#3f5efb'],['#0f2027','#2c5364'],['#f6d365','#fda085'],['#a18cd1','#fbc2eb']];

fabric.Object.prototype.originX=fabric.Object.prototype.originY='center';
fabric.Object.prototype.set({transparentCorners:false,cornerColor:'#ffffff',cornerStrokeColor:'#6c4cf1',borderColor:'#6c4cf1',cornerStyle:'circle',cornerSize:11,borderScaleFactor:1.6,padding:2,strokeUniform:true});

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rid(){return Math.random().toString(36).slice(2,10)}
function h(t,p,...k){const e=document.createElement(t);for(const[a,v]of Object.entries(p||{})){if(a==='class')e.className=v;else if(a.startsWith('on'))e[a]=v;else if(a==='style')e.style.cssText=v;else if(a==='html')e.innerHTML=v;else e.setAttribute(a,v)}k.flat(Infinity).filter(c=>c!=null&&c!==false).forEach(c=>e.append(c));if(t==='button'&&p&&p.title&&!p['aria-label'])e.setAttribute('aria-label',p.title);return e}
let tt;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2400)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- Iconos (SVG propios) ---------- */
const UI={
 logo:'M4 4h10a6 6 0 010 12H9v4H4z M14 20l6-6',
 undo:'M9 14L4 9l5-5 M4 9h10a6 6 0 010 12h-3',redo:'M15 14l5-5-5-5 M20 9H10a6 6 0 000 12h3',
 minus:'M5 12h14',plus:'M12 5v14M5 12h14',moon:'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
 folder:'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
 download:'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
 shapes:'M3 3h8v8H3z M21 17a4 4 0 11-8 0 4 4 0 018 0z M3 21l4-7 4 7z',
 type:'M5 6V4h14v2M12 4v16M9 20h6',
 image:'M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3 M21 15l-5-5L5 21',
 sparkle:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
 palette:'M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 003-3c0-5-4-11-8-11z M7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
 layout:'M3 3h18v6H3z M3 13h8v8H3z M15 13h6v8h-6z',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6',
 eyeoff:'M3 3l18 18 M10.6 6.1A9.5 9.5 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.3 6.3C3.6 8.1 2 12 2 12s4 7 10 7c1.7 0 3.2-.5 4.5-1.2 M9.9 9.9a3 3 0 004.2 4.2',
 lock:'M5 11h14v10H5z M8 11V7a4 4 0 018 0v4',unlock:'M5 11h14v10H5z M8 11V7a4 4 0 017.5-2',
 trash:'M4 7h16 M10 11v6M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
 copy:'M8 8h12v12H8z M4 16V4h12',
 group:'M3 3h8v8H3z M13 13h8v8h-8z M14 6h4v4 M6 14h4v4',
 ungroup:'M3 3h8v8H3z M13 13h8v8h-8z',
 al_l:'M4 3v18 M8 7h12v4H8z M8 14h7v4H8z',al_c:'M12 3v18 M5 7h14v4H5z M8 14h8v4H8z',al_r:'M20 3v18 M4 7h12v4H4z M9 14h7v4H9z',
 al_t:'M3 4h18 M7 8v12h4V8z M14 8v7h4V8z',al_m:'M3 12h18 M7 5v14h4V5z M14 8v8h4V8z',al_b:'M3 20h18 M7 4v12h4V4z M14 9v7h4V9z',
 front:'M5 4h14 M12 20V9 M7 13l5-5 5 5',fwd:'M12 19V7 M6 12l6-6 6 6',bwd:'M12 5v12 M6 12l6 6 6-6',back:'M5 20h14 M12 4v11 M7 11l5 5 5-5',
 flipH:'M12 3v18 M8 7L3 12l5 5z M16 7l5 5-5 5z',flipV:'M3 12h18 M7 8L12 3l5 5z M7 16l5 5 5-5z',
 rotate:'M21 12a9 9 0 11-3-6.7 M21 4v5h-5',
 ta_l:'M4 6h16 M4 10h10 M4 14h16 M4 18h10',ta_c:'M4 6h16 M7 10h10 M4 14h16 M7 18h10',ta_r:'M4 6h16 M10 10h10 M4 14h16 M10 18h10',ta_j:'M4 6h16M4 10h16M4 14h16M4 18h16',
 grid:'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18',
 pipette:'M20 4a2.8 2.8 0 00-4 0l-3 3-1-1-2 2 8 8 2-2-1-1 3-3a2.8 2.8 0 000-4z M10 10l-6 6v4h4l6-6',
 upload:'M12 15V3m0 0L8 7m4-4l4 4M4 21h16',
 link:'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1 M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1',
 pagecopy:'M7 7h12v14H7z M5 17V3h12',
 sliders:'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0 M14 4v4M8 10v4M16 16v4',
 chart:'M4 20V10M10 20V4M16 20v-8M22 20H2',arc:'M3 17a9 9 0 0 1 18 0',
 ruler:'M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2',users:'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 20v-2a4 4 0 0 0-3-3.9 M16 2.1a4 4 0 0 1 0 7.8',
 cloud:'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4.5 4.5 0 0 1 17 18z',msg:'M4 5h16v11H9l-5 4z',bell:'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z M10 21a2 2 0 0 0 4 0',
 list:'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',pencil:'M4 20l1-5L16 4l4 4L9 19z',
 play:'M7 4l13 8-13 8z',close:'M5 5l14 14M19 5L5 19',chevL:'M15 6l-6 6 6 6',chevR:'M9 6l6 6-6 6',
 distH:'M4 3v18 M20 3v18 M10 7h4v10h-4z',distV:'M3 4h18 M3 20h18 M7 10h10v4H7z',
 brush:'M18 3l3 3-9 9-3-3z M9 12c-3 0-5 2-5 5 0 2-1 3-2 4 4 1 9 0 9-5',
 layerT:'M6 6V4h12v2M12 4v14M9 18h6',layerShape:'M4 4h16v16H4z',layerImg:'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4',layerGrp:'M3 3h8v8H3z M13 13h8v8h-8z'
};
function ic(n,sz){return h('span',{class:'ic',html:`<svg viewBox="0 0 24 24" ${sz?`style="width:${sz}px;height:${sz}px"`:''}><path d="${UI[n]}"/></svg>`})}
const icl=(n,label)=>h('span',{class:'icl'},ic(n),label);
function fillIcons(){document.querySelectorAll('[data-ic]').forEach(b=>{b.prepend(ic(b.dataset.ic))});document.querySelectorAll('button[title]').forEach(b=>{if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',b.title)})}
/* Librería de iconos insertables (cuadrícula 24, color editable) */
const ci=(x,y,r)=>`M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0`;
const LIB={
 'Corazón':'M12 21S4 15.5 4 10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z',
 'Estrella':'M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z',
 'Check':'M4 12l5 5L20 6','Cerrar':'M5 5l14 14M19 5L5 19','Más':'M12 5v14M5 12h14',
 'Flecha':'M4 12h16M14 6l6 6-6 6','Arriba':'M12 20V4M6 10l6-6 6 6',
 'Casa':'M3 11l9-8 9 8 M5 10v10h5v-6h4v6h5V10','Usuario':ci(12,8,4)+'M4 21a8 8 0 0 1 16 0',
 'Correo':'M3 5h18v14H3z M3 6l9 7 9-7','Teléfono':'M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 3-2z',
 'Ubicación':'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z'+ci(12,10,2.5),
 'Calendario':'M3 5h18v16H3z M3 10h18 M8 3v4M16 3v4','Reloj':ci(12,12,9)+'M12 7v5l3 2',
 'Cámara':'M3 8h4l2-3h6l2 3h4v12H3z'+ci(12,13,4),'Música':'M9 18V5l11-2v13'+ci(6,18,3)+ci(17,16,3),
 'Play':'M7 4l13 8-13 8z','Vídeo':'M3 6h12v12H3z M15 10l6-3v10l-6-3',
 'Libro':'M12 6C10 4 7 4 4 4v14c3 0 6 0 8 2 2-2 5-2 8-2V4c-3 0-6 0-8 2z M12 6v14',
 'Lápiz':'M4 20l1-5L16 4l4 4L9 19z M14 6l4 4','Campana':'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z M10 21a2 2 0 0 0 4 0',
 'Buscar':ci(11,11,8)+'M21 21l-4.3-4.3','Carrito':'M3 4h3l3 11h10l2-8H7'+ci(10,20,1)+ci(18,20,1),
 'Regalo':'M3 9h18v4H3z M5 13v8h14v-8 M12 9v12 M12 9C9 9 7 7 7 5.5S10 3 12 9 M12 9c3 0 5-2 5-3.5S14 3 12 9',
 'Etiqueta':'M3 12V4h8l10 10-8 8z'+ci(7.5,8,.6),'Rayo':'M13 2L4 14h7l-1 8 9-12h-7z',
 'Sol':ci(12,12,4)+'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
 'Luna':'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z','Nube':'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4.5 4.5 0 0 1 17 18z',
 'Hoja':'M5 19C5 9 11 4 20 4c0 9-5 15-15 15z M5 19L13 11','Llama':'M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 12 0 4 3 7 7 7z',
 'Mundo':ci(12,12,9)+'M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18','Wifi':'M2 9a15 15 0 0 1 20 0 M5 13a10 10 0 0 1 14 0 M8.5 16.5a5 5 0 0 1 7 0 M12 20h.01',
 'Idea':'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
 'Trofeo':'M7 4h10v6a5 5 0 0 1-10 0z M7 6H3v2a4 4 0 0 0 4 4 M17 6h4v2a4 4 0 0 1-4 4 M12 15v4 M8 21h8',
 'Cohete':'M5 19c0-3 1-4 3-4l-1-3 5-6c3-3 7-3 8-3 0 1 0 5-3 8l-6 5-3-1c0 2-1 3-3 4z'+ci(15,9,1),
 'Escudo':'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4','Enlace':UI.link,
 'Mensaje':'M4 5h16v11H9l-5 4z','Me gusta':'M7 11v9H3v-9z M7 11l4-8c2 0 3 1 3 3v3h6l-1 8a2 2 0 0 1-2 2H7',
 'Café':'M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 10h2a2 2 0 0 1 0 5h-2 M7 3v2M11 3v2M14 3v2',
 'Diamante':'M6 4h12l4 6-10 11L2 10z M2 10h20','Corona':'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
 'Premio':ci(12,9,6)+'M8 14l-2 7 6-3 6 3-2-7','Porcentaje':'M19 5L5 19'+ci(7,7,2)+ci(17,17,2),
 'Dinero':'M12 2v20 M17 6.5C16 5 14 4.5 12 4.5c-3 0-5 1.5-5 3.5s2 3 5 4 5 2 5 4-2 3.5-5 3.5c-2 0-4-.5-5-2',
 'Bandera':'M5 21V4 M5 4h13l-3 4 3 4H5','Diana':ci(12,12,9)+ci(12,12,5)+ci(12,12,1),
 'Sonrisa':ci(12,12,9)+'M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5 M9 9.5h.01M15 9.5h.01'
};
const STAR_ICON='M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z';
function libIcon(d,color){
  const size=Math.min(W,H)*.22,p=new fabric.Path(d,{fill:'',stroke:color||'#1f2430',strokeWidth:size/17,strokeLineCap:'round',strokeLineJoin:'round'});
  p.scaleToWidth(size);return p;
}

const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}};

/* ---------- Estado ---------- */
let W=1080,H=1080,zoom=1,fitMode=true;
let pages=[null],thumbs=[null],cur=0;
let hist=[],hi=-1,lock=false,guides=[];
let cloud={id:null,viewId:null,role:null};
let cropMode=null;
const cv=new fabric.Canvas('c',{backgroundColor:'#ffffff',preserveObjectStacking:true,stopContextMenu:true,fireRightClick:false});

/* ---------- Zoom ---------- */
function applyZoom(){cv.setDimensions({width:Math.round(W*zoom),height:Math.round(H*zoom)});cv.setZoom(zoom);$('zv').textContent=Math.round(zoom*100)+'%';cv.calcOffset();cv.requestRenderAll();requestAnimationFrame(updateRulers)}
function fit(){const s=$('stage');zoom=clamp(Math.min((s.clientWidth-80)/W,(s.clientHeight-80)/H),.05,2);fitMode=true;applyZoom()}
function setZoom(z){fitMode=false;zoom=clamp(z,.05,4);applyZoom()}
addEventListener('resize',()=>{if(fitMode)fit()});
$('zi').onclick=()=>setZoom(zoom*1.2);$('zo').onclick=()=>setZoom(zoom/1.2);$('zf').onclick=fit;
$('stage').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.1:1/1.1))}},{passive:false});

/* ---------- Fuentes ---------- */
function collectFonts(o,s){if(o.fontFamily)s.add(o.fontFamily);(o._objects||[]).forEach(x=>collectFonts(x,s))}
function reinitText(o){if(o.type==='textbox'||o.type==='text'){o.initDimensions();o.dirty=true}(o._objects||[]).forEach(reinitText)}
async function ensureFonts(list){
  const fams=new Set(list||[]);if(!list)cv.getObjects().forEach(o=>collectFonts(o,fams));
  const ps=[...fams].flatMap(f=>[document.fonts.load(`16px "${f}"`),document.fonts.load(`bold 16px "${f}"`)]).map(p=>p.catch(()=>{}));
  await Promise.race([Promise.all(ps),sleep(3500)]);
  try{fabric.util.clearFabricFontCache()}catch(e){}
  cv.getObjects().forEach(reinitText);cv.requestRenderAll();
}

/* ---------- Historial / guardado ---------- */
const imgReg=new Map(),imgIds=new Map();let imgN=0;
function packSrc(json){
  const walk=o=>{
    if(!o||typeof o!=='object')return;
    if(typeof o.src==='string'&&o.src.startsWith('data:')){let id=imgIds.get(o.src);if(!id){id='@i'+(++imgN);imgIds.set(o.src,id);imgReg.set(id,o.src)}o.src=id}
    if(Array.isArray(o.objects))o.objects.forEach(walk);if(o.clipPath)walk(o.clipPath);
  };
  (json.objects||[]).forEach(walk);return json;
}
function unpackSrc(json){
  const walk=o=>{
    if(!o||typeof o!=='object')return;
    if(typeof o.src==='string'&&o.src.startsWith('@i')&&imgReg.has(o.src))o.src=imgReg.get(o.src);
    if(Array.isArray(o.objects))o.objects.forEach(walk);if(o.clipPath)walk(o.clipPath);
  };
  (json.objects||[]).forEach(walk);return json;
}
function snapshot(){return JSON.stringify({c:packSrc(cv.toJSON(CUSTOM)),W,H})}
function resetHist(){hist=[snapshot()];hi=0}
let chT;
function push(){if(lock||cropMode)return;$('saved').textContent='Guardando…';hist=hist.slice(0,hi+1);hist.push(snapshot());if(hist.length>40)hist.shift();hi=hist.length-1;clearTimeout(chT);chT=setTimeout(changed,600);collabSchedule()}
function changed(){thumbs[cur]=thumb();renderPages();autosave()}
let warned=false;
function saveCur(){pages[cur]=cv.toJSON(CUSTOM)}
function projectObj(){saveCur();return{v:2,name:$('name').value,W,H,pages,thumbs,cur,cloudId:cloud.id,guides:userGuides}}
function autosave(){try{scheduleCloud();const ok=store.set('lienzo-v2',JSON.stringify(projectObj()));if(ok)$('saved').textContent='Guardado';if(!ok&&!warned){warned=true;toast('Autoguardado lleno: usa Exportar > Proyecto (.json)')}}catch(e){}}
function thumb(){try{return cv.toDataURL({format:'jpeg',quality:.6,multiplier:200/(W*zoom)})}catch(e){return null}}
function loadAsync(c){return new Promise(r=>{lock=true;cv.loadFromJSON(c,()=>{lock=false;r()})})}
function ensureBg(){if(!cv.getObjects().some(o=>o.isBg)){const was=lock;lock=true;setBg('#ffffff');lock=was}}
async function restore(i){
  if(i<0||i>=hist.length)return;hi=i;const s=JSON.parse(hist[i]);unpackSrc(s.c);
  if(s.W!==W||s.H!==H){W=s.W;H=s.H;syncSize();fit()}
  await loadAsync(s.c);await ensureFonts();refresh();changedSoon();
}
function changedSoon(){clearTimeout(chT);chT=setTimeout(changed,400);collabSchedule()}
$('undo').onclick=()=>restore(hi-1);$('redo').onclick=()=>restore(hi+1);
function batch(fn){const was=lock,rr=cv.renderOnAddRemove;lock=true;cv.renderOnAddRemove=false;try{fn()}finally{lock=was;cv.renderOnAddRemove=rr;cv.requestRenderAll()}if(!was){push();refresh()}}

/* ---------- Eventos del lienzo ---------- */
cv.on('object:added',e=>{if(e.target&&!e.target.uid)e.target.uid=rid();if(lock)return;push();refreshLayers()});
cv.on('object:removed',()=>{if(lock)return;push();refreshLayers()});
cv.on('object:modified',()=>{push();refreshProps();refreshLayers()});
cv.on('text:changed',()=>{push();refreshLayers()});
['selection:created','selection:updated','selection:cleared'].forEach(e=>cv.on(e,()=>{refreshProps();refreshLayers()}));

/* Guías inteligentes */
cv.on('object:moving',e=>{
  const t=e.target;if(!t)return;const r=t.getBoundingRect(true,true);
  const xs=[0,W/2,W],ys=[0,H/2,H],skip=new Set(t._objects||[t]);
  userGuides.forEach(g=>{(g.o==='v'?xs:ys).push(g.pos)});
  cv.getObjects().forEach(o=>{if(skip.has(o)||o.isBg||!o.visible)return;const b=o.getBoundingRect(true,true);xs.push(b.left,b.left+b.width/2,b.left+b.width);ys.push(b.top,b.top+b.height/2,b.top+b.height)});
  const thr=7/zoom;guides=[];
  const best=(mine,lines)=>{let b=null;for(const m of mine)for(const l of lines){const d=l-m;if(Math.abs(d)<=thr&&(!b||Math.abs(d)<Math.abs(b.d)))b={d,l}}return b};
  const bx=best([r.left,r.left+r.width/2,r.left+r.width],xs),by=best([r.top,r.top+r.height/2,r.top+r.height],ys);
  if(bx){t.left+=bx.d;guides.push({x:bx.l})}if(by){t.top+=by.d;guides.push({y:by.l})}
  if(bx||by)t.setCoords();
});
cv.on('mouse:up',()=>{if(guides.length){guides=[];cv.requestRenderAll()}});
cv.on('after:render',()=>{
  if(!guides.length)return;const ctx=cv.contextContainer;ctx.save();ctx.transform(...cv.viewportTransform);
  ctx.strokeStyle='#ff3da5';ctx.lineWidth=1.5/zoom;ctx.setLineDash([6/zoom,4/zoom]);ctx.beginPath();
  guides.forEach(g=>{if(g.x!=null){ctx.moveTo(g.x,0);ctx.lineTo(g.x,H)}if(g.y!=null){ctx.moveTo(0,g.y);ctx.lineTo(W,g.y)}});
  ctx.stroke();ctx.restore();
});

/* ---------- Utilidades de objetos ---------- */
const tg=o=>o.type==='activeSelection'?o.getObjects():[o];
const leaves=o=>o._objects?o._objects.flatMap(leaves):[o];
function toHex(c){try{return '#'+new fabric.Color(c).toHex()}catch(e){return '#000000'}}
function setBg(f){
  cv.getObjects().filter(o=>o.isBg).forEach(o=>cv.remove(o));
  const r=new fabric.Rect({left:W/2,top:H/2,width:W,height:H,fill:'#ffffff',strokeWidth:0,selectable:false,evented:false,isBg:true,hoverCursor:'default'});
  if(typeof f==='string')r.set('fill',f);
  else if(f.g){r._g={c1:f.g[0],c2:f.g[1],a:f.g[2]||135};setGrad(r)}
  else if(f.pattern)r.set('fill',f.pattern);
  cv.add(r);cv.sendToBack(r);cv.requestRenderAll();
}
function setGrad(t){
  const g=t._g,w=t.width,hh=t.height,a=g.a*Math.PI/180,dx=Math.cos(a)*w/2,dy=Math.sin(a)*hh/2;
  t.set('fill',new fabric.Gradient({type:'linear',gradientUnits:'pixels',coords:{x1:w/2-dx,y1:hh/2-dy,x2:w/2+dx,y2:hh/2+dy},colorStops:[{offset:0,color:g.c1},{offset:1,color:g.c2}]}));
  t.dirty=true;
}
function keepBgBottom(){cv.getObjects().filter(o=>o.isBg).forEach(b=>cv.sendToBack(b))}
let cascade=0;
function addObj(o,name){document.body.classList.remove('sp');cascade=(cascade+1)%6;o.set({left:W/2+cascade*24,top:H/2+cascade*24});if(name)o.name=name;cv.add(o);cv.setActiveObject(o);cv.requestRenderAll();return o}
function setLock(o,v){tg(o).forEach(x=>x.set({locked:v,lockMovementX:v,lockMovementY:v,lockRotation:v,lockScalingX:v,lockScalingY:v,hasControls:!v}))}
function del(){const a=cv.getActiveObjects();if(!a.length)return;cv.discardActiveObject();batch(()=>a.forEach(x=>cv.remove(x)))}
let clip=null;
function copy(){const a=cv.getActiveObject();if(a)a.clone(c=>{clip=c},CUSTOM)}
function pasteClip(){
  if(!clip)return;
  clip.clone(c=>{
    cv.discardActiveObject();c.set({left:clip.left+30,top:clip.top+30,evented:true});clip.left+=30;clip.top+=30;
    batch(()=>{if(c.type==='activeSelection'){c.canvas=cv;c.forEachObject(o=>cv.add(o));c.setCoords()}else cv.add(c)});
    cv.setActiveObject(c);cv.requestRenderAll();
  },CUSTOM);
}
function dup(){copy();setTimeout(pasteClip,0)}
function group(){const a=cv.getActiveObject();if(a&&a.type==='activeSelection'){a.toGroup();cv.requestRenderAll();push();refresh()}}
function ungroup(){const a=cv.getActiveObject();if(a&&a.type==='group'){a.toActiveSelection();cv.requestRenderAll();push();refresh()}}
function order(o,how){({front:()=>cv.bringToFront(o),fwd:()=>cv.bringForward(o),bwd:()=>cv.sendBackwards(o),back:()=>cv.sendToBack(o)})[how]();keepBgBottom();commit()}
function alignTo(o,m){
  const r=o.getBoundingRect(true,true);let dx=0,dy=0;
  if(m==='l')dx=-r.left;if(m==='c')dx=W/2-(r.left+r.width/2);if(m==='r')dx=W-(r.left+r.width);
  if(m==='t')dy=-r.top;if(m==='m')dy=H/2-(r.top+r.height/2);if(m==='b')dy=H-(r.top+r.height);
  o.set({left:o.left+dx,top:o.top+dy});o.setCoords();commit();
}
const commit=()=>{cv.requestRenderAll();push();refreshLayers()};

/* ---------- Imágenes ---------- */
function readImage(file){return new Promise((res,rej)=>{
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{if(!im.width){rej();return}const k=Math.min(1,2400/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL(/png|webp|gif/.test(file.type)?'image/png':'image/jpeg',.92))};
  im.onerror=()=>rej();im.src=url})}
function cover(img,w,hh){const k=Math.max(w/img.width,hh/img.height);img.set({scaleX:k,scaleY:k,left:w/2,top:hh/2})}
function addFrameObj(kind){
  const S=S_(),c={fill:'#e8ebf3',stroke:'#aab3c7',strokeWidth:2,strokeDashArray:[10,8],_frame:true};
  return kind==='circle'?new fabric.Ellipse(Object.assign({rx:S*.2,ry:S*.2},c)):new fabric.Rect(Object.assign({width:S*.5,height:S*.38,rx:24,ry:24},c));
}
function frameAt(pt){return cv.getObjects().slice().reverse().find(o=>o._frame&&o.visible&&o.containsPoint(pt,null,true))||null}
function addFrame(kind,x,y,w,hh){
  const c={fill:'#e8ebf3',stroke:'#aab3c7',strokeWidth:2,strokeDashArray:[10,8],name:'Marco de imagen',_frame:true};
  const o=kind==='circle'?new fabric.Ellipse(Object.assign({rx:w*W/2,ry:hh*H/2,left:x*W,top:y*H},c)):new fabric.Rect(Object.assign({width:w*W,height:hh*H,left:x*W,top:y*H,rx:kind==='round'?28:0,ry:kind==='round'?28:0},c));
  cv.add(o);return o;
}
function fillFrame(fr,img){
  const r=fr.getBoundingRect(true,true),cx=r.left+r.width/2,cy=r.top+r.height/2,k=Math.max(r.width/img.width,r.height/img.height);
  img.set({scaleX:k,scaleY:k,left:cx,top:cy,name:'Imagen'});
  img.clipPath=fr.type==='ellipse'?new fabric.Ellipse({rx:r.width/2,ry:r.height/2,left:cx,top:cy,absolutePositioned:true})
    :new fabric.Rect({width:r.width,height:r.height,left:cx,top:cy,rx:fr.rx||0,ry:fr.ry||0,absolutePositioned:true});
  const i=cv.getObjects().indexOf(fr);cv.discardActiveObject();
  batch(()=>{cv.remove(fr);cv.insertAt(img,i)});cv.setActiveObject(img);cv.requestRenderAll();
}
const gridCells=(cols,rows)=>{const m=.04,g=.02,w=(1-2*m-(cols-1)*g)/cols,hh=(1-2*m-(rows-1)*g)/rows,out=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)out.push([m+w/2+c*(w+g),m+hh/2+r*(hh+g),w,hh]);return out};
const COLLAGES=[['2×1',gridCells(2,1)],['1×2',gridCells(1,2)],['2×2',gridCells(2,2)],['3×1',gridCells(3,1)],['1+2',[[.32,.5,.56,.92],[.8,.265,.36,.45],[.8,.735,.36,.45]]]];
function addCollage(cells){cv.discardActiveObject();batch(()=>{cells.forEach(c=>addFrame('rect',c[0],c[1],c[2],c[3]))})}
async function addImageFile(file,asBg,frame){
  try{
    const url=await readImage(file);
    fabric.Image.fromURL(url,img=>{
      if(asBg){batch(()=>{cv.getObjects().filter(o=>o.isBg).forEach(o=>cv.remove(o));cover(img,W,H);img.set({isBg:true,selectable:false,evented:false,hoverCursor:'default'});cv.add(img);cv.sendToBack(img)})}
      else if(frame&&cv.getObjects().includes(frame))fillFrame(frame,img);
      else{const k=Math.min(W*.6/img.width,H*.6/img.height,1);img.scale(k);addObj(img,'Imagen')}
    });
  }catch(e){toast('No se pudo leer la imagen')}
}
$('file').onchange=e=>{const a=cv.getActiveObject(),fr=a&&a._frame?a:null;handleFiles(e.target.files,{frame:fr});e.target.value=''};
$('filePdf').onchange=e=>{handleFiles(e.target.files);e.target.value=''};
$('fileBg').onchange=e=>{if(e.target.files[0])addImageFile(e.target.files[0],true);e.target.value=''};
const stage=$('stage');
stage.addEventListener('dragover',e=>{e.preventDefault();stage.classList.add('drag')});
stage.addEventListener('dragleave',()=>stage.classList.remove('drag'));
stage.addEventListener('drop',e=>{e.preventDefault();stage.classList.remove('drag');const pt=cv.getPointer(e),fr=frameAt(pt);handleFiles(e.dataTransfer.files,{frame:fr})});
document.addEventListener('paste',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;
  const imgs=[...(e.clipboardData&&e.clipboardData.files||[])].filter(f=>f.type.startsWith('image/'));
  if(imgs.length){e.preventDefault();imgs.forEach(f=>addImageFile(f))}else pasteClip();
});

/* ---------- Texto ---------- */
async function addText(t,o={}){
  const S=Math.min(W,H),fam=o.fontFamily||'Poppins';await ensureFonts([fam]);
  const tb=new fabric.Textbox(t,Object.assign({width:W*.7,fontSize:.07*S,fontFamily:'Poppins',fontWeight:700,fill:'#1f2430',textAlign:'center'},o));
  return addObj(tb,'Texto');
}
const S_=()=>Math.min(W,H);
const TEXT_STYLES=[
  ['Neón',{fontFamily:'Pacifico',fontWeight:400,fill:'#ffffff',shadow:new fabric.Shadow({color:'#ff2bd6',blur:24,offsetX:0,offsetY:0})},'#ff2bd6'],
  ['Contorno',{fontFamily:'Anton',fontWeight:400,fill:'rgba(0,0,0,0)',stroke:'#1f2430',strokeWidth:3,paintFirst:'stroke'},'#1f2430'],
  ['Sombra',{fontFamily:'Abril Fatface',fontWeight:400,fill:'#ff5c7a',shadow:new fabric.Shadow({color:'#1f2430',blur:0,offsetX:6,offsetY:6})},'#ff5c7a'],
  ['Etiqueta',{fontFamily:'Montserrat',fontWeight:700,fill:'#ffffff',textBackgroundColor:'#6c4cf1'},'#6c4cf1'],
  ['Degradado',{fontFamily:'Poppins',fontWeight:800,fill:'#6c4cf1',_g:{c1:'#6c4cf1',c2:'#18c5b4',a:0}},'#6c4cf1'],
  ['Retro',{fontFamily:'Lobster',fontWeight:400,fill:'#ffb020',stroke:'#1f2430',strokeWidth:2,paintFirst:'stroke',shadow:new fabric.Shadow({color:'#ff5c7a',blur:0,offsetX:5,offsetY:5})},'#ffb020']
];
const PAIRS=[['Playfair Display','Raleway','Elegancia'],['Bebas Neue','Roboto','Impacto'],['Pacifico','Montserrat','Divertido'],['Anton','Merriweather','Noticias'],['Abril Fatface','Poppins','Moda'],['Permanent Marker','Caveat','Manual']];

/* ---------- Texto en arco ---------- */
function arcGroup(src){
  const chars=[...src.text],ws=chars.map(c=>{const t=new fabric.Text(c,{fontFamily:src.fontFamily,fontSize:src.fontSize,fontWeight:src.fontWeight});return t.width||src.fontSize*.3});
  const L=ws.reduce((a,b)=>a+b,0),th=Math.abs(src.curve)/100*Math.PI*1.7,items=[];let acc=0;
  chars.forEach((c,i)=>{
    const sMid=acc+ws[i]/2;acc+=ws[i];let x,y,ang=0;
    if(th<.02){x=sMid-L/2;y=0}
    else{const R=L/th,phi=sMid/R-th/2;
      if(src.curve>0){x=R*Math.sin(phi);y=-R*Math.cos(phi)+R;ang=phi*180/Math.PI}
      else{x=R*Math.sin(phi);y=R*Math.cos(phi)-R;ang=-phi*180/Math.PI}}
    items.push(new fabric.Text(c,{fontFamily:src.fontFamily,fontSize:src.fontSize,fontWeight:src.fontWeight,fill:src.fill,left:x,top:y,angle:ang}));
  });
  const g=new fabric.Group(items);g._arc=Object.assign({},src);g.name='Texto en arco';return g;
}
async function addArc(){
  await ensureFonts(['Poppins']);
  addObj(arcGroup({text:'TEXTO EN ARCO',fontFamily:'Poppins',fontSize:Math.round(S_()*.07),fontWeight:700,fill:'#1f2430',curve:60}),'Texto en arco');
}
async function regenArc(o){
  await ensureFonts([o._arc.fontFamily]);const n=arcGroup(o._arc);
  n.set({left:o.left,top:o.top,angle:o.angle,scaleX:o.scaleX,scaleY:o.scaleY,opacity:o.opacity,shadow:o.shadow});
  cv.discardActiveObject();batch(()=>{const i=cv.getObjects().indexOf(o);cv.remove(o);cv.insertAt(n,i)});cv.setActiveObject(n);cv.requestRenderAll();
}
function arcSection(o){
  const a=o._arc,fs=h('select',{class:'sel'},FONTS.map(f=>h('option',{value:f},f)));fs.value=a.fontFamily;fs.onchange=()=>{a.fontFamily=fs.value;regenArc(o)};
  const ti=h('input',{class:'sel',type:'text',value:a.text,style:'padding:0 8px'});ti.onchange=()=>{a.text=ti.value||' ';regenArc(o)};
  return sec('Texto en arco',h('div',{class:'fld'},h('label',{},'Texto'),ti),h('div',{class:'fld'},fs),
    rng('Curvatura',-100,100,1,a.curve,v=>{a.curve=v},()=>regenArc(o)),
    rng('Tamaño',12,300,1,a.fontSize,v=>{a.fontSize=v},()=>regenArc(o)),
    col('Color',a.fill,v=>{a.fill=v;o.getObjects().forEach(c=>c.set('fill',v))},true));
}

/* ---------- Gráficos ---------- */
function parseData(t){return t.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^(.*?)[:;=]\s*(-?[\d.,]+)\s*$/);return m?{n:m[1].trim(),v:parseFloat(m[2].replace(',','.'))}:null}).filter(x=>x&&isFinite(x.v)&&x.v>0).slice(0,12)}
async function addChart(kind,data){
  if(!data.length){toast('Escribe datos con el formato Nombre: valor');return}
  await ensureFonts(['Poppins']);const S=S_(),br=getBrand().slice(0,4),col=i=>br[i%4],objs=[];
  const tx=(t,o)=>new fabric.Text(t,Object.assign({fontFamily:'Poppins',fill:'#1f2430'},o));
  if(kind==='bar'){
    const Wc=S*.7,Hc=S*.4,n=data.length,max=Math.max(...data.map(d=>d.v)),step=Wc/n,bw=step*.62;
    data.forEach((d,i)=>{const bh=Math.max(4,Hc*d.v/max),cx=-Wc/2+step*(i+.5);
      objs.push(new fabric.Rect({width:bw,height:bh,rx:bw*.12,ry:bw*.12,fill:col(i),left:cx,top:Hc/2-bh/2}));
      objs.push(tx(String(d.v),{fontWeight:700,fontSize:S*.028,left:cx,top:Hc/2-bh-S*.03}));
      objs.push(tx(d.n,{fontSize:S*.026,fill:'#6b7280',left:cx,top:Hc/2+S*.03}));});
    objs.push(new fabric.Rect({width:Wc,height:3,fill:'#cfd5e3',left:0,top:Hc/2}));
  }else{
    const R=S*.2,r=R*.58,tot=data.reduce((a,d)=>a+d.v,0);let a=-Math.PI/2;
    const P=(rad,ang)=>`${(rad*Math.cos(ang)).toFixed(2)} ${(rad*Math.sin(ang)).toFixed(2)}`;
    data.forEach((d,i)=>{const da=Math.min(2*Math.PI*d.v/tot,2*Math.PI-.001),a1=a+da,lg=da>Math.PI?1:0;
      objs.push(new fabric.Path(`M ${P(R,a)} A ${R} ${R} 0 ${lg} 1 ${P(R,a1)} L ${P(r,a1)} A ${r} ${r} 0 ${lg} 0 ${P(r,a)} Z`,{fill:col(i),stroke:'#ffffff',strokeWidth:3}));
      const ly=-R+S*.055*i;objs.push(new fabric.Rect({width:S*.028,height:S*.028,rx:4,ry:4,fill:col(i),left:R+S*.07,top:ly}));
      objs.push(tx(`${d.n} · ${Math.round(d.v/tot*100)}%`,{fontSize:S*.028,originX:'left',left:R+S*.095,top:ly}));
      a=a1});
  }
  addObj(new fabric.Group(objs),'Gráfico');
}

/* ---------- Formas ---------- */
const reg=(n,r)=>Array.from({length:n},(_,i)=>{const a=Math.PI*2/n*i-Math.PI/2;return{x:r*Math.cos(a),y:r*Math.sin(a)}});
const starPts=()=>Array.from({length:10},(_,i)=>{const r=i%2?55:140,a=Math.PI/5*i-Math.PI/2;return{x:r*Math.cos(a),y:r*Math.sin(a)}});
let fillIdx=0;const nextFill=()=>FILLS[fillIdx++%FILLS.length];
const sz=()=>S_()*.3;
const pathShape=d=>{const p=new fabric.Path(d,{fill:nextFill()});p.scaleToWidth(sz());return p};
const SHAPES=[
  ['Rectángulo','M3 6h18v12H3z',0,()=>new fabric.Rect({width:sz()*1.3,height:sz()*.9,fill:nextFill()})],
  ['Redondeado','M7 6h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z',0,()=>new fabric.Rect({width:sz()*1.3,height:sz()*.9,rx:sz()*.18,ry:sz()*.18,fill:nextFill()})],
  ['Círculo','M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',0,()=>new fabric.Circle({radius:sz()/2,fill:nextFill()})],
  ['Elipse','M12 6c5 0 9 2.7 9 6s-4 6-9 6-9-2.7-9-6 4-6 9-6z',0,()=>new fabric.Ellipse({rx:sz()*.7,ry:sz()*.45,fill:nextFill()})],
  ['Triángulo','M12 4l9 16H3z',0,()=>new fabric.Triangle({width:sz(),height:sz()*.9,fill:nextFill()})],
  ['Rombo','M12 2l10 10-10 10L2 12z',0,()=>new fabric.Polygon(reg(4,sz()*.65),{fill:nextFill()})],
  ['Pentágono','M12 3l9 7-3.5 11h-11L3 10z',0,()=>new fabric.Polygon(reg(5,sz()*.55),{fill:nextFill()})],
  ['Hexágono','M7 3h10l5 9-5 9H7l-5-9z',0,()=>new fabric.Polygon(reg(6,sz()*.55),{fill:nextFill()})],
  ['Estrella','M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z',0,()=>{const p=new fabric.Polygon(starPts(),{fill:nextFill()});p.scaleToWidth(sz());return p}],
  ['Corazón','M12 21S4 15.5 4 10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z',0,()=>pathShape('M 0 90 C -120 0 -110 -80 -55 -80 C -25 -80 0 -55 0 -35 C 0 -55 25 -80 55 -80 C 110 -80 120 0 0 90 Z')],
  ['Flecha','M3 10h11V5l8 7-8 7v-5H3z',0,()=>{const p=new fabric.Polygon([{x:-150,y:-22},{x:60,y:-22},{x:60,y:-65},{x:150,y:0},{x:60,y:65},{x:60,y:22},{x:-150,y:22}],{fill:nextFill()});p.scaleToWidth(sz()*1.2);return p}],
  ['Globo','M4 4h16v12H10l-5 4v-4H4z',0,()=>pathShape('M -120 -70 H 120 Q 140 -70 140 -50 V 30 Q 140 50 120 50 H -20 L -70 100 L -60 50 H -120 Q -140 50 -140 30 V -50 Q -140 -70 -120 -70 Z')],
  ['Cruz','M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',0,()=>{const p=new fabric.Polygon([{x:-25,y:-90},{x:25,y:-90},{x:25,y:-25},{x:90,y:-25},{x:90,y:25},{x:25,y:25},{x:25,y:90},{x:-25,y:90},{x:-25,y:25},{x:-90,y:25},{x:-90,y:-25},{x:-25,y:-25}],{fill:nextFill()});p.scaleToWidth(sz()*.8);return p}],
  ['Flecha línea','M3 12h14M12 6l6 6-6 6',1,()=>{const L=S_()*.45,a=new fabric.Rect({width:L,height:8,fill:'#1f2430',left:0,top:0}),b=new fabric.Triangle({width:34,height:34,fill:'#1f2430',angle:90,left:L/2+8,top:0});return new fabric.Group([a,b])}],
  ['Línea','M3 11h18v2H3z',0,()=>new fabric.Rect({width:S_()*.5,height:8,rx:4,ry:4,fill:'#1f2430'})],
  ['Punteada','M4 12h.01M12 12h.01M20 12h.01',1,()=>new fabric.Line([0,0,S_()*.5,0],{stroke:'#1f2430',strokeWidth:8,strokeDashArray:[1,14],strokeLineCap:'round',padding:10})],
  ['Marco','M4 5h16v14H4z',1,()=>new fabric.Rect({width:sz()*1.3,height:sz()*.9,fill:'rgba(0,0,0,0)',stroke:'#1f2430',strokeWidth:8})]
];

/* ---------- Plantillas ---------- */
function T(t,x,y,sz_,p={}){const tb=new fabric.Textbox(t,Object.assign({left:x*W,top:y*H,width:W*.8,fontSize:sz_*S_(),fontFamily:'Poppins',fontWeight:700,fill:'#1f2430',textAlign:'center',name:'Texto'},p));cv.add(tb);return tb}
function IC(name,x,y,size,color){const pth=libIcon(LIB[name],color),sz=S_()*size;pth.scaleToWidth(sz);pth.set({strokeWidth:sz/17,left:x*W,top:y*H,name});cv.add(pth);return pth}
function R(x,y,w,hh,fill,p={}){const r=new fabric.Rect(Object.assign({left:x*W,top:y*H,width:w*W,height:hh*H,fill,name:'Forma'},p));cv.add(r);return r}
function C(x,y,r,fill,p={}){const c=new fabric.Circle(Object.assign({left:x*W,top:y*H,radius:r*S_(),fill,name:'Círculo'},p));cv.add(c);return c}
const softShadow=()=>new fabric.Shadow({color:'rgba(0,0,0,.14)',blur:40,offsetX:0,offsetY:16});
const TEMPLATES=[
  {n:'Oferta',bg:'linear-gradient(135deg,#6c4cf1,#18c5b4)',f:['Poppins'],build(){
    setBg({g:['#6c4cf1','#18c5b4',135]});C(.88,.1,.28,'rgba(255,255,255,.16)');C(.08,.94,.2,'rgba(255,255,255,.12)');
    T('GRAN',.5,.3,.08,{fill:'#fff',fontWeight:600,charSpacing:400});
    T('OFERTA',.5,.43,.17,{fill:'#fff',fontWeight:800,shadow:new fabric.Shadow({color:'rgba(0,0,0,.25)',blur:20,offsetY:8})});
    T('Hasta un 50% de descuento en toda la tienda',.5,.6,.05,{fill:'#fff',fontWeight:400,width:W*.7});
    R(.5,.78,.44,.1,'#fff',{rx:60,ry:60,shadow:softShadow()});T('Comprar ahora',.5,.78,.04,{fill:'#6c4cf1',width:W*.4})}},
  {n:'Cita',bg:'linear-gradient(135deg,#fff3d6,#ffd9a0)',f:['Playfair Display','Montserrat'],build(){
    setBg('#fff3d6');R(.5,.5,.84,.74,'#ffffff',{rx:28,ry:28,shadow:softShadow()});
    T('“',.5,.26,.28,{fontFamily:'Playfair Display',fill:'#ff5c7a',width:W*.3});
    T('La creatividad es la inteligencia divirtiéndose.',.5,.47,.062,{fontFamily:'Playfair Display',width:W*.66});
    R(.5,.66,.12,.008,'#ff5c7a');T('TU NOMBRE',.5,.73,.032,{fontFamily:'Montserrat',fontWeight:600,charSpacing:250,fill:'#6b7280',width:W*.6})}},
  {n:'Evento',bg:'linear-gradient(135deg,#0f1536,#ff3da5)',f:['Bebas Neue','Montserrat'],build(){
    setBg('#0f1536');C(.82,.18,.4,'rgba(255,61,165,.25)');C(.12,.88,.3,'rgba(24,197,180,.25)');
    T('FESTIVAL',.5,.34,.19,{fontFamily:'Bebas Neue',fill:'#fff',fontWeight:400,charSpacing:80});
    T('DE MÚSICA 2027',.5,.5,.075,{fontFamily:'Bebas Neue',fill:'#ff3da5',fontWeight:400,charSpacing:200});
    R(.5,.6,.5,.004,'#ffffff');T('SÁBADO 12 DE JULIO · 20:00 H',.5,.67,.036,{fontFamily:'Montserrat',fill:'#fff',fontWeight:600});
    T('Parque Central · Entradas en tuweb.com',.5,.74,.03,{fontFamily:'Montserrat',fill:'#aab3c7',fontWeight:400})}},
  {n:'Presentación',bg:'linear-gradient(90deg,#6c4cf1 35%,#fff 35%)',f:['Poppins'],build(){
    setBg('#ffffff');R(.18,.5,.36,1,'#6c4cf1');C(.18,.5,.12,'rgba(255,255,255,.2)');
    T('Título de la presentación',.68,.42,.075,{textAlign:'left',width:W*.52,fontWeight:800});
    R(.59,.62,.1,.008,'#18c5b4');T('Subtítulo o nombre del ponente',.68,.7,.035,{textAlign:'left',fontWeight:400,fill:'#6b7280',width:W*.52})}},
  {n:'Producto',bg:'linear-gradient(135deg,#eef1f6,#ffffff)',f:['Playfair Display','Poppins'],build(){
    setBg('#eef1f6');C(.5,.46,.3,'#ffffff',{shadow:softShadow()});C(.5,.46,.2,'#ffb020');
    T('NUEVO',.5,.16,.04,{charSpacing:500,fill:'#6c4cf1'});T('Nombre del producto',.5,.78,.07,{fontFamily:'Playfair Display'});T('19,90 €',.5,.88,.05,{fill:'#ff5c7a'})}},
  {n:'Anuncio',bg:'linear-gradient(135deg,#ffe14d,#ffb020)',f:['Anton','Montserrat'],build(){
    setBg('#ffe14d');R(.5,.5,.86,.86,'rgba(0,0,0,0)',{stroke:'#111111',strokeWidth:10});
    T('¡NO TE LO',.5,.3,.12,{fontFamily:'Anton',fontWeight:400});T('PIERDAS!',.5,.46,.2,{fontFamily:'Anton',fontWeight:400,fill:'#ff3d3d'});
    T('Solo este fin de semana',.5,.66,.05,{fontFamily:'Montserrat'});R(.5,.8,.4,.1,'#111111',{rx:12,ry:12});T('SABER MÁS',.5,.8,.04,{fill:'#ffe14d',fontFamily:'Montserrat',width:W*.38})}}
  ,
  {n:'Invitación',bg:'linear-gradient(135deg,#fdf6ec,#ecd9b8)',f:['Dancing Script','Montserrat','Playfair Display'],build(){
    setBg('#fdf6ec');R(.5,.5,.88,.88,'rgba(0,0,0,0)',{stroke:'#c9a66b',strokeWidth:6});
    T('TE INVITAMOS A LA BODA DE',.5,.24,.032,{fontFamily:'Montserrat',fontWeight:600,charSpacing:400,fill:'#9a7b4f',width:W*.7});
    T('Ana & Luis',.5,.45,.15,{fontFamily:'Dancing Script',fill:'#6b4e2e'});R(.5,.62,.16,.004,'#c9a66b');
    T('24 de septiembre · 18:00 h',.5,.7,.04,{fontFamily:'Playfair Display',fontWeight:400});T('Finca Los Olivos',.5,.78,.03,{fontFamily:'Montserrat',fontWeight:400,fill:'#6b7280'})}},
  {n:'Rebajas',bg:'linear-gradient(135deg,#ff3d3d,#ff7a45)',f:['Anton','Montserrat'],build(){
    setBg('#ff3d3d');C(.5,.5,.42,'rgba(255,255,255,.12)');C(.5,.5,.3,'rgba(255,255,255,.12)');
    T('REBAJAS',.5,.26,.12,{fontFamily:'Anton',fontWeight:400,fill:'#fff',charSpacing:200});T('-70%',.5,.5,.34,{fontFamily:'Anton',fontWeight:400,fill:'#fff'});
    R(.5,.78,.5,.09,'#fff',{rx:50,ry:50});T('SOLO ONLINE',.5,.78,.036,{fontFamily:'Montserrat',fill:'#ff3d3d',width:W*.46})}},
  {n:'Tecnología',bg:'linear-gradient(135deg,#0b1020,#27306b)',f:['Poppins'],build(){
    setBg({g:['#0b1020','#27306b',135]});C(.85,.15,.3,'rgba(24,197,180,.2)');C(.1,.9,.28,'rgba(108,76,241,.3)');
    T('El futuro',.5,.36,.11,{fill:'#fff',fontWeight:800});const g=T('empieza hoy',.5,.5,.11,{fontWeight:800});g._g={c1:'#18c5b4',c2:'#6c4cf1',a:0};setGrad(g);
    T('Descubre la nueva forma de crear y compartir.',.5,.64,.036,{fill:'#aab3c7',fontWeight:400,width:W*.7});
    R(.5,.78,.4,.09,'#18c5b4',{rx:50,ry:50});T('Empezar',.5,.78,.036,{fill:'#0b1020',width:W*.38})}},
  {n:'Menú',bg:'linear-gradient(135deg,#1f2430,#3a4152)',f:['Bebas Neue','Playfair Display','Montserrat'],build(){
    setBg('#1f2430');T('MENÚ DEL DÍA',.5,.17,.085,{fontFamily:'Bebas Neue',fontWeight:400,fill:'#ffb020',charSpacing:120,width:W*.92});R(.5,.26,.2,.004,'#ffb020');
    [['Ensalada de temporada','5,50 €'],['Pasta al pesto','9,00 €'],['Pescado del día','12,50 €'],['Tarta casera','4,50 €']].forEach((it,i)=>{
      T(it[0],.3,.38+i*.13,.04,{fontFamily:'Playfair Display',fontWeight:400,fill:'#fff',textAlign:'left',width:W*.5});
      T(it[1],.78,.38+i*.13,.04,{fontFamily:'Montserrat',fill:'#ffb020',textAlign:'right',width:W*.25})})}},
  {n:'Perfil',bg:'linear-gradient(180deg,#6c4cf1 40%,#ffffff 40%)',f:['Poppins'],build(){
    setBg('#ffffff');R(.5,.2,1,.4,'#6c4cf1');C(.5,.4,.14,'#ffffff');C(.5,.4,.115,'#18c5b4');
    T('Nombre Apellido',.5,.62,.07,{fontWeight:800});T('Diseñadora creativa',.5,.7,.038,{fontWeight:400,fill:'#6c4cf1'});
    T('Cuéntale al mundo quién eres en una frase.',.5,.8,.032,{fontWeight:400,fill:'#6b7280',width:W*.6})}},
  {n:'Beneficios',bg:'linear-gradient(135deg,#e8f0ff,#ffffff)',f:['Poppins'],build(){
    setBg('#e8f0ff');T('Por qué elegirnos',.5,.14,.07,{fontWeight:800});
    [['Rápido','Resultados en minutos','#6c4cf1'],['Seguro','Tus datos siempre protegidos','#18c5b4'],['Fácil','Sin conocimientos técnicos','#ff5c7a']].forEach((it,i)=>{
      const y=.34+i*.22;R(.5,y,.8,.17,'#fff',{rx:24,ry:24,shadow:softShadow()});C(.2,y,.05,it[2]);
      T(it[0],.56,y-.03,.045,{textAlign:'left',width:W*.52});T(it[1],.56,y+.04,.03,{textAlign:'left',fontWeight:400,fill:'#6b7280',width:W*.52})})}}
  ,
  {n:'Miniatura YouTube',size:[1280,720],bg:'linear-gradient(135deg,#111,#2b1055)',f:['Anton','Montserrat'],build(){
    setBg({g:['#111111','#2b1055',135]});C(.84,.5,.3,'#ff3d3d');IC('Play',.84,.5,.2,'#ffffff');
    T('NO LO VAS',.36,.3,.2,{fontFamily:'Anton',fontWeight:400,fill:'#ffffff',textAlign:'left',width:W*.6});
    T('A CREER',.36,.52,.24,{fontFamily:'Anton',fontWeight:400,fill:'#ffe14d',textAlign:'left',width:W*.6});
    R(.27,.8,.34,.11,'#ffffff',{rx:10,ry:10});T('MIRA EL VÍDEO',.27,.8,.05,{fontFamily:'Montserrat',fill:'#111111',width:W*.32})}},
  {n:'Banner LinkedIn',size:[1584,396],bg:'linear-gradient(135deg,#0f2027,#2c5364)',f:['Poppins'],build(){
    setBg({g:['#0f2027','#2c5364',135]});C(.92,.3,.55,'rgba(24,197,180,.25)');C(.78,1,.4,'rgba(108,76,241,.35)');
    T('Diseño que conecta',.3,.42,.2,{fill:'#ffffff',fontWeight:800,textAlign:'left',width:W*.5});
    T('Tu nombre · Tu profesión · Tu sitio web',.3,.72,.075,{fill:'#a8c7d6',fontWeight:400,textAlign:'left',width:W*.5})}},
  {n:'Certificado',size:[1754,1240],bg:'linear-gradient(135deg,#fffdf7,#f3e7c8)',f:['Cinzel','Dancing Script','Lora'],build(){
    setBg('#fffdf7');R(.5,.5,.94,.9,'rgba(0,0,0,0)',{stroke:'#c9a66b',strokeWidth:10});R(.5,.5,.9,.84,'rgba(0,0,0,0)',{stroke:'#c9a66b',strokeWidth:3});
    T('CERTIFICADO',.5,.22,.1,{fontFamily:'Cinzel',fill:'#6b4e2e',charSpacing:200,width:W*.8});
    T('DE RECONOCIMIENTO',.5,.32,.04,{fontFamily:'Cinzel',fontWeight:400,fill:'#9a7b4f',charSpacing:400,width:W*.8});
    T('Se otorga a',.5,.44,.035,{fontFamily:'Lora',fontWeight:400,fill:'#6b7280'});
    T('Nombre Apellido',.5,.56,.11,{fontFamily:'Dancing Script',fill:'#1f2430'});R(.5,.65,.4,.003,'#c9a66b');
    T('por su destacada participación y compromiso.',.5,.72,.03,{fontFamily:'Lora',fontWeight:400,fill:'#6b7280',width:W*.7});
    R(.28,.86,.2,.003,'#6b4e2e');T('Firma',.28,.89,.025,{fontFamily:'Lora',fontWeight:400,fill:'#6b7280',width:W*.2});
    R(.72,.86,.2,.003,'#6b4e2e');T('Fecha',.72,.89,.025,{fontFamily:'Lora',fontWeight:400,fill:'#6b7280',width:W*.2})}},
  {n:'Story promo',size:[1080,1920],bg:'linear-gradient(180deg,#ff5c7a,#ffb020)',f:['Poppins','Anton'],build(){
    setBg({g:['#ff5c7a','#ffb020',90]});C(.2,.18,.28,'rgba(255,255,255,.18)');C(.9,.7,.34,'rgba(255,255,255,.14)');
    T('NUEVA',.5,.3,.1,{fontFamily:'Anton',fontWeight:400,fill:'#ffffff',charSpacing:300});T('COLECCIÓN',.5,.4,.16,{fontFamily:'Anton',fontWeight:400,fill:'#ffffff'});
    T('Descubre las novedades de la temporada',.5,.55,.05,{fill:'#ffffff',fontWeight:400,width:W*.8});
    R(.5,.76,.6,.07,'#ffffff',{rx:60,ry:60});T('Desliza hacia arriba',.5,.76,.04,{fill:'#ff5c7a',width:W*.56})}},
  {n:'Flyer A4',size:[1240,1754],bg:'linear-gradient(180deg,#6c4cf1 38%,#fff 38%)',f:['Poppins'],build(){
    setBg('#ffffff');R(.5,.19,1,.38,'#6c4cf1');C(.88,.1,.22,'rgba(255,255,255,.15)');
    T('TALLER DE DISEÑO',.5,.13,.045,{fill:'#c9bfff',charSpacing:400,width:W*.8});T('Aprende a crear\nsin límites',.5,.25,.095,{fill:'#ffffff',fontWeight:800});
    T('Sábado 14 de junio · 10:00 a 14:00',.5,.5,.04,{fontWeight:600});T('Centro Cultural · Calle Mayor 12',.5,.55,.032,{fontWeight:400,fill:'#6b7280'});
    R(.5,.8,.5,.07,'#18c5b4',{rx:50,ry:50});T('Reserva tu plaza',.5,.8,.034,{fill:'#0b1020',width:W*.46})}}
];
async function applyTemplate(i){
  document.body.classList.remove('sp');const t=TEMPLATES[i];
  if(t.size&&(W!==t.size[0]||H!==t.size[1]))await resizeAll(t.size[0],t.size[1]);await ensureFonts(t.f);
  cv.discardActiveObject();batch(()=>{cv.getObjects().slice().forEach(o=>cv.remove(o));t.build()});
  await ensureFonts();
}

/* ---------- Patrones ---------- */
function makePattern(kind){
  const c=document.createElement('canvas');c.width=c.height=40;const x=c.getContext('2d');
  const set=(bg,fg)=>{x.fillStyle=bg;x.fillRect(0,0,40,40);x.fillStyle=fg;x.strokeStyle=fg};
  if(kind==='dots'){set('#ffffff','#cfd5e3');x.beginPath();x.arc(20,20,3,0,7);x.fill()}
  if(kind==='dark'){set('#1f2430','#3a4152');x.beginPath();x.arc(20,20,3,0,7);x.fill()}
  if(kind==='lines'){set('#ffffff','#e1e5ee');x.lineWidth=4;x.beginPath();x.moveTo(-5,45);x.lineTo(45,-5);x.stroke()}
  if(kind==='grid'){set('#ffffff','#e3e6ec');x.lineWidth=1.5;x.strokeRect(0,0,40,40)}
  if(kind==='check'){set('#ffffff','#ece9ff');x.fillRect(0,0,20,20);x.fillRect(20,20,20,20)}
  if(kind==='warm'){set('#fff3d6','#ffe3a3');x.fillRect(0,0,20,40)}
  return new fabric.Pattern({source:c,repeat:'repeat'});
}

/* ---------- Panel izquierdo ---------- */
const TABS=[['el','shapes','Elementos'],['tx','type','Texto'],['im','image','Imágenes'],['ic','sparkle','Iconos'],['ch','chart','Gráficos'],['bg','palette','Fondo'],['tp','layout','Plantillas']];
let tab='tp';
const PANELS={
  el(){
    const inp=(v,t='text')=>h('input',{type:t,value:v,class:'sel',style:'padding:0 8px'});
    const qrIn=inp('');qrIn.placeholder='https://tuweb.com';const fg=h('input',{type:'color',value:'#1f2430',style:'width:100%;height:32px'}),bgc=h('input',{type:'color',value:'#ffffff',style:'width:100%;height:32px'});
    const rows=inp(4,'number'),cols=inp(3,'number');
    const dc=h('input',{type:'color',value:drawCfg.color,style:'width:100%;height:32px'}),dw=h('input',{type:'range',min:1,max:60,value:drawCfg.width,style:'width:100%'});
    const dt=h('select',{class:'sel'},h('option',{value:'pencil'},'Lápiz'),h('option',{value:'marker'},'Rotulador'));dt.value=drawCfg.kind;
    dc.oninput=()=>{drawCfg.color=dc.value;if(drawing)setDrawing(true,true)};dw.oninput=()=>{drawCfg.width=+dw.value;if(drawing)setDrawing(true,true)};dt.onchange=()=>{drawCfg.kind=dt.value;if(drawing)setDrawing(true,true)};
    return h('div',{},h('h3',{},'Formas y líneas'),h('div',{class:'grid'},SHAPES.map(([n,d,st,f])=>h('button',{class:'btn sh',title:n,onclick:()=>addObj(f(),n)},h('span',{class:'ic'+(st?' st':''),html:`<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`})))),
      h('h3',{},'Marcos y collage'),h('div',{class:'hint',style:'margin-bottom:6px'},'Arrastra una foto sobre un marco y se ajusta sola. Luego puedes moverla dentro del marco.'),
      h('div',{class:'grid g2'},h('button',{class:'btn',onclick:()=>addObj(addFrameObj('rect'),'Marco de imagen')},'Marco'),h('button',{class:'btn',onclick:()=>addObj(addFrameObj('circle'),'Marco de imagen')},'Marco circular')),
      h('div',{class:'grid g5',style:'margin-top:6px'},COLLAGES.map(([n,cells])=>h('button',{class:'btn sm',title:'Collage '+n,onclick:()=>addCollage(cells)},n))),
      h('h3',{},'Dibujo libre'),h('div',{class:'fld'},h('label',{},'Pincel'),dt),h('div',{class:'fld'},h('label',{},'Color'),dc),h('div',{class:'fld'},h('label',{},'Grosor'),dw),
      h('button',{class:'btn wide'+(drawing?' on':''),onclick:()=>setDrawing(!drawing)},ic('pencil'),drawing?'Terminar dibujo':'Empezar a dibujar'),
      h('h3',{},'Código QR'),h('div',{class:'fld'},qrIn),h('div',{class:'row'},fg,bgc),h('button',{class:'btn wide',onclick:()=>addQR(qrIn.value,fg.value,bgc.value)},'Insertar QR'),
      h('h3',{},'Tabla'),h('div',{class:'row'},h('div',{},h('div',{class:'hint'},'Filas'),rows),h('div',{},h('div',{class:'hint'},'Columnas'),cols)),
      h('button',{class:'btn wide',onclick:()=>addTable(+rows.value,+cols.value)},'Insertar tabla'),h('div',{class:'hint',style:'margin-top:6px'},'Para editar las celdas, desagrupa la tabla (Ctrl+Shift+G).'))},
  tx(){
    return h('div',{},h('h3',{},'Añadir texto'),
      h('button',{class:'btn big wide',style:'font:800 22px Poppins;margin-bottom:6px',onclick:()=>addText('Añade un título',{fontSize:.1*S_(),fontWeight:800})},'Título'),
      h('button',{class:'btn big wide',style:'font:700 16px Montserrat;margin-bottom:6px',onclick:()=>addText('Añade un subtítulo',{fontSize:.055*S_(),fontFamily:'Montserrat'})},'Subtítulo'),
      h('button',{class:'btn big wide',style:'font:400 13px Roboto',onclick:()=>addText('Añade un párrafo de texto con más detalles.',{fontSize:.035*S_(),fontFamily:'Roboto',fontWeight:400})},'Texto de cuerpo'),
      h('button',{class:'btn wide',style:'margin-top:6px',onclick:addArc},icl('arc','Texto en arco')),
      h('h3',{},'Estilos de texto'),
      h('div',{class:'grid g2'},TEXT_STYLES.map(([n,p,c])=>h('div',{class:'tstyle',style:`font-family:'${p.fontFamily}';color:${c};${p.fontWeight>=700?'font-weight:700':''}`,onclick:async()=>{
        const o=Object.assign({},p);const g=o._g;delete o._g;if(o.shadow)o.shadow=new fabric.Shadow(o.shadow);
        const tb=await addText(n,Object.assign({fontSize:.09*S_()},o));if(g){tb._g=g;setGrad(tb);cv.requestRenderAll()}}},n))),
      h('h3',{},'Combinaciones de fuentes'),
      PAIRS.map(([a,b,n])=>h('div',{class:'tstyle',style:'margin-bottom:6px;text-align:left;padding:8px 12px',onclick:async()=>{
        await ensureFonts([a,b]);
        cascade=0;const t1=await addText('Título',{fontFamily:a,fontWeight:700,fontSize:.1*S_()});t1.set({top:H/2-.05*S_()});
        const t2=await addText('Texto de apoyo con más detalle',{fontFamily:b,fontWeight:400,fontSize:.04*S_()});t2.set({top:H/2+.06*S_()});cv.setActiveObject(t1);cv.requestRenderAll()}},
        h('div',{style:`font:700 20px '${a}'`},n),h('div',{style:`font:400 12px '${b}';color:var(--muted)`},a+' + '+b))));
  },
  im(){return h('div',{},h('h3',{},'Tus imágenes'),
    h('button',{class:'btn big wide on',onclick:()=>$('file').click()},icl('upload','Subir imagen')),
    h('button',{class:'btn wide',style:'margin-top:6px',onclick:()=>$('filePdf').click()},icl('upload','Importar PDF editable')),
    h('button',{class:'btn wide',style:'margin-top:6px',onclick:async()=>{try{const r=await fetch('ejemplos/informe-de-ejemplo.pdf');if(!r.ok)throw 0;handleFiles([new File([await r.blob()],'informe-de-ejemplo.pdf',{type:'application/pdf'})])}catch(e){toast('El PDF de ejemplo solo está disponible si abres el editor desde un servidor (http://…)')}}},'Probar con un PDF de ejemplo'),
    h('p',{class:'hint'},'También puedes arrastrar al lienzo imágenes, PDF, SVG o texto, o pegar imágenes con Ctrl+V.'),
    libSection(),
    h('h3',{},'Fondo de página'),h('button',{class:'btn wide',onclick:()=>$('fileBg').click()},'Usar imagen como fondo'),
    h('p',{class:'hint'},'Selecciona una imagen y usa los ajustes de la derecha: filtros, brillo, bordes redondeados, sombra…'))},
  ic(){
    const colr=h('input',{type:'color',value:'#1f2430',style:'width:100%;height:32px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px'});
    return h('div',{},h('h3',{},'Iconos vectoriales'),h('div',{class:'hint',style:'margin-bottom:6px'},'Elige un color y pulsa un icono. Luego puedes cambiar color y grosor.'),colr,
      h('div',{class:'grid g4'},Object.entries(LIB).map(([n,d])=>h('button',{class:'btn libb',title:n,onclick:()=>addObj(libIcon(d,colr.value),n)},h('span',{class:'ic',html:`<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`})))))},
  ch(){
    const ta=h('textarea',{rows:6,style:'width:100%;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--panel2);font:inherit;resize:vertical'});
    ta.value='Ene: 30\nFeb: 55\nMar: 40\nAbr: 80';
    return h('div',{},h('h3',{},'Datos'),h('div',{class:'hint',style:'margin-bottom:6px'},'Una fila por dato, con el formato Nombre: valor.'),ta,
      h('h3',{},'Insertar'),h('div',{class:'grid g2'},h('button',{class:'btn big',onclick:()=>addChart('bar',parseData(ta.value))},'Barras'),h('button',{class:'btn big',onclick:()=>addChart('donut',parseData(ta.value))},'Donut')),
      h('p',{class:'hint',style:'margin-top:10px'},'Usa los colores de tu kit de marca. Para editar un gráfico ya insertado, desagrúpalo (Ctrl+Shift+G) o bórralo y genera otro.'))},
  bg(){
    const c=h('input',{type:'color',value:'#ffffff',style:'width:100%;height:34px;border:1px solid var(--line);border-radius:8px'});
    c.oninput=()=>batch(()=>setBg(c.value));
    return h('div',{},h('h3',{},'Color'),h('div',{class:'grid g4'},[...PALETTE,'#fff3d6','#e8f0ff','#ffe14d','#0f1536'].map(x=>h('div',{class:'sw',style:`background:${x}`,onclick:()=>batch(()=>setBg(x))}))),h('div',{style:'margin-top:8px'},c),
      h('h3',{},'Degradados'),h('div',{class:'grid g4'},GRADS.map(g=>h('div',{class:'sw',style:`background:linear-gradient(135deg,${g[0]},${g[1]})`,onclick:()=>batch(()=>setBg({g:[g[0],g[1],135]}))}))),
      h('h3',{},'Patrones'),h('div',{class:'grid g3'},['dots','dark','lines','grid','check','warm'].map(k=>{const s=makePattern(k).source;return h('div',{class:'sw',style:`background:url(${s.toDataURL()})`,onclick:()=>batch(()=>setBg({pattern:makePattern(k)}))})})),
      h('h3',{},'Imagen'),h('button',{class:'btn wide',onclick:()=>$('fileBg').click()},icl('upload','Imagen de fondo')),
      h('h3',{},'Kit de marca'),h('div',{class:'hint',style:'margin-bottom:6px'},'Tus 6 colores de marca. Aparecen en todos los selectores de color.'),
      h('div',{class:'brand'},getBrand().map((c,i)=>{const inp=h('input',{type:'color',value:c});inp.onchange=()=>{const b=getBrand();b[i]=inp.value;store.set('lienzo-brand',JSON.stringify(b))};return inp})))
  },
  tp(){
    const q=h('input',{type:'text',placeholder:'Buscar plantillas…',class:'sel',style:'padding:0 10px;margin-bottom:10px'});
    const cards=TEMPLATES.map((t,i)=>h('div',{class:'tpl',style:`background:${t.bg}`,onclick:()=>applyTemplate(i)},t.n));
    q.oninput=()=>{const v=q.value.trim().toLowerCase();cards.forEach((c,i)=>{c.style.display=!v||TEMPLATES[i].n.toLowerCase().includes(v)?'':'none'})};
    return h('div',{},h('h3',{},'Plantillas'),q,h('div',{class:'grid g2'},cards),h('p',{class:'hint',style:'margin-top:10px'},'Reemplazan el contenido de la página actual (puedes deshacer con Ctrl+Z).'),utSection())}
};
const isMobile=()=>matchMedia('(max-width:900px)').matches;
function selectTab(id){
  const b=document.body;
  if(isMobile()){if(tab===id&&b.classList.contains('sp')){b.classList.remove('sp');return}b.classList.add('sp');b.classList.remove('sr')}
  tab=id;buildRail();showPanel();
}
function buildRail(){
  const r=$('rail');r.textContent='';
  TABS.forEach(([id,i_,n])=>r.append(h('button',{class:id===tab?'on':'',onclick:()=>selectTab(id)},ic(i_),n)));
}
function showPanel(){const p=$('panel');p.textContent='';p.append(PANELS[tab]())}

/* ---------- Constructores de UI de propiedades ---------- */
const sec=(t,...k)=>h('div',{class:'sec'},h('h4',{},t),k);
function rng(label,min,max,step,val,on,done){
  const v=h('span',{},String(+(+val).toFixed(2))),i=h('input',{type:'range',min,max,step,value:val});
  i.oninput=()=>{v.textContent=+(+i.value).toFixed(2);on(+i.value);cv.requestRenderAll()};i.onchange=()=>(done||commit)();
  return h('div',{class:'fld'},h('label',{},label,v),i);
}
const BRAND_DEF=['#6c4cf1','#18c5b4','#ff5c7a','#ffb020','#1f2430','#ffffff'];
function getBrand(){try{const b=JSON.parse(store.get('lienzo-brand'));if(Array.isArray(b)&&b.length===6)return b}catch(e){}return BRAND_DEF.slice()}
function docColors(){
  const set=new Set();
  const add=c=>{if(typeof c==='string'&&/^#|^rgb/.test(c)&&!/rgba\(.*,\s*0(\.\d+)?\)$/.test(c)){try{set.add('#'+new fabric.Color(c).toHex())}catch(e){}}};
  const walk=o=>{add(o.fill);add(o.stroke);(o._objects||[]).forEach(walk)};cv.getObjects().forEach(walk);
  return [...set].filter(c=>!PALETTE.includes(c)).slice(0,10);
}
function col(label,val,on,withSw){
  const i=h('input',{type:'color',value:toHex(val)});i.oninput=()=>{on(i.value);cv.requestRenderAll()};i.onchange=commit;
  const set=c=>{i.value=c;on(c);commit()};
  const dc=withSw?docColors():[];
  return h('div',{class:'fld'},label&&h('label',{},label),i,
    withSw&&h('div',{style:'margin-top:2px'},h('div',{class:'hint',style:'font-size:11px'},'Kit de marca'),getBrand().map(c=>h('i',{class:'sw s',style:`background:${c}`,onclick:()=>set(c)}))),
    withSw&&h('div',{style:'margin-top:4px'},PALETTE.map(c=>h('i',{class:'sw s',style:`background:${c}`,onclick:()=>set(c)}))),
    dc.length>0&&h('div',{style:'margin-top:2px'},h('div',{class:'hint',style:'font-size:11px'},'En este diseño'),dc.map(c=>h('i',{class:'sw s',style:`background:${c}`,onclick:()=>set(c)}))),
    window.EyeDropper&&withSw&&h('button',{class:'btn sm pip',onclick:async()=>{try{const r=await new EyeDropper().open();set(r.sRGBHex)}catch(e){}}},ic('pipette'),'Cuentagotas'));
}
const tbtn=(label,act,fn,title)=>h('button',{class:'btn sm'+(act?' on':''),title:title||'',onclick:fn},label);
const ibtn=(icon,act,fn,title,text)=>h('button',{class:'btn sm'+(act?' on':''),title:title||'',onclick:fn},ic(icon),text);

/* ---------- Panel de propiedades ---------- */
function refreshProps(){
  const P=$('props');P.textContent='';const o=cv.getActiveObject();
  if(cropMode&&o===cropMode.cr){P.append(sec('Recortar imagen',h('div',{class:'hint',style:'margin-bottom:8px'},'Arrastra el recuadro y sus bordes. Enter aplica, Esc cancela.'),
    h('div',{class:'row'},tbtn('Aplicar',1,()=>endCrop(true)),tbtn('Cancelar',0,()=>endCrop(false)))));return}
  if(!o){P.append(sec('Página',h('div',{class:'hint'},`${W} × ${H} px`),h('div',{class:'hint',style:'margin:6px 0'},'Selecciona un elemento para editarlo, o cambia el fondo:'),
    h('div',{},['#ffffff','#1f2430','#fff3d6','#e8f0ff','#ffe14d','#6c4cf1'].map(c=>h('i',{class:'sw s',style:`background:${c}`,onclick:()=>batch(()=>setBg(c))})))));P.append(pageColorsSection());P.append(pageAnimSection());return}
  const isText=o.type==='textbox',isImg=o.type==='image',lv=leaves(o),fillable=lv.filter(x=>x.type!=='image'&&!x.isBg);
  P.append(sec('Transparencia',rng('Opacidad',0,1,.01,o.opacity,v=>tg(o).forEach(x=>x.set('opacity',v)))));
  if(isText)P.append(textSection(o));
  if(o._arc)P.append(arcSection(o));
  if(o._frame)P.append(sec('Marco de imagen',h('div',{class:'hint',style:'margin-bottom:6px'},'Arrastra una foto sobre el marco o súbela aquí.'),ibtn('upload',0,()=>$('file').click(),'Subir imagen en este marco','Subir imagen en este marco')));
  if(fillable.length&&!o._arc)P.append(fillSection(fillable));
  P.append(strokeSection(lv));
  P.append(effectsSection(o));
  P.append(shadowSection(o));
  if(o.type==='rect')P.append(sec('Esquinas',rng('Redondeo',0,Math.min(o.width,o.height)/2,1,o.rx||0,v=>o.set({rx:v,ry:v}))));
  if(isImg)P.append(imageSection(o));
  P.append(animSection(o));
  P.append(transformSection(o));
  P.append(sec('Alinear a la página',h('div',{class:'grid'},[['l','al_l','Izquierda'],['c','al_c','Centro'],['r','al_r','Derecha'],['t','al_t','Arriba'],['m','al_m','Medio'],['b','al_b','Abajo']].map(([m,i,n])=>ibtn(i,0,()=>alignTo(o,m),n,n)))));
  if(o.type==='activeSelection')P.append(sec('Alinear entre sí',h('div',{class:'grid'},[['l','al_l','Izquierda'],['c','al_c','Centro'],['r','al_r','Derecha'],['t','al_t','Arriba'],['m','al_m','Medio'],['b','al_b','Abajo'],['dh','distH','Distribuir horizontal'],['dv','distV','Distribuir vertical']].map(([m,i,n])=>ibtn(i,0,()=>arrange(o,m),n))))) ;
  P.append(sec('Orden',h('div',{class:'grid g4'},[['front','front','Al frente'],['fwd','fwd','Adelante'],['bwd','bwd','Atrás'],['back','back','Al fondo']].map(([k,i,t])=>ibtn(i,0,()=>order(o,k),t)))));
  const locked=!!o.locked||tg(o).every(x=>x.locked);
  P.append(sec('Acciones',h('div',{class:'row'},ibtn('copy',0,dup,'Duplicar','Duplicar'),ibtn(locked?'unlock':'lock',0,()=>{setLock(o,!locked);commit();refreshProps()},'Bloquear',locked?'Desbloquear':'Bloquear')),
    h('div',{class:'row'},ibtn('brush',0,()=>copyStyle(o),'Copiar estilo','Copiar estilo'),styleClip&&ibtn('brush',0,()=>pasteStyle(o),'Pegar estilo','Pegar estilo')),
    h('div',{class:'row'},o.type==='activeSelection'&&ibtn('group',0,group,'Agrupar','Agrupar'),o.type==='group'&&ibtn('ungroup',0,ungroup,'Desagrupar','Desagrupar'),ibtn('trash',0,del,'Eliminar','Eliminar'))));
}

/* ---------- Contraste del texto (WCAG) ---------- */
const lumOf=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratioOf=(x,y)=>{const l1=lumOf(x),l2=lumOf(y);return(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
function bgUnder(o){
  const r=o.getBoundingRect(true,true);if(r.width<2||r.height<2)return null;
  const vis=o.visible;o.visible=false;let el;
  try{const s=Math.min(1,160/r.width);el=cv.toCanvasElement(s/zoom,{left:r.left*zoom,top:r.top*zoom,width:r.width*zoom,height:r.height*zoom})}finally{o.visible=vis}
  const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let R=0,G=0,B=0,n=0;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<8)continue;R+=d[i];G+=d[i+1];B+=d[i+2];n++}
  return n?[R/n,G/n,B/n]:[255,255,255];
}
function contrastInfo(o){
  if(o.type!=='textbox'||typeof o.fill!=='string'||o._g||!o.fill)return null;
  let c;try{c=new fabric.Color(o.fill)}catch(e){return null}
  if(c.getAlpha()<.5)return null;
  let bg=null;if(o.textBackgroundColor){try{const q=new fabric.Color(o.textBackgroundColor);if(q.getAlpha()>.5)bg=q.getSource().slice(0,3)}catch(e){}}
  bg=bg||bgUnder(o);if(!bg)return null;
  const al=c.getAlpha(),s=c.getSource(),fgc=[0,1,2].map(i=>s[i]*al+bg[i]*(1-al));
  return{ratio:ratioOf(fgc,bg),bg};
}
function contrastRow(o){
  const ci=contrastInfo(o);if(!ci)return null;
  const large=o.fontSize>=Math.max(24,.035*Math.min(W,H)),need=large?3:4.5,r=ci.ratio,okc=r>=need;
  const box=h('div',{class:'hint',style:'margin:6px 0'},
    h('span',{style:`font-weight:700;color:${okc?'#27ae60':'#ff3d3d'}`},`Contraste ${r.toFixed(1)}:1 · ${r>=7?'Excelente':okc?'Correcto':'Insuficiente'}`),
    ` (mínimo ${need}:1 para texto ${large?'grande':'normal'})`);
  if(!okc)box.append(h('div',{class:'row',style:'margin-top:4px'},tbtn('Mejorar contraste',0,()=>{
    o.set('fill',ratioOf([255,255,255],ci.bg)>ratioOf([0,0,0],ci.bg)?'#ffffff':'#000000');o._solid=o.fill;commit();refreshProps()})));
  return box;
}

function listify(o,mode){
  const lines=o.text.split('\n').map(l=>l.replace(/^(•\s|\d+\.\s)/,''));
  o.set({text:lines.map((l,i)=>mode==='b'?'• '+l:mode==='n'?`${i+1}. `+l:l).join('\n'),textAlign:'left'});o.initDimensions();commit();refreshProps();
}
function textSection(o){
  const bold=o.fontWeight==='bold'||+o.fontWeight>=700;
  const fs=h('select',{class:'sel'},FONTS.map(f=>h('option',{value:f,style:`font-family:'${f}'`},f)));fs.value=o.fontFamily;
  fs.onchange=async()=>{o.set('fontFamily',fs.value);await ensureFonts([fs.value]);reinitText(o);o.setCoords();commit()};
  const upd=(k,v)=>{o.set(k,v);o.dirty=true;commit();refreshProps()};
  const conv=f=>{o.set('text',f(o.text));o.initDimensions();commit()};
  return sec('Texto',h('div',{class:'fld'},fs),
    rng('Tamaño',8,400,1,o.fontSize,v=>{o.set('fontSize',v);if(o._g)setGrad(o)}),
    contrastRow(o),
    h('div',{class:'row'},tbtn('B',bold,()=>upd('fontWeight',bold?'normal':'bold'),'Negrita'),tbtn('I',o.fontStyle==='italic',()=>upd('fontStyle',o.fontStyle==='italic'?'normal':'italic'),'Cursiva'),
      tbtn('U',o.underline,()=>upd('underline',!o.underline),'Subrayado'),tbtn('S',o.linethrough,()=>upd('linethrough',!o.linethrough),'Tachado')),
    h('div',{class:'row'},[['left','ta_l'],['center','ta_c'],['right','ta_r'],['justify','ta_j']].map(([a,i])=>ibtn(i,o.textAlign===a,()=>upd('textAlign',a),a))),
    h('div',{class:'row'},tbtn('AA',0,()=>conv(t=>t.toUpperCase()),'Mayúsculas'),tbtn('aa',0,()=>conv(t=>t.toLowerCase()),'Minúsculas'),tbtn('Aa',0,()=>conv(t=>t.replace(/\b\p{L}/gu,c=>c.toUpperCase())),'Capitalizar')),
    rng('Interlineado',.6,3,.05,o.lineHeight,v=>o.set('lineHeight',v)),
    rng('Espaciado de letras',-100,800,10,o.charSpacing||0,v=>o.set('charSpacing',v)),
    h('div',{class:'row'},ibtn('list',0,()=>listify(o,'b'),'Viñetas','Viñetas'),ibtn('list',0,()=>listify(o,'n'),'Lista numerada','1. 2. 3.'),tbtn('Sin lista',0,()=>listify(o,'x'))),
    h('div',{class:'row'},ibtn('sparkle',0,()=>openAI(o),'Reescribir con IA','Reescribir con IA')),
    h('div',{class:'row'},tbtn('Resaltado',!!o.textBackgroundColor,()=>upd('textBackgroundColor',o.textBackgroundColor?'':'#ffe066'))),
    o.textBackgroundColor&&col('Color de resaltado',o.textBackgroundColor,v=>o.set('textBackgroundColor',v)));
}

function fillSection(targets){
  const t0=targets[0],none=!t0.fill||t0.fill==='transparent'||t0.fill==='rgba(0,0,0,0)';
  const mode=t0._g?'g':none?'n':'s';
  const setMode=m=>{targets.forEach(t=>{
    if(m==='s'){t._g=null;t.set('fill',t._solid||'#6c4cf1')}
    if(m==='g'){t._g=t._g||{c1:'#6c4cf1',c2:'#18c5b4',a:45};setGrad(t)}
    if(m==='n'){t._g=null;t.set('fill','rgba(0,0,0,0)')}});commit();refreshProps()};
  const body=[];
  if(mode==='s')body.push(col('Color',typeof t0.fill==='string'?t0.fill:'#000',v=>targets.forEach(t=>{t._g=null;t._solid=v;t.set('fill',v)}),true));
  if(mode==='g'){const g=t0._g;
    body.push(col('Color 1',g.c1,v=>targets.forEach(t=>{t._g.c1=v;setGrad(t)})),col('Color 2',g.c2,v=>targets.forEach(t=>{t._g.c2=v;setGrad(t)})),
      rng('Ángulo',0,360,5,g.a,v=>targets.forEach(t=>{t._g.a=v;setGrad(t)})))}
  return sec('Relleno',h('div',{class:'row'},tbtn('Sólido',mode==='s',()=>setMode('s')),tbtn('Degradado',mode==='g',()=>setMode('g')),tbtn('Ninguno',mode==='n',()=>setMode('n'))),body);
}

function strokeSection(lv){
  const t0=lv[0],on=t0.stroke&&t0.strokeWidth>0;
  const dash=h('select',{class:'sel'},h('option',{value:'s'},'Continuo'),h('option',{value:'d'},'Guiones'),h('option',{value:'p'},'Puntos'));
  dash.value=t0.strokeDashArray?(t0.strokeDashArray[0]<4?'p':'d'):'s';
  dash.onchange=()=>{lv.forEach(t=>t.set({strokeDashArray:dash.value==='s'?null:dash.value==='d'?[14,10]:[2,10],strokeLineCap:dash.value==='p'?'round':'butt'}));commit()};
  return sec('Contorno',col('Color',t0.stroke||'#1f2430',v=>lv.forEach(t=>t.set({stroke:v,strokeWidth:t.strokeWidth||3}))),
    rng('Grosor',0,40,1,on?t0.strokeWidth:0,v=>lv.forEach(t=>{if(!t.stroke)t.set('stroke','#1f2430');t.set('strokeWidth',v);if(t.type==='textbox')t.set('paintFirst','stroke')})),
    h('div',{class:'fld'},dash));
}

const FX=[['none','Ninguno'],['soft','Suave'],['lift','Elevado'],['hard','Dura'],['glow','Resplandor'],['neon','Neón'],['outline','Contorno'],['hollow','Hueco'],['emboss','Relieve'],['glitch','Glitch']];
function fxApply(o,name){
  const T_=tg(o),lv=leaves(o).filter(l=>l.type!=='image'&&!l.isBg);
  const accent=t=>{if(!t)return '#6c4cf1';const f=typeof t.fill==='string'&&t.fill&&!/rgba\(0,0,0,0\)|transparent/.test(t.fill)?t.fill:(t.stroke||'#6c4cf1');try{return '#'+new fabric.Color(f).toHex()}catch(e){return '#6c4cf1'}};
  let ac=accent(lv[0]);if(/^#(fff|ffffff)$/i.test(ac))ac='#ff2bd6';
  const sh=(c,b,x,y)=>T_.forEach(t=>t.set('shadow',new fabric.Shadow({color:c,blur:b,offsetX:x,offsetY:y})));
  if(name==='none'){T_.forEach(t=>t.set('shadow',null))}
  if(name==='soft')sh('rgba(0,0,0,.35)',20,0,10);
  if(name==='lift')sh('rgba(0,0,0,.45)',40,0,24);
  if(name==='hard')sh('#1f2430',0,8,8);
  if(name==='glow')sh(ac,32,0,0);
  if(name==='emboss')sh('rgba(0,0,0,.5)',2,3,3);
  if(name==='glitch')sh('#18c5b4',0,-6,0);
  if(name==='neon'){lv.forEach(l=>{if(l.type==='textbox'){l._g=null;l.set('fill','#ffffff')}else l.set({stroke:'#ffffff',strokeWidth:Math.max(l.strokeWidth||0,4)})});sh(ac,28,0,0)}
  if(name==='outline')lv.forEach(l=>{l.set({stroke:l.stroke||'#1f2430',strokeWidth:Math.max(l.strokeWidth||0,3)});if(l.type==='textbox')l.set('paintFirst','stroke')});
  if(name==='hollow')lv.forEach(l=>{const c=accent(l);l._g=null;l.set({stroke:c,strokeWidth:Math.max(l.strokeWidth||0,3),fill:'rgba(0,0,0,0)'})});
  T_.concat(lv).forEach(t=>t.dirty=true);commit();refreshProps();
}
function effectsSection(o){return sec('Efectos rápidos',h('div',{class:'grid'},FX.map(([k,n])=>tbtn(n,0,()=>fxApply(o,k)))))}
function shadowSection(o){
  const targets=tg(o),sh=targets[0].shadow;
  const st={on:!!sh,hex:'#000000',a:.35,blur:20,x:0,y:8};
  if(sh){const c=new fabric.Color(sh.color||'rgba(0,0,0,.35)');st.hex='#'+c.toHex();st.a=c.getAlpha();st.blur=sh.blur;st.x=sh.offsetX;st.y=sh.offsetY}
  const apply=()=>{targets.forEach(t=>{t.set('shadow',new fabric.Shadow({color:new fabric.Color(st.hex).setAlpha(st.a).toRgba(),blur:st.blur,offsetX:st.x,offsetY:st.y}));t.dirty=true})};
  const toggle=()=>{if(st.on){targets.forEach(t=>t.set('shadow',null))}else apply();commit();refreshProps()};
  return sec('Sombra',tbtn(st.on?'Quitar sombra':'Añadir sombra',st.on,toggle),
    st.on&&h('div',{},col('Color',st.hex,v=>{st.hex=v;apply()}),rng('Intensidad',0,1,.05,st.a,v=>{st.a=v;apply()}),rng('Desenfoque',0,80,1,st.blur,v=>{st.blur=v;apply()}),
      rng('Desplazamiento X',-60,60,1,st.x,v=>{st.x=v;apply()}),rng('Desplazamiento Y',-60,60,1,st.y,v=>{st.y=v;apply()})));
}

function applyFilters(img){
  const f=img._f||{},F=fabric.Image.filters,a=[];
  if(f.mat)a.push(new F.ColorMatrix({matrix:f.mat}));
  if(f.br)a.push(new F.Brightness({brightness:f.br}));
  if(f.ct)a.push(new F.Contrast({contrast:f.ct}));
  if(f.sat)a.push(new F.Saturation({saturation:f.sat}));
  if(f.vib)a.push(new F.Vibrance({vibrance:f.vib}));
  if(f.hue)a.push(new F.HueRotation({rotation:f.hue}));
  if(f.gray)a.push(new F.Grayscale());
  if(f.sepia)a.push(new F.Sepia());
  if(f.tint)a.push(new F.BlendColor({color:f.tint.c,mode:'tint',alpha:f.tint.a}));
  if(f.blur)a.push(new F.Blur({blur:f.blur}));
  if(f.noise)a.push(new F.Noise({noise:f.noise}));
  if(f.pix>1)a.push(new F.Pixelate({blocksize:Math.round(f.pix)}));
  if(f.inv)a.push(new F.Invert());
  img.filters=a;img.applyFilters();cv.requestRenderAll();
}
const IMG_PRESETS=[['Original',{}],['Vívido',{sat:.35,ct:.12,vib:.4}],['Dramático',{ct:.3,br:-.08,sat:-.2}],
  ['Vintage',{mat:[.9,.5,.1,0,0,.3,.8,.1,0,0,.2,.3,.5,0,0,0,0,0,1,0],ct:-.05}],['Frío',{tint:{c:'#2f80ed',a:.22},sat:.1}],['Cálido',{tint:{c:'#ffb020',a:.25},br:.05}],
  ['Noir',{gray:true,ct:.35}],['Mate',{ct:-.2,br:.05,sat:-.15}],['Duotono',{gray:true,tint:{c:'#6c4cf1',a:.55}}],['Pixel',{pix:8}]];

/* Herramientas inteligentes sin conexión */
function removeBgColor(o,tol){
  const el=o.getElement(),w=el.naturalWidth||el.width,hh=el.naturalHeight||el.height;
  const c=document.createElement('canvas');c.width=w;c.height=hh;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(el,0,0,w,hh);
  const id=x.getImageData(0,0,w,hh),d=id.data,N=w*hh;
  const px=i=>[d[i*4],d[i*4+1],d[i*4+2]],corners=[0,w-1,(hh-1)*w,N-1].map(px);
  const ref=[0,1,2].map(k=>{const v=corners.map(q=>q[k]).sort((p,q)=>p-q);return(v[1]+v[2])/2});
  const t2=tol*tol,seen=new Uint8Array(N),q=new Uint32Array(N);let qh=0,qt=0;
  const ok=i=>{const dr=d[i*4]-ref[0],dg=d[i*4+1]-ref[1],db=d[i*4+2]-ref[2];return dr*dr+dg*dg+db*db<=t2};
  const add=i=>{if(!seen[i]&&ok(i)){seen[i]=1;q[qt++]=i}};
  for(let i=0;i<w;i++){add(i);add((hh-1)*w+i)}for(let j=0;j<hh;j++){add(j*w);add(j*w+w-1)}
  while(qh<qt){const i=q[qh++],xx=i%w,yy=(i/w)|0;if(xx>0)add(i-1);if(xx<w-1)add(i+1);if(yy>0)add(i-w);if(yy<hh-1)add(i+w)}
  const edge=[];
  for(let i=0;i<N;i++){if(seen[i])continue;const xx=i%w,yy=(i/w)|0;if((xx>0&&seen[i-1])||(xx<w-1&&seen[i+1])||(yy>0&&seen[i-w])||(yy<hh-1&&seen[i+w]))edge.push(i)}
  let n=0;for(let i=0;i<N;i++)if(seen[i]){d[i*4+3]=0;n++}
  edge.forEach(i=>{d[i*4+3]=Math.min(d[i*4+3],170)});
  x.putImageData(id,0,0);return{url:c.toDataURL('image/png'),ratio:n/N};
}
function replaceImage(o,url){
  fabric.Image.fromURL(url,n=>{
    n.set({left:o.left,top:o.top,scaleX:o.scaleX,scaleY:o.scaleY,angle:o.angle,flipX:o.flipX,flipY:o.flipY,opacity:o.opacity,shadow:o.shadow,name:o.name});
    n._f=o._f;n._crop=o._crop;n._round=o._round;n._mask=o._mask;const i=cv.getObjects().indexOf(o);cv.discardActiveObject();
    batch(()=>{cv.remove(o);cv.insertAt(n,i)});if(n._f)applyFilters(n);if(n._crop)applyClip(n);cv.setActiveObject(n);cv.requestRenderAll();
  });
}
function extractPalette(o,k=6){
  const el=o.getElement(),c=document.createElement('canvas'),S=64;c.width=c.height=S;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(el,0,0,S,S);
  const d=x.getImageData(0,0,S,S).data,bins=new Map();
  for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const key=((d[i]>>4)<<8)|((d[i+1]>>4)<<4)|(d[i+2]>>4);const b=bins.get(key)||{n:0,r:0,g:0,b:0};b.n++;b.r+=d[i];b.g+=d[i+1];b.b+=d[i+2];bins.set(key,b)}
  const list=[...bins.values()].sort((a,b)=>b.n-a.n).map(b=>[b.r/b.n,b.g/b.n,b.b/b.n]),out=[];
  for(const q of list){if(out.every(z=>Math.hypot(z[0]-q[0],z[1]-q[1],z[2]-q[2])>70))out.push(q);if(out.length>=k)break}
  return out.map(q=>'#'+[0,1,2].map(i=>Math.round(q[i]).toString(16).padStart(2,'0')).join(''));
}
const MASKS=[['none','Sin máscara'],['circle','Círculo'],['heart','Corazón'],['star','Estrella'],['hex','Hexágono'],['diamond','Rombo'],['tri','Triángulo']];
function maskShape(kind,w,hh,cx,cy){
  const base={left:cx,top:cy,originX:'center',originY:'center'};let o;
  if(kind==='circle')return new fabric.Ellipse(Object.assign({rx:w/2,ry:hh/2},base));
  if(kind==='heart')o=new fabric.Path('M 0 90 C -120 0 -110 -80 -55 -80 C -25 -80 0 -55 0 -35 C 0 -55 25 -80 55 -80 C 110 -80 120 0 0 90 Z',base);
  else o=new fabric.Polygon(kind==='star'?starPts():kind==='hex'?reg(6,100):kind==='diamond'?reg(4,100):reg(3,100),base);
  o.set({scaleX:w/o.width,scaleY:hh/o.height});return o;
}
function applyClip(o){
  const c=o._crop||{l:0,r:0,t:0,b:0},rd=o._round||0,mk=o._mask&&o._mask!=='none'?o._mask:null;
  if(!c.l&&!c.r&&!c.t&&!c.b&&!rd&&!mk){o.clipPath=null;o.dirty=true;return}
  const w=o.width*(1-c.l-c.r),hh=o.height*(1-c.t-c.b),cx=(c.l-c.r)/2*o.width,cy=(c.t-c.b)/2*o.height;
  if(mk)o.clipPath=maskShape(mk,w,hh,cx,cy);
  else{const r=Math.min(w,hh)/2*rd;o.clipPath=new fabric.Rect({width:w,height:hh,left:cx,top:cy,rx:r,ry:r,originX:'center',originY:'center'})}
  o.dirty=true;
}
function maskSel(o){
  const sel=h('select',{class:'sel'},MASKS.map(([v,l])=>h('option',{value:v},l)));sel.value=o._mask||'none';
  sel.onchange=()=>{o._mask=sel.value;applyClip(o);commit()};
  return h('div',{class:'fld'},h('label',{},'Máscara de forma'),sel);
}
function imageSection(o){
  o._f=o._f||{};o._crop=o._crop||{l:0,r:0,t:0,b:0};const F=o._f,C=o._crop;
  const fr=(label,k,min,max,step)=>rng(label,min,max,step,F[k]||0,v=>{F[k]=v;applyFilters(o)});
  const tog=(label,k)=>tbtn(label,F[k],()=>{F[k]=!F[k];applyFilters(o);commit();refreshProps()});
  const cr=(label,k,opp)=>rng(label,0,.9,.01,C[k],v=>{C[k]=Math.min(v,.95-C[opp]);applyClip(o)});
  let tol=40;const pal=h('div',{class:'pal'});let colors=[];
  const showPal=()=>{pal.textContent='';colors.forEach(c=>pal.append(h('i',{style:`background:${c}`,title:c,onclick:()=>{store.set('lienzo-last-color',c);toast('Color '+c)}})))};
  return h('div',{},
    sec('Filtros',h('div',{class:'grid g2'},IMG_PRESETS.map(([n,pr])=>tbtn(n,0,()=>{o._f=JSON.parse(JSON.stringify(pr));applyFilters(o);commit();refreshProps()})))),
    sec('Ajustes de imagen',fr('Brillo','br',-.5,.5,.01),fr('Contraste','ct',-.5,.5,.01),fr('Saturación','sat',-1,1,.01),fr('Intensidad','vib',-1,1,.01),fr('Matiz','hue',-1,1,.01),
      fr('Desenfoque','blur',0,.5,.01),fr('Grano','noise',0,400,5),fr('Pixelar','pix',0,40,1),
      h('div',{class:'row'},tog('B/N','gray'),tog('Sepia','sepia'),tog('Invertir','inv'))),
    sec('Recorte',ibtn('image',0,()=>startCrop(o),'Recortar con el ratón (o doble clic en la imagen)','Recortar con el ratón'),cr('Izquierda','l','r'),cr('Derecha','r','l'),cr('Arriba','t','b'),cr('Abajo','b','t'),
      rng('Bordes redondeados',0,1,.01,o._round||0,v=>{o._round=v;applyClip(o)}),maskSel(o)),
    sec('Herramientas inteligentes',
      rng('Tolerancia del fondo',5,120,1,tol,v=>{tol=v},()=>{}),
      ibtn('sparkle',0,()=>{const r=removeBgColor(o,tol);if(r.ratio>.97)return toast('Tolerancia demasiado alta');if(r.ratio<.003)return toast('No se detectó un fondo liso en los bordes');replaceImage(o,r.url);toast('Fondo eliminado')},'Quitar fondo liso','Quitar fondo liso'),
      h('div',{class:'hint'},'Funciona mejor con fondos de un solo color.'),
      ibtn('type',0,()=>runOcrUI(o),'Extraer el texto de la imagen con IA (OCR)','Texto editable con IA (OCR)'),
      ibtn('palette',0,()=>{colors=extractPalette(o);showPal()},'Extraer paleta','Extraer paleta de colores'),pal,
      ibtn('palette',0,()=>{if(!colors.length)colors=extractPalette(o);const b=colors.concat(BRAND_DEF).slice(0,6);store.set('lienzo-brand',JSON.stringify(b));toast('Kit de marca actualizado');if(tab==='bg')showPanel()},'Usar como kit de marca','Usar como kit de marca')),
    h('div',{class:'row',style:'margin-top:8px'},tbtn('Restablecer',0,()=>{o._f={};o._crop={l:0,r:0,t:0,b:0};o._round=0;o._mask='none';applyFilters(o);applyClip(o);commit();refreshProps()}),
      tbtn('Usar de fondo',0,()=>{cv.discardActiveObject();batch(()=>{cv.getObjects().filter(x=>x.isBg&&x!==o).forEach(x=>cv.remove(x));o.clipPath=null;cover(o,W,H);o.set({isBg:true,selectable:false,evented:false,hoverCursor:'default'});cv.sendToBack(o)})})));
}

function transformSection(o){
  const ang=((o.angle%360)+540)%360-180;
  return sec('Transformar',rng('Rotación',-180,180,1,ang,v=>{o.rotate(v);o.setCoords()}),
    h('div',{class:'grid g4'},ibtn('flipH',0,()=>{o.toggle('flipX');commit()},'Voltear horizontal'),ibtn('flipV',0,()=>{o.toggle('flipY');commit()},'Voltear vertical'),
      ibtn('rotate',0,()=>{o.rotate((o.angle||0)+90);o.setCoords();commit();refreshProps()},'Girar 90°'),tbtn('0°',0,()=>{o.rotate(0);o.setCoords();commit();refreshProps()},'Quitar rotación')),
    numSection(o));
}

function arrange(sel,m){
  const objs=sel.getObjects().slice();cv.discardActiveObject();
  const R=objs.map(o=>({o,r:o.getBoundingRect(true,true)}));
  const L=Math.min(...R.map(x=>x.r.left)),Rr=Math.max(...R.map(x=>x.r.left+x.r.width)),T=Math.min(...R.map(x=>x.r.top)),B=Math.max(...R.map(x=>x.r.top+x.r.height));
  batch(()=>{
    R.forEach(x=>{const r=x.r;
      if(m==='l')x.o.left+=L-r.left;if(m==='c')x.o.left+=(L+Rr)/2-(r.left+r.width/2);if(m==='r')x.o.left+=Rr-(r.left+r.width);
      if(m==='t')x.o.top+=T-r.top;if(m==='m')x.o.top+=(T+B)/2-(r.top+r.height/2);if(m==='b')x.o.top+=B-(r.top+r.height)});
    if(m==='dh'){R.sort((a,b)=>a.r.left-b.r.left);const tot=R.reduce((q,x)=>q+x.r.width,0),gap=(Rr-L-tot)/Math.max(1,R.length-1);let x0=L;R.forEach(x=>{x.o.left+=x0-x.r.left;x0+=x.r.width+gap})}
    if(m==='dv'){R.sort((a,b)=>a.r.top-b.r.top);const tot=R.reduce((q,x)=>q+x.r.height,0),gap=(B-T-tot)/Math.max(1,R.length-1);let y0=T;R.forEach(x=>{x.o.top+=y0-x.r.top;y0+=x.r.height+gap})}
    R.forEach(x=>x.o.setCoords());
  });
  cv.setActiveObject(new fabric.ActiveSelection(objs,{canvas:cv}));cv.requestRenderAll();
}
let styleClip=null;
function copyStyle(o){
  const t=leaves(o)[0];if(!t)return;
  styleClip={fill:t._g?null:t.fill,_g:t._g?{...t._g}:null,stroke:t.stroke,strokeWidth:t.strokeWidth,strokeDashArray:t.strokeDashArray,opacity:t.opacity,
    shadow:t.shadow?{color:t.shadow.color,blur:t.shadow.blur,offsetX:t.shadow.offsetX,offsetY:t.shadow.offsetY}:null,
    text:t.type==='textbox'?{fontFamily:t.fontFamily,fontWeight:t.fontWeight,fontStyle:t.fontStyle,charSpacing:t.charSpacing,lineHeight:t.lineHeight,textAlign:t.textAlign,underline:t.underline}:null};
  toast('Estilo copiado');refreshProps();
}
function pasteStyle(o){
  if(!styleClip)return;const c=styleClip;
  leaves(o).forEach(t=>{
    t.set({stroke:c.stroke,strokeWidth:c.strokeWidth,strokeDashArray:c.strokeDashArray,opacity:c.opacity,shadow:c.shadow?new fabric.Shadow(c.shadow):null});
    if(t.type!=='image'){if(c._g){t._g={...c._g};setGrad(t)}else{t._g=null;t.set('fill',c.fill)}}
    if(c.text&&t.type==='textbox'){t.set(c.text);t.initDimensions()}
    t.dirty=true;
  });
  commit();refreshProps();
}
let ratioLock=true;
function numSection(o){
  const r=o.getBoundingRect(true,true),mk=(lab,val,fn)=>{const i=h('input',{type:'number',value:Math.round(val)});i.onchange=()=>{const v=parseFloat(i.value);if(!isFinite(v))return;fn(v);o.setCoords();commit();refreshProps()};return h('label',{},lab,i)};
  const scaleTo=(k,kk)=>{o.set({scaleX:o.scaleX*k,scaleY:o.scaleY*kk});const nr=o.getBoundingRect(true,true);o.set({left:o.left+(r.left+r.width/2-(nr.left+nr.width/2)),top:o.top+(r.top+r.height/2-(nr.top+nr.height/2))})};
  return h('div',{style:'margin-top:8px'},h('div',{class:'num'},
    mk('X',r.left,v=>o.set('left',o.left+v-r.left)),mk('Y',r.top,v=>o.set('top',o.top+v-r.top)),
    mk('Ancho',r.width,v=>{const k=v/r.width;scaleTo(k,ratioLock?k:1)}),mk('Alto',r.height,v=>{const k=v/r.height;scaleTo(ratioLock?k:1,k)})),
    h('div',{class:'row'},ibtn(ratioLock?'lock':'unlock',ratioLock,()=>{ratioLock=!ratioLock;refreshProps()},'Mantener proporción','Proporción')));
}
let showGrid=false;
$('grid').onclick=()=>{showGrid=!showGrid;$('grid').classList.toggle('on',showGrid);cv.requestRenderAll()};
cv.on('before:render',()=>{});
cv.on('after:render',()=>{
  if(!showGrid)return;const ctx=cv.contextContainer;ctx.save();ctx.transform(...cv.viewportTransform);
  const step=Math.max(10,Math.round(Math.min(W,H)/20/10)*10);ctx.strokeStyle='rgba(108,76,241,.28)';ctx.lineWidth=1/zoom;ctx.beginPath();
  for(let x=step;x<W;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=step;y<H;y+=step){ctx.moveTo(0,y);ctx.lineTo(W,y)}
  ctx.stroke();ctx.strokeStyle='rgba(255,61,165,.45)';ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();ctx.restore();
});
/* Menú contextual */
const ctx_=$('ctx');
function hideCtx(){ctx_.classList.remove('on')}
$('stage').addEventListener('contextmenu',e=>{
  e.preventDefault();const t=cv.findTarget(e,false);
  if(t&&!t.isBg&&cv.getActiveObject()!==t&&!cv.getActiveObjects().includes(t)){cv.setActiveObject(t);cv.requestRenderAll()}
  const a=cv.getActiveObject();ctx_.textContent='';
  const item=(i,l,fn)=>ctx_.append(h('button',{onclick:()=>{hideCtx();fn()}},ic(i),l));
  if(a){item('copy','Duplicar',dup);item('copy','Copiar',copy);item('brush','Copiar estilo',()=>copyStyle(a));if(styleClip)item('brush','Pegar estilo',()=>pasteStyle(a))}
  if(clip)item('pagecopy','Pegar',pasteClip);
  if(a){ctx_.append(h('hr'));item('front','Traer al frente',()=>order(a,'front'));item('back','Enviar al fondo',()=>order(a,'back'));
    const lk=tg(a).every(x=>x.locked);item(lk?'unlock':'lock',lk?'Desbloquear':'Bloquear',()=>{setLock(a,!lk);commit();refreshProps()});
    if(a.type==='activeSelection')item('group','Agrupar',group);if(a.type==='group')item('ungroup','Desagrupar',ungroup);
    ctx_.append(h('hr'));item('trash','Eliminar',del)}
  if(!ctx_.children.length)return;
  ctx_.classList.add('on');ctx_.style.left=Math.min(e.clientX,innerWidth-210)+'px';ctx_.style.top=Math.min(e.clientY,innerHeight-ctx_.offsetHeight-8)+'px';
});
addEventListener('mousedown',e=>{if(!ctx_.contains(e.target))hideCtx()});
addEventListener('scroll',hideCtx,true);

/* ---------- Capas ---------- */
function objName(o){
  if(o.type==='textbox')return (o.text||'Texto').replace(/\n/g,' ').slice(0,22);
  if(o.name)return o.name;
  return ({image:'Imagen',group:'Grupo',rect:'Forma',circle:'Círculo',polygon:'Forma',path:'Forma',triangle:'Triángulo',ellipse:'Elipse',line:'Línea',text:'Emoji'})[o.type]||o.type;
}
function refreshLayers(){
  const L=$('layers');L.textContent='';const act=cv.getActiveObjects();
  const list=cv.getObjects().filter(o=>!o.isBg&&!o.excludeFromExport).slice().reverse();
  if(!list.length)L.append(h('div',{class:'hint',style:'margin-top:8px'},'Aún no hay elementos.'));
  list.forEach(ob=>L.append(h('div',{class:'l'+(act.includes(ob)?' on':''),onclick:()=>{cv.discardActiveObject();cv.setActiveObject(ob);cv.requestRenderAll()}},
    ic(ob.type==='textbox'?'layerT':ob.type==='image'?'layerImg':ob.type==='group'?'layerGrp':'layerShape'),h('span',{class:'nm'},objName(ob)),
    h('button',{class:'mini',title:'Mostrar/ocultar',onclick:e=>{e.stopPropagation();ob.visible=!ob.visible;if(!ob.visible&&act.includes(ob))cv.discardActiveObject();commit()}},ic(ob.visible?'eye':'eyeoff')),
    h('button',{class:'mini',title:'Bloquear/desbloquear',onclick:e=>{e.stopPropagation();setLock(ob,!ob.locked);commit();refreshProps()}},ic(ob.locked?'lock':'unlock')))));
}
function refresh(){refreshProps();refreshLayers();renderPages();if(typeof renderPins==='function')renderPins()}

/* ---------- Páginas ---------- */
function renderPages(){
  const B=$('pages');B.textContent='';
  pages.forEach((_,i)=>B.append(h('div',{class:'pg'+(i===cur?' on':''),style:thumbs[i]?'':`width:${Math.round(76*W/H)}px`,onclick:()=>goPage(i)},
    thumbs[i]?h('img',{src:thumbs[i]}):null,h('span',{class:'n'},String(i+1)))));
  B.append(h('div',{class:'pg ph',title:'Añadir página',onclick:addPage},ic('plus')));
  B.append(h('div',{class:'pgact'},h('div',{class:'row'},ibtn('chevL',0,()=>movePage(-1),'Mover a la izquierda'),ibtn('chevR',0,()=>movePage(1),'Mover a la derecha')),h('div',{class:'row'},ibtn('pagecopy',0,dupPage,'Duplicar página'),ibtn('trash',0,delPage,'Eliminar página'))));
}
function movePage(d){
  const j=cur+d;if(j<0||j>=pages.length)return;saveCur();thumbs[cur]=thumb();
  [pages[cur],pages[j]]=[pages[j],pages[cur]];[thumbs[cur],thumbs[j]]=[thumbs[j],thumbs[cur]];cur=j;renderPages();autosave();
}
async function goPage(i){
  if(i===cur||i<0||i>=pages.length)return;
  saveCur();thumbs[cur]=thumb();cur=i;cv.discardActiveObject();
  await loadAsync(pages[i]);await ensureFonts();ensureBg();resetHist();refresh();
}
function addPage(){
  saveCur();thumbs[cur]=thumb();
  pages.splice(cur+1,0,null);thumbs.splice(cur+1,0,null);cur++;
  cv.discardActiveObject();lock=true;cv.getObjects().slice().forEach(o=>cv.remove(o));setBg('#ffffff');lock=false;
  saveCur();thumbs[cur]=thumb();resetHist();refresh();autosave();
}
async function dupPage(){
  saveCur();thumbs[cur]=thumb();
  pages.splice(cur+1,0,JSON.parse(JSON.stringify(pages[cur])));thumbs.splice(cur+1,0,thumbs[cur]);cur++;
  await loadAsync(pages[cur]);await ensureFonts();resetHist();refresh();autosave();
}
async function delPage(){
  if(pages.length===1){cv.discardActiveObject();batch(()=>{cv.getObjects().slice().forEach(o=>cv.remove(o));setBg('#ffffff')});return}
  pages.splice(cur,1);thumbs.splice(cur,1);cur=Math.min(cur,pages.length-1);
  await loadAsync(pages[cur]);await ensureFonts();ensureBg();resetHist();refresh();autosave();
}

/* ---------- Tamaño (redimensión mágica) ---------- */
function syncSize(){
  const s=$('size'),v=`${W}x${H}`;
  if(![...s.options].some(o=>o.value===v)){const op=h('option',{value:v},`Personalizado ${W}×${H}`);s.insertBefore(op,s.querySelector('[value=custom]'))}
  s.value=v;
}
function buildSizes(){
  const s=$('size');s.textContent='';
  SIZES.forEach(([n,w,hh])=>s.append(h('option',{value:`${w}x${hh}`},`${n} · ${w}×${hh}`)));
  s.append(h('option',{value:'custom'},'Tamaño personalizado…'));
}
function transformPage(ow,oh,nw,nh){
  const s=Math.min(nw/ow,nh/oh),ox=(nw-ow*s)/2,oy=(nh-oh*s)/2;
  cv.getObjects().forEach(o=>{
    if(o.isBg){if(o.type==='image')cover(o,nw,nh);else{o.set({width:nw,height:nh,left:nw/2,top:nh/2});if(o._g)setGrad(o)}}
    else o.set({left:o.left*s+ox,top:o.top*s+oy,scaleX:o.scaleX*s,scaleY:o.scaleY*s});
    o.setCoords();
  });
}
async function resizeAll(nw,nh){
  const ow=W,oh=H;if(nw===ow&&nh===oh)return;
  saveCur();cv.discardActiveObject();W=nw;H=nh;syncSize();fit();
  for(let i=0;i<pages.length;i++){
    await loadAsync(pages[i]);await ensureFonts();transformPage(ow,oh,nw,nh);cv.renderAll();pages[i]=cv.toJSON(CUSTOM);thumbs[i]=thumb();
  }
  await loadAsync(pages[cur]);await ensureFonts();resetHist();refresh();autosave();
  if(typeof collabBroadcastState==='function')collabBroadcastState();
}
$('size').onchange=e=>{
  const v=e.target.value;
  if(v==='custom'){
    const r=prompt('Ancho × alto en píxeles (100–4000), por ejemplo 1500x500',`${W}x${H}`);
    const m=r&&r.match(/(\d+)\s*[x×*,]\s*(\d+)/i);
    if(m)resizeAll(clamp(+m[1],100,4000),clamp(+m[2],100,4000));else syncSize();
    return;
  }
  const [w,hh]=v.split('x').map(Number);resizeAll(w,hh);
};

/* ---------- Exportar / abrir ---------- */
function download(url,name){const a=h('a',{href:url,download:name});document.body.append(a);a.click();a.remove()}
const safeName=()=>($('name').value||'diseno').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-')||'diseno';
function pageCanvas(bp,sc){
  const bgs=cv.getObjects().filter(o=>o.isBg),saved=bgs.map(o=>({o,w:o.width,h:o.height,sx:o.scaleX,sy:o.scaleY}));
  if(bp>0)bgs.forEach(o=>{
    if(o.type==='image'){const k=Math.max((W+2*bp)/W,(H+2*bp)/H);o.set({scaleX:o.scaleX*k,scaleY:o.scaleY*k})}
    else{o.set({width:W+2*bp,height:H+2*bp});if(o._g)setGrad(o)}
  });
  const el=cv.toCanvasElement(sc/zoom,{left:-bp*zoom,top:-bp*zoom,width:(W+2*bp)*zoom,height:(H+2*bp)*zoom});
  saved.forEach(s=>{s.o.set({width:s.w,height:s.h,scaleX:s.sx,scaleY:s.sy});if(s.o._g)setGrad(s.o)});
  return el;
}
function drawMarks(pdf,x0,y0,pw,ph,bleed){
  pdf.setDrawColor(0,0,0);pdf.setLineWidth(.15);const gap=bleed+1,len=4;
  [[x0,y0,-1,-1],[x0+pw,y0,1,-1],[x0,y0+ph,-1,1],[x0+pw,y0+ph,1,1]].forEach(([x,y,sx,sy])=>{
    pdf.line(x+sx*gap,y,x+sx*(gap+len),y);pdf.line(x,y+sy*gap,x,y+sy*(gap+len));
  });
}
async function exportPDF(sc,print){
  const {jsPDF}=window.jspdf;saveCur();const orig=cur;let pdf;
  const pxmm=print?print.dpi/25.4:1,b=print?print.bleed:0,bp=b*pxmm,slug=print&&print.marks?6:0;
  const pw=W/pxmm,ph=H/pxmm,PW=pw+2*(b+slug),PH=ph+2*(b+slug);
  for(let i=0;i<pages.length;i++){
    await loadAsync(pages[i]);await ensureFonts();
    if(print){
      const url=pageCanvas(bp,sc).toDataURL('image/jpeg',.96);
      if(!pdf)pdf=new jsPDF({orientation:PW>PH?'l':'p',unit:'mm',format:[PW,PH]});else pdf.addPage([PW,PH],PW>PH?'l':'p');
      pdf.addImage(url,'JPEG',slug,slug,pw+2*b,ph+2*b);
      if(print.marks)drawMarks(pdf,slug+b,slug+b,pw,ph,b);
    }else{
      const url=cv.toDataURL({format:'jpeg',quality:.95,multiplier:sc/zoom});
      if(!pdf)pdf=new jsPDF({orientation:W>H?'l':'p',unit:'px',format:[W,H],hotfixes:['px_scaling']});else pdf.addPage([W,H],W>H?'l':'p');
      pdf.addImage(url,'JPEG',0,0,W,H);
    }
  }
  await loadAsync(pages[orig]);await ensureFonts();refresh();pdf.save(safeName()+'.pdf');
}
async function renderAllPages(fmt,mult,transparent){
  saveCur();const orig=cur,out=[];cv.discardActiveObject();guides=[];
  for(let i=0;i<pages.length;i++){
    await loadAsync(pages[i]);await ensureFonts();
    const bgs=cv.getObjects().filter(o=>o.isBg),oc=cv.backgroundColor;
    if(transparent){bgs.forEach(o=>o.visible=false);cv.backgroundColor=null}
    out.push(cv.toDataURL({format:fmt,quality:.92,multiplier:mult/zoom}));
    if(transparent){bgs.forEach(o=>o.visible=true);cv.backgroundColor=oc}
  }
  await loadAsync(pages[orig]);await ensureFonts();refresh();return out;
}
let presImgs=null,presI=0;
async function present(){
  toast('Preparando presentación…');presImgs=await renderAllPages('jpeg',1.5);presI=0;showPres();$('pres').classList.add('on');
  try{await $('pres').requestFullscreen()}catch(e){}
}
function showPres(){$('presImg').src=presImgs[presI];$('presN').textContent=`${presI+1} / ${presImgs.length}`}
function closePres(){presImgs=null;$('pres').classList.remove('on');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
$('present').onclick=present;$('presX').onclick=e=>{e.stopPropagation();closePres()};
$('pres').onclick=e=>{if(!presImgs)return;const x=e.clientX/innerWidth;if(x<.3)presI=Math.max(0,presI-1);else presI=Math.min(presImgs.length-1,presI+1);showPres()};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presImgs)closePres()});
async function doExport(){
  endCrop(true);
  const fmt=$('xf').value,sc=+$('xs').value,base=safeName();
  cv.discardActiveObject();guides=[];cv.renderAll();
  try{
    if(fmt==='pngall'){const imgs=await renderAllPages('png',sc,$('xt').value==='1');for(let i=0;i<imgs.length;i++){download(imgs[i],`${base}-${i+1}.png`);await sleep(350)}}
    else if(fmt==='png'&&$('xt').value==='1'){const bgs=cv.getObjects().filter(o=>o.isBg),oc=cv.backgroundColor;bgs.forEach(o=>o.visible=false);cv.backgroundColor=null;
      const u=cv.toDataURL({format:'png',multiplier:sc/zoom});bgs.forEach(o=>o.visible=true);cv.backgroundColor=oc;cv.requestRenderAll();download(u,`${base}.png`)}
    else if(fmt==='png'||fmt==='jpg')download(cv.toDataURL({format:fmt==='jpg'?'jpeg':'png',quality:.95,multiplier:sc/zoom}),`${base}.${fmt}`);
    else if(fmt==='svg')download(URL.createObjectURL(new Blob([cv.toSVG({viewBox:{x:0,y:0,width:W,height:H},width:W,height:H})],{type:'image/svg+xml'})),`${base}.svg`);
    else if(fmt==='clip'){const blob=await new Promise(r=>cv.toCanvasElement(Math.min(sc,2)/zoom).toBlob(r,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('Imagen copiada al portapapeles')}
    else if(fmt==='pdf')await exportPDF(sc,$('xm').value==='print'?{dpi:+$('xdpi').value||96,bleed:+$('xbleed').value||0,marks:$('xmarks').checked}:null);
    else if(fmt==='webm')await exportVideo(base);
    else download(URL.createObjectURL(new Blob([JSON.stringify(projectObj())],{type:'application/json'})),`${base}.json`);
    if(fmt!=='clip')toast('¡Descargado!');
  }catch(e){toast('Error al exportar')}
  $('mExport').classList.remove('on');
}
function syncExportUi(){
  const f=$('xf').value;$('xmWrap').style.display=f==='pdf'?'':'none';
  $('xprint').style.display=(f==='pdf'&&$('xm').value==='print')?'':'none';
  const d=+$('xdpi').value||96,bl=$('xbleed').value;
  $('xsize').textContent=`Tamaño final: ${(W/d*25.4).toFixed(0)} × ${(H/d*25.4).toFixed(0)} mm`+(bl!=='0'?` (más ${bl} mm de sangrado por lado)`:'');
}
['xf','xm','xdpi','xbleed'].forEach(id=>$(id).addEventListener('change',syncExportUi));
function guessDpi(){const m=Math.max(W,H),n=Math.min(W,H),near=(x,y)=>Math.abs(x-y)<6;if(near(m,1754)&&near(n,1240))return 150;if(near(m,3508)&&near(n,2480))return 300;return 96}
$('export').onclick=()=>{endCrop(true);$('xdpi').value=String(guessDpi());syncExportUi();$('mExport').classList.add('on')};
$('xc').onclick=()=>$('mExport').classList.remove('on');$('xd').onclick=doExport;
$('help').onclick=()=>$('mHelp').classList.add('on');$('hc').onclick=()=>$('mHelp').classList.remove('on');
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('mousedown',e=>{if(e.target===m)m.classList.remove('on')}));
$('open').onclick=()=>$('fileJson').click();
$('fileJson').onchange=e=>{const f=e.target.files[0];if(!f)return;if(fileKind(f)==='pdf'){handleFiles([f]);e.target.value='';return}const r=new FileReader();
  r.onload=async()=>{try{await loadProject(JSON.parse(r.result));toast('Proyecto abierto')}catch(err){toast('Archivo no válido')}};r.readAsText(f);e.target.value=''};
async function loadProject(p){
  if(!p.pages&&p.c)p={pages:[p.c],W:p.W,H:p.H};
  W=p.W||1080;H=p.H||1080;pages=p.pages;pages.forEach(pg=>(pg.objects||[]).forEach(markCors));thumbs=p.thumbs||pages.map(()=>null);cur=clamp(p.cur||0,0,pages.length-1);cloud.id=p.cloudId||null;cloud.viewId=null;cloud.role=p.cloudId?'owner':null;userGuides=(Array.isArray(p.guides)?p.guides:[]).filter(g=>g&&(g.o==='h'||g.o==='v')&&isFinite(g.pos)).map(g=>({o:g.o,pos:+g.pos}));
  if(p.name)$('name').value=p.name;syncSize();fit();cv.discardActiveObject();
  await loadAsync(pages[cur]);await ensureFonts();ensureBg();resetHist();refresh();
}
$('name').oninput=()=>{clearTimeout(chT);chT=setTimeout(autosave,600)};
$('theme').onclick=()=>{const d=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=d;store.set('lienzo-theme',d)};
{const th=store.get('lienzo-theme');if(th==='dark'||(!th&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='dark'}

/* ---------- Guardar (Ctrl+S) ---------- */
function saveNow(){
  if(SB.cfg()&&SB.sess())cloudSave().then(()=>toast('Guardado en la nube')).catch(err=>toast(err.message||'No se pudo guardar'));
  else{download(URL.createObjectURL(new Blob([JSON.stringify(projectObj())],{type:'application/json'})),safeName()+'.json');toast('Proyecto descargado (.json). Inicia sesión en Nube para guardar online')}
}

/* ---------- Teclado ---------- */
addEventListener('keydown',e=>{
  if(presImgs){
    if(e.key==='Escape'){closePres()}
    else if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)){presI=Math.min(presImgs.length-1,presI+1);showPres()}
    else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){presI=Math.max(0,presI-1);showPres()}
    e.preventDefault();return;
  }
  if(e.key==='Escape'){const md=document.querySelector('.modal.on');if(md){md.classList.remove('on');return}}
  if(/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;
  const a=cv.getActiveObject();if(a&&a.isEditing)return;
  if(cropMode){if(e.key==='Enter'){e.preventDefault();endCrop(true)}else if(e.key==='Escape'){e.preventDefault();endCrop(false)}return}
  const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(e.key==='Escape'){if(drawing)setDrawing(false);cv.discardActiveObject();cv.requestRenderAll();document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'));return}
  if(e.key==='Delete'||e.key==='Backspace'){del();e.preventDefault();return}
  if(mod&&k==='s'){e.preventDefault();saveNow();return}
  if(mod&&k==='k'){e.preventDefault();const q=$('aiq');if(q)q.focus();return}
  if(mod&&k==='z'){restore(e.shiftKey?hi+1:hi-1);e.preventDefault();return}
  if(mod&&k==='y'){restore(hi+1);e.preventDefault();return}
  if(mod&&k==='d'){dup();e.preventDefault();return}
  if(mod&&e.altKey&&k==='c'&&a){e.preventDefault();copyStyle(a);return}
  if(mod&&e.altKey&&k==='v'&&a){e.preventDefault();pasteStyle(a);return}
  if(mod&&k==='c'){copy();return}
  if(mod&&k==='x'){copy();del();e.preventDefault();return}
  if(mod&&k==='a'){e.preventDefault();cv.discardActiveObject();const s=cv.getObjects().filter(o=>!o.isBg&&o.selectable!==false&&o.visible);if(s.length){cv.setActiveObject(new fabric.ActiveSelection(s,{canvas:cv}));cv.requestRenderAll()}return}
  if(mod&&k==='g'){e.preventDefault();e.shiftKey?ungroup():group();return}
  if(mod&&k==='0'){e.preventDefault();fit();return}
  if(mod&&(k==='='||k==='+')){e.preventDefault();setZoom(zoom*1.2);return}
  if(mod&&k==='-'){e.preventDefault();setZoom(zoom/1.2);return}
  if(!mod&&!e.altKey&&!e.shiftKey&&!presImgs){
    const shp=n=>SHAPES.find(q=>q[0]===n)[3]();
    if(k==='t'){addText('Añade un título',{fontSize:.08*S_(),fontWeight:800});return}
    if(k==='r'){addObj(shp('Rectángulo'),'Rectángulo');return}
    if(k==='o'){addObj(shp('Círculo'),'Círculo');return}
    if(k==='l'){addObj(shp('Línea'),'Línea');return}
    if(k==='p'){setDrawing(!drawing);return}
    if(k==='g'){$('grid').click();return}
  }
  if(a&&e.key===']'){order(a,'fwd');return}
  if(a&&e.key==='['){order(a,'bwd');return}
  if(a&&e.key.startsWith('Arrow')&&!a.locked){
    const d=e.shiftKey?10:1;
    if(e.key==='ArrowLeft')a.left-=d;if(e.key==='ArrowRight')a.left+=d;if(e.key==='ArrowUp')a.top-=d;if(e.key==='ArrowDown')a.top+=d;
    a.setCoords();cv.requestRenderAll();e.preventDefault();clearTimeout(nudgeT);nudgeT=setTimeout(()=>{push();refreshProps()},350);
  }
});
let nudgeT;

/* ---------- Dibujo libre, QR y tablas ---------- */
const drawCfg={color:'#6c4cf1',width:8,kind:'pencil'};let drawing=false;
function setDrawing(on,keep){
  drawing=on;cv.isDrawingMode=on;
  if(on){const b=new fabric.PencilBrush(cv);b.color=drawCfg.kind==='marker'?new fabric.Color(drawCfg.color).setAlpha(.45).toRgba():drawCfg.color;b.width=drawCfg.kind==='marker'?drawCfg.width*2.2:drawCfg.width;cv.freeDrawingBrush=b;cv.discardActiveObject();if(!keep)toast('Modo dibujo activo (Esc para salir)')}
  cv.requestRenderAll();if(!keep&&tab==='el')showPanel();
}
cv.on('path:created',e=>{e.path.set({name:'Trazo',strokeLineCap:'round',strokeLineJoin:'round'})});
function addQR(text,fg,bgc){
  if(!window.qrcode){toast('No se pudo cargar el generador de QR (necesita conexión)');return}
  if(!text.trim()){toast('Escribe el texto o enlace del QR');return}
  const qr=qrcode(0,'M');qr.addData(text.trim());qr.make();const n=qr.getModuleCount();let d='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))d+=`M${c} ${r}h1v1h-1z`;
  const m=2,back=new fabric.Rect({width:n+2*m,height:n+2*m,fill:bgc,left:n/2,top:n/2,strokeWidth:0});
  const path=new fabric.Path(d,{fill:fg,strokeWidth:0,left:n/2,top:n/2});
  const g=new fabric.Group([back,path]);g.scaleToWidth(S_()*.3);addObj(g,'Código QR');
}
async function addTable(r,c){
  r=clamp(r|0||4,1,12);c=clamp(c|0||3,1,8);await ensureFonts(['Poppins']);
  const S=S_(),cw=S*.7/c,ch=S*.085,br=getBrand(),objs=[];
  for(let i=0;i<r;i++)for(let j=0;j<c;j++){
    const x=-S*.35+cw*(j+.5),y=-r*ch/2+ch*(i+.5),head=i===0;
    objs.push(new fabric.Rect({width:cw,height:ch,left:x,top:y,fill:head?br[0]:(i%2?'#ffffff':'#f4f5fa'),stroke:'#cfd5e3',strokeWidth:1}));
    objs.push(new fabric.Textbox(head?`Título ${j+1}`:'Celda',{width:cw*.9,left:x,top:y,fontSize:S*.026,fontFamily:'Poppins',fontWeight:head?700:400,fill:head?'#ffffff':'#1f2430',textAlign:'center'}));
  }
  addObj(new fabric.Group(objs),'Tabla');
}

/* ---------- Mis plantillas ---------- */
const utLocal={get(){try{return JSON.parse(store.get('lienzo-utpl'))||[]}catch(e){return[]}},set(arr){return store.set('lienzo-utpl',JSON.stringify(arr))}};
async function utList(){
  const out=utLocal.get().map(t=>Object.assign({},t,{src:'local'}));
  if(SB.cfg()&&SB.sess()){
    try{const rows=await sbReq('/rest/v1/user_templates?select=id,name,width,height,thumb,created_at&order=created_at.desc');
      rows.forEach(r=>out.push({id:r.id,name:r.name,w:r.width,h:r.height,thumb:r.thumb,src:'cloud'}))}
    catch(e){out.cloudErr=e.message}
  }
  return out;
}
async function utSave(name){
  endCrop(true);saveCur();const json=JSON.parse(JSON.stringify(pages[cur])),th=thumb();
  if(SB.cfg()&&SB.sess()){
    try{const stored=await externalizeImages({pages:[json]});
      await sbReq('/rest/v1/user_templates',{method:'POST',body:{name,width:W,height:H,data:stored.pages[0],thumb:th}});return 'cloud'}
    catch(e){toast('No se pudo guardar en tu cuenta ('+e.message+'). Se guarda en este navegador')}
  }
  const arr=utLocal.get();arr.unshift({id:rid(),name,w:W,h:H,json,thumb:th,t:Date.now()});while(arr.length>8)arr.pop();
  if(!utLocal.set(arr))throw new Error('No cabe en el almacenamiento del navegador (imágenes muy grandes). Inicia sesión para guardarla en tu cuenta');
  return 'local';
}
async function utApply(t){
  let json=t.json,w=t.w,hh=t.h;
  if(t.src==='cloud'){const r=await sbReq(`/rest/v1/user_templates?id=eq.${t.id}&select=data,width,height`);if(!r||!r[0])throw new Error('No se encontró la plantilla');json=r[0].data;w=r[0].width;hh=r[0].height}
  json=JSON.parse(JSON.stringify(json));(json.objects||[]).forEach(markCors);document.body.classList.remove('sp');
  if(w&&hh&&(w!==W||hh!==H))await resizeAll(w,hh);
  cv.discardActiveObject();await loadAsync(json);await ensureFonts();ensureBg();push();refresh();
}
async function utDelete(t){if(t.src==='cloud')await sbReq(`/rest/v1/user_templates?id=eq.${t.id}`,{method:'DELETE'});else utLocal.set(utLocal.get().filter(x=>x.id!==t.id))}
function utSection(){
  const wrap=h('div',{style:'margin-top:16px'},h('h3',{},'Mis plantillas'));
  const grid=h('div',{class:'grid g2'}),status=h('div',{class:'hint',style:'margin:6px 0'});
  const load=async()=>{
    grid.textContent='';const items=await utList();
    status.textContent=items.cloudErr?('Plantillas de tu cuenta no disponibles: '+items.cloudErr):(items.length?'':'Aún no tienes plantillas propias.');
    items.forEach(t=>{const th=safeImg(t.thumb);
      grid.append(h('div',{class:'tpl',style:`background:${th?`url(${th}) center/cover`:'#8b93a5'};position:relative`,title:t.name+(t.src==='local'?' (este navegador)':' (tu cuenta)'),onclick:()=>utApply(t).catch(e=>toast(e.message))},
        h('span',{style:'background:rgba(0,0,0,.55);padding:1px 6px;border-radius:6px'},t.name),
        h('button',{class:'x',title:'Eliminar plantilla',style:'position:absolute;top:4px;right:4px',onclick:async e=>{e.stopPropagation();if(!confirm('¿Eliminar esta plantilla?'))return;try{await utDelete(t);load()}catch(err){toast(err.message)}}},'×')));
    });
  };
  wrap.append(h('button',{class:'btn wide on',onclick:async()=>{
    const n=prompt('Nombre de la plantilla',$('name').value||'Mi plantilla');if(n===null||!n.trim())return;
    try{const where=await utSave(n.trim().slice(0,60));toast(where==='cloud'?'Plantilla guardada en tu cuenta':'Plantilla guardada en este navegador');load()}catch(e){toast(e.message)}}},'Guardar esta página como plantilla'),status,grid);
  load();return wrap;
}

/* ---------- Animaciones ---------- */
const ANIMS=[['','Ninguna'],['fade','Aparecer'],['up','Subir'],['down','Bajar'],['left','Entrar por la derecha'],['right','Entrar por la izquierda'],['zoom','Zoom'],['pop','Pop'],['spin','Girar']];
const easeOut=p=>1-Math.pow(1-p,3);
const easeBack=p=>{const c=2.70158;return 1+c*Math.pow(p-1,3)+(c-1)*Math.pow(p-1,2)};
function applyAnim(o,t){
  const a=o._anim,b=o.__base;if(!a||!b)return;
  const p=clamp((t-(a.delay||0))/(a.dur||.8),0,1),e=easeOut(p),st={left:b.left,top:b.top,scaleX:b.scaleX,scaleY:b.scaleY,opacity:b.opacity,angle:b.angle};
  switch(a.type){
    case'fade':st.opacity=b.opacity*e;break;
    case'up':st.top=b.top+(1-e)*H*.08;st.opacity=b.opacity*e;break;
    case'down':st.top=b.top-(1-e)*H*.08;st.opacity=b.opacity*e;break;
    case'left':st.left=b.left+(1-e)*W*.12;st.opacity=b.opacity*e;break;
    case'right':st.left=b.left-(1-e)*W*.12;st.opacity=b.opacity*e;break;
    case'zoom':{const k=.6+.4*e;st.scaleX=b.scaleX*k;st.scaleY=b.scaleY*k;st.opacity=b.opacity*e;break}
    case'pop':{const k=easeBack(p);st.scaleX=b.scaleX*k;st.scaleY=b.scaleY*k;st.opacity=b.opacity*Math.min(1,p*5);break}
    case'spin':{const k=.5+.5*e;st.angle=b.angle-(1-e)*180;st.scaleX=b.scaleX*k;st.scaleY=b.scaleY*k;st.opacity=b.opacity*e;break}
  }
  o.set(st);
}
function runAnim(objs,end,onFrame){
  return new Promise(res=>{
    objs.forEach(o=>{o.__base={left:o.left,top:o.top,scaleX:o.scaleX,scaleY:o.scaleY,opacity:o.opacity,angle:o.angle}});
    const t0=performance.now();
    const tick=now=>{
      const t=(now-t0)/1000;objs.forEach(o=>applyAnim(o,t));cv.renderAll();onFrame&&onFrame(t);
      if(t<end)requestAnimationFrame(tick);
      else{objs.forEach(o=>{o.set(o.__base);o.setCoords();delete o.__base});cv.renderAll();res()}
    };
    requestAnimationFrame(tick);
  });
}
const animEnd=objs=>(objs.length?Math.max(...objs.map(o=>(o._anim.delay||0)+(o._anim.dur||.8))):0)+.5;
let animBusy=false;
async function previewAnim(){
  if(animBusy)return;cv.discardActiveObject();
  const objs=cv.getObjects().filter(o=>!o.isBg&&o._anim);
  if(!objs.length){toast('Añade una animación a algún elemento');return}
  animBusy=true;try{await runAnim(objs,animEnd(objs))}finally{animBusy=false;refresh()}
}
async function exportVideo(base){
  if(!window.MediaRecorder){toast('Tu navegador no puede grabar vídeo');return}
  const sc=Math.min(1,1280/W),rw=Math.round(W*sc)&~1,rh=Math.round(H*sc)&~1;
  const rc=document.createElement('canvas');rc.width=rw;rc.height=rh;const rx=rc.getContext('2d');
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(rc.captureStream(30),{mimeType:mime,videoBitsPerSecond:6e6}),chunks=[];
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const done=new Promise(r=>{rec.onstop=r});
  toast('Grabando vídeo… mantén esta pestaña visible');
  saveCur();const orig=cur;cv.discardActiveObject();guides=[];animBusy=true;
  const frame=()=>{rx.fillStyle='#fff';rx.fillRect(0,0,rw,rh);rx.drawImage(cv.toCanvasElement(rw/(W*zoom)),0,0,rw,rh)};
  try{
    rec.start();
    for(let i=0;i<pages.length;i++){
      await loadAsync(pages[i]);await ensureFonts();
      const objs=cv.getObjects().filter(o=>!o.isBg&&o._anim);
      await runAnim(objs,animEnd(objs)+(objs.length?.8:1.8),frame);
    }
    rec.stop();await done;
  }finally{animBusy=false;await loadAsync(pages[orig]);await ensureFonts();refresh()}
  download(URL.createObjectURL(new Blob(chunks,{type:'video/webm'})),`${base}.webm`);
}
function animSection(o){
  const T_=tg(o),a0=T_[0]._anim||{type:'',dur:.8,delay:0};
  const sel=h('select',{class:'sel'},ANIMS.map(([v,l])=>h('option',{value:v},l)));sel.value=a0.type||'';
  const upd=(k,v)=>T_.forEach(t=>{t._anim=Object.assign({type:'fade',dur:.8,delay:0},t._anim||{},{[k]:v})});
  sel.onchange=()=>{if(!sel.value)T_.forEach(t=>{t._anim=null});else upd('type',sel.value);push();refreshProps()};
  return sec('Animación',h('div',{class:'fld'},sel),
    a0.type&&rng('Duración (s)',.2,3,.1,a0.dur||.8,v=>upd('dur',v)),
    a0.type&&rng('Retraso (s)',0,8,.1,a0.delay||0,v=>upd('delay',v)),
    ibtn('play',0,previewAnim,'Vista previa','Vista previa'));
}
const hexOf=c=>{try{const q=new fabric.Color(c);return q.getAlpha()>0?'#'+q.toHex().toLowerCase():null}catch(e){return null}};
function allDocColors(){
  const set=new Set(),add=c=>{if(typeof c==='string'){const x=hexOf(c);if(x)set.add(x)}};
  const walk=o=>{add(o.fill);add(o.stroke);if(o._g){add(o._g.c1);add(o._g.c2)}add(o.textBackgroundColor);(o._objects||[]).forEach(walk)};
  cv.getObjects().forEach(walk);return [...set].slice(0,14);
}
function replaceColor(oldHex,newHex){
  const same=c=>typeof c==='string'&&hexOf(c)===oldHex;
  const rec=c=>{const a=new fabric.Color(c).getAlpha();return a<1?new fabric.Color(newHex).setAlpha(a).toRgba():newHex};
  const walk=o=>{
    if(o._g){['c1','c2'].forEach(k=>{if(same(o._g[k]))o._g[k]=newHex});setGrad(o)}else if(same(o.fill))o.set('fill',rec(o.fill));
    if(same(o.stroke))o.set('stroke',rec(o.stroke));if(same(o.textBackgroundColor))o.set('textBackgroundColor',newHex);
    o.dirty=true;(o._objects||[]).forEach(walk);
  };
  cv.getObjects().forEach(walk);cv.requestRenderAll();
}
function pageColorsSection(){
  const cols=allDocColors();if(!cols.length)return h('span');
  return sec('Colores del diseño',h('div',{class:'hint',style:'margin-bottom:6px'},'Cambia un color y se actualiza en todo el diseño.'),
    h('div',{class:'brand',style:'grid-template-columns:repeat(5,1fr)'},cols.map(c=>{
      let curc=c;const inp=h('input',{type:'color',value:c,title:c});
      inp.oninput=()=>{replaceColor(curc,inp.value.toLowerCase());curc=inp.value.toLowerCase()};
      inp.onchange=()=>{push();refreshProps();refreshLayers()};return inp})));
}
function pageAnimSection(){
  const sel=h('select',{class:'sel'},ANIMS.slice(1).map(([v,l])=>h('option',{value:v},l)));sel.value='up';
  return sec('Animación de la página',h('div',{class:'hint',style:'margin-bottom:6px'},'Anima todos los elementos en cascada. Expórtalo como vídeo WebM desde Exportar.'),h('div',{class:'fld'},sel),
    h('div',{class:'row'},tbtn('Aplicar a todo',0,()=>{let i=0;cv.getObjects().filter(o=>!o.isBg).forEach(o=>{o._anim={type:sel.value,dur:.7,delay:i++*.15}});push();toast('Animación aplicada')}),
      tbtn('Quitar',0,()=>{cv.getObjects().forEach(o=>{o._anim=null});push();toast('Animaciones quitadas')})),
    ibtn('play',0,previewAnim,'Vista previa','Vista previa de animación'));
}

/* ---------- Nube con Supabase (cuentas, guardado, versiones, compartir) ---------- */
const SQL_SCHEMA="-- Lienzo \u00b7 esquema de Supabase\n-- P\u00e9galo en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo varias veces.\n\n-- ============ Dise\u00f1os ============\ncreate table if not exists public.designs (\n  id          uuid primary key default gen_random_uuid(),\n  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,\n  name        text not null default 'Sin t\u00edtulo',\n  width       int  not null,\n  height      int  not null,\n  data        jsonb not null,\n  thumb       text,\n  is_public   boolean not null default false,\n  created_at  timestamptz not null default now(),\n  updated_at  timestamptz not null default now()\n);\n\ncreate index if not exists designs_owner_updated_idx on public.designs (owner, updated_at desc);\n\ncreate or replace function public.set_updated_at()\nreturns trigger language plpgsql as $$\nbegin\n  new.updated_at = now();\n  return new;\nend $$;\n\ndrop trigger if exists designs_set_updated_at on public.designs;\ncreate trigger designs_set_updated_at\n  before update on public.designs\n  for each row execute function public.set_updated_at();\n\nalter table public.designs enable row level security;\n\ndrop policy if exists \"designs_owner_all\" on public.designs;\ncreate policy \"designs_owner_all\" on public.designs\n  for all to authenticated\n  using (owner = auth.uid())\n  with check (owner = auth.uid());\n\n-- Cualquiera (con el enlace) puede LEER los dise\u00f1os marcados como p\u00fablicos.\ndrop policy if exists \"designs_public_read\" on public.designs;\ncreate policy \"designs_public_read\" on public.designs\n  for select to anon, authenticated\n  using (is_public);\n\n-- ============ Historial de versiones ============\ncreate table if not exists public.design_versions (\n  id         bigint generated always as identity primary key,\n  design_id  uuid not null references public.designs(id) on delete cascade,\n  data       jsonb not null,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists design_versions_design_idx on public.design_versions (design_id, created_at desc);\n\nalter table public.design_versions enable row level security;\n\ndrop policy if exists \"versions_owner_all\" on public.design_versions;\ncreate policy \"versions_owner_all\" on public.design_versions\n  for all to authenticated\n  using (exists (select 1 from public.designs d where d.id = design_id and d.owner = auth.uid()))\n  with check (exists (select 1 from public.designs d where d.id = design_id and d.owner = auth.uid()));\n";
const SB={
  cfg(){const w=window.LIENZO_SUPABASE||{};let l={};try{l=JSON.parse(store.get('lienzo-sb'))||{}}catch(e){}
    const url=String(w.url||l.url||'').trim().replace(/\/+$/,''),key=String(w.key||l.key||'').trim();
    return/^https:\/\/.+/.test(url)&&key?{url,key,fixed:!!(w.url&&w.key)}:null},
  sess(){try{return JSON.parse(store.get('lienzo-sb-session'))}catch(e){return null}},
  setSess(v){store.set('lienzo-sb-session',v?JSON.stringify(v):'')},
  norm(j){return{access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),user:j.user}},
  async fresh(){
    const s=SB.sess();if(!s)return null;if(s.expires_at-60>Date.now()/1000)return s;
    try{const c=SB.cfg();const r=await fetch(c.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
      const j=await r.json();if(!r.ok||!j.access_token)throw 0;const n=SB.norm(j);SB.setSess(n);return n}
    catch(e){SB.setSess(null);return null}
  }
};
async function sbReq(path,{method='GET',body,headers={},auth=true}={}){
  const c=SB.cfg();if(!c)throw new Error('Configura Supabase primero');
  let tok=c.key;if(auth){const s=await SB.fresh();if(s)tok=s.access_token}
  const r=await fetch(c.url+path,{method,headers:Object.assign({apikey:c.key,Authorization:'Bearer '+tok,'Content-Type':'application/json'},headers),body:body!==undefined?JSON.stringify(body):undefined});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok)throw new Error((j&&(j.message||j.msg||j.error_description||j.error))||('Error '+r.status));
  return j;
}
async function sbAuth(mode,email,pw){
  const c=SB.cfg();
  const r=await fetch(c.url+(mode==='signup'?'/auth/v1/signup':'/auth/v1/token?grant_type=password'),{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.msg||j.error_description||j.message||j.error||('Error '+r.status));
  if(!j.access_token)return null;
  SB.setSess(SB.norm(j));return SB.sess();
}
async function sbGetDesign(id){
  if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Enlace no válido');
  const r=await sbReq(`/rest/v1/designs?id=eq.${id}&select=id,owner,name,data`);
  if(!r||!r[0])throw new Error('Diseño no encontrado o no es público');return r[0];
}
/* ---- Imágenes en Supabase Storage ---- */
let storageFailed=false;
const upHashes=(()=>{try{return new Set(JSON.parse(store.get('lienzo-up'))||[])}catch(e){return new Set()}})();
async function sha256hex(bytes){const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function uploadImage(dataUrl){
  const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);if(!m)return dataUrl;
  const c=SB.cfg(),s=await SB.fresh();if(!c||!s)return dataUrl;
  const bin=Uint8Array.from(atob(m[2]),ch=>ch.charCodeAt(0)),ext=m[1]==='image/png'?'png':m[1]==='image/jpeg'?'jpg':'webp';
  const key=`${s.user.id}/${await sha256hex(bin)}.${ext}`,url=`${c.url}/storage/v1/object/public/design-images/${key}`;
  if(upHashes.has(key))return url;
  const r=await fetch(`${c.url}/storage/v1/object/design-images/${key}`,{method:'POST',headers:{apikey:c.key,Authorization:'Bearer '+s.access_token,'Content-Type':m[1],'x-upsert':'true','cache-control':'max-age=31536000'},body:bin});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.message||j.error||('Error '+r.status))}
  upHashes.add(key);store.set('lienzo-up',JSON.stringify([...upHashes].slice(-800)));return url;
}
async function externalizeImages(proj){
  if(storageFailed||!SB.sess())return proj;
  const copy=JSON.parse(JSON.stringify(proj));
  const walk=async o=>{
    if(!o||typeof o!=='object')return;
    if(typeof o.src==='string'&&o.src.startsWith('data:image/')){o.src=await uploadImage(o.src);if(o.src.startsWith('http'))o.crossOrigin='anonymous'}
    if(Array.isArray(o.objects))for(const x of o.objects)await walk(x);
    if(o.clipPath)await walk(o.clipPath);
  };
  try{for(const pg of copy.pages)for(const o of (pg.objects||[]))await walk(o)}
  catch(e){storageFailed=true;toast('No se pudo usar Supabase Storage ('+(e.message||'error')+'). Las imágenes se guardan dentro del diseño.');return proj}
  return copy;
}
function markCors(o){
  if(!o||typeof o!=='object')return;
  if(typeof o.src==='string'&&/^https?:/.test(o.src))o.crossOrigin='anonymous';
  if(Array.isArray(o.objects))o.objects.forEach(markCors);if(o.clipPath)markCors(o.clipPath);
}
const safeImg=u=>typeof u==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(u)?u:'';
let cloudT;
function scheduleCloud(){
  if(!cloud.id||!SB.cfg()||!SB.sess())return;clearTimeout(cloudT);
  cloudT=setTimeout(()=>cloudSave({quiet:true}).catch(()=>{$('saved').textContent='Sin conexión con la nube'}),5000);
}
async function cloudSave({asNew=false,quiet=false}={}){
  if(!SB.sess())throw new Error('Inicia sesión primero');
  const proj=projectObj();proj.cloudId=undefined;
  const stored=await externalizeImages(proj);
  const row={name:(proj.name||'Sin título').slice(0,120),width:W,height:H,data:stored,thumb:thumbs[0]||thumbs[cur]||null};
  let id=null;
  if(cloud.id&&!asNew){
    const r=await sbReq(`/rest/v1/designs?id=eq.${cloud.id}`,{method:'PATCH',body:row,headers:{Prefer:'return=representation'}});
    if(r&&r[0])id=r[0].id;
  }
  if(!id){const r=await sbReq('/rest/v1/designs',{method:'POST',body:row,headers:{Prefer:'return=representation'}});id=r[0].id}
  cloud.id=id;
  if(!quiet){
    await sbReq('/rest/v1/design_versions',{method:'POST',body:{design_id:id,data:row.data}});
    try{const old=await sbReq(`/rest/v1/design_versions?design_id=eq.${id}&select=id&order=created_at.desc&offset=20`);
      if(old&&old.length)await sbReq(`/rest/v1/design_versions?id=in.(${old.map(v=>v.id).join(',')})`,{method:'DELETE'})}catch(e){}
  }
  $('saved').textContent='Guardado en la nube';autosave();return id;
}
async function myRole(id){
  try{const r=await sbReq('/rest/v1/rpc/design_role',{method:'POST',body:{p_design:id}});return typeof r==='string'?r:null}catch(e){return null}
}
async function cloudOpen(id){
  const d=await sbReq(`/rest/v1/designs?id=eq.${id}&select=id,name,data,owner`);if(!d||!d[0])throw new Error('No se encontró el diseño');
  const me=SB.sess(),role=(me&&me.user&&me.user.id===d[0].owner)?'owner':await myRole(id);
  await loadProject(d[0].data);$('name').value=d[0].name;cloud.viewId=d[0].id;
  if(role==='owner'||role==='editor'){cloud.id=d[0].id;cloud.role=role}
  else{cloud.id=null;cloud.role=role;toast('Diseño abierto en modo lectura: lo que cambies es una copia local. Puedes comentar y guardar una copia en tu cuenta')}
  autosave();if(typeof cmLoad==='function'&&$('cpanel').classList.contains('on'))cmLoad();
}
function fmtDate(t){try{return new Date(t).toLocaleString('es')}catch(e){return ''}}
function openCloud(){
  const C_=$('cloudCard');C_.textContent='';const cfg=SB.cfg(),sess=SB.sess();
  const status=h('div',{class:'hint',style:'min-height:18px;margin-top:6px'});
  const guard=fn=>async(...a)=>{status.textContent='Trabajando…';try{await fn(...a)}catch(e){status.textContent='';toast(e.message||'Error')}};
  C_.append(h('h2',{},'Cuenta y nube'));
  const closeRow=()=>h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn',onclick:()=>$('mCloud').classList.remove('on')},'Cerrar'));
  if(!cfg){
    const url=h('input',{type:'text',placeholder:'https://tu-proyecto.supabase.co'}),key=h('input',{type:'password',placeholder:'anon public key'});
    const ta=h('textarea',{rows:6,readonly:'readonly',style:'font:12px monospace'});ta.value=SQL_SCHEMA;
    C_.append(h('div',{class:'hint'},'Conecta tu proyecto de Supabase para tener cuentas, guardado en la nube, historial de versiones y enlaces para compartir. Pasos completos en README.md.'),
      h('div',{class:'blk'},h('h3',{},'1. Crea las tablas'),h('div',{class:'hint'},'En Supabase > SQL Editor, pega este SQL y pulsa Run.'),ta,
        h('div',{class:'row',style:'margin-top:6px'},h('button',{class:'btn',onclick:async()=>{try{await navigator.clipboard.writeText(SQL_SCHEMA);toast('SQL copiado')}catch(e){ta.select()}}},'Copiar SQL'))),
      h('div',{class:'blk'},h('h3',{},'2. Pega tus claves'),h('div',{class:'hint'},'Project Settings > API: Project URL y anon public key (nunca la service_role).'),
        h('div',{class:'fld'},h('label',{},'Project URL'),url),h('div',{class:'fld'},h('label',{},'anon public key'),key),
        h('button',{class:'btn on wide',onclick:()=>{const u=url.value.trim(),k=key.value.trim();if(!/^https:\/\//.test(u)||!k)return toast('Revisa la URL (https://…) y la clave');store.set('lienzo-sb',JSON.stringify({url:u,key:k}));openCloud()}},'Guardar y continuar')),closeRow());
  }else if(!sess){
    const em=h('input',{type:'email',placeholder:'tu@correo.com',autocomplete:'email'}),pw=h('input',{type:'password',placeholder:'Contraseña (mínimo 6)',autocomplete:'current-password'});
    const go=mode=>guard(async()=>{
      if(!em.value||pw.value.length<6)throw new Error('Escribe un correo y una contraseña de al menos 6 caracteres');
      const r=await sbAuth(mode,em.value.trim(),pw.value);
      if(!r){status.textContent='Cuenta creada. Revisa tu correo para confirmarla y luego pulsa Entrar.';return}
      toast('Sesión iniciada');openCloud();
    });
    C_.append(h('div',{class:'fld'},h('label',{},'Correo'),em),h('div',{class:'fld'},h('label',{},'Contraseña'),pw),
      h('div',{class:'row'},h('button',{class:'btn on',onclick:go('login')},'Entrar'),h('button',{class:'btn',onclick:go('signup')},'Crear cuenta')),status,
      !cfg.fixed&&h('div',{class:'row',style:'margin-top:8px'},h('button',{class:'btn sm',onclick:()=>{store.set('lienzo-sb','');openCloud()}},'Cambiar proyecto de Supabase')),closeRow());
  }else{
    const me=sess.user||{};
    C_.append(h('div',{class:'row',style:'align-items:center'},h('div',{},h('div',{class:'hint'},'Sesión iniciada como'),h('b',{},me.email||'tu cuenta')),
      h('button',{class:'btn',onclick:()=>{SB.setSess(null);cloud.id=null;toast('Sesión cerrada');openCloud()}},'Cerrar sesión')));
    const list=h('div',{class:'dgrid'});
    const fq=h('input',{type:'text',placeholder:'Buscar por nombre o etiqueta…',style:'flex:1;min-width:0'}),ff=h('select',{class:'sel',style:'max-width:190px'});
    const meta=h('div',{class:'row',style:'margin-bottom:8px'},fq,ff);
    let all=[],hasMeta=true,curFolder='*';
    const tagsOf=d=>Array.isArray(d.tags)?d.tags:[];
    const draw=()=>{
      list.textContent='';const q=fq.value.trim().toLowerCase(),fol=curFolder;
      const rows=all.filter(d=>(!q||d.name.toLowerCase().includes(q)||tagsOf(d).some(t=>t.toLowerCase().includes(q)))&&(!hasMeta||fol==='*'||(fol===''?!d.folder:d.folder===fol)));
      if(!rows.length)list.append(h('div',{class:'hint'},all.length?'Ningún diseño coincide con la búsqueda.':'Aún no tienes diseños en la nube.'));
      rows.forEach(d=>list.append(card(d)));
    };
    fq.oninput=draw;ff.onchange=()=>{curFolder=ff.value;draw()};
    const card=d=>{
      const th=h('div',{class:'th'});const im=safeImg(d.thumb);if(im)th.style.backgroundImage=`url(${im})`;
      const link=location.href.split(/[?#]/)[0]+'?d='+d.id,patch=body=>sbReq(`/rest/v1/designs?id=eq.${d.id}`,{method:'PATCH',body});
      return h('div',{class:'dcard'},th,h('div',{class:'in'},h('div',{class:'nm',title:d.name},d.name),
        h('div',{class:'hint'},`${d.width}×${d.height} · ${fmtDate(d.updated_at)}`),
        hasMeta&&(d.folder||tagsOf(d).length>0)&&h('div',{},d.folder&&h('div',{class:'hint'},'Carpeta: '+d.folder),tagsOf(d).map(t=>h('span',{class:'tag'},'#'+t))),
        h('div',{class:'row'},h('button',{class:'btn sm',onclick:guard(async()=>{await cloudOpen(d.id);$('mCloud').classList.remove('on');toast('Diseño abierto')})},'Abrir'),
          h('button',{class:'btn sm',onclick:guard(async()=>{if(!confirm('¿Eliminar este diseño de la nube?'))return;await sbReq(`/rest/v1/designs?id=eq.${d.id}`,{method:'DELETE'});if(cloud.id===d.id)cloud.id=null;render()})},'Borrar')),
        h('div',{class:'row'},d.is_public
          ?[h('button',{class:'btn sm on',onclick:guard(async()=>{try{await navigator.clipboard.writeText(link);toast('Enlace copiado')}catch(e){prompt('Copia el enlace:',link)}status.textContent=''})},'Copiar enlace'),
            h('button',{class:'btn sm',onclick:guard(async()=>{await patch({is_public:false});render()})},'Dejar de compartir')]
          :h('button',{class:'btn sm',onclick:guard(async()=>{await patch({is_public:true});try{await navigator.clipboard.writeText(link);toast('Compartido. Enlace copiado')}catch(e){prompt('Enlace para compartir:',link)}render()})},'Compartir')),
        h('div',{class:'row'},
          h('button',{class:'btn sm',onclick:guard(async()=>{const n=prompt('Nuevo nombre',d.name);if(n===null||!n.trim())return;await patch({name:n.trim().slice(0,120)});if(cloud.id===d.id)$('name').value=n.trim();render()})},'Renombrar'),
          h('button',{class:'btn sm',onclick:guard(async()=>{
            const r=await sbReq(`/rest/v1/designs?id=eq.${d.id}&select=${hasMeta?'name,width,height,data,thumb,folder,tags':'name,width,height,data,thumb'}`);const s=r&&r[0];if(!s)throw new Error('No se encontró el diseño');
            const row={name:(s.name+' (copia)').slice(0,120),width:s.width,height:s.height,data:s.data,thumb:s.thumb};if(hasMeta){row.folder=s.folder;row.tags=s.tags}
            await sbReq('/rest/v1/designs',{method:'POST',body:row,headers:{Prefer:'return=representation'}});toast('Diseño duplicado');render()})},'Duplicar')),
        h('div',{class:'row'},h('button',{class:'btn sm',onclick:()=>openShare(d)},'Personas…')),
        hasMeta&&h('div',{class:'row'},
          h('button',{class:'btn sm',onclick:guard(async()=>{const f=prompt('Carpeta (déjalo vacío para quitarla)',d.folder||'');if(f===null)return;await patch({folder:f.trim().slice(0,60)||null});render()})},'Carpeta'),
          h('button',{class:'btn sm',onclick:guard(async()=>{const t=prompt('Etiquetas separadas por comas',tagsOf(d).join(', '));if(t===null)return;
            const arr=[...new Set(t.split(',').map(x=>x.trim().replace(/^#/,'').slice(0,30)).filter(Boolean))].slice(0,10);await patch({tags:arr});render()})},'Etiquetas'))));
    };
    const sharedBox=h('div',{class:'dgrid'});
    const loadShared=async()=>{
      sharedBox.textContent='';
      try{
        const rows=await sbReq(`/rest/v1/design_members?user_id=eq.${me.id}&select=role,design:designs(id,name,width,height,thumb,updated_at)`);
        const mine=(rows||[]).filter(r=>r.design);
        if(!mine.length){sharedBox.append(h('div',{class:'hint'},'Nadie ha compartido todavía un diseño contigo.'));return}
        mine.forEach(r=>{const d=r.design,th=h('div',{class:'th'}),im=safeImg(d.thumb);if(im)th.style.backgroundImage=`url(${im})`;
          sharedBox.append(h('div',{class:'dcard'},th,h('div',{class:'in'},h('div',{class:'nm',title:d.name},d.name),
            h('div',{class:'hint'},(r.role==='editor'?'Puedes editar':'Solo ver y comentar')+` · ${fmtDate(d.updated_at)}`),
            h('div',{class:'row'},h('button',{class:'btn sm',onclick:guard(async()=>{await cloudOpen(d.id);$('mCloud').classList.remove('on');toast('Diseño abierto')})},'Abrir')))))});
      }catch(e){sharedBox.append(h('div',{class:'hint'},'No disponible todavía: vuelve a ejecutar supabase/schema.sql en tu proyecto.'))}
    };
    const render=guard(async()=>{
      list.textContent='';
      try{all=await sbReq(`/rest/v1/designs?owner=eq.${me.id}&select=id,name,width,height,thumb,is_public,updated_at,folder,tags&order=updated_at.desc`);hasMeta=true}
      catch(e){all=await sbReq(`/rest/v1/designs?owner=eq.${me.id}&select=id,name,width,height,thumb,is_public,updated_at&order=updated_at.desc`);hasMeta=false}
      loadShared();
      status.textContent='';
      const folders=[...new Set(all.map(d=>d.folder).filter(Boolean))].sort();
      ff.textContent='';ff.append(h('option',{value:'*'},'Todas las carpetas'),h('option',{value:''},'Sin carpeta'),...folders.map(f=>h('option',{value:f},f)));
      if(![...ff.options].some(o=>o.value===curFolder))curFolder='*';ff.value=curFolder;ff.style.display=hasMeta?'':'none';
      draw();
    });
    const vers=h('div');
    const showVersions=guard(async()=>{
      vers.textContent='';const rows=await sbReq(`/rest/v1/design_versions?design_id=eq.${cloud.id}&select=id,created_at&order=created_at.desc&limit=20`);status.textContent='';
      vers.append(h('h3',{style:'margin-top:12px'},'Versiones anteriores'));if(!rows.length)vers.append(h('div',{class:'hint'},'Todavía no hay versiones guardadas.'));
      rows.forEach(v=>vers.append(h('div',{class:'vrow'},h('span',{},fmtDate(v.created_at)),h('button',{class:'btn sm',onclick:guard(async()=>{
        const r=await sbReq(`/rest/v1/design_versions?id=eq.${v.id}&select=data`);if(!r||!r[0])throw new Error('Versión no encontrada');
        const keep=cloud.id;await loadProject(r[0].data);cloud.id=keep;autosave();$('mCloud').classList.remove('on');toast('Versión restaurada. Guarda para conservarla');})},'Restaurar'))));
    });
    C_.append(h('div',{class:'blk'},h('h3',{},cloud.id?'Este diseño está en la nube':'Guardar este diseño'),
      h('div',{class:'row'},h('button',{class:'btn on',onclick:guard(async()=>{await cloudSave();toast('Guardado en la nube');status.textContent='';render()})},cloud.id?'Guardar cambios':'Guardar en la nube'),
        cloud.id&&h('button',{class:'btn',onclick:guard(async()=>{await cloudSave({asNew:true});toast('Copia guardada');status.textContent='';render()})},'Guardar como copia'),
        cloud.id&&h('button',{class:'btn',onclick:showVersions},'Versiones')),
      cloud.id&&h('div',{class:'hint',style:'margin-top:6px'},cloud.role==='editor'?'Estás editando un diseño compartido contigo. Los cambios se sincronizan solos unos segundos después de editar.':'Los cambios se sincronizan solos unos segundos después de editar.'),vers),
      h('div',{class:'blk'},h('h3',{},'Mis diseños'),meta,list),h('div',{class:'blk'},h('h3',{},'Compartidos conmigo'),sharedBox),status,closeRow());
    render();
  }
  $('mCloud').classList.add('on');
}
$('cloudBtn').onclick=openCloud;

/* ---------- Reglas y guías ---------- */
let showRulers=store.get('lienzo-rulers')==='1',userGuides=[];
const wrapEl=$('stagewrap');
function niceStep(){for(const v of [10,20,50,100,200,500,1000,2000,5000])if(v*zoom>=70)return v;return 5000}
function updateRulers(){
  if(typeof renderPins==='function')renderPins();
  wrapEl.classList.toggle('rulers',showRulers);$('rulerBtn').classList.toggle('on',showRulers);
  const gl=$('gl');gl.textContent='';if(!showRulers)return;
  const wr=wrapEl.getBoundingClientRect(),cr=cv.upperCanvasEl.getBoundingClientRect(),dpr=window.devicePixelRatio||1,css=getComputedStyle(document.documentElement);
  const ink=css.getPropertyValue('--muted').trim()||'#6b7280';
  const draw=(cvs,off,pageLen,horiz)=>{
    const L=(horiz?wr.width:wr.height)-20;cvs.width=(horiz?L:20)*dpr;cvs.height=(horiz?20:L)*dpr;
    const x=cvs.getContext('2d');x.scale(dpr,dpr);
    x.fillStyle='rgba(108,76,241,.14)';if(horiz)x.fillRect(off,0,pageLen*zoom,20);else x.fillRect(0,off,20,pageLen*zoom);
    const step=niceStep();x.strokeStyle=ink;x.fillStyle=ink;x.font='10px system-ui';x.lineWidth=1;
    for(let v=0;v<=pageLen+1e-6;v+=step/5){
      const pp=off+v*zoom;if(pp<0||pp>L)continue;const major=Math.abs(v%step)<1e-6,t=major?12:5;
      x.beginPath();if(horiz){x.moveTo(pp+.5,20);x.lineTo(pp+.5,20-t)}else{x.moveTo(20,pp+.5);x.lineTo(20-t,pp+.5)}x.stroke();
      if(major){if(horiz)x.fillText(String(Math.round(v)),pp+3,9);else{x.save();x.translate(9,pp+3);x.rotate(-Math.PI/2);x.fillText(String(Math.round(v)),0,0);x.restore()}}
    }
  };
  draw($('rulerH'),cr.left-(wr.left+20),W,true);draw($('rulerV'),cr.top-(wr.top+20),H,false);
  userGuides.forEach(g=>{
    const d=h('div',{class:'gline '+g.o,title:'Arrastra para mover; llévala a la regla para quitarla'});positionGuide(d,g,wr,cr);
    d.onpointerdown=e=>startGuideDrag(e,g,d);gl.append(d);
  });
}
function positionGuide(el,g,wr,cr){
  wr=wr||wrapEl.getBoundingClientRect();cr=cr||cv.upperCanvasEl.getBoundingClientRect();
  if(g.o==='h')el.style.top=(cr.top-wr.top+g.pos*zoom-4)+'px';else el.style.left=(cr.left-wr.left+g.pos*zoom-4)+'px';
}
function startGuideDrag(e,g,el){
  e.preventDefault();
  const wr=wrapEl.getBoundingClientRect(),cr=cv.upperCanvasEl.getBoundingClientRect();
  const move=ev=>{g.pos=g.o==='h'?(ev.clientY-cr.top)/zoom:(ev.clientX-cr.left)/zoom;positionGuide(el,g,wr,cr)};
  const up=ev=>{
    removeEventListener('pointermove',move);removeEventListener('pointerup',up);
    const out=g.o==='h'?(ev.clientY<wr.top+20||g.pos<0||g.pos>H):(ev.clientX<wr.left+20||g.pos<0||g.pos>W);
    if(out){const i=userGuides.indexOf(g);if(i>=0)userGuides.splice(i,1)}else g.pos=Math.round(g.pos*10)/10;
    updateRulers();autosave();
  };
  addEventListener('pointermove',move);addEventListener('pointerup',up);
}
function newGuide(e,o){
  const cr=cv.upperCanvasEl.getBoundingClientRect(),g={o,pos:o==='h'?(e.clientY-cr.top)/zoom:(e.clientX-cr.left)/zoom};
  userGuides.push(g);updateRulers();startGuideDrag(e,g,$('gl').lastChild);
}
$('rulerH').onpointerdown=e=>newGuide(e,'h');$('rulerV').onpointerdown=e=>newGuide(e,'v');
$('rulerBtn').onclick=()=>{showRulers=!showRulers;store.set('lienzo-rulers',showRulers?'1':'0');updateRulers()};
$('stage').addEventListener('scroll',updateRulers);addEventListener('resize',updateRulers);
if(window.ResizeObserver)new ResizeObserver(()=>updateRulers()).observe($('stagewrap'));

/* ---------- Compartir con personas ---------- */
function openShare(d){
  const C_=$('shareCard');C_.textContent='';C_.append(h('h2',{},'Compartir «'+d.name+'»'));
  const list=h('div'),status=h('div',{class:'hint',style:'min-height:18px;margin-top:6px'});
  const roleSel=()=>h('select',{class:'sel',style:'max-width:160px'},h('option',{value:'editor'},'Puede editar'),h('option',{value:'viewer'},'Solo ver y comentar'));
  const em=h('input',{type:'email',placeholder:'correo@ejemplo.com',style:'flex:1;min-width:0;border:1px solid var(--line);border-radius:8px;padding:0 10px;height:32px;background:var(--panel2)'}),role=roleSel();
  const load=async()=>{
    list.textContent='';status.textContent='Cargando…';
    try{
      const rows=await sbReq(`/rest/v1/design_members?design_id=eq.${d.id}&select=user_id,email,role&order=created_at`);status.textContent='';
      if(!rows.length)list.append(h('div',{class:'hint'},'Todavía no lo has compartido con nadie.'));
      rows.forEach(m=>{const sel=roleSel();sel.value=m.role;
        sel.onchange=async()=>{try{await sbReq(`/rest/v1/design_members?design_id=eq.${d.id}&user_id=eq.${m.user_id}`,{method:'PATCH',body:{role:sel.value}});toast('Permiso actualizado')}catch(e){toast(e.message)}};
        list.append(h('div',{class:'vrow'},h('span',{style:'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis'},m.email),sel,
          h('button',{class:'btn sm',onclick:async()=>{try{await sbReq(`/rest/v1/design_members?design_id=eq.${d.id}&user_id=eq.${m.user_id}`,{method:'DELETE'});load()}catch(e){toast(e.message)}}},'Quitar')))});
    }catch(e){status.textContent='';toast(e.message)}
  };
  const invite=h('button',{class:'btn on',onclick:async()=>{
    const e=em.value.trim();if(!/^\S+@\S+\.\S+$/.test(e))return toast('Escribe un correo válido');
    try{await sbReq('/rest/v1/rpc/share_design',{method:'POST',body:{p_design:d.id,p_email:e,p_role:role.value}});em.value='';toast('Compartido. La persona lo verá en «Compartidos conmigo»');load()}catch(err){toast(err.message)}}},'Invitar');
  C_.append(h('div',{class:'hint',style:'margin-bottom:8px'},'La persona debe tener ya una cuenta en este editor. No se envía ningún correo: lo verá en Nube → «Compartidos conmigo». Quien solo puede ver puede comentar, pero no cambiar el original.'),
    h('div',{class:'row'},em,role,invite),h('h3',{style:'margin:14px 0 4px;font-size:13px'},'Personas con acceso'),list,status,
    h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn',onclick:()=>$('mShare').classList.remove('on')},'Cerrar')));
  $('mShare').classList.add('on');load();
}

/* ---------- Menciones (@) ---------- */
const partCache=new Map();
async function participants(){
  const id=cmDesign();if(!id)return[];
  const c=partCache.get(id);if(c&&Date.now()-c.t<60000)return c.v;
  try{const v=await sbReq('/rest/v1/rpc/design_participants',{method:'POST',body:{p_design:id}});partCache.set(id,{v:v||[],t:Date.now()});return v||[]}catch(e){return[]}
}
const handleOf=e=>String(e||'').split('@')[0].replace(/[^A-Za-z0-9._-]/g,'');
function mentionNodes(text){
  const out=[],re=/@([A-Za-z0-9._-]+)/g;let last=0,m;
  while((m=re.exec(text))){if(m.index>last)out.push(text.slice(last,m.index));out.push(h('span',{class:'mention'},m[0]));last=m.index+m[0].length}
  if(last<text.length)out.push(text.slice(last));return out;
}
function mentionBox(el){
  const box=h('div',{class:'mbox'}),close=()=>{box.textContent='';box.style.display='none'};
  el.addEventListener('input',async()=>{
    const pos=el.selectionStart||0,m=/(^|\s)@([\w.-]*)$/.exec(el.value.slice(0,pos));if(!m){close();return}
    const q=m[2].toLowerCase(),me=(SB.sess()&&SB.sess().user&&SB.sess().user.email)||'';
    const list=(await participants()).filter(p=>p.email&&p.email!==me&&handleOf(p.email).toLowerCase().startsWith(q)).slice(0,6);
    if(!list.length){close();return}
    box.textContent='';box.style.display='block';
    list.forEach(p=>box.append(h('button',{type:'button',class:'mopt',onmousedown:ev=>{
      ev.preventDefault();const hd=handleOf(p.email),start=pos-q.length-1;
      el.value=el.value.slice(0,start)+'@'+hd+' '+el.value.slice(pos);const np=start+hd.length+2;el.setSelectionRange(np,np);close();el.focus();
    }},`@${handleOf(p.email)} · ${p.email}`)));
  });
  el.addEventListener('blur',()=>setTimeout(close,150));
  return box;
}

/* ---------- Notificaciones ---------- */
const nf={items:[],open:false,err:'',seen:null};
const nfCan=()=>!!(SB.cfg()&&SB.sess());
const nfText=n=>{const who=(n.from_email||'Alguien').split('@')[0],d='«'+(n.design_name||'un diseño')+'»';
  return({shared:`${who} compartió ${d} contigo`,comment:`${who} comentó en ${d}`,reply:`${who} respondió en ${d}`,mention:`${who} te mencionó en ${d}`})[n.type]||'Novedad'};
function nfBadge(){const n=nf.items.filter(x=>!x.read).length;$('bellBtn').dataset.n=String(n);$('bellBtn').title=`Notificaciones (${n} sin leer)`}
async function nfLoad(){
  if(!nfCan()){nf.items=[];nfBadge();if(nf.open)renderNotifs();return}
  try{
    const rows=await sbReq('/rest/v1/notifications?select=id,type,design_id,design_name,comment_id,from_email,body,read,created_at&order=created_at.desc&limit=40');nf.err='';
    if(nf.seen){rows.filter(r=>!r.read&&!nf.seen.has(r.id)).slice(0,2).forEach(r=>toast(nfText(r)))}
    nf.seen=new Set(rows.map(r=>r.id));nf.items=rows;
  }catch(e){nf.items=[];nf.err=e.message}
  nfBadge();if(nf.open)renderNotifs();
}
function renderNotifs(){
  const P=$('npanel');P.textContent='';
  P.append(h('div',{class:'row',style:'align-items:center'},h('h3',{style:'margin:0;flex:1;font-size:14px'},'Notificaciones'),h('button',{class:'btn sm',style:'flex:none',onclick:()=>nfToggle(false)},'Cerrar')));
  if(!nfCan()){P.append(h('div',{class:'hint',style:'margin-top:8px'},'Inicia sesión (botón Nube) para recibir avisos.'));return}
  if(nf.err)P.append(h('div',{class:'hint',style:'margin-top:8px'},'No disponible: '+nf.err+'. ¿Has vuelto a ejecutar supabase/schema.sql?'));
  if(nf.items.some(x=>!x.read))P.append(h('div',{class:'row',style:'margin-top:8px'},h('button',{class:'btn sm',onclick:async()=>{
    try{await sbReq(`/rest/v1/notifications?read=eq.false&user_id=eq.${myUid()}`,{method:'PATCH',body:{read:true}});await nfLoad()}catch(e){toast(e.message)}}},'Marcar todas como leídas')));
  if(!nf.items.length&&!nf.err)P.append(h('div',{class:'hint',style:'margin-top:10px'},'No tienes avisos.'));
  nf.items.forEach(n=>P.append(h('div',{class:'cth'+(n.read?' done':''),style:'cursor:pointer',onclick:()=>nfOpen(n)},
    h('div',{style:'font-weight:'+(n.read?'400':'700')},nfText(n)),
    n.body?h('div',{class:'hint',style:'margin-top:2px;overflow-wrap:anywhere'},n.type==='shared'?n.body:mentionNodes(n.body)):null,
    h('div',{class:'hint',style:'margin-top:2px'},fmtDate(n.created_at)))));
}
async function nfOpen(n){
  try{
    if(!n.read)await sbReq(`/rest/v1/notifications?id=eq.${n.id}`,{method:'PATCH',body:{read:true}});
    if(n.design_id){
      await cloudOpen(n.design_id);nfToggle(false);
      if(n.type!=='shared'){cmToggle(true);await cmLoad();if(n.comment_id)setTimeout(()=>focusThread(n.comment_id),300)}
    }
    nfLoad();
  }catch(e){toast(e.message)}
}
function nfToggle(on){
  nf.open=on;$('npanel').classList.toggle('on',on);$('bellBtn').classList.toggle('on',on);
  if(on){$('cpanel').classList.contains('on')&&cmToggle(false);renderNotifs();nfLoad()}
}
$('bellBtn').onclick=()=>{if(!nfCan()){toast('Inicia sesión (botón Nube) para recibir avisos');return}nfToggle(!nf.open)};
setInterval(()=>{if(!document.hidden&&nfCan())nfLoad()},45000);
setTimeout(()=>{if(nfCan())nfLoad()},3000);

/* ---------- Comentarios ---------- */
const cm={items:[],place:false,pending:null,timer:null,showResolved:false,err:''};
const cmDesign=()=>cloud.id||cloud.viewId||null;
const cmCan=()=>!!(SB.cfg()&&SB.sess()&&cmDesign());
const cpins=h('div',{id:'cpins'});document.body.append(cpins);
const cmThreads=()=>cm.items.filter(c=>!c.parent).map((t,i)=>({t,n:i+1,replies:cm.items.filter(c=>c.parent===t.id)}));
async function cmLoad(){
  if(!cmCan()){cm.items=[];renderComments();return}
  try{cm.items=await sbReq(`/rest/v1/design_comments?design_id=eq.${cmDesign()}&select=id,parent,author,author_email,page,x,y,body,resolved,created_at&order=created_at`);cm.err=''}
  catch(e){cm.items=[];cm.err=e.message}
  renderComments();
}
function renderPins(){
  cpins.textContent='';const panel=$('cpanel');if(!panel||!panel.classList.contains('on'))return;
  const r=cv.upperCanvasEl.getBoundingClientRect();
  cmThreads().forEach(({t,n})=>{
    if(t.page!==cur||(t.resolved&&!cm.showResolved))return;
    const el=h('div',{class:'cpin'+(t.resolved?' done':''),title:t.body.slice(0,80),onclick:()=>focusThread(t.id)},String(n));
    el.style.left=(r.left+t.x*zoom)+'px';el.style.top=(r.top+t.y*zoom)+'px';cpins.append(el);
  });
  if(cm.pending&&cm.pending.page===cur){const el=h('div',{class:'cpin new'},'+');el.style.left=(r.left+cm.pending.x*zoom)+'px';el.style.top=(r.top+cm.pending.y*zoom)+'px';cpins.append(el)}
}
async function focusThread(id){
  const th0=cm.items.find(c=>c.id===id);if(!th0)return;
  const th=th0.parent?(cm.items.find(c=>c.id===th0.parent)||th0):th0;id=th.id;
  if(th.page!==cur&&th.page<pages.length)await goPage(th.page);
  const el=document.querySelector(`[data-cid="${id}"]`);if(el){el.scrollIntoView({block:'nearest'});el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),1600)}
}
function renderComments(){
  const P=$('cpanel'),threads=cmThreads(),open=threads.filter(x=>!x.t.resolved).length;
  $('cmBtn').dataset.n=String(open);$('cmBtn').title=`Comentarios (${open} abiertos)`;
  if(!P.classList.contains('on')){renderPins();return}
  const keepScroll=P.scrollTop;P.textContent='';
  P.append(h('div',{class:'row',style:'align-items:center'},h('h3',{style:'margin:0;flex:1;font-size:14px'},'Comentarios'),h('button',{class:'btn sm',style:'flex:none',onclick:()=>cmToggle(false)},'Cerrar')));
  if(!cmCan()){P.append(h('div',{class:'hint',style:'margin-top:8px'},'Guarda el diseño en la nube (botón Nube) o ábrelo desde «Compartidos conmigo» para poder comentar.'));renderPins();return}
  if(cm.err)P.append(h('div',{class:'hint',style:'margin-top:8px'},'No se pudieron cargar los comentarios: '+cm.err+'. ¿Has vuelto a ejecutar supabase/schema.sql?'));
  const me=SB.sess().user||{},ta=h('textarea',{rows:3,placeholder:cm.pending?'Escribe tu comentario…':'Pulsa «Comentar en el lienzo» y haz clic donde quieras comentar'});
  const post=h('button',{class:'btn on',onclick:async()=>{
    const body=ta.value.trim();if(!cm.pending)return toast('Primero haz clic en el lienzo para elegir el sitio');if(!body)return toast('Escribe el comentario');
    try{await sbReq('/rest/v1/design_comments',{method:'POST',body:{design_id:cmDesign(),parent:null,page:cm.pending.page,x:Math.round(cm.pending.x),y:Math.round(cm.pending.y),body:body.slice(0,2000),author_email:me.email||null}});
      cm.pending=null;cm.place=false;await cmLoad()}catch(e){toast(e.message)}}},'Publicar');
  P.append(h('div',{style:'margin-top:10px'},h('div',{class:'row'},h('button',{class:'btn'+(cm.place?' on':''),onclick:()=>{cm.place=!cm.place;cv.defaultCursor=cm.place?'crosshair':'default';if(cm.place)toast('Haz clic en el lienzo donde quieras comentar');renderComments()}},cm.place?'Haz clic en el lienzo…':'Comentar en el lienzo')),
    h('div',{style:'margin-top:6px'},ta,mentionBox(ta)),h('div',{class:'row'},post)),
    h('label',{class:'hint',style:'display:flex;gap:6px;align-items:center;margin-top:8px'},h('input',{type:'checkbox',...(cm.showResolved?{checked:'checked'}:{}),onchange:e=>{cm.showResolved=e.target.checked;renderComments()}}),'Mostrar resueltos'));
  if(!threads.length)P.append(h('div',{class:'hint',style:'margin-top:10px'},'Aún no hay comentarios en este diseño.'));
  threads.filter(x=>cm.showResolved||!x.t.resolved).forEach(({t,n,replies})=>{
    const who=c=>(c.author_email||'alguien').split('@')[0],mineOrOwner=c=>c.author===me.id||cloud.role==='owner';
    const rinput=h('input',{type:'text',placeholder:'Responder…'});
    const reply=async()=>{const v=rinput.value.trim();if(!v)return;try{await sbReq('/rest/v1/design_comments',{method:'POST',body:{design_id:cmDesign(),parent:t.id,page:t.page,x:t.x,y:t.y,body:v.slice(0,2000),author_email:me.email||null}});await cmLoad()}catch(e){toast(e.message)}};
    rinput.onkeydown=e=>{if(e.key==='Enter')reply()};
    P.append(h('div',{class:'cth'+(t.resolved?' done':''),'data-cid':t.id},
      h('div',{class:'hint',style:'display:flex;justify-content:space-between;cursor:pointer',onclick:()=>focusThread(t.id)},h('b',{},`#${n} · ${who(t)}`),h('span',{},`Pág. ${t.page+1} · ${fmtDate(t.created_at)}`)),
      h('div',{style:'margin-top:4px;white-space:pre-wrap;overflow-wrap:anywhere'},mentionNodes(t.body)),
      replies.map(r=>h('div',{class:'rp'},h('div',{class:'hint'},`${who(r)} · ${fmtDate(r.created_at)}`),h('div',{style:'white-space:pre-wrap;overflow-wrap:anywhere'},mentionNodes(r.body)),
        mineOrOwner(r)&&h('button',{class:'btn sm',style:'margin-top:4px',onclick:async()=>{try{await sbReq(`/rest/v1/design_comments?id=eq.${r.id}`,{method:'DELETE'});await cmLoad()}catch(e){toast(e.message)}}},'Borrar'))),
      h('div',{style:'margin-top:6px'},rinput,mentionBox(rinput)),
      h('div',{class:'row'},h('button',{class:'btn sm',onclick:reply},'Responder'),
        h('button',{class:'btn sm',onclick:async()=>{try{await sbReq(`/rest/v1/design_comments?id=eq.${t.id}`,{method:'PATCH',body:{resolved:!t.resolved}});await cmLoad()}catch(e){toast(e.message)}}},t.resolved?'Reabrir':'Resolver'),
        mineOrOwner(t)&&h('button',{class:'btn sm',onclick:async()=>{if(!confirm('¿Borrar este comentario y sus respuestas?'))return;try{await sbReq(`/rest/v1/design_comments?id=eq.${t.id}`,{method:'DELETE'});await cmLoad()}catch(e){toast(e.message)}}},'Borrar'))));
  });
  P.scrollTop=keepScroll;renderPins();
}
function cmToggle(on){
  const P=$('cpanel');P.classList.toggle('on',on);clearInterval(cm.timer);
  if(on){cmLoad();cm.timer=setInterval(()=>{if(!document.hidden)cmLoad()},15000)}
  else{cm.place=false;cm.pending=null;cv.defaultCursor='default';renderPins()}
  $('cmBtn').classList.toggle('on',on);if(on)renderComments();
}
$('cmBtn').onclick=()=>{
  if(!(SB.cfg()&&SB.sess())){toast('Inicia sesión (botón Nube) para usar los comentarios');return}
  cmToggle(!$('cpanel').classList.contains('on'));
};
cv.on('mouse:down',e=>{
  if(!cm.place||!$('cpanel').classList.contains('on'))return;
  const pt=cv.getPointer(e.e);cm.pending={x:pt.x,y:pt.y,page:cur};cm.place=false;cv.defaultCursor='default';cv.discardActiveObject();
  renderComments();const ta=$('cpanel').querySelector('textarea');if(ta)ta.focus();
});
$('stage').addEventListener('scroll',()=>renderPins());
setTimeout(()=>{if(SB.cfg()&&SB.sess()&&cmDesign())cmLoad()},2500);

/* ---------- Colaboración en tiempo real (Supabase Realtime, canal broadcast) ---------- */
const collab={on:false,joined:false,ws:null,room:null,topic:'',id:rid()+rid(),name:'',color:'#6c4cf1',peers:new Map(),last:new Map(),order:'',q:Promise.resolve(),applying:false,hb:null,flushT:null,seq:0,retry:0,lastCur:0};
const pcolor=id=>`hsl(${[...id].reduce((a,c)=>(a*31+c.charCodeAt(0))%360,7)} 70% 45%)`;
function rtUrl(){const w=window.LIENZO_REALTIME_URL;if(w)return w;const c=SB.cfg();return c?c.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(c.key)+'&vsn=1.0.0':null}
const objSig=o=>{const j=o.toObject(CUSTOM);if(typeof j.src==='string')j.src=j.src.length;return JSON.stringify(j)};
function sigMap(){const m=new Map();cv.getObjects().forEach(o=>{if(!o.uid)o.uid=rid();m.set(o.uid,objSig(o))});return m}
const orderStr=()=>cv.getObjects().map(o=>o.uid).join(',');
function rtSend(payload){
  if(!collab.ws||collab.ws.readyState!==1)return false;
  payload.id=collab.id;
  const str=JSON.stringify({topic:'realtime:'+collab.topic,event:'broadcast',payload:{type:'broadcast',event:'lienzo',payload},ref:String(++collab.seq)});
  if(str.length>2500000){toast('El cambio es demasiado grande para la sala en vivo (reduce el tamaño de las imágenes)');return false}
  collab.ws.send(str);return true;
}
function collabConnect(){
  const ws=new WebSocket(rtUrl());collab.ws=ws;
  ws.onopen=async()=>{
    const s=SB.cfg()?await SB.fresh():null,c=SB.cfg(),tok=s?s.access_token:(c?c.key:'anon');
    ws.send(JSON.stringify({topic:'realtime:'+collab.topic,event:'phx_join',payload:{config:{broadcast:{self:false,ack:false},presence:{key:''},postgres_changes:[],private:false},access_token:tok},ref:'1',join_ref:'1'}));
    collab.hb=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:String(++collab.seq)}))},25000);
  };
  ws.onmessage=ev=>{
    let m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(m.event==='phx_reply'&&m.ref==='1'){
      if(m.payload&&m.payload.status==='ok'){collab.retry=0;collab.joined=true;collab.last=sigMap();collab.order=orderStr();rtSend({k:'hi',name:collab.name,color:collab.color,need:true});collabUi()}
      else toast('No se pudo entrar en la sala (¿Realtime activado en Supabase?)');
      return;
    }
    if(m.event==='broadcast'&&m.payload&&m.payload.event==='lienzo')onCollabMsg(m.payload.payload);
  };
  ws.onclose=()=>{
    clearInterval(collab.hb);
    if(collab.on&&collab.ws===ws){collab.joined=false;collabUi();setTimeout(()=>{if(collab.on&&collab.ws===ws)collabConnect()},Math.min(10000,1000*Math.pow(2,collab.retry++)))}
  };
  ws.onerror=()=>{};
}
const isLeader=newcomer=>{const ids=[collab.id,...[...collab.peers.keys()].filter(i=>i!==newcomer)];return ids.sort()[0]===collab.id};
function sendState(to){
  sigMap();rtSend({k:'state',to,W,H,page:cur,json:cv.toJSON(CUSTOM)});
}
function collabBroadcastState(){if(collab.on&&collab.joined)sendState('*')}
function onCollabMsg(m){
  if(!m||m.id===collab.id)return;
  if(m.k==='hi'){
    collab.peers.set(m.id,{name:m.name||'Invitado',color:m.color||pcolor(m.id),t:Date.now()});
    rtSend({k:'hello',to:m.id,name:collab.name,color:collab.color});
    if(m.need&&isLeader(m.id))sendState(m.id);collabUi();return;
  }
  if(m.k==='hello'){if(m.to===collab.id){collab.peers.set(m.id,{name:m.name||'Invitado',color:m.color||pcolor(m.id),t:Date.now()});collabUi()}return}
  if(m.k==='ping'){collab.peers.set(m.id,{name:m.name||'Invitado',color:m.color||pcolor(m.id),t:Date.now()});return}
  if(m.k==='bye'){collab.peers.delete(m.id);removeCursor(m.id);collabUi();return}
  if(m.k==='cur'){if(m.page===cur)showCursor(m);return}
  if(m.k==='live'){if(m.page===cur)applyLive(m);return}
  if(m.k==='ops'){collab.q=collab.q.then(()=>applyRemote(m)).catch(()=>{});return}
  if(m.k==='state'&&(m.to===collab.id||m.to==='*')){collab.q=collab.q.then(()=>applyState(m)).catch(()=>{})}
}
const enliven=j=>{markCors(j);return new Promise(r=>fabric.util.enlivenObjects([j],o=>r(o[0]||null)))};
async function applyState(m){
  collab.applying=true;
  try{
    if(m.W!==W||m.H!==H){W=m.W;H=m.H;syncSize();fit()}
    cv.discardActiveObject();(m.json.objects||[]).forEach(markCors);await loadAsync(m.json);await ensureFonts();ensureBg();
    collab.last=sigMap();collab.order=orderStr();resetHist();refresh();changedSoon();
  }finally{collab.applying=false}
}
function patchImage(o,j){
  o.set({left:j.left,top:j.top,scaleX:j.scaleX,scaleY:j.scaleY,angle:j.angle,flipX:j.flipX,flipY:j.flipY,opacity:j.opacity,visible:j.visible,name:j.name,
    shadow:j.shadow?new fabric.Shadow(j.shadow):null});
  o._f=j._f;o._crop=j._crop;o._round=j._round;o._mask=j._mask;o._anim=j._anim;o.locked=j.locked;
  applyFilters(o);applyClip(o);o.setCoords();
}
async function applyRemote(m){
  if(m.page!==cur)return;
  collab.applying=true;lock=true;let activeWasReplaced=null;
  try{
    for(const op of m.ops){
      const objs=cv.getObjects(),map=new Map(objs.map(o=>[o.uid,o]));
      if(op.t==='add'){if(map.has(op.o.uid))continue;const ob=await enliven(op.o);if(ob)cv.insertAt(ob,Math.min(op.i,cv.getObjects().length))}
      else if(op.t==='mod'){
        const old=map.get(op.o.uid);if(!old)continue;
        if(cv._currentTransform&&cv._currentTransform.target&&(cv._currentTransform.target===old||(cv._currentTransform.target._objects||[]).includes(old)))continue;
        if(old.type==='image')patchImage(old,op.o);
        else{const ob=await enliven(op.o);if(ob){const i=cv.getObjects().indexOf(old);if(cv.getActiveObject()===old)activeWasReplaced=ob;cv.remove(old);cv.insertAt(ob,i)}}
      }
      else if(op.t==='del'){const old=map.get(op.u);if(old)cv.remove(old)}
      else if(op.t==='ord'){const mp=new Map(cv.getObjects().map(o=>[o.uid,o])),arr=op.l.map(u=>mp.get(u)).filter(Boolean);cv.getObjects().forEach(o=>{if(!arr.includes(o))arr.push(o)});cv._objects=arr}
    }
  }finally{lock=false;collab.applying=false}
  if(activeWasReplaced)cv.setActiveObject(activeWasReplaced);
  collab.last=sigMap();collab.order=orderStr();cv.requestRenderAll();refreshLayers();if(cv.getActiveObject())refreshProps();changedSoon();
}
function collabSchedule(){
  if(!collab.on||!collab.joined||collab.applying)return;
  clearTimeout(collab.flushT);collab.flushT=setTimeout(collabFlush,120);
}
function collabFlush(){
  if(!collab.on||!collab.joined||collab.applying)return;
  const now=new Map(),ops=[];
  cv.getObjects().forEach((o,i)=>{
    if(!o.uid)o.uid=rid();const sig=objSig(o);now.set(o.uid,sig);
    if(!collab.last.has(o.uid))ops.push({t:'add',i,o:o.toObject(CUSTOM)});
    else if(collab.last.get(o.uid)!==sig){const j=o.toObject(CUSTOM);if(o.type==='image')delete j.src;ops.push({t:'mod',o:j})}
  });
  collab.last.forEach((_,u)=>{if(!now.has(u))ops.push({t:'del',u})});
  const ord=orderStr();if(ord!==collab.order){ops.push({t:'ord',l:ord.split(',')});}
  collab.last=now;collab.order=ord;
  if(ops.length)rtSend({k:'ops',page:cur,ops});
}
/* arrastre en vivo (el resultado final llega después como cambio normal) */
let liveT=0;
['object:moving','object:scaling','object:rotating'].forEach(ev=>cv.on(ev,e=>{
  if(!collab.on||!collab.joined||collab.applying)return;const t=e.target;if(!t||!t.uid||t.type==='activeSelection')return;
  const n=performance.now();if(n-liveT<60)return;liveT=n;
  rtSend({k:'live',page:cur,u:t.uid,p:{left:t.left,top:t.top,scaleX:t.scaleX,scaleY:t.scaleY,angle:t.angle}});
}));
function applyLive(m){
  const o=cv.getObjects().find(x=>x.uid===m.u);if(!o||!m.p)return;
  const ct=cv._currentTransform;if(ct&&ct.target&&(ct.target===o||(ct.target._objects||[]).includes(o)))return;
  const P={};['left','top','scaleX','scaleY','angle'].forEach(k=>{if(isFinite(m.p[k]))P[k]=+m.p[k]});
  o.set(P);o.setCoords();collab.last.set(o.uid,objSig(o));cv.requestRenderAll();
}
/* cursores de los demás */
const curLayer=h('div',{id:'cursors'});document.body.append(curLayer);
const cursors=new Map();
function showCursor(m){
  const p=collab.peers.get(m.id)||{name:'Invitado',color:pcolor(m.id)};
  let el=cursors.get(m.id);
  if(!el){el=h('div',{class:'rc',html:`<svg viewBox="0 0 24 24" fill="${p.color}" stroke="#fff" stroke-width="1.5"><path d="M4 3l16 7-7 2-2 7z"/></svg><span style="background:${p.color}">${''}</span>`});el.querySelector('span').textContent=p.name;curLayer.append(el);cursors.set(m.id,el)}
  const r=cv.upperCanvasEl.getBoundingClientRect();el.style.left=(r.left+m.x*zoom)+'px';el.style.top=(r.top+m.y*zoom)+'px';el._t=Date.now();
}
function removeCursor(id){const el=cursors.get(id);if(el){el.remove();cursors.delete(id)}}
cv.on('mouse:move',e=>{
  if(!collab.on||!collab.joined)return;const n=performance.now();if(n-collab.lastCur<70)return;collab.lastCur=n;
  const pt=cv.getPointer(e.e);rtSend({k:'cur',x:pt.x,y:pt.y,page:cur});
});
setInterval(()=>{
  const now=Date.now();
  cursors.forEach((el,id)=>{if(now-el._t>6000)removeCursor(id)});
  collab.peers.forEach((p,id)=>{if(now-p.t>25000){collab.peers.delete(id);removeCursor(id);collabUi()}});
  if(collab.on&&collab.joined)rtSend({k:'ping',name:collab.name,color:collab.color});
},8000);
/* sala */
function joinRoom(room){
  if(!rtUrl()){toast('Configura Supabase (botón Nube) para poder colaborar');return false}
  const me=SB.sess();
  collab.room=room;collab.topic='lienzo-'+room;collab.on=true;collab.joined=false;collab.peers.clear();collab.retry=0;
  collab.name=(me&&me.user&&me.user.email)?me.user.email.split('@')[0]:'Invitado '+(100+Math.floor(Math.random()*900));collab.color=pcolor(collab.id);
  collabConnect();collabUi();return true;
}
function leaveRoom(){
  if(collab.ws){rtSend({k:'bye'});collab.on=false;try{collab.ws.close()}catch(e){}}
  collab.on=false;collab.joined=false;collab.ws=null;collab.peers.clear();cursors.forEach((_,id)=>removeCursor(id));collabUi();toast('Has salido de la sala');
}
const roomLink=()=>location.href.split(/[?#]/)[0]+'?room='+collab.room;
function newRoomToken(){const a=new Uint8Array(12);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function collabUi(){
  const b=$('collabBtn');b.classList.toggle('on',collab.on);
  if($('mCollab').classList.contains('on'))openCollab();
}
function openCollab(){
  const C_=$('collabCard');C_.textContent='';C_.append(h('h2',{},'Colaborar en tiempo real'));
  if(!collab.on){
    C_.append(h('div',{class:'hint',style:'margin-bottom:10px'},'Crea una sala y comparte el enlace: quien lo abra edita este diseño contigo, con cursores en vivo. Los cambios se envían al soltar y, si dos personas tocan lo mismo a la vez, gana el último. Se sincroniza la página actual.'),
      h('div',{class:'hint',style:'margin-bottom:10px'},rtUrl()?'':'Necesitas configurar Supabase (botón Nube): la colaboración usa su canal Realtime, que viene activado por defecto.'),
      h('div',{class:'hint',style:'margin-bottom:10px'},'Ojo: cualquiera que tenga el enlace puede entrar y editar. Compártelo solo con quien quieras.'),
      h('div',{class:'row'},h('button',{class:'btn on',onclick:()=>{if(joinRoom(newRoomToken()))openCollab()}},'Crear sala'),h('button',{class:'btn',onclick:()=>$('mCollab').classList.remove('on')},'Cerrar')));
  }else{
    const link=h('input',{type:'text',readonly:'readonly',value:roomLink(),style:'width:100%;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--panel2)'});
    const peers=[{id:collab.id,name:collab.name+' (tú)',color:collab.color},...[...collab.peers].map(([id,p])=>({id,name:p.name,color:p.color}))];
    C_.append(h('div',{class:'hint'},collab.joined?'Sala activa':'Conectando…'),h('div',{class:'fld'},h('label',{},'Enlace para invitar'),link),
      h('div',{class:'row'},h('button',{class:'btn on',onclick:async()=>{try{await navigator.clipboard.writeText(roomLink());toast('Enlace copiado')}catch(e){link.select()}}},'Copiar enlace')),
      h('h3',{style:'margin:14px 0 4px;font-size:13px'},`En la sala (${peers.length})`),
      h('div',{},peers.map(p=>h('div',{class:'peer'},h('i',{style:`background:${p.color}`}),p.name))),
      h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn',onclick:()=>{leaveRoom();$('mCollab').classList.remove('on')}},'Salir de la sala'),h('button',{class:'btn',onclick:()=>$('mCollab').classList.remove('on')},'Cerrar')));
  }
  $('mCollab').classList.add('on');
}
$('collabBtn').onclick=openCollab;
function autoJoin(){
  const r=new URLSearchParams(location.search).get('room');
  if(r&&/^[0-9a-f]{16,64}$/.test(r)&&rtUrl()){
    if(confirm('Vas a unirte a una sala de edición colaborativa. La página actual se reemplazará por el diseño de la sala. ¿Continuar?'))joinRoom(r);
  }
}
window.addEventListener('beforeunload',()=>{if(collab.on)rtSend({k:'bye'})});

/* ---------- Recorte interactivo ---------- */
function startCrop(img){
  if(cropMode||!img||img.type!=='image')return;
  if(Math.abs(((img.angle%360)+360)%360)>.01&&Math.abs(((img.angle%360)+360)%360-360)>.01){toast('Pon la imagen a 0° para recortarla con el ratón');return}
  cv.discardActiveObject();
  const saved=img.clipPath;img.clipPath=null;img.dirty=true;
  const ib=img.getBoundingRect(true,true),c=img._crop||{l:0,r:0,t:0,b:0},m=img.calcTransformMatrix();
  const p1=fabric.util.transformPoint({x:-img.width/2+c.l*img.width,y:-img.height/2+c.t*img.height},m);
  const p2=fabric.util.transformPoint({x:img.width/2-c.r*img.width,y:img.height/2-c.b*img.height},m);
  const x0=Math.min(p1.x,p2.x),x1=Math.max(p1.x,p2.x),y0=Math.min(p1.y,p2.y),y1=Math.max(p1.y,p2.y);
  const mk=()=>new fabric.Rect({fill:'rgba(0,0,0,.5)',selectable:false,evented:false,excludeFromExport:true,hoverCursor:'default',strokeWidth:0});
  const dims=[mk(),mk(),mk(),mk()];
  const cr=new fabric.Rect({left:(x0+x1)/2,top:(y0+y1)/2,width:x1-x0,height:y1-y0,fill:'rgba(255,255,255,.04)',stroke:'#ffffff',strokeWidth:2,strokeDashArray:[8,6],excludeFromExport:true,lockRotation:true,name:'Recorte'});
  cr.setControlsVisibility({mtr:false});
  cropMode={img,cr,dims,ib,saved};
  lock=true;dims.forEach(d=>cv.add(d));cv.add(cr);lock=false;
  updateDim();cv.setActiveObject(cr);cv.requestRenderAll();refreshProps();
  toast('Arrastra los bordes del recuadro. Enter aplica, Esc cancela');
}
function updateDim(){
  if(!cropMode)return;const {cr,ib,dims}=cropMode;
  const w=cr.width*cr.scaleX,hh=cr.height*cr.scaleY,x0=cr.left-w/2,y0=cr.top-hh/2,x1=x0+w,y1=y0+hh,L=ib.left,T=ib.top,R=ib.left+ib.width,B=ib.top+ib.height;
  const set=(o,l,t,r,b)=>{o.set({left:(l+r)/2,top:(t+b)/2,width:Math.max(0,r-l),height:Math.max(0,b-t),scaleX:1,scaleY:1});o.setCoords()};
  set(dims[0],L,T,R,y0);set(dims[1],L,y1,R,B);set(dims[2],L,y0,x0,y1);set(dims[3],x1,y0,R,y1);
}
function clampCrop(){
  if(!cropMode)return;const {cr,ib}=cropMode;
  let w=cr.width*cr.scaleX,hh=cr.height*cr.scaleY;
  w=clamp(w,24,ib.width);hh=clamp(hh,24,ib.height);cr.set({scaleX:w/cr.width,scaleY:hh/cr.height});
  cr.set({left:clamp(cr.left,ib.left+w/2,ib.left+ib.width-w/2),top:clamp(cr.top,ib.top+hh/2,ib.top+ib.height-hh/2)});
  cr.setCoords();updateDim();
}
function endCrop(apply){
  if(!cropMode)return;const {img,cr,dims,saved}=cropMode;cropMode=null;
  if(apply){
    const m=fabric.util.invertTransform(img.calcTransformMatrix());
    const w=cr.width*cr.scaleX,hh=cr.height*cr.scaleY;
    const p1=fabric.util.transformPoint({x:cr.left-w/2,y:cr.top-hh/2},m),p2=fabric.util.transformPoint({x:cr.left+w/2,y:cr.top+hh/2},m);
    const minX=Math.min(p1.x,p2.x),maxX=Math.max(p1.x,p2.x),minY=Math.min(p1.y,p2.y),maxY=Math.max(p1.y,p2.y);
    const L=clamp((minX+img.width/2)/img.width,0,.95),R=clamp((img.width/2-maxX)/img.width,0,.95),T=clamp((minY+img.height/2)/img.height,0,.95),B=clamp((img.height/2-maxY)/img.height,0,.95);
    const r4=v=>Math.round(v*1000)/1000;
    img._crop={l:r4(L),r:r4(R),t:r4(T),b:r4(B)};
  }
  lock=true;cv.discardActiveObject();dims.forEach(d=>cv.remove(d));cv.remove(cr);lock=false;
  if(apply)applyClip(img);else img.clipPath=saved;
  img.dirty=true;cv.setActiveObject(img);cv.requestRenderAll();
  if(apply)push();refreshProps();refreshLayers();
}
['object:moving','object:scaling'].forEach(ev=>cv.on(ev,e=>{if(cropMode&&e.target===cropMode.cr)clampCrop()}));
cv.on('object:modified',e=>{if(cropMode&&e.target===cropMode.cr)clampCrop()});
cv.on('mouse:down',e=>{if(cropMode&&e.target!==cropMode.cr)endCrop(true)});
cv.on('mouse:dblclick',e=>{if(!cropMode&&e.target&&e.target.type==='image'&&!e.target.isBg&&!e.target.locked)startCrop(e.target)});

/* ---------- Mi biblioteca de imágenes (Supabase Storage) ---------- */
const myUid=()=>{const s=SB.sess();return s&&s.user&&s.user.id};
async function stFetch(path,method,body){
  const c=SB.cfg(),s=await SB.fresh();if(!c||!s)throw new Error('Inicia sesión (botón Nube) para usar tu biblioteca');
  const r=await fetch(c.url+path,{method,headers:{apikey:c.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>null);if(!r.ok)throw new Error((j&&(j.message||j.error))||('Error '+r.status));
  return{j,c};
}
async function libList(offset,limit){
  const uid=myUid(),{j,c}=await stFetch('/storage/v1/object/list/design-images','POST',{prefix:uid+'/',limit,offset,sortBy:{column:'created_at',order:'desc'}});
  return(j||[]).filter(f=>f&&/\.(png|jpe?g|webp)$/i.test(f.name||'')).map(f=>({name:f.name,size:(f.metadata&&f.metadata.size)||0,created:f.created_at,url:`${c.url}/storage/v1/object/public/design-images/${uid}/${f.name}`}));
}
async function libDelete(names){
  const uid=myUid();await stFetch('/storage/v1/object/design-images','DELETE',{prefixes:names.map(n=>uid+'/'+n)});
  names.forEach(n=>upHashes.delete(uid+'/'+n));store.set('lienzo-up',JSON.stringify([...upHashes].slice(-800)));
}
async function libCleanup(){
  const files=[];for(let off=0;;off+=100){const part=await libList(off,100);files.push(...part);if(part.length<100)break}
  const old=files.filter(f=>Date.now()-new Date(f.created||0).getTime()>3600e3);
  const used=JSON.stringify(projectObj())+JSON.stringify(await sbReq('/rest/v1/designs?select=data'))+JSON.stringify(await sbReq('/rest/v1/design_versions?select=data'));
  return{total:files.length,unused:old.filter(f=>!used.includes(f.name))};
}
function libSection(){
  const wrap=h('div');wrap.append(h('h3',{},'Mi biblioteca'));
  if(!(SB.cfg()&&SB.sess())){wrap.append(h('div',{class:'hint'},'Inicia sesión (botón Nube) para guardar y reutilizar tus imágenes en la nube.'));return wrap}
  const grid=h('div',{class:'grid g2'}),status=h('div',{class:'hint',style:'margin:6px 0'});let offset=0,more=true,busy=false;
  const reset=async()=>{grid.textContent='';offset=0;more=true;busy=false;await load()};
  const addItem=it=>{
    const cell=h('div',{class:'libitem',title:'Añadir al diseño',onclick:()=>fabric.Image.fromURL(it.url,img=>{
      if(!img||!img.width){toast('No se pudo cargar la imagen');return}const k=Math.min(W*.6/img.width,H*.6/img.height,1);img.scale(k);addObj(img,'Imagen')},{crossOrigin:'anonymous'})},
      h('img',{src:it.url,loading:'lazy',alt:''}),
      h('button',{class:'x',title:'Eliminar de la biblioteca',onclick:async e=>{e.stopPropagation();
        if(!confirm('¿Eliminar esta imagen de tu biblioteca? Si la usas en algún diseño dejará de verse.'))return;
        try{await libDelete([it.name]);cell.remove();toast('Imagen eliminada')}catch(err){toast(err.message)}}},'×'));
    grid.append(cell);
  };
  const moreBtn=h('button',{class:'btn sm wide',onclick:()=>load()},'Cargar más');
  async function load(){
    if(busy||!more)return;busy=true;status.textContent='Cargando…';
    try{const part=await libList(offset,24);offset+=24;if(part.length<24)more=false;part.forEach(addItem);
      status.textContent=grid.children.length?'':'Todavía no tienes imágenes en la biblioteca.';moreBtn.style.display=more?'':'none'}
    catch(e){status.textContent=e.message}
    busy=false;
  }
  const up=h('input',{type:'file',accept:'image/*',multiple:'multiple',hidden:'hidden'});
  up.onchange=async()=>{status.textContent='Subiendo…';
    try{for(const f of [...up.files])await uploadImage(await readImage(f));await reset();toast('Imágenes subidas')}catch(e){status.textContent=e.message}up.value=''};
  const clean=h('button',{class:'btn sm',onclick:async()=>{
    status.textContent='Buscando imágenes sin usar…';
    try{const {total,unused}=await libCleanup();status.textContent='';
      if(!unused.length){toast(`No hay imágenes sin usar (${total} en total)`);return}
      const mb=(unused.reduce((s,f)=>s+f.size,0)/1048576).toFixed(1);
      if(!confirm(`Hay ${unused.length} imágenes sin usar (${mb} MB): no aparecen en ningún diseño ni versión guardada. ¿Eliminarlas?`))return;
      for(let i=0;i<unused.length;i+=50)await libDelete(unused.slice(i,i+50).map(f=>f.name));
      await reset();toast(`${unused.length} imágenes eliminadas`)}
    catch(e){status.textContent=e.message}}},'Limpiar sin usar');
  wrap.append(h('div',{class:'row'},h('button',{class:'btn sm',onclick:()=>up.click()},icl('upload','Subir')),clean),up,status,grid,moreBtn);
  load();return wrap;
}

/* ---------- IA: probar otro estilo (colores y fuentes) ---------- */
function recolorAll(map){
  const rec=c=>{const al=new fabric.Color(c).getAlpha(),nh=map[hexOf(c)];return al<1?new fabric.Color(nh).setAlpha(al).toRgba():nh};
  const has=c=>typeof c==='string'&&!!map[hexOf(c)];
  const walk=o=>{
    if(o._g){['c1','c2'].forEach(k=>{const x=hexOf(o._g[k]);if(x&&map[x])o._g[k]=map[x]});setGrad(o)}
    else if(has(o.fill))o.set('fill',rec(o.fill));
    if(has(o.stroke))o.set('stroke',rec(o.stroke));
    if(has(o.textBackgroundColor))o.set('textBackgroundColor',map[hexOf(o.textBackgroundColor)]);
    if(o.shadow&&has(o.shadow.color))o.shadow.color=rec(o.shadow.color);
    if(o._arc&&has(o._arc.fill))o._arc.fill=map[hexOf(o._arc.fill)];
    o.dirty=true;(o._objects||[]).forEach(walk);
  };
  cv.getObjects().forEach(walk);
}
function refontAll(map){
  const walk=o=>{
    if(o.fontFamily&&map[o.fontFamily])o.set('fontFamily',map[o.fontFamily]);
    if(o._arc&&map[o._arc.fontFamily])o._arc.fontFamily=map[o._arc.fontFamily];
    o.dirty=true;(o._objects||[]).forEach(walk);
  };
  cv.getObjects().forEach(walk);
}
function autoContrast(){
  let fixed=0;
  cv.getObjects().forEach(o=>{
    if(o.type!=='textbox'||o.isBg)return;const ci=contrastInfo(o);if(!ci)return;
    const need=o.fontSize>=Math.max(24,.035*Math.min(W,H))?3:4.5;
    if(ci.ratio<need){o.set('fill',ratioOf([255,255,255],ci.bg)>ratioOf([0,0,0],ci.bg)?'#ffffff':'#000000');o._solid=o.fill;fixed++}
  });
  return fixed;
}
async function aiRestyle(desc){
  endCrop(true);cv.discardActiveObject();
  const colors=allDocColors(),fonts=[...new Set(cv.getObjects().flatMap(o=>{const s=new Set();collectFonts(o,s);return[...s]}))];
  const txt=await askClaude(`Eres un director de arte. Recibes los colores (#rrggbb) y las fuentes de un diseño gráfico y una petición de estilo. Devuelve SOLO un objeto JSON con esta forma: {"colors":{"#viejo":"#nuevo"},"fonts":{"Fuente actual":"Fuente nueva"}}. Reglas: da un color nuevo a cada color existente, coherente con el estilo pedido y con buena armonía; mantén contraste suficiente entre colores de texto y de fondo; usa SOLO estas fuentes: ${FONTS.join(', ')}. Si una fuente no necesita cambiar, no la incluyas.`,
    JSON.stringify({estilo:desc,colors,fonts}),1200);
  const spec=parseJSON(txt),cmap={},fmap={};
  Object.entries(spec.colors||{}).forEach(([o,n])=>{const a=hexc(String(o).toLowerCase(),null),b=hexc(String(n),null);if(a&&b&&colors.includes(a))cmap[a]=b.toLowerCase()});
  Object.entries(spec.fonts||{}).forEach(([o,n])=>{if(fonts.includes(o)&&FONTS.includes(n))fmap[o]=n});
  if(!Object.keys(cmap).length&&!Object.keys(fmap).length)throw new Error('La IA no propuso cambios válidos');
  recolorAll(cmap);refontAll(fmap);await ensureFonts([...new Set(Object.values(fmap))]);cv.getObjects().forEach(reinitText);
  const fixed=autoContrast();cv.requestRenderAll();push();refresh();
  return{colors:Object.keys(cmap).length,fonts:Object.keys(fmap).length,fixed};
}

/* ---------- Asistente con IA (clave propia de Anthropic) ---------- */
const AIcfg={get(){try{return JSON.parse(store.get('lienzo-ai'))||{}}catch(e){return{}}},set(v){store.set('lienzo-ai',JSON.stringify(v))}};
const AI_PROXY=()=>String(window.LIENZO_AI_PROXY||'').trim();
async function askClaude(system,user,max=2500,images=[]){
  const cfg=AIcfg.get();
  if(AI_PROXY()){
    const s=SB.cfg()?await SB.fresh():null;
    const r=await fetch(AI_PROXY(),{method:'POST',headers:Object.assign({'content-type':'application/json'},s?{Authorization:'Bearer '+s.access_token}:{}),
      body:JSON.stringify({system,user,max_tokens:max,model:cfg.model,images})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){openCloud();throw new Error('Inicia sesión (botón Nube) para usar la IA')}
    if(!r.ok)throw new Error(j.error||('Error '+r.status));
    return j.text||'';
  }
  if(!cfg.key){openAI();throw new Error('Añade primero tu clave de API')}
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
    headers:{'content-type':'application/json','x-api-key':cfg.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:cfg.model||'claude-sonnet-5-5',max_tokens:max,system,messages:[{role:'user',content:images.length?[...images.map(im=>({type:'image',source:{type:'base64',media_type:im.media_type,data:im.data}})),{type:'text',text:user}]:user}]})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error((j.error&&j.error.message)||('Error '+r.status));
  return(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
}
function parseJSON(t){const a=t.search(/[\[{]/),b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));if(a<0||b<a)throw new Error('La IA no devolvió un resultado válido');return JSON.parse(t.slice(a,b+1))}
const hexc=(c,d)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:d;
const numc=(v,a,b,d)=>{v=+v;return isFinite(v)?clamp(v,a,b):d};
function renderAIDesign(spec){
  cv.discardActiveObject();
  batch(()=>{
    cv.getObjects().slice().forEach(o=>cv.remove(o));
    const bg=spec.background||{};
    if(Array.isArray(bg.gradient)&&bg.gradient.length>=2)setBg({g:[hexc(bg.gradient[0],'#6c4cf1'),hexc(bg.gradient[1],'#18c5b4'),numc(bg.gradient[2],0,360,135)]});
    else setBg(hexc(bg.color,'#ffffff'));
    (Array.isArray(spec.elements)?spec.elements:[]).slice(0,18).forEach(e=>{
      if(!e||typeof e!=='object')return;
      const x=numc(e.x,0,1,.5),y=numc(e.y,0,1,.5);
      if(e.type==='text'&&e.text){
        T(String(e.text).slice(0,220),x,y,numc(e.size,.015,.3,.05),{fontFamily:FONTS.includes(e.font)?e.font:'Poppins',fontWeight:numc(e.weight,300,900,700),fill:hexc(e.color,'#1f2430'),
          textAlign:['left','center','right'].includes(e.align)?e.align:'center',width:W*numc(e.width,.1,1,.8),charSpacing:numc(e.spacing,0,800,0)});
      }else if(e.type==='rect'){
        const w=numc(e.w,.005,1,.3),hh=numc(e.h,.003,1,.2),r=numc(e.radius,0,1,0)*Math.min(w*W,hh*H)/2;
        R(x,y,w,hh,hexc(e.fill,'#6c4cf1'),{rx:r,ry:r});
      }else if(e.type==='circle'){C(x,y,numc(e.r,.004,.6,.1),hexc(e.fill,'#6c4cf1'))}
      else if(e.type==='icon'&&LIB[e.name]){
        const pth=libIcon(LIB[e.name],hexc(e.color,'#1f2430')),size=S_()*numc(e.size,.03,.5,.12);pth.scaleToWidth(size);pth.set({strokeWidth:size/17,left:x*W,top:y*H,name:e.name});cv.add(pth);
      }
    });
  });
  ensureFonts();
}
const AI_DESIGN_SYS=()=>`Eres un diseñador gráfico experto. Devuelve SOLO un objeto JSON válido, sin markdown ni explicaciones, con este esquema:
{"background":{"color":"#rrggbb"} o {"gradient":["#rrggbb","#rrggbb",angulo_en_grados]},
"elements":[ {"type":"text","text":"...","x":0.5,"y":0.3,"size":0.08,"font":"Poppins","weight":700,"color":"#rrggbb","align":"center","width":0.8,"spacing":0},
{"type":"rect","x":0.5,"y":0.8,"w":0.4,"h":0.1,"fill":"#rrggbb","radius":0.5},
{"type":"circle","x":0.8,"y":0.2,"r":0.2,"fill":"#rrggbb"},
{"type":"icon","name":"Corazón","x":0.5,"y":0.5,"size":0.15,"color":"#rrggbb"} ]}
Reglas: x e y son el CENTRO del elemento como fracción 0-1 del lienzo; w, h y width son fracciones del ancho/alto; size y r son fracciones del lado menor (texto entre 0.02 y 0.2). Los elementos se dibujan en orden (los primeros quedan al fondo). Máximo 14 elementos. Jerarquía clara, buen contraste, márgenes amplios, textos cortos. Idioma de los textos: el de la descripción. Fuentes permitidas: ${FONTS.join(', ')}. Iconos permitidos: ${Object.keys(LIB).join(', ')}.`;
function openAI(o){
  const cfg=AIcfg.get(),C_=$('aiCard');C_.textContent='';
  const key=h('input',{type:'password',placeholder:'sk-ant-…',value:cfg.key||''});
  const model=h('select',{class:'sel'},[['claude-sonnet-5-5','Sonnet 5.5 (equilibrado)'],['claude-haiku-5-5','Haiku 5.5 (rápido)'],['claude-opus-5-5','Opus 5.5 (máxima calidad)']].map(([v,l])=>h('option',{value:v},l)));model.value=cfg.model||'claude-sonnet-5-5';
  const save=()=>{AIcfg.set({key:key.value.trim(),model:model.value})};key.onchange=save;model.onchange=save;
  const run=async(btn,status,fn)=>{save();btn.disabled=true;status.textContent='Trabajando…';try{await fn();status.textContent='Listo';}catch(e){status.textContent='';toast(e.message||'Error')}btn.disabled=false};
  const prompt_=h('textarea',{rows:3,placeholder:'Ej.: Cartel para una cafetería, tonos cálidos, título "Café de especialidad" y "2x1 los lunes"'});
  const st1=h('span',{class:'hint'}),b1=h('button',{class:'btn on wide'},'Generar diseño');
  b1.onclick=()=>run(b1,st1,async()=>{
    if(!prompt_.value.trim())throw new Error('Describe el diseño que quieres');
    const txt=await askClaude(AI_DESIGN_SYS(),`Formato del lienzo: ${W}x${H} px.\nDescripción: ${prompt_.value.trim()}`,3000);
    renderAIDesign(parseJSON(txt));$('mAI').classList.remove('on');toast('Diseño generado. Puedes editarlo o deshacer con Ctrl+Z');
  });
  const modes=[['Mejorar la redacción','Mejora la redacción manteniendo el significado y la longitud aproximada.'],['Hacerlo más corto','Reescríbelo mucho más corto y directo, ideal para un diseño gráfico.'],['Más persuasivo','Reescríbelo de forma más persuasiva y atractiva, con un llamado a la acción si encaja.'],['Traducir al inglés','Traduce al inglés.'],['Traducir al español','Traduce al español.'],['Corregir ortografía','Corrige la ortografía y la gramática sin cambiar el estilo.']];
  const mode=h('select',{class:'sel'},modes.map(([n],i)=>h('option',{value:i},n)));
  const st2=h('span',{class:'hint'}),b2=h('button',{class:'btn wide'},'Reescribir el texto seleccionado');
  b2.onclick=()=>run(b2,st2,async()=>{
    const t=cv.getActiveObject();if(!t||t.type!=='textbox')throw new Error('Selecciona primero un cuadro de texto');
    const out=await askClaude('Eres un redactor publicitario. Devuelve únicamente el texto resultante, sin comillas, sin explicaciones y conservando los saltos de línea.',`${modes[mode.value][1]}\n\nTexto:\n${t.text}`,800);
    t.set('text',out.trim());t.initDimensions();commit();refreshProps();$('mAI').classList.remove('on');
  });
  const pdesc=h('input',{type:'text',placeholder:'Ej.: marca de café artesanal, cálida y natural'});
  const st3=h('span',{class:'hint'}),b3=h('button',{class:'btn wide'},'Crear paleta de marca');
  b3.onclick=()=>run(b3,st3,async()=>{
    if(!pdesc.value.trim())throw new Error('Describe el estilo de la marca');
    const arr=parseJSON(await askClaude('Eres un director de arte. Devuelve SOLO un array JSON con 6 colores hexadecimales (#rrggbb) armoniosos y con buen contraste entre sí: 4 de acento, 1 oscuro para texto y 1 claro.',pdesc.value.trim(),300));
    const cols=arr.filter(c=>hexc(c,null)).slice(0,6);if(cols.length<6)throw new Error('La paleta no es válida');
    store.set('lienzo-brand',JSON.stringify(cols));if(tab==='bg')showPanel();refreshProps();toast('Kit de marca actualizado');$('mAI').classList.remove('on');
  });
  const sdesc=h('input',{type:'text',placeholder:'Ej.: más elegante y minimalista, tonos pastel'});
  const st4=h('span',{class:'hint'}),b4=h('button',{class:'btn wide'},'Probar otro estilo');
  b4.onclick=()=>run(b4,st4,async()=>{
    if(!sdesc.value.trim())throw new Error('Describe el estilo que quieres');
    const r=await aiRestyle(sdesc.value.trim());$('mAI').classList.remove('on');
    toast(`Estilo aplicado (${r.colors} colores, ${r.fonts} fuentes${r.fixed?`, contraste ajustado en ${r.fixed} textos`:''}). Ctrl+Z para deshacer`);
  });
  C_.append(h('h2',{},'Asistente con IA'),
    AI_PROXY()?h('div',{class:'hint'},'La IA funciona a través del servidor de este editor. Necesitas haber iniciado sesión (botón Nube) y hay un límite de peticiones por hora.')
      :h('div',{class:'hint'},'Usa tu propia clave de API de Anthropic. Se guarda solo en este navegador y se envía únicamente a api.anthropic.com. Recomendado: una clave con límite de gasto.'),
    !AI_PROXY()&&h('div',{class:'fld'},h('label',{},'Clave de API'),key),h('div',{class:'fld'},h('label',{},'Modelo'),model),
    h('div',{class:'blk'},h('h3',{},'Diseño desde una descripción'),prompt_,h('div',{class:'hint'},'Reemplaza el contenido de la página actual. Se puede deshacer.'),b1,st1),
    h('div',{class:'blk'},h('h3',{},'Redactar con IA'),mode,h('div',{style:'height:6px'}),b2,st2),
    h('div',{class:'blk'},h('h3',{},'Probar otro estilo'),h('div',{class:'hint'},'Cambia los colores y las fuentes del diseño actual y ajusta el contraste del texto; la estructura no se toca.'),sdesc,h('div',{style:'height:6px'}),b4,st4),
    h('div',{class:'blk'},h('h3',{},'Paleta de marca'),pdesc,h('div',{style:'height:6px'}),b3,st3),
    h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn',onclick:()=>$('mAI').classList.remove('on')},'Cerrar')));
  $('mAI').classList.add('on');
}
$('ai').onclick=()=>openAI();

/* ---------- Móvil / táctil ---------- */
$('fab').append(ic('sliders'));
$('fab').onclick=()=>{const b=document.body;b.classList.toggle('sr');b.classList.remove('sp')};
stage.addEventListener('pointerdown',()=>{if(isMobile())document.body.classList.remove('sp','sr')},true);
let pinch=null;
const tdist=e=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
const tmid=e=>({x:(e.touches[0].clientX+e.touches[1].clientX)/2,y:(e.touches[0].clientY+e.touches[1].clientY)/2});
stage.addEventListener('touchstart',e=>{if(e.touches.length===2){e.stopPropagation();cv.discardActiveObject();cv.requestRenderAll();pinch={d:tdist(e),z:zoom,m:tmid(e)}}},{capture:true,passive:true});
stage.addEventListener('touchmove',e=>{
  if(pinch&&e.touches.length===2){e.preventDefault();e.stopPropagation();const m=tmid(e);
    stage.scrollLeft-=m.x-pinch.m.x;stage.scrollTop-=m.y-pinch.m.y;pinch.m=m;setZoom(pinch.z*tdist(e)/pinch.d)}
},{capture:true,passive:false});
stage.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{capture:true,passive:true});

/* ---------- Mover vista con Espacio ---------- */
let space=false,pan=null;
const typing=e=>/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')||(cv.getActiveObject()&&cv.getActiveObject().isEditing);
addEventListener('keydown',e=>{if(e.code==='Space'&&!presImgs&&!typing(e)){space=true;stage.style.cursor='grab';e.preventDefault()}});
addEventListener('keyup',e=>{if(e.code==='Space'){space=false;stage.style.cursor=''}});
stage.addEventListener('mousedown',e=>{if(!space)return;e.stopPropagation();e.preventDefault();pan={x:e.clientX,y:e.clientY,l:stage.scrollLeft,t:stage.scrollTop};stage.style.cursor='grabbing'},true);
addEventListener('mousemove',e=>{if(pan){stage.scrollLeft=pan.l-(e.clientX-pan.x);stage.scrollTop=pan.t-(e.clientY-pan.y)}});
addEventListener('mouseup',()=>{if(pan){pan=null;stage.style.cursor=space?'grab':''}});

/* ---------- PWA ---------- */
let deferredInstall=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('install').style.display=''});
$('install').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice.catch(()=>{});deferredInstall=null;$('install').style.display='none'};
addEventListener('appinstalled',()=>{$('install').style.display='none'});
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}

/* ---------- Arranque ---------- */
(async function boot(){
  fillIcons();$('logo').append(ic('logo',22),' Lienzo');buildSizes();buildRail();showPanel();
  const shared=new URLSearchParams(location.search).get('d');
  if(shared&&SB.cfg()){
    try{const d=await sbGetDesign(shared);await loadProject(d.data);const me=SB.sess();const role=(me&&me.user&&me.user.id===d.owner)?'owner':(me?await myRole(d.id):null);cloud.id=(role==='owner'||role==='editor')?d.id:null;cloud.role=role;cloud.viewId=me?d.id:null;
      toast(cloud.id?'Diseño abierto desde la nube':'Diseño compartido abierto como copia (guárdalo en tu cuenta para conservarlo)');return}
    catch(e){toast('No se pudo abrir el diseño compartido')}
  }
  let p=null;try{p=JSON.parse(store.get('lienzo-v2'))}catch(e){}
  if(p&&p.pages&&p.pages[0]){try{await loadProject(p);return}catch(e){}}
  W=1080;H=1080;syncSize();fit();
  lock=true;setBg('#ffffff');lock=false;
  await applyTemplate(0);
  saveCur();thumbs[0]=thumb();resetHist();refresh();
})().then(()=>autoJoin());
