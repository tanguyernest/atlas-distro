// Exporte les étapes du tutoriel généré (commandes exactes + empreinte) pour le banc de test VM.
// Usage : node gen/vm/export_steps.js atlas-distro.html <parcours> <base> <uefi|bios> > steps.json
const fs=require('fs'),vm=require('vm');
const [file,obj,base,boot]=process.argv.slice(2);
const html=fs.readFileSync(file,'utf8');
const i=html.indexOf('<script'),j=html.indexOf('>',i)+1,k=html.lastIndexOf('</script>');
const stub=new Proxy(function(){},{get:(t,p)=>p===Symbol.toPrimitive?()=>'':stub,apply:()=>stub,construct:()=>stub,set:()=>true});
const ctx={console,document:stub,navigator:stub,location:stub,setTimeout:()=>0,addEventListener(){},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},matchMedia:()=>({matches:false,addEventListener(){}})};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(html.slice(j,k),ctx);
// buildTutorial ne renvoie que le texte : on capte la liste des étapes via vmTested, appelé sur chacune
const seen=[];const orig=ctx.vmTested;
ctx.vmTested=(b,s)=>{seen.push({id:s.id,title:s.title,where:s.where||'systeme',cmds:s.cmds||[],verify:s.verify||[],hash:ctx.cmdHash(s)});return orig(b,s)};
vm.runInContext(`(()=>{const tr=TREES[${JSON.stringify(obj)}];Object.keys(HW).forEach(k=>delete HW[k]);HW.boot=${JSON.stringify(boot)};
 G.obj=${JSON.stringify(obj)};G.base=${JSON.stringify(base)};G.manual={};G.keep={};G.changed=[];G.hwAuto={};G.stage=null;G.scope='precise';
 G.ans=tr.questions.map(()=>0);G.i=tr.questions.length;G.sw={};buildTutorial()})()`,ctx);
process.stdout.write(JSON.stringify({obj,base,boot,steps:seen},null,1));
