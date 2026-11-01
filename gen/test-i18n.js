// Tests i18n : node gen/test-i18n.js   (ATLAS_LANG=en pour charger la page en anglais)
// Vérifie : parité des clés fr/en, couche anglaise valide (liste blanche), commandes et identifiants
// d'étape identiques entre langues sur les combinaisons base × parcours × mode.
const {chromium}=require('playwright');
// textes déjà identiques en anglais (noms propres, outils, identifiants) : pas de traduction nécessaire
const KEEP=new Set(['Alpine Linux','Arch Linux','Void Linux','Gentoo Linux','Linux From Scratch','Raspberry Pi OS','Tiny Core Linux','Tiny Core','Rocky Linux','Linux LTS','KDE Plasma','Steam + Proton','Portage (emerge)','BusyBox init','pkgtools (slackpkg)','apt (Debian)','apt (Ubuntu)','dnf (Fedora)','zypper (openSUSE)','apt (Devuan)','apt (Raspberry Pi OS)','dnf (Rocky)','dnf (AlmaLinux)','pacman -S','xbps-install -S','nix profile install nixpkgs#']);
(async()=>{
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',x=>errs.push(x.message));
await p.goto('file://'+require('path').resolve(__dirname,'../atlas-distro.html')+'?lang='+(process.env.ATLAS_LANG||'fr'));
const r=await p.evaluate(()=>{
 const bad=[];const out={n:0,bad};
 // 1. parité des clés
 const fk=Object.keys(I18N.fr),ek=Object.keys(I18N.en);
 fk.filter(k=>!ek.includes(k)).forEach(k=>bad.push('clé fr sans en: '+k));
 ek.filter(k=>!fk.includes(k)).forEach(k=>bad.push('clé en sans fr: '+k));
 for(const l of LANGS)for(const k of Object.keys(I18N[l]))if(!String(I18N[l][k]).trim())bad.push('valeur vide '+l+'.'+k);
 // 2. mêmes variables {x}, mêmes passages entre accents graves entre fr et en
 const sig=s=>(String(s).match(/\{\w+\}|`[^`]*`|\$\{[^}]*\}/g)||[]).join('|');
 fk.filter(k=>ek.includes(k)).forEach(k=>{if(sig(I18N.fr[k])!==sig(I18N.en[k]))bad.push('variables/commandes différentes: '+k)});
 // 3. couche anglaise : chemin valide, champ autorisé, texte non vide, mêmes accents graves que le français
 Object.keys(EN_DATA).forEach(path=>{
  const ref=l10nRef(path);
  if(!ref){bad.push('chemin invalide ou champ interdit: '+path);return}
  const fr=path in FR0?FR0[path]:ref.o[ref.f];
  const a=JSON.stringify(fr),e=JSON.stringify(EN_DATA[path]);
  if(!e||e==='""')bad.push('traduction vide: '+path);
  if(sig(a)!==sig(e))bad.push('commandes/variables modifiées: '+path);
 });
 // 3b. dictionnaire du tutoriel : valeur non vide, mêmes jetons ⟦n⟧ et mêmes passages entre accents graves que la clé
 Object.keys(TUTO_EN).forEach(k=>{const v=TUTO_EN[k],tk=x=>(String(x).match(/⟦\d+⟧|`[^`]*`/g)||[]).sort().join('|');
  if(!String(v).trim())bad.push('TUTO_EN vide: '+k.slice(0,50));else if(tk(k)!==tk(v))bad.push('TUTO_EN jetons/commandes différents: '+k.slice(0,60))});
 // 4. basculer la langue ne laisse rien d'altéré : fr → en → fr redonne les données d'origine
 const snap=()=>JSON.stringify([TOOLS,CATS,LAYERS,OBJECTIVES,HELP,BASEDEF]);
 const start=LANG;setLang('fr',true);const s0=snap();setLang('en',true);setLang('fr',true);
 if(snap()!==s0)bad.push('retour en fr différent de l\'original');
 // 4b. FRAG : valeurs non vides, mêmes noms d'outils, mêmes passages en code
 {const names=[...new Set(TOOLS.map(t=>t.name).filter(n=>/^[A-Za-z][\w.+-]{3,}$/.test(n)&&!/^(Archives|Terminal|Shell|Notifications|Jeux|Son|ranger)$/i.test(n)))];
  Object.keys(FRAG).forEach(k=>{const v=FRAG[k];
   if(!String(v).trim())bad.push('FRAG vide: '+k.slice(0,40));
   names.forEach(n=>{const re=new RegExp('(^|[^\\w-])'+n.replace(/[.+]/g,'\\$&')+'($|[^\\w-])');if(re.test(k)&&!re.test(v))bad.push('nom d\'outil perdu ('+n+'): '+k.slice(0,50))});
   if(sig(k)!==sig(v))bad.push('variables/commandes modifiées dans FRAG: '+k.slice(0,50));
  })}
 // 4b2. aide « ? » : mêmes clés que HELP, texte non vide et différent du français, lien Wikipédia anglais, noms/commandes conservés
 {const fk=Object.keys(HELP),ek=Object.keys(HELP_EN);
  fk.filter(k=>!ek.includes(k)).forEach(k=>bad.push('HELP_EN manquant: '+k));
  ek.filter(k=>!fk.includes(k)).forEach(k=>bad.push('HELP_EN en trop: '+k));
  const tok=x=>(String(x).match(/`[^`]*`/g)||[]).join('|');
  fk.filter(k=>HELP_EN[k]).forEach(k=>{const f=HELP[k],e=HELP_EN[k];
   if(!String(e[0]||'').trim())bad.push('HELP_EN vide: '+k);
   else if(e[0]===f[0])bad.push('HELP_EN identique au français: '+k);
   if(!!f[1]!==!!e[1])bad.push('HELP_EN lien Wikipédia absent/en trop: '+k);
   if(tok(f[0])!==tok(e[0]))bad.push('HELP_EN commandes modifiées: '+k)});
  const lw=ek.filter(k=>/[éèàùçêâîôûœ]/.test(HELP_EN[k].join(' ')));lw.forEach(k=>bad.push('HELP_EN accent français: '+k));
  const a=document.getElementById('sh-a'),L0=LANG;
  setLang('en',true);openHelp('cat:kernel','Kernel');if(!a.href.startsWith('https://en.wikipedia.org/'))bad.push('lien aide en: '+a.href);
  if(document.getElementById('sh-p').textContent!==HELP_EN['cat:kernel'][0])bad.push('texte aide en');
  setLang('fr',true);openHelp('cat:kernel','Noyau');if(!a.href.startsWith('https://fr.wikipedia.org/'))bad.push('lien aide fr: '+a.href);
  if(document.getElementById('sh-p').textContent!==HELP['cat:kernel'][0])bad.push('texte aide fr');
  closeHelp();setLang(L0,true)}
 // 4b3. fiches (lot 6) : chemins valides, même nombre d'éléments, noms et commandes conservés, logique inchangée
 {const FRV=/[éèàùçêâîôûœ]|\b(le|la|les|une|des|pour|avec|sans|est|sur|ou|et|du|de|plus|très|peu|oui)\b|\bnon\b(?!-)/i;
  const AR=['pros','cons','pitfalls','needs'],PROSE=x=>!/^[\w.+-]+$/.test(x);
  setLang('fr',true);
  const frT=Object.fromEntries(TOOLS.map(t=>[t.id,JSON.parse(JSON.stringify(t))])),frNames=new Map(TOOLS.map(t=>[t.name,t.id]));
  const pick0=TOOLS.map(t=>[PICK.bar(t),PICK.launch(t),PICK.notif(t),swMusl(t)].join());
  // noms d'outils et jetons techniques (commandes, fichiers, options) du français à retrouver dans l'anglais
  const TKN=/(^|\s|\()(-[\w-]+|[\w./-]*[\w](?:=|\(\)|\.[a-z]{2,}\b)|[a-z0-9]+-[a-z0-9-]+)(?=$|[\s,;:.)])/g;
  const TSKIP=new Set(['multi-distributions','client-serveur','tout-en-un','sur-mesure','rétro-compatibles','pare-feu','sous-uid','sous-gid','presse-papiers']);
  const techs=s=>[...String(s).matchAll(TKN)].map(m=>m[2]).filter(x=>!TSKIP.has(x));
  const toolNames=[...new Set(TOOLS.map(t=>t.name).filter(n=>/^[A-Za-z][\w.+-]{3,}$/.test(n)&&!/^(Archives|Terminal|Shell|Notifications|Jeux|Son|ranger|Fichiers|Stable|Rolling)$/i.test(n)))];
  const has=(s,w)=>new RegExp('(^|[^\\w-])'+w.replace(/[.+()]/g,'\\$&')+'($|[^\\w-])').test(s);
  Object.keys(EN_TOOLS).forEach(id=>{const f=frT[id],e=EN_TOOLS[id];
   if(!f){bad.push('fiche inconnue: '+id);return}
   Object.keys(e).forEach(k=>{if(!L10N_FIELDS.tools.includes(k))bad.push('champ interdit: '+id+'/'+k)});
   if(!e.summary)bad.push('résumé manquant: '+id);
   if(f.learn&&!e.learn)bad.push('learn manquant: '+id);
   if('learn' in e&&!f.learn)bad.push('learn en trop: '+id);
   AR.forEach(k=>{const a=f[k],b=e[k];
    if(!b){if(a.some(PROSE))bad.push(k+' manquant: '+id);return}
    if(a.length!==b.length){bad.push(k+' longueur différente: '+id);return}
    a.forEach((x,i)=>{if(/Alpine/.test(x)!==/Alpine/.test(b[i]))bad.push('mot Alpine (filtre consFor/needsFor) différent: '+id+'/'+k+'['+i+']');
     if(frNames.has(x)&&k==='needs'&&b[i]!==x)bad.push('nom d\'outil traduit dans needs: '+id+'/'+x)})});
   if(e.name&&FRAG[f.name]!==undefined&&FRAG[f.name]!==e.name)bad.push('nom différent de FRAG: '+id+' : '+e.name+' ≠ '+FRAG[f.name]);
   ['summary','learn',...AR].forEach(k=>{if(e[k]===undefined)return;
    const a=[].concat(f[k]),b=[].concat(e[k]);
    a.forEach((x,i)=>{const y=b[i];if(y===undefined)return;
     if(FRV.test(y)&&!/^(Adélie)/.test(y))bad.push('français résiduel: '+id+'/'+k+' : '+y.slice(0,60));
     if(PROSE(x)&&x===y&&!/^[\w.+-]+ \d+$/.test(x))bad.push('identique au français: '+id+'/'+k+' : '+x.slice(0,60));
     toolNames.forEach(n=>{if(has(x,n)&&!has(y,n))bad.push('nom perdu ('+n+'): '+id+'/'+k)});
     techs(x).forEach(w=>{if(!y.includes(w))bad.push('jeton technique perdu ('+w+'): '+id+'/'+k)})})});
   if(e.name){if(!/[A-Za-z]/.test(e.name)||e.name===f.name)bad.push('nom inutile: '+id);
    const prod=(f.name.match(/\b[A-Z][\w-]*[A-Z0-9][\w-]*\b|\b(Linux|Wayland|Debian|Slackware|slackpkg|pkgtools)\b/g)||[]);
    prod.forEach(w=>{if(!e.name.includes(w))bad.push('produit perdu dans le nom ('+w+'): '+id)})}
  });
  // catégories entièrement traduites : libellés et valeurs de critères couverts, comparateur sans français
  const KEEP_VAL=new Set(['BIOS / UEFI','Secure Boot','Configuration','Documentation','Bluetooth','Wi-Fi','LTS','mainline','possible','MIT','LGPL','UEFI','C','Rust','musl','apk','OpenRC','glibc','apt','systemd','pacman','dnf','xbps','runit','Portage (emerge)','Nix','zypper','procd','BusyBox init','pkgtools (slackpkg)','.deb','.rpm','.xbps','.txz','.pkg.tar.zst','Alpine','Arch','Debian','rolling','stable','Wayland','X11','tiling','hyprland.conf','total','journald, timers, socket activation, cgroups','FAT, ext2/3/4, ISO9660','Dolphin, Konsole, Kate, Spectacle','Thunar, Terminal, Mousepad','Mo','1','aucune','CSS','Lua','Zig','Gecko','Blink','flatpak','terminal','Terminal','Terminal (iwctl)','Terminal (TUI)','Steam','Git','WireGuard','native','simple','Simple','Notifications','Interface','Extensions','Scripts','podman compose','docker compose','OpenVPN (TLS)','Epic, GOG, Amazon','Linux, Windows','Linux, Windows, macOS','Linux, Android, Windows','Linux, Windows, macOS, BSD','Linux, Windows, macOS, Android, BSD','Linux, Windows, macOS, Android, iOS']);
  const doneCats=CATS.filter(c=>{const l=TOOLS.filter(t=>t.category===c.id);return l.length&&l.every(t=>EN_TOOLS[t.id])});
  doneCats.forEach(c=>{c.criteria.forEach(k=>{if(!VAL_EN[k.label]&&!KEEP_VAL.has(k.label))bad.push('libellé de critère sans anglais: '+c.id+'/'+k.label);if(k.unit&&!VAL_EN[k.unit])bad.push('unité sans anglais: '+k.unit)});
   TOOLS.filter(t=>t.category===c.id).forEach(t=>{Object.values(t.criteria||{}).forEach(v=>{if(typeof v==='string'&&!VAL_EN[v]&&!KEEP_VAL.has(v))bad.push('valeur de critère sans anglais: '+t.id+' : '+v)});
    t.used_by.forEach(u=>{if(FRV.test(u)&&!VAL_EN[u]&&!/^Adélie/.test(u))bad.push('Utilisé par sans anglais: '+u)});
    t.implement.forEach(s=>{if(FRV.test(s.title)&&!VAL_EN[s.title])bad.push('titre d\'étape sans anglais: '+s.title)})})});
  // licences : description traduite, identifiants conservés, valeur d'origine jamais modifiée
  {const IDS=/[A-Z]+-[\d.]+\+?|\b(?:MIT|0?BSD|CDDL|ISC|GPL|Unlicense)\b/g;const L0=LANG;setLang('en',true);
   [...new Set(TOOLS.map(t=>t.license).filter(Boolean))].forEach(l=>{const e=crx(l);
    if(FRV.test(e)||/Libre|Licence|Propri[ée]taire|objet/.test(e))bad.push('licence non traduite: '+l);
    if((l.match(IDS)||[]).join()!==(e.match(IDS)||[]).join())bad.push('identifiant de licence modifié: '+l)});
   setLang(L0,true)}
  setLang('en',true);
  const main=document.getElementById('main'),st0=JSON.stringify(state);
  doneCats.forEach(c=>{const ids=TOOLS.filter(t=>t.category===c.id).map(t=>t.id);
   for(let i=0;i<ids.length;i+=4){state.layer=c.layer;state.cat=c.id;state.sel=ids.slice(i,i+4);state.hideSame=false;render();
    const cl=main.cloneNode(true);cl.querySelectorAll('pre').forEach(x=>x.remove());
    const txt=cl.textContent.replace(/Adélie( Linux)?/g,'').replace(/\s+/g,' ');
    const m=txt.match(new RegExp('.{0,40}('+FRV.source+').{0,40}','i'));if(m)bad.push('français dans le comparateur ['+c.id+'] : …'+m[0]+'…')}});
  Object.assign(state,JSON.parse(st0));
  // la logique lit les valeurs françaises : identique dans les deux langues
  const pick1=TOOLS.map(t=>[PICK.bar(t),PICK.launch(t),PICK.notif(t),swMusl(t)].join());
  if(pick0.join('|')!==pick1.join('|'))bad.push('PICK/swMusl différents en anglais');
  TOOLS.forEach(t=>{const f=frT[t.id];if(JSON.stringify(t.criteria)!==JSON.stringify(f.criteria)||JSON.stringify(t.implement)!==JSON.stringify(f.implement)||JSON.stringify(t.docs)!==JSON.stringify(f.docs)||t.license!==f.license)bad.push('critères/commandes/docs/licence modifiés en anglais: '+t.id)});
  setLang('fr',true);
  out.fiches=Object.keys(EN_TOOLS).length;out.total=TOOLS.length;out.reste=CATS.filter(c=>!doneCats.includes(c)).map(c=>c.id)}
 // 4c. mode anglais : les écrans du guide ne contiennent plus de français (hors données des fiches)
 {const FRW=/[éèàùçêâîôûœ]|\b(le|la|les|une|des|pour|ton|tes|avec|pas|est|sur|ou)\b|\bun\b/i;
  // noms de fiches (TOOLS) : données traduites au lot 6, pas ici
  const TNAMES=TOOLS.map(x=>x.name).filter(n=>n.length>3).sort((a,b)=>b.length-a.length);
  const probe=(tag)=>{const el=document.getElementById('guide');const t=el.textContent.replace(/\s+/g,' ');
   // les listes de pros/cons/résumés viennent des fiches (lot 6) : on les retire
   const clone=el.cloneNode(true);clone.querySelectorAll('.pan,.sw,pre,details.grp:has(pre)').forEach(x=>x.remove());
   let txt=clone.textContent.replace(/\s+/g,' ');TNAMES.forEach(n=>{txt=txt.split(n).join('')});
   const m=txt.match(new RegExp('.{0,40}('+FRW.source+').{0,40}','i'));if(m)bad.push('français résiduel en anglais ['+tag+'] : …'+m[0]+'…')};
  setLang('en',true);
  const reset=()=>{Object.keys(HW).forEach(k=>delete HW[k]);G.obj=null;G.i=0;G.ans=[];G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.sw={};G.base=null;G.scope=null;G.hwI=-1;G.hwMsg=null};
  reset();renderGuide();probe('portée');
  G.scope='general';renderGuide();probe('base');
  G.scope='precise';G.stage='hw';G.hwI=-1;renderGuide();probe('modèle');
  G.hwMsg='hw.unknown_model';renderGuide();probe('modèle+msg');G.hwMsg=null;
  HWQ.forEach((q,i)=>{G.hwI=i;renderGuide();probe('matériel '+q.id)});
  G.hwI=HWQ.length;Object.assign(HW,{arch:'x86-intel',gpu:'nvidia',ram:'4',boot:'bios',wifi:'broadcom',disk:'emmc'});renderGuide();probe('récap matériel');G.stage=null;renderGuide();
  for(const base of ['undecided','alpine','debian'])for(const obj of OBJECTIVES.filter(o=>o.ready).map(o=>o.id)){
   G.base=base;G.obj=null;G.stage=null;G.i=0;G.ans=[];renderGuide();if(base==='undecided')probe('base écran');
   G.obj=obj;const tr=TREES[obj];
   for(let i=0;i<=tr.questions.length;i++){G.i=i;G.ans=tr.questions.map((q,k)=>k<i?(k%2):undefined).slice(0,i);renderGuide();probe('guide '+base+' '+obj+' q'+i)}
   G.ans=tr.questions.map((q,k)=>(k+1)%2);G.i=tr.questions.length;renderGuide();probe('résultat '+base+' '+obj);
   G.open='0,1';renderGuide();probe('alt '+base+' '+obj);G.open=null;
   G.stage='md';renderGuide();probe('md '+base+' '+obj);G.stage='sw';renderGuide();probe('logiciels '+base+' '+obj);G.stage=null;
  }
  G.manual={};setLang('fr',true);reset()}
 // 5. tutoriels fr/en : commandes et identifiants identiques, identifiants valides et uniques
 const objs=OBJECTIVES.filter(o=>o.ready).map(o=>o.id),bases=Object.keys(BASEDEF).concat(['undecided']);
 const grab=md=>{const ids=[...md.matchAll(/^(?:Identifiant :|Identifier:) `([^`]+)`/gm)].map(m=>m[1]);
  // le bloc « Signaler un problème » est du texte à copier, traduit : il n'est pas une commande
  const code=[...md.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map(m=>m[1]).filter(c=>!/^(Version de l'app|App version)/.test(c));return {ids,code}};
 const run=(lang,obj,base,mix)=>{setLang(lang,true);Object.keys(HW).forEach(k=>delete HW[k]);
  G.obj=obj;G.base=base;G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.scope=mix?'precise':'general';
  if(mix)Object.assign(HW,{model:'PC de test',gpu:'amd',boot:'uefi',ram:'8',arch:'x86-amd',wifi:'intel',disk:'nvme'});
  const tr=TREES[obj];G.ans=tr.questions.map(()=>0);G.i=tr.questions.length;G.sw={};
  // empreintes des commandes étape par étape (appelées pour chaque étape par vmTested) : les 🧪 ne doivent pas bouger d'une langue à l'autre
  const hashes=[],orig=window.cmdHash;window.cmdHash=s=>{const h=orig(s);hashes.push((s.id||'?')+':'+h);return h};
  let md;try{md=buildTutorial()}finally{window.cmdHash=orig}
  const tested=md.split(/^### /m).slice(1).filter(x=>/^\*\*(?:État :|Status:)\*\* 🧪/m.test(x)).map(x=>x.split('\n')[0].replace(/^\d+\. /,'')+'|'+(x.match(/(?:Identifiant :|Identifier:) `([^`]+)`/)||[])[1]);
  return Object.assign(grab(md),{hashes,tested})};
 for(const obj of objs)for(const base of bases)for(const mix of [0,1]){
  const f=run('fr',obj,base,mix),e=run('en',obj,base,mix);out.n++;
  const tag=obj+' '+base+' '+mix;
  if(JSON.stringify(f.ids)!==JSON.stringify(e.ids))bad.push('identifiants fr≠en: '+tag);
  if(JSON.stringify(f.code)!==JSON.stringify(e.code))bad.push('commandes fr≠en: '+tag);
  if(JSON.stringify(f.hashes)!==JSON.stringify(e.hashes))bad.push('cmdHash fr≠en: '+tag);
  if(f.tested.map(x=>x.split('|')[1]).join()!==e.tested.map(x=>x.split('|')[1]).join())bad.push('étapes 🧪 fr≠en: '+tag);
  if(base==='alpine'&&!f.tested.length)bad.push('aucune étape 🧪 sur Alpine: '+tag);
  // base « undecided » : le tutoriel choisit lui-même une base, le préfixe n'est donc pas imposé
  const pre=base==='undecided'?/^[a-z0-9]+-/:new RegExp('^'+base+'-');
  f.ids.forEach(id=>{const m=pre.exec(id);const rest=m?id.slice(m[0].length):'';
   if(!m||/undefined|null|NaN/.test(id)||!rest.startsWith(obj+'-')||!/^[a-z0-9-]+$/.test(id)||/^\d+$/.test(rest.slice(obj.length+1)))bad.push('identifiant invalide '+id+' ('+tag+')')});
  const d=f.ids.filter((x,i)=>f.ids.indexOf(x)!==i);if(d.length)bad.push('identifiants en double '+[...new Set(d)]+' ('+tag+')');
  if(!f.ids.length)bad.push('aucun identifiant: '+tag);
 }
 setLang(start,true);
 out.keys=Object.keys(I18N.fr);out.frag=Object.keys(FRAG);
 return out;
});
if(errs.length)r.bad.push('pageerror: '+errs[0]);
// source : clés tx() utilisées/déclarées, FRAG sans clé périmée, textes de l'arbre tous couverts
{const fs=require('fs'),path=require('path');
 const src=fs.readFileSync(path.resolve(__dirname,'../atlas-distro.html'),'utf8');
 const flat=src.replace(/\\'/g,"'");
 const used=new Set([...src.matchAll(/\btx\((?:"([\w.]+)"|(?:[^"()]*\?\s*)?"([\w.]+)"\s*:\s*"([\w.]+)")/g)].flatMap(m=>m.slice(1).filter(Boolean)));
 [...src.matchAll(/\btx\(([^()]*?"[\w.]+"[^()]*?)[,)]/g)].forEach(m=>[...m[1].matchAll(/"([a-z]+\.[\w.]+)"/g)].forEach(x=>used.add(x[1])));
 [...src.matchAll(/data-(?:i|ip|ia)="([\w.]+)"/g)].forEach(m=>used.add(m[1]));
 [...src.matchAll(/G\.hwMsg=v\?"([\w.]+)"/g)].forEach(m=>used.add(m[1]));
 const known=new Set(r.keys);
 used.forEach(k=>{if(!known.has(k))r.bad.push('clé tx() inconnue: '+k)});
 known.forEach(k=>{if(!used.has(k)&&!/^lang\./.test(k))r.bad.push('clé I18N jamais utilisée: '+k)});
 r.frag.forEach(k=>{if(!flat.includes(k)&&!flat.includes(k.replace(/"/g,'\\"')))r.bad.push('clé FRAG périmée (absente du code): '+k.slice(0,60))});
 // textes français de l'arbre, des objectifs et des bases : tous dans FRAG
 const a=src.indexOf('const OBJECTIVES='),b=src.indexOf('const G={obj');
 const pat=/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;const FRW=/[éèàùçêâîôûœ]|\b(le|la|les|un|une|des|et|pour|ton|ta|tes|ou|de|du|sur|avec|pas|ce|cette|Oui|Non|ne|est|en|au|aux|que|qui)\b/;
 const SINGLE=new Set(['Bureautique','Noyau','Bureau','Son','Tableur','Présentations','Développement','Conteneurs','Sauvegarder','Création','Organisation','Virtualisation','Téléchargements','Loisirs','Lanceur','Réseau','Récents']);
 const miss=new Set();let m;const region=src.slice(a,b);
 // petit lexeur : chaînes '...' et "..." hors commentaires, gabarits `...` et expressions régulières (apostrophes des commentaires)
 const lits=[];{let i=0;const n=region.length;
  while(i<n){const c=region[i],d=region[i+1];
   if(c==='/'&&d==='/'){while(i<n&&region[i]!=='\n')i++;continue}
   if(c==='/'&&d==='*'){i=region.indexOf('*/',i+2)+2;continue}
   if(c==='`'){i++;let depth=0;while(i<n&&!(region[i]==='`'&&!depth)){if(region[i]==='\\'){i+=2;continue}if(region[i]==='$'&&region[i+1]==='{'){depth++;i+=2;continue}if(region[i]==='}'&&depth)depth--;i++}i++;continue}
   if(c==='"'||c==="'"){let j=i+1,sTxt='';while(j<n&&region[j]!==c){if(region[j]==='\\'){sTxt+=region[j+1];j+=2;continue}sTxt+=region[j];j++}lits.push(sTxt);i=j+1;continue}
   i++}}
 for(const t of lits){
  if(!/[A-Za-zÀ-ÿ]{3,}/.test(t))continue;
  const prose=(FRW.test(t)&&/[A-Za-zÀ-ÿ]{3,}/.test(t)&&!/^[\w\-./:=#%?&;,() ]*$/.test(t))||SINGLE.has(t)||(/ /.test(t)&&/^[A-ZÉ]/.test(t)&&/[a-zé]{3,} [a-zé]{2,}/.test(t)&&!/[=<>{}\[\]()]/.test(t));
  if(!prose)continue;
  if(r.frag.includes(t))continue;
  if(r.frag.some(k=>k.length>=8&&t.includes(k)))continue;
  if(KEEP.has(t))continue;
  miss.add(t)}
 [...miss].slice(0,60).forEach(t=>r.bad.push('texte de l\'arbre sans traduction: '+t.slice(0,80)));
}
// fichiers hors page : formulaires de ticket (id inchangés) et README fr/en
{const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
 const ids=f=>[...fs.readFileSync(path.join(root,'.github/ISSUE_TEMPLATE',f),'utf8').matchAll(/^    id: (\w+)/gm)].map(m=>m[1]).join(',');
 if(ids('commande-qui-echoue.yml')!=='base,parcours,etape,commande,erreur,version,contexte')r.bad.push('id du formulaire commande-qui-echoue modifiés');
 if(ids('paquet-introuvable.yml')!=='base,parcours,etape,paquet,commande,erreur,verification,remplacement,version')r.bad.push('id du formulaire paquet-introuvable modifiés');
 const spans=f=>new Set([...fs.readFileSync(path.join(root,f),'utf8').matchAll(/`([^`\n]+)`/g)].map(m=>m[1]));
 const fr=spans('README.md'),en=spans('README.en.md');
 const SKIP=new Set(['<base>-<parcours>-<étape>','<base>-<path>-<step>']);
 [...fr].filter(x=>!en.has(x)&&!SKIP.has(x)).forEach(x=>r.bad.push('README.en sans le code `'+x+'`'));
 [...en].filter(x=>!fr.has(x)&&!SKIP.has(x)).forEach(x=>r.bad.push('README.md sans le code `'+x+'`'));
 const urls=f=>[...new Set(fs.readFileSync(path.join(root,f),'utf8').match(/https:\/\/[^\s>)]+/g)||[])].sort().join(' ');
 if(urls('README.md')!==urls('README.en.md'))r.bad.push('URL différentes entre README.md et README.en.md');
}
// détection de la langue du navigateur : en → en ; fr, autre langue → fr ; le choix du bouton prime
{const file='file://'+require('path').resolve(__dirname,'../atlas-distro.html');
 for(const [locale,want] of [['en-GB','en'],['en-US','en'],['fr-FR','fr'],['fr-CA','fr'],['de-DE','fr'],['ja-JP','fr']]){
  const c=await b.newContext({locale});const q=await c.newPage();await q.goto(file);
  const got=await q.evaluate(()=>LANG);if(got!==want)r.bad.push('langue détectée '+locale+' : '+got+' au lieu de '+want);
  if(locale==='de-DE'){ // le bouton enregistre le choix, qui l'emporte ensuite sur la détection
   await q.click('#langBtn');if(await q.evaluate(()=>LANG)!=='en')r.bad.push('le bouton ne passe pas en anglais');
   await q.reload();if(await q.evaluate(()=>LANG)!=='en')r.bad.push('choix du bouton non conservé');
   const h=await q.evaluate(()=>document.documentElement.lang+'|'+document.getElementById('tabG').textContent);if(h!=='en|Guide me')r.bad.push('titre/onglet non traduits: '+h)}
  if(locale==='en-GB'){const q2=await c.newPage();await q2.goto(file+'?lang=fr');if(await q2.evaluate(()=>LANG)!=='fr')r.bad.push('?lang=fr ignoré');
   await q2.goto(file);if(await q2.evaluate(()=>LANG)!=='en')r.bad.push('?lang a été enregistré par erreur')}
  await c.close()}}
console.log('combinaisons comparées fr/en:',r.n);
console.log('fiches traduites:',r.fiches+'/'+r.total);
console.log(r.bad.length?'PROBLÈMES ('+r.bad.length+'):\n'+r.bad.slice(0,40).join('\n'):'0 problème');
await b.close();process.exit(r.bad.length?1:0);
})();
