// Liste, par base, les noms de paquets que l'app peut écrire dans un tutoriel.
// Usage : node gen/list_pkgs.js atlas-distro.html sortie.json
// Charge le <script> de l'app dans une VM node (faux DOM), parcourt toutes les fiches
// et génère les tutoriels de chaque parcours (UEFI et BIOS) pour capter aussi les paquets hors fiches
// (pilotes, blocs « distro depuis zéro »).
const fs=require('fs'),vm=require('vm');
const BASES=['debian','ubuntu','arch','fedora','void','gentoo'];
const html=fs.readFileSync(process.argv[2],'utf8');
const i=html.indexOf('<script'),j=html.indexOf('>',i)+1,k=html.lastIndexOf('</script>');
const stub=new Proxy(function(){},{get:(t,p)=>p===Symbol.toPrimitive?()=>'':stub,apply:()=>stub,construct:()=>stub,set:()=>true});
const ctx={console,document:stub,navigator:stub,location:stub,setTimeout:()=>0,addEventListener(){},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},matchMedia:()=>({matches:false,addEventListener(){}})};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(html.slice(j,k),ctx);
const out={};BASES.forEach(b=>out[b]={});
const add=(base,pkgs,src)=>{if(!out[base])return;pkgs.filter(p=>!p.startsWith('group:')).forEach(p=>{const s=out[base][p]=out[base][p]||[];if(!s.includes(src))s.push(src)})};
const fp=new Set();
vm.runInContext('TOOLS',ctx).forEach(t=>['alpine',...BASES].forEach(b=>{const r=ctx.toolPkgs(t,b);add(b,r.pkgs||[],t.id);if(r.flatpak)fp.add(r.flatpak)}));
out._flatpak=[...fp].sort();
// paquets passés à pkgState pendant la génération (pilotes graphiques, etc.)
const orig=ctx.pkgState;
ctx.pkgState=(base,pkgs)=>{add(base,pkgs,'tutoriel');return orig(base,pkgs)};
vm.runInContext(`
for(const o of OBJECTIVES.filter(o=>o.ready)){const tr=TREES[o.id];
 for(const base of ${JSON.stringify(BASES)})for(const gpu of ['amd','intel','nvidia',null])for(const mix of [0,1])for(const boot of ['uefi','bios']){
  Object.keys(HW).forEach(k=>delete HW[k]);if(gpu)HW.gpu=gpu;HW.boot=boot;
  G.obj=o.id;G.base=base;G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.scope=gpu?'precise':'general';
  G.ans=tr.questions.map(q=>mix?Math.min(1,q.o.length-1):0);G.i=tr.questions.length;G.sw={};
  buildTutorial();
 }}`,ctx);
fs.writeFileSync(process.argv[3],JSON.stringify(out,null,1));
BASES.forEach(b=>console.log(b,Object.keys(out[b]).length,'paquets'));
console.log('flatpak',out._flatpak.length,'identifiants');
