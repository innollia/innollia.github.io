// Each glyph has exactly one expansion. Whitespace and / are preserved.
export const groups = [
  {name:'선 변형', entries:[['|','-'],['1','-'],['l','-']]},
  {name:'두 신호', entries:[[':','..'],['‥','..'],['i','.-'],['¡','.-'],['!','-.'],['=','--'],['‖','--']]},
  {name:'세 신호 이상', entries:[['⁝','...'],['⋮','...'],['…','...'],['∴','...'],['∵','...'],['⁞','....'],['⁘','....'],['⸬','....'],['⁙','.....'],['≡','---'],['☰','---'],['÷','.-.'],['≑','.--.']]},
  {name:'눈 묶음 (점 7개)', entries:[['ꙮ','.......']]}
];
const expansions = new Map([['.','.'],['-','-'],...groups.flatMap(g=>g.entries)]);
export function expand(input) {
  return Array.from(input, c => {
    if (/\s/u.test(c) || c==='/') return c;
    if (!expansions.has(c)) throw new Error(`지원하지 않는 문자: ${c}`);
    return expansions.get(c);
  }).join('');
}
export function compress(input, strength=100, enabled=groups.flatMap(g=>g.entries.map(e=>e[0])), random=Math.random) {
  const source=expand(input);
  if(source.length>20000) throw new Error('모스 신호 20,000자까지 입력하세요.');
  const allowed = new Set(enabled);
  const entries=[['.','.'],['-','-'],...groups.flatMap(g=>g.entries).filter(([c])=>allowed.has(c))];
  const n=source.length, min=new Uint32Array(n+1), reachable=new Array(n+1);
  reachable[n]=1n;
  const choices=new Array(n);
  for(let p=n-1;p>=0;p--) {
    choices[p]=/[.\-]/.test(source[p]) ? entries.filter(([,s])=>source.startsWith(s,p)) : [[source[p],source[p]]];
    min[p]=1+Math.min(...choices[p].map(([,s])=>min[p+s.length]));
    reachable[p]=choices[p].reduce((bits,[,s])=>bits | (reachable[p+s.length]<<1n),0n);
  }
  let target=n-Math.round((n-min[0])*Math.max(0,Math.min(100,Number(strength)||0))/100);
  // A restricted pool can leave gaps between attainable lengths.
  while(!(reachable[0] & (1n<<BigInt(target)))) target++;
  let p=0, remaining=target, output='';
  while(p<n) {
    const possible=choices[p].filter(([,s])=>reachable[p+s.length] & (1n<<BigInt(remaining-1)));
    const [glyph,signal]=possible[Math.min(possible.length-1,Math.floor(random()*possible.length))];
    output+=glyph; p+=signal.length; remaining--;
  }
  return {source,output,minimum:min[0],target};
}
