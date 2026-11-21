// Keep the rectangle's true area; fit text by actual glyph width and line height.
// Lower-priority rows disappear first and remain readable in the existing legend.
export function fitTileLabels(width,height,texts,measure){
  const padding=Math.min(6,Math.max(1,Math.min(width,height)*.03)),gap=Math.min(8,Math.max(2,Math.min(width,height)*.025));
  const availableWidth=Math.max(0,width-2*padding-4),availableHeight=Math.max(0,height-2*padding-4);
  const base=Math.min(64,Math.sqrt(Math.max(0,width*height))/6.5,width*.5,height*.38);
  const rows=[
    {text:measure(texts.name,12,650)<=availableWidth?texts.name:texts.short,min:12,target:base*.64,weight:650},
    {text:texts.rate,min:14,target:base,weight:750},
    {text:measure(texts.value,11,400)<=availableWidth?texts.value:texts.compactValue,min:11,target:base*.53,weight:400}
  ];
  for(let count=3;count>0;count--){
    const visible=rows.slice(0,count);
    const sizes=scale=>visible.map(row=>Math.max(row.min,row.target*scale));
    const fits=scale=>{const fonts=sizes(scale);return fonts.reduce((sum,font)=>sum+font*1.25,0)+gap*(count-1)<=availableHeight&&visible.every((row,i)=>measure(row.text,fonts[i],row.weight)<=availableWidth);};
    if(!fits(0))continue;
    let low=0,high=1;for(let i=0;i<14;i++){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle;}
    const fonts=sizes(low);return {padding,gap,rows:rows.map((row,i)=>({...row,size:i<count?Math.floor(fonts[i]*100)/100:row.min,visible:i<count})),count};
  }
  return {padding:0,gap:0,rows:rows.map(row=>({...row,size:row.min,visible:false})),count:0};
}
