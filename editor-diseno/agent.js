'use strict';
/* ---------- Agente de IA: órdenes en lenguaje natural sobre todo el diseño ----------
   1) Resume el documento (páginas, objetos, textos, colores, fuentes, posiciones).
   2) Envía la orden + el resumen (+ vista previa de la página) a Claude, que responde con operaciones JSON.
   3) Un intérprete LOCAL valida y ejecuta solo operaciones de una lista cerrada (nunca código).
   4) Guarda una copia antes de aplicar para poder deshacer todo con un botón.                      */
const AG={busy:false,backup:null,statT:null,hi:-1,hist:(()=>{try{return JSON.parse(store.get('lienzo-ag-hist'))||[]}catch(e){return[]}})()};
const AG_OPS=new Set(['background','style','text','replace','move','delete','order','add','recolor','refont','filter','page','canvas','ocr']);
const AG_MAX_OPS=300;
const AG_SUGGESTIONS=['Cambia el fondo de todas las páginas a azul oscuro','Traduce todo el texto al inglés','Pon todos los títulos en mayúsculas','Haz el texto más grande','Cambia la fuente de todo el diseño a Lora','Alinea todos los textos al centro','Quita todas las imágenes','Añade una página al final con un título','Dale un estilo más elegante y minimalista','Cambia los colores a tonos pastel'];

