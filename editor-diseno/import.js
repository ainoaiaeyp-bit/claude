'use strict';
/* ---------- Importar archivos: PDF (texto editable), SVG, texto e imágenes ---------- */
const PDFJS_BASE='vendor/pdfjs/';
const PDF_MAX_PAGES=60;
let pdfjsPromise=null;

function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(!pdfjsPromise)pdfjsPromise=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=PDFJS_BASE+'pdf.min.js';
    s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_BASE+'pdf.worker.min.js';res(window.pdfjsLib)};
    s.onerror=()=>{pdfjsPromise=null;rej(new Error('No se pudo cargar el lector de PDF'))};
    document.head.append(s);
  });
  return pdfjsPromise;
}

/* ---------- Enrutado de archivos ---------- */
function fileKind(f){
  const n=(f.name||'').toLowerCase(),t=f.type||'';
  if(t==='application/pdf'||n.endsWith('.pdf'))return 'pdf';
  if(t==='image/svg+xml'||n.endsWith('.svg'))return 'svg';
  if(t.startsWith('image/'))return 'image';
  if(n.endsWith('.json')||t==='application/json')return 'json';
  if(/\.(txt|md|csv|tsv)$/.test(n)||t.startsWith('text/'))return 'text';
  if(/\.(docx?|pptx?|xlsx?|odt|odp|ods|pages|key|numbers)$/.test(n))return 'office';
  return 'other';
}
async function handleFiles(files,opts={}){
  const list=[...files];let pdfDone=false;
  for(let i=0;i<list.length;i++){
    const f=list[i],k=fileKind(f);
    try{
      if(k==='image')await addImageFile(f,false,i===0?opts.frame:null);
      else if(k==='pdf'){if(!pdfDone){pdfDone=true;await openImport(f)}else toast('Solo se importa un PDF cada vez')}
      else if(k==='svg')await addSvgFile(f);
      else if(k==='json'){if(confirm('Abrir este proyecto reemplazará el diseño actual. ¿Continuar?'))await loadProject(JSON.parse(await f.text()))}
      else if(k==='text')await addTextFile(f);
      else if(k==='office')toast('Word, PowerPoint y Excel no se pueden leer directamente: expórtalo a PDF desde su programa e impórtalo aquí');
      else toast('Tipo de archivo no compatible: '+(f.name||'archivo'));
    }catch(e){toast(e&&e.message?e.message:'No se pudo importar el archivo')}
  }
}
async function addSvgFile(f){
  const txt=await f.text();
  if(/<script|\son\w+\s*=|javascript:/i.test(txt)){toast('El SVG contiene código y no se importa por seguridad');return}
  fabric.loadSVGFromString(txt,(objs,o)=>{
    if(!objs||!objs.length){toast('No se pudo leer el SVG');return}
    const g=fabric.util.groupSVGElements(objs,o),k=Math.min(W*.7/g.width,H*.7/g.height,4);g.scale(k);addObj(g,'SVG');
  });
}
async function addTextFile(f){
  let t=(await f.text()).replace(/\r\n/g,'\n');if(t.length>20000){t=t.slice(0,20000);toast('El texto se ha recortado a 20 000 caracteres')}
  if(!t.trim()){toast('El archivo está vacío');return}
  await ensureFonts(['Poppins']);addObj(new fabric.Textbox(t,{width:W*.8,fontSize:Math.max(14,.03*Math.min(W,H)),fontFamily:'Poppins',fontWeight:400,fill:'#1f2430',textAlign:'left'}),'Texto');
}

