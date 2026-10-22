const latin = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').map((c,i)=>[c,
  ['.-','-...','-.-.','-..','.','..-.','--.','....','..','.---','-.-','.-..','--','-.','---','.--.','--.-','.-.','...','-','..-','...-','.--','-..-','-.--','--..','-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'][i]]));
Object.assign(latin,{'.':'.-.-.-',',':'--..--','?':'..--..',"'":'.----.','!':'-.-.--','/':'-..-.','(':'-.--.',')':'-.--.-','&':'.-...',':':'---...',';':'-.-.-.','=':'-...-','+':'.-.-.','-':'-....-','_':'..--.-','"':'.-..-.','$':'...-..-','@':'.--.-.'});
// Korean basic jamo table: https://morsecodes.net/ko/alphabet/korean
const korean = Object.fromEntries(Array.from('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣㅐㅔ', (c,i)=>[c,latin['LFBVMWGKPCXZOJEITSANHRDUQY'[i]]]));
const split = {'ㄲ':'ㄱㄱ','ㄸ':'ㄷㄷ','ㅃ':'ㅂㅂ','ㅆ':'ㅅㅅ','ㅉ':'ㅈㅈ','ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ','ㅒ':'ㅑㅣ','ㅖ':'ㅕㅣ','ㅘ':'ㅗㅏ','ㅙ':'ㅗㅐ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅔ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ'};
function jamo(c){
  const n=c.codePointAt(0);
  if(n>=0x1100&&n<=0x1112) return 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[n-0x1100];
  if(n>=0x1161&&n<=0x1175) return 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'[n-0x1161];
  if(n>=0x11a8&&n<=0x11c2) return 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'[n-0x11a8];
  return c;
}
export function toMorse(text){
  if(text.length>20000) throw new Error('입력은 20,000자까지 가능합니다.');
  return text.replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim().split(/\s+/u).filter(Boolean).map(word=>{
    return Array.from(word.normalize('NFC'),c=>{
      if(latin[c.toUpperCase()]) return latin[c.toUpperCase()];
      const signals=Array.from(c.normalize('NFD'),jamo).flatMap(j=>Array.from(split[j]||j)).map(j=>{
        if(!korean[j]) throw new Error(`지원하지 않는 문자: ${c}`);
        return korean[j];
      });
      return signals.join(' ');
    }).join('  ');
  }).join(' / ')).join('\n');
}
