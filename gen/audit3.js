// Audit 3 : largeurs d'écran, mode sombre, contraste, éléments tactiles
const {chromium}=require('playwright');
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{
  const b=await chromium.launch();
  const report=[];
  for(const scheme of ['light','dark']){
    for(const w of [320,390,768]){
      const ctx=await b.newContext({viewport:{width:w,height:800},colorScheme:scheme});
      const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
      await p.goto('file://'+require('path').resolve(__dirname,'../atlas-distro.html')+'?lang='+(process.env.ATLAS_LANG||'fr'));
      const shots=[];
      const check=async(name)=>{
        const r=await p.evaluate(()=>{
          const out={ow:document.documentElement.scrollWidth-innerWidth,low:[],small:[]};
          const bgOf=el=>{while(el){const c=getComputedStyle(el).backgroundColor;const m=c.match(/[\d.]+/g).map(Number);if(m.length<4||m[3]>0.05)return m.slice(0,3);el=el.parentElement}return [255,255,255]};
          document.querySelectorAll('#guide *, #compare *, header *').forEach(el=>{
            if(!el.childNodes.length)return;
            const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
            if(!hasText)return;
            const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;
            const rect=el.getBoundingClientRect();if(!rect.width||!rect.height)return;
            let op=1,e2=el;while(e2){op*=parseFloat(getComputedStyle(e2).opacity);e2=e2.parentElement}
            if(op<0.9)return; // éléments volontairement atténués (.dim)
            const fg=cs.color.match(/[\d.]+/g).map(Number).slice(0,3);
            const bg=bgOf(el);
            const L=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
            const ra=(Math.max(L(fg),L(bg))+.05)/(Math.min(L(fg),L(bg))+.05);
            if(ra<4.0)out.low.push(el.className+'|'+el.textContent.trim().slice(0,24)+'|'+ra.toFixed(1));
            if((el.tagName==='BUTTON'||el.tagName==='SELECT')&&(rect.height<30||rect.width<30)&&!el.classList.contains('qm'))out.small.push(el.tagName+'.'+el.className+'|'+el.textContent.trim().slice(0,16)+'|'+Math.round(rect.width)+'x'+Math.round(rect.height));
          });
          out.low=[...new Set(out.low)].slice(0,8);out.small=[...new Set(out.small)].slice(0,8);return out;
        });
        report.push({scheme,w,name,ow:r.ow,low:r.low,small:r.small});
      };
      await check('accueil');
      await p.click('[data-scope="precise"]');await check('scope précis');
      await p.fill('#hwm','ThinkPad T480');await p.click('[data-hwmodel]');await check('récap matériel');
      await p.click('[data-hwgo]');await check('base');
      await p.click('[data-base="alpine"]');await check('objectifs');
      await p.click('[data-obj="gaming"]');await check('question 1');
      for(let i=0;i<6;i++){if(await p.locator('[data-a="0"]').count())await p.click('[data-a="0"]')}
      await check('résultat (conflits Alpine)');
      await p.click('[data-sw]');
      await p.locator('details.grp summary').first().click();await check('logiciels');
      for(const t of ['#tabC']){await p.click(t)}
      await p.selectOption('#layer','software');await p.selectOption('#cat','backup');
      await p.click('#add');await p.click('#add');await check('comparateur table 4 col');
      await p.click('[data-view="crit"]');await check('comparateur par critère');
      await p.locator('#compare .qm').first().click();await check('aide ouverte');
      if(errs.length)report.push({scheme,w,name:'ERREURS',errs});
      await ctx.close();
    }
  }
  const bad=report.filter(r=>r.ow>1||r.low&&r.low.length||r.small&&r.small.length||r.errs);
  console.log('écrans testés:',report.length,'| avec anomalies:',bad.length);
  bad.slice(0,40).forEach(r=>console.log(JSON.stringify(r)));
  await b.close();
})();
