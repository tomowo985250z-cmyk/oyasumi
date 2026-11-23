// Server-side only. No PDF parser or document downloads run in the browser.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,e=>{const v=e.slice(1,-1);return v[0]==='#'?String.fromCodePoint(v[1]==='x'?parseInt(v.slice(2),16):Number(v.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[v];});
export function parseBbox(xml){
 const pages=[];
 for(const m of xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)){
  const words=[...m[1].matchAll(/<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"[^>]*>([\s\S]*?)<\/word>/g)].map(w=>({x:+w[1],y:+w[2],right:+w[3],bottom:+w[4],text:decode(w[5])}));
  const blocks=[...m[1].matchAll(/<block\b[^>]*>([\s\S]*?)<\/block>/g)].map(b=>[...b[1].matchAll(/<line\b[^>]*>([\s\S]*?)<\/line>/g)].map(l=>[...l[1].matchAll(/<word\b[^>]*>([\s\S]*?)<\/word>/g)].map(w=>decode(w[1])).join(' ')).join('\n'));
  pages.push({words,blocks,text:blocks.join('\n\n')});
 }
 if(!pages.length||!pages.some(p=>p.words.length>10))throw Error('PDFの文字・位置情報を抽出できません。画像PDFは自動確定しません。');
 return pages;
}
export async function extractPdf(bytes){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'oyasumi-pdf-'));
 try{const file=path.join(directory,'source.pdf');await fs.writeFile(file,bytes);const {stdout}=await run(process.env.PDFTOTEXT||'pdftotext',['-bbox-layout','-enc','UTF-8',file,'-'],{encoding:'utf8',timeout:30000,maxBuffer:12*1024*1024,windowsHide:true});return parseBbox(stdout);}
 finally{await fs.rm(directory,{recursive:true,force:true});}
}
