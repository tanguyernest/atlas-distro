// Tests i18n : node gen/test-i18n.js   (ATLAS_LANG=en pour charger la page en anglais)
// Vérifie : parité des clés fr/en, couche anglaise valide (liste blanche), commandes et identifiants
// d'étape identiques entre langues sur les combinaisons base × parcours × mode.
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',x=>errs.push(x.message));
await p.goto('file://'+require('path').resolve(__dirname,'../atlas-distro.html')+(process.env.ATLAS_LANG?'?lang='+process.env.ATLAS_LANG:''));
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
 // 4. basculer la langue ne laisse rien d'altéré : fr → en → fr redonne les données d'origine
 const snap=()=>JSON.stringify([TOOLS,CATS,LAYERS,OBJECTIVES,HELP,BASEDEF]);
 const start=LANG;setLang('fr',true);const s0=snap();setLang('en',true);setLang('fr',true);
 if(snap()!==s0)bad.push('retour en fr différent de l\'original');
 // 5. tutoriels fr/en : commandes et identifiants identiques, identifiants valides et uniques
 const objs=OBJECTIVES.filter(o=>o.ready).map(o=>o.id),bases=Object.keys(BASEDEF).concat(['undecided']);
 const grab=md=>{const ids=[...md.matchAll(/^Identifiant : `([^`]+)`/gm)].map(m=>m[1]);
  const code=[...md.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map(m=>m[1]);return {ids,code}};
 const run=(lang,obj,base,mix)=>{setLang(lang,true);Object.keys(HW).forEach(k=>delete HW[k]);
  G.obj=obj;G.base=base;G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.scope=mix?'precise':'general';
  if(mix)Object.assign(HW,{model:'PC de test',gpu:'amd',boot:'uefi',ram:'8',arch:'x86-amd',wifi:'intel',disk:'nvme'});
  const tr=TREES[obj];G.ans=tr.questions.map(()=>0);G.i=tr.questions.length;G.sw={};return grab(buildTutorial())};
 for(const obj of objs)for(const base of bases)for(const mix of [0,1]){
  const f=run('fr',obj,base,mix),e=run('en',obj,base,mix);out.n++;
  const tag=obj+' '+base+' '+mix;
  if(JSON.stringify(f.ids)!==JSON.stringify(e.ids))bad.push('identifiants fr≠en: '+tag);
  if(JSON.stringify(f.code)!==JSON.stringify(e.code))bad.push('commandes fr≠en: '+tag);
  // base « undecided » : le tutoriel choisit lui-même une base, le préfixe n'est donc pas imposé
  const pre=base==='undecided'?/^[a-z0-9]+-/:new RegExp('^'+base+'-');
  f.ids.forEach(id=>{const m=pre.exec(id);const rest=m?id.slice(m[0].length):'';
   if(!m||/undefined|null|NaN/.test(id)||!rest.startsWith(obj+'-')||!/^[a-z0-9-]+$/.test(id)||/^\d+$/.test(rest.slice(obj.length+1)))bad.push('identifiant invalide '+id+' ('+tag+')')});
  const d=f.ids.filter((x,i)=>f.ids.indexOf(x)!==i);if(d.length)bad.push('identifiants en double '+[...new Set(d)]+' ('+tag+')');
  if(!f.ids.length)bad.push('aucun identifiant: '+tag);
 }
 setLang(start,true);
 return out;
});
if(errs.length)r.bad.push('pageerror: '+errs[0]);
console.log('combinaisons comparées fr/en:',r.n);
console.log(r.bad.length?'PROBLÈMES ('+r.bad.length+'):\n'+r.bad.slice(0,40).join('\n'):'0 problème');
await b.close();process.exit(r.bad.length?1:0);
})();
