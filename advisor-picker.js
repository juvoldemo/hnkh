// Keep group labels in suggestions only; the registration input contains the name.
const AdvisorPicker = (() => {
 const input=document.querySelector('#customer-advisor');
 const list=document.createElement('div');
 list.id='advisors';list.className='advisor-options';list.setAttribute('role','listbox');
 list.setAttribute('aria-label','Tư vấn viên và nhóm');list.hidden=true;document.body.append(list);
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim().replace(/\s+/g,' ');
 const directory=(window.ADVISORS||[]).map(a=>({...a,search:normalize(a.name)}));
 let matches=[],active=-1;
 function close(){list.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function position(){
  const r=input.getBoundingClientRect(),width=Math.min(Math.max(r.width,350),innerWidth-16);
  list.style.width=width+'px';list.style.left=Math.max(8,Math.min(r.left,innerWidth-width-8))+'px';
  const above=r.top>innerHeight-r.bottom;
  list.style.maxHeight=Math.max(48,Math.min(280,(above?r.top:innerHeight-r.bottom)-16))+'px';
  list.style.top=above?'auto':(r.bottom+6)+'px';list.style.bottom=above?(innerHeight-r.top+6)+'px':'auto';
 }
 function show(){
  const query=normalize(input.value);active=-1;input.removeAttribute('aria-activedescendant');
  matches=directory.filter(a=>!query||(' '+a.search+' ').includes(' '+query+' '));
  list.replaceChildren();
  matches.forEach((a,i)=>{const option=document.createElement('div');option.id='advisor-option-'+i;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.dataset.index=i;option.textContent=a.name+(a.group?' - '+a.group:'');list.append(option);});
  if(!matches.length){close();return;}
  list.hidden=false;input.setAttribute('aria-expanded','true');position();list.scrollTop=0;
 }
 function choose(index){if(!matches[index])return;input.value=matches[index].name;close();}
 input.addEventListener('input',show);input.addEventListener('focus',show);
 input.addEventListener('keydown',e=>{
  if(e.isComposing)return;
  if(e.key==='Escape'){close();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();if(list.hidden)show();if(list.hidden)return;
   active=(active+(e.key==='ArrowDown'?1:active<0?0:-1)+matches.length)%matches.length;
   [...list.children].forEach((el,i)=>el.setAttribute('aria-selected',String(i===active)));
   input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'&&!list.hidden&&active>=0){e.preventDefault();choose(active);}
 });
 list.addEventListener('pointerdown',e=>{if(e.target.closest('[role="option"]'))e.preventDefault();});
 list.addEventListener('click',e=>{const option=e.target.closest('[role="option"]');if(option)choose(Number(option.dataset.index));});
 input.addEventListener('blur',close);
 document.addEventListener('pointerdown',e=>{if(e.target!==input&&!list.contains(e.target))close();});
 window.addEventListener('resize',()=>{if(!list.hidden)position();});
 document.addEventListener('scroll',()=>{if(!list.hidden)position();},true);
 return {close};
})();
