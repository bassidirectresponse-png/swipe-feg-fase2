// B2 interface only. No Apify fetch, paid API, fabricated discovery, or fake fallback.
// B3 can supply adapters with run(job)->{status,result_count,counts,error?}, backed by durable storage.
export const unavailableCollectors = Object.freeze({
  apify: { async run() { return {status:"unavailable",result_count:0,error:{code:"capability_unavailable",message:"Coleta Apify ainda não habilitada nesta entrega."}}; } },
  domain_explorer: { async run() { return {status:"unavailable",result_count:0,error:{code:"capability_unavailable",message:"Exploração de domínios ainda não habilitada nesta entrega."}}; } },
});
