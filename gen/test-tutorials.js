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
    // parcours « depuis zéro » : blocs présents, dans l'ordre, avant « Mettre à jour »
    if(SCRATCH_BASES.includes(base)){
      // la connexion du live est vérifiée avant le partitionnement (après setup-interfaces sur Alpine)
      const T=['Créer une machine virtuelle de test'].concat(base==='alpine'?["Démarrer la VM sur l'ISO",'Vérifier la connexion internet du système live']:['Vérifier la connexion internet du système live','Préparer le système live'],['Partitionner le disque','Installer la base à la main','Configurer le système (chroot)',"Installer le chargeur d'amorçage",'Quitter le chroot et éteindre','Démarrer sur le disque','Mettre à jour le système']);
      {const sec=md.split(/^### /m).find(x=>/^\d+\. Vérifier la connexion internet du système live/.test(x))||'';
       if(!/^\*\*État :\*\* ⚠️/m.test(sec))out.bad.push('étape connexion pas ⚠️: '+obj+' '+base);
       if(!/Câble :/.test(sec)||!/Wi-Fi :/.test(sec)||!/connexion est automatique/.test(sec))out.bad.push('étape connexion incomplète: '+obj+' '+base)}
      {const sec=md.split(/^### /m).find(x=>/^\d+\. Configurer le système \(chroot\)/.test(x))||'';
       if(!/resolv\.conf/.test(sec))out.bad.push('resolv.conf absent du chroot: '+obj+' '+base)}
      md.split(/^### /m).filter(x=>/^\d+\. Réseau : /.test(x)).forEach(x=>{if(!/configure le réseau du système installé/.test(x))out.bad.push('brique réseau sans précision live/installé: '+obj+' '+base)});
      const pos=T.map(t=>md.indexOf('. '+t));
      if(pos.some(x=>x<0))out.bad.push('bloc manquant: '+T.filter((t,n)=>pos[n]<0).join(', ')+' '+obj+' '+base);
      else if(pos.some((x,n)=>n&&x<pos[n-1]))out.bad.push('blocs dans le désordre: '+obj+' '+base);
      if(!/\*\*Ne suis jamais le partitionnement sur ta vraie machine/.test(md))out.bad.push('avertissement VM absent: '+obj+' '+base);
      if(/Le partitionnement et l'installation de la base : étape manuelle/.test(md))out.bad.push('ligne « ne couvre pas » restée: '+obj+' '+base);
      const db=md.indexOf('. Configurer le bureau');if(db>=0&&db<md.indexOf('. Mettre à jour le système'))out.bad.push('bureau avant les paquets: '+obj+' '+base);
    }
    // Void et Gentoo : blocs « depuis zéro » toujours ⚠️, jamais 🧪
    if(base==='void'||base==='gentoo'){
      if(/🧪 Testé en VM le/.test(md))out.bad.push('🧪 sur '+base+' ('+obj+')');
      md.split(/^### /m).filter(x=>/^\d+\. (Créer une machine|Démarrer la VM|Vérifier la connexion|Préparer le système live|Partitionner|Installer la base|Configurer le système|Installer le chargeur|Quitter le chroot|Démarrer sur le disque|Configurer le bureau)/.test(x))
        .forEach(x=>{if(!/^\*\*État :\*\* ⚠️/m.test(x))out.bad.push('bloc pas ⚠️ sur '+base+': '+x.split('\n')[0]+' ('+obj+')')});
    }
    if(base==='gentoo'&&!/\*\*Compilation longue\*\*/.test(md))out.bad.push('avertissement compilation absent: '+obj);
    if(base==='gentoo'&&!/gentoo-kernel-bin/.test(md))out.bad.push('gentoo-kernel-bin absent: '+obj);
    // statut de la base dans l'en-tête
    if(BASEDEF[base]&&!md.includes('> Parcours « distro depuis zéro » sur '+BASEDEF[base].name+' : '+BASE_STATUS[baseStatus(base)]))out.bad.push('statut de base absent: '+obj+' '+base);
    // 🧪 seulement pour une base qui a des tests enregistrés
    {const labels=Object.values(VM_TESTS).flatMap(b=>Object.values(b.tests).map(t=>t.label));
     (md.match(/🧪 Testé en VM le \d{4}-\d\d-\d\d, sur [^—\n]+/g)||[]).forEach(m=>{const l=m.split(', sur ')[1].trim();if(!labels.includes(l))out.bad.push('🧪 sans test enregistré: '+l+' '+obj+' '+base)})}
    // flatpak install seulement dans l'étape « Préparer Flatpak », qui liste chaque identifiant
    {const secs=md.split(/^### /m);const fpSec=secs.find(x=>/^\d+\. Préparer Flatpak/.test(x))||'';
     secs.filter(x=>x!==fpSec&&!/^Construire/.test(x)).forEach(x=>{if(/flatpak install/.test(x))out.bad.push('flatpak install hors « Préparer Flatpak »: '+obj+' '+base)});
     (md.match(/Installé avec Flatpak \(`([^`]+)`/g)||[]).forEach(m=>{const id=m.split('`')[1];if(!fpSec.includes('flatpak install -y flathub '+id))out.bad.push('identifiant absent de « Préparer Flatpak »: '+id+' '+obj+' '+base)})}
    // un paquet de dépôt tiers ne passe jamais en 🟡
    if(/\*\*État :\*\* 🟡[^\n]*Dépôt tiers requis/.test(md))out.bad.push('dépôt tiers en 🟡: '+obj+' '+base);
    // commandes de gestionnaire cohérentes avec la base
    const f=FAMILY[BASEDEF[base]?base:'debian'];
    if(BASEDEF[base]){
      if(f==='apt'&&/\bapk add\b|\bpacman -S\b/.test(md.replace(/Alpine[^\n]*/g,'')))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='pacman'&&/\bapk add\b|\bapt install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='apk'&&base==='alpine'&&/\bapt install\b|\bpacman -S\b|\bdnf install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if((f==='xbps'||f==='emerge')&&/\b(apk add|apt install|pacman -S|dnf install)\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='xbps'&&/\bemerge\b/.test(md)||f==='emerge'&&/\bxbps-install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
    }
    if(mix===0&&['gaming:alpine','light:debian','server:fedora','secure:arch','office:ubuntu'].includes(obj+':'+base))out.samples[obj+'-'+base]=md;
   }
  }
 }
 // statut affiché sur l'écran de choix de la base
 const want={alpine:'tested',debian:'written',ubuntu:'written',arch:'written',fedora:'written',void:'written',gentoo:'written'};
 Object.keys(BASEDEF).forEach(b=>{const e=want[b]||'none';if(baseStatus(b)!==e)out.bad.push('statut '+b+' : '+baseStatus(b)+' au lieu de '+e)});
 G.base=null;G.obj='gaming';const scr=baseScreen();
 Object.keys(BASEDEF).forEach(b=>{const m=scr.match(new RegExp('data-base="'+b+'">.*?</button>'));if(!m||!m[0].includes(BASE_STATUS[want[b]||'none']))out.bad.push('statut absent de la carte '+b)});
 return out;
});
console.log('tutoriels générés:',res.n,'| problèmes:',res.bad.length);
[...new Set(res.bad)].slice(0,25).forEach(x=>console.log(' -',x));
for(const [k,v] of Object.entries(res.samples))fs.writeFileSync((process.env.MDOUT||'/tmp/mdout')+'/'+k+'.md',v);
console.log(e);await b.close()})();