const normHex=c=>{c=String(c||'').trim();if(/^#[0-9a-f]{3}$/i.test(c))c='#'+[...c.slice(1)].map(x=>x+x).join('');return/^#[0-9a-f]{6}$/i.test(c)?c.toLowerCase():null};
const numOr=(v,a,b,d)=>{v=+v;return Number.isFinite(v)?clamp(v,a,b):d};
// Como numOr, pero si el valor está FUERA del rango lo rechaza (null) en vez de recortarlo: así una orden absurda no tiene efecto.
const numIn=(v,a,b)=>{if(v===null||v===''||typeof v==='boolean')return null;v=+v;return Number.isFinite(v)&&v>=a&&v<=b?v:null};

/* ---------- Resumen del documento ---------- */
function agKind(o){
  if(o._arc||o.type==='textbox'||o.type==='text'||o.type==='i-text')return 'text';
  if(o.type==='image')return 'image';
  if(o.type==='group')return 'group';
  if(o.name&&typeof LIB!=='undefined'&&LIB[o.name])return 'icon';
  return 'shape';
}
function agBox(o){
  const w=(o.width||0)*(o.scaleX||1),h=(o.height||0)*(o.scaleY||1);
  const x=o.originX==='left'?o.left:o.originX==='right'?o.left-w:o.left-w/2,y=o.originY==='top'?o.top:o.originY==='bottom'?o.top-h:o.top-h/2;
  return{x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)};
}
function agSummary(selIds){
  saveCur();
  const out={lienzo:{ancho:W,alto:H},paginaActual:cur+1,numeroDePaginas:pages.length,paginas:[]};
  if(selIds&&selIds.length)out.seleccionados=selIds;
  let budget=260;
  pages.forEach((pg,i)=>{
    const objs=(pg.objects||[]);objs.forEach(o=>{if(!o.uid)o.uid=rid()});
    const real=objs.filter(o=>!o.isBg&&!o.excludeFromExport),items=[];
    for(const o of real){
      if(budget<=0)break;budget--;
      const k=agKind(o),b=agBox(o),it={id:o.uid,tipo:k,x:b.x,y:b.y,ancho:b.w,alto:b.h};
      if(o.name)it.nombre=o.name;
      if(k==='text'){
        it.texto=String(o._arc?o._arc.text:o.text||'').slice(0,160);it.fuente=o._arc?o._arc.fontFamily:o.fontFamily;
        it.tamano=Math.round((o._arc?o._arc.fontSize:o.fontSize||0)*(o.scaleY||1));
        it.color=typeof o.fill==='string'?(hexOf(o.fill)||o.fill):(o._g?'degradado':undefined);
        if(o.fontWeight&&o.fontWeight!=='normal')it.peso=o.fontWeight;
      }else if(k==='shape'||k==='icon'){
        if(typeof o.fill==='string'&&o.fill&&o.fill!=='rgba(0,0,0,0)')it.relleno=hexOf(o.fill)||o.fill;else if(o._g)it.relleno='degradado';
        if(o.stroke)it.borde=hexOf(o.stroke)||o.stroke;
      }
      if(o.angle)it.angulo=Math.round(o.angle);if(o.opacity!==undefined&&o.opacity<1)it.opacidad=o.opacity;if(o.visible===false)it.oculto=true;if(o.locked)it.bloqueado=true;
      items.push(it);
    }
    const bg=objs.find(o=>o.isBg);
    out.paginas.push({n:i+1,fondo:bg?(bg._g?`degradado ${bg._g.c1} → ${bg._g.c2}`:bg.type==='image'?'imagen':(hexOf(bg.fill)||'patrón')):'#ffffff',objetos:items,objetosOmitidos:real.length-items.length||undefined});
  });
  return out;
}

/* ---------- Instrucciones para el modelo ---------- */
function agSystem(){
  return `Eres el agente de edición de un editor de diseño gráfico (como Canva). Recibes una orden del usuario, una descripción JSON del documento (páginas y objetos con "id") y, normalmente, una vista previa de la página actual. Devuelve SOLO un objeto JSON, sin markdown:
{"say":"una frase corta, en el idioma del usuario, que explique lo que vas a hacer","ops":[ ...operaciones... ]}
Si la orden es ambigua o no se puede hacer con estas operaciones, devuelve {"say":"explicación o pregunta breve","ops":[]}.
Las coordenadas son píxeles del lienzo (origen arriba a la izquierda). Los colores siempre #rrggbb.

SELECTOR "where" (para style, move, delete, order, filter, text, ocr): {"kind":"text|image|shape|icon|group|any","ids":["id"],"textContains":"…","name":"…","color":"#rrggbb","largestText":true,"top":true,"bottom":true}. "largestText" elige el texto de mayor tamaño de cada página (el título). "top"/"bottom" = tercio superior/inferior del lienzo. Para cambios masivos usa "where" y no enumeres ids.
PÁGINAS "pages": "all" (por defecto) | "current" | "first" | "last" | [1,3] (números desde 1).

OPERACIONES:
{"op":"background","pages":..,"color":"#hex"} · {"op":"background","gradient":["#a","#b",ángulo]} · {"op":"background","removeImage":true}
{"op":"style","pages":..,"where":{..},"set":{"fill":"#hex","gradient":["#a","#b",ángulo],"stroke":"#hex"|null,"strokeWidth":n,"opacity":0-1,"fontFamily":"…","fontSize":n,"fontScale":factor,"fontWeight":400|700,"fontStyle":"italic"|"normal","underline":bool,"textAlign":"left|center|right|justify","lineHeight":n,"charSpacing":n,"uppercase":bool,"lowercase":bool,"shadow":{"color":"#hex","blur":n,"x":n,"y":n}|null,"angle":n,"flipX":bool,"flipY":bool}}
{"op":"text","id":"…","text":"nuevo contenido"}   (un texto concreto; para traducir o reescribir varios textos usa una operación por texto)
{"op":"replace","pages":..,"find":"…","with":"…","ignoreCase":true}   (busca y reemplaza en todos los textos)
{"op":"move","pages":..,"where":{..},"set":{"x":n,"y":n,"dx":n,"dy":n,"scale":factor,"width":n,"height":n,"align":"left|center|right|top|middle|bottom"}}
{"op":"delete","pages":..,"where":{..}}   {"op":"order","where":{..},"to":"front|back|forward|backward"}
{"op":"add","page":n,"element":{"type":"text","text":"…","x":0.5,"y":0.2,"size":0.06,"font":"…","weight":700,"color":"#hex","align":"center","width":0.8}} | {"type":"rect","x":0.5,"y":0.5,"w":0.4,"h":0.1,"fill":"#hex","radius":0.5} | {"type":"circle","x":0.5,"y":0.5,"r":0.1,"fill":"#hex"} | {"type":"icon","name":"Corazón","x":0.5,"y":0.5,"size":0.15,"color":"#hex"}   (x,y,w,h,r,size son fracciones 0–1 del lienzo; x,y = centro)
{"op":"recolor","pages":..,"map":{"#viejo":"#nuevo"}}   {"op":"refont","pages":..,"map":{"Fuente actual":"Fuente nueva"}}
{"op":"filter","where":{"kind":"image"},"preset":"Original|Vívido|Dramático|Vintage|Frío|Cálido|Noir|Mate|Duotono|Pixel"}
{"op":"ocr","where":{"kind":"image"}}   (convierte el texto de una imagen o escaneo en texto editable)
{"op":"page","action":"add|duplicate|delete|move","page":n,"to":n}   {"op":"canvas","width":n,"height":n}   (cambia el tamaño reescalando todo)

REGLAS: usa solo estas fuentes: ${FONTS.join(', ')}. Iconos permitidos: ${Object.keys(LIB).join(', ')}. Mantén buen contraste entre texto y fondo. No inventes ids (usa los del documento). Si el usuario dice «esto» o «este», se refiere a "seleccionados". Si una página tiene una imagen llamada «Contenido del PDF», es el dibujo del PDF original (el texto ya está aparte y es editable); para cambiar el color de fondo visible quizá haya que eliminar o ajustar esa imagen. ORDEN DE EJECUCIÓN: 1) se crean las páginas nuevas (page add/duplicate); 2) se aplica el contenido (los números de página se refieren al documento ya con las páginas nuevas, p. ej. si hay 3 páginas y añades una, el contenido nuevo va en la página 4); 3) se eliminan o mueven páginas; 4) se cambia el tamaño. Máximo ${AG_MAX_OPS} operaciones.`;
}

/* ---------- Selectores ---------- */
function agMatcher(where){
  where=where||{};
  const ids=new Set([].concat(where.ids||[],where.id||[]).filter(Boolean)),kind=where.kind&&where.kind!=='any'?String(where.kind):null;
  const tc=where.textContains!=null?String(where.textContains).toLowerCase():null,nm=where.name?String(where.name).toLowerCase():null,col=where.color?normHex(where.color):null;
  let largest=null;
  if(where.largestText){let best=-1;cv.getObjects().forEach(o=>{if(!o.isBg&&agKind(o)==='text'){const s=(o._arc?o._arc.fontSize:o.fontSize||0)*(o.scaleY||1);if(s>best){best=s;largest=o}}})}
  return o=>{
    if(o.isBg||o.excludeFromExport)return false;
    if(ids.size&&!ids.has(o.uid))return false;
    if(kind&&agKind(o)!==kind)return false;
    if(tc!==null&&!String(o._arc?o._arc.text:o.text||'').toLowerCase().includes(tc))return false;
    if(nm&&!String(o.name||'').toLowerCase().includes(nm))return false;
    if(col){const f=typeof o.fill==='string'?hexOf(o.fill):null;if(!(f&&colorClose(f,col)))return false}
    if(where.largestText&&o!==largest)return false;
    if(where.top||where.bottom){const cy=o.getCenterPoint().y;if(where.top&&cy>H*.34)return false;if(where.bottom&&cy<H*.66)return false}
    return true;
  };
}
function agPageSet(op,idPage){
  const n=pages.length,ids=[].concat(op.id||[],(op.where&&op.where.ids)||[]).filter(Boolean);
  if(ids.length){const own=new Set(ids.map(x=>idPage.get(x)).filter(v=>v!==undefined));return[...own].sort((a,b)=>a-b)}
  let s=op.pages!==undefined?op.pages:(op.page!==undefined?[op.page]:(op.op==='add'?'current':'all'));
  if(s==='current')return[cur];if(s==='first')return[0];if(s==='last')return[n-1];
  if(Array.isArray(s))return[...new Set(s.map(v=>Math.round(+v)-1).filter(i=>i>=0&&i<n))].sort((a,b)=>a-b);
  if(Number.isFinite(+s)&&s!=='')return[Math.round(+s)-1].filter(i=>i>=0&&i<n);
  return pages.map((_,i)=>i);
}

/* ---------- Aplicación de cambios (sobre la página cargada en el lienzo) ---------- */
function agApplyStyle(o,set){
  const ls=leaves(o),txt=ls.filter(l=>l.type==='textbox'),fill=ls.filter(l=>l.type!=='image'&&!l.isBg);let n=0;
  const col=normHex(set.fill);
  if(col){fill.forEach(l=>{l._g=null;l._solid=col;l.set('fill',col)});if(o._arc)o._arc.fill=col;n++}
  if(Array.isArray(set.gradient)){const c1=normHex(set.gradient[0]),c2=normHex(set.gradient[1]);if(c1&&c2){fill.forEach(l=>{l._g={c1,c2,a:numOr(set.gradient[2],0,360,90)};setGrad(l)});n++}}
  if(set.stroke===null){ls.forEach(l=>l.set({stroke:null,strokeWidth:0}));n++}
  else if(set.stroke!==undefined){const c=normHex(set.stroke);if(c){ls.forEach(l=>l.set({stroke:c,strokeWidth:l.strokeWidth||2}));n++}}
  if(set.strokeWidth!==undefined){const v=numIn(set.strokeWidth,0,60);if(v!==null){ls.forEach(l=>{if(v>0&&!l.stroke)l.set('stroke','#1f2430');l.set('strokeWidth',v)});n++}}
  if(set.opacity!==undefined){const v=numIn(set.opacity,0,1);if(v!==null){o.set('opacity',v);n++}}
  if(set.angle!==undefined){const v=numIn(set.angle,-360,360);if(v!==null){o.rotate(v);n++}}
  if(typeof set.flipX==='boolean'){o.set('flipX',set.flipX);n++}if(typeof set.flipY==='boolean'){o.set('flipY',set.flipY);n++}
  if(set.shadow===null){o.set('shadow',null);n++}
  else if(set.shadow&&typeof set.shadow==='object'){
    const c=/^#[0-9a-f]{6}$|^rgba?\([\d.,\s%]+\)$/i.test(String(set.shadow.color||''))?set.shadow.color:'rgba(0,0,0,.35)';
    o.set('shadow',new fabric.Shadow({color:c,blur:numOr(set.shadow.blur,0,100,20),offsetX:numOr(set.shadow.x,-100,100,0),offsetY:numOr(set.shadow.y,-100,100,8)}));n++;
  }
  // texto
  if(typeof set.fontFamily==='string'&&FONTS.includes(set.fontFamily)){txt.forEach(t=>t.set('fontFamily',set.fontFamily));if(o._arc)o._arc.fontFamily=set.fontFamily;n++}
  if(set.fontSize!==undefined){const v=numIn(set.fontSize,6,800);if(v!==null){txt.forEach(t=>t.set('fontSize',v));n++}}
  if(set.fontScale!==undefined){const v=numIn(set.fontScale,.2,5);if(v!==null){txt.forEach(t=>t.set('fontSize',Math.max(6,Math.min(800,t.fontSize*v))));n++}}
  if(set.fontWeight!==undefined){const w=set.fontWeight==='bold'?700:set.fontWeight==='normal'?400:numIn(set.fontWeight,100,900);if(w!==null){txt.forEach(t=>t.set('fontWeight',w>=600?(w>=700?700:'bold'):w));n++}}
  if(set.fontStyle==='italic'||set.fontStyle==='normal'){txt.forEach(t=>t.set('fontStyle',set.fontStyle));n++}
  if(typeof set.underline==='boolean'){txt.forEach(t=>t.set('underline',set.underline));n++}
  if(['left','center','right','justify'].includes(set.textAlign)){txt.forEach(t=>t.set('textAlign',set.textAlign));n++}
  if(set.lineHeight!==undefined){const v=numIn(set.lineHeight,.6,3);if(v!==null){txt.forEach(t=>t.set('lineHeight',v));n++}}
  if(set.charSpacing!==undefined){const v=numIn(set.charSpacing,-100,800);if(v!==null){txt.forEach(t=>t.set('charSpacing',v));n++}}
  if(set.uppercase===true){txt.forEach(t=>t.set('text',t.text.toUpperCase()));n++}
  if(set.lowercase===true){txt.forEach(t=>t.set('text',t.text.toLowerCase()));n++}
  txt.forEach(t=>t.initDimensions());ls.forEach(l=>{l.dirty=true});o.dirty=true;o.setCoords();
  return n;
}
function agSetText(o,t){
  if(o._arc){
    const g=arcGroup(Object.assign({},o._arc,{text:t||' '}));g.set({left:o.left,top:o.top,angle:o.angle,scaleX:o.scaleX,scaleY:o.scaleY,opacity:o.opacity,shadow:o.shadow});g.uid=o.uid;
    const i=cv.getObjects().indexOf(o);cv.remove(o);cv.insertAt(g,i);return;
  }
  const l=o.type==='textbox'?o:leaves(o).find(x=>x.type==='textbox');if(l){l.set('text',t);l.initDimensions()}
}
function agMove(o,s){
  const r=o.getBoundingRect(true,true);
  if(Number.isFinite(+s.scale)&&+s.scale>0){const k=clamp(+s.scale,.05,10);o.set({scaleX:o.scaleX*k,scaleY:o.scaleY*k})}
  if((Number.isFinite(+s.width)&&+s.width>0)||(Number.isFinite(+s.height)&&+s.height>0)){
    const w0=o.width*o.scaleX,h0=o.height*o.scaleY;let kx=+s.width>0?+s.width/w0:null,ky=+s.height>0?+s.height/h0:null;
    if(kx&&!ky)ky=kx;if(ky&&!kx)kx=ky;o.set({scaleX:o.scaleX*clamp(kx,.02,30),scaleY:o.scaleY*clamp(ky,.02,30)});
  }
  o.setCoords();const r2=o.getBoundingRect(true,true);let dx=0,dy=0;
  if(Number.isFinite(+s.x)&&s.x!==null)dx=+s.x-r2.left;if(Number.isFinite(+s.y)&&s.y!==null)dy=+s.y-r2.top;
  if(Number.isFinite(+s.dx))dx+=+s.dx;if(Number.isFinite(+s.dy))dy+=+s.dy;
  if(Number.isFinite(+s.scale)&&!Number.isFinite(+s.x)&&!Number.isFinite(+s.y)){dx+=(r.left+r.width/2)-(r2.left+r2.width/2);dy+=(r.top+r.height/2)-(r2.top+r2.height/2)}
  o.set({left:o.left+dx,top:o.top+dy});o.setCoords();
  const r3=o.getBoundingRect(true,true);let ax=0,ay=0;
  switch(s.align){case'left':ax=-r3.left;break;case'center':ax=W/2-(r3.left+r3.width/2);break;case'right':ax=W-(r3.left+r3.width);break;case'top':ay=-r3.top;break;case'middle':ay=H/2-(r3.top+r3.height/2);break;case'bottom':ay=H-(r3.top+r3.height);break}
  if(ax||ay){o.set({left:o.left+ax,top:o.top+ay});o.setCoords()}
}
function agAddElement(e){
  if(!e||typeof e!=='object')return 0;const x=numOr(e.x,0,1,.5),y=numOr(e.y,0,1,.5);
  if(e.type==='text'&&e.text){
    T(String(e.text).slice(0,500),x,y,numOr(e.size,.015,.3,.05),{fontFamily:FONTS.includes(e.font)?e.font:'Poppins',fontWeight:numOr(e.weight,300,900,700),fill:normHex(e.color)||'#1f2430',
      textAlign:['left','center','right'].includes(e.align)?e.align:'center',width:W*numOr(e.width,.1,1,.8),charSpacing:numOr(e.spacing,0,800,0)});return 1;
  }
  if(e.type==='rect'){const w=numOr(e.w,.005,1,.3),hh=numOr(e.h,.003,1,.2),r=numOr(e.radius,0,1,0)*Math.min(w*W,hh*H)/2;R(x,y,w,hh,normHex(e.fill)||'#6c4cf1',{rx:r,ry:r});return 1}
  if(e.type==='circle'){C(x,y,numOr(e.r,.004,.6,.1),normHex(e.fill)||'#6c4cf1');return 1}
  if(e.type==='icon'&&LIB[e.name]){const p=libIcon(LIB[e.name],normHex(e.color)||'#1f2430'),size=S_()*numOr(e.size,.03,.5,.12);p.scaleToWidth(size);p.set({strokeWidth:size/17,left:x*W,top:y*H,name:e.name});cv.add(p);return 1}
  return 0;
}
async function agApplyOp(op){
  const where=op.where||(op.id?{ids:[op.id]}:null);let n=0;
  const needsSel=['delete','move','order','text','ocr'].includes(op.op);
  if(needsSel&&!where)return 0;
  const m=agMatcher(where),list=()=>cv.getObjects().filter(m);
  switch(op.op){
    case'background':{
      if(op.removeImage){cv.getObjects().filter(o=>o.isBg&&o.type==='image').forEach(o=>cv.remove(o));setBg('#ffffff');n++}
      const c=normHex(op.color);
      if(c){setBg(c);n++}
      else if(Array.isArray(op.gradient)&&normHex(op.gradient[0])&&normHex(op.gradient[1])){setBg({g:[normHex(op.gradient[0]),normHex(op.gradient[1]),numOr(op.gradient[2],0,360,135)]});n++}
      break}
    case'style':{const set=op.set&&typeof op.set==='object'?op.set:{};list().forEach(o=>{if(agApplyStyle(o,set))n++});break}
    case'text':{const t=String(op.text==null?'':op.text).slice(0,4000);list().forEach(o=>{if(agKind(o)==='text'){agSetText(o,t);n++}});break}
    case'replace':{
      const find=String(op.find==null?'':op.find);if(!find)break;
      const re=new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),op.ignoreCase===false?'g':'gi'),rep=String(op.with!=null?op.with:(op.replace!=null?op.replace:''));
      cv.getObjects().forEach(o=>{if(o.isBg)return;leaves(o).filter(l=>l.type==='textbox').forEach(l=>{re.lastIndex=0;if(re.test(l.text)){re.lastIndex=0;l.set('text',l.text.replace(re,()=>rep));l.initDimensions();n++}})});
      break}
    case'move':{const s=op.set&&typeof op.set==='object'?op.set:{};list().forEach(o=>{agMove(o,s);n++});break}
    case'delete':{list().forEach(o=>{cv.remove(o);n++});break}
    case'order':{
      const how={front:'bringToFront',back:'sendToBack',forward:'bringForward',backward:'sendBackwards'}[op.to];
      if(how){list().forEach(o=>{cv[how](o);n++});keepBgBottom()}
      break}
    case'add':{n+=agAddElement(op.element);break}
    case'recolor':{
      const map={};Object.entries(op.map||{}).forEach(([a,b])=>{const x=normHex(a),y=normHex(b);if(x&&y)map[x]=y});
      if(Object.keys(map).length){recolorAll(map);n+=Object.keys(map).length}
      break}
    case'refont':{
      const map={};Object.entries(op.map||{}).forEach(([a,b])=>{if(FONTS.includes(b))map[a]=b});
      if(Object.keys(map).length){refontAll(map);n+=Object.keys(map).length}
      break}
    case'filter':{
      const pr=IMG_PRESETS.find(([nm])=>nm.toLowerCase()===String(op.preset||'').toLowerCase());if(!pr)break;
      cv.getObjects().filter(agMatcher(Object.assign({kind:'image'},where||{}))).forEach(o=>{o._f=JSON.parse(JSON.stringify(pr[1]));applyFilters(o);n++});
      break}
    case'ocr':{
      const imgs=cv.getObjects().filter(agMatcher(Object.assign({kind:'image'},where||{}))).slice(0,3);
      for(const im of imgs){n+=await ocrImage(im)}
      break}
  }
  return n;
}
function agStructural(op){
  const n=pages.length,idx=Math.round(+op.page)-1,blank=()=>({version:'5.3.0',objects:[{type:'rect',version:'5.3.0',originX:'center',originY:'center',left:W/2,top:H/2,width:W,height:H,fill:'#ffffff',strokeWidth:0,isBg:true,selectable:false,evented:false,hoverCursor:'default',uid:rid()}]});
  switch(op.action){
    case'add':{const at=Number.isFinite(idx)&&idx>=0&&idx<n?idx+1:n;pages.splice(at,0,blank());thumbs.splice(at,0,null);return true}
    case'duplicate':{const i=idx>=0&&idx<n?idx:cur,cp=JSON.parse(JSON.stringify(pages[i]));(cp.objects||[]).forEach(o=>{o.uid=rid()});pages.splice(i+1,0,cp);thumbs.splice(i+1,0,thumbs[i]);return true}
    case'delete':{if(n<=1)return false;const i=idx>=0&&idx<n?idx:cur;pages.splice(i,1);thumbs.splice(i,1);return true}
    case'move':{const from=idx,to=Math.round(+op.to)-1;if(!(from>=0&&from<n&&to>=0&&to<n))return false;const[p]=pages.splice(from,1),[t]=thumbs.splice(from,1);pages.splice(to,0,p);thumbs.splice(to,0,t);return true}
  }
  return false;
}