/* ---------- Fuentes del PDF → fuentes de Lienzo ---------- */
function mapPdfFont(fo,fname){
  const raw=String((fo&&fo.name)||fname||'').replace(/^[A-Z]{6}\+/,''),low=raw.toLowerCase();
  let family='Arial';
  const known=[['roboto','Roboto'],['montserrat','Montserrat'],['poppins','Poppins'],['raleway','Raleway'],['playfair','Playfair Display'],['merriweather','Merriweather'],['oswald','Oswald'],
    ['lora','Lora'],['cinzel','Cinzel'],['josefin','Josefin Sans'],['space','Space Grotesk'],['bebas','Bebas Neue'],['anton','Anton'],['pacifico','Pacifico'],['lobster','Lobster'],
    ['dancing','Dancing Script'],['caveat','Caveat'],['satisfy','Satisfy'],['righteous','Righteous'],['abril','Abril Fatface'],['permanent','Permanent Marker']];
  const hit=known.find(([k])=>low.includes(k));
  if(hit)family=hit[1];
  else if(/courier|mono|consolas|menlo|typewriter|lucida console/.test(low)||(fo&&fo.isMonospace))family='Courier New';
  else if(/times|georgia|garamond|palatino|bookman|cambria|minion|caslon|baskerville|didot|serif/.test(low)&&!/sans/.test(low)||(fo&&fo.isSerifFont&&!/sans/.test(low)))family='Georgia';
  const bold=/bold|black|heavy|semibold|demi|extrabold|ultra/.test(low)||!!(fo&&(fo.bold||fo.black));
  const italic=/italic|oblique/.test(low)||!!(fo&&fo.italic);
  return{family,bold,italic};
}

/* ---------- Color de la tinta: comparamos la página con y sin texto ---------- */
function inkColor(fullCtx,bgCtx,x,y,w,h){
  x=Math.max(0,Math.floor(x));y=Math.max(0,Math.floor(y));
  const cw=fullCtx.canvas.width,ch=fullCtx.canvas.height;w=Math.min(cw-x,Math.ceil(w));h=Math.min(ch-y,Math.ceil(h));
  if(w<2||h<2)return null;
  const A=fullCtx.getImageData(x,y,w,h).data,B=bgCtx.getImageData(x,y,w,h).data,n=w*h,d=new Float32Array(n),px=new Float32Array(n*3);let max=0;
  for(let i=0;i<n;i++){
    const aa=A[i*4+3]/255,ab=B[i*4+3]/255;
    const fr=A[i*4]*aa+255*(1-aa),fg=A[i*4+1]*aa+255*(1-aa),fb=A[i*4+2]*aa+255*(1-aa);
    const br=B[i*4]*ab+255*(1-ab),bg=B[i*4+1]*ab+255*(1-ab),bb=B[i*4+2]*ab+255*(1-ab);
    const df=Math.abs(fr-br)+Math.abs(fg-bg)+Math.abs(fb-bb);d[i]=df;px[i*3]=fr;px[i*3+1]=fg;px[i*3+2]=fb;if(df>max)max=df;
  }
  if(max<60)return null;
  let r=0,g=0,b=0,c=0;for(let i=0;i<n;i++)if(d[i]>=max*.7){r+=px[i*3];g+=px[i*3+1];b+=px[i*3+2];c++}
  if(!c)return null;
  const hx=v=>Math.round(v/c).toString(16).padStart(2,'0');return'#'+hx(r)+hx(g)+hx(b);
}
const colorClose=(a,b)=>{if(!a||!b)return a===b;const p=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));const x=p(a),y=p(b);return Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1])+Math.abs(x[2]-y[2])<90};

