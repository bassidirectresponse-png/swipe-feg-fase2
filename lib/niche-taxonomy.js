/* Shared deterministic catalog/classifier: browser and server use identical rules. */
(function(root){
  const catalog=root.SwipeNicheCatalog;
  if(!catalog)throw new Error('Niche catalog missing');
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const has=(text,term)=>(' '+normalize(text)+' ').includes(' '+normalize(term)+' ');
  const topics=Object.fromEntries(catalog.groups.map(g=>[g.name,g.topics.map(t=>t.name)]));
  const names=Object.keys(topics),version=catalog.version,review='Pendente de revisão';
  function classify(text){
    const hay=normalize(text),pet=catalog.petTerms.some(t=>has(hay,t)),matches=[];
    // Context must be in the same sentence/short passage, not an unrelated tag elsewhere.
    const passages=String(text||'').split(/[.!?\n]+/).flatMap(s=>s.length>500?s.match(/.{1,500}(?:\s|$)/g)||[s]:[s]);
    for(const g of catalog.groups){
      if((g.name==='Pet')!==pet)continue;
      for(const t of g.topics){
        let score=0;
        for(const [index,p] of passages.entries()){
          const terms=t.terms.filter(term=>has(p,term));
          const contextual=terms.filter(term=>catalog.contextTerms.some(c=>has(p,c)&&!has(term,c)));
          if(!contextual.length)continue;
          const n=Math.max(...contextual.map(term=>normalize(term).split(' ').length));
          score=Math.max(score,n*10+contextual.length+(t.name==='Geral'?0:2)+(index===0?6:0));
        }
        if(score)matches.push({nicho:g.name,subnicho:t.name,score});
      }
    }
    matches.sort((a,b)=>b.score-a.score);
    return matches[0]||null;
  }
  const aliases={
    'sono beleza':'Skin Care','saude geral nutricao':'Saúde geral','saude intima libido':'Libido / Saúde sexual',
    'saude e suplemento':'Saúde geral','pet':'Pet','skin care':'Skin Care',
    'emagrecimento':'Nutrição/Emagrecimento','nutricao':'Nutrição/Emagrecimento',
    'diabetes glicose':'Saúde geral','neuropatia':'Saúde geral','memoria':'Saúde geral','visao':'Saúde geral','audicao':'Saúde geral',
    'articulacoes dores':'Saúde geral','sono ansiedade':'Saúde geral','detox intestino':'Saúde geral','imunidade':'Saúde geral',
    'disfuncao eretil':'Saúde masculina','prostata':'Saúde masculina','energia testosterona':'Saúde masculina','menopausa':'Saúde feminina'
  };
  const legacyTopics={'emagrecimento':'Emagrecimento','nutricao':'Nutrição','diabetes glicose':'Diabetes / açúcar no sangue','neuropatia':'Neuropatia','memoria':'Memória','visao':'Visão','audicao':'Audição','articulacoes dores':'Articulações','detox intestino':'Intestino','imunidade':'Imunidade','disfuncao eretil':'Libido','prostata':'Próstata','energia testosterona':'Testosterona','menopausa':'Menopausa'};
  function canonicalGroup(name){return names.find(n=>normalize(n)===normalize(name))||aliases[normalize(name)]||'';}
  function canonicalTopic(niche,topic){const n=normalize(topic);if(['joint pain','dor articular','articulacoes dor articular','artrite'].includes(n))return 'Articulações';return topics[niche]?.find(t=>normalize(t)===n)||'';}
  function remap(niche,topic,text=''){
    const old=normalize(niche),sub=normalize(topic);
    if(sub==='saude intima'&&['saude intima libido','libido saude sexual','saude feminina'].includes(old))return {nicho:'Saúde feminina',subnicho:'Saúde íntima'};
    if(sub==='sono'&&['sono beleza','skin care','saude geral nutricao','saude geral'].includes(old))return {nicho:'Saúde geral',subnicho:'Sono'};
    if(['saude geral nutricao','saude geral'].includes(old)&&['nutricao','emagrecimento'].includes(sub))return {nicho:'Nutrição/Emagrecimento',subnicho:sub==='nutricao'?'Nutrição':'Emagrecimento'};
    const group=canonicalGroup(niche),resolved=canonicalTopic(group,topic)||legacyTopics[old];
    if(old==='sono beleza'&&(!resolved||['Beleza','Geral'].includes(topic))){const c=classify(text);return c?{nicho:c.nicho,subnicho:c.subnicho}:null;}
    if(group&&resolved&&topics[group].includes(resolved))return {nicho:group,subnicho:resolved};
    const c=classify(text);if(c)return {nicho:c.nicho,subnicho:c.subnicho};
    if(group&&(!topic||sub==='geral')&&!['sono beleza','sono ansiedade','saude geral nutricao'].includes(old))return {nicho:group,subnicho:topics[group].includes('Geral')?'Geral':''};
    return null;
  }
  function content(d){return [d.nome,d.nomeOferta,d.formato,d.caption,d.resumo,d.descricao,d.hook, d.transcricao, ...(d.hashtags||[])].filter(x=>typeof x==='string').join('. ');}
  function migrationPatch(d){
    if(!d||d.taxonomyVersion===version||d.kind==='organic'||d.division==='organic')return null;
    const relevant=['noticia','tiktok','oferta','presell','criativo','brandsvalidated','brandsgeneral','megabrain'].includes(d.kind||'oferta');
    if(!relevant)return null;
    const feed=['noticia','tiktok'].includes(d.kind);
    const mapped=feed?classify(content(d)):remap(d.nicho,d.subnicho,content(d));
    const patch={taxonomyVersion:version,taxonomyOriginal:d.taxonomyOriginal||{nicho:d.nicho||'',subnicho:d.subnicho||''},taxonomyStatus:mapped?'classified':'review'};
    if(mapped){patch.nicho=mapped.nicho;patch.subnicho=mapped.subnicho;}
    else {patch.nicho=review;patch.subnicho='';}
    return patch;
  }
  function route(niche,topic){return remap(niche,topic)||{nicho:canonicalGroup(niche),subnicho:''};}
  const reviewVersion='2026-11-12.review-1';
  // Only the fixed, authenticated historical review writes this provenance.
  function reviewedClassification(d){
    if(d?.taxonomyReview?.version!==reviewVersion)return undefined;
    if(d.taxonomyStatus==='out_of_scope')return null;
    if(d.taxonomyStatus==='classified'&&topics[d.nicho]?.includes(d.subnicho))return {nicho:d.nicho,subnicho:d.subnicho};
    return undefined;
  }
  function eligible(d){const c=classify(content(d));return !!c&&c.nicho===d.nicho&&c.subnicho===d.subnicho;}
  root.SwipeTaxonomy={catalog,version,reviewVersion,reviewedClassification,names,topics,normalize,classify,canonicalGroup,canonicalTopic,remap,route,content,migrationPatch,eligible,review};
})(globalThis);