/* ---------- Copia de seguridad y deshacer ---------- */
function agBackup(){
  const rep=(k,v)=>{if(k==='src'&&typeof v==='string'&&v.startsWith('data:')){let id=imgIds.get(v);if(!id){id='@i'+(++imgN);imgIds.set(v,id);imgReg.set(id,v)}return id}return v};
  AG.backup=JSON.stringify({pages,thumbs,W,H,cur,name:$('name').value},rep);
}
async function agUndo(){
  if(!AG.backup){toast('No hay nada que deshacer');return}
  const b=JSON.parse(AG.backup);b.pages.forEach(unpackSrc);AG.backup=null;
  W=b.W;H=b.H;syncSize();fit();pages=b.pages;thumbs=b.thumbs;cur=Math.min(b.cur,pages.length-1);$('name').value=b.name;
  cv.discardActiveObject();await loadAsync(pages[cur]);await ensureFonts();ensureBg();resetHist();refresh();autosave();
  if(typeof collabBroadcastState==='function')collabBroadcastState();
  agStat('Cambios de la IA deshechos.',false);
}

/* ---------- Ejecución ---------- */
async function agRun(ops){
  endCrop(true);cv.discardActiveObject();saveCur();agBackup();
  const idPage=new Map();pages.forEach((pg,i)=>(pg.objects||[]).forEach(o=>{if(o.uid)idPage.set(o.uid,i)}));
  const content=ops.filter(o=>o.op!=='page'&&o.op!=='canvas'),canv=ops.filter(o=>o.op==='canvas');
  const isNew=o=>o.op==='page'&&(o.action==='add'||o.action==='duplicate'),pre=ops.filter(isNew),structural=ops.filter(o=>o.op==='page'&&!isNew(o));
  const st={applied:0,skipped:0,pages:0};const origRef=pages[cur];
  for(const op of pre){const ref=pages[cur];if(agStructural(op))st.applied++;else st.skipped++;const k=pages.indexOf(ref);cur=k>=0?k:cur}
  idPage.clear();pages.forEach((pg,i)=>(pg.objects||[]).forEach(o=>{if(o.uid)idPage.set(o.uid,i)}));
  const plan=new Map();
  content.forEach(op=>agPageSet(op,idPage).forEach(i=>{if(!plan.has(i))plan.set(i,[]);plan.get(i).push(op)}));
  for(const[i,list]of[...plan.entries()].sort((a,b)=>a[0]-b[0])){
    await loadAsync(pages[i]);lock=true;
    try{
      for(const op of list){const n=await agApplyOp(op);if(n)st.applied+=n;else st.skipped++}
      await ensureFonts();cv.getObjects().forEach(reinitText);cv.renderAll();pages[i]=cv.toJSON(CUSTOM);thumbs[i]=thumb();st.pages++;
    }finally{lock=false}
  }
  for(const op of structural){const ref=pages[cur];if(agStructural(op))st.applied++;else st.skipped++;const k=pages.indexOf(ref);cur=k>=0?k:Math.min(cur,pages.length-1)}
  cur=clamp(origRef&&pages.indexOf(origRef)>=0?pages.indexOf(origRef):cur,0,pages.length-1);
  await loadAsync(pages[cur]);await ensureFonts();ensureBg();
  for(const op of canv){const w=numIn(op.width,100,4000),h=numIn(op.height,100,4000);if(w&&h){await resizeAll(Math.round(w),Math.round(h));st.applied++}else st.skipped++}
  resetHist();refresh();autosave();if(typeof collabBroadcastState==='function')collabBroadcastState();
  return st;
}
async function agCommand(text){
  if(AG.busy)return;text=String(text||'').trim();if(!text)return;
  AG.busy=true;agBusy(true);
  try{
    endCrop(true);
    const selObjs=cv.getActiveObjects();selObjs.forEach(o=>{if(!o.uid)o.uid=rid()});const selIds=selObjs.map(o=>o.uid);
    cv.discardActiveObject();
    const summary=agSummary(selIds),images=[];
    try{const u=cv.toDataURL({format:'jpeg',quality:.72,multiplier:Math.min(1,720/W)/zoom});images.push({media_type:'image/jpeg',data:u.split(',')[1]})}catch(e){}
    const raw=await askClaude(agSystem(),JSON.stringify({orden:text,documento:summary}),4000,images);
    const spec=parseJSON(raw),say=String(spec.say||'').slice(0,300);
    const ops=(Array.isArray(spec.ops)?spec.ops:[]).filter(o=>o&&typeof o==='object'&&AG_OPS.has(o.op)).slice(0,AG_MAX_OPS);
    if(!ops.length){agStat(say||'No sé cómo hacer eso con las herramientas disponibles. Prueba a describirlo de otra forma.',false);return}
    const risky=ops.some(o=>(o.op==='page'&&o.action==='delete')||(o.op==='delete'&&!o.where&&!o.id));
    if(risky&&!confirm((say||'La IA quiere eliminar contenido')+'\n\nPodrás deshacerlo después. ¿Aplicar?')){agStat('Cancelado.',false);return}
    const st=await agRun(ops);
    agStat((say||'Hecho')+` · ${st.applied} ${st.applied===1?'cambio':'cambios'}${st.pages>1?` en ${st.pages} páginas`:''}${st.skipped?` · ${st.skipped} sin efecto`:''}`,true);
    AG.hist=[text,...AG.hist.filter(x=>x!==text)].slice(0,12);store.set('lienzo-ag-hist',JSON.stringify(AG.hist));AG.hi=-1;
    const q=$('aiq');q.value='';
  }catch(e){agStat(e&&e.message?e.message:'La IA no pudo completar la orden',false,true)}
  finally{AG.busy=false;agBusy(false)}
}