/* ---------- Texto del PDF → cajas de texto editables ---------- */
function extractTextBoxes(tc,page,vpD,k,q,fullCtx,bgCtx){
  const items=[];
  for(const it of tc.items){
    if(typeof it.str!=='string'||!it.str.length)continue;
    const tx=pdfjsLib.Util.transform(vpD.transform,it.transform),fs=Math.hypot(tx[2],tx[3]);
    if(!(fs>2))continue;
    let fo=null;try{fo=page.commonObjs.has(it.fontName)?page.commonObjs.get(it.fontName):null}catch(e){}
    const f=mapPdfFont(fo,it.fontName),ang=Math.atan2(tx[1],tx[0])*180/Math.PI,wpx=Math.abs(it.width)*k;
    const topLeft={x:tx[4]+tx[2]*FAB_BASE,y:tx[5]+tx[3]*FAB_BASE};   // esquina superior izquierda de la caja (línea base − 0,879·tamaño)
    let color=null;
    if(fullCtx&&bgCtx&&Math.abs(ang)<1)color=inkColor(fullCtx,bgCtx,topLeft.x*q,topLeft.y*q,wpx*q,fs*1.05*q);
    items.push({str:it.str,x:tx[4],y:tx[5],tl:topLeft,fs,ang,w:wpx,f,color});
  }
  // 1) unir fragmentos de la misma línea con el mismo estilo
  const lines=[];
  for(const it of items){
    const last=lines[lines.length-1];
    if(last){
      const sameStyle=Math.abs(last.ang-it.ang)<2&&Math.abs(last.fs-it.fs)<last.fs*.12&&last.f.family===it.f.family&&last.f.bold===it.f.bold&&last.f.italic===it.f.italic&&colorClose(last.color,it.color);
      const dy=Math.abs(last.y-it.y),gap=it.x-(last.x+last.w);
      if(sameStyle&&dy<last.fs*.3&&gap>-last.fs*.3&&gap<last.fs*.7){
        last.str+=(gap>last.fs*.12&&!/\s$/.test(last.str)&&!/^\s/.test(it.str)?' ':'')+it.str;last.w=it.x+it.w-last.x;continue;
      }
    }
    lines.push(Object.assign({},it));
  }
  const clean=lines.map(l=>Object.assign(l,{str:l.str.replace(/\s+$/,'')})).filter(l=>l.str.trim().length);
  // 2) unir líneas consecutivas del mismo bloque (mismo estilo, misma sangría y separación normal)
  const blocks=[];
  for(const l of clean){
    const b=blocks[blocks.length-1];
    if(b&&Math.abs(b.ang)<1&&Math.abs(l.ang)<1){
      const last=b.lines[b.lines.length-1],sp=l.y-last.y,sameStyle=Math.abs(last.fs-l.fs)<last.fs*.08&&last.f.family===l.f.family&&last.f.bold===l.f.bold&&last.f.italic===l.f.italic&&colorClose(last.color,l.color);
      if(sameStyle&&Math.abs(l.x-last.x)<last.fs*.6&&sp>last.fs*.9&&sp<last.fs*1.9&&(b.sp==null||Math.abs(sp-b.sp)<last.fs*.25)){b.lines.push(l);b.sp=sp;continue}
    }
    blocks.push({lines:[l],ang:l.ang,sp:null});
  }
  return blocks;
}
// Distancia (en múltiplos del tamaño) desde la parte superior de la caja de texto de Fabric hasta la línea base.
const FAB_BASE=0.879;   // = (1 - 0,222) · 1,13: así coloca Fabric la línea base dentro de su caja de texto

function makeTextbox(b,DW,ox,oy){
  const l0=b.lines[0],fs=l0.fs,maxW=Math.max(...b.lines.map(l=>l.w)),text=b.lines.map(l=>l.str).join('\n');
  const lh=b.sp?Math.max(.8,Math.min(3,b.sp/(fs*1.13))):1.16;
  const tb=new fabric.Textbox(text,{originX:'left',originY:'top',left:ox+l0.x-(Math.abs(l0.ang)<1?0:0),top:oy+l0.y-fs*FAB_BASE,
    width:Math.min(DW*1.2,maxW*1.12+fs*.6),fontSize:fs,fontFamily:l0.f.family,fontWeight:l0.f.bold?'bold':'normal',fontStyle:l0.f.italic?'italic':'normal',
    fill:l0.color||'#000000',lineHeight:lh,textAlign:'left',name:'Texto del PDF'});
  if(Math.abs(l0.ang)>=1){tb.set({left:ox+l0.tl.x,top:oy+l0.tl.y,angle:l0.ang})}
  return tb;
}

