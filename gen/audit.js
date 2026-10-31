// Audit approfondi de atlas-distro.html : données + parcours aléatoires + mise en page
const {chromium}=require('playwright');
const FILE='file://'+require('path').resolve(__dirname,'../atlas-distro.html')+'?lang='+(process.env.ATLAS_LANG||'fr');
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push('pageerror: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await p.goto(FILE);

  // ---------- A. DONNÉES ----------
  const data=await p.evaluate(()=>{
    const out=[];const ids=TOOLS.map(t=>t.id);
    const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);if(dup.length)out.push('ids en double: '+[...new Set(dup)]);
    const cids=CATS.map(c=>c.id);const cdup=cids.filter((x,i)=>cids.indexOf(x)!==i);if(cdup.length)out.push('catégories en double: '+[...new Set(cdup)]);
    const lay=LAYERS.map(l=>l.id);
    CATS.forEach(c=>{if(!lay.includes(c.layer))out.push('couche inconnue: '+c.id)});
    const MAT=['stable','experimental','legacy'];
    TOOLS.forEach(t=>{
      const c=CATS.find(x=>x.id===t.category);
      if(!c){out.push('catégorie inconnue: '+t.id);return}
      if(!t.name||!t.summary)out.push('nom/résumé vide: '+t.id);
      if(!(t.difficulty>=1&&t.difficulty<=5))out.push('difficulté invalide: '+t.id);
      if(!MAT.includes(t.maturity))out.push('maturité invalide: '+t.id+' '+t.maturity);
      const keys=c.criteria.map(k=>k.key);
      Object.keys(t.criteria||{}).forEach(k=>{if(!keys.includes(k))out.push('critère hors catégorie: '+t.id+'.'+k)});
      keys.forEach(k=>{if(!(k in (t.criteria||{}))&&k!=='footprint_mb')out.push('critère manquant: '+t.id+'.'+k)});
      ['requires','conflicts','works_well_with'].forEach(f=>(t[f]||[]).forEach(r=>{if(!ids.includes(r))out.push(f+' inconnu: '+t.id+' -> '+r)}));
      if(!t.docs||!t.docs.length)out.push('sans doc: '+t.id);
      (t.docs||[]).forEach(d=>{if(!/^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(d.url))out.push('URL douteuse: '+t.id+' '+d.url)});
      (t.implement||[]).forEach(s=>{if(!s.commands||!s.commands.length||s.commands.some(x=>!x))out.push('commande vide: '+t.id)});
      const blob=JSON.stringify(t);
      if(/undefined|\[object/.test(blob))out.push('texte « undefined »: '+t.id);
      if(!t.pros||!t.pros.length)out.push('sans avantages: '+t.id);
      if(!t.cons||!t.cons.length)out.push('sans limites: '+t.id);
      // conflits symétriques
      (t.conflicts||[]).forEach(r=>{const o=TOOLS.find(x=>x.id===r);if(o&&!(o.conflicts||[]).includes(t.id))out.push('conflit non symétrique: '+t.id+' <-> '+r)});
    });
    // fonctions logicielles
    const used=new Set();
    Object.values(TREES).forEach(tr=>{if(!tr.software)return;
      const fids=[];
      tr.software.groups.forEach(g=>g.funcs.forEach(f=>{
        if(fids.includes(f.id))out.push('fonction en double: '+f.id);fids.push(f.id);
        if(!getHelp('func:'+f.id))out.push('aide fonction manquante: '+f.id);
        if(f.tools.length<1)out.push('fonction vide: '+f.id);
        f.tools.forEach(t=>{used.add(t);if(!ids.includes(t))out.push('outil de fonction inconnu: '+f.id+'->'+t)});
        const d=f.def([],[0,0,0,0,0,0]);d.forEach(x=>{if(!f.tools.includes(x))out.push('défaut hors fonction: '+f.id+'->'+x)});
      }));
    });
    const orphans=TOOLS.filter(t=>!used.has(t.id)).map(t=>t.id);
    // aides
    CATS.forEach(c=>{if(!getHelp('cat:'+c.id))out.push('aide catégorie: '+c.id);c.criteria.forEach(k=>{if(!getHelp('crit:'+c.id+'.'+k.key))out.push('aide critère: '+c.id+'.'+k.key)})});
    LAYERS.forEach(l=>{if(!getHelp('layer:'+l.id))out.push('aide couche: '+l.id)});
    HWQ.forEach(q=>{if(!getHelp('hw:'+q.id))out.push('aide matériel: '+q.id)});
    const empty=CATS.filter(c=>!toolsOf(c.id).length).map(c=>c.id);
    const lone=CATS.filter(c=>toolsOf(c.id).length===1).map(c=>c.id);
    return {out,orphans,empty,lone,tools:TOOLS.length,cats:CATS.length};
  });
  console.log('=== DONNÉES ===');
  console.log('fiches',data.tools,'catégories',data.cats);
  console.log('problèmes:',data.out.length);data.out.slice(0,60).forEach(x=>console.log(' -',x));
  console.log('catégories vides:',data.empty.join(', ')||'aucune');
  console.log('catégories à 1 seul outil (pas de comparaison possible):',data.lone.join(', ')||'aucune');
  console.log('outils non proposés dans les parcours:',data.orphans.length?data.orphans.join(', '):'aucun');

  // ---------- B. COMPARATEUR : chaque catégorie, chaque vue ----------
  const cmp=await p.evaluate(()=>{
    const out=[];
    document.getElementById('tabC').click();
    for(const c of CATS){
      for(const view of ['table','crit']){
        for(const hs of [false,true]){
          state.view=view;state.hideSame=hs;
          try{setCat(c.id)}catch(e){out.push('setCat '+c.id+': '+e.message);continue}
          const m=document.getElementById('main');
          if(!m.innerHTML.length)out.push('vide: '+c.id);
          if(/undefined|\[object|NaN/.test(m.textContent))out.push('texte suspect: '+c.id+' '+view);
          // 4 colonnes
          const n=toolsOf(c.id).length;
          for(let k=0;k<Math.min(4,n)-state.sel.length;k++){const f=toolsOf(c.id).find(t=>!state.sel.includes(t.id));if(f)state.sel.push(f.id)}
          render();
          if(/undefined|\[object|NaN/.test(m.textContent))out.push('texte suspect (4 col.): '+c.id+' '+view);
        }
      }
    }
    state.view='table';state.hideSame=false;
    return out;
  });
  console.log('=== COMPARATEUR ===');console.log('problèmes:',cmp.length);cmp.forEach(x=>console.log(' -',x));

  // ---------- C. PARCOURS ALÉATOIRES ----------
  const objectives=await p.evaluate(()=>OBJECTIVES.filter(o=>o.ready).map(o=>o.id));
  console.log('=== PARCOURS ===');console.log('objectifs prêts:',objectives.join(', '));
  const walk=async(seed,obj)=>{
    let s=seed;const rnd=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296};
    await p.goto(FILE);
    const issues=[];
    const click=async(sel)=>{const l=p.locator(sel);const n=await l.count();if(!n)return false;await l.nth(Math.floor(rnd()*n)).click({timeout:3000}).catch(()=>{});return true};
    // scope
    await click(rnd()<0.5?'[data-scope="general"]':'[data-scope="precise"]');
    if(await p.locator('#hwm').count()){
      if(rnd()<0.4){await p.fill('#hwm',['ThinkPad T480','Raspberry Pi 4','zzz'][Math.floor(rnd()*3)]);await click('[data-hwmodel]')}
      else await click('[data-hwskip]');
      for(let i=0;i<8&&(await p.locator('[data-hwa]').count());i++)await click('[data-hwa]');
      await click('[data-hwgo]');
    }
    await click('[data-base]');
    await click(`[data-obj="${obj}"]`);
    let guard=0;
    while(guard++<60){
      const html=await p.locator('#guide').innerHTML();
      if(/undefined|\[object|NaN/.test(await p.locator('#guide').textContent()))issues.push('texte suspect (étape '+guard+')');
      const ow=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      if(ow>1)issues.push('débordement horizontal de '+ow+'px (étape '+guard+')');
      const has=async s=>(await p.locator(s).count())>0;
      if(await has('[data-a]')){await click(rnd()<0.15?'[data-a="-1"]':'[data-a]:not([data-a="-1"])');continue}
      // page résultat
      const r=rnd();
      if(r<0.25&&await has('[data-tc]')){await click('[data-tc]');continue}
      if(r<0.4&&await has('[data-use]')){await click('[data-use]');continue}
      if(r<0.5&&await has('[data-alt]')){await click('[data-alt]');continue}
      if(r<0.58&&await has('[data-pick]')){await click('[data-pick]');continue}
      if(r<0.66&&await has('[data-fix]')){await click('[data-fix]');continue}
      if(r<0.72&&await has('[data-fixa]')){await click('[data-fixa]');continue}
      if(r<0.76&&await has('[data-keep]')){await click('[data-keep]');continue}
      if(r<0.8&&await has('[data-baseedit]')){await click('[data-baseedit]');await click('[data-base]');continue}
      if(r<0.84&&await has('[data-hwedit]')){await click('[data-hwedit]');await click('[data-hwgo]').catch(()=>{});await click('[data-hwback]');continue}
      if(await has('[data-sw]')&&r<0.9){await click('[data-sw]');
        for(let k=0;k<12;k++){
          if(await has('details.grp:not([open]) summary'))await click('details.grp:not([open]) summary');
          if(await has('[data-swtc]'))await click('[data-swtc]');
          if(await has('[data-swtoggle]'))await click('[data-swtoggle]');
          if(await has('[data-swrep]')&&rnd()<0.5)await click('[data-swrep]');
          if(await has('[data-swadd]')&&rnd()<0.5)await click('[data-swadd]');
          if(await has('[data-fix]')&&rnd()<0.3)await click('[data-fix]');
          if(/undefined|\[object|NaN/.test(await p.locator('#guide').textContent()))issues.push('texte suspect (logiciels)');
        }
        await click('[data-swback]');continue}
      if(r<0.95&&await has('[data-back]')){await click('[data-back]');continue}
      if(await has('[data-cmp]')){await click('[data-cmp]');
        const view=await p.locator('#main').textContent();if(!view.length)issues.push('comparateur vide après renvoi');
        if(await p.locator('#cmpBackBtn').isVisible().catch(()=>false))await p.click('#cmpBackBtn');else issues.push('pas de retour vers le parcours');
        continue}
      break;
    }
    return issues;
  };
  let nWalks=0;const allIssues=[];
  for(const obj of objectives){
    for(let sd=1;sd<=12;sd++){
      const iss=await walk(sd*7919+obj.length,obj);nWalks++;
      iss.forEach(x=>allIssues.push(obj+' #'+sd+': '+x));
    }
  }
  console.log('parcours aléatoires:',nWalks,'problèmes:',allIssues.length);
  [...new Set(allIssues)].slice(0,30).forEach(x=>console.log(' -',x));
  console.log('=== ERREURS JS ===');console.log(errors.length?errors.slice(0,20).join('\n'):'aucune');
  await b.close();
})();