/* ---------- OCR con IA: convierte el texto de una imagen en texto editable ---------- */
const OCR_SYSTEM=`Eres un sistema de OCR y análisis de maquetación. Recibes la imagen de un documento, captura o diseño. Devuelve SOLO un objeto JSON, sin markdown:
{"blocks":[{"text":"…","x":0.1,"y":0.2,"w":0.5,"h":0.05,"size":0.03,"color":"#rrggbb","bold":false,"italic":false,"align":"left","font":"sans"}]}
Un bloque por párrafo o línea de texto visible, en orden de lectura. x e y son la esquina superior izquierda del bloque, w y h su ancho y alto, todo como fracción (0–1) del ancho y del alto de la imagen. "size" es la altura de UNA línea de texto como fracción del alto de la imagen. "font" es sans, serif o mono. Transcribe el texto exactamente, sin traducir ni corregir. Máximo 80 bloques.`;
function ocrBg(ctx,bx,by,bw,bh){
  const cw=ctx.canvas.width,ch=ctx.canvas.height,pts=[],pad=3,x0=Math.max(0,bx*cw-pad),x1=Math.min(cw-1,(bx+bw)*cw+pad),y0=Math.max(0,by*ch-pad),y1=Math.min(ch-1,(by+bh)*ch+pad);
  for(const[x,y]of[[x0,y0],[x1,y0],[x0,y1],[x1,y1],[(x0+x1)/2,y0],[(x0+x1)/2,y1],[x0,(y0+y1)/2],[x1,(y0+y1)/2]]){const d=ctx.getImageData(Math.round(x),Math.round(y),1,1).data;pts.push([d[0],d[1],d[2]])}
  const med=i=>{const v=pts.map(p=>p[i]).sort((a,b)=>a-b);return v[Math.floor(v.length/2)]};
  return'#'+[0,1,2].map(i=>med(i).toString(16).padStart(2,'0')).join('');
}
async function ocrImage(img){
  if(Math.abs(((img.angle%360)+360)%360)>.5&&Math.abs(((img.angle%360)+360)%360-360)>.5)throw new Error('Pon la imagen a 0° para extraer su texto');
  const el=img.getElement(),nw=el.naturalWidth||el.width,nh=el.naturalHeight||el.height,k=Math.min(1,1600/Math.max(nw,nh));
  const c=document.createElement('canvas');c.width=Math.round(nw*k);c.height=Math.round(nh*k);
  const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(el,0,0,c.width,c.height);
  const raw=await askClaude(OCR_SYSTEM,'Analiza esta imagen.',4000,[{media_type:'image/jpeg',data:c.toDataURL('image/jpeg',.85).split(',')[1]}]);
  const spec=parseJSON(raw),blocks=(Array.isArray(spec.blocks)?spec.blocks:[]).slice(0,80);
  const cw=img.width*img.scaleX,ch=img.height*img.scaleY,left=img.left-cw/2,top=img.top-ch/2;let made=0;
  const fam={sans:'Roboto',serif:'Lora',mono:'Courier New'};
  for(const b of blocks){
    const text=String(b.text||'').slice(0,2000);if(!text.trim())continue;
    const bx=numOr(b.x,0,1,0),by=numOr(b.y,0,1,0),bw=numOr(b.w,.01,1,.3),bh=numOr(b.h,.004,1,.05),size=numOr(b.size,.004,.5,bh),fs=Math.max(6,size*ch/1.2);
    cv.add(new fabric.Textbox(text,{originX:'left',originY:'top',left:left+bx*cw,top:top+by*ch,width:Math.max(20,bw*cw*1.08+fs*.5),fontSize:fs,fontFamily:fam[b.font]||'Roboto',
      fontWeight:b.bold?'bold':'normal',fontStyle:b.italic?'italic':'normal',fill:normHex(b.color)||'#000000',textAlign:['left','center','right'].includes(b.align)?b.align:'left',lineHeight:1.1,
      backgroundColor:ocrBg(x,bx,by,bw,bh),name:'Texto (OCR)'}));made++;
  }
  return made;
}
async function runOcrUI(img){
  toast('Leyendo la imagen con IA…');
  try{const n=await ocrImage(img);await ensureFonts();cv.requestRenderAll();push();refresh();toast(n?`Texto extraído: ${n} bloques editables (el original queda debajo, tapado)`:'No se encontró texto en la imagen')}
  catch(e){toast(e.message||'No se pudo extraer el texto')}
}

