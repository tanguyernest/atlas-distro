const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const e=[];p.on('pageerror',x=>e.push(x.message));
await p.goto('file://'+require('path').resolve(__dirname,'../atlas-distro.html'));
const res=await p.evaluate(()=>{
 const out={n:0,bad:[],samples:{}};
 const objs=OBJECTIVES.filter(o=>o.ready).map(o=>o.id);
 const bases=Object.keys(BASEDEF).concat(['undecided']);
 for(const obj of objs){const tr=TREES[obj];
  for(const base of bases){
   for(const mix of [0,1,2]){
    Object.keys(HW).forEach(k=>delete HW[k]);
    G.obj=obj;G.base=base;G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.scope=mix===2?'precise':'general';
    if(mix===2)Object.assign(HW,{gpu:'amd',boot:'uefi',ram:'8',arch:'x86-amd',wifi:'intel',disk:'nvme'});
    G.ans=tr.questions.map((q,k)=>mix===1?Math.min(1,q.o.length-1):0);G.i=tr.questions.length;G.sw={};
    let md;try{md=buildTutorial()}catch(err){out.bad.push('EXCEPTION '+obj+' '+base+' '+mix+': '+err.message);continue}
    out.n++;
    const fences=(md.match(/^\s*```/gm)||[]).length;
    if(fences%2)out.bad.push('blocs de code non fermés: '+obj+' '+base+' '+mix);
    if(/undefined|\[object|NaN/.test(md))out.bad.push('texte suspect: '+obj+' '+base+' '+mix+' : '+(md.match(/.{30}(undefined|\[object|NaN).{20}/)||[''])[0]);
    if(!/^# Distro /.test(md))out.bad.push('titre manquant: '+obj+' '+base);
    if(!/## Construire une ISO/.test(md)||!/## Récapitulatif/.test(md))out.bad.push('sections manquantes: '+obj+' '+base);
    // 🟡 seulement sur les bases dont les noms ont été vérifiés (Alpine + DISTRO_STATUS)
    const verified=base==='alpine'||!!DISTRO_STATUS[base];
    if(!verified&&base!=='undecided'&&/\*\*État :\*\* 🟡/.test(md))out.bad.push('état vérifié sur base non vérifiée: '+obj+' '+base);
    if(DISTRO_STATUS._meta[base]&&!/Noms de paquets vérifiés le \d{4}-\d\d-\d\d sur /.test(md))out.bad.push('date de vérification absente: '+obj+' '+base);
    // un paquet de dépôt tiers ne passe jamais en 🟡
    if(/\*\*État :\*\* 🟡[^\n]*Dépôt tiers requis/.test(md))out.bad.push('dépôt tiers en 🟡: '+obj+' '+base);
    // commandes de gestionnaire cohérentes avec la base
    const f=FAMILY[BASEDEF[base]?base:'debian'];
    if(BASEDEF[base]){
      if(f==='apt'&&/\bapk add\b|\bpacman -S\b/.test(md.replace(/Alpine[^\n]*/g,'')))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='pacman'&&/\bapk add\b|\bapt install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='apk'&&base==='alpine'&&/\bapt install\b|\bpacman -S\b|\bdnf install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
    }
    if(mix===0&&['gaming:alpine','light:debian','server:fedora','secure:arch','office:ubuntu'].includes(obj+':'+base))out.samples[obj+'-'+base]=md;
   }
  }
 }
 return out;
});
console.log('tutoriels générés:',res.n,'| problèmes:',res.bad.length);
[...new Set(res.bad)].slice(0,25).forEach(x=>console.log(' -',x));
for(const [k,v] of Object.entries(res.samples))fs.writeFileSync((process.env.MDOUT||'/tmp/mdout')+'/'+k+'.md',v);
console.log(e);await b.close()})();
