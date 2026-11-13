/* Public list projections. Full documents are read only for a requested detail/edit.
   Keep projection state outside data: a partial document must never become a save payload. */
(function(root){
  const fields=s=>s.trim().split(/\s+/);
  const identity=fields(`kind division source nome nomeOferta nomeMarca nomeProduto marca nicho subnicho brandCategory
    brandCreativeGeneration radarGeneration taxonomyVersion taxonomyStatus taxonomyReview
    videoId link nomeOriginal sourceOfferId sourceOfferName collectionLabel`);
  // Feed classification uses the same contextual evidence as the complete record.
  const context=fields('caption resumo descricao hook hashtags formato');
  const indexFields=[...identity,...context];
  const media=fields(`print imagemProduto thumb videoPoster video linkDrive linkAnuncio copyLink copyVslLink copyCriativoLink
    videoVsl videoCriativo mediaType tipoTrafego plataforma autor comentario dataPub publishedAt fetchedAt updatedAt`);
  const creative=fields(`transcriptionStatus transcricaoStatus transcricaoPtStatus transcriptionIncomplete transcriptionInvalid
    transcriptionNoSpeech transcriptionRequired adAnalysisStatus driveIngestStatus driveIngestError videoMissing
    fbIngestStatus fbIngestError fbActive fbDaysActive fbStartDate fbEndDate fbCheckedAt mediaArchiveStatus
    mediaArchiveRequired mediaArchived sourceHash sourceKey ingestionDate ingestionSource importBatch
    metricaTipo metricaValor metricaPendente`);
  const offer=fields(`tipoTrafego offerTags bmAccess numAdsAtivos adsHistory adsUpdatedAt adsLibraryCheckedAt adsLibraryApprox
    activeDays daysActive diasAtivos adsStartedAt startDate startedAt dominios bibliotecas advertorialLink brandTopAds
    bmReports bmUpdatedAt bmSpend7d bmSpend14d bmSpend30d bmRoas bmCpa bmAvgConversion bmCpm bmCtr bmCpcLink bmCpc
    spendHistory gastoDiario dailySpend metricasDiarias spend7d gasto7d spend14d gasto14d spend30d gasto30d`);
  const feed=fields(`autorNome views likes comentarios shares saves engajamento seguidores duracao faixa url fonte topic
    relevancia score isAd perfilMarca som somAutor`);
  const kinds={brandsvalidated:['brandsvalidated','brandsgeneral'],criativo:['criativo'],megabrain:['megabrain'],noticia:['noticia'],tiktok:['tiktok'],presell:['presell'],oferta:['oferta']};
  function group(section){return section==='brandsgeneral'?'brandsvalidated':section==='brandcreative'?'criativo':kinds[section]?section:null;}
  function columns(scope){return [...new Set(scope==='index'?indexFields:[...indexFields,...(["noticia","tiktok"].includes(scope)?fields("thumb dataPub publishedAt fetchedAt"):media),...(['oferta','brandsvalidated'].includes(scope)?offer:[]),...(['criativo','megabrain'].includes(scope)?creative:[]),...(['noticia','tiktok'].includes(scope)?feed:[])])];}
  function select(scope){return ['id','created_at',...columns(scope).map(key=>`${key}:data->${key}`)].join(',');}
  function decode(row,scope){const {id,created_at,...rest}=row;return{id,created_at,data:Object.fromEntries(Object.entries(rest).filter(([,value])=>value!==null)),_catalogLevel:scope==='index'?'index':'summary'};}
  function project(row,scope){const data={};for(const key of columns(scope))if(row.data?.[key]!=null)data[key]=row.data[key];return{id:row.id,created_at:row.created_at,data,_catalogLevel:scope==='index'?'index':'summary'};}
  function isFull(row){return !!row&&!row._catalogLevel;}
  function merge(current,incoming){
    const rank=row=>row._catalogLevel==='index'?0:row._catalogLevel==='summary'?1:2,map=new Map(current.map(row=>[row.id,row]));
    for(const row of incoming){const previous=map.get(row.id);if(!previous||rank(row)>=rank(previous))map.set(row.id,row);}
    return [...map.values()];
  }
  root.SwipeCatalog={version:1,group,kinds,columns,select,decode,project,isFull,merge};
})(globalThis);