/* ---------- Barra de órdenes ---------- */
function agBusy(on){const g=$('aigo');if(g){g.disabled=on;g.textContent=on?'Pensando…':'Enviar'}const q=$('aiq');if(q)q.disabled=on;if(on)agStat('<spin>',false,false,true)}
function agStat(msg,undoable,isErr,spin){
  const s=$('aistat');if(!s)return;clearTimeout(AG.statT);s.textContent='';s.classList.add('on');s.classList.toggle('err',!!isErr);
  if(spin){s.append(h('span',{class:'aispin'}),h('span',{},'La IA está trabajando en tu diseño…'));return}
  s.append(h('span',{style:'flex:1'},msg));
  if(undoable)s.append(h('button',{class:'btn sm',style:'flex:none',onclick:()=>agUndo()},'Deshacer'));
  s.append(h('button',{class:'btn sm',style:'flex:none',onclick:()=>s.classList.remove('on'),'aria-label':'Cerrar'},'×'));
  AG.statT=setTimeout(()=>s.classList.remove('on'),undoable?20000:12000);
}
function agBuildBar(){
  const bar=$('aibar');if(!bar)return;
  const q=h('input',{id:'aiq',type:'text',maxlength:'600',autocomplete:'off',placeholder:'Pídele a la IA… «cambia el fondo de todo a azul», «traduce todo al inglés»  (Ctrl+K)','aria-label':'Orden para la IA'});
  const go=h('button',{id:'aigo',class:'btn on',style:'flex:none;border-radius:20px;padding:6px 14px',onclick:()=>agCommand(q.value)},'Enviar');
  const chips=h('div',{id:'aichips'});
  const fillChips=()=>{chips.textContent='';[...AG_SUGGESTIONS].sort(()=>Math.random()-.5).slice(0,4).forEach(t=>chips.append(h('button',{class:'aichip',type:'button',onmousedown:e=>{e.preventDefault();q.value=t;q.focus()}},t)))};
  q.addEventListener('focus',()=>{if(!q.value)fillChips();bar.classList.add('focus')});
  q.addEventListener('blur',()=>setTimeout(()=>bar.classList.remove('focus'),150));
  q.addEventListener('input',()=>{if(q.value)bar.classList.remove('focus');else{fillChips();bar.classList.add('focus')}});
  q.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();agCommand(q.value)}
    else if(e.key==='Escape'){q.blur()}
    else if(e.key==='ArrowUp'&&AG.hist.length){e.preventDefault();AG.hi=Math.min(AG.hi+1,AG.hist.length-1);q.value=AG.hist[AG.hi]}
    else if(e.key==='ArrowDown'&&AG.hi>=0){e.preventDefault();AG.hi--;q.value=AG.hi>=0?AG.hist[AG.hi]:''}
  });
  bar.append(chips,h('div',{id:'aistat'}),h('div',{class:'aibox'},ic('sparkle'),q,go));
}
agBuildBar();
