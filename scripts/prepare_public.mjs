import {copyFile, lstat, mkdir, readdir, rm} from "node:fs/promises";
import {dirname, join, relative, sep} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const output=join(root,"dist");
if((await lstat(output).catch(()=>null))?.isSymbolicLink())throw new Error("dist não pode ser um link simbólico");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});

async function copy(relativePath){
  const from=join(root,relativePath),to=join(output,relativePath);
  await mkdir(dirname(to),{recursive:true});
  await copyFile(from,to);
}

async function copyTree(folder,allow){
  for(const entry of await readdir(join(root,folder),{withFileTypes:true})){
    const path=join(folder,entry.name);
    if(entry.isDirectory())await copyTree(path,allow);
    else if(entry.isFile()&&allow(path))await copy(path);
  }
}

await Promise.all([copy("index.html"),copy("logo-feg.jpg"),copyTree("lib",path=>path.endsWith(".js")),copyTree("assets",path=>{
  const name=path.split(sep).at(-1).toLowerCase();
  if(name.startsWith("print-"))return false;
  return path==="assets/theme-preload.js"||/\.(?:jpg|jpeg|png|webp|gif|svg|mp4|webm|mov)$/i.test(name);
})]);

const published=await readdir(output);
if(published.some(name=>["netlify","supabase","scripts","tests","db","docs","graph-sources"].includes(name)))throw new Error("Arquivo interno incluído na publicação");
console.log(`Arquivos públicos preparados em ${relative(root,output)}; relatórios e prints da BM excluídos.`);
