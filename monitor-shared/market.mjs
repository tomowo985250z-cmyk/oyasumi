export const INSTRUMENTS = Object.freeze({
  canbas: {symbol:'4575.T', currency:'JPY', type:'EQUITY', zone:'Asia/Tokyo', name:'CanBas'},
  kringle: {symbol:'4884.T', currency:'JPY', type:'EQUITY', zone:'Asia/Tokyo', name:'クリングルファーマ'},
  joby: {symbol:'JOBY', currency:'USD', type:'EQUITY', zone:'America/New_York', name:'Joby'},
  usdjpy: {symbol:'JPY=X', currency:'JPY', type:'CURRENCY', zone:'Europe/London', name:'USD/JPY'}
});
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
const iso = v => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function normalizeQuote(body, id, now = new Date().toISOString()) {
  const expected=INSTRUMENTS[id], result=body?.chart?.result;
  if (!expected || body?.chart?.error || !Array.isArray(result) || result.length!==1) throw Error('株価データ形式が不正');
  const {meta:m,timestamp,indicators}=result[0];
  if (!m || m.symbol!==expected.symbol || m.currency!==expected.currency || m.instrumentType!==expected.type || m.exchangeTimezoneName!==expected.zone || !positive(m.regularMarketPrice) || !positive(m.regularMarketTime) || !Number.isInteger(m.priceHint) || m.priceHint<0 || m.priceHint>8) throw Error('銘柄・通貨・価格・日時の必須項目を確認できません');
  if (id==='usdjpy' && m.shortName!=='USD/JPY' && m.longName!=='USD/JPY') throw Error('USD/JPYの通貨方向を確認できません');
  const asOf=new Date(m.regularMarketTime*1000).toISOString();
  if (!iso(now) || Date.parse(asOf)>Date.parse(now)+300000) throw Error('価格日時が不正');
  const price=Number(m.regularMarketPrice.toFixed(m.priceHint));
  let previousClose=null;
  if (expected.type==='EQUITY') {
    const close=indicators?.quote?.[0]?.close;
    if (!Array.isArray(timestamp) || !Array.isArray(close) || timestamp.length!==close.length) throw Error('前営業日終値の必須項目が欠落');
    const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:expected.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t*1000));
    const currentDay=day(m.regularMarketTime);
    const prior=timestamp.map((t,i)=>({t,price:close[i]})).filter(x=>positive(x.t)&&positive(x.price)&&day(x.t)<currentDay).sort((a,b)=>b.t-a.t)[0];
    if (!prior) throw Error('前営業日終値を確認できません');
    previousClose=Number(prior.price.toFixed(m.priceHint));
  }
  return {symbol:expected.symbol,currency:expected.currency,price,previousClose,asOf};
}
export function validEntry(entry,id) {
  const d=INSTRUMENTS[id],q=entry?.quote;
  return !!d && ['success','failed'].includes(entry?.result) && iso(entry.lastAttemptAt) && (!q || (q.symbol===d.symbol && q.currency===d.currency && positive(q.price) && iso(q.asOf) && iso(entry.lastSuccessAt) && (id==='usdjpy'||positive(q.previousClose)))) && (entry.result!=='success'||!!q);
}
export function recordResult(previous,id,quote,at,error=null) {
  if (!INSTRUMENTS[id] || !iso(at)) throw Error('取得記録が不正');
  const old=validEntry(previous,id)?previous:null;
  if (quote && old?.quote && Date.parse(quote.asOf)<Date.parse(old.quote.asOf)) error='前回より古い価格日時のため採用しません';
  if (error || !quote) return {quote:old?.quote??null,result:'failed',lastAttemptAt:at,lastSuccessAt:old?.lastSuccessAt??null,error:error||'取得失敗'};
  return {quote,result:'success',lastAttemptAt:at,lastSuccessAt:at,error:null};
}
export function parseInput(value) {
  if (typeof value!=='string' || !/^\d{1,9}(?:\.\d{1,6})?$/.test(value.trim())) return null;
  const n=Number(value.trim());return positive(n)?n:null;
}
export function calculate(unitCost,shares,quote,fx=null) {
  const cost=parseInput(unitCost),quantity=parseInput(shares);
  if (cost===null || quantity===null || !positive(quote?.price) || !['JPY','USD'].includes(quote.currency) || (quote.currency==='USD' && !positive(fx?.price))) return null;
  const priceJPY=quote.price*(quote.currency==='USD'?fx.price:1),value=priceJPY*quantity,invested=cost*quantity;
  const raw=value-invested,pnl=Math.abs(raw)<1e-8?0:raw;
  return {priceJPY,value,invested,pnl,percent:pnl/invested*100};
}