/* ---------- Importación de páginas ---------- */
function parsePageRange(str,total){
  const s=String(str||'').trim().toLowerCase();if(!s||s==='todas'||s==='all'||s==='*')return Array.from({length:total},(_,i)=>i+1);
  const set=new Set();
  s.split(/[,;\s]+/).filter(Boolean).forEach(tok=>{
    const m=/^(\d+)(?:-(\d+))?$/.exec(tok);if(!m)return;
    let a=+m[1],b=m[2]?+m[2]:a;if(a>b)[a,b]=[b,a];for(let i=Math.max(1,a);i<=Math.min(total,b);i++)set.add(i);
  });
  return [...set].sort((x,y)=>x-y);
}
function hasAlpha(canvas){
  const x=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,step=Math.max(1,Math.floor(Math.sqrt(w*h/20000)));
  for(let yy=0;yy<h;yy+=step){const d=x.getImageData(0,yy,w,1).data;for(let xx=0;xx<w;xx+=step){if(d[xx*4+3]<250)return true}}
  return false;
}
async function importPdfPages(doc,o,progress){
  endCrop(true);cv.discardActiveObject();saveCur();
  const oldW=W,oldH=H,oldCur=cur,oldPages=pages,oldThumbs=thumbs;
  const first=await doc.getPage(o.pages[0]),vp0=first.getViewport({scale:1});
  let DW=W,DH=H;
  if(o.mode==='replace'){const cap=Math.min(1,3000/(Math.max(vp0.width,vp0.height)*4/3));DW=Math.round(vp0.width*4/3*cap);DH=Math.round(vp0.height*4/3*cap)}
  const newPages=[],newThumbs=[];
  try{
    if(DW!==W||DH!==H){W=DW;H=DH;syncSize();fit()}
    for(let i=0;i<o.pages.length;i++){
      if(o.cancelled)throw new Error('Importación cancelada');
      progress(`Importando página ${i+1} de ${o.pages.length}…`);await sleep(10);
      const page=await doc.getPage(o.pages[i]),vp1=page.getViewport({scale:1}),k=Math.min(DW/vp1.width,DH/vp1.height);
      const q=Math.max(1,Math.min(o.quality,5000/(Math.max(vp1.width,vp1.height)*k))),vpR=page.getViewport({scale:k*q}),vpD=page.getViewport({scale:k});
      const mk=()=>{const c=document.createElement('canvas');c.width=Math.ceil(vpR.width);c.height=Math.ceil(vpR.height);return c};
      const bgC=mk(),bgX=bgC.getContext('2d',{willReadFrequently:true});
      let fullX=null;
      if(o.editable){
        const fullC=mk();fullX=fullC.getContext('2d',{willReadFrequently:true});
        await page.render({canvasContext:fullX,viewport:vpR}).promise;
        bgX.fillText=()=>{};bgX.strokeText=()=>{};            // la imagen de fondo no lleva el texto: lo pintaremos como texto editable
        await page.render({canvasContext:bgX,viewport:vpR,background:'rgba(0,0,0,0)'}).promise;
      }else await page.render({canvasContext:bgX,viewport:vpR,background:'rgba(0,0,0,0)'}).promise;
      let blocks=[];
      if(o.editable){const tc=await page.getTextContent({normalizeWhitespace:false});blocks=extractTextBoxes(tc,page,vpD,k,q,fullX,bgX)}
      const png=hasAlpha(bgC),url=bgC.toDataURL(png?'image/png':'image/jpeg',.92);
      const ox=(DW-vp1.width*k)/2,oy=(DH-vp1.height*k)/2;
      lock=true;
      try{
        cv.getObjects().slice().forEach(x=>cv.remove(x));setBg('#ffffff');
        await new Promise(r=>fabric.Image.fromURL(url,img=>{img.set({left:ox+vp1.width*k/2,top:oy+vp1.height*k/2,scaleX:1/q,scaleY:1/q,name:'Contenido del PDF'});cv.add(img);r()}));
        blocks.forEach(b=>cv.add(makeTextbox(b,DW,ox,oy)));
        await ensureFonts();cv.getObjects().forEach(reinitText);cv.renderAll();
        newPages.push(cv.toJSON(CUSTOM));newThumbs.push(thumb());
      }finally{lock=false}
      page.cleanup();
    }
  }catch(e){
    W=oldW;H=oldH;syncSize();fit();pages=oldPages;thumbs=oldThumbs;cur=oldCur;
    await loadAsync(pages[cur]);await ensureFonts();refresh();throw e;
  }
  if(o.mode==='replace'){
    pages=newPages;thumbs=newThumbs;cur=0;cloud.id=null;cloud.viewId=null;cloud.role=null;userGuides=[];
    $('name').value=o.title||'PDF importado';
  }else{
    pages.splice(oldCur+1,0,...newPages);thumbs.splice(oldCur+1,0,...newThumbs);cur=oldCur+1;
  }
  await loadAsync(pages[cur]);await ensureFonts();ensureBg();resetHist();refresh();autosave();
  if(typeof collabBroadcastState==='function')collabBroadcastState();
}

