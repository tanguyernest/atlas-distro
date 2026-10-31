// Audit 2 : chaque correction proposée résout-elle bien le conflit ? + cohérence des piles pour toutes les bases et objectifs
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+require('path').resolve(__dirname,'../atlas-distro.html')+'?lang='+(process.env.ATLAS_LANG||'fr'));
  const res=await p.evaluate(()=>{
    const out=[],stats={cases:0,issues:0,fixes:0};
    const snap=()=>JSON.stringify({base:G.base,manual:G.manual,ans:G.ans,i:G.i,obj:G.obj,sw:G.sw,changed:G.changed,keep:G.keep});
    const load=s=>{const o=JSON.parse(s);Object.assign(G,o)};
    const objectives=OBJECTIVES.filter(o=>o.ready).map(o=>o.id);
    const bases=Object.keys(BASEDEF).concat(['undecided']);
    const hws=[{}, {gpu:'nvidia',boot:'bios',ram:'4',arch:'arm'}, {gpu:'amd',boot:'uefi',ram:'16',arch:'x86-amd'}];
    for(const obj of objectives){
      const tr=TREES[obj];
      const nq=tr.questions.length;
      // combinaisons de réponses : toutes les réponses à 0, toutes à 1, et quelques mélanges
      const combos=[];
      const opts=tr.questions.map(q=>q.o.length);
      for(let m=0;m<64;m++){combos.push(tr.questions.map((q,k)=>(m>>k)&1?Math.min(1,opts[k]-1):0))}
      for(const base of bases){
        for(const hw of hws){
          Object.keys(HW).forEach(k=>delete HW[k]);Object.assign(HW,hw);
          for(const ans of combos){
            G.obj=obj;G.base=base;G.manual={};G.ans=ans.slice();G.i=nq;G.sw={};G.changed=[];G.keep={};G.stage=null;G.hwAuto={};
            tr.questions.forEach((q,k)=>{if(q.skipIf&&q.skipIf())G.ans[k]=q.fromHw()});
            stats.cases++;
            let eff,unk,raw,stack,issues;
            try{eff=effOf(tr);unk=tr.questions.map(()=>false);raw=tr.resolve(eff,unk);stack=applyManual(raw);issues=tr.rules(stack,eff)}catch(e){out.push('EXCEPTION '+obj+' '+base+' '+JSON.stringify(ans)+': '+e.message);continue}
            // cohérence de la pile
            const labels=stack.map(x=>x.label);
            if(new Set(labels).size!==labels.length)out.push('brique en double: '+obj+' '+base);
            stack.forEach(x=>{if(!x.name||/undefined/.test(x.name+x.why))out.push('brique incomplète: '+obj+' '+base+' '+x.label);
              if(x.tool&&!byId(x.tool))out.push('outil de brique inconnu: '+x.tool+' ('+obj+' '+base+')')});
            const tl=l=>(stack.find(x=>x.label===l)||{}).tool;
            // la base impose son gestionnaire de paquets si choisie
            if(BASEDEF[base]&&tl('Gestionnaire de paquets')!==BASEDEF[base].pm[0])out.push('pm incohérent: '+base+' -> '+tl('Gestionnaire de paquets'));
            // libc musl <=> base musl
            if(BASEDEF[base]){const lc=tl('Bibliothèque C');if((BASEDEF[base].libc==='musl')!==(lc==='musl'))out.push('libc incohérente: '+base+' -> '+lc)}
            // chaque correction proposée résout le conflit
            issues.forEach(is=>{
              stats.issues++;
              is.fixes.forEach(f=>{
                stats.fixes++;
                const s0=snap();
                try{
                  if(f.type==='tool')setManual(f.label,f.tool);
                  else{const from=effOf(tr)[f.q];G.changed.push({i:f.q,from,to:f.k});G.ans[f.q]=f.k}
                  const eff2=effOf(tr);const st2=applyManual(tr.resolve(eff2,tr.questions.map(()=>false)));
                  const is2=tr.rules(st2,eff2);
                  if(is2.some(x=>x.id===is.id))out.push('correction inefficace: '+is.id+' / "'+f.text+'" ('+obj+', base '+base+', réponses '+JSON.stringify(ans)+')');
                }catch(e){out.push('EXCEPTION correction '+is.id+': '+e.message)}
                load(s0);
              });
            });
          }
        }
      }
    }
    Object.keys(HW).forEach(k=>delete HW[k]);
    return {out:[...new Set(out)],stats};
  });
  console.log('cas testés:',res.stats.cases,'| conflits:',res.stats.issues,'| corrections essayées:',res.stats.fixes);
  console.log('problèmes:',res.out.length);res.out.slice(0,40).forEach(x=>console.log(' -',x));
  console.log('erreurs JS:',errors.length?errors:'aucune');
  await b.close();
})();
