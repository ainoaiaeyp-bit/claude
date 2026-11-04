#!/usr/bin/env python3
"""Genera vida.html: un único HTML autocontenido (CSS + JS + icono inline) con datos de ejemplo.
Uso (desde vida-app/):  python3 tools/build-single.py"""
import base64, re, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
html = open('index.html', encoding='utf8').read()
css = open('styles.css', encoding='utf8').read()
js = open('app.js', encoding='utf8').read()
icon = base64.b64encode(open('icons/apple-touch-icon.png', 'rb').read()).decode()

seed = r'''
// ---- Datos de ejemplo (solo en vida.html, si no hay datos guardados) ----
(function(){
  try { if (localStorage.getItem('vida.v1')) return; } catch(e) { return; }
  const p=n=>String(n).padStart(2,'0'), I=d=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  const off=n=>{const d=new Date();d.setDate(d.getDate()+n);return I(d);};
  const id=()=>Math.random().toString(36).slice(2,10);
  const now=new Date();
  const tx=[
    ['in',1850,'Nómina','Nómina','personal',-3],['out',620,'Hogar','Alquiler','personal',-3],['out',64.3,'Comida','Mercadona','personal',-1],
    ['out',38.5,'Transporte','Gasolina','personal',-2],['out',27,'Ocio','Cine y cena','personal',-4],['out',49,'Salud','Gimnasio','personal',-5],
    ['in',2400,'Negocio','Ayto. Sevilla · Informe CAE','negocio',-6],['out',89,'Trabajo','Hosting y dominios','negocio',-2],['out',142,'Trabajo','Material oficina','negocio',-5],
    ['out',52,'Comida','Supermercado','personal',0]
  ].map(([t,a,c,n,s,d])=>({id:id(),type:t,amount:a,cat:c,note:n,scope:s,date:off(d)}));
  const prev=new Date(now.getFullYear(),now.getMonth()-1,15);
  for(const [t,a,c,n,s] of [['in',1850,'Nómina','Nómina','personal'],['out',620,'Hogar','Alquiler','personal'],['out',310,'Comida','Compra mensual','personal'],['in',1900,'Negocio','Factura cliente','negocio'],['out',95,'Trabajo','Software','negocio']]) tx.push({id:id(),type:t,amount:a,cat:c,note:n,scope:s,date:I(prev)});
  const S={
    profile:{name:'Ainoa'}, tx,
    subs:[{id:id(),name:'Netflix',amount:13.99,cycle:'mensual',next:off(3),scope:'personal',active:true},
          {id:id(),name:'Spotify',amount:10.99,cycle:'mensual',next:off(9),scope:'personal',active:true},
          {id:id(),name:'Hosting web',amount:149,cycle:'anual',next:off(40),scope:'negocio',active:true},
          {id:id(),name:'Microsoft 365',amount:99,cycle:'anual',next:off(120),scope:'negocio',active:true}],
    rem:[{id:id(),title:'Llamar al gestor',due:I(now)+'T23:30',repeat:'no',done:false,notified:false},
         {id:id(),title:'Revisar facturas pendientes',due:off(2)+'T10:00',repeat:'semanal',done:false,notified:false}],
    biz:[{id:id(),client:'Ayto. Sevilla',concept:'Auditoría energética',amount:2400,status:'cobrado',date:off(-6),due:''},
         {id:id(),client:'Hotel Triana',concept:'Estudio fotovoltaico',amount:3200,status:'pendiente',date:off(-10),due:off(4)},
         {id:id(),client:'Comunidad Los Pinos',concept:'Certificado energético',amount:850,status:'pendiente',date:off(-3),due:off(12)},
         {id:id(),client:'Bodegas Sur',concept:'Presupuesto CAE',amount:5200,status:'presupuesto',date:off(-1),due:''}],
    events:[{id:id(),type:'evento',title:'Cena con Marta',date:off(0),time:'21:00',repeat:'no',note:'',lastN:''},
            {id:id(),type:'evento',title:'Reunión Hotel Triana',date:off(2),time:'10:30',repeat:'no',note:'Videollamada',lastN:''},
            {id:id(),type:'evento',title:'Dentista',date:off(6),time:'17:00',repeat:'no',note:'',lastN:''},
            {id:id(),type:'cumple',title:'Ana',date:'1990-'+p(now.getMonth()+1)+'-'+p(Math.min(28,now.getDate()+2)),time:'',repeat:'anual',note:'',lastN:''},
            {id:id(),type:'cumple',title:'Papá',date:'1962-'+p(((now.getMonth()+1)%12)+1)+'-12',time:'',repeat:'anual',note:'',lastN:''}],
    tasks:[{id:id(),title:'Presentar el IVA trimestral',due:off(3),prio:'alta',note:'',done:false},
           {id:id(),title:'Enviar presupuesto a Bodegas Sur',due:off(0),prio:'media',note:'',done:false},
           {id:id(),title:'Renovar seguro del coche',due:off(15),prio:'baja',note:'',done:false}],
    habits:[{id:id(),name:'Leer 20 minutos',icon:'book',log:{[off(0)]:true,[off(-1)]:true,[off(-2)]:true,[off(-4)]:true}},
            {id:id(),name:'Caminar 8.000 pasos',icon:'pulse',log:{[off(-1)]:true,[off(-2)]:true,[off(-3)]:true}}],
    notes:[{id:id(),title:'Claves y contactos útiles',text:'Wifi casa: ...\nGestor: 600 000 000',pin:true,date:off(-5)},
           {id:id(),title:'Lista de la compra',text:'Aceite, huevos, fruta, yogures',pin:false,date:off(-1)}],
    ideas:[{id:id(),text:'Calculadora de ahorro energético para comunidades de vecinos',tag:'Negocio',status:'desarrollo',star:true,date:off(-6)},
           {id:id(),text:'Newsletter mensual sobre subvenciones y ayudas',tag:'Contenido',status:'nueva',star:true,date:off(-3)},
           {id:id(),text:'Regalo para Marta: libro de fotografía',tag:'Regalo',status:'nueva',star:false,date:off(-2)},
           {id:id(),text:'Vídeo corto explicando cómo leer la factura de la luz',tag:'Contenido',status:'nueva',star:false,date:off(-1)},
           {id:id(),text:'Escapada de fin de semana a la sierra',tag:'Personal',status:'hecha',star:false,date:off(-20)}],
    goals:[{id:id(),name:'Viaje a Japón',icon:'plane',target:3500,saved:1280,deadline:off(220)},
           {id:id(),name:'Fondo de emergencia',icon:'target',target:6000,saved:2900,deadline:''}],
    budgets:{Comida:350,Ocio:120},
    meals:[{id:id(),meal:'desayuno',name:'Tostada con aceite y tomate, café',kcal:320,p:9,c:45,f:11,date:off(0)},
           {id:id(),meal:'comida',name:'Lentejas con verduras y fruta',kcal:640,p:32,c:88,f:14,date:off(0)},
           {id:id(),meal:'snack',name:'Yogur natural y nueces',kcal:210,p:12,c:10,f:13,date:off(0)}],
    water:{[off(0)]:3}, workouts:[{id:id(),type:'Caminar',min:45,kcal:190,date:off(-1),note:''},{id:id(),type:'Gimnasio',min:60,kcal:380,date:off(-3),note:'Pierna'}],
    weights:[[-28,79.4],[-21,78.9],[-14,78.6],[-7,78.0],[-2,77.6]].map(([d,k])=>({id:id(),kg:k,date:off(d)})),
    health:{kcal:2000,water:8,weight:74}, chat:[], settings:{apiKey:'',model:'claude-sonnet-5-5',theme:'auto'}
  };
  try { localStorage.setItem('vida.v1', JSON.stringify(S)); localStorage.setItem('vida.demo','1'); } catch(e) {}
})();
'''
js = seed + "\n" + js
js = js.replace("if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });", "")
js += "\ntry { if (localStorage.getItem('vida.demo')) { localStorage.removeItem('vida.demo'); setTimeout(() => toast('Datos de ejemplo cargados. Bórralos en Ajustes → Borrar todos los datos'), 600); } } catch (e) {}\n"

html = re.sub(r'<link rel="manifest"[^>]*>\n', '', html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>', f'<link rel="apple-touch-icon" href="data:image/png;base64,{icon}">', html)
html = re.sub(r'<link rel="icon"[^>]*>', f'<link rel="icon" type="image/png" href="data:image/png;base64,{icon}">', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>\n{css}\n</style>')
html = html.replace('<script src="app.js"></script>', f'<script>\n{js}\n</script>')
open('vida.html', 'w', encoding='utf8').write(html)
print('vida.html', len(html) // 1024, 'KB')
