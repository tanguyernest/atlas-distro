const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const e=[];p.on('pageerror',x=>e.push(x.message));
await p.goto('file://'+require('path').resolve(__dirname,'../atlas-distro.html')+'?lang='+(process.env.ATLAS_LANG||'fr'));
const res=await p.evaluate(()=>{
 const out={n:0,bad:[],samples:{}};
 // mots du .md généré, dans la langue de la page (?lang= / ATLAS_LANG) : les commandes, elles, ne changent jamais
 const EN=LANG==='en';
 const W=EN?{h1:/^# .* distro on /,iso:'## Build a custom ISO',recap:'## Verification summary',pkgs:/Package names checked on \d{4}-\d\d-\d\d on /,st:'**Status:**',stRe:/\*\*Status:\*\*/g,
   vm:'Create a test virtual machine',live:'Boot the VM from the ISO',net:'Check the live system\'s internet connection',prep:'Prepare the live system',part:'Partition the disk',base:'Install the base by hand',cfg:'Configure the system (chroot)',boot:'Install the bootloader',off:'Leave the chroot and power off',disk:'Boot from the disk',upd:'Update the system',desk:'Configure the desktop',
   wired:/Wired:/,wifi:/Wi-Fi:/,auto:/connection is automatic/,network:'Network: ',netNote:/sets up the installed system's network/,never:'**Never follow the partitioning on your real machine',nocover:/Partitioning and installing the base: a manual step/,
   tested:'🧪 Tested in a VM on',testedRe:/🧪 Tested in a VM on \d{4}-\d\d-\d\d, on [^—\n]+/g,testedSep:', on ',long:'**Long build**',
   steps:'\n## Steps\n',pkglist:'\n## Full package list',fp:'Prepare Flatpak',build:/^Build a custom/,fpIn:/Installed with Flatpak \(`([^`]+)`/g,third:/\*\*Status:\*\* 🟡[^\n]*Third-party repository required/,
   id:'Identifier:',idRe:/^\d+\. [^\n]*\n\nIdentifier: `([^`]+)`\n/,link:/^Found an error here\? \[Report it\]\(([^)\s]*)\)$/gm,sig:'\n## Report a problem\n',sigName:'Report a problem',
   keys:['App version: '+APP_VERSION,'Package check date: ','Base: ','Path: ','Choices made in the app:','Affected step','Command: ','Error message: ']}
  :{h1:/^# Distro /,iso:'## Construire une ISO',recap:'## Récapitulatif',pkgs:/Noms de paquets vérifiés le \d{4}-\d\d-\d\d sur /,st:'**État :**',stRe:/\*\*État :\*\*/g,
   vm:'Créer une machine virtuelle de test',live:"Démarrer la VM sur l'ISO",net:'Vérifier la connexion internet du système live',prep:'Préparer le système live',part:'Partitionner le disque',base:'Installer la base à la main',cfg:'Configurer le système (chroot)',boot:"Installer le chargeur d'amorçage",off:'Quitter le chroot et éteindre',disk:'Démarrer sur le disque',upd:'Mettre à jour le système',desk:'Configurer le bureau',
   wired:/Câble :/,wifi:/Wi-Fi :/,auto:/connexion est automatique/,network:'Réseau : ',netNote:/configure le réseau du système installé/,never:'**Ne suis jamais le partitionnement sur ta vraie machine',nocover:/Le partitionnement et l'installation de la base : étape manuelle/,
   tested:'🧪 Testé en VM le',testedRe:/🧪 Testé en VM le \d{4}-\d\d-\d\d, sur [^—\n]+/g,testedSep:', sur ',long:'**Compilation longue**',
   steps:'\n## Étapes\n',pkglist:'\n## Liste complète des paquets',fp:'Préparer Flatpak',build:/^Construire/,fpIn:/Installé avec Flatpak \(`([^`]+)`/g,third:/\*\*État :\*\* 🟡[^\n]*Dépôt tiers requis/,
   id:'Identifiant :',idRe:/^\d+\. [^\n]*\n\nIdentifiant : `([^`]+)`\n/,link:/^Une erreur ici \? \[Signale-la\]\(([^)\s]*)\)$/gm,sig:'\n## Signaler un problème\n',sigName:'Signaler un problème',
   keys:["Version de l'app : "+APP_VERSION,'Date de vérification des paquets : ','Base : ','Parcours : ',"Choix faits dans l'app :",'Étape concernée','Commande : ',"Message d'erreur : "]};
 const stLine=(re)=>new RegExp('^'+W.st.replace(/\*/g,'\\*')+' '+re,'m');
 const objs=OBJECTIVES.filter(o=>o.ready).map(o=>o.id);
 const bases=Object.keys(BASEDEF).concat(['undecided']);
 for(const obj of objs){const tr=TREES[obj];
  for(const base of bases){
   for(const mix of [0,1,2]){
    Object.keys(HW).forEach(k=>delete HW[k]);
    G.obj=obj;G.base=base;G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.scope=mix===2?'precise':'general';
    if(mix===2)Object.assign(HW,{model:'PC de test',gpu:'amd',boot:'uefi',ram:'8',arch:'x86-amd',wifi:'intel',disk:'nvme'});
    G.ans=tr.questions.map((q,k)=>mix===1?Math.min(1,q.o.length-1):0);G.i=tr.questions.length;G.sw={};
    let md;try{md=buildTutorial()}catch(err){out.bad.push('EXCEPTION '+obj+' '+base+' '+mix+': '+err.message);continue}
    out.n++;
    const fences=(md.match(/^\s*```/gm)||[]).length;
    if(fences%2)out.bad.push('blocs de code non fermés: '+obj+' '+base+' '+mix);
    if(/undefined|\[object|NaN/.test(md))out.bad.push('texte suspect: '+obj+' '+base+' '+mix+' : '+(md.match(/.{30}(undefined|\[object|NaN).{20}/)||[''])[0]);
    if(!W.h1.test(md))out.bad.push('titre manquant: '+obj+' '+base);
    if(!md.includes(W.iso)||!md.includes(W.recap))out.bad.push('sections manquantes: '+obj+' '+base);
    // 🟡 seulement sur les bases dont les noms ont été vérifiés (Alpine + DISTRO_STATUS)
    const verified=base==='alpine'||!!DISTRO_STATUS[base];
    if(!verified&&base!=='undecided'&&new RegExp(W.st.replace(/\*/g,'\\*')+' 🟡').test(md))out.bad.push('état vérifié sur base non vérifiée: '+obj+' '+base);
    if(DISTRO_STATUS._meta[base]&&!W.pkgs.test(md))out.bad.push('date de vérification absente: '+obj+' '+base);
    // parcours « depuis zéro » : blocs présents, dans l'ordre, avant « Mettre à jour »
    if(SCRATCH_BASES.includes(base)){
      // la connexion du live est vérifiée avant le partitionnement (après setup-interfaces sur Alpine)
      const T=[W.vm].concat(base==='alpine'?[W.live,W.net]:[W.net,W.prep],[W.part,W.base,W.cfg,W.boot,W.off,W.disk,W.upd]);
      {const sec=md.split(/^### /m).find(x=>x.replace(/^\d+\. /,'').startsWith(W.net))||'';
       // 🧪 possible sur Alpine (testée le 31/10), ⚠️ ailleurs
       if(!(base==='alpine'?stLine('(⚠️|🧪)'):stLine('⚠️')).test(sec))out.bad.push('étape connexion pas ⚠️: '+obj+' '+base);
       if(!W.wired.test(sec)||!W.wifi.test(sec)||!W.auto.test(sec))out.bad.push('étape connexion incomplète: '+obj+' '+base)}
      {const sec=md.split(/^### /m).find(x=>x.replace(/^\d+\. /,'').startsWith(W.cfg))||'';
       if(!/resolv\.conf/.test(sec))out.bad.push('resolv.conf absent du chroot: '+obj+' '+base)}
      md.split(/^### /m).filter(x=>x.replace(/^\d+\. /,'').startsWith(W.network)).forEach(x=>{if(!W.netNote.test(x))out.bad.push('brique réseau sans précision live/installé: '+obj+' '+base)});
      const pos=T.map(t=>md.indexOf('. '+t));
      if(pos.some(x=>x<0))out.bad.push('bloc manquant: '+T.filter((t,n)=>pos[n]<0).join(', ')+' '+obj+' '+base);
      else if(pos.some((x,n)=>n&&x<pos[n-1]))out.bad.push('blocs dans le désordre: '+obj+' '+base);
      if(!md.includes(W.never))out.bad.push('avertissement VM absent: '+obj+' '+base);
      if(W.nocover.test(md))out.bad.push('ligne « ne couvre pas » restée: '+obj+' '+base);
      const db=md.indexOf('. '+W.desk);if(db>=0&&db<md.indexOf('. '+W.upd))out.bad.push('bureau avant les paquets: '+obj+' '+base);
    }
    // Void et Gentoo : blocs « depuis zéro » toujours ⚠️, jamais 🧪
    if(base==='void'||base==='gentoo'){
      if(md.includes(W.tested))out.bad.push('🧪 sur '+base+' ('+obj+')');
      md.split(/^### /m).filter(x=>[W.vm,W.live,W.net,W.prep,W.part,W.base,W.cfg,W.boot,W.off,W.disk,W.desk].some(t=>x.replace(/^\d+\. /,'').startsWith(t)))
        .forEach(x=>{if(!stLine('⚠️').test(x))out.bad.push('bloc pas ⚠️ sur '+base+': '+x.split('\n')[0]+' ('+obj+')')});
    }
    if(base==='gentoo'&&!md.includes(W.long))out.bad.push('avertissement compilation absent: '+obj);
    if(base==='gentoo'&&!/gentoo-kernel-bin/.test(md))out.bad.push('gentoo-kernel-bin absent: '+obj);
    // statut de la base dans l'en-tête
    if(BASEDEF[base]&&!md.includes(tx('tuto.scratch',{base:BASEDEF[base].name,status:trx(BASE_STATUS[baseStatus(base)])})))out.bad.push('statut de base absent: '+obj+' '+base);
    // 🧪 seulement pour une base qui a des tests enregistrés
    {const labels=Object.values(VM_TESTS).flatMap(b=>Object.values(b.tests).map(t=>t.label));
     (md.match(W.testedRe)||[]).forEach(m=>{const l=m.split(W.testedSep)[1].trim();if(!labels.map(trd).includes(l))out.bad.push('🧪 sans test enregistré: '+l+' '+obj+' '+base)})}
    // flatpak install seulement dans l'étape « Préparer Flatpak », qui liste chaque identifiant
    {const secs=md.split(/^### /m);const fpSec=secs.find(x=>x.replace(/^\d+\. /,'').startsWith(W.fp))||'';
     secs.filter(x=>x!==fpSec&&!W.build.test(x)).forEach(x=>{if(/flatpak install/.test(x))out.bad.push('flatpak install hors « Préparer Flatpak »: '+obj+' '+base)});
     (md.match(W.fpIn)||[]).forEach(m=>{const id=m.split('`')[1];if(!fpSec.includes('flatpak install -y flathub '+id))out.bad.push('identifiant absent de « Préparer Flatpak »: '+id+' '+obj+' '+base)})}
    // un paquet de dépôt tiers ne passe jamais en 🟡
    if(W.third.test(md))out.bad.push('dépôt tiers en 🟡: '+obj+' '+base);
    // commandes de gestionnaire cohérentes avec la base
    const f=FAMILY[BASEDEF[base]?base:'debian'];
    if(BASEDEF[base]){
      if(f==='apt'&&/\bapk add\b|\bpacman -S\b/.test(md.replace(/Alpine[^\n]*/g,'')))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='pacman'&&/\bapk add\b|\bapt install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='apk'&&base==='alpine'&&/\bapt install\b|\bpacman -S\b|\bdnf install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if((f==='xbps'||f==='emerge')&&/\b(apk add|apt install|pacman -S|dnf install)\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
      if(f==='xbps'&&/\bemerge\b/.test(md)||f==='emerge'&&/\bxbps-install\b/.test(md))out.bad.push('commande étrangère sur '+base+' ('+obj+')');
    }
    // signalement : identifiant unique sous chaque titre d'étape, lien GitHub Issues bien formé
    {const body=md.slice(md.indexOf(W.steps),md.indexOf(W.pkglist));
     const secs=body.split(/^### /m).slice(1);const ids=[];
     secs.forEach(x=>{const head=x.split('\n')[0];
      const m=x.match(W.idRe);
      if(!m){out.bad.push('identifiant absent sous le titre: '+head+' ('+obj+' '+base+')');return}
      const id=m[1];ids.push(id);
      // base « undecided » : l'arbre choisit la base, qui préfixe alors l'identifiant
      const bid=BASEDEF[base]?base:id.split('-')[0];
      if(!BASEDEF[bid]||!new RegExp('^'+bid+'-'+obj+'-[a-z0-9]+(-[a-z0-9]+)*$').test(id))out.bad.push('identifiant mal formé: '+id);
      const links=x.match(W.link)||[];
      if(links.length!==1){out.bad.push('lien de signalement absent ou en double: '+id);return}
      const url=links[0].slice(links[0].indexOf('](')+2,-1);let u;
      try{u=new URL(url)}catch(err){out.bad.push('lien invalide: '+id);return}
      if(!url.startsWith(REPO_URL+'/issues/new?template=commande-qui-echoue.yml&'))out.bad.push('lien hors REPO_URL ou sans modèle: '+id);
      const q=k=>u.searchParams.get(k)||'';
      if(!q('title').includes(id)||!q('etape').startsWith(id+' '))out.bad.push('identifiant absent du lien: '+id);
      // les clés doivent être les id des champs de .github/ISSUE_TEMPLATE/commande-qui-echoue.yml (vérifié plus bas, côté Node)
      const keys=[...u.searchParams.keys()].filter(k=>k!=='template'&&k!=='title').sort().join(',');
      if(keys!=='base,etape,parcours,version')out.bad.push('champs du lien inattendus ('+keys+'): '+id);
      if(q('base')!==(BASEDEF[bid]||{}).name||!q('parcours')||q('version')!==APP_VERSION)out.bad.push('champ mal rempli dans le lien: '+id);
      if(url.length>8000)out.bad.push('lien trop long: '+id)});
     if(new Set(ids).size!==ids.length)out.bad.push('identifiants en double: '+obj+' '+base)}
    {const i=md.indexOf(W.sig);const sec=i<0?'':md.slice(i);
     if(!sec)out.bad.push('section « '+W.sigName+' » absente: '+obj+' '+base);
     W.keys.forEach(k=>{if(sec&&!sec.includes(k))out.bad.push('champ « '+k+' » absent du bloc: '+obj+' '+base)});
     if(/\/home\/|\/Users\/|[A-Z]:\\|\/root\//.test(sec))out.bad.push('chemin local dans le bloc: '+obj+' '+base);
     if(HW.model&&sec.includes(HW.model))out.bad.push('modèle de machine dans le bloc: '+obj+' '+base)}
    if(mix===0&&['gaming:alpine','light:debian','server:fedora','secure:arch','office:ubuntu'].includes(obj+':'+base))out.samples[obj+'-'+base]=md;
   }
  }
 }
 // en anglais, aucune phrase du générateur ne doit rester sans traduction (TUTO_EN)
 if(EN)TUTO_MISS.forEach(m=>out.bad.push('phrase du tutoriel sans traduction: '+m.slice(0,90)));
 // statut affiché sur l'écran de choix de la base
 const want={alpine:'tested',debian:'written',ubuntu:'written',arch:'written',fedora:'written',void:'written',gentoo:'written'};
 Object.keys(BASEDEF).forEach(b=>{const e=want[b]||'none';if(baseStatus(b)!==e)out.bad.push('statut '+b+' : '+baseStatus(b)+' au lieu de '+e)});
 G.base=null;G.obj='gaming';const scr=baseScreen();
 Object.keys(BASEDEF).forEach(b=>{const m=scr.match(new RegExp('data-base="'+b+'">.*?</button>'));if(!m||!m[0].includes(trx(BASE_STATUS[want[b]||'none'])))out.bad.push('statut absent de la carte '+b)});
 return out;
});
// modèles de ticket : les champs remplis par le lien existent, et les champs demandés sont là
{const dir=require('path').resolve(__dirname,'../.github/ISSUE_TEMPLATE');
 const ids=f=>{try{return [...fs.readFileSync(dir+'/'+f,'utf8').matchAll(/^\s+id: (\S+)$/gm)].map(m=>m[1])}catch(err){res.bad.push('modèle absent: '+f);return []}};
 const a=ids('commande-qui-echoue.yml'),b=ids('paquet-introuvable.yml');
 ['base','parcours','etape','commande','erreur','version'].forEach(k=>{if(!a.includes(k))res.bad.push('champ « '+k+' » absent de commande-qui-echoue.yml')});
 ['base','paquet','erreur'].forEach(k=>{if(!b.includes(k))res.bad.push('champ « '+k+' » absent de paquet-introuvable.yml')})}
console.log('tutoriels générés:',res.n,'| problèmes:',res.bad.length);
[...new Set(res.bad)].slice(0,25).forEach(x=>console.log(' -',x));
for(const [k,v] of Object.entries(res.samples))fs.writeFileSync((process.env.MDOUT||'/tmp/mdout')+'/'+k+'.md',v);
console.log(e);await b.close()})();
