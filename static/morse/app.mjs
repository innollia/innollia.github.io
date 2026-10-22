import {groups,expand,compress} from './codec.mjs';
import {toMorse} from './text.mjs';
const $=id=>document.getElementById(id);
const inputType=()=>document.querySelector('input[name="input-type"]:checked').value;
const pool=document.createElement('div');pool.className='pool';$('pools').append(pool);
for(const [glyph,signal] of groups.flatMap(g=>g.entries)){
  const label=document.createElement('label'),check=document.createElement('input'),small=document.createElement('small');
  check.type='checkbox';check.value=glyph;check.checked=glyph!=='ꙮ';
  check.setAttribute('aria-label',`${glyph} = ${signal}`);small.textContent=signal;
  label.append(check,document.createTextNode(glyph+' '),small);pool.append(label);
  check.addEventListener('change',render);
}
function render(){
  $('level').textContent=$('strength').value+'%';
  $('source').placeholder=inputType()==='text'?'한글, English, 123':'... --- ... / .-. .--.';
  $('status').textContent='';$('status').className='';
  $('morse').value='';$('result').value='';$('stats').textContent='';
  $('copy').disabled=true;$('copy-morse').disabled=true;
  try{
    const input=$('source').value;
    const source=inputType()==='text'?toMorse(input):expand(input);
    if(source.length>20000) throw new Error('모스 신호 20,000자까지 변환할 수 있습니다.');
    const enabled=[...$('pools').querySelectorAll('input:checked')].map(c=>c.value);
    const result=compress(source,$('strength').value,enabled).output;
    $('morse').value=source;$('result').value=result;
    $('copy').disabled=!result;$('copy-morse').disabled=!source;
    const n=Array.from(source).length,m=Array.from(result).length;
    $('stats').textContent=n?`${n} → ${m}자 · ${Math.round((1-m/n)*100)}% 감소`:'';
  }catch(error){
    $('status').textContent=error.message;$('status').className='error';
  }
}
$('source').addEventListener('input',event=>{if(!event.isComposing)render();});
$('source').addEventListener('compositionend',render);
document.querySelectorAll('input[name="input-type"]').forEach(radio=>radio.addEventListener('change',render));
$('strength').addEventListener('input',render);
$('shuffle').addEventListener('click',render);
$('example').addEventListener('click',()=>{
  $('source').value=inputType()==='text'?'안녕 SOS 123': '... --- ... / .-. .--. / .-.-.- --..-- / .......';render();
});
for(const [button,field] of [['copy','result'],['copy-morse','morse']]){
  $(button).addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($(field).value);$('status').textContent='복사됨';}
    catch{$(field).focus();$(field).select();$('status').textContent='Ctrl+C로 복사하세요.';}
  });
}
render();
