import {INSTRUMENTS,parseInput,validEntry} from '../monitor-shared/market.mjs';
import {yenQuote} from '../joby/yen-model.mjs';
export const COMPANIES=Object.freeze([
  {id:'canbas',name:'CanBas',short:'CanBas'},
  {id:'kringle',name:'クリングルファーマ',short:'クリングル'},
  {id:'joby',name:'Joby Aviation',short:'Joby'}
]);
export const holdingKey=id=>'oyasumi:portfolio:v1:'+INSTRUMENTS[id].symbol;
export function portfolio(data,history,inputs={},now=Date.now()){
  const joby=yenQuote(data,history);
  const all=COMPANIES.map(company=>{
    const entry=validEntry(data?.entries?.[company.id],company.id)?data.entries[company.id]:null,q=entry?.quote;
    const price=company.id==='joby'?joby.price:q?.price??null;
    const percent=company.id==='joby'?joby.percent:q?(q.price/q.previousClose-1)*100:null;
    const shares=parseInput(inputs[company.id]),held=shares!==null;
    const value=held&&price!==null&&Number.isFinite(price*shares)?price*shares:null;
    const stale=!entry||entry.result!=='success'||!entry.lastSuccessAt||now-Date.parse(entry.lastSuccessAt)>96*3600000||(company.id==='joby'&&(!joby.fx||joby.fx.result!=='success'||now-Date.parse(joby.fx.lastSuccessAt)>96*3600000));
    return {...company,price,percent,shares,held,value,stale};
  });
  const held=all.filter(item=>item.held),missing=held.some(item=>item.value===null);
  const mode=!held.length?'empty':missing?'unavailable':'weighted';
  const tiles=mode==='empty'?all:held;
  const total=mode==='weighted'?held.reduce((sum,item)=>sum+item.value,0):null;
  return {mode,total,stale:tiles.some(item=>item.stale),rateMissing:tiles.some(item=>item.percent===null),tiles:tiles.map(item=>({...item,weight:mode==='weighted'?item.value:1,share:mode==='weighted'?item.value/total:1/tiles.length}))};
}
// Binary treemap: the geometric area of every rectangle equals its weight share.
export function layoutTiles(items,width,height){
  if(!(width>0&&height>0)||!items.length)return [];
  const sorted=[...items].sort((a,b)=>b.weight-a.weight),out=[];
  function split(group,x,y,w,h){
    if(group.length===1){out.push({...group[0],x,y,width:w,height:h});return;}
    const total=group.reduce((sum,item)=>sum+item.weight,0);let count=1,sum=group[0].weight,difference=Math.abs(sum/total-.5),running=sum;
    for(let i=1;i<group.length-1;i++){running+=group[i].weight;const next=Math.abs(running/total-.5);if(next<difference){count=i+1;sum=running;difference=next;}}
    const ratio=sum/total;
    if(w>=h){split(group.slice(0,count),x,y,w*ratio,h);split(group.slice(count),x+w*ratio,y,w*(1-ratio),h);}
    else{split(group.slice(0,count),x,y,w,h*ratio);split(group.slice(count),x,y+h*ratio,w,h*(1-ratio));}
  }
  split(sorted,0,0,width,height);return out;
}
export function tileTone(percent){return {direction:percent===null?'unknown':percent>0?'up':percent<0?'down':'flat',opacity:.22+Math.min(Math.abs(percent??0),10)*.055};}