/* ---------- Diálogo de importación ---------- */
async function openImport(file){
  let pdfjs;try{pdfjs=await loadPdfJs()}catch(e){toast(e.message);return}
  toast('Leyendo el PDF…');
  let doc;
  try{doc=await pdfjs.getDocument({data:await file.arrayBuffer(),standardFontDataUrl:PDFJS_BASE+'standard_fonts/',cMapUrl:PDFJS_BASE+'cmaps/',cMapPacked:true,isEvalSupported:false}).promise}
  catch(e){toast(e&&e.name==='PasswordException'?'El PDF está protegido con contraseña':'No se pudo leer el PDF');return}
  const C_=$('importCard');C_.textContent='';
  const total=doc.numPages,empty=pages.length===1&&cv.getObjects().filter(x=>!x.isBg).length<=1;
  const range=h('input',{type:'text',value:total<=PDF_MAX_PAGES?'todas':'1-'+PDF_MAX_PAGES,style:'width:100%;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--panel2)'});
  const editable=h('input',{type:'checkbox',checked:'checked'}),qual=h('select',{class:'sel'},h('option',{value:'1.5'},'Normal (recomendada)'),h('option',{value:'2'},'Alta (más pesada)'));
  const mode=h('select',{class:'sel'},h('option',{value:'replace'},'Abrir como diseño nuevo (reemplaza el actual)'),h('option',{value:'append'},'Añadir como páginas nuevas después de la actual'));mode.value=empty?'replace':'append';
  const status=h('div',{class:'hint',style:'min-height:18px;margin-top:8px'});
  const o={cancelled:false};let busy=false;
  const go=h('button',{class:'btn on',onclick:async()=>{
    if(busy)return;const list=parsePageRange(range.value,total).slice(0,PDF_MAX_PAGES);
    if(!list.length){status.textContent='Indica páginas válidas (por ejemplo 1-5, 8)';return}
    if(mode.value==='replace'&&!empty&&!confirm('Esto reemplazará el diseño actual. ¿Continuar?'))return;
    busy=true;go.disabled=true;Object.assign(o,{pages:list,editable:editable.checked,quality:+qual.value,mode:mode.value,title:(file.name||'PDF').replace(/\.pdf$/i,'')});
    try{await importPdfPages(doc,o,t=>{status.textContent=t});$('mImport').classList.remove('on');toast(`PDF importado: ${list.length} ${list.length===1?'página':'páginas'}. Ya puedes editar el texto y pedirle cambios a la IA`)}
    catch(e){status.textContent=e.message||'No se pudo importar el PDF';busy=false;go.disabled=false}
  }},'Importar');
  C_.append(h('h2',{},'Importar PDF'),h('div',{class:'hint',style:'margin-bottom:10px'},`${file.name||'PDF'} · ${total} ${total===1?'página':'páginas'}`),
    h('div',{class:'fld'},h('label',{},'Páginas a importar (máximo '+PDF_MAX_PAGES+')'),range),
    h('label',{class:'hint',style:'display:flex;gap:8px;align-items:center;margin:8px 0'},editable,'Texto editable (el texto se separa de la imagen de fondo)'),
    h('div',{class:'fld'},h('label',{},'Calidad de la imagen de fondo'),qual),h('div',{class:'fld'},h('label',{},'Destino'),mode),
    h('div',{class:'hint'},'Las imágenes y dibujos del PDF quedan en una sola capa de fondo («Contenido del PDF»); el texto pasa a cajas de texto editables. Si el texto está dibujado como curvas o el PDF es un escaneo, no hay texto que extraer.'),
    status,h('div',{class:'row',style:'margin-top:12px'},go,h('button',{class:'btn',onclick:()=>{o.cancelled=true;if(!busy)$('mImport').classList.remove('on')}},'Cancelar')));
  $('mImport').classList.add('on');
}
